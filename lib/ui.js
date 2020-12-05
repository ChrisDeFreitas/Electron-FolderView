"use strict"

var ui = {
	updateDate:'20201205',
	args:{},			//see main.js/argmap
	settings:null
}
ui.var = {							//store dynamic vars here
	OS:null,
	pathSeparator:'\\',
	selectList:[],			//ctrl+click adds items to this list

//	dlgIdxMinItems:10,	//minimum number of folder items to display in item index

	dlgRenameSelRepeatDelay:150,			//milliseconds
	dlgRenameSelWhitespace:[' ', '.'],	//used with "select to next whitespace" buttons

	execQueMax:1,			//max simultaneous executions
	execQueTitleMaxJobs:10,		//max idle job.msg to display in eqLabel.title

	findText:null,			//last text in dlgFind
	findPos:-1,					//last pos in items found


	recentListMax:20,		//maximum items to appear in the recent list

	dblClickDelay:250,	//milliseconds to wait for second click

	videoDlDefaultItags:'248, 136, 22, 251, 171, 140, 244',		//comma delimited string
	videoDlClean:true,
}

//legacy vars from original slideshow app
var galleryDelay=15000
var lastLayoutMode=null	//"cols"
var scale=1
var scrollTimeout=21		//control speed grid scrolls, default 21ms
//
var grid=null			//<div id=grid>
var gallery=null	//photoswipe slideshow
var dlgDelay=null
var galleryScrollTimer = null
var gExtFilter=null	//{}
var isElectron = false
var isotope = null
var rulGridItem = null
var rulGridItemCaption = null
var scrollDir=null
var scrollTimer=null

var items = []
var itemselected=null
var exts = {}
var mediaTypes = {}

var objprefix = ['aud','fld','img','svg','unk','vid']
var dlgGalleryDelay = null
var slideCaptionOptions = {
	//at: {},				//calculated for each call
	canDestroy:false,
  destroyDelay:1500,
  destroyOpacity:0.05,
  fadeDelay:3000,
  from:'bottomright',
  html:null,			//defines initial state
  maxWidthNone:true,
  parent:null,		//hover in place; no parent activation
	width:333,
  attrib:{			//defaults removed after first call
		className:'imgCaption',
		style:{overflow:'auto', opacity:1, display:'block'},
		onclick:function(){
			slideCaptionOptions.html.style.display='none'
		}
	}
}


ui.init = function(){
	dlgFactory.setBblClickAction('none')

	if(this.settings == null){
		const fs = require('fs'),
		  		ini = require('ini'),
					settingsfile = __dirname+'/../tmp/settings.ini'
		if(fs.existsSync(settingsfile)===false){	//create settings file with default values
			fs.writeFileSync(settingsfile, `[sftp]\nhost=192.168.1.247\nport=22\nuser=chris\npw=\ndefaultpath=/home/chris\n`)
		}
		this.settings = ini.parse(fs.readFileSync(settingsfile, 'utf-8'))
	}

	grid = document.querySelector('#grid')
	grid.dlg = {}
	rulGridItem = findRule('.grid-item')
	rulGridItemCaption = findRule('.grid-itemCaption')
	if(rulGridItem===false)
		throw 'ui.init() error: .grid-item style not found.'

	if(ui.args.fontsize!=='12px'){
		rulGridItem.style.fontSize = ui.args.fontsize
		rulGridItemCaption.style.fontSize = ui.args.fontsize
	}

	document.getElementById('btnGalleryDelay').innerHTML = (galleryDelay/1000)+'s'
	document.getElementById('pswp__item1').addEventListener("wheel", function(event){		//scale gallery image
		return galleryWheelEvent(event)
	})
	document.getElementById('pswp__item2').addEventListener("wheel", function(event){		//scale gallery image
		return galleryWheelEvent(event)
	})
	document.getElementById('pswp__item3').addEventListener("wheel", function(event){		//scale gallery image
		return galleryWheelEvent(event)
	})
	document.addEventListener('keydown', (event) => {
//		console.log('keydown.target',event.target.nodeName, event.target.id)

	  if (event.shiftKey===true) return
		const target = event.target;
		const key = event.key;

		if(lastLayoutMode == 'videoWall'){		//pid's are messed up when items shuffled
			if(key === 'a'){
				videoWall.btnApplyClick()
				return ui.eventStop(event)
			}
			if(key === 'p'){
				videoWall.btnPlayClick()
				return ui.eventStop(event)
			}
			if(key === 'r'){
				videoWall.reset()
				return ui.eventStop(event)
			}
				
			if(key === 'Escape'){
				if(dlgVideoWall != null)
					videoWall.toggle()		//hide dlg
				else
				if(player.playing)
					player.hide()		//hide player
				else
					videoWall.toggle()
				return ui.eventStop(event)
			}
		}

		//check for c, delete, m, n with slideshow, or selected items
		if((target.id === 'pswpMain'	|| (target.nodeName === 'BODY'	&& itemselected != null))
		&& (event.ctrlKey==false && event.altKey==false)){
	  	if(key === 'c'){	//copy
				if(selectListHas(itemselected.pid) === true)
					bulkOps(ui.var.selectList, null, true)
				else
					renderer.fileCopy(itemselected.ctrl.id)
				return ui.eventStop(event)
 			}
 			if(key === 'Delete'){
				if(selectListHas(itemselected.pid))
					bulkOps(ui.var.selectList, null, true)
				else
					renderer.fileDelete(itemselected)
				return ui.eventStop(event)
			}
	  	if(key === 'm'){	//move
				if(selectListHas(itemselected.pid))
					bulkOps(ui.var.selectList, null, true)
				else
					renderer.fileMove(itemselected.ctrl.id)
				return ui.eventStop(event)
 			}
			if(key === 'Escape'
			&& gallery != null
			&& gallery.dlg.dlgParent != null){		//copy,delete,move,rename dlg visible
				//required because control.focus() is not precise
				galleryClose()
				return ui.eventStop(event)
			}
		}

		if(event.altKey===true) {		//handle MainMenu://Order/Folders/...
			if(event.shiftKey===true) {
				if(key==='F'){
					var cur = ui.args.folders
					if(cur==='' || cur==='default') renderer.folderMenuClick('first')
					else if(cur==='first') renderer.folderMenuClick('hidden')
					else if(cur==='hidden') renderer.folderMenuClick('last')
					else if(cur==='last') renderer.folderMenuClick('default')
					return ui.eventStop(event)
				}else
				if(key==='O'){
					var cur = ui.args.order
					if(cur==='' || cur==='date') renderer.ordMenuClick('name')
					else if(cur==='name') renderer.ordMenuClick('size')
					else if(cur==='size') renderer.ordMenuClick('type')
					else if(cur==='type') renderer.ordMenuClick('date')
					return ui.eventStop(event)
				}
			}
		}
	  if (event.ctrlKey===true) {
			if(target.nodeName==='INPUT' || target.nodeName==='TEXTAREA') return

			var inc=0.05
			switch (event.key) {
	    case "a":		//toggle select all items
	    	if(gallery==null){
	    		selectItems()
	  			return ui.eventStop(event)
	  		}
	    case "ArrowUp":		//scale up
				if(gallery==null) {	//scale grid images up
			  	scale += inc
			  	gridLoad(lastLayoutMode)
				}
				else {		//scale gallery image up
					var sc = gallery.getZoomLevel()
					sc += inc
					gallery.zoomTo(sc, {x:gallery.viewportSize.x/2,y:gallery.viewportSize.y/2}, 333)
				}
	  		return ui.eventStop(event)
	    case "ArrowDown":		//scale down
				if(gallery==null) {	//scale grid images down
			  	scale -= inc
			  	if(scale < inc) scale=inc
					gridLoad(lastLayoutMode)
				}
				else {		//scale gallery image down
					var sc = gallery.getZoomLevel()
					sc -= inc
					gallery.zoomTo(sc, {x:gallery.viewportSize.x/2,y:gallery.viewportSize.y/2}, 333)
				}
	  		return ui.eventStop(event)
	    case "ArrowRight":
				if(gallery===null){
					if(itemselected != null && ['image','svg'].indexOf(itemselected.mediaType) >= 0){
//						var pid = (itemselected==null ?0 :itemselected.pid)
						openPhotoSwipe(itemselected.pid)
		    		galleryPlay(true, false)
		  			return ui.eventStop(event)
		  		}
				}
				else {
	    		galleryPlay(true, true)
	  			return ui.eventStop(event)
	  		}
	    case "ArrowLeft":
				if(gallery===null){
					if(itemselected != null && ['image','svg'].indexOf(itemselected.mediaType) >= 0){
//					var pid = (itemselected==null ?0 :itemselected.pid)
						openPhotoSwipe(itemselected.pid)
						galleryPlay(false, false)
	  				return ui.eventStop(event)
	  			}
				}
				else {
	    		galleryPlay(false, true);
	  			return ui.eventStop(event)
	  		}
	  	}
	  	return
  	}
	  if (event.ctrlKey==false && event.altKey==false) {
	  	if(target.nodeName==='INPUT' || target.nodeName==='TEXTAREA') return

			if(key==='Enter') {		//toggle: grid/gallery
				if(event.target.nodeName==='BUTTON') return
				if(gallery != null) {	//close gallery if open
					galleryClose()
					return
				}
				if(itemselected==null) return

				if(itemselected.isDirectory===true){
					renderer.folderLoad(itemselected.path)
					return ui.eventStop(event)
				}
				else
				if(['image','svg'].indexOf(itemselected.mediaType) >= 0){
					galleryShow(itemselected.pid)
					return ui.eventStop(event)
				}
		  }
	  	if(key === 'n'){	//new folder
	  		renderer.folderNew()
				return ui.eventStop(event)
			}
		}

	}, false)

	if(!ui.settings.btools) ui.settings.btools = {}
	if(!ui.settings.btools.autoListen) ui.settings.btools.autoListen = false
	if(ui.settings.btools.autoListen===true){		//see browserTools.js
		btools.show()
		btools.listen()
	}
}
ui.eventStop = function(e){
	if(e.preventDefault)
	 e.preventDefault();
	if(e.stopImmediatePropagation)
	 e.stopImmediatePropagation();
	if(e.stopPropagation)
	 	e.stopPropagation();
	else e.cancelBubble=true;
	return false;
}
ui.reset = function(){
	if(galleryScrollTimer!==null){
		clearTimeout(galleryScrollTimer)
		galleryScrollTimer=null
	}
	if(gallery!==null)
		galleryClose()
	if(scrollTimer!==null){
		clearTimeout(scrollTimer)
		scrollTimer=null
	}
	//itemselected=null
	ui.var.selectList = []
	isotope.destroy()
	isotope=null
	document.querySelector('#grid').innerHTML=''
//	if(dlgIdx != null) {
//		dlgIdx.remove()
//		dlgIdx = null
//	}
	ui.var.findPos = -1
}
ui.settingWrite = function( section = '', key = null, val = ''){
	if(key == null)
		throw `ui.settingsWrite() error, key is undefined.`

	//reload settings to get the latest
	const fs = require('fs'),
		ini = require('ini'),
		settingsfile = __dirname+'/../tmp/settings.ini'
	if(fs.existsSync(settingsfile)===false){	//create settings file with default values
		fs.writeFileSync(settingsfile, `[sftp]\nhost=192.168.1.247\nport=22\nuser=chris\npw=\ndefaultpath=/home/chris\n`)
	}
	this.settings = ini.parse(fs.readFileSync(settingsfile, 'utf-8'))

	if(section === '')
		this.settings[key] = val
	else
		this.settings[section][key] = val

	fs.writeFileSync(settingsfile, ini.encode(this.settings) )
}
ui.calc = {
	bytesToStr:function(bytes){
		if(bytes < 1024) return bytes+' bytes'
		if(bytes < (1024 *1024)) return (Math.round(bytes /1024*100) /100)+' KB'
		if(bytes < (1024 *1024 *1024)) return (Math.round(bytes /1024/1024*100) /100)+' MB'
		return (Math.round(bytes /1024/1024/1024 *100) /100)+' GB'
	},
	childrenRemoveAll:function(ctrl){
		for(var ii=ctrl.children.length-1; ii>=0; ii--){
			var child = ctrl.children[ii]
			if(child.children.length >0)
				ui.calc.childrenRemoveAll(child)
			ctrl.removeChild(child)
			//child.style.display='none'
		}
	},
	classAdd: function(ctrl,cssclass){
		if (!ui.calc.classHas(ctrl,cssclass))
			ctrl.className += " "+cssclass;
	},
	classHas: function(ctrl, cssclass){
		if(ctrl==null)
			alert('classHas() error, ctrl = null.')
		return !!ctrl.className.match(new RegExp('(\\s|^)'+cssclass+'(\\s|$)'));
	},
	classRemove: function(ctrl,cssclass){
		if (ui.calc.classHas(ctrl,cssclass)) {
	    var reg = new RegExp('(\\s|^)'+cssclass+'(\\s|$)');
	    ctrl.className=ctrl.className.replace(reg,' ');
	  }
	},
	ctrlFromStr:function(str, parent){
		if(str==null) return null
		if(typeof str!='string'){
			return str	//assume HTMLElement
		}
		if(str==='window')return window
		if( str[0]!=='#' && str[0]!== '.') str='#'+str
		if(parent != null)
			return parent.querySelector(str)		//assume str is css selector string
		return document.body.querySelector(str)
		/*
				if(typeof str!='string'){
				return str	//probale HTMLElement
		}
		if(str[0] != '#') str='#'+str
		return document.body.querySelector(str)		//assume str is control id
		*/
	},
	ctrlRemove:function(ctrl){
		ui.calc.childrenRemoveAll(ctrl)
		var pa = ctrl.parentNode
		if(pa==null) return
		pa.removeChild(ctrl)
		//ctrl.style.display='none'
	},
	dateFormat: function ( dt ){		//returns yyyy/mm/dd hh:mm:ss ms
		if(typeof dt === 'string' || typeof dt == 'number')
			dt = new Date( dt )
		return `${dt.getFullYear()}/${ui.calc.padNumber(dt.getMonth()+1, 2)}/${ui.calc.padNumber(dt.getDate(),2)}`
						+ ` ${ui.calc.padNumber(dt.getHours(), 2)}:${ui.calc.padNumber(dt.getMinutes(), 2)}:${ui.calc.padNumber(dt.getSeconds(), 2)}`
						+ ` ${ui.calc.padNumber(dt.getMilliseconds(), 3)}`
	},
	exec: function(command) {
		//blocks event loop until command is completed
		//return stdout
		const childexecSync = require('child_process').execSync;
		const results = childexecSync(command)
		return results.toString()
	},
	execAsync: function(command, callback) {
		const childexecAsync = require('child_process').exec;
		return childexecAsync(command, function(error, stdout, stderr){
			if (error)
	    		console.log(`ui.calc.execAsync()\n  error: [${error}]\n  stdout: [${stdout}]\n  stderr: [${stderr}]`);
    		if(callback != null)
				callback( error, stdout, stderr )
		})
	},
	execSpawn: function(command, args, cwd) {
		//warning: don't quote args or spawn() will mangle them
		//execute command without affecting event loop
		//console.log('ui.calc.execSpawn():', command, args)
		if(typeof args === 'string') args = [args]
		if(cwd === undefined) cwd = null
		const childspawn = require('child_process').spawn;
		const child = childspawn(command, args, {
				cwd:cwd,
				detached:true,
				stdio:['ignore','ignore','ignore'],
				shell:false,		//fails if true
				windowsVerbatimArguments:false		//provides strange arguments if true
			}
		)
//		child.on('close', (code) => {
//	  	console.log(`child process exited with code ${code}`);
//		})
		child.unref()
	},
	fileNameToCaption: function(basename, maxlen){
		const path = require('path')
		let result = ''
		if(basename.length <= maxlen)
			result = basename
		else {
			result = basename.substring(0, maxlen -9)
						 + ' ... '
			let ext = path.extname(basename)
			if(ext.length > 4)
				ext = ext.substring(ext.length -4)
			result += ext
		}
		return result
	},
	folderDel: function(dir_path, fs) {
		/**
		 * Remove directory recursively
		 * @param {string} dir_path
		 * @param fs = require('fs')
		 * @see https://stackoverflow.com/a/42505874/3027390
		 * modified by Chris Jul/2017
		 */
		if(dir_path==null) return
    if (fs.existsSync(dir_path)) {
      fs.readdirSync(dir_path).forEach(function(entry) {
          var entry_path = dir_path+'/'+entry
          if (fs.lstatSync(entry_path).isDirectory()) {
              ui.calc.folderDel(entry_path, fs)
          } else {
              fs.unlinkSync(entry_path)
          }
      });
      fs.rmdirSync(dir_path);
    }
	},
	msecToStr: function(msec){
       if(msec < 1000) return msec+'ms'
       if(msec < (1000 *60)) return (Math.round(msec /1000*100) /100)+'s'
       if(msec < (1024 *60 *60)) return (Math.round(msec /1000/60*100) /100)+'m'
       return (Math.round(msec /1000/60/60 *100) /100)+'h'
  },
	padNumber: function(value, maxLength) {
		if(maxLength==null) maxLength=2
		if(typeof value != 'string') value=value.toString()
		var padlen = maxLength - value.length
	  if(padlen > 0) value = '0'.repeat(padlen) +value
    return value
	},
	pathTrailingSlash(str, os){	//verifies path ends in a trailing slash
		str = str.trim()
		if(os === 'posix'){
			if(str[str.length-1]!='/' && str[str.length-1]!='\\') str += '/'
		}
		else {	//default to windows
			if(str[str.length-1]!=ui.var.pathSeparator) str += ui.var.pathSeparator
		}
		return str
	},
	pathTrailingSlashDel(str){	//remove trailing slash
		str = str.trim()
		//if(str[str.length-1]=='/' || str[str.length-1]=='\\') str = str.substr(0, str.length-1)
		if(str[str.length-1]==ui.var.pathSeparator) str = str.substr(0, str.length-1)
		return str
	},
	pathSlashFix(str){
		return str.replace(/\\/g,'/')
	},
	pathForOS(str, os = null){
		if(os === null) os = ui.var.OS
		if(os === 'win32')
			return str.replace(/\//g, '\\')
		else
			return str.replace(/\\/g,'/')
	},
	ruleFind: function(selector){
		//1. get stylesheet with no href
		var stylesheet = null
		for(var key=0; key < document.styleSheets.length; key++){
			if(document.styleSheets[key].href !== null) continue
			stylesheet = document.styleSheets[key];

			//2. find rule by selector
			for(var ii=0; ii < stylesheet.cssRules.length; ii++){
				var tmprule = stylesheet.cssRules[ii]
				if(tmprule.selectorText===selector){
					return tmprule
				}
			}
		}
		return false
	},
	stat: function(apath, quiet) {
		if (quiet==null) quiet===true

		var result = null
		const fs = require('fs')
		try {
			//use lstat to return link info
			let path = require('path')
				, stat = fs.lstatSync(apath)
			result ={
				//nm:path.basename(apath),
				path:apath,
				bytes:stat.size,
				isDirectory:stat.isDirectory(),
				isLink:stat.isSymbolicLink(),
				uid:stat.uid,
				gid:stat.gid,
				//atime: Date.parse(stat.atime), 	//Changed by the mknod(2), utimes(2), and read(2) system calls.
				atime:stat.atime, 	//Changed by the mknod(2), utimes(2), and read(2) system calls.
				btime:stat.btime, 	//Set at creation; where birthtime is not available, either ctime or 1970-01-01T00:00Z
				//ctime: Date.parse(stat.ctime), 	//Changed by the chmod(2), chown(2), link(2), mknod(2), rename(2), unlink(2), utimes(2), read(2), and write(2) system calls
				ctime: stat.ctime, 	//Changed by the chmod(2), chown(2), link(2), mknod(2), rename(2), unlink(2), utimes(2), read(2), and write(2) system calls
				//mtime: Date.parse(stat.mtime), 	//Changed by the mknod(2), utimes(2), and write(2) system calls.
				mtime: stat.mtime, 	//Changed by the mknod(2), utimes(2), and write(2) system calls.
			}
			//if(quiet===false) console.error('ui.calc.stat(): ', stat)
		}
		catch(e){
			if(quiet===false)
				console.error('ui.calc.stat() error: ', e)
		}
		return result
	},
	strInc: function(str, _idx){
		/*
			purpose: increment the numeric portion in a str
			first call should be: ui.calc.strInc(str)
		*/
		if(_idx===undefined) {	//find last numeric value, this is the start of algorithm
			_idx=null
			for(var ii=str.length-1; ii>=0; ii--){
				var result = parseInt(str[ii],10)
				if(isNaN(result)===true) continue
				_idx=ii;	break;
			}
			if(_idx===null) return str
		}
		else {
			if(_idx < 0) return str
		}
		var num = parseInt(str[_idx])
		if(isNaN(num)===true) {
			return str	//nothing else to do
		}
		++num
		if(num>9){		//str[_idx] = '0'
			str = str.substr(0,_idx)+'0'+str.substr(_idx+1, str.length)
			return ui.calc.strInc(str, --_idx)
		} else {		//str[_idx] = num
			return str.substr(0,_idx)+num+str.substr(_idx+1, str.length)
		}
	},
	strDec: function(str, _idx){
		/*
			purpose: decrement the numeric portion in a str
			first call should be: ui.calc.strInc(str)
		*/
		if(_idx===undefined) {	//find last numeric value, this is the start of algorithm
			_idx=null
			for(var ii=str.length-1; ii>=0; ii--){
				var result = parseInt(str[ii],10)
				if(isNaN(result)===true) continue
				_idx=ii;	break;
			}
			if(_idx===null) return str
		}
		else {
			if(_idx < 0) return str
		}
		var num = parseInt(str[_idx])
		if(isNaN(num)===true) {
			return str	//nothing else to do
		}
		--num
		if(num<0){		//str[_idx] = '9'
			str = str.substr(0,_idx)+'9'+str.substr(_idx+1, str.length)
			return ui.calc.strDec(str, --_idx)
		} else {		//str[_idx] = num
			return str.substr(0,_idx)+num+str.substr(_idx+1, str.length)
		}
	},
	strQuoteStrip: function(str){
		if(str[0]=='"' || str[0]=="'")
			str = str.substr(1,str.length)
		if(str[str.length-1]=='"' || str[str.length-1]=="'")
			str = str.substr(0,str.length-1)
		return str
	},
	strToArray(str){	//str = 'string' || 'string1, string2'  || 'string1,string2'
		if(str==null)	return []
		if(Array.isArray(str)) return str
		if(typeof str != 'string') return [str]

		let arr = null
		if(str.indexOf(', ') >= 0)
			arr = str.split(', ')
		else
		if(str.indexOf(', ') >= 0)
			arr = str.split(', ')

		if(arr[0]=='') arr.splice(0,1)
		if(arr[arr.length-1]=='') arr.splice(arr.length-1,1)

		return arr
	},
	taskkill: function(pid){
		let cmd = `taskkill /f /t /pid ${pid}`
		ui.calc.execAsync(cmd)
	},
	timeStart: function() { return Date.now() },
	timeEnd: function(startms,fmt) {
		var ms = Date.now() - startms
		if(fmt == null) return ms
		return ui.calc.timeFormat(ms, fmt)
	},
	timeFormat: function(ms, format) {
		if(format=='ms') return ms+'ms'
		if(format=='s') return (Math.round(ms/1000*10)/10)+'sec'			//99.9sec
		if(format=='m') return (Math.round(ms/1000/60*10)/10)+'min'		//99.9min
		if(format=='h') return (Math.round(ms/1000/60/60*100)/100)+'hrs'	//99.99hrs
		if(format=='d') return (Math.round(ms/1000/60/60/24*100)/100)+'days'	//99.99days
	},
	timestamp: function(adatetime, includeDash) {
		//return yyyymmdd-hhmmss-ms or yyyymmddhhmmssms
		if(includeDash == null) includeDash = true
		var dash = (includeDash ?'-' :''),
				dt =(adatetime==null
					 ? new Date()
					 : new Date(adatetime))
			, str = `${dt.getFullYear()}${ui.calc.padNumber(dt.getMonth()+1, 2)}${ui.calc.padNumber(dt.getDate(),2)}`
						+ `${dash}${ui.calc.padNumber(dt.getHours(), 2)}${ui.calc.padNumber(dt.getMinutes(), 2)}${ui.calc.padNumber(dt.getSeconds(), 2)}`
						+ `${dash}${ui.calc.padNumber(dt.getMilliseconds(), 3)}`
		return str
	},
	xyAbs: function(ctrl){
		var	top=ctrl.offsetTop
		var left=ctrl.offsetLeft
		var ofp = ctrl.offsetParent
		while(ofp != null){
			top+=ofp.offsetTop
			left+=ofp.offsetLeft
			ofp = ofp.offsetParent
		}
		return {top:top, left:left}
	},
	xyIntersects(x, y, ctrl){
		if(x >= ctrl.offsetLeft && x <= ctrl.offsetLeft +ctrl.offsetWidth
		&& y >= ctrl.offsetTop && y <= ctrl.offsetTop +ctrl.offsetHeight )
			return true
		return false
	},
	xyOffset: function(ctrl, from){
		//from: string; oneOf:['25%25%', topleft, topcenter, topright, bottomleft, bottomright, bottomcenter, centerleft, centercenter, centerright]
		var pos={top:0, left:0}, ht=0, wd=0 ,x=0, y=0
		//
		if(ctrl===window){
			pos = {top:0, left:0}
			ht= window.innerHeight
			wd= window.innerWidth
		}else{
			pos = ui.calc.xyAbs(ctrl)
			//var rect = ctrl.getBoundingClientRect()
			ht= ctrl.offsetHeight
			wd= ctrl.offsetWidth
		}
		//
		function local_percent(str,idx,max){
			//expect str='nn%nn%'
			var start = 0, end=str.length-1
			if(idx===end){
				start=str.indexOf('%')+1
			}else{
				end=idx
			}
			var pc = str.substring(start,end)
			return Math.round(max * Number(pc)/100 *100) /100
		}
		//
		var fromlng = from.length
			, pcidx = from.indexOf('%')
		if(pcidx >0 && pcidx < fromlng)
			y=pos.top +local_percent(from, pcidx, ht)
		else
		if(from.indexOf('top') >=0){
			y=pos.top;
		}else
		if(from.indexOf('bottom') >=0){
			y=pos.top +ht;
		} else
		if(from==='center'
	  || from.indexOf('center')===0)
			y=pos.top +Math.round(ht/2);
		//
		pcidx = from.lastIndexOf('%')
		if(pcidx>0 && pcidx===(fromlng -1))
			x=pos.left +local_percent(from, pcidx, wd)
		else
		if(from.indexOf('left') >=0)
			x=pos.left
		else
		if(from.indexOf('right') >=0)
			x=pos.left +wd
		else
		if(from==='center'
		|| from.lastIndexOf('center')>0)
			x=pos.left +Math.round(wd/2)
		//
		return {x:x, y:y}
	}
}


function gridLoad(layoutMode, extFilter = null){

	if(extFilter==null) {
		if(gExtFilter == null)
			 extFilter={ ALL:1 }
		else
			extFilter = gExtFilter		//use last filter applied
	}
	gExtFilter = extFilter

	if(layoutMode === 'videoWall'){
		videoWall.toggle()
		return
	}

	if(isotope!==null){
		ui.reset()
	}

	if(items.length===0){
		console.log('gridLoad(), no data to layout. Exiting.', items)
		return
	}
	let selectedFile=null
	if(ui.args.defaultImageName != null){
		const path = require('path')
		if(ui.args.path.indexOf(ui.args.defaultImageName) >= 0)
			selectedFile=ui.args.path
		else {
			selectedFile = ui.calc.pathTrailingSlash(ui.args.path, 'posix')
				   		+ ui.args.defaultImageName
		}
	}
	if(ui.args.shuffle==true){
		if(itemselected!=null) selectedFile = itemselected.path
		itemselected=null
		dlgFactory.bbl('Shuffling folder items...')
		items = arrShuffle(items)
	} else
	if(ui.args.order!==undefined && ui.args.order!==''){
		if(itemselected!=null) selectedFile = itemselected.path
		itemselected=null
		itemsSort(ui.args.order, ui.args.descending)
	}
	if(ui.args.folders=='first' || ui.args.folders=='last'){
		itemsFolders(ui.args.folders)
	}
	if(layoutMode==null)	layoutMode='cols'
	lastLayoutMode = layoutMode

	var html = '', cnt=0, layout=null, obj=null,
			io = ui.args.iconsOnly,
			winwidth=window.innerWidth, winheight=window.innerHeight,
			defaultwidth=320, defaultheight=200,
			preload = (ui.args.videoMetadata===true ?'metadata' :'none')
	//
	if(layoutMode==='cols'){
		layout='masonry'
		rulGridItem.style.textAlign='center'
		rulGridItem.style.verticalAlign='middle'
		defaultwidth = (winwidth /3) -20			//13
		//defaultheight = 200
	}else
	if(layoutMode==='rows'){
		layout='fitRows'
		rulGridItem.style.textAlign='center'
		rulGridItem.style.verticalAlign='middle'
		//defaultwidth = 320
		defaultheight = (winheight/4) -20
	}else
	if(layoutMode==='vert'){
		layout='vertical'
		rulGridItem.style.textAlign='left'
		rulGridItem.style.verticalAlign='top'
		defaultwidth = 320
		//defaultheight = 200
	}else
	if(layoutMode==='wall'){
		layout='packery'
		rulGridItem.style.textAlign='center'
		rulGridItem.style.verticalAlign='middle'
		defaultwidth = Math.floor(winwidth/4)-10
		//defaultheight = 200
	}
	//
	for(var idx in items){	//define grid items
		items[idx].pid = idx	//reset in case of ui.args.shuffle=true
		items[idx].ctrl = null
		obj = items[idx]

		if(obj.isDeleted && obj.isDeleted===true) continue
		if(ui.args.folders==='hidden' && obj.isDirectory===true) continue
		if(extFilter.ALL !== 1 && (extFilter[obj.type] !== 1 && extFilter[obj.mediaType] !== 1)) continue

		cnt++
		let width=obj.w, height=obj.h
		if(io === true){
			width=defaultwidth	//320
			height=defaultheight	//200
		} else
		if(layoutMode==='cols') {		//cols
			width=defaultwidth			//(winwidth /3)-13
			height=obj.h /(obj.w/width)
		}else
		if(layoutMode==='rows') {		//rows
			height=defaultheight			//(winheight/4)
			width=obj.w /(obj.h/height)
		}else
		if(layoutMode==='vert') {
			width=defaultwidth		//320
			height=obj.h/(obj.w/width)
		}
		else{ 											//packery (wall)
			//var itwdt = Math.floor(winwidth/4)-10
			if(obj.w >= 1600)	//resize to maintain relative sizes
				width = Math.floor(defaultwidth*1.33)
			else
			if(obj.w > 640)
				width = defaultwidth
			else
				width = Math.floor(defaultwidth*0.66)
			height= obj.h /(obj.w/width)
		}
		//apply user's scale argument
		if(scale !== 1){
			height=Math.floor( height *scale)
			width =Math.floor( width *scale)
		}
		//build childhtml:
		let childhtml = '',
				onclick 	= `itemClick(${obj.pid}, event)`,
				title			= obj.basename

		if(obj.isDirectory===true){
			childhtml = `<img id="fld${obj.pid}"	src="${obj.src}" alt="${obj.basename}"
				style="height:${height/2}px;max-width:${width/2}px; margin-top:${layoutMode==='vert' ?0 :Math.round(height/3)}px"
				></img>`
		} else
		if(io===true 
		|| (obj.type !== '.svg' && ['document','unknown'].indexOf(obj.mediaType) >= 0)){
			let src = null
			if(obj.iconsrc === undefined){
				src =obj.type.substring(1)
				if(fileIcons.indexOf( src ) >= 0)
					obj.iconsrc = src		//cache file icon source
				else
					obj.iconsrc = null
			}
			if(obj.iconsrc !== null)
				src ="file:///"+renderer.dirName+"\\resources\\icons\\"+obj.iconsrc+".svg"
			else
				src = 'file:///'+renderer.dirName+"/resources/new_document_64.png"
			title += `, ${ui.calc.bytesToStr(obj.size)}`
			childhtml = `<img id="unk${obj.pid}"	src="${src}" alt="${obj.basename}"
				style="height:${height/2}px;max-width:${width/2}px; margin-top:${layoutMode==='vert' ?0 :Math.round(height/3)}px"
			></img>`
		} else
		if(obj.mediaType === 'image') {
			title 	 += `, ${obj.w} x ${obj.h}, ${ui.calc.bytesToStr(obj.size)}`
			childhtml = `<img	id="img${obj.pid}"	src="${obj.src}" alt="${obj.basename}"
				style="height:${height}px;width:${width}px;display:${layout==='vertical'?'inline-table':'block'};"
				></img>`
		}	else
		if(obj.mediaType === 'video'){
			title += `, ${ui.calc.bytesToStr(obj.size)}`
			childhtml = `<video controls preload='${preload}'
				id="vid${obj.pid}" src="${obj.src}" type="video/${obj.type.substr(1)}"
				style="height:${height-20}px;max-width:${width-20}px;"
			></video>`
		} else
		if(obj.mediaType === 'audio'){
			title	+= `, ${ui.calc.bytesToStr(obj.size)}`
			childhtml = `<audio controls preload='metadata'
				id="aud${obj.pid}" src="${obj.src}"
				style="margin:${height/2}px auto 0 auto; max-height:${height-30}px;	width:${width}px;"
			></audio>`
		} else
		// if(obj.mediaType === 'svg'){
		if(obj.type === '.svg'){
			title	 += `, ${ui.calc.bytesToStr(obj.size)}`
			childhtml = `<img id="svg${obj.pid}"	src="${obj.src}" alt="${obj.basename}"
				height=${height}	width=${width}
				style="background-color:whitesmoke;"
			></img>`
		}
		//compose html:
		if(layoutMode !== 'vert') {
			if(io===true || ['image','svg'].indexOf(obj.mediaType) < 0){ //add caption at bottom for non-images
				childhtml += `<div class='grid-itemCaption'>${obj.basename}</div>`
			}
			html += `<div
					class='grid-item' id="obj${obj.pid}"
					draggable="true" ondragstart="itemDragStart(event)" ondrop="itemDrop(event)"
					style="min-height:${height}px;width:${width}px"
					onclick="${onclick}"
					title="${Number(idx) +1}. ${title}"
				>
					${childhtml}
				</div>`
		}
		else{	//layoutMode = vert
			let dt =(obj.date!==undefined
						 ? new Date(obj.date).toUTCString()
						 : ''),
					sz =(obj.size!==undefined && obj.size>0
						 ? ui.calc.bytesToStr(obj.size)
						 : '')
			if(obj.mediaType === 'image')
				sz += `<br>${obj.w} x ${obj.h}`

			html += `<table id="tgi${obj.pid}" class='grid-item vertTb'><tr class=vertTr>
				<td class=vertTd0><label>
					${Number(idx) +1}. <input id="cgi${obj.pid}" type=checkbox onclick="selectListToggle(${obj.pid})">
				</label></td>
				<td class=vertTd1 style="width:${io===true ?100 :320}px; ">
					<div
						id="obj${obj.pid}"
						draggable="true" ondragstart="itemDragStart(event)" ondrop="itemDrop(event)"
						style="width:auto"
						onclick="${onclick}"
						title="${title}"
					>
						${childhtml}
					</div>
				</td><td class=vertTd2>
					${obj.basename}
				</td><td class=vertTd3 style="display:${sz=='' ?'none' :'grid'};">
					${sz}
				</td><td class=vertTd3>
					${dt}
				</td></tr></table>`
		}
	}
	grid.innerHTML = html
	//
	isotope = new Isotope(grid, {
  	fitWidth: true,
  	focus:true,
  	gutter: 0,
		initLayout: true,
		itemSelector: '.grid-item',
		layoutMode: layout,
		masonry: {
		  gutter: 0	//(10 *scale)
		},
  	//percentPosition: true,
  	resize: true,
		//stagger: 30,
		stamp:'.stamp',
	});
	//
	if(ui.args.scroll===true){
		gridScrollToggle(true)
		ui.args.scroll=false
	}
	if(selectedFile != null || itemselected != null){	//may be changing layout, list is unchanged
		if(selectedFile != null){
			itemselected = itemPathFind(selectedFile)
		}
		if(itemselected !=null ){
			var pid = itemselected.pid
			itemselected=null
			itemSelect(pid)
			if(itemselected.ctrl != null) {	//if filtering ctrl may be null
				itemselected.ctrl.scrollIntoView({
					behavior:'instant',	// "auto"  | "instant" | "smooth",
					block:'start'
				})
			}
			if(ui.args.defaultImageName != null){	
				//console.log(111)
				ui.args.defaultImageName = null		//20200529 to fix: only works after the second function call
													//therefore: displays slideshow twice
				if(itemselected.mediaType === 'image')
					openPhotoSwipe(pid)
			}
		}
	}
	if(cnt===items.length)
		dlgFactory.bbl(`${cnt} items`)
	else
		dlgFactory.bbl(`${cnt}/${items.length} displayed`)
	//dlgIdxInit()
}
function gridScrollToggle(boo){
	if(boo===undefined) boo=(scrollTimer===null)	//this is the toggle case
	var scrollPause=-1	//pause briefly when changing direction
	if(boo===true){
		scrollTimer = window.setInterval(function(){
			//console.log(scrollPause)
			if(scrollPause > 0) {		//pause when changing direction
				scrollPause--
				return
			}
			window.scrollBy(0,scrollDir)
			if(scrollDir===null || window.pageYOffset<=0){	//reset at top and bottom of page
				if(scrollPause!=-1)	//skip pause during first call
					scrollPause=72
				scrollDir = 1
			} else
			if( (window.pageYOffset+window.innerHeight) >= document.body.clientHeight){
				scrollPause=72
				scrollDir = -1
			}
			else
				scrollPause=0
		}, scrollTimeout); // scrolls every n milliseconds
	}	else
	if(boo===false){
		clearTimeout(scrollTimer)
		scrollTimer=null
		scrollDir=null
		document.getElementById('grid').focus()
	}
}
function gridClick(event){
	if(event.target.id != 'grid') return

	selectItems([])	//remove all selections when grid background is clicked
	return ui.eventStop(event)
}

function openPhotoSwipe(pid, event) {
  if(event && event.ctrlKey===true) {
//  	console.log('openPhotoSwipe(): event.ctrlKey')
  	return itemClick(pid, event)
  }

	let pswpElement = document.querySelector('.pswp'),
			galleryItems = [],
			workitems = items,	//overridden if pid in selectList
			defaultPid = 0,
			id = -1

	if(gallery!==null) return

	if(pid===undefined)
		pid=0
	else
	if(selectListHas(pid)){		//only display items in selectList
		workitems = selectListObjects()
	}

	for(var idx in workitems) {	//scale images
		let obj=workitems[idx]
		if(obj.isDeleted && obj.isDeleted===true) continue
//		if(['image','svg','video'].indexOf(obj.mediaType) < 0)
		if(['image','svg'].indexOf(obj.mediaType) < 0)
			continue

		if(defaultPid===0 && pid==obj.pid)
			defaultPid = galleryItems.length
		galleryItems.push({
			src: obj.src,
			w: obj.w *(scale<=1 ? 1 :scale),
			h: obj.h *(scale<=1 ? 1 :scale),
			itempid: obj.pid,
			pid: idx		//required by Photoswipe, id property
		})
/*
		let tmpobj = {
			w: obj.w *(scale<=1 ? 1 :scale),
			h: obj.h *(scale<=1 ? 1 :scale),
			itempid: obj.pid,
			pid: idx,		//required by Photoswipe, id property
			mediaType: obj.mediaType
		}
		if(obj.mediaType === 'video'){
			tmpobj.html =  `
				<video id="gvi${obj.pid}" style='position:relative'
					controls preload='metadata' class=galleryVideo
					ontransitionend="console.log(111)"
					src="${obj.src}" type="video/${obj.type.substr(1)}"
				></video>`

				//to center video after scale transformation:
				//		((window.innerWidth - (video.offsetWidth *scale)) /2) -video.offsetLEft
		}else
			tmpobj.src = obj.src
		galleryItems.push(tmpobj)
	*/
	}
	if(selectListHas(pid)){
		dlgFactory.bbl(`Slideshow viewing ${galleryItems.length} of ${selectListCnt()} selected items.`)
	}

	var options = {
		bgOpacity: 1,	//0.85,	//1
		captionEl: false,	//true,
		closeOnScroll: false,
		escKey: true,
		focus:true, 	//true,
		galleryPIDs:true,
		hideAnimationDuration:0,	//333,		//destry slideshow pause
		history:false,
		index: defaultPid, // first slide to start with
		indexIndicatorSep: ' of ',	//' / ',
		//mouseUsed:true,
		showAnimationDuration:0,	//333,		//init slideshow pause
		showHideOpacity:true,
		//spacing:0.8,		//0.12
		timeToIdle: 1000,	//4000,
		zoomEl: false,
	}
	document.body.style.overflow='hidden'	//hide scrollbars
	gallery = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, galleryItems, options);
	gallery.dlg = {
		dlgParent:null			//allows synchronized destroy event with dialog boxes
	}
	gallery.listen('destroy', function() {
		document.body.style.overflow='auto'	//show scrollbars
		if(slideCaptionOptions.html != null){
			slideCaptionOptions.html.style.display='none'
		}
		if(itemselected!=null){			//window.scrollTo(0,itemselected.ctrl.offsetTop)
			if(itemselected.ctrl.offsetTop < window.scrollY
			|| itemselected.ctrl.offsetTop > window.scrollY +window.innerHeight) {
				itemselected.ctrl.scrollIntoView({
				  behavior:'smooth',	// "auto"  | "instant" | "smooth",
				  block:'start'})}
		}
		if(gallery.dlg.dlgParent != null){
			dlgFactory.close(gallery.dlg.dlgParent)
		}
		gallery=null
		if(galleryScrollTimer!=null) galleryPlay()	//will auto destroy
	})
	gallery.listen('afterChange', function() {
		//var pid = gallery.currItem.pid
		let pid = gallery.currItem.itempid,
				obj = itemSelect(pid),
				dsc = (obj.dsc != undefined && obj.dsc != null && obj.dsc != ''
							? obj.dsc.replace(/&lt;/g, "<").replace(/&gt;/g, ">")	//.replace(/"/g, "'")
							: '')
		itemSelect(pid)
		if(ui.args.showSlideCaptions===true){
			var str = `
				${obj.basename}
				<br>${obj.h} x ${obj.w}
				<br>${ui.calc.bytesToStr(obj.size)}
				<div style="text-align:left">${dsc}</div>
				`
			slideCaptionOptions.at = {x:window.innerWidth-40, y:window.innerHeight-20}	//incase it changes
			if(slideCaptionOptions.html===null)	{//first run, init
				slideCaptionOptions.html=str
				slideCaptionOptions.child = dlgFactory.tac2(slideCaptionOptions)
				slideCaptionOptions.child.onmouseover = function(event){
					slideCaptionOptions.child.style.opacity = 1
				}
				slideCaptionOptions.child.onmouseout = function(event){
					dlgFactory.fadeOut(
						slideCaptionOptions.child,
						slideCaptionOptions.destroyOpacity,
						slideCaptionOptions.destroyDelay,
						slideCaptionOptions.fadeDelay,
						false
					)
				}
			} else {
				slideCaptionOptions.child.innerHTML=str
				slideCaptionOptions.child.style.opacity = 1
				slideCaptionOptions.child.style.display = 'block'
				//dlgFactory.tac2(slideCaptionOptions)			//incase it changes
			}
			dlgFactory.fadeOut(
				slideCaptionOptions.child,
				slideCaptionOptions.destroyOpacity,
				slideCaptionOptions.destroyDelay,
				slideCaptionOptions.fadeDelay,
				false
			)
		}
/*
	not worth the effort becuase Photoswipe zoom does not handle non-image types so display is difficult to manage
		if(obj.mediaType === 'video'){
			let ctrl = gallery.currItem.container,
					lastscale = null
			console.log('container', ctrl)
xxx=ctrl
			ctrl.addEventListener('transitionend', () => {
			  let scale = ctrl.style.transform
			  let ii = scale.indexOf('scale(') +6
			  if(ii < 0) return
			  let ii2 = scale.indexOf(')', ii)
			  scale = Number( scale.substring(ii, ii2) )
			  if( isNaN(scale) ) return
			  if( lastscale  === scale) return
			  lastscale = scale
			  console.log('Transition ended', scale);

				//to center video after scale transformation:
				//		((window.innerWidth - (video.offsetWidth *scale)) /2) -video.offsetLEft
				//((window.innerWidth - (xxx.offsetWidth *1.1)) /2) -xxx.offsetLeft
				let child = ctrl.querySelector('video')
				let x	= ((window.innerWidth - (child.offsetWidth *scale)) /2) -(child.offsetLeft *scale)
				let y	= ((window.innerHeight - (child.offsetHeight *scale)) /3) -(child.offsetTop *scale)
				//if(x < 0) x = 0
				//xxx.style.transform = `translate3d(-62px, 0px, 0px)`
				let transform = `translate3d(${x}px, ${y}px, 0px)`
				console.log(' ', transform)
				child.style.transform = transform
			});
		}
*/
	})


	gallery.init()

	if(dlgDelay===null){
		dlgDelay = dlgFactory.tac2({
			to:{ctrl:'btnGalleryDelay',from:'bottomcenter', fadeDelay:hvrFadeDelay}
		, from:'topcenter'
		, canDestroy:false
		, createHidden:true
		//, focusCtrl:'.dlgEdList'
		,	html:`
			<button onclick='galleryDelaySet(3000)' class=dlgButton>3s</button>
			<button onclick='galleryDelaySet(5000)' class=dlgButton>5s</button>
			<button onclick='galleryDelaySet(10000)' class=dlgButton>10s</button>
			<button onclick='galleryDelaySet(15000)' class=dlgButton>15s</button>
			<button onclick='galleryDelaySet(30000)' class=dlgButton>30s</button>
			<button onclick='galleryDelaySet(60000)' class=dlgButton>60s</button>`
		, attrib:{
				className:'selGalleryDelay dlgFrm'
			, style:{border:0, padding:0, zIndex:1500}
			}
		})
	}
}
//var xxx=null
function galleryWheelEvent(event){
	if(gallery===null) return
	if(event.buttons!=0
	||event.ctrlKey===true
	||event.altKey===true) return
	
	galleryImageScale(event, (event.deltaY < 0))
	return ui.eventStop(event)
}
function galleryImageScale(wheelEvent, boo) {
	if(gallery == null)  return
	if(wheelEvent===undefined) wheelEvent = null
	var sc = gallery.getZoomLevel(),
			inc= 0.05
	if(boo===true) sc += inc
	else sc -= inc
	if(sc < 0.01) sc = 0.01
	/*
	if(wheelEvent==null)
		gallery.zoomTo(sc, {x:gallery.viewportSize.x/2,y:gallery.viewportSize.y/2}, 0)
	else
		gallery.zoomTo(sc, {x:wheelEvent.clientX,y:wheelEvent.clientY}, 0)
	*/
	gallery.zoomTo(sc, {x:gallery.viewportSize.x/2,y:gallery.viewportSize.y/2}, 0)

}
function galleryDelayGet(){	//get slideshow delay
	function local_update(){
		galleryDelay = dlgGalleryDelay.querySelector('#inpDelay').value*1000
		document.getElementById('btnGalleryDelay').innerHTML = (galleryDelay/1000)+'s'
		dlgFactory.close(dlgGalleryDelay)
	}
	dlgGalleryDelay = dlgFactory.create({
		focusId: '#inpDelay',
		title: 'Set Slideshow Delay',
		style:{zIndex:1500},
		body: `<label style="text-align:center;margin:0;"><input id=inpDelay type=number value=${galleryDelay/1000} min=1 style='width:3em; text-align:right;' tabindex=0> seconds</label>`,
		onClose:function(Adlg){ dlgGalleryDelay=null },
		buttons:{
			default: 'Save',
			"\u227A": function(dlg,btn){	//save and reverse slideshow
				local_update()
				if(galleryScrollTimer!==null) clearTimeout(galleryScrollTimer)
				galleryScrollTimer=null
				galleryPlay(false, true)
			},
			Save: function(dlg, btn){	//save and close
				local_update()
				dlgFactory.close(dlg)
			},
			"\u227B": function(dlg,btn){	//save and start slideshow
				local_update()
				if(galleryScrollTimer!==null) clearTimeout(galleryScrollTimer)
				galleryScrollTimer=null
				galleryPlay(true, true)
			}
		}
	})
}
function galleryDelaySet(val){
	galleryDelay=val
	document.getElementById('btnGalleryDelay').innerHTML=(val/1000)+'s'
}
function galleryFindItem(pid){
	for(let ii = 0; ii < gallery.items.length; ii++){
		let gitm = gallery.items[ii]
		if(gitm.itempid == pid)
			return gitm
	}
	return null
}
function galleryPlay(boo, skipCurrent) {			//toggle slideshow

	if(galleryScrollTimer!=null) {								//toggle off
		clearTimeout(galleryScrollTimer)
		galleryScrollTimer=null
		if(ui.args.showSlideCaptions===true)
			dlgFactory.bbl('Slideshow stopped', bblDur)
		return
	}

	if(boo===undefined) boo=true
	if(skipCurrent===undefined) skipCurrent=true

	var local_func = function(){
		if(gallery==null){
			clearTimeout(galleryScrollTimer)
			galleryScrollTimer = null
			if(ui.args.showSlideCaptions===true)
				dlgFactory.bbl('Slideshow stopped', bblDur)
			return
		}
		if(boo===true) gallery.next()	//gallery automatically resets index at end of list
		else gallery.prev()
	}

	if(boo===true){
		if(ui.args.showSlideCaptions===true)
			dlgFactory.bbl('Slideshow started', bblDur)
		if(skipCurrent===true)
	 		gallery.next()
	}else{
		if(ui.args.showSlideCaptions===true)
			dlgFactory.bbl('Slideshow playing in reverse', bblDur)
		if(skipCurrent===true)
			gallery.prev()
	}
	galleryScrollTimer = window.setInterval(local_func, galleryDelay); // scrolls every n milliseconds
}
function galleryRemoveCurrentItem(){
	if(gallery == null) return
	if(gallery.items.length === 1){
		galleryClose()
		return
	}
	//remove deleted image from gallery
	let curidx = gallery.getCurrentIndex()
	gallery.items.splice(curidx, 1)
	gallery.invalidateCurrItems()
	gallery.updateSize(true)
	gallery.ui.update()
	document.querySelector('#pswpMain').focus()
}
function galleryRemoveItem(pid){	//not used as yet
	if(gallery == null) return
	if(gallery.items.length === 1){
		galleryClose()
		return
	}
	//remove deleted image from gallery
	let idx = null
	for(let ii = 0; ii < gallery.items.length; ii++){
		var itm = gallery.items[ii]
		if(itm.itempid == pid){
			gallery.items.splice(ii, 1)
			gallery.invalidateCurrItems()
			gallery.updateSize(true)
			gallery.ui.update()
			document.querySelector('#pswpMain').focus()
			return
		}
	}
}
function galleryShow(pid){
	if(pid===undefined) pid=0
	if(gallery == null)
		openPhotoSwipe(pid)
	else {
		for(let ii in gallery.items){
			let item = gallery.items[ii]
			if(item.pid === pid){
				gallery.goTo(ii)
				break
			}
		}
	}
}
function galleryClose(parentId){
	//return true when parentId = gallery.dlg.dlgParent.id
	if(gallery === null) return false

	if(parentId === undefined){		//default action
		gallery.close()
		gallery=null
		return false
	}

	if(parentId === null) return

	//handle dialogs that manually open gallery
	if(gallery.dlg.dlgParent !== null
	&& gallery.dlg.dlgParent.id === parentId) {
		gallery.dlg.dlgParent = null
		galleryClose()		//execute default close action
		return true
	}
	return false
}

function openYoutube(pid, event){
  if (event && event.ctrlKey===true) {
//  	console.log('openYoutube(): event.ctrlKey')
  	return
  }

	var obj = items[pid]
	var hh = (window.innerHeight-30>=obj.h ?obj.h :Math.floor(window.innerHeight*0.9))
	var html = `<iframe frameborder="0" allowfullscreen
				id="ifr${obj.pid}" src="${obj.src}"
				style="height:${hh}px;width:${obj.w}px;margin:0 auto;"></iframe>`
		dlgFactory.create({
			title:obj.basename
		, headerHidden:true
		,	focusId: '#btnDlgClose'
		,	body:html
		, height:hh	//obj.h
		//, top:(hh>0 ?hh+'px' :'0.5em')
		, top:Math.round((window.innerHeight-hh)/4)+'px'
		, width:obj.w
		})
}
function playVideo(ctrl, event){
  if (event && event.ctrlKey===true) {
//  	console.log('playVideo(): event.ctrlKey')
  	return
  }

	if(ctrl.paused)
		ctrl.play()
	else
		ctrl.pause()
	return ui.eventStop(event)
}

function itemDragStart(event){
	event.dataTransfer.effectAllowed = "copyMove";
	let pid = controlIdToPid(event.target.id)
	if(selectListHas(pid)){
		//console.log('dragstart selected', pid)
		//event.dataTransfer.setData('text/plain', selectListPids())
		event.dataTransfer.setData('text/pid', selectListPids())
	}
	else {
		itemSelect(pid, false)
		//event.dataTransfer.setData('text/plain', pid)
		event.dataTransfer.setData('text/pid', pid)
	}
}
function itemDrop(event){
	let tpid = controlIdToPid(event.target.id),
			obj = items[tpid],
			dest = obj.path,
			pids = event.dataTransfer.getData("text/pid")

	if(pids == '') return
	if(pids == tpid) return	//drop item on itself
	if(pids.indexOf(',') >= 0) {	//using selectList
		if(selectListHas(tpid))	//destinatation in selectList, nothing to do
			return
	}

	if(obj.isDirectory == true){
		//console.log('itemDrop():', pids, event.target.id, dest)
		if(dlgBulk==null)
			bulkOps( pids, dest, true )
	}
}
function itemClick(pid, event){
  if(event.ctrlKey===true){		//itemSelected list handling
		selectListToggle(pid)
		return ui.eventStop(event)
	}
	else
	if(event.detail === 2){			//double-click
		clearPidClicked()
		itemDblClick(pid, event)		//default dblclick action
	}
	else {		//single click
		grid.dlg.pidClicked = pid
		grid.dlg.pidClickedTimeout = window.setTimeout(		//delay click action in case there is a dblclick
			function(pidClicked){

				if(grid.dlg.pidClicked === null) return
				if(pidClicked != grid.dlg.pidClicked) return

				clearPidClicked()
				let obj = items[pidClicked]

//				if(['image','svg','video'].indexOf(obj.mediaType) >= 0)
				if(['image','svg'].indexOf(obj.mediaType) >= 0)
					openPhotoSwipe(pidClicked, event)
				else
					itemSelect(pidClicked)
			},
			ui.var.dblClickDelay,
			pid)
		return ui.eventStop(event)
	}
	//else (detail === 3)		//triple-click
}
function clearPidClicked(){
	if(grid.dlg.pidClickedTimeout == null) return
	window.clearTimeout(grid.dlg.pidClickedTimeout)
	grid.dlg.pidClicked = null
	grid.dlg.pidClickedTimeout = null
}
function itemDblClick(pid, event){		//launch files in OS or open folders
	itemSelect(pid)
	var obj = items[pid]
	if(obj.isDirectory){
		//renderer.newFolderViewApp(obj)
		renderer.folderLoad(obj.path)
	}else
		renderer.openFile(obj)
	return ui.eventStop(event)
}

function itemDeselect(pid){
	if(itemselected==null) return
	var ctrl=document.getElementById(`obj${itemselected.pid}`)
	classRemove(ctrl,'gridItemSelected')
	classRemove(ctrl,'gridItemMultiSelect')
	if(lastLayoutMode === 'vert')
		grid.querySelector('#cgi'+pid).checked = false
	itemselected=null
}
function itemSelect(pid, scrollIntoView){
	if(scrollIntoView==null) scrollIntoView=false
	if(typeof pid==='string' && pid.length>=5){
		//assume pid is a path:  img.path='c:/...'
		pid = items.find(function(el,ii,list){
			if(el.path===pid){
				pid = el.pid
				return true
			}
			return false
		})
		pid = (pid==undefined ?false :pid.pid)
	}
	if(itemselected==null || itemselected.pid!==pid) {	//unselect last item
		if(itemselected!==null) {
			var ctrl =  grid.querySelector(`#obj${itemselected.pid}`)
			if(ctrl != null){	//if filtering ctrl may be null
				classRemove(ctrl,'gridItemSelected')
				if(selectListHas(itemselected.pid))
					selectListHilight(itemselected.pid, true)
				else
					selectListHilight(itemselected.pid, false)
			}
			itemselected=null
		}
		if(pid!==false) {
			itemselected=items[pid]
			ctrl =  document.getElementById(`obj${pid}`)
			if(ctrl != null){			//if filtering ctrl may be null
				if(selectListCnt() > 0){
					if(selectListHas(pid))			//item may be in ui.var.selectList
						classRemove(ctrl,'gridItemMultiSelect')
					else{
						selectListEmpty()			//reset selection
					 	dlgFactory.bbl('Selected items reset')
						// console.log('Selected items:', ui.var.selectList)
					}
				}
				classAdd(ctrl,'gridItemSelected')
			}
			itemselected.ctrl = ctrl
		}
	}

	if(scrollIntoView===true){
		if(itemselected != null && itemselected.ctrl != null) {
			itemselected.ctrl.scrollIntoViewIfNeeded(true)
//			itemselected.ctrl.scrollIntoView({
//				  behavior:'smooth',	// "auto"  | "instant" | "smooth",
//				  block:'start'			//start, center, end, nearest
//			})
		}
	}
	return itemselected
}
function itemRemove(pid){
	//remove item html control
//	var el = document.getElementById('obj'+pid)
	var el = grid.querySelector('#obj'+pid)
	if(el!==null){
		isotope.remove( el )
		el.style.display = 'none'
		if(lastLayoutMode === 'vert')
			grid.querySelector('#tgi'+pid).style.display = 'none'
	}
	//mark item as deleted
	if(items[pid])
		items[pid].isDeleted = true
	//unselect
	if(itemselected && itemselected.pid === pid)
		itemDeselect(pid)
	//remove from selectList
	selectListRemove(pid)
	//remove from gallery
	galleryRemoveItem(pid)
}
function itemUpdate(apath, vals){
	//assume: vals = {path, basename, etc}
	let itm = itemPathFind(apath)
	if(itm === null)
		throw new Exception(`itemUpdate() error, can not find item to update properties`)

	for(let prop in vals){
		if(itm[prop] === undefined) continue
		itm[prop] = vals[prop]
	}

	//update videoWall
	if(lastLayoutMode == 'videoWall'){		//pid's are messed up when items shuffled
		videoWall.cntUpdate( itm )
		return 	itm
	}

	//update grid control
	let ctrl = itm.ctrl
	if(ctrl === null)
		ctrl = grid.querySelector('#obj'+itm.pid)
	ctrl.title = itm.basename
	if(['image','svg'].indexOf(itm.mediaType) >= 0){
		ctrl.children[0].src = itm.src
		ctrl.children[0].alt = itm.basename
	} else
	if('video' === itm.mediaType){
		ctrl.children[0].src = itm.src
		if(lastLayoutMode === 'vert')	//td.td.innerHTML
			ctrl.parentElement.nextElementSibling.innerHTML = itm.basename
		else
			ctrl.children[1].innerHTML = itm.basename
	}
	else{	//itm.isDirectory || itm.mediaType == unknown
		ctrl.children[0].alt = itm.basename
		ctrl.children[1].innerHTML = itm.basename
	}

	//update gallery
	if(gallery != null){
		let gitm = galleryFindItem(itm.pid)
		if(gitm === null)
			return		//this should never happen
		gitm.src = itm.src
		gallery.invalidateCurrItems();
		gallery.updateSize(true);
	}
	return itm
}

function selectItems(list){
	//asume list is one of: pid, 'pid1,pid2', [pid1, pid2], undefined means select all items
	if(typeof list === 'number')
		list = [list]
	else
	if(typeof list === 'string'){
		if(list.indexOf(','))
			list = list.split(',')
		else
			list = [list]			//should this be: [Number(list)]
	}else
	if(list === undefined){			//select all
		if(selectListCnt() > 0 || itemselected != null)			//toggle selection
			list = []
		else
			list = items.map(obj => Number(obj.pid))
	}

	let cnt = selectListCnt()
	if(cnt > 0)
		selectListEmpty()
	if(itemselected != null)
		itemDeselect(itemselected)

	ui.var.selectList = list
	if(list.length === 0){
		 if(cnt > 0)
			dlgFactory.bbl('Selected items reset')
	}
	else{
		selectListHilightAll(true)
		dlgFactory.bbl(`${ui.var.selectList.length} items selected`, bblDur)
	}
	// console.log('Selected items:', ui.var.selectList)
}
function selectListCnt(){
	return ui.var.selectList.length
}
function selectListEmpty(){
	if(ui.var.selectList.length === 0) return
	selectListHilightAll( false )
	ui.var.selectList = []
}
function selectListHas(pid){
//	console.log(`selectListHas(${pid})`,ui.var.selectList.indexOf(Number(pid)))
	return (ui.var.selectList.indexOf(Number(pid)) >= 0)
}
function selectListHilight(pid, active){
	//assume: typeof active === bool
	let cn = 'gridItemMultiSelect',
			ctrl = grid.querySelector('#obj'+pid)
	if(ctrl == null) return		//may be hidden
	if(active) classAdd(ctrl,cn)
	else classRemove(ctrl,cn)
	if(lastLayoutMode === 'vert')
		grid.querySelector('#cgi'+pid).checked = active
}
function selectListHilightAll(active){
	//assume: typeof active === bool
	if(ui.var.selectList.length == 0) return
	for(let ii=0; ii < ui.var.selectList.length; ii++){
		let pid = ui.var.selectList[ii]
		selectListHilight(pid, active)
	}
	if(active===true){			//select the last item
		itemSelect(ui.var.selectList[ui.var.selectList.length-1])
	}
}
function selectListPids(){
	return ui.var.selectList.toString()
}
function selectListObjects(){
	let list = []
	for(var pid of ui.var.selectList){
		list.push( items[pid] )
	}
	return list
}
function selectListRemove(pid){
	pid = Number(pid)
	if(ui.var.selectList.length===0) return
	let idx = ui.var.selectList.indexOf(pid)
	if(idx >= 0){
		ui.var.selectList.splice(idx,1)
	}
}
function selectListToggle(pid){
	let active = true
	if(ui.var.selectList.length===0){
		ui.var.selectList.push(pid)			//add to list
		itemSelect(pid)
	}
	else{
		let idx = ui.var.selectList.indexOf(pid)
		if(idx < 0){
			ui.var.selectList.push(pid)			//add to list
			itemSelect(pid)
		}
		else {
			active = false
			ui.var.selectList.splice(idx,1)			//remove from list
			selectListHilight(pid,false)			//unhilight
			if(idx > 0 && idx === ui.var.selectList.length){  //this was the last item added, select last item in list
				let last = ui.var.selectList[ui.var.selectList.length -1]
				itemSelect(last)
			}
		}
	}

	//report selectList status
	if(ui.var.selectList.length === 0)
  	dlgFactory.bbl('Selected items reset')
	else
	if(ui.var.selectList.length === 1)
			dlgFactory.bbl('1 item selected', bblDur)
	else
		dlgFactory.bbl(`${ui.var.selectList.length} items selected`, bblDur)
	console.log('Selected items:', ui.var.selectList)

	return active
}

function controlIdToPid(controlId) {
	//all control.id have format: aaaNNNNN, where aaa is a 3 char type designation
	var pid = Number(controlId.substr(3,10).trim())
	return pid
}
function controlIdToObj(id) {
	var pid = controlIdToPid(id)

	if(lastLayoutMode == 'videoWall'){		//pid's are messed up when items shuffled
		return videoWall.itmByCid( pid )		//pid is really a video cid, container id
	}

	var obj = items[pid]
	return obj
}
function itemPathFind(path){
	for(let ii = 0; ii < items.length; ii++){
		if(items[ii].path === path){
			return items[ii]
		}
	}
	//test paths as OS specific
	for(let ii = 0; ii < items.length; ii++){
		if(ui.calc.pathForOS(items[ii].path) === path){
			return items[ii]
		}
	}
	return null
}

function classAdd(ctrl,cssclass){
	if (!classHas(ctrl,cssclass))
		ctrl.className += " "+cssclass;
}
function classHas(ctrl, cssclass){
	return !!ctrl.className.match(new RegExp('(\\s|^)'+cssclass+'(\\s|$)'));
}
function classRemove(ctrl,cssclass){
	if (classHas(ctrl,cssclass)) {
    var reg = new RegExp('(\\s|^)'+cssclass+'(\\s|$)');
    ctrl.className=ctrl.className.replace(reg,' ');
  }
}
function findRule(selector) {
	//1. get stylesheet with no href
	var stylesheet = null
	for(var key=0; key < document.styleSheets.length; key++){
		if(document.styleSheets[key].href !== null) continue
		stylesheet = document.styleSheets[key];

		//2. find rule by selector
		for(var ii=0; ii < stylesheet.cssRules.length; ii++){
			var tmprule = stylesheet.cssRules[ii]
			if(tmprule.selectorText===selector){
				return tmprule
			}
		}
	}
	return false
}

function itemsSort(srtFld, descending) {
	/*var obj = {
		basename: fn,
		date:stat.mtime,
		size:stat.size,
		isDirectory:stat.isDirectory(),
		pid: id,
		type: ext
	}*/
	let _start = ui.calc.timeStart()
	// console.time('itemsSort')

	var mult = (descending===true ?-1 :1)
	function localCmp(obj1, obj2, fld){
		if(fld==='basename'){
			let a = obj1.sortname,
					b = obj2.sortname
			if(a < b) return -1 *mult
			if(a > b) return 1 *mult
			return 0
		}
		let a = obj1[fld],
				b = obj2[fld]
		if(a < b) return -1 *mult
		if(a > b) return 1 *mult
		return 0
	}
	items.sort(function(a, b){
		if(srtFld==='name'){
			return localCmp(a,b, 'basename')
		}
		else {
		// if(srtFld==='date'
		// || srtFld==='size'
		// || srtFld==='type'){
			var result = localCmp(a,b, srtFld)
			if(result != 0) return result
			return localCmp(a,b, 'basename')
		}
	})
	// console.timeEnd('itemsSort')
	// console.log( 'itemsSort end',ui.calc.timeEnd( _start))
}
function itemsFolders(folders){
	var list = []
	//get folders in list
	for(var ii=0; ii < items.length; ii++){
		items[ii].pid=ii
		if(items[ii].isDirectory===true){
			list.push(items[ii])
		}
	}
	//remove folders  from items
	for(var ii=list.length-1; ii >= 0; ii--){
		var idx = list[ii].pid
		items.splice(idx,1)
	}
	//re-add to items
	if(folders==='first'){
		for(var ii=list.length-1; ii >= 0; ii--)
			items.unshift(list[ii])
	}
	else
	if(folders==='last'){
		for(var ii=0; ii < list.length; ii++)
			items.push(list[ii])
	}
}
function arrShuffle(array) {
	//from: https://bost.ocks.org/mike/shuffle/
  var copy = [], n = array.length, i;
  // While there remain elements to shuffle…
  while (n) {
    // Pick a remaining element…
    i = Math.floor(Math.random() * array.length);

    // If not already shuffled, move it to the new array.
    if (i in array) {
      copy.push(array[i]);
      delete array[i];
      n--;
    }
  }
  return copy;
}
function tableSort(tableId, col, rowStart, numericCol) {

	//assume: rowStart >= 0; the row to start sorting from; some tables have rows that should not be sorted
	//assume: numericCol = boolean; is the column numeric
	if(rowStart == null) rowStart = 0
	if(numericCol == null) numericCol = false

	let sortid = tableId+'-'+col
	if(ui.var.sortid && ui.var.sortid === sortid)
		ui.var.sortdir = !ui.var.sortdir
	else{
		ui.var.sortid = sortid
		ui.var.sortdir = true
	}

  let t1 = new Date(),
  		dir= ui.var.sortdir,
  		table0, table, rows, pa, swapped, i, rowx, rowy, x, y

  table0 = document.getElementById(tableId);
  table = document.createElement('table');
  table.innerHTML = table0.innerHTML;
  rows = table.rows;
  pa = rows[rowStart].parentNode; //tbody

  swapped = true;

  while (swapped) {
    swapped = false;

    for (i = rowStart; i < rows.length - 1; i++) {
      rowx = rows[i];
      rowy = rows[i + 1];
      x = rowx.sortData;

      if (x === undefined) {
        //x = rowx.dataset['col' + col];
        x = rowx.children[col].innerHTML;
        if(numericCol===true)
        	x = Number(x)
        else
        	x = x.toLowerCase()
        rowx.sortData = x;
      }

      y = rowy.sortData;

      if (y === undefined) {
        y = rowy.children[col].innerHTML;
        //y = rowy.dataset['col' + col];
        if(numericCol===true)
        	y = Number(y)
        else
        	y = y.toLowerCase()
        rowy.sortData = y;
      }

      if(dir===true) {
	      if(x > y) {
	        pa.insertBefore(rowy, rowx);
	        swapped = true;
	      }
	    }
	    else{
	      if(x < y) {
	        pa.insertBefore(rowy, rowx);
	        swapped = true;
	      }
	    }
    }
  }

  table0.innerHTML = table.innerHTML;
  //console.log(col, 'time:', new Date() - t1, 'ms');
}
