/*
		testPathSearch.js

		- started as a way to find files in subfolders, ended up as a general purpose folder walker

*/
'use strict'

console.log(`\n\ntestPathSearch.js\n`)

let options = {
			folder: "C:\\Users\\chris\\Videos\\Music Videos",		// __dirname,
			find: 'orange',	//'.mkv',	//text to find; ''===return all items
			findCase: false,						//case sensitive search
			findInvert: false,				//invert search result: !indexOf()
			subFolders: true,					//iterate subfolders
			foldersOnly: false,				//only return folders
}

console.log('Options:\n', options)

let start = new Date(),
		result = folderWalk(options),
		end = new Date() - start

if(result.items.length > 0){
	console.log('\nItems found:')
	let ii = 0
	result.items.forEach( obj => {
		console.log('  ', ++ii, obj.basename)
		if(obj.isDirectory)
			console.log('    ', obj.depth, obj.itemsTotal, obj.itemsFound, bytesToStr(obj.itemsSize))
	})
}
console.log('\nResults:')
console.log('  Find:', result.find)
console.log('  Folder:', result.folder)
console.log('  Items Total:', result.itemsTotal)
console.log('  Items found:', result.itemsFound)
console.log('  Items Size:', bytesToStr(result.itemsSize))

if(result.errors.length > 0){
	console.log('Errors encountered:')
	let ii = 0
	result.errors.forEach(function(msg) {
		console.log('  ', ++ii, msg)
	})
}
else
	console.log(' - No errors encountered')
console.log('\nDuration:', end, 'ms')


function bytesToStr(bytes){
	if(bytes < 1024) return bytes+' bytes'
	if(bytes < (1024 *1024)) return (Math.round(bytes /1024*100) /100)+' KB'
	if(bytes < (1024 *1024 *1024)) return (Math.round(bytes /1024/1024*100) /100)+' MB'
	return (Math.round(bytes /1024/1024/1024 *100) /100)+' GB'
}


function folderWalk(options) {
	//search folder for file with filename.indexOf(options.find) >= 0
	//returns:
	let result = {
		folder:options.folder,
		find:options.find,
		isDirectory:null,
		errors:[],
		items:[],
		itemsFnd:0,
		itemsTotal:0,
		itemsSize:0,
	}

	if(options.folder==null || options.folder=='') result.errors.push('options.folder is undefined')
	if(options.find==null) 					options.find = ''
	if(options.findCase == null)		options.findCase = false
	if(options.findInvert == null)	options.findInvert = false
	if(options.subFolders == null)	options.subFolders = false
	if(options.foldersOnly == null)	options.foldersOnly = false

	options.depth = (options.depth ?options.depth++ :0)		//depth in subfolder heirarchy, set locally
	result.depth = options.depth

	if(result.errors.length > 0)
		return result

	const fs = require('fs')
	const path = require('path');

	let folder = options.folder,
			find = options.find,
			findCase = options.findCase,
			findInvert = options.findInvert,
			subFolders = options.subFolders,
			foldersOnly = options.foldersOnly
			depth = options.depth

	result.isDirectory = true
	let stat = local_safeLstat(folder)
	if(stat!==null){
		if(stat.isDirectory()==false){
			folder = path.dirname(folder)
			result.isDirectory = false
		}
	}


	if(find != ''){
		if(findCase===false) find = find.toLowerCase()
	}

	let items = fs.readdirSync(options.folder),
			fnd = [],
			ferrors = [],
			tot = 0,
			totfnd = 0,
			totsize = 0

	for(var key in items){
		tot++
		let fn = items[key],
				fullpath = path.join(folder, fn),


		stat = local_safeLstat(fullpath)
		if(stat===null) {
			ferrors.push(`Could not stat: [${fullpath}]`)
			continue
		}

		let isdir = stat.isDirectory(),
				findMatch = true,		//default is create obj for item
				obj = null


		if(find != ''){		//seach filenames
			if(findCase===true)
				findMatch = (fn.indexOf(find) >= 0)
			else
				findMatch = (fn.toLowerCase().indexOf(find) >= 0)
			if(findInvert === true) findMatch = !findMatch
		}

		if(findMatch == true || (foldersOnly===true && isdir===true) ){
			obj = {
				basename:fn,
				size:stat.size,
				date:stat.mtime,
				isDirectory:isdir,
				path: folder,	//fullpath,
				ext:path.extname(fn).toLowerCase()
			}
		}
		if(findMatch===true){
			totfnd++
			totsize += obj.size
		}

		if(isdir === true && subFolders===true){
			let suboptions = Object.assign({}, options, {folder:fullpath, depth:depth}),
					subresult = folderWalk(suboptions)
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
			totfnd += subresult.itemsFound
			totsize += subresult.itemsSize
			tot += subresult.itemsTotal
			if(obj != null) {
				obj.itemsFound = subresult.itemsFound
				obj.itemsSize = subresult.itemsSize
				obj.itemsTotal = subresult.itemsTotal
			}
//console.log(0, obj)
		}

		if(obj != null){
			if(foldersOnly===false)
				fnd.push(obj)
			else								//foldersOnly === true
			if(find === ''){		//return all folders
				if(obj.isDirectory===true)
					fnd.push(obj)
			}
			else								//return folders with matching items
			if(obj.isDirectory===true  && obj.itemsFound >0)
						fnd.push(obj)
		}
	}

	result.errors = ferrors
	result.items = fnd			//may be folders only
	result.itemsFound = totfnd
	result.itemsSize = totsize
	result.itemsTotal = tot
	return result

	function local_safeLstat(apath) {
		var result = null
		try { result = fs.lstatSync(apath) }
		catch(e){ console.log('local_safeLstat() error: ', e) }
		return result
	}
}
