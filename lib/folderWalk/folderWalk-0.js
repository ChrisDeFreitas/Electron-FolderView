/*
	folderWalk.js

	- functions to iterate folders and search for an item name or return all items
	- search types: default = indexOf(), regexp, case-sensitive, invert results
	- can return all items or only folders

	MDN RegEx special characters:
	-	https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
	- \\  -backslash char
	- \B  -word boundary
	- \d  -match digits; equivalent to [0-9]
	- \D  -match non-digit character; equivalent to [^0-9]
	- \r  -match a carriage return (U+000D)
	- \S  -match a character other than white space
	- \t  -match a tab (U+0009)
	- \w  -match alphanumeric character including the underscore. Equivalent to [A-Za-z0-9_]
	- \W  -match non-word character
	- \0  -match a NULL (U+0000) character
	- ^		-match start of string
	- $		-match end of string
	- *		-match preceding expression 0 or more times: \/bo*\/ matches 'boooo' and 'a bite' (slashes to escape chars in comment)
	- +		-match preceding expression 1 or more times: /a+/ matches "candy", but not "cndy"
	- ?		-match preceding expression 0 or 1 time
	- .		-match any single character except the newline character: /.n/ matches 'an' and 'on' not "nay"
  - x|y -match 'x', or 'y' (if there is no match for 'x')
  - x|y -match 'x', or 'y' (if there is no match for 'x')
  - {n} -match n occurrences of the preceding expression
  -[xyz] -match any one of the characters in the brackets
  -[^xyz] -match anything not in the brackets

*/
'use strict'


exports.exec = folderWalk
exports.argMap = {
	//debug:{ type:'bool', default:false, dsc:'Send debug messages to error console.'},
	folder:{ type:'string', dsc:'Folder to search.'},
	find:{ type:'string', default:'', dsc:'Text to search for, if null returns all items.'},
	findCase:{ type:'bool', default:false, dsc:'If true, searches are case-sensitive.'},
	findInvert:{ type:'bool', default:false, dsc:'If true, inverts search results, result = !indexOf()'},
	findRegex:{ type:'bool', default:false, dsc:'If true, treats find as a regular expression'},
	subFolders:{ type:'bool', default:false, dsc:'If true, iterate subfolders'},
	foldersOnly:{ type:'bool', default:false, dsc:'If true, only return folders'}
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
	if(options.findRegex == null)		options.findRegex = false
	if(options.subFolders == null)	options.subFolders = false
	if(options.foldersOnly == null)	options.foldersOnly = false

	options.depth = (options.depth === undefined ?0 :++options.depth)		//depth in subfolder heirarchy, set locally
	result.depth = options.depth

	if(result.errors.length > 0)
		return result

	const fs = require('fs')
	const path = require('path')

	let folder = options.folder,
			posixFolder = ui.calc.pathTrailingSlash( folder.replace(/\\/g,'/'), 'posix'),
			find = options.find,
			findCase = options.findCase,
			findInvert = options.findInvert,
			findRegex = options.findRegex,
			subFolders = options.subFolders,
			foldersOnly = options.foldersOnly,
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
		if(findRegex===true){
			if(findCase===true)
				find = new RegExp(find)
			else
				find = new RegExp(find, 'i')
		}else
		if(findCase===false)
			find = find.toLowerCase()
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
				suboptions = null,	subresult = null


		stat = local_safeLstat(fullpath)
		if(stat===null) {
			ferrors.push(`Could not stat: [${fullpath}]`)
			continue
		}

		let isdir = stat.isDirectory(),
				findMatch = true,		//default is create obj for item
				obj = null


		if(find != ''){		//seach filenames
			if(findRegex===true){
				findMatch = find.test(fn)
			}else
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
				path:posixFolder,
				ext:path.extname(fn).toLowerCase(),
				depth:depth
			}
		}
		if(findMatch===true){
			totfnd++
			totsize += obj.size
		}

		if(isdir === true){
			if(subFolders===true){
				suboptions = Object.assign({}, options, {folder:fullpath, depth:depth})
				subresult = folderWalk(suboptions)
/*			if(subresult.errors.length > 0){
					subresult.errors.forEach(function(element) {
						ferrors.push(element)
					})
				}
				if(subresult.items.length > 0){
					subresult.items.forEach(function(element) {
						fnd.push(element)
					})
				}		*/
				totfnd += subresult.itemsFound
				totsize += subresult.itemsSize
				tot += subresult.itemsTotal
				if(obj != null) {
					obj.itemsFound = subresult.itemsFound
					obj.itemsSize = subresult.itemsSize
					obj.itemsTotal = subresult.itemsTotal
				}
			}else
			if(obj != null) {
				obj.itemsFound = 0
				obj.itemsSize = 0
				obj.itemsTotal = 0
			}
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
		if(subresult != null){		//add items after folder
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
