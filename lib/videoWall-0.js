/*
	VideoWall
	- video wall dialog for FolderView

	usage:
		videoWall.toggle()

	requires:
		CDialog.js
		ui.js
		renderer.js

*/
"use strict"

var dlgVideoWall = null

var videoWall = {
	
	extFilter: { '.mp4':1 , '.mpg':1, '.mkv':1, '.ogg':1, '.webm':1 },
	layout:null,		//ToDo...
	cnt:0,

	lastLayoutMode:null,		//to reset ui.layout
	winwidth:null, 
	winheight:null,

	gridCols:4, 		//for grid layout
	gridRows:3,
	gridExclude:[],

	viewAll:true,
	playAll:true,

	vlist:null,		//video list
	cur:null,			//video element playing
	minPlaytime:0,	//<<wile debuging 15,		//minimum video playtime in seconds, 0 = ignore

	swap:{
		phase:1,	//1 phase = all videos elements replaced
		cnt:0,		//number of videos swapped in current
		lastVidx:null,	//last vidx swapped itm = items[vidx]
		incPhase: () => {
			videoWall.swap.phase++
			videoWall.swap.cnt = 0
		},
		incCnt: () => {
			if(videoWall.swap.cnt >= videoWall.videoCount)
				videoWall.swap.incPhase()
			videoWall.swap.cnt++
		},
		itmNext: function(){
			let result = null,
					phase = videoWall.swap.phase

			for(let ii =0; ii < items.length; ii++){
				// let itm = items[ii]
				let itm = videoWall.itmByPid(ii)
				if(itm === null)
					throw "videoWall.swap.itmNext() error, itmByPid() returned null for ["+pid+"]."
				if(itm.swapPhase < phase){
					result = itm
					break
				}
			}

			return result
		}
	},
	_state:null,	//init, play, pause
	state: function( newstate = null){
		if(newstate === null){
			return videoWall._state
		}
		videoWall._state = newstate
		this.stateApply()
	},
	stateApply: function(){
			//cleanup after changing state
		let btn = null 
		switch(videoWall._state){
			case 'init': 
				this.gridLoad()
				if(dlgVideoWall == null){
					videoWall.drawDlg()
				}
				btn = dlgVideoWall.querySelector('#btnPlay')
				btn.innerText = 'Play'
				break;
			case 'pause': 
				btn = dlgVideoWall.querySelector('#btnPlay')
				btn.innerText = 'Play'

				//grid.pause:
				//pause videos
				if( videoWall.vlist != null){
					videoWall.vlist.forEach( function(video, idx){
						video.dlg.pause()
					})
				}

				videoWall.videoNext()
				break;
			case 'play': 
				btn = dlgVideoWall.querySelector('#btnPlay')	
				btn.innerText = 'Pause'

				//grid.play:
				//handle current video selection
				let cnt = null, 
						video = videoWall.cur
				if(video === null)
					cnt = 1
				else {
					//video.dlg.deselect()
					cnt = Number(video.dataset.cnt)
					cnt++
					if(cnt > videoWall.vlist.length)
						cnt= 1
				}
				cnt = String(cnt)

				//verify videos playing
				if(videoWall.vlist != null ){
					videoWall.vlist.forEach( async function(video2, idx){
						if(cnt == video2.dataset.cnt)
							await video2.dlg.select( true )
						else
						if(video2.dlg.playing != true)
							await video2.dlg.deselect()
					})			
				}
				
				videoWall.videoNext()
				break;
		}
	},
	btnPlayClick: function(){
		let newstate = null
		if( videoWall.cur != null ){
			videoWall.cur.dlg.deselect()
		}

		if(videoWall.state() !== 'play') {
			newstate = 'play'
		}
		else {	//pause
			newstate = 'pause'
		}		
		videoWall.state(newstate)
	},
	videoNext: function(){		//eventually select from different plugins
		videoWall.gridPluginNextVideo()
	},
	windowResize: function(){
		videoWall.gridResize()
	},
	reset: function(){
		window.removeEventListener('resize', videoWall.windowResize)
		videotube.close()
		grid.onclick = gridClick
		dlgFactory.bbl(`Loading last layout: ${videoWall.lastLayoutMode}`)
		renderer.fullscreen( false )
		gridLoad(videoWall.lastLayoutMode)
		videoWall.vlist = null
		videoWall._state = null
		videoWall.cur = null
		videoWall.width = null
		videoWall.height = null
	},
	cbViewAllClicked: function( cb ){
		let tb = dlgVideoWall.querySelector('#tbVidList')
		tb.style.display = (cb.checked ?'none' :'block')
	},
	cbToggleAllClick: function( cb ){
		let list = dlgVideoWall.querySelectorAll('#tbodyItems input[type=checkbox')
		let checked = cb.checked
		console.log('list', checked)
		list.forEach( input => {
			input.checked = checked
			videoWall.cbVidClicked( input )
		})
	},
	checkboxSelect: function(pid){
		let id = 'cbVid'+pid,
				ctrl = dlgVideoWall.querySelector('#tbodyItems #'+id)
				ctrl.checked = !ctrl.checked
		videoWall.cbVidClicked(ctrl)
	},
	cbVidClicked: function(cb){
		
		let vidx = cb.dataset.vidx,
				//pid = cb.dataset.pid,
				idx = videoWall.gridExclude.indexOf(vidx)

		if(cb.checked === true){		//remove from excludes
			if(idx >= 0)		
				videoWall.gridExclude.splice(idx, 1)
		}
		else{		//add
			if(idx < 0)		
				videoWall.gridExclude.push(id)
		}
		//console.log('changed', cb.id, cb.checked, id, videoWall.gridExclude)
	},
	btnApplyClick: function(){
		// videoWall.viewAll = dlgVideoWall.querySelector('#cbViewAll').checked
		videoWall.playAll = dlgVideoWall.querySelector('#cbPalyAll').checked
		videoWall.minPlaytime = Number( dlgVideoWall.querySelector('#minPlayTime').value )

		videoWall.winwidth = null	//force reload of html
		//videoWall.gridLoad()
		//if(dlgVideoWall != null){
			videoWall.state('init')
		//}
	},
	vlistGen: function(){
		videoWall.vlist = grid.querySelectorAll('video[class*="videoWall"]')
	},
	itmByPid: function(pid){
		//required: when shuffling videos, pid's do not align to items[idx]
		let itm = null
		for(let ii = 0; ii < items.length; ii++){
			if(items[ii].pid == pid){
				itm = items[ii]
				//console.log('itmByPid ii===pid, vidx', ii, pid, itm.vidx, itm.basename)
				break
			}
		}
		return itm
	},
	itmByVidx: function(vidx){
		//required: when shuffling videos, pid's do not align to items[idx]
		let itm = null
		for(let ii = 0; ii < items.length; ii++){
			if(items[ii].vidx == vidx){
				itm = items[ii]
				break
			}
		}
		return itm
	}
}
videoWall.toggle = function( ){

	if(this.state() != null){	//videoWall is current layout:
		if(dlgVideoWall == null)	//toggle dlg
			videoWall.drawDlg()
		else
			dlgVideoWall.close()
		return
	}

	//init videoWall 
	let vidx = 1
	items.forEach( (val, idx) => {
		items[idx].vidx = vidx++
		items[idx].swapPhase = 0
	})
	grid.onclick = null
	if(lastLayoutMode != 'videoWall')
		videoWall.lastLayoutMode = lastLayoutMode
	lastLayoutMode = 'videoWall'
	videoWall.state('init')
	window.addEventListener('resize', videoWall.windowResize)
}
videoWall.drawDlg = function(){

	let extFilter = videoWall.extFilter,
			tbhtml = `<div id=toolbar>
				<div class=toolCtrls>
					<label><input id=cbViewAll type=checkbox ${videoWall.viewAll===true ?'checked' :''} onclick=videoWall.cbViewAllClicked(this)> Include all in playlist</label> &nbsp;&nbsp;
					<label title='After a video finishes replace it with one not displayed'><input id=cbPalyAll type=checkbox ${videoWall.playAll===true ?'checked' :''}> Play hidden</label> &nbsp;&nbsp;
					<label title='Play videos for at least this many seconds'>Min play time <input id=minPlayTime type=number value="${videoWall.minPlaytime}" style='width:3em'></label> &nbsp;&nbsp;
				</div>
				<div class=toolCtrls>
					<span> Grid: &nbsp; </span>
					<label>Colums <input id=edCols onchange='videoWall.gridCols = Number(this.value)'  type=number value="${videoWall.gridCols}" style=''></label> &nbsp;&nbsp;
					<label>Rows <input id=edRows onchange='videoWall.gridRows = Number(this.value)' type=number value="${videoWall.gridRows}" style=''></label> &nbsp;&nbsp;
				</div>
				<div class=toolCtrls>
					<span> Order: &nbsp; </span>
					<select id=selOrder onchange='ui.args.order = this.options[this.selectedIndex].text' title='Change order of videos'> 
						<option default>name</option>
						<option>date</option>
						<option>size</option>
					</select> &nbsp;&nbsp;
					<label title='Sort descending'><input id=cbDescending ${ui.args.descending===true ?'checked' :''}  onclick='(ui.args.descending = this.checked)' type=checkbox> Descending</label> &nbsp;&nbsp;
					<label title='Randomize videos, overrides other Order settings'><input id=cbShuffle ${ui.args.shuffle===true ?'checked' :''}  onclick='(ui.args.shuffle = this.checked)' type=checkbox> Shuffle</label>
				</div>
			</div>
			<table id=tbVidList style="border-collapse:collapse; border-spacing:0; display:${videoWall.viewAll===true ?'none' :'block'}; margin:1em 0 0 0; table-layout:fixed; ">
				<tbody id=tbodyHeader style='display:block; width:35em;'><tr style='color:var(--dlgColorHiLight); text-align:left;'>
					<td style='width:3em'>&nbsp;</td>
					<td style='width:3em'><input type=checkbox checked title='Toggle select all videos' onclick='videoWall.cbToggleAllClick(this)'></td>
					<td id=tdName style='width:50em'>Name</td>
				</tr></tbody>
				<tbody id=tbodyItems style="display:block; overflow:auto; max-height:35em; width:35em;">`
				
	let cnt = 0
	itemsSort('name', false)
	items.map( (itm, idx, arr) => {
		if(extFilter[itm.type] !== 1 ) return
		tbhtml += `<tr id="trVid${itm.vidx}">
			<td style='width:3em'>${itm.vidx}</td>
			<td style='width:3em'><input id="cbVid${itm.vidx}" checked data-vid=${itm.vidx} data-pid=${itm.pid} onchange='videoWall.cbVidClicked(this)' type=checkbox title='Select to include video in playlist'></td>
			<td onclick='videoWall.checkboxSelect(${itm.vidx})' style='cursor:pointer; width:50em; '>${itm.basename}</td>
		</tr>`
	})
	tbhtml += '</tbody></table>'

	let html = `<style>
		:root{
			--dlgBgColor:#303050;
			--dlgColor:#ddd;
			--dlgColorHiLight:#dfa612;
		}
		#dlgVideoWall #toolbar {margin:0 0 0 1em; text-align:left; }
		#dlgVideoWall #toolbar input[type=number] { border:none; font-size:1em; text-align:right; width:2em; }
		#dlgVideoWall #toolbar label { cursor:pointer; }
		#dlgVideoWall #toolbar .toolCtrls { margin:0 0 0.5em 0; }
		#dlgVideoWall #toolbar .toolCtrls span { color:var(--dlgColorHiLight); }
		dialog {
			background-color:var(--dlgBgColor);
			border:none; border-radius:5px;
			box-shadow:    0px 0px 60px rgba(0,0,0,0.1), 0 0 60px rgba(0,0,0,0.7);
			color:var(--dlgColor);
			font-family:Geneva, Verdana, sans-serif;
			font-size:14px;
			top:20em;
			width:300px;
			z-index:1100;
		}
		#tbVidList{ text-align:left; font-weight:normal; }
		dialog + .backdrop {
			background: linear-gradient(45deg, rgba(0,143,104,.5), rgba(250,224,66,6));
		}
		dialog #dlgHeader{ color:var(--dlgColorHiLight); padding-bottom:0.5em; }
		dialog #dlgFooter{ text-align:right; padding:0.5em 0 0 0; }
		dialog #dlgFooterText{ color:var(--dlgColorHiLight);  font-size:0.8em; margin-top: 5px; }
		dialog button{
			background: linear-gradient(to bottom, var(--dlgBgColor), #000);
			border:0;  border-radius:10px; box-shadow:3px 4px 15px rgba(0,0,0,0.6);
			cursor:pointer;	color:var(--dlgColorHiLight);  letter-spacing:1px; font-size:0.8em;
			outline:none; padding:0.5em 1em;	width:7em;
		}
		dialog button:active{ color:#7e7; box-shadow:none; }
		#dlgVideoWall{
			background: white repeat url('../resources/e8465fca2a3e8f3388b6373e486cfad5.jpg');
			background-size:cover;
			border: #daa52073 1px outset;
			box-shadow: 0px 0px 60px rgba(0,0,0,0.1), 0 0 15px rgba(0,0,0,0.5);
			font-size:12px; 
			min-width:36em;
		}
	</style>
	${tbhtml}
	`

	dlgVideoWall = 	new CDialog({
		buttons:{
			default:'btnPlay',
			btnApply:{
				caption:'Apply',
				title:'Apply settings to grid',
				onClick:  function(dlg, btn){
					videoWall.btnApplyClick()
				}
			},
			btnPlay:{
				caption:'Play',
				title:'Play Videos',
				onClick: function(dlg, btn){
					videoWall.btnPlayClick()
				}
			},
			btnReset:{
				caption:'Reset',
				title:'Return to last layout',
				onClick: function(dlg, btn){
					videoWall.reset()
					//
					dlgVideoWall.querySelector('#btnPlay').innerText = 'Play'
				}
			},
		},
		className:'dlgVideoWall', 
		focusid:'btnPlay',
		header:'<b>Testing: Video Wall Settings</b>',
		html:html,
		id:'dlgVideoWall',
		onClose:function(dlg,force){
			//only destroy dlg, leave videoWall state
			dlgVideoWall = null
		}
	})

	let btn = dlgVideoWall.querySelector('#btnClose')
	btn.style.marginRight = '1em'

	this.stateApply()
	dlgVideoWall.dlg.minimized = false
	dlgVideoWall.dlg.show()
}

videoWall.gridLoad = function(extFilter = null){

	renderer.fullscreen( true )
	videotube.hide()

	if(isotope!==null){
		ui.reset()
		//videoWall.reset()
	}

	if(items.length===0){
		console.log('videoWall.gridLoad(), no data to layout. Exiting.', items)
		return
	}

	if(videoWall.winwidth == null || videoWall.winheight == null){	//setup grid
	
		if(ui.args.shuffle==true){
			console.log('Shuffling videos items...', items[0].basename)
			items = arrShuffle( items )
			console.log('Shuffling videos items:', items[0].basename)
		} else
		if(ui.args.order!==undefined && ui.args.order!==''){
			itemsSort(ui.args.order, ui.args.descending)
		}
		gExtFilter = videoWall.extFilter
		videoWall.gridHTML( videoWall.extFilter )
	}
	else{	//resize only if window dimensions change
		// if(videoWall.winwidth != window.innerWidth	|| videoWall.winheight != window.innerHeight)	
			videoWall.gridResize()
	}

	if(videoWall.vlist == null){
		dlgFactory.bbl(`0 videos`)
		return
	}
	let cnt = videoWall.vlist.length
	if(cnt===items.length)
		dlgFactory.bbl(`${cnt} videos`)
	else
		dlgFactory.bbl(`${cnt}/${items.length} video items found`)
}

videoWall.gridResize = function( ){
	videoWall.winwidth = window.innerWidth
	videoWall.winheight = window.innerHeight

	if(videoWall.vlist === null) {
		console.log('default 1', videoWall.vlist)
		return
	}

	videotube.hide()

	let wd = Math.floor(videoWall.winwidth / videoWall.gridCols) -20,
			ht = Math.floor(videoWall.winheight / videoWall.gridRows) -7
	for(let ii = 0; ii < videoWall.vlist.length; ii++){
		let video = videoWall.vlist[ii]
		video.dataset.width = wd
		video.dataset.height = ht
		if(videoWall.cur != null && videoWall.cur.id == video.id)
			video.dlg.selectCss()
		else 
			video.dlg.deselectCss()
	}

	// if( videoWall.cur != null )
	// 	videotube.show( videoWall.cur )
}
videoWall.gridHTML = function( extFilter ){
	
	videoWall.winwidth = window.innerWidth
	videoWall.winheight = window.innerHeight

	let cols = videoWall.gridCols,
		rows = videoWall.gridRows,
		maxitems = cols * rows,
		defaultwidth = Math.floor(videoWall.winwidth/cols),
		defaultheight= Math.floor(videoWall.winheight/rows),
		width=defaultwidth -20,
		height=defaultheight -7

	console.log('default width, height', defaultwidth, videoWall.winwidth, defaultheight, videoWall.winheight)
	
	let cnt=0, itm, html = ''
	for(var idx in items){	//create video controls
		items[idx].pid = idx	//reset in case of ui.args.shuffle=true
		// items[idx].vidx = unique id, previously assigned
		itm = items[idx]
		
		if(itm.isDeleted && itm.isDeleted===true) continue
		if(extFilter.ALL !== 1 && (extFilter[itm.type] !== 1 && extFilter[itm.mediaType] !== 1)) continue
		// if(videoWall.gridExclude.indexOf(itm.videowallid) >= 0) continue
	
		if(cnt < maxitems) {	//only 16 cells in this layout
			cnt++
			items[idx].swapPhase = 1
			items[idx].cnt = cnt

			//build childhtml:
			let onclick = ``,//itemClick(${itm.pid}, event)`,  onclick="${onclick}" 
					title		= itm.basename + ', ' +ui.calc.bytesToStr(itm.size)

			html += `<video controls muted=true preload='none' class='grid-item videoWall'
				id="vid${itm.vidx}" src="${itm.src}" type="video/${itm.type.substr(1)}"
				data-pid="${itm.pid}" data-vidx="${itm.vidx}" data-cnt="${cnt}" 
				data-width="${width}" data-height="${height}"
				style="width:${width}px; height:${height}px; object-fit:cover"
				title="${itm.vidx}. ${title}"		
			></video>`
		}
	}

	grid.innerHTML = html
	videoWall.vlistGen()
	videoWall.gridPluginDefaultLogic()
}
videoWall.gridPluginNextVideo = function(){

	videotube.hide()
	// if(videoWall.state() == 'pause'){	//pause videos
	// 	if( videoWall.vlist != null){
	// 		videoWall.vlist.forEach( function(video, idx){
	// 			video.dlg.pause()
	// 		})
	// 	}
	// 	return false
	// }

	if(['init','play'].indexOf( videoWall.state()) < 0){	
		console.error('videoWall.gridPluginNextVideo() error, unknown state found: ['+videoWall.state()+']')
		return false
	}

	// //handle current video selection
	// let cnt = null, 
	// 		video = videoWall.cur
	// if(video === null)
	// 	cnt = 1
	// else {
	// 	//video.dlg.deselect()
	// 	cnt = Number(video.dataset.cnt)
	// 	cnt++
	// 	if(cnt > videoWall.vlist.length)
	// 		cnt= 1
	// }
	// cnt = String(cnt)

	// //verify videos playing
	// //if(startPausedVideos === true && videoWall.vlist != null ){
	// if(videoWall.vlist != null ){
	// 	videoWall.vlist.forEach( async function(video2, idx){
	// 		if(cnt == video2.dataset.cnt)
	// 			await video2.dlg.select( true )
	// 		else
	// 		if(video2.dlg.playing != true)
	// 			await video2.dlg.deselect()
	// 	})			
	// }
	return true
}
videoWall.gridPluginDefaultLogic = function(){		//assign default logic to video elements
	// only one video unmuted at a time
	// play remaining videos muted
	// click video to toggle mute 
	videoWall.vlist.forEach( ( video ) => {
	
		video.addEventListener('click', function( event ) {	//select video
			if(event.currentTarget.id != video.id) return
			if(videoWall.cur != null && videoWall.cur.id != video.id){ //update last selected, if last selected != video
				let lastvid = videoWall.cur
				lastvid.dlg.deselect()
				lastvid.currentTime = videotube.div.currentTime
			}
			video.dlg.select( false )
			return ui.eventStop(event)
		})
		video.addEventListener('ended', async function( event ) {
			// if(videoWall.cur != null && videoWall.cur.id === video.id){	//selected video
			// // if(video.muted === false){	//selected video
			// 	if(videoWall.minPlaytime > 0){	//allow for min playing time
			// 		video.dlg.elapseTime += (Date.now() -video.dlg.startTime)
			// 		let tt = video.dlg.elapseTime / 1000
			// 		if(tt < videoWall.minPlaytime){
			// 			video.dlg.select()
			// 			return
			// 		}
			// 	}
			// 	if( videoWall.gridPluginNextVideo()	=== true){	//play video's audio 
			// 		video.dlg.deselect()
			// 		video.dlg.canSwap = true	//play once more before swapping
			// 	}
			// }
			// else{	//regular video
				if(videoWall.minPlaytime > 0){	//allow for min playing time
					video.dlg.elapseTime += (Date.now() -video.dlg.startTime)
					let tt = video.dlg.elapseTime / 1000
					if(tt < videoWall.minPlaytime){
						video.dlg.select()
					}
				} else
				if(video.dlg.canSwap === true){
					let ii = await video.dlg.swap()
					console.log('video.dlg.swap() result', ii )
					video.dlg.canSwap = false	//play once more before swapping
				}
				else{
					video.dlg.deselect()
				}
			// }
		})
		
		video.dlg = {
			playing:false,
			startTime:0,
			elapseTime:0,
			canSwap:false,
			swapPhase:0,	//phase to swap in
			//pid:pid,
			//vid:vid,
			swap: async function(){
				console.log('video.dlg.swap():', video.dataset.pid, video.dataset.vidx)

				//assume: itm is of items
				if(video.dlg.canSwap !== true){
					return -1
				}
				let itm = videoWall.swap.itmNext()
				if(itm === null){
					return -2
				}
				if(itm.swapPhase >= videoWall.swap.phase){
					return -3		//verify not already swapped 
				}

				let oldtitle = video.title

				videoWall.swap.incCnt( itm )
				itm.swapPhase = videoWall.swap.phase
				video.dlg.swapPhase = videoWall.swap.phase
				
				video.dataset.pid = itm.pid
				video.dataset.vidx = itm.vidx

				video.id = 'vid'+itm.pid
				video.title = `${itm.vidx}. ${itm.basename}, ${ui.calc.bytesToStr(itm.size)}`
				video.type = `video/${itm.type.substr(1)}`
				video.src = itm.src

				console.log(`Swapped pid/vidx=${itm.pid}/${itm.vidx}, :\n`, video.title, '\n', oldtitle)
				video.dlg.deselect()
				videoWall.swap.incCnt()
				return videoWall.swap.phase
			},
			select: async function( reset = false){
				videoWall.cur = video
				// video.muted = false	
				video.muted = true
				if(reset == true){
					video.currentTime = 0
				}
				video.dlg.selectCss()
				video.dlg.startTime = Date.now()
				video.dlg.playing = true
				await video.play()
				//videotube.show(video)
			},
			deselect: async function(){
				video.dlg.elapseTime = 0
				video.muted = true
				video.dlg.deselectCss()
				video.dlg.playing = true
				await video.play()

				if(videoWall.cur != null	&& videoWall.cur.id === video.id){
					videoWall.cur = null
					//videotube.hide()
				}
			},
			pause: async function(){
				video.dlg.deselectCss()
				video.dlg.playing = false
				await video.pause()
			},
			selectCss: function(){
				video.style.outline = '1px solid pink'
				//video.style.objectFit = 'contain'
				video.style.backgroundColor = '#000'
			},
			deselectCss: function(){
				video.style.outline = 'none'
				//video.style.objectFit = 'cover'
				video.style.backgroundColor = 'transparent'
			}
		}
	})
	
}

//video player
var videotube = {
	
	div: null,	// HTML compenent
	lastCtrl:null,
	
	show: async function(ctrl){
		if(ctrl === undefined) throw `videotube.show() error, ctrl arg is missing`
		this.lastCtrl = ctrl

		if(this.div === null)
			this.divCreate()
	
		this.divPosition( ctrl )

		this.div.title = ctrl.title
		this.div.type = ctrl.type
		this.div.src = ctrl.src
		this.div.muted = false
		this.div.controls = true

		this.div.currentTime = ctrl.currentTime
		await this.div.play()
		this.lastCtrl.muted = true
		this.div.style.display = 'block'
	},
	close: async function(){
		if(this.div != null){
			await this.div.pause()
			document.body.removeChild(this.div)
			delete this.div
			this.div = null
		}
	},
	hide: async function( lastCtrlToo = true ){
		if(this.div == null) return

		this.div.style.display = 'none'
		this.div.muted = true
		await this.div.pause()
		if(lastCtrlToo === true){
			if(this.lastCtrl.dlg.playing){
				this.lastCtrl.currentTime = this.div.currentTime
				this.lastCtrl.muted = false	
			}
		}
	},

	divCreate: function(){
		this.div = document.createElement('video')
		this.div.id = 'videotube'
		this.div.className = 'videotube'
		this.div.style.display = 'none'
		this.div.preload = 'none' 

		document.body.appendChild(this.div)
		this.div.addEventListener('click', function(event){
			videotube.hide()
		})
		this.div.addEventListener('play', async function(event) {
			if(videotube.lastCtrl == null) return
			await videotube.lastCtrl.play()
		})
		this.div.addEventListener('pause', async function(event) {
			if(videotube.lastCtrl == null) return
			await videotube.lastCtrl.pause()
		})
		this.div.addEventListener('seeked', (event) => {
			if(videotube.lastCtrl == null) return
			videotube.lastCtrl.currentTime = videotube.div.currentTime
		})
	},
	divPosition: function( ctrl ){
		//rules:
		// position this.div over ctrl
		// increase size by 50%
		// overlap ctrl.x/y by 25%
		// account for screen edges by shifting away from edge
		let buf = 5,
			pos = ui.calc.xyAbs(ctrl),
			ow = Math.floor( ctrl.clientWidth /3),		//overflow width
			oh = Math.floor( ctrl.clientHeight /6),		//overflow height
			l = pos.left -ow,
			t = pos.top -oh,
			w = ctrl.clientWidth +(ow *2),
			h  = ctrl.clientHeight +(oh *2)

		if(l < 0) l=1; 
		if(t < 0) t=1; 
		if(l  +w +buf> videoWall.winwidth ) l= videoWall.winwidth -w -buf -15; 
		if(t  +h +buf> videoWall.winheight ) t= videoWall.winheight -h -buf; 
		
		this.div.style.left = l+'px'
		this.div.style.top = t+'px'
		this.div.style.width = w+'px'
		this.div.style.height = h+'px'

		//console.log(pos, l, t)
	}
}
