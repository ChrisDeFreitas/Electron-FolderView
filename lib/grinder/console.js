/*

console.js
- a test harness for grinder.js
- grinder.js converts commandline arguments to a state object based on an argument map
- see package.json/scripts for test coverage

test:
$ node console.js arj debug true find bug bath path = "A/ss/vv/xx" nm="55" dt "20017-1-1 12:35 pst" "2015-2-2" --zz = ff cb zzz url="http://a.com?v=were" json '{"hey":"Yo!"}'


*/
'use strict'

process.on('uncaughtException', function(err1){
	console.error('Process.uncaughtException event:', err1.toString())
	console.error('Stack trace:', err1)
})

//argmap for testing
var argmap = {
	debug:{ type:'bool', default:false, dsc:'Send debug messages to error console.'},
	find:{ type:'command', multiple:true, alias:'f', dsc:'Search by file name or contents.'},
	nm:{ type:'number', dsc:'Number field.' },
	dt:{ type:'date', multiple:true, dsc:'Date field.' },
	ob:{ type:'json', alias:'json, object, obj, -o', dsc:'JSON object.' },
	cb:{ type:'string', dsc:'Arg with callback function that alters value.',
		callback:function(args, arg, val){
			args[arg] = 'CallbackValue'	//change value to xxx
			//console.log('callback arg=', arg, 'value=', val, 'newvalue=', args[arg])
	} },
	path:{type:'string', dsc:''},
	pid:{type:'number', dsc:'test arg formats: pid=123, pid:123'},
	url:{type:'string', dsc:''},
	"-y":{ type:'string', multiple:true, dsc:'Test hyphen.' },			//multiple:false must be set manually
	"--zz":{ type:'string', multiple:true, dsc:'Test double hyphens.' },		//multiple:true is default
	help:{ type:'bool', alias:'--help, /?, ?', multiple:false, dsc:'return argument map.' }
}

const grinder = require('./lib/grinder.js')
	, dir = console.dir
	, err = console.error
	, log = console.log
	, timestart = Date.now()

log("\n\nGrinder Test Harness\n")

let args = grinder.grindArgv(argmap)
//log('\nargMap:', argmap)
log('\nArguments found:\n', args)
log()


if(args.help){
	log('Help requested. See package.json/scripts for examples, the application takes these arguments:')
	dir(argmap)
}
if(args.find){
	if(args.debug===true){
		if(!Array.isArray(args.find)){
			let ss = args.find
			args.find = []
			args.find['-'] = [ss]
		}
		args.find.push('debug')
		args.find.push(true)
	}
	// update to work with current code:
	// log('find',
	// 	grinder.grind(args.find, {
	// 		// _ will store search values
	// 		debug:{ type:'bool', default:false,	dsc:'Send debug messages to error console.' },
	// 		path:{ type:'string', multiple:false, required:true, dsc:"path to search."
	// 		}
	// 	})
	// )
}
