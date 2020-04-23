
const path = require('path');
const parser = require('../lib/strParse');

let log = console.log,
//		folder = `..`,
		folder = `\\`,
		cmd = `dir /-c /n /on /tw /4 "${folder}"`

let buf = exec(cmd)
log(buf)

parser.bufSet( buf )
parser.find('Directory of ')
parser.find('\n')
parser.find('\n')

log('Parsed:')
let files = [], ii=-1
while( parser.marker < parser.buflen){

	let result = parseLine()
	if(result === false)
		break;
	if(result === true)	//found . or ..
		continue

	let nm = result.basename
	result.pid  = ++ii
	result.path = path.join(folder, nm).replace(/\\/g,'/')
	result.src  = 'file:///'+result.path
	result.title= nm
	result.type = (result.isDirectory ?'folder' :path.extname(nm).toLowerCase())

	if(result.isDirectory){
		result.path += '/'
		result.src  += '/'
	}

	files.push(result)
}
log('files list:', files)

log('\nDone.\n')


function parseLine(){
	let start, end, date, time, apm, dir, size=0, name

	start = parser.marker

	date = parser.extractToTag(' ').trim()
	if(date == '') return false

	parser.skip(' ')
	time = parser.extractToTag(' ')
	apm = parser.extractToTag(' ')
	parser.skip(' ')
	dir = parser.extractToTag(' ')
	if(dir != '<DIR>'){
		size = parseInt(dir, 10)
		dir = null
	}
	name = parser.extractToTag('\n').trim()

	if(name == '.' || name == '..') return true

	log( `[${date} ${time} ${apm}] [${dir}] [${size}] [${name}]` )
	return {basename:name, isDirectory:(dir != null), size:size, date:`${date} ${time} ${apm}`}
}

function exec(command) {
	//blocks event loop until command is completed
	//return stdout
	const childexecSync = require('child_process').execSync;
	const results = childexecSync(command)
	return results.toString()
}
