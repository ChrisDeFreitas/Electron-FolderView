/*
	grinder.js

		- grinder.js converts commandline arguments to a state object based on an argument map
		- can be used with other string lists
		- try to maintain compatibilty with similar packages--but adding some 'special sauce'
		- no dependencies

	example:

		let argmap = {
			debug:{ type:'bool', default:false, dsc:'Send debug messages to error console.'},
			find:{ type:'command', dsc:'Search by file name or content.'},
			multi:{ type:'string', multiple:true, dsc:'Example of multi-value argument, default is multiple=false'},
			uni:{ type:'string', multiple:false, dsc:'Example of single value argument.'},
			bool:{ type:'bool', dsc:'Example of boolean argument.'},
			json:{ type:'json', alias:'obj, -o', dsc:'Example JSON argument.' },
			help:{ type:'bool', dsc:'return general help or help on a specific command command.' }
		}
		let args = require('grinder.js').grindArgv(argmap, null)
		console.log('Arguments found:', args)
		//
		//	if no args passed to app, outputs:
		//  	args =  { _: [], debug:false }

		//	if args passed: node console.js find name bil*.js
		//  	args =  { _:[], debug:false, find:['name', 'bil*.js'] }
		//	args.find can be processed:
		// 		findArgMap = {name:{type:string, dsc:'file name to find'} }
		//  	findArgs =  { _:[], name:'bil*.js' }

	rules:
		0. arg must have a separator: space char (0x32), =, :
				eg: node console.js arg1 arg2 arg3
						node console.js arg1=val arg2
						node console.js arg1:val arg2
		1. initial value assigned to all args = (argmap[arg].default || true)
				eg: node console.js bool
						==> args = {_:[], bool:true}
		2. values assigned to arguments are converted based on argmap[arg].type
		3. multipe values may be assigned to an argument, creating an array value; disable with:  argmap[arg].multiple=false
				eg: node console.js multi val1 val2 val3 uni val4 bool
						==> args = {_:[], multi:[val1, val2, val3], uni:val4, bool:true}
		4. args not in argmap are assigned to state['_'][]
		5. "--" prevents the following args from being asigned to last argmap[arg]
				eg: node console.js arg1 val1, val2 		==> args = {_:[], arg1:[val1, val2]}
						node console.js arg1 -- val1, val2	==> args = {_:[val1, val2], arg1:true}
		6. allowed data types: bool, date, number, json, string
		6.1 JSON must be quoted with \" or node.js will strip quotes, resulting in a JSON parse error
			note: these are requirements based on Windows OS
			eg1: double quotes around entire JSON string, spaces allowed within JSON string, quotes are escaped with \
						node console.js json "{ \"key1\":1, \"key2\":\"stringVal1\" }"
			eg2: no quotes around the JSON string, no spaces allowed within JSON, quotes are escaped with \
					node console.js json {\"key1\":1,\"key2\":\"stringVal1\"}
		7. alias for args:
				eg argmap={ json: {type:'json', alias:'object, -o, --object'}, ...}
		8. callback functions to alter arg's value:
				argmap = {
					cb:{type:'string',
							dsc:'Arg with callback function that alters value.',
							callback:function(args, arg, val){
								args[arg] = 'xxx'	//change value to xxx
								console.log('callback arg=', arg, 'value=', val, 'newvalue=', args[arg])
							}},
					...
				}
		9. use of '-' and '--' in arg names is optional
				eg argmap={ '--debug': {...}, ...}
					 argmap={ debug: {alias: '-debug, --debug, dbg', ...}, ...}

*/

exports.grind = grind
exports.grindArgv = grindArgv

const //ui = exports.ui = module.parent.exports.ui
	//, rootfolder = ui.var.rootfolder
	//, appfolder = ui.var.appfolder
	//, debug = (ui.args.debug===true || ui.args.debug==='grinder.js')
	debug = false
	, dir = console.dir
	, err = console.error
	, log = console.log
	, version = '20190704'


function grindArgv(argmap, argvPreprocessCb){
	let args = process.argv.splice(2)
	if(argvPreprocessCb != null)
		argvPreprocessCb(args)
	return grind(args, argmap)
}

function grind(args, aargmap){
	//assume: args = [string, ...] || string || string1, string2  || string1,string2
	//assume: argmap = { arg1: { type:'string', multiple:true, callback:function(){} }, ... }
	//return: {_:[], arg1:val, ...}
	//
	if(aargmap==null) throw new Error("grinder.grind() error, aargmap is null.")

	let argmap = JSON.parse(JSON.stringify( aargmap ))	//deep copy
	let state = { '_':[] },		//state generated from args; state['_'] stores args not in argmap.
		skipargs = ['=',':'],		//args to skip: xx = yy || xx : yy
		lastKey = null, 				//last arg found in argmap, subsequent values governed by argmap[lastKey] rules
		lastKeyState = 0,			 	//state of assignments to state[arg]; 0:state[arg]= (map.default || true), 1:state[arg] = next value, 2:state[arg] = [valNext1, valNext2, ...]
		hasalias = false				//no alias in argmap, optimization

	if(Array.isArray(args) === false ) args = toArray(args)

	for(let key in argmap){					//update argmap defaults
		let map = argmap[key]

		map.alias =  toArray(map.alias)
		if(hasalias===false && map.alias.length > 0) hasalias = true

		let amap = aargmap[key]
		if(amap.callback === undefined)
			map.callback = null
		else
			map.callback = amap.callback

		if(map.multiple === undefined) map.multiple = false
		if(map.type === undefined) map.type = 'string'
	}

	if(args.length==0) {							//nothing to process
		for(let key in argmap){					//assign default args
			let map = argmap[key]
			if(map.default != null) {
				if(state[key]===undefined)
					state[key] = map.default
			}
		}
		return state
	}

	function local_findKey(arg){		//search argmap and argmap.alias for arg
		if(argmap[arg]) return arg
		if(hasalias!==true) return null
		for(let key in argmap){
			let map = argmap[key]
			if(map.alias.length === 0) continue
			if(map.alias.indexOf(arg) >= 0) {
				//err('alias', map.alias)
				return key
			}
		}
		return null
	}

	function local_parseOp(op, arg, idx){		//is arg in format: arg{op}val
		if(typeof arg != 'string') return null

		let ii = arg.indexOf(op)
			, key = null, val = null
		if(ii < 0) return null
		if(ii === 0){										//extra space in op format: arg {op}val
			arg = arg.substr(1, arg.length)	//trim {op}
			args[idx] = arg
			return -1											//this is a value
		}else
		if(ii === arg.length-1){				//extra space in op format: arg{op} val
			arg = arg.substr(0, arg.length-1)	//trim {op}
			args[idx] = arg								//this may be a key
		}
		else {													//handle: arg{op}val
			let arr = arg.split(op, 2)
			arg = arr[0]
			val = arr[1]
		}
		key = local_findKey(arg)
		if(key != null){
			args[idx]=key									//update args[idx] with new arg
			if(val !== null)							//insert val at args[idx+1]
				args.splice( idx+1,0, val)
			return key
		}
		return null
	}

	//err('argmap',argmap)
	//err('args',args)
	for(idx=0; idx<args.length; idx++){
		let arg = args[idx]
		//if(debug) err('arg:',arg)
		if(skipargs.indexOf(arg) >= 0) continue

		let map = null, key = null
		key = local_findKey(arg)			//search argmap and argmap.alias for arg
		if(key !== null) {
			arg = key
			map = argmap[key]
		}
		if(map===null){								//test for: arg=val
			let key = local_parseOp('=', arg, idx)
			if(key==-1){										//value formatted as: =val
				arg = args[idx]
			}else
			if(key!==null){									//arg found
				arg = key
				map = argmap[key]
			}
		}
		if(map===null){								//test for: arg:val
			let key = local_parseOp(':', arg, idx)
			if(key==-1){										//value formatted as: :val
				arg = args[idx]
			}else
			if(key!==null){									//arg found
				arg = key
				map = argmap[key]
			}
		}

		if(map){													//key found, set state
			//if(debug) err('map found:', map)

			if(state[arg] === undefined) {	//new key found
				state[arg] = (map.default===undefined ?true :map.default)
				lastKeyState = 0
			}
			else{														//key appears more than once
				if(map.multiple===false)
					lastKeyState = 0						//next value will replace prior value
				else
				if(Array.isArray(state[arg]))
					lastKeyState = 2
				else
					lastKeyState = 1
			}
			lastKey = arg
			continue
		}

		//no map found; arg must be a value
		if(arg == '--'){										//end processing of lastKey
			lastKey = null
			lastKeyState = 0
			continue
		}
		if(lastKey == null){								//arg not key in argmap
			state['_'].push(arg)
			continue
		}

		map = argmap[lastKey]

		if(map.type != 'command')
			arg = typeConvert(arg, map.type)		//convert data type

		//assign arg to lastKey in argmap
		if(lastKeyState == 0)	{							//first value for lastKey
			state[lastKey] = arg
			if(map.multiple===false){					//reset lastKey to prevent additional assignments
				lastKey = null
				lastKeyState = 0
			}
			else
				lastKeyState = 1
		} else
		if(lastKeyState == 1){							//second value
			state[lastKey]= [ state[lastKey], arg]
			lastKeyState = 2
		}
		else
			state[lastKey].push(arg)					//multiple values
	}

	for(let key in argmap){								//update default values
		let map = argmap[key]
		if(map.default != null) {
			if(state[key]===undefined)
				state[key] = map.default
		}
	}

	for(let key in state){								//handle callback functions
		let map = argmap[key]
		if(map===undefined) continue				//handle '_' and strangeness
		if(map.callback !== null){
			map.callback(state, key, state[key])
		}
	}

	return state
}

//util functions
function typeConvert(arg, type){
	//if(debug) err(type, arg)
	switch(type){
	case 'string': 	return arg
	case 'number': {
		if(typeof arg == 'number')
			return arg
		if(arg[0] == "'" || arg[0] == '"' )
			arg = arg.substring(1)
		return parseFloat(arg, 10)
	}
	case 'bool':
	case 'boolean':
			return toBool(arg)
	case 'date':  {
			return new Date(arg)
	}
	case 'json':
		try{
			err('arg', arg)
			if(arg[0] == "'")	arg = arg.substring(1).trim()
			if(arg[arg.length-1] == "'")	arg = arg.substring(0, arg.length-1).trim()
			err('arg', arg)
			return JSON.parse(arg)
		}
		catch(error) {
			//err(error)
			return 'grinder.typeConvert() error converting JSON for: ['+arg+']'
		}
	}
	return arg
}
function toBool(arg){
	return (
		 arg === true
	|| arg === 1
	|| arg === 'true'
	|| arg === '1'
	|| arg === 'yes'
	)
}
function toArray(str){	//str = 'string' || 'string1, string2'  || 'string1,string2'
	if(str==null)	return []
	if(Array.isArray(str)) return str
	if(typeof str != 'string') return [str]

	let arr = null
	if(str.indexOf(', ') >= 0)
		arr = str.split(', ')
	else
	if(str.indexOf(',') >= 0)
		arr = str.split(',')
	else
		arr = [str]

	if(arr[0]=='') arr.splice(0,1)
	if(arr[arr.length-1]=='') arr.splice(arr.length-1,1)

	return arr
}