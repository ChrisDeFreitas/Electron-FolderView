'use strict';

const fs = require('fs');
const path = require('path');
const url = require('url')

const electron = require('electron')
const {app, BrowserWindow, dialog,  globalShortcut} = electron
const sizeOf = require(__dirname+'/node_modules/image-size')

//handle commandline arguments
var argtoobj = require( 'argv-to-object' );
var argmap = {
		devtools:{		keypath:'devtools', 	type:'boolean', default:false },
		fontsize:{		keypath:'fontsize', 	type:'string',  default:'12px',	notes:'set the default font size for the document.' },
		fullscreen:{	keypath:'fullscreen', type:'boolean', default:false },
		layout:{			keypath:'layout', 		type:'string',	default:'wall',	range:['cols','rows','vertical','wall']
	 				, notes:'cols(masonary): position based on available vertical space. '},
		path:{				keypath:'path', 			type:'string',	default:'',			notes:'no trailing backslash allowed (for argv-to-object).' },
		scale:{				keypath:'scale',			type:'number',  default:1,		range:{greaterThan:0}, notes:"scale size of grid items." },
		shuffle:{			keypath:'shuffle',		type:'boolean',	default:false,	notes:'randomize display of items'}
		//zoom:{				keypath:'zoom', 			type:'number', default:0,				range:{min:0, max:3} , notes:'corresponds to browser zoom functionality'}
}
var args = argtoobj( argmap );
console.log(args)
if(args.layout==='wall') 	args.layout='packery'
if(args.layout==='rows')  args.layout='fitRows'
if(args.layout==='vertical')	args.layout='vertical'
if(args.layout==='cols')	args.layout='masonry'
//return

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
//
log('Init..')


var mainWindow=null
var isElectron = (app!=undefined)
if(isElectron===false){	//nodejs functionality
	log('nodejs app')
	var fileObj = parseArgs()
	scaleFix(fileObj)
	var file = htmlGen(fileObj.fldr, fileObj.items, fileObj.defaultImageNum, fileObj.exts, args.layout, args.shuffle, args.scale, args.fontsize)
	console.log('Launching:['+file+']')
	const exec = require('child_process').exec;
	const child = exec(file, (error, stdout, stderr) => {
	  //error gen if browser already opened: if (error) throw error
	  console.log('Launch results:\n['+stdout+']');
	})
}
else {		//electron functionality
	log('electron app')
	appInit()
}

function appInit(){
	app.on('ready', function() {
		var fileObj = parseArgs()
		scaleFix(fileObj)
		mainWindow = browserLaunch(fileObj, args.devtools, args.scale, args.fullscreen, args.layout, args.shuffle, args.fontsize)
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

exports.fldrLoad = function(fldr) {
	if(fldr===undefined) fldr=args.path
	return fileListGen(fldr)
}
exports.browserLaunch = function(fldr, devtools, scale, fullscreen, layout, shuffle, fontsize) {
	var fileObj = fileListGen(fldr)
	var win = browserLaunch(fileObj, devtools, scale, fullscreen, layout, shuffle, fontsize)
	return win
}

function parseArgs() {
	var file = ''
	if(args.path === ''){
		if(isElectron===false){
			file='./'
		}
		else {
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
		}
		args.path = file
	}
	else {
		file = args.path
	}
	log('Reading files..')
	log('Argument: ['+file+']')

	file = file.trim()
	if(file==='') process.exit(1)
//	if(file[file.length-1]==='"')		//on windows trailing backslash, \, interpretted as escape
//		file = file.substr(0, file.length-1)
	return fileListGen(file)
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
function fileListGen(file) {
	var exts={}
	var defaultfile = path.basename(file)
	var folder = path.dirname(file)
	var stat = fs.lstatSync(file)
	if(stat.isDirectory()==true){
		log('Argument is directory')
		defaultfile = ''
		folder = file
	}
	var imgtypes =['.bmp','.ico','.gif','.jpg','.png']
	var medtypes = ['.avi','.flc','.flv','.mkv','.mov','.mp3','.mp4','.mpg','.mov','.ogg','.qt','.swf','.wma','.wmv']
	var fls = fs.readdirSync(folder)
	var fls2 = []
	var id=-1
	var defaultImageNum =null
	for(var key in fls){
		var val = fls[key]
		var ext = path.extname(val).toLowerCase()
		var fn = path.basename(val)
		var fullfilename = path.resolve(folder, val)

		stat = fs.lstatSync( fullfilename )
		id++
		if(defaultImageNum===null
		&& defaultfile==fn) {
				defaultImageNum = id	//image in argv displayed when web page opens
		}
		var obj = {
			basename: fn, date:stat.ctime, size:stat.size,
			isDirectory:stat.isDirectory(),	isFile:stat.isFile(),
			path: fullfilename,
			pid: id,
			src: 'file:///'+fullfilename.replace(/\\/g,'/'),
			title: val,
			type: ext
		}
		if(obj.isDirectory===true){				//folders
			obj.src = 'file:///'+__dirname+"/lib/folder_closed_64.png"
			obj.w = 64
			obj.h = 64
			obj.type = 'folder'
		}
		else
		if(imgtypes.indexOf(ext) >= 0){			//image types, not svg
			var dim = sizeOf(fullfilename)
			obj.w = dim.width
			obj.h = dim.height
		}
		else
		if(medtypes.indexOf(ext) >= 0){			//media types
			obj.w = 300
			obj.h = 200
		}
		else
		if(ext === '.svg'){							//svg files
			obj.w = 300
			obj.h = 200
		}
		else{			//handle other types
			obj.src = 'file:///'+__dirname+"/lib/new_document_64.png"
			obj.w = 64
			obj.h = 64
		}
		//store file types for menu
		if(exts[obj.type]===undefined) exts[obj.type]=1
		else exts[obj.type]++
		fls2.push(obj)
	}
	return {fldr:file, items:fls2, defaultImageNum:defaultImageNum, exts:exts}
}
function htmlGen(fldr, fls2, defaultImageNum, exts, layout, shuffle, scale, fontsize){
	var outfolder = path.join(__dirname,'tmp')
	if(fs.existsSync(outfolder)===false)
		fs.mkdirSync(outfolder)
	var outfile = path.join(__dirname,'tmp/index.html')
	//
	if(layout===undefined) layout='packery'
	if(fontsize[0]!=='"' && fontsize[0]!=="'")	//add quotes if needed
		fontsize = `"${fontsize}"`
	var keys = {
		'folderDisplayed': fldr,
		'C:/website/node/imageView': __dirname.replace(/\\/g,'/'),
		'var isElectron=false': 		`var isElectron = ${isElectron}`,
		'var lastLayoutMode=null':	`var lastLayoutMode="${layout}"`,
		'var shuffle=false':				`var shuffle=${shuffle}`,
		'var scale=1':							`var scale=${scale}`,
		"var fontSize='12px'":			`var fontSize=${fontsize}`,
		'var exts={}': 							'var exts = '+JSON.stringify(exts),
		'var items=null': 					'var items = '+JSON.stringify(fls2),
		'var defaultImageNum=null': `var defaultImageNum=${defaultImageNum}`
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
		//defaultImageNum: defaultImageNum,
		keys: keys
	})
	return outfile
}
function browserLaunch(fileObj, devTools, scale, fullscreen, layout, shuffle, fontsize) {
	//const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize
	if(scale===undefined) scale = 1
	var win = new BrowserWindow({
		//autoHideMenuBar: true,
		backgroundColor: '#00000',
		center: true,
		//fullscreen: true,
		frame: true,
		icon: __dirname+'/lib/Folder-Season-Pack-icon.png',
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
		globalShortcut.unregisterAll()
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
		pathname: htmlGen(fileObj.fldr, fileObj.items, fileObj.defaultImageNum, fileObj.exts, layout, shuffle, scale, fontsize),
		protocol: 'file:',
		slashes: true
	}))
	if(fullscreen===true)
		win.setFullScreen(true)
	if(devTools===true)
		win.webContents.openDevTools()
	return win
}
