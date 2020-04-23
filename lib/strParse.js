/*
	strParse.js

	- node.js string parsing class by Chris DeFreitas, chrisd@europa.com


	Usage:

		let parser = require('strParse');
		parser.bufSet( stringToParse )



*/

const log = console.log

strParse = {
	buf:null,
	buflen:0,
	marker:null,

	bufSet:function(str){
		this.buf = str
		this.buflen = str.length
		this.marker = null
		return this
	},
	bufTrim:function(from, to){
		if(this.buf==null) return false
		if(from==null) from=0
		if(to==null) to=this.buf.length

		this.buf = this.buf.substr(from,to).trim()
		this.marker = null
		return this
	},
	openFile: function(path){
		const fs = require('fs');
		this.buf = fs.readFileSync(path).toString();
	},
	find: function(str, searchFromIdx){
		//console.log('strParse.find(): ', str)
		if(str===undefined) return false
		if(this.buf==null) return false

		if(searchFromIdx==null){
			if(this.marker!=null)
				searchFromIdx=this.marker
			else
				searchFromIdx=0
		}
		//console.log(' Search from: ', searchFromIdx)
		var fndIdx = this.buf.indexOf(str, searchFromIdx)
		//console.log(' Found: ', fndIdx)

		if(fndIdx < 0)	return false
		this.marker = fndIdx +str.length
		//return this.marker
		return this
	},
	extractToIdx: function(endidx, startidx){
		//endidx == null, endidx = buf.length -1
		//default: extract from this.marker to endidx
		if(this.buf==null) return false
		if(startidx==undefined){
			if(this.marker!=null) startidx=this.marker
			else startIdx=0
		}
		if(startidx < 0)	return false
		if(endidx==null)	endidx = this.buf.length
		if(endidx < startidx) return false

		var fnd = this.buf.substring(startidx, endidx)
		this.marker = endidx+1
		return fnd
	},
	extractToTag: function(endtag, startidx){
		//endidx == null, endidx = buf.length -1
		//default: extract from this.marker to endidx
		if(this.buf==null) return false
		if(endtag==null) return false
		if(startidx==undefined){
			if(this.marker!=null) startidx=this.marker
			else startIdx=0
		}
		if(startidx < 0)	return false

		var endidx = this.buf.indexOf(endtag, startidx)
		if(endidx < startidx) return false

		var fnd = this.buf.substring(startidx, endidx)
		this.marker = endidx +endtag.length
		return fnd
	},
	extractBetween: function(tagStart, tagEnd, searchFromIdx){
		//console.log('strParse.extract(): ', tagStart, tagEnd)
		if(this.buf==null) return false
		if(tagStart==null) return false

		if(searchFromIdx==null){
			if(this.marker!=null)
				searchFromIdx=this.marker
			else
				searchFromIdx=0
		}

		//console.log(' Search from: ', searchFromIdx)
		var startidx = this.buf.indexOf(tagStart, searchFromIdx)
		if(startidx < 0)	return false
		startidx += tagStart.length

		var endidx=null
		if(tagEnd==null) endidx = this.buf.length
		else{
			endidx = this.buf.indexOf(tagEnd, startidx)
			if(endidx < 0)	return false
		}

		var fnd = this.buf.substring(startidx, endidx)
		this.marker = endidx+1
		return fnd
	},
	extractLen: function(len, startidx){
		//endidx == null, endidx = buf.length -1
		//default: extract from this.marker to endidx
		if(this.buf==null) return false
		if(startidx==undefined){
			if(this.marker!=null) startidx=this.marker
			else startIdx=0
		}
		if(startidx < 0)	return false
		if(len==null)	len = this.buf.length

		var fnd = this.buf.substr(startidx, len)
		this.marker = startidx +len
		return fnd
	},
	moveBy: function(ii, startidx){		//position this.marker
		if(this.buf==null) return false
		if(startidx==null){
			if(this.marker!=null) startidx=this.marker
			else startidx=0
		}
		this.marker = startidx +ii
		return this
	},
	moveTo: function(str, startidx){		//position this.marker after str
		if(str===undefined) return false
		if(this.buf==null) return false
		if(startidx==null){
			if(this.marker!=null) startidx=this.marker
			else startidx=0
		}
		var fndIdx = this.buf.indexOf(str, startidx)

		if(fndIdx < 0)	return false
		this.marker = fndIdx +str.length
		return this
	},
	moveBackTo: function(tag, startidx){		//position this.marker
		if(this.buf==null) return false
		if(tag==null) return false
		if(startidx==undefined){
			if(this.marker!=null) startidx=this.marker
			else startIdx=this.bug.length -1
		}
		if(startidx < 0)
			startidx = this.marker +startidx

		//lastIndexOf() fails when tag===' ' because ' ' converted to '' (empty string)
		//var endidx = this.buf.lastIndexOf(tag, startidx)
		var taglen = tag.length
			, start = (startidx -taglen)
			, endidx = -1
		while(start > 0){
			if(this.buf.substr(start,taglen)===tag){
				endidx = start+1
				break
			}
			start--
		}
		//console.log('['+tag+']', endidx, startidx)
		if(endidx < 0) return false

		this.marker = endidx
		return this
	},
	skip: function(tag){
		++this.marker
		let buf = this.buf, end=(this.buflen -1)
		while( buf[this.marker] === tag){
			++this.marker
			if(this.marker > end) {
				this.marker--
				break;
			}
		}
		return this
	}
}
module.exports = strParse;

//allowable formats:
//%ns - where n is the index of a parameter; only two digit indexes are allowed
//    - see below for other other specifiers
//	var copyfromto = AString.substring;
//	var pos = AString.indexof;
function sprintf(AString)
{
	var arglen = arguments.length;
	var strlen = AString.length;

	var idx = 0;
	var lastidx = 0;
	var paramOffset = 0;
	var result = '';

  while(idx < strlen) {
  	lastidx = idx;
  	idx = AString.indexOf('%', lastidx);

  	if(idx == -1) {
  		result += AString.substring(lastidx, strlen);
  		break;
  	}

 		result += AString.substring(lastidx, idx);

		if (AString.charAt(idx+1) == '%')
				result += '%';
		else {
			if (parseInt(AString.charAt(idx+2)) >= 0) {
			//if (AString.charAt(idx+2) == false) {
				paramOffset = parseInt(AString.substring(idx+1, idx+3), 10);
				idx+=4;
			}
			else {
				paramOffset = parseInt(AString.substring(idx+1), 10);
				idx+=3;
			}
			if (paramOffset >= arglen)
				alert('Error! Not enough function arguments (' + (arglen - 1) + ', excluding the string)\nfor the number of substitution parameters in string (' + paramOffset + ' so far).');
			result += arguments[paramOffset];
		}
	}
	return result;
}
