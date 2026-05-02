'use strict';

const fs = require('fs');
const path = require('path');
const url = require('url')
const crypto = require('crypto')

const electron = require('electron')
const {app, BrowserWindow, ipcMain/*, dialog,  globalShortcut*/} = electron
const imgDimensions = require(__dirname+'/node_modules/image-size')

exports.startTime = Date.now()

let scanTasks = {}
let hashTasks = {}

function getTaskId() {
	return Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9)
}

function asyncSafeLstat(apath) {
	return new Promise((resolve) => {
		fs.lstat(apath, (err, stat) => {
			if (err) {
				resolve(null)
			} else {
				resolve(stat)
			}
		})
	})
}

async function asyncFldrObjGen(file, simple, taskId, progressCallback) {
	if(file=='')
		return {args:args, exts:{}, mediaTypes:{}, fldr:file, items:[], isDirectory:null, fileErrors:[`Error, path argument has an error:[${file}].`]}
	if(simple== undefined) simple = false

	let exts={},
			mediaTypes={},
			folder = '',
			defaultfile = '',
			isDirectory = true,
			stat = await asyncSafeLstat(file)
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

	return new Promise((resolve, reject) => {
		fs.readdir(folder, async (err, fls) => {
			if (err) {
				resolve({args:args, exts:{}, mediaTypes:{}, fldr:file, items:[], isDirectory:isDirectory, fileErrors:[`Error reading directory: ${err.message}`]})
				return
			}

			var fls2 = []
			var id=-1
			var defaultImageName=null
			var defaultImageNum=null
			var ferrors = []
			var dirname__ = __dirname.replace(/\\/g,'/')
			var processed = 0
			var total = fls.length

			for(var key in fls){
				if (scanTasks[taskId] && scanTasks[taskId].cancelled) {
					resolve({args:args, exts:{}, mediaTypes:{}, fldr:file, items:[], isDirectory:isDirectory, fileErrors:['Cancelled by user']})
					return
				}

				let val = fls[key],
						fn = path.basename(val),
						posixpath = path.join(folder, val).replace(/\\/g,'/')

				stat = await asyncSafeLstat(posixpath)
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
						sortname:fn.toLowerCase(),
					}
					fls2.push(obj)
					processed++
					if (progressCallback && processed % 50 === 0) {
						progressCallback({processed: processed, total: total})
					}
					continue
				}

				++id
				let	ext = path.extname(val).toLowerCase()

				if(isDirectory === false && defaultImageNum===null	&& defaultfile==fn) {
					defaultImageName = fn
					defaultImageNum = id
				}

				var obj = {
					basename:fn, date:stat.mtime, size:stat.size,
					isDirectory:stat.isDirectory(),
					sortname:fn.toLowerCase(),
					mediaType: 'unknown',
					path: posixpath,
					pid: id,
					uid: id,
					w: 320,
					h: 200,
					src: 'file:///'+posixpath,
					title: val,
					type: ext
				}
				if(obj.isDirectory===true){
					obj.mediaType = 'folder'
					if(obj.path[obj.path -1] != path.posix.sep)
						obj.path += path.posix.sep
					obj.src = 'file:///'+dirname__+"/resources/icons/folder-open.svg"
					obj.type = 'folder'
				}	else
				if(imgtypes.indexOf(ext) >= 0){
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
				if(vidtypes.indexOf(ext) >= 0){
					obj.mediaType = 'video'
				}	else
				if(audtypes.indexOf(ext) >= 0){
					obj.mediaType = 'audio'
				}	else
				if(doctypes.indexOf(ext) >= 0){			
					obj.mediaType = 'document'
				}	
				else{
					obj.src = 'file:///'+dirname__+"/resources/new_document_64.png"
				}
				if(exts[obj.type]===undefined) exts[obj.type]=1
				else exts[obj.type]++
				if(mediaTypes[obj.mediaType]===undefined) mediaTypes[obj.mediaType]=1
				else mediaTypes[obj.mediaType]++
				fls2.push(obj)
				
				processed++
				if (progressCallback && processed % 50 === 0) {
					progressCallback({processed: processed, total: total})
				}
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
			resolve(result)
		})
	})
}

async function asyncFolderWalk(options, taskId, progressCallback) {
	let result = {
		folder:options.folder,
		find:options.find,
		date:null,
		isDirectory:null,
		errors:[],
		items:[],
		fileCount:0,
		fileSize:0,
		folderCount:0,
		folderSize:0,
		treeCount:0,
		treeSize:0
	}

	if(options.folder==null || options.folder=='') result.errors.push('options.folder is undefined')
	if(options.summary==null) 			options.summary = false
	if(options.find==null) 					options.find = ''
	if(options.findCase == null)		options.findCase = false
	if(options.findInvert == null)	options.findInvert = false
	if(options.findRegex == null)		options.findRegex = false
	if(options.subFolders == null)	options.subFolders = false

	options.depth = (options.depth === undefined ?0 :++options.depth)

	if(result.errors.length > 0)
		return result

	let folder = options.folder,
			posixFolder = local_pathTrailingSlash( folder.replace(/\\/g,'/')),
			summary = options.summary,
			find = options.find,
			findCase = options.findCase,
			findInvert = options.findInvert,
			findRegex = options.findRegex,
			subFolders = options.subFolders,
			depth = options.depth

	result.isDirectory = true
	let stat = await asyncSafeLstat(folder)
	if(stat!==null){
		if(stat.isDirectory()==false){
			folder = path.dirname(folder)
			result.isDirectory = false
		}
	}
	result.date = stat.mtime

	if(find != ''){
		if(findRegex===true){
			if(findCase===true)
				find = new RegExp(find)
			else
				find = new RegExp(find, 'i')
		}else
		if(findCase===false)
			find = find.toLowerCase()
	}

	return new Promise((resolve, reject) => {
		fs.readdir(options.folder, async (err, items) => {
			if (err) {
				result.errors.push(`Error reading directory: ${err.message}`)
				resolve(result)
				return
			}

			let ferrors = [],
					filecount = 0,
					filesize = 0,
					foldercount = 0,
					foldersize = 0,
					treecount = 0,
					treesize = 0,
					fnd = [],
					processed = 0,
					total = items.length

			for(var key in items){
				if (scanTasks[taskId] && scanTasks[taskId].cancelled) {
					result.errors.push('Cancelled by user')
					resolve(result)
					return
				}

				let fn = items[key],
						fullpath = path.join(folder, fn),
						suboptions = null,	subresult = null

				stat = await asyncSafeLstat(fullpath)
				if(stat===null) {
					ferrors.push(`Could not stat: [${fullpath}]`)
					continue
				}

				let isdir = stat.isDirectory(),
						findMatch = true,
						itm = null

				if(find !== ''){
					if(findRegex===true){
						findMatch = find.test(fn)
					}else
					if(findCase===true)
						findMatch = (fn.indexOf(find) >= 0)
					else
						findMatch = (fn.toLowerCase().indexOf(find) >= 0)
				}
				if(findInvert === true) findMatch = !findMatch

				if(findMatch == true 
				|| (subFolders===true && isdir===true) 
				){
					itm = {
							basename:	fn,
							size:			stat.size,
							date:			stat.mtime,
							isDirectory: stat.isDirectory(),
							path: 		posixFolder,
							ext: 			path.extname(fn).toLowerCase(),
							depth:		depth
						}
				}
				if(findMatch===true){
					treecount++
					if(isdir===true){
						foldercount++
					}
					else{
						filecount++
						filesize += itm.size
						treesize += itm.size
					}
				}

				if(subFolders===true && isdir === true){
					suboptions = Object.assign({}, options, {folder:fullpath, depth:depth})
					subresult = await asyncFolderWalk(suboptions, taskId, progressCallback)

					if(summary === false){
						filecount += subresult.fileCount
						filesize 	+= subresult.fileSize
						foldercount += subresult.folderCount
						foldersize+= subresult.folderSize
						treecount += subresult.treeCount
						treesize  += subresult.treeSize
					}
					else{
						foldersize+= subresult.treeSize
						treecount += subresult.treeCount
						treesize  += subresult.treeSize
					}

					if(itm != null) {
						itm.fileCount 	= subresult.fileCount
						itm.fileSize 		= subresult.fileSize
						itm.folderCount = subresult.folderCount
						itm.folderSize	= subresult.folderSize
						itm.treeCount 	= subresult.treeCount
						itm.treeSize  	= subresult.treeSize
					}
				}

				if(itm != null){
					if(summary===false){
						if(findMatch===true)
							fnd.push(itm)
					}else
					if(summary === true){
						if(depth===0){
							if(subFolders===true && itm.isDirectory === true)
								fnd.push(itm)
						}
					}
				}

				if(subresult != null){
					if(subresult.errors.length > 0){
						subresult.errors.forEach(function(element) {
							ferrors.push(element)
						})
					}
					if(subresult.items.length > 0){
						subresult.items.forEach(function(element) {
							fnd.push(element)
						})
					}
				}

				processed++
				if (progressCallback && processed % 100 === 0) {
					progressCallback({processed: processed, total: total, phase: 'scanning'})
				}
			}

			result.errors = ferrors
			result.items = fnd
			result.fileCount	= filecount
			result.fileSize 	= filesize
			result.folderCount= foldercount
			result.folderSize = foldersize
			result.treeCount	= treecount
			result.treeSize 	= treesize
			resolve(result)
		})
	})

	function local_pathTrailingSlash(str, os){
		str = str.trim()
		if(str[str.length-1]!='/' && str[str.length-1]!='\\') str += '/'
		return str
	}
}

async function collectFilesAsync(folder, includeSubfolders, skipZeroSize, taskId, progressCallback) {
	const result = []
	const queue = [folder]
	let processed = 0

	while (queue.length > 0) {
		if (scanTasks[taskId] && scanTasks[taskId].cancelled) {
			return { cancelled: true, files: result }
		}

		const currentFolder = queue.shift()
		
		try {
			const items = await new Promise((resolve, reject) => {
				fs.readdir(currentFolder, (err, files) => {
					if (err) reject(err)
					else resolve(files)
				})
			})

			for (let item of items) {
				if (scanTasks[taskId] && scanTasks[taskId].cancelled) {
					return { cancelled: true, files: result }
				}

				const fullPath = path.join(currentFolder, item)
				const stat = await asyncSafeLstat(fullPath)

				if (stat === null) continue

				if (stat.isDirectory()) {
					if (includeSubfolders) {
						queue.push(fullPath)
					}
				} else if (stat.isFile()) {
					if (skipZeroSize && stat.size === 0) {
						continue
					}
					result.push({
						path: fullPath.replace(/\\/g, '/'),
						size: stat.size,
						basename: item
					})
				}

				processed++
				if (progressCallback && processed % 50 === 0) {
					progressCallback({ processed: processed, phase: 'collecting' })
				}
			}
		} catch (e) {
			continue
		}
	}

	return { cancelled: false, files: result }
}

function groupBySize(files) {
	const groups = {}
	for (let file of files) {
		const size = file.size.toString()
		if (!groups[size]) {
			groups[size] = []
		}
		groups[size].push(file)
	}
	return groups
}

async function calculateFileHashAsync(filePath, taskId) {
	return new Promise((resolve, reject) => {
		const hash = crypto.createHash('sha256')
		const stream = fs.createReadStream(filePath, { highWaterMark: 65536 })
		
		stream.on('data', (chunk) => {
			if (hashTasks[taskId] && hashTasks[taskId].cancelled) {
				stream.destroy()
				resolve(null)
				return
			}
			hash.update(chunk)
		})
		
		stream.on('end', () => {
			resolve(hash.digest('hex'))
		})
		
		stream.on('error', (err) => {
			console.error('Hash calculation error:', err)
			resolve(null)
		})
	})
}

async function calculateHashesAsync(candidates, taskId, progressCallback) {
	const hashGroups = {}
	let processed = 0
	const total = candidates.length

	for (let i = 0; i < candidates.length; i++) {
		if (hashTasks[taskId] && hashTasks[taskId].cancelled) {
			return { cancelled: true, hashGroups: hashGroups }
		}

		const file = candidates[i]
		const hash = await calculateFileHashAsync(file.path, taskId)

		if (hash) {
			if (!hashGroups[hash]) {
				hashGroups[hash] = []
			}
			hashGroups[hash].push(file)
		}

		processed++
		if (progressCallback) {
			progressCallback({ processed: processed, total: total, phase: 'hashing' })
		}

		await new Promise(resolve => setImmediate(resolve))
	}

	return { cancelled: false, hashGroups: hashGroups }
}

ipcMain.on('folder-scan-start', async (event, options) => {
	const { folder, simple, taskId } = options
	
	scanTasks[taskId] = {
		cancelled: false,
		webContents: event.sender
	}

	event.reply('folder-scan-started', { taskId })

	try {
		const result = await asyncFldrObjGen(folder, simple, taskId, (progress) => {
			event.reply('folder-scan-progress', { taskId, progress })
		})

		if (scanTasks[taskId] && scanTasks[taskId].cancelled) {
			event.reply('folder-scan-cancelled', { taskId })
		} else {
			event.reply('folder-scan-complete', { taskId, result })
		}
	} catch (error) {
		event.reply('folder-scan-error', { taskId, error: error.message })
	} finally {
		delete scanTasks[taskId]
	}
})

ipcMain.on('folder-scan-cancel', (event, taskId) => {
	if (scanTasks[taskId]) {
		scanTasks[taskId].cancelled = true
	}
})

ipcMain.on('folder-walk-start', async (event, options) => {
	const { taskId, ...walkOptions } = options
	
	scanTasks[taskId] = {
		cancelled: false,
		webContents: event.sender
	}

	event.reply('folder-walk-started', { taskId })

	try {
		const result = await asyncFolderWalk(walkOptions, taskId, (progress) => {
			event.reply('folder-walk-progress', { taskId, progress })
		})

		if (scanTasks[taskId] && scanTasks[taskId].cancelled) {
			event.reply('folder-walk-cancelled', { taskId })
		} else {
			event.reply('folder-walk-complete', { taskId, result })
		}
	} catch (error) {
		event.reply('folder-walk-error', { taskId, error: error.message })
	} finally {
		delete scanTasks[taskId]
	}
})

ipcMain.on('folder-walk-cancel', (event, taskId) => {
	if (scanTasks[taskId]) {
		scanTasks[taskId].cancelled = true
	}
})

ipcMain.on('duplicate-scan-start', async (event, options) => {
	const { folder, includeSubfolders, skipZeroSize, taskId } = options
	
	scanTasks[taskId] = {
		cancelled: false,
		webContents: event.sender
	}
	hashTasks[taskId] = {
		cancelled: false,
		webContents: event.sender
	}

	event.reply('duplicate-scan-started', { taskId })

	try {
		event.reply('duplicate-scan-phase', { taskId, phase: 'collecting', message: 'Collecting files...' })
		
		const collectResult = await collectFilesAsync(folder, includeSubfolders, skipZeroSize, taskId, (progress) => {
			event.reply('duplicate-scan-progress', { taskId, progress })
		})

		if (collectResult.cancelled || (scanTasks[taskId] && scanTasks[taskId].cancelled)) {
			event.reply('duplicate-scan-cancelled', { taskId })
			return
		}

		const files = collectResult.files
		event.reply('duplicate-scan-files-collected', { taskId, fileCount: files.length })

		if (files.length === 0) {
			event.reply('duplicate-scan-complete', { 
				taskId, 
				result: { 
					totalFiles: 0, 
					duplicateGroups: [], 
					totalDuplicateFiles: 0, 
					wastedSpace: 0 
				} 
			})
			return
		}

		event.reply('duplicate-scan-phase', { taskId, phase: 'grouping', message: 'Grouping files by size...' })
		
		const sizeGroups = groupBySize(files)
		
		let candidates = []
		for (let size in sizeGroups) {
			if (sizeGroups[size].length > 1) {
				candidates = candidates.concat(sizeGroups[size])
			}
		}

		if (candidates.length === 0) {
			event.reply('duplicate-scan-complete', { 
				taskId, 
				result: { 
					totalFiles: files.length, 
					duplicateGroups: [], 
					totalDuplicateFiles: 0, 
					wastedSpace: 0,
					noCandidates: true
				} 
			})
			return
		}

		event.reply('duplicate-scan-phase', { 
			taskId, 
			phase: 'hashing', 
			message: `Calculating hashes for ${candidates.length} potential duplicates...`,
			total: candidates.length
		})

		const hashResult = await calculateHashesAsync(candidates, taskId, (progress) => {
			event.reply('duplicate-scan-progress', { taskId, progress })
		})

		if (hashResult.cancelled || (hashTasks[taskId] && hashTasks[taskId].cancelled)) {
			event.reply('duplicate-scan-cancelled', { taskId })
			return
		}

		const hashGroups = hashResult.hashGroups
		let duplicates = []
		let totalDuplicateFiles = 0
		let wastedSpace = 0

		for (let hash in hashGroups) {
			const group = hashGroups[hash]
			if (group.length > 1) {
				duplicates.push({
					hash: hash,
					size: group[0].size,
					files: group
				})
				totalDuplicateFiles += group.length
				wastedSpace += group[0].size * (group.length - 1)
			}
		}

		const result = {
			totalFiles: files.length,
			duplicateGroups: duplicates,
			totalDuplicateFiles: totalDuplicateFiles,
			wastedSpace: wastedSpace
		}

		event.reply('duplicate-scan-complete', { taskId, result })

	} catch (error) {
		console.error('Duplicate scan error:', error)
		event.reply('duplicate-scan-error', { taskId, error: error.message })
	} finally {
		delete scanTasks[taskId]
		delete hashTasks[taskId]
	}
})

ipcMain.on('duplicate-scan-cancel', (event, taskId) => {
	if (scanTasks[taskId]) {
		scanTasks[taskId].cancelled = true
	}
	if (hashTasks[taskId]) {
		hashTasks[taskId].cancelled = true
	}
})

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
		videoURL:{		type:'string',	default:'',		notes:'Open Video Download with this URL selected; true = automatically open VideoDownload window.', alias:['videourl','--videoURL'] },
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

