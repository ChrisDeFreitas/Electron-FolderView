/*

console.js
- a test harness for folderWalk.js
- see package.json/scripts for test coverage

*/
'use strict'

process.on('uncaughtException', function(err1){
	console.error('Process.uncaughtException event:', err1.toString())
	console.error('Stack trace:', err1)
})

/*argmap from folderWalk.js
var argmap = {
	debug:{ type:'bool', default:false, dsc:'Send debug messages to error console.'},
	folder:{ type:'string', dsc:'Folder to search.'},
	find:{ type:'string', default:'', dsc:'Text to search for, if null returns all items.'},
	findCase:{ type:'bool', default:false, dsc:'If true, searches are case-sensitive.'},
	findInvert:{ type:'bool', default:false, dsc:'If true, inverts search results, result = !indexOf()'},
	subFolders:{ type:'bool', default:false, dsc:'If true, iterate subfolders'},
	foldersOnly:{ type:'bool', default:false, dsc:'If true, only return folders'}
}
*/

const grinder = require('../grinder/lib/grinder.js')
	, fw = require('./folderWalk.js')
	, dir = console.dir
	, err = console.error
	, log = console.log

log("\n\nfolderWalk Test Harness\n - see folderWalk.js/argMap for commandline arguments\n")

let args = grinder.grindArgv(fw.argMap)
//log('\nargMap:', fw.argMap)
log('\nArguments found:\n', args)
log()

let start = new Date(),
		result = fw.exec(args),
		end = new Date() - start

console.log('\nResults:')
console.log(result)

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

