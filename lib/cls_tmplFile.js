'use strict';

/*
	cls_tmplFile.js

	Purpose
	0. call tmplFile.xlate(options)
	1. read options.filename
	2. replace(/options.keys.key/g, options.keys[key])
	3. write options.outfile

	options = {
		filename: null,
		keys: {},
		outfile: null,
	}
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
