'use strict';

const fs = require('fs');
const path = require('path');
const url = require('url')

const electron = require('electron')
const {app, BrowserWindow/*, dialog,  globalShortcut*/} = electron
const sizeOf = require(__dirname+'/node_modules/image-size')

//handle commandline arguments
var argtoobj = require( 'argv-to-object' );
var argmap = {
		descending:{keypath:'descending',	type:'boolean', default:false, notes:'items in descending order' },
		devtools:{	keypath:'devtools', 	type:'boolean', default:false },
		find:{			keypath:'find',				type:'string',  default:'',	notes:"search flickr for images with `find`.(not implemented in FileBrowser, see chrisd.gq/slideshow?find=Altay)" },
		fontsize:{	keypath:'fontsize', 	type:'string',  default:'12px',	notes:'set the default font size for the document.' },
		folders:{		keypath:'folders',	type:'string', default:'default', range:['default','first','hidden','last'] },
		fullscreen:{	keypath:'fullscreen', type:'boolean', default:false },
		layout:{			keypath:'layout', 		type:'string',	default:'cols',	range:['cols','rows','vert','wall']
	 				, notes:`cols:"default to item.width=(window.innerWidth/3).",rows:"item.height=300px",vert:"single col",wall:"wallboard of images"` },
		order:{				keypath:'order', 			type:'string',	default:'name', range:['date','name','size','type'],			notes:'Sort order of items' },
		path:{				keypath:'path', 			type:'string',	default:'',			notes:'no trailing backslash allowed (for argv-to-object).' },
		scale:{				keypath:'scale',			type:'number',  default:1, range:{greaterThan:0}, notes:"scale size of grid items." },
		scroll:{			keypath:'scroll',			type:'boolean', default:false,	notes:"turn on/off scrolling grid whenever items loaded." },
		shuffle:{			keypath:'shuffle',		type:'boolean',	default:false,	notes:"shuffle grid items via arrShuffle()" }
}
var args = argtoobj( argmap );
//console.log(args)

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
			console.log(`${__filename}, Line #${lineno}:`)
		console.log(msg)
		return
	}
	if(lineno!==undefined)
		mainWindow.webContents.send('applog',`${__filename}, Line #${lineno}:`)
	mainWindow.webContents.send('applog',msg)
}

/*
exports.win = function(){
	return mainWindow
}*/
exports.fldrLoad = function(fldr) {
	if(fldr===undefined) fldr=args.path
	return fldrObjGen(fldr)
}
/*
exports.browserLaunch = function(fldr) {
	var fldrobj = fldrObjGen(fldr)
	var win = browserLaunch(fldrobj)
	return win
}
*/
//

log('Init..')

var mainWindow=null
var isElectron = (app!=undefined)
var isFolderView = (process.argv[0].indexOf('FolderView.exe') >= 0)

if(isElectron===false){	//nodejs functionality
	log('nodejs app running')
	var fldrobj = parseArgs()
	var htmlfile = htmlGen(fldrobj)
	console.log('Launching:['+htmlfile+']')
	const exec = require('child_process').exec;
	const child = exec(htmlfile, (error, stdout, stderr) => {
	  //error gen if browser already opened: if (error) throw error
	  console.log('Launch results:\n['+stdout+']');
	})
}
else {		//electron functionality
	if(isFolderView)	log('FolderView.exe running')
	else	log('electron app running')
	appInit()
}

function appInit(){
	app.on('ready', function() {
		var fldrobj = parseArgs()
		mainWindow = browserLaunch(fldrobj)
		//mainWindow = browserLaunch(fileObj, args.devtools, args.scale, args.fullscreen, args.layout, args.shuffle, args.fontsize)
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
	catch(e){ console.log('safeLstat() error: ', e) }
	return result
}
function parseArgs() {
	var file = ''

	if(args.path === ''){	//check for path on the commandline; useCase: Windows drag and drop
		console.log('no --path, checking for default argv path..')
		console.log('argv: ',process.argv)
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
		if(args.path!='')
			console.log('Found:', args.path)
		else
			console.log('Default argv path not found')
	}
	if(args.path === ''){
		if(isElectron===false){
			file='./'
		}
		else {
			/*
				//disablel use of openDialog, instead use pathBar.js in index.html/init()
				file = dialog.showOpenDialog({
				defaultPath: './',	//__dirname,
				filter:[ //not used with "openDirectory"
						{name: 'All Files', extensions: ['*']}
					],
				properties: ['openDirectory'],
				title:'Select folder to view'
			})
			if(file===undefined || file.length===0) process.exit(1)
			file = file[0]
			*/
		}
		args.path = file
	}
	else {
		file = args.path
	}
	if(args.descending===undefined) args.descending=false
	if(args.devtools===undefined) args.devtools=false
	if(args.folders===undefined) args.folders='default'
	if(args.fontsize[0]==='"' || args.fontsize[0]==="'") {	//remove quotes if needed
		console.log("Fix args.fontsize: ", args.fontsize)
		args.fontsize = args.fontsize.substr(1, args.fontsize.length-2)
	}
	if(args.layout===undefined) args.layout='cols'
	if(args.order===undefined) args.order='name'
	if(args.shuffle===undefined) args.shuffle=false
	log('Reading files..')
	//log('Argument: ['+file+']')
	log('Arguments:')
	log(args)
	file = file.trim()
	//if(file==='') //process.exit(1)
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
			console.log('scale has an undefined value: ['+args.scale+'], using 1 instead.')
			args.scale=1
		}
	}
}
function fldrObjGen(file) {
	if(file=='') //process.exit(1)
		return {args:args, exts:{}, fldr:file, items:[]}
	var exts={}
	var defaultfile = path.basename(file)
	var folder = path.dirname(file)
	var stat = safeLstat(file)	//fs.lstatSync(file)
	if(stat!==null){
		if(stat.isDirectory()==true){
			log('--path is a folder')
			defaultfile = ''
			folder = file
		}	else {
			log('--path is a file')
		}
	}
	var imgtypes =['.bmp',/*'.ico',*/'.gif','.jpg','.jpeg','.png']
	var medtypes = ['.avi','.flc','.flv','.mkv','.mov','.mp3','.mp4','.mpg','.mov','.ogg','.qt','.swf','.wma','.wmv']
	var fls = fs.readdirSync(folder)
	var fls2 = []
	var id=-1
	var defaultImageName=null
	var defaultImageNum=null
	var ferrors = []
	for(var key in fls){
		var val = fls[key]
		var ext = path.extname(val).toLowerCase()
		var fn = path.basename(val)
		var fullfilename = path.resolve(folder, val)

		stat = safeLstat(fullfilename)	//fs.lstatSync( fullfilename )
		if(stat===null) {
			ferrors.push(fullfilename)
			continue
		}
		++id
		if(defaultImageNum===null	&& defaultfile==fn) {
			defaultImageName = fn
			defaultImageNum = id	//image in argv displayed when web page opens
			console.log('defaultImageNum:',defaultImageNum, defaultImageName)
		}
		var obj = {
			basename:fn, date:stat.mtime, size:stat.size,
			isDirectory:stat.isDirectory(),
			//isFile:stat.isFile(),
			path: fullfilename,
			pid: id,
			src: 'file:///'+fullfilename.replace(/\\/g,'/'),
			//src: function(){return 'file:///'+this.path.replace(/\\/g,'/'), },
			title: val,
			type: ext
		}
		if(obj.isDirectory===true){				//folders
			obj.src = 'file:///'+__dirname+"/resources/folder_closed_64.png"
			obj.w = 320
			obj.h = 200
			obj.type = 'folder'
		}	else
		if(imgtypes.indexOf(ext) >= 0){			//image types, not svg
			try{
				var dim = sizeOf(fullfilename)
				obj.w = dim.width
				obj.h = dim.height
			}
			catch(x) {
				obj.w = 160
				obj.h = 100
			}
		}	else
		if(medtypes.indexOf(ext) >= 0){			//media types
			obj.w = 320
			obj.h = 200
		}	else
		if(obj.type=='youtube'){
			html += `<iframe id="img${obj.pid}"	src="${obj.src}" frameborder="0" allowfullscreen></iframe>
			<div style='padding:0; width:${300 *scale}px; overflow:hidden; text-overflow:ellipsis;'>${obj.basename}</div>`
		} else
		if(ext === '.svg'){							//svg files
			obj.w = 320
			obj.h = 200
		}	else{			//handle other types
			obj.src = 'file:///'+__dirname+"/resources/new_document_64.png"
			obj.w = 320
			obj.h = 200
		}
		//store file types for filter menu
		if(exts[obj.type]===undefined) exts[obj.type]=1
		else exts[obj.type]++
		fls2.push(obj)
	}
	args.defaultImageName = defaultImageName
	args.defaultImageNum = defaultImageNum
	var result = {args:args, exts:exts, fldr:file, items:fls2, fileErrors:ferrors}
	return result
}

//function htmlGen(fldr, fls2, defaultImageNum, exts, layout, shuffle, scale, fontsize){
function htmlGen(fldrobj){
	var //fldr	= fldrobj.fldr,
			//items	= fldrobj.items,
			//defaultImageNum= fldrobj.defaultImageNum,
			//exts	= fldrobj.exts,
			args	= fldrobj.args
			args.isElectron	= isElectron
			args.path	= fldrobj.fldr
			//layout	=args.layout,
			//shuffle	=args.shuffle,
			//scale		= args.scale,
			//fontsize=args.fontsize

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
		'//items=null':'items = '+JSON.stringify(fldrobj.items),
	}
	if(isElectron===true){
		keys['<!--electron_comment_begin-->']= '<!--'
		keys['<!--electron_comment_end-->']  = '-->'
	}
	else{
		keys['//nodejs_comment_begin']= '/*'
		keys['//nodejs_comment_end']  = '*/'
	}
	const tmpl	 = require(__dirname+'/lib/cls_tmplFile.js');
	tmpl.xlate({
		filename: path.join(__dirname,'lib/index.html'),
		outfile: outfile,
		keys: keys
	})
	return outfile
}
//function browserLaunch(fileObj, defaultImageNum, devTools, scale, fullscreen, layout, shuffle, fontsize) {
function browserLaunch(fldrobj) {
	var //fileObj = fldrobj,
			args 		= fldrobj.args
	if(args.scale===undefined) scale = 1
	var win = new BrowserWindow({
		//autoHideMenuBar: true,
		backgroundColor: '#00000',
		center: true,
		//fullscreen: true,
		frame: true,
		icon: __dirname+'/resources/Folder-Season-Pack-icon.png',
		title:'folderView',
		//replaced by scale: webPreferences : {zoomFactor:zoomfactor},
		width:1280,
		height:960
	})

	/*globalShortcut.register('ctrl+F12', () => {
		win.webContents.openDevTools()
	})*/

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
	if(args.fullscreen===true)
		win.setFullScreen(true)
	if(args.devtools===true)
		win.webContents.openDevTools()
	return win
}
