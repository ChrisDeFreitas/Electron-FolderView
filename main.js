'use strict';

const fs = require('fs');
const path = require('path');
const url = require('url')

const electron = require('electron')
const {app, BrowserWindow/*, dialog,  globalShortcut*/} = electron
const imgDimensions = require(__dirname+'/node_modules/image-size')

exports.startTime = Date.now()

//handle commandline arguments
var argmap = {
		descending:{type:'boolean', default:false, notes:'items in descending order', alias:['--descending'] },
		devtools:{	type:'boolean', default:false, alias:['--devtools']},
		find:{			type:'string',  default:'',	notes:"search flickr for images with `find`.(not implemented in FileBrowser, see chrisd.gq/slideshow?find=Altay)", alias:['--find'] },
		fontsize:{	type:'string',  default:'20px',	notes:'set the default font size for the document.', alias:['--fontsize'] },
		folders:{		type:'string', default:'first', range:['default','first','hidden','last'], alias:['--folders'] },
		fullscreen:{type:'boolean', default:false, alias:['--fullscreen'] },
		height:{		type:'number', default:0, notes:'default window height; 0 = max height', alias:['--height'] },
		iconsOnly:{	type:'boolean', default:false, notes:'display icons instead of audio/image/video controls', alias:['--iconsOnly'] },
		layout:{		type:'string',	default:'cols',	range:['cols','rows','vert','videoWall','wall'], notes:`cols:"default to item.width=(window.innerWidth/3).",rows:"item.height=300px",vert:"single col",wall:"wallboard of images"`, alias:['--layout'] },
		order:{			type:'string',	default:'name', range:['date','name','size','type'],			notes:'Sort order of items', alias:['--order'] },
		path:{			type:'string',	default:'',		notes:'folder or file to open; always prefix with -- because it looks like path conflicts with an internal switch', alias:['--path'] },
		scale:{			type:'number',  default:1, range:{greaterThan:0}, notes:"scale size of grid items.", alias:['--scale'] },
		scroll:{		type:'boolean', default:false,	notes:"turn on/off scrolling grid whenever items loaded.", alias:['--scroll'] },
		sftpDownloadMax:{	type:'number', default:2,	notes:"Set max number of files to download at once.", alias:['--sftpDownloadMax'] },
		shuffle:{		type:'boolean',	default:false,	notes:"shuffle grid items via arrShuffle()", alias:['--shuffle'] },
		showSlideCaptions:{	type:'boolean',	default:true,	notes:"Display slideshow captions", alias:['--showSlideCaptions'] },
		videoMetadata:{		type:'boolean',	default:false,		notes:'Load video metadata (thumbnails), will slow large folders', alias:['videometadata'] },
		videoURL:{		type:'string',	default:'',		notes:'Open Video Download with this URL selected', alias:['videourl','--videoURL'] },
		//videoWall:{		type:'boolean',	default:false,		notes:'Open Video Wall dialog', alias:['vidWall','--videoWall'] },
		width:{			type:'number', default:0, notes:'default window width; 0 = max width', alias:['--width'] }
}
var args = require('./lib/grinder/lib/grinder.js').grindArgv(argmap, null, 1)

//allow logging to main browser window
Object.defineProperty(global, '__stack', {
  get: function(){
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack){ return stack; };
    var err = new Error;
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
  }
});
Object.defineProperty(global, '__line', {
  get: function(){
    return __stack[1].getLineNumber();
  }
});
function log(msg, lineno){
	if(mainWindow==null) {
		if(lineno!==undefined)
			console.error(`${__filename}, Line #${lineno}:`)
		console.error(msg)
		return
	}
	if(lineno!=null)
		mainWindow.webContents.send('applog',`${__filename}, Line #${lineno}:`)
	mainWindow.webContents.send('applog',msg)
}


exports.fldrLoad = function(fldr, simple) {
	if(fldr===undefined) fldr=args.path
	return fldrObjGen(fldr, simple)
}
//
var mainWindow=null
var isElectron = (app!=undefined)
var isFolderView = (process.argv[0].indexOf('FolderView.exe') >= 0)

let imgtypes = ['.bmp',/*'.ico',*/'.gif','.jpg','.jpeg','.png','.webp']
var vidtypes = ['.avi','.flc','.flv','.m4v','.mkv','.mov','.mp4','.mp5','.mpg','.mov','.ogg','.qt','.swf','.webm','.wmv']
let audtypes = ['.flac','.mp3','.wma']
//ToDo: add more document types
let doctypes = ['.c','.cpp','.css','.doc','.h','.htm','.html','.js','.pdf','.php','.svg','.txt','.xml']


if(isElectron===false){	//nodejs functionality -- not working/useful these days
	log('nodejs app running')
	var fldrobj = parseArgs()
	var htmlfile = htmlGen(fldrobj)
	console.error('Launching:['+htmlfile+']')
	const exec = require('child_process').exec;
	const child = exec(htmlfile, (error, stdout, stderr) => {
	  //error gen if browser already opened: if (error) throw error
	  console.error('Launch results:\n['+stdout+']');
	})
}
else {		//electron functionality
	//no output to support browser extension native messaging
	// if(isFolderView)	log('FolderView.exe running')
	// else	log('electron app running')
	appInit()
}

function appInit(){
	app.allowRendererProcessReuse = true	//due to deprecation warning in v8, https://github.com/electron/electron/issues/18397
	app.on('ready', function() {
		var fldrobj = parseArgs()
		mainWindow = browserLaunch(fldrobj)
	})
	app.on('window-all-closed', () => { 	// Quit when all windows are closed.
	  // On OS X it is common for applications and their menu bar
	  // to stay active until the user quits explicitly with Cmd + Q
	  if (process.platform !== 'darwin') {
	    app.quit()
	  }
	})
	app.on('activate', () => {
	  // On OS X it's common to re-create a window in the app when the
	  // dock icon is clicked and there are no other windows open.
	  if (mainWindow === null) {
	    createWindow()
	  }
	})
}

function safeLstat(apath) {
	var result = null
	try { result = fs.lstatSync(apath) }
	catch(e){  console.error('safeLstat() error: ', e) }
	return result
}
function parseArgs() {
	var file = ''

	if(args.path === ''){	//check for path on the commandline; useCase: Windows drag and drop
		// console.error('no --path, checking for default argv path..')
		// console.error('argv: ',process.argv)
		if(process.argv.length > (isFolderView ?1 :2)){
			var ss = process.argv[(isFolderView ?1 :2)]
			if(ss != '' && ss.indexOf('--') < 0) {
				var	stat = safeLstat(ss)	//fs.lstatSync(ss)
				if(stat!==null){
					if(stat.isFile()===true || stat.isDirectory()===true)
						args.path = ss
				}
			}
		}
		if(args.path!=''){
			console.error('Found:', args.path)
		} else
			console.error('Default argv path not found')
	}
	if(args.path == null || args.path == ''){
		if(isElectron===false) file='./'
		args.path = file
	}
	else {
		file = args.path.trim()
		if(file[0] == '"' || file[0] == "'"){
			file = file.substring(1, file.length-1)
			file = file.trim()
		}	
		file = path.normalize(file)
		args.path = file
	}
	if(args.descending===undefined) args.descending=false
	if(args.devtools===undefined) args.devtools=false
	if(args.folders===undefined) args.folders='first'
	if(args.fontsize && (args.fontsize[0]==='"' || args.fontsize[0]==="'")) {	//remove quotes if needed
		console.error("Fix args.fontsize: ", args.fontsize)
		args.fontsize = args.fontsize.substr(1, args.fontsize.length-2)
	}
	if(args.layout===undefined) args.layout='cols'
	if(args.order===undefined) args.order='name'
	if(args.sftpDownloadMax===undefined) args.sftpDownloadMax=2
	if(args.shuffle===undefined) args.shuffle=false
	// if(args.videoURL===undefined) args.videoURL=''
	if(args.width===0 || args.height===0){
		if(isElectron == true){
			const	{width, height} = electron.screen.getPrimaryDisplay().workAreaSize
			if(args.width===0) args.width = width
			if(args.height===0) args.height = height
		}
		else{
			if(args.width===0) args.width = 1024
			if(args.height===0) args.height = 800
		}
	}
	console.log('Arguments:')
	console.log(args)
	console.log('Reading files..')

	var fldrobj = fldrObjGen(file)
	return fldrobj
}
function scaleFix(fileObj){
	if(args.scale <= 0) {
		//scale based on number of items in folder
		if(fileObj.items.length > 100) args.scale = 0.3
		else
		if(fileObj.items.length > 75) args.scale = 0.5
		else
		if(fileObj.items.length > 50)	args.scale = 0.7
		else
			args.scale = 1
	}
	else {
		if(typeof args.scale==='string'){
			// console.error('scale has an undefined value: ['+args.scale+'], using 1 instead.')
			args.scale=1
		}
	}
}
function fldrObjGen(file, simple) {
	//todo: replace fs.readdir with exec("dir /-c /n /on /tw /4") for speed
	//assume: simple === true return {fldr:file, fileErrors:[], isDirectory:boolean, items:[ {basename, isDirectory, date, size}, ...] }
	//				else returns items[{}, ...] with file type info
	//				pathBar.js uses simple===true
	if(file=='') //process.exit(1)
		return {args:args, exts:{}, mediaTypes:{}, fldr:file, items:[], isDirectory:null, fileErrors:[`Error, path argument has an error:[${file}].`]}
	if(simple== undefined) simple = false

	let exts={},
			mediaTypes={},
			folder = '',
			defaultfile = '',
			isDirectory = true,
			stat = safeLstat(file)
	if(stat==null){
		return {args:args, exts:{}, mediaTypes:{}, fldr:file, items:[], isDirectory:null, fileErrors:[`Error, could not stat: [${file}].`]}
	}

	if(stat.isDirectory()==true){
		file = pathTrailingSlash(file)
		folder = file
	}
	else {
		if(simple===true)
			return {fldr:file, items:[], isDirectory:false, fileErrors:[]}
		folder = path.dirname(file)
		defaultfile = path.basename(file)
		isDirectory = false
	}

	var fls = fs.readdirSync(folder)
	var fls2 = []
	var id=-1
	var defaultImageName=null
	var defaultImageNum=null
	var ferrors = []
	var dirname__ = __dirname.replace(/\\/g,'/')
	for(var key in fls){
		let val = fls[key],
				fn = path.basename(val),
				posixpath = path.join(folder, val).replace(/\\/g,'/')

		stat = safeLstat(posixpath)
		if(stat===null) {
			ferrors.push(`Could not stat: [${posixpath}]`)
			continue
		}
		if(simple === true){
			var obj = {
				basename:fn,
				date:stat.mtime,
				size:stat.size,
				isDirectory:stat.isDirectory(),
				sortname:fn.toLowerCase(),	//preload to speed sorting
			}
			fls2.push(obj)
			continue
		}

		++id
		let	ext = path.extname(val).toLowerCase()

		if(isDirectory === false && defaultImageNum===null	&& defaultfile==fn) {
			defaultImageName = fn
			defaultImageNum = id	//image in argv displayed when web page opens
		}

		var obj = {
			basename:fn, date:stat.mtime, size:stat.size,
			isDirectory:stat.isDirectory(),
			sortname:fn.toLowerCase(),	//preload to speed sorting
			mediaType: 'unknown',
			path: posixpath,
			pid: id,
			uid: id,		//unique id, does not change for life of obj; for videWall, but generally required
			w: 320,
			h: 200,
			src: 'file:///'+posixpath,
			title: val,
			type: ext
		}
		if(obj.isDirectory===true){				//folders
			obj.mediaType = 'folder'
			if(obj.path[obj.path -1] != path.posix.sep)
				obj.path += path.posix.sep
//			obj.src = 'file:///'+dirname__+"/resources/folder_closed_64.png"
			obj.src = 'file:///'+dirname__+"/resources/icons/folder-open.svg"
			obj.type = 'folder'
		}	else
		if(imgtypes.indexOf(ext) >= 0){			//images, not svg
			obj.mediaType = 'image'
			try{
				var dim = imgDimensions(posixpath)
				obj.w = dim.width
				obj.h = dim.height
			}
			catch(x) {
				obj.w = 160
				obj.h = 100
			}
		}	else
		if(vidtypes.indexOf(ext) >= 0){			//video types
			obj.mediaType = 'video'
		}	else
		if(audtypes.indexOf(ext) >= 0){			//audio types
			obj.mediaType = 'audio'
		}	else
		if(doctypes.indexOf(ext) >= 0){			
			obj.mediaType = 'document'
		}	
		// else
		// if(ext === '.svg'){									//svg files
		// 	obj.mediaType = 'svg'
		// }
		else{			//handle other types
			obj.src = 'file:///'+dirname__+"/resources/new_document_64.png"
		}
		//store file types for filter menu
		if(exts[obj.type]===undefined) exts[obj.type]=1
		else exts[obj.type]++
		//store media type for filter menu
		if(mediaTypes[obj.mediaType]===undefined) mediaTypes[obj.mediaType]=1
		else mediaTypes[obj.mediaType]++
		fls2.push(obj)
	}
	var result = null
	if(simple===true){
		result = {fldr:file, items:fls2, fileErrors:ferrors, isDirectory:isDirectory}
	}
	else{
		args.defaultImageName = defaultImageName
		args.defaultImageNum = defaultImageNum
		result = {args:args, exts:exts, mediaTypes:mediaTypes, fldr:file, items:fls2, 
							fileErrors:ferrors, isDirectory:isDirectory}
	}
	return result
}

function htmlGen(fldrobj){
	//assume: fldrobj is returned from: fldrObjGen(path, simple=false)
	var args	= fldrobj.args
			args.isElectron	= isElectron
			args.path	= fldrobj.fldr

	var outfolder = path.join(__dirname,'tmp')
	if(fs.existsSync(outfolder)===false)
		fs.mkdirSync(outfolder)
	var outfile = path.join(__dirname,'tmp/index.html')
	//
	//if(args.fontsize[0]!=='"' && args.fontsize[0]!=="'")	//add quotes if needed
		//args.fontsize = `"${args.fontsize}"`
	var keys = {
		'folderDisplayed': fldrobj.fldr,
		'C:/website/node/imageView': __dirname.replace(/\\/g,'/'),
		'//ui.args=main.js/args':`ui.args=${JSON.stringify(fldrobj.args)}`,
		'//exts={}':'exts = '+JSON.stringify(fldrobj.exts),
		'//mediaTypes={}':'mediaTypes = '+JSON.stringify(fldrobj.mediaTypes),
		'//items=null':'items = '+JSON.stringify(fldrobj.items),
		'//ui.var.OS=null':`ui.var.OS = "${process.platform}"`,
		'//fileErrors=null':`fileErrors = ${JSON.stringify(fldrobj.fileErrors)}`
	}
	console.log('fldrobj.fileErrors', fldrobj.fileErrors)
	const tmpl	 = require(__dirname+'/lib/cls_tmplFile.js');
	tmpl.xlate({
		filename: path.join(__dirname,'lib/index.html'),
		outfile: outfile,
		keys: keys
	})
	return outfile
}
function browserLaunch(fldrobj) {
	//assume: fldrobj is returned from: fldrObjGen(path, simple=false)
	var args 		= fldrobj.args
	if(args.scale===undefined) scale = 1
	var win = new BrowserWindow({
		webPreferences:{						//added for Electron v3.1.8 to prevent "require not defined" error in chrome
			nodeIntegration: true,		//originally disabled for v3.1.1 as per: https://electronjs.org/docs/tutorial/security#2-disable-nodejs-integration-for-remote-content
		},
		//autoHideMenuBar: true,
		backgroundColor: '#00000',
		center: true,
		fullscreen: args.fullscreen,
		frame: true,
		height: args.height, //960
		icon: __dirname+'/resources/Folder-Season-Pack-icon.png',
		title:'folderView',
		width: args.width	//1280,
	})

		win.on('closed', function () {
		win = null
		//globalShortcut.unregisterAll()
	})
	win.on('enter-full-screen', function () {
		win.setMenuBarVisibility(false)
	})
	win.on('leave-full-screen', function () {
		win.setMenuBarVisibility(true)
	})

	/* load html from memory:
		- does not allow file system access
		var html = 'data:text/html,' + encodeURIComponent(tmpl.get())
		win.loadURL(html)
	*/
	win.loadURL(url.format({
		pathname: htmlGen(fldrobj),
		//pathname: htmlGen(fileObj.fldr, fileObj.items, fileObj.defaultImageNum, fileObj.exts, layout, shuffle, scale, fontsize),
		protocol: 'file:',
		slashes: true
	}))
	//if(args.fullscreen===true) win.setFullScreen(true)
	if(args.devtools===true) win.webContents.openDevTools()
	return win
}
function pathTrailingSlash(str){	//verifies path ends in a trailing slash
	//copied from lib/ui.js
	str = str.trim().replace(/\\/g,'/')
	if(str[str.length-1]!='/') str += '/'
	return str
}

