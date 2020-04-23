/*
	folderWalk.js

	- functions to iterate folders and search for an item name or return all items
	- search types: default = indexOf(), regexp, case-sensitive, invert results
	- can return summary

	Notes
	- two modes: search or summarize (summary === true)
	- folder.size === 0 bytes, if subFolders===true, folder.size = sum(folder.subFolders.treeSize) +sum(folder.item.size)

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
	subFolders:{ type:'bool', default:false, dsc:'If true, iterate subfolders; if summary ===true, display subfolders with treeCount > 0'},
	summary:{ type:'bool', default:false, dsc:'Retun a summary of matching files and folders; if subFolders==true return summary of subfolders too.'}
}
exports.defaultOptions = {
			folder: '',
			find: '',
			findCase: false,				//case sensitive search
			findInvert: false,			//invert search result: !indexOf()
			findRegex: false,
			foldersOnly: false,			//only return folders
			subFolders: false,			//iterate subfolders
			summary: false					//provide a summary of results
}


function folderWalk(options) {
	//search a folder for files
	//returns:
	let result = {
		folder:options.folder,
		find:options.find,
		date:null,
		isDirectory:null,
		errors:[],
		items:[],
		fileCount:0,			//count of files found; if summary=true, count of files in folder
		fileSize:0,				//sum size of files found; if summary=true, size of files in folder
		folderCount:0,		//count of subfolders found; if summary=true, count of subfolders in folder
		folderSize:0,			//sum size of subfolders found; if summary=true, size of subfolders in folder
		treeCount:0,			//count of all items found
		treeSize:0				//size of all items found
	}

	if(options.folder==null || options.folder=='') result.errors.push('options.folder is undefined')
	if(options.summary==null) 			options.summary = false
	if(options.find==null) 					options.find = ''
	if(options.findCase == null)		options.findCase = false
	if(options.findInvert == null)	options.findInvert = false
	if(options.findRegex == null)		options.findRegex = false
	if(options.subFolders == null)	options.subFolders = false

	options.depth = (options.depth === undefined ?0 :++options.depth)		//depth in subfolder heirarchy, set locally

	if(result.errors.length > 0)
		return result

	const fs = require('fs')
	const path = require('path')

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
	let stat = local_safeLstat(folder)
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

	let items = fs.readdirSync(options.folder),
			ferrors = [],
			filecount = 0,
			filesize = 0,
			foldercount = 0,
			foldersize = 0,
			treecount = 0,
			treesize = 0,
			fnd = []

	for(var key in items){
		let fn = items[key],
				fullpath = path.join(folder, fn),
				suboptions = null,	subresult = null


		stat = local_safeLstat(fullpath)
		if(stat===null) {
			ferrors.push(`Could not stat: [${fullpath}]`)
			continue
		}

		let isdir = stat.isDirectory(),
				findMatch = true,		//default is create item object
				itm = null


		if(find !== ''){		//seach filenames
			if(findRegex===true){
				findMatch = find.test(fn)
			}else
			if(findCase===true)
				findMatch = (fn.indexOf(find) >= 0)
			else
				findMatch = (fn.toLowerCase().indexOf(find) >= 0)
		}
		if(findInvert === true) findMatch = !findMatch

		if(findMatch == true 			//default case
		|| (subFolders===true && isdir===true) 		//search in subfolders for match
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
				//foldersize = 0
			}
			else{
				filecount++
				filesize += itm.size
				treesize += itm.size
			}
		}

		if(subFolders===true && isdir === true){
			suboptions = Object.assign({}, options, {folder:fullpath, depth:depth})
			subresult = folderWalk(suboptions)

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
			if(summary===false){		//match found or searching subfolders
				if(findMatch===true)
					fnd.push(itm)
			}else
			if(summary === true){			//summary of file and folders in selected folder
				if(depth===0){
					if(subFolders===true && itm.isDirectory === true)			// && itm.treeCount > 0) 	//directory has match in tree
						fnd.push(itm)
				}
			}
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
	result.fileCount	= filecount
	result.fileSize 	= filesize
	result.folderCount= foldercount
	result.folderSize = foldersize
	//if(subFolders===true){
		result.treeCount	= treecount
		result.treeSize 	= treesize
	//}
	return result

	function local_safeLstat(apath) {
		var result = null
		try { result = fs.lstatSync(apath) }
		catch(e){ console.log('local_safeLstat() error: ', e) }
		return result
	}
	function local_pathTrailingSlash(str, os){	//verifies path ends in a trailing slash
		str = str.trim()
		//if(os === 'posix'){
			if(str[str.length-1]!='/' && str[str.length-1]!='\\') str += '/'
//		}
//		else {	//default to windows
//			if(str[str.length-1]!='\\') str += '\\'
//		}
		return str
	}
}
