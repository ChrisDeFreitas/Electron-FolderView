'use strict';
/*
	cls_tmplFile.js

	Purpose
	- create a new file by:
	 	1. copying an existing file
		2. updating content based on key/value pairs

	Usage (nodejs example)
	1.	const tmpl = require(__dirname+'/lib/cls_tmplFile.js');
	2. 	tmpl.xlate({
		filename: path.join(__dirname,'lib/index.html'),
		outfile: path.join(__dirname,'tmp/index.html'),		//this file is written automatically
		keys: {	//the key (on the left) will be replace by the value (on the right)
			'var items=null': 		 'var items = '+JSON.stringify(items),
			'var defaultNum=null': `var defaultNum=${defaultNum}`
		}
	})
*/
const fs = require('fs');
let txttxt
exports.get = function() { return txttxt }
exports.xlate = function(options) {
	var txt = null
	if(options.filename != null) {
		if(!fs.existsSync(options.filename))
			throw `tmplFile error: file not found [${options.filename}].`
		else
			txt = fs.readFileSync(options.filename, 'utf8');
	}
	for(var key in options.keys){
		var val = options.keys[key]
		//console.log(key+': ['+val+']')
		var re = new RegExp(key, "g")
		txt = txt.replace(re, val)
	}
	if(txt !== null) {
		fs.writeFileSync(options.outfile, txt)
	}
	txttxt = txt
}
