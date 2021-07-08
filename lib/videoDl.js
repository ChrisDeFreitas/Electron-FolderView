/*
	videoDl.js

	- download youtube videos

    "ytdl-core": "^2.01"

*/

var dlgVideoDl = null
var videoDl = {
	dl_formats: {audio:[], video:[], both:[]},
	cfg: {
		url:'https://youtu.be/TnFWNk9rw40',
		title:'',
		cleanup:true,		//delete downloaded files used to make .mkv
		explorer:false,		//not implemented here: open windows explorer
		startms: null,
		dir: null,			//donwload folder

		vitag:null,		//video itag
		vcn:null,			//video container
		res:null,			//video resolution
		vfn:null,			//video filename
		vabr:null,		//video audioBitrate
		vdlDone:null,

		aitag:null,		//audio itag
		acn:null,			//aduio container
		abr:null,			//audioBitrate
		afn:null,				//audio filename
		adlDone:null
	}

}

videoDl.init = function(options) {

	if(dlgVideoDl != null){
		if(options.url === undefined){
			dlgVideoDl.dlg.options.onHeaderClick(dlgVideoDl)		//toggle min/max view
		}
		else{	//called from FireFox extension
			videoDl.cfg.url = options.url
			dlgVideoDl.querySelector('#dlgVideoDlUrl').value = options.url
			if(options.getInfo == true)
				videoDl.getInfo()
			if(dlgVideoDl.dlg.minimized===true)
				dlgVideoDl.dlg.options.onHeaderClick(dlgVideoDl)		//maximize view
		}
		if(options.url !== 'true')
			return
	}

	if(options == null)
		options = {url:'https://www.youtube.com/watch?v=qDQgZrKwAeY'}
	if(typeof options == 'string')
			options = {url:options}

	if(options.url === 'true'){
		console.log('VideoDl: auto open on app start')
		console.log('  default video url:', videoDl.cfg.url)
	}else
		videoDl.cfg.url = options.url

	let html, buttons

	html = `<label class="divBulkOptions" style="display:block;margin:1em auto; width:94%;">URL: <input id=dlgVideoDlUrl type=text value="${videoDl.cfg.url}" onfocus='this.select()' size=40>
		<button class="el el-caret-down dlgButton" title="Get available formats"  onclick="videoDl.getInfo()"></button>
		<button class="el el-arrow-down dlgButton" title="Paste and get formats" onclick="videoDl.pasteUrl()"></button>
		<button class="el el-circle-arrow-down dlgButton" title="Paste and download with default settings" onclick="videoDl.pasteUrlAndExec()"></button>
	</label>
	<table  class="divBulkOptions" style="margin:0 0 0 1em">
	<tr><td>Destination: </td><td><input id=dlgVideoDlDest type=test value="${ui.args.path}" size=40> <button onclick="videoDl.destFolderGet()" title='Select destination folder'>...</button></td></tr>
	<tr><td>Default itags: </td><td><input id=dlgVideoDlItags type=text value="${ui.var.videoDlDefaultItags.toString(',')}" size=40 title="Enter itags to automatically select, priority to first found"></td></tr>
	<tr><td><label for="dlgVideoDlClean" style="cursor:pointer">Cleanup files: </label></td><td><input id=dlgVideoDlClean type=checkbox checked="${ui.var.videoDlClean}" onclick="videoDl.cfg.cleanup=this.checked" title="Delete files used to biuld .mkv file"></td></tr>
	</table>
	<div id=dlgVideoDlList class="divBulkOptions"></div>`

	buttons = {
		default:'Download',
		Download: function(dlg, btn){
			videoDl.downloadBegin()
		},
		Minimize: function(dlg, btn){
			//minimize window
			renderer.winMinize()
		}
	}

	dlgVideoDl = 	dlgFactory.create({
		attrib:{ className:'dlgBulk', style:{minWidth:'16em', zIndex:1600}},
		body:html,
		buttons:buttons,
		canDestroy:true,
		focusId: '#btn0',
		rollup:true,	
		title:'Video Download',
		onClose:function(dlg,force){
			dlgVideoDl = null
		}
	})
	dlgVideoDl.dlg.minimized = false

	dlgVideoDl.querySelector('#btnClose').style.marginRight = '3em'
	dlgVideoDl.querySelector('#btn0').style.visibility = 'hidden'
	dlgVideoDl.querySelector('#btn1').title = 'Minimize the application'
	if(options.getInfo == true)
		videoDl.getInfo()	
}

videoDl.getInfo = async function(callback){
	const ytdl = require('ytdl-core');
	const formats = require('../node_modules/ytdl-core/lib/formats.js')

	this.dl_formats = {audio:[], video:[], both:[]}
	let dl_formats = this.dl_formats

	dlgVideoDl.querySelector('#dlgVideoDlList').innerHTML = ''
	dlgVideoDl.querySelector('#btn0').style.visibility = 'hidden'

	let url = dlgVideoDl.querySelector('#dlgVideoDlUrl').value
	videoDl.cfg.url = url
	dlgFactory.bbl('Loading formats for: '+url)
	try{  // promise.catch fails to capture errors
		ytdl.getInfo( url )
		.then(info => { //, {}, function(err, info){
			videoDl.cfg.titleO = info.player_response.videoDetails.title		//store original file name
			videoDl.cfg.title = info.player_response.videoDetails.title		//user may change this file name

			//compile list of available forms
			for(format of info.formats){
				let itag = formats[format.itag],
						size = (format.contentLength ?ui.calc.bytesToStr(format.contentLength) :'?')

				if(itag == null){
					continue
				}
				itag = Object.assign({itag: format.itag, container:format.container, size:size }, itag)
				if(itag.audioBitrate === null){
					dl_formats.video.push( itag )
					continue
				} else
				if(itag.qualityLabel === null){
					dl_formats.audio.push( itag )
					continue
				}
				else{
					dl_formats.both.push( itag )
				}
			}
			videoDl.sortFormats(dl_formats)

			let lastfnd, defaultItags, html

			defaultItags = dlgVideoDl.querySelector('#dlgVideoDlItags').value.trim().split(',')
			for(let ii in defaultItags) {
				defaultItags[ii] = parseInt( defaultItags[ii].trim(), 10)
			}

			function getChecked(format, atype){
				if(lastfnd >= defaultItags.length) return ''

				let ii = defaultItags.indexOf(format.itag)
				if(ii < 0) return ''

				if(lastfnd >= 0 && lastfnd <= ii) return ''

				lastfnd = ii
				videoDl.setItag(null, format.itag, atype)
				return 'checked'
			}

			//html = `Video Title: &nbsp; <span style="color:#fff; font-weight:normal;">${videoDl.cfg.title}</span><br>
			html = `Video Title: &nbsp; <input type=text id=vidTitle style="font-weight:normal; width:81%; " value="${videoDl.cfg.titleO}"><br>
			URL: &nbsp; <span style="color:#fff; font-weight:normal; display:inline-table; max-width:20em; overflow-wrap:break-word; ">${url}</span><br><br>`

			html += `Available audio and video formats (sorted by video resolution):
			<table id=tbVideoAudio><tr><td>
				<button onclick="videoDl.clearItags('tbVideoAudio')" title="Deselect all itags" class=dlgButton>Clear</button>
			</td><td> itag </td><td> mimeType </td><td> quality </td><td> bitrate </td><td> size </td></tr>`

			lastfnd = -1
			for(format of dl_formats.both){
				let checked = getChecked(format, 'video')
				html += `<tr onclick="videoDl.setItag(this, '${format.itag}', 'video')">
					<td class=tdCenter>
						<input ${checked} type=radio name=rbVideo id="cbItag${format.itag}">
					</td><td class=tdRight>${format.itag}</td><td>&nbsp; ${format.mimeType} </td><td class=tdRight> ${format.qualityLabel} </td><td class=tdRight> ${format.audioBitrate} </td><td class=tdRight> &nbsp; ${format.size} </td>
				</tr>`
			}

			html += `</table><br>Available video only formats (sorted by video resolution):
				<table id=tbVideoOnly><tr><td>
					<button onclick="videoDl.clearItags('tbVideoOnly')" title="Deselect all itags" class=dlgButton>Clear</button>
				</td><td> itag </td><td> mimeType </td><td> quality </td><td> size </td></tr>`

			//lastfnd = -1
			for(format of dl_formats.video){
				let checked = getChecked(format, 'video')
				html += `<tr onclick="videoDl.setItag(this, '${format.itag}', 'video')">
					<td class=tdCenter>
						<input ${checked} type=radio name=rbVideo id="cbItag${format.itag}">
					</td><td class=tdRight>${format.itag}</td><td>&nbsp; ${format.mimeType} </td><td class=tdRight> ${format.qualityLabel} </td><td class=tdRight> &nbsp; ${format.size} </td>
				</tr>`
			}

			lastfnd = -1
			html += `</table><br>Available audio only formats (sorted by audio bitrate):
				<table id=tbAudioOnly><tr><td>
					<button onclick="videoDl.clearItags('tbAudioOnly')" title="Deselect all itags" class=dlgButton>Clear</button>
				</td><td> itag </td><td> mimetype </td><td> bitrate </td><td> size </td></tr>`

			for(format of dl_formats.audio){
				let checked = getChecked(format, 'audio')
				html += `<tr onclick="videoDl.setItag(this, '${format.itag}', 'audio')">
					<td class=tdCenter>
						<input ${checked} type=radio name=rbAudioOnly id="cbItag${format.itag}">
					</td><td class=tdRight>${format.itag}</td><td>&nbsp; ${format.mimeType} </td><td class=tdRight> ${format.audioBitrate} </td><td class=tdRight> &nbsp; ${format.size} </td>
				</tr>`
			}
			html += `</table>`

			dlgVideoDl.querySelector('#dlgVideoDlList').innerHTML = html
			dlgVideoDl.querySelector('#btn0').style.visibility = 'visible'

			if(callback != null)
				callback()
		})
	}
	catch( err ) {
		console.log(`ytdl.getInfo() error with [${url}]:`, err)
		alert( err )
	}
}
videoDl.sortFormats = function (list){
	list.audio.sort(function(a, b) {
		let aa = a.audioBitrate
		let bb = b.audioBitrate
	  if (aa > bb) return 1
	  if (aa < bb) return -1

		aa = a.mimeType
		bb = b.mimeType
	  if (aa > bb) return 1
	  if (aa < bb) return -1

	  return 0
	})
	list.both.sort(function(a, b) {
		let aa = parseInt(a.qualityLabel, 10)
		let bb = parseInt(b.qualityLabel, 10)
	  if (aa > bb) return 1
	  if (aa < bb) return -1

		aa = a.mimeType
		bb = b.mimeType
	  if (aa > bb) return 1
	  if (aa < bb) return -1

	  return 0
	})
	list.video.sort(function(a, b) {
		let aa = parseInt(a.qualityLabel, 10)
		let bb = parseInt(b.qualityLabel, 10)
	  if (aa > bb) return 1
	  if (aa < bb) return -1

		aa = a.mimeType
		bb = b.mimeType
	  if (aa > bb) return 1
	  if (aa < bb) return -1

	  return 0
	})
}
videoDl.clearItags = function(tbid){
	let cfg = videoDl.cfg,
			cblist = dlgVideoDl.querySelectorAll('#'+tbid+' input[type="radio"]')
	cblist.forEach( cb => {
		cb.checked = false
		cb.removeAttribute('checked')
	})
	if(tbid == 'tbAudioOnly'){
		cfg.aitag = null		//audio itag
		cfg.acn = null			//aduio container
		cfg.abr = null			//audioBitrate
		cfg.afn = null				//audio filename
		cfg.adlDone = null
	}
	else{
		cfg.vitag = null		//video itag
		cfg.vcn = null			//video container
		cfg.res = null			//video resolution
		cfg.vfn = null			//video filename
		cfg.vabr = null		//video audioBitrate
		cfg.vdlDone = null
	}
}
videoDl.setItag = function(tr, itag, atype){
	let cfg = videoDl.cfg,
			format = videoDl.findFormat(itag, atype)

	if(format == null){
	  console.log(`format not found:`, itag, format)
	  return
	}

	if(atype == 'video'){
		cfg.vitag = itag
		cfg.vcn = format.container
		//cfg.vcn = format.mimeType
		cfg.res = format.qualityLabel
		cfg.vabr= format.audioBitrate
		cfg.vfn = videoDl.videoFn()
		if(tr != null)
			tr.children[0].children[0].checked=true
		if(tr != null		//user clicked tr
		&& cfg.vabr != null && cfg.afn != null)		//video has audio, disable audio download
			videoDl.clearItags('tbAudioOnly')
	  //console.log(`cfg.vitag = ${itag}: ${cfg.res} - ${cfg.vcn}`);
	}
	else
	if(atype == 'audio'){
		cfg.aitag = itag
		cfg.acn = format.container
//		cfg.acn = format.mimeType
		cfg.abr = format.audioBitrate
		cfg.afn = videoDl.audioFn()
		if(tr != null)
			tr.children[0].children[0].checked=true
	  //console.log(`cfg.aitag = ${itag}: ${cfg.abr} - ${cfg.acn}`);
	}
	else{
	  console.log(`Unrecognized itag type:`, itag, format);
	}
}
videoDl.findFormat = function(itag, atype){
	//assume: atype == video || audio
	//assue atype == video: search dl_formats.both
	//
	let dl_formats = this.dl_formats
	let format = null

	if(atype == 'video'){
		format = dl_formats.both.find( format => {
			return (format.itag == itag)
		})
		if(format == null){
			format = dl_formats.video.find( format => {
				return (format.itag == itag)
			})
		}
	}
	if(format == null && atype == 'audio'){
		format = dl_formats.audio.find( format => {
			return (format.itag == itag)
		})
	}
	return format
}

videoDl.videoFn = function(){
	const sanitize = require("sanitize-filename");

	let cfg = videoDl.cfg,
			dir = ui.calc.pathForOS( dlgVideoDl.querySelector('#dlgVideoDlDest').value )

	if(cfg.vabr == null)		//video only
		return dir +(sanitize(`${cfg.title} - ${cfg.res} - ${cfg.vitag}.${cfg.vcn}`)).replace(/#/g, '')		//Chrome doesn't like looking for filenames with #
	else
		return dir +(sanitize(`${cfg.title} - ${cfg.res}.${cfg.vcn}`)).replace(/#/g, '_')
}
videoDl.audioFn = function(){
	const sanitize = require("sanitize-filename");

	let cfg = videoDl.cfg,
			dir = ui.calc.pathForOS( dlgVideoDl.querySelector('#dlgVideoDlDest').value )

	return dir +(sanitize(`${cfg.title} - ${cfg.abr} - ${cfg.aitag}.${cfg.acn}`)).replace(/#/g, '')		//Chrome doesn't like looking for filenames with #
}
videoDl.fn = function(){
	const sanitize = require("sanitize-filename");

	let cfg = videoDl.cfg,
			dir = ui.calc.pathForOS( dlgVideoDl.querySelector('#dlgVideoDlDest').value )

	return dir +(sanitize(`${cfg.title} - ${cfg.res}.mkv`)).replace(/#/g, '')		//Chrome doesn't like looking for filenames with #
}

videoDl.destFolderGet = function(){
		var bar = new pathBar()
		bar.show({
			library:renderer.libraries()
		,	recent:renderer.recent
		, returnType:'folder'
		, title:'Select Destination Folder'
		,	onSelect: function(dir){
				if(dir.toLowerCase()==ui.args.path.toLowerCase()){
					alert('Error, destination is the same as source folder.')
					return
				}
				dlgVideoDl.querySelector('#dlgVideoDlDest').value = dir
			}
		})
}
videoDl.pasteUrl = function(){
	let url = renderer.clipboardRead()
	dlgVideoDl.querySelector('#dlgVideoDlUrl').value = url

	videoDl.getInfo()
}
videoDl.pasteUrlAndExec = function(){
	let url = renderer.clipboardRead()
	dlgVideoDl.querySelector('#dlgVideoDlUrl').value = url

	videoDl.getInfo( function(){
		videoDl.downloadBegin()
	})
}

videoDl.downloadBegin = function(){

	if(videoDl.cfg.vfn == null && videoDl.cfg.afn == null){
		alert('Nothing to download for:\n'+videoDl.cfg.url)
		return
	}

	//handle custom video titles
	let vidTitle =	document.querySelector('#vidTitle')
	if(vidTitle != null && vidTitle.value != '') {
		videoDl.cfg.title = vidTitle.value
		// console.log('title', videoDl.cfg.title)
	}

	let cfg = Object.assign({}, videoDl.cfg)
	if(cfg.vfn != null && cfg.afn != null){
	  cfg.fn = videoDl.fn()
	}
 	cfg.dir = dlgVideoDl.querySelector('#dlgVideoDlDest').value
	cfg.startms = Date.now()

	console.log('videoDl cfg:', cfg )

	//que downloads
	if(cfg.vfn != null){
		cfg.vfn = videoDl.videoFn()			//dest may have changed
		execQue.que({
			cmdType: 'immediate',
			msg: `Download: ${cfg.vfn}`,
			pid: cfg.vitag,
			cbBeforeExec:function(job){
				cfg.vctrl = job.ctrl
			},
			command: function(job, callback){
				videoDl.dl(cfg, cfg.vitag, cfg.vfn, cfg.vctrl, callback)
			},
			cbAfterExec:function(job){
				//cfg = job.args[0]
				videoDl.videoCallback(cfg)
			}
		})
	}
	if(cfg.afn != null){
		cfg.afn = videoDl.audioFn()			//dest may have changed
		execQue.que({
			cmdType: 'immediate',
			msg: `Download: ${cfg.afn}`,
			pid: cfg.aitag,
			cbBeforeExec:function(job){
				cfg.actrl = job.ctrl
			},
			command: function(job, callback){
				videoDl.dl(cfg, cfg.aitag, cfg.afn, cfg.actrl, callback)
			},
			cbAfterExec:function(job){
				//cfg = job.args[0]
				videoDl.audioCallback(cfg)
			}
		})
	}
}
videoDl.dl = function(cfg, itag, fn, ctrl, callback){
	const fs = require('fs');
	const path = require('path')
	const ytdl = require('ytdl-core');

	let lastpcent = -1,
			url = cfg.url,
			start = Date.now(),
			bn = path.basename(fn)

	ytdl(url, { quality:itag })
	.on('error', err => {
		console.log(`ytdl Error with [${cfg.msg}]:`, err)
		alert( err )
	  if(callback != null)
	  	callback(cfg, itag, fn)
	} )
	.on('progress',function(len, bytes, totalbytes){
		let pcent = Math.round( (bytes /totalbytes) *100)
		if(lastpcent == pcent) return
		lastpcent = pcent
		//if(pcent %10 != 0) return
		if(ctrl != null)
			ctrl.innerHTML = `${bn}: ${pcent}%`
		else
			console.log(` - ${bn}: ${pcent}%`)
	})
	.on('end', () => {
		console.log(` - ${bn} - ${ui.calc.msecToStr(Date.now() - start)}`);
	  if(callback != null)
	  	callback(cfg, itag, fn)
	})
	.pipe( fs.createWriteStream(fn) )

}

videoDl.videoCallback = function(cfg){
	cfg.vdlDone = true

	if(cfg.afn == null){			//nothing else to do
  		console.log(`Video file completed: ${cfg.vfn}`)
		videoDl.downloadEnd(cfg)
		return
	}

	if(cfg.adlDone === true)
		videoDl.mkvBuild(cfg)
}
videoDl.audioCallback = function(cfg){
	cfg.adlDone = true

	if(cfg.fn == null){
  		console.log(`Audio file completed: ${cfg.afn}`)
		videoDl.downloadEnd(cfg)
		return
	}

	if(cfg.vdlDone === true)
		videoDl.mkvBuild(cfg)
}

videoDl.mkvBuild = function(cfg){			//call ffmpeg to make mp4 file
 	let cmd = `"${renderer.dirName}\\bin\\ffmpeg.exe" -i "${cfg.vfn}" -i "${cfg.afn}" -c:v copy -c:a copy -loglevel error -y "${cfg.fn}"`
 	console.log(' - creating:', cfg.fn)
  const { exec } = require('child_process')
  exec(cmd, (error, stdout, stderr) => {
	  if (error) {
	    console.error(`  exec error: ${error}`)
			videoDl.downloadEnd(cfg)
	  }else
	  if(stdout == ''){
	  	console.log(' - .mkv file created!')
	  	videoDl.cleanupFiles(cfg)
	  }
	  else{
		  console.log(`stdout: ${stdout}`)
	  	console.log(`stderr: ${stderr}`)
			videoDl.downloadEnd(cfg)
		}
	})
}
videoDl.cleanupFiles = function(cfg){

	if(cfg.cleanup == true){
		console.log(' - Cleanup')
		const fs = require('fs');
 		if(cfg.vfn != null)
 			fs.unlinkSync(cfg.vfn)
 		if(cfg.afn != null)
 			fs.unlinkSync(cfg.afn)
	}
	else{
		console.log(' - No cleanup')
	}
	videoDl.downloadEnd(cfg)
}
videoDl.downloadEnd = function(cfg){
  console.log(`"${cfg.title}" done. - ${ui.calc.msecToStr(Date.now() - cfg.startms)}\n`);
  if(cfg.explorer === true){
	  const { exec } = require('child_process');
	  let cmd = 'explorer .'
	  ui.calc.exec(cmd)
  }
 	//let dir = dlgVideoDl.querySelector('#dlgVideoDlDest').value
  if(ui.args.path == cfg.dir){
  	renderer.folderLoad(ui.args.path)
		let fn, itm
		if(cfg.fn != null)
		 fn = cfg.fn
		else
		if(cfg.vfn != null)
		 fn = cfg.vfn
		else
		 fn = cfg.afn
  	itm = itemPathFind(fn)
  	if(itm != null)
  		itemSelect(itm.pid, true)
  }
	dlgFactory.bbl(`Download complete:<br>${cfg.title}`)
}
