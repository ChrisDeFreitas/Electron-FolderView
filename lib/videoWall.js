/*
	VideoWall
	- video wall dialog for FolderView

	usage:
		videoWall.toggle()

	requires:
		CDialog.js
		ui.js
		renderer.js

	Rules:
	- ToDo:
	- wall composed of video tiles
	- context menu disabled
	- number of video tiles = videoWall.gridRows x videoWall.gridCols
	- video tiles.muted === true
	- tiles replay until videoWall.minPlaytime elapsed
	- click tile to open in player
	- only one player can be active
	- click player to hide
	- ESC key to toggle dlg and player

	ToDo:
	- add hover dlg to player with functions: prior, zoom, size
	- not possible because of file locking: integrate into existing file management routines
	- not filtering itms in dlg because it it overkill at this point

*/
"use strict"

var dlgVideoWall = null

var videoWall = {

	minPlaytime:30,			//minimum video playtime in seconds, 0 = ignore
	gridCols:3, 		//for grid layout
	gridRows:3,

	extFilter: { '.mp4':1 , '.mpg':1, '.mkv':1, '.ogg':1, '.webm':1 },
	lastFilter: {},
	lastLayoutMode:null,		//to reset ui.layout
	winwidth:null,
	winheight:null,

	tiles:[],		//tile list
	cur:null,			//current video tile associated with player

	//not implemented
	// gridExclude:[],
	viewAll:true,
	playAll:true,

	que:{
		nextIdx:0,
		list:[],			//not playing que
		add: function( uid ){
			let ii = this.list.indexOf( uid )
			if( ii >= 0){			//remove existing from list
				this.list.splice(ii, 1)
			}
			this.list.push( uid )
		},
		clear: function(){
			this.nextIdx = 0
			this.list = []
		},
		count: function(){
			return this.list.length
		},
		next: function(){
			if( this.nextIdx >= this.list.length)
				this.nextIdx = 0
			let uidnext = this.list[ this.nextIdx++ ]
			return videoWall.itmByUid( uidnext )
		},
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
		let btn = null
		switch(videoWall._state){
			case 'init':
				this.gridLoad()
				if(dlgVideoWall == null){
					videoWall.drawDlg()
				}
				// btn = dlgVideoWall.querySelector('#btnPlay')
				// btn.innerText = 'Play'
				break;
			case 'pause':
				// btn = dlgVideoWall.querySelector('#btnPlay')
				// btn.innerText = 'Play'

				//grid.pause:
				if( videoWall.tiles.length > 0){
					videoWall.tiles.forEach( function(video, idx){
						video.dlg.pause()
					})
				}

				videoWall.videoNext()
				break;
			case 'play':
				// btn = dlgVideoWall.querySelector('#btnPlay')
				// btn.innerText = 'Pause'

				if(videoWall.tiles.length > 0 ){			//verify videos playing
					videoWall.tiles.forEach( async function(video2, idx){
						if(video2.dlg.playing != true)
							await video2.dlg.deselect()
					})
				}

				if(!player.playing)
					videoWall.videoNext()
				break;
		}
	},
	//
	btnApplyClick: function(){
		videoWall.winwidth = null	//force reload of html
		videoWall.state('init')

		videoWall.dlgUpdate()
	},
	btnPlayClick: function(){
		let newstate = null,
				state = videoWall.state()
		if( videoWall.cur != null ){
			videoWall.cur.dlg.deselect()
		}

		if(state !== 'play') {
			if(state === null)		//grid not drawn
				videoWall.btnApplyClick()
			newstate = 'play'
		}
		else {	//pause
			newstate = 'pause'
		}
		videoWall.state(newstate)
	},
	dlgUpdate: function(){
		if(dlgVideoWall == null) return

		if(this.tiles.length == 0){
			dlgVideoWall.querySelector('.spTileLen').innerHTML = '-'
			dlgVideoWall.querySelector('.spQueLen').innerHTML = '-'
			dlgVideoWall.querySelector('.spQueNextIdx1').innerHTML = '-'
			dlgVideoWall.querySelector('.spQueNextIdx2').innerHTML = '-'
			return
		}

		dlgVideoWall.querySelector('.spTileLen').innerHTML = this.tiles.length
		dlgVideoWall.querySelector('.spQueLen').innerHTML = this.que.list.length

		let min = Number(this.tiles[0].dataset.vwidx), max = min
		for(let tile of this.tiles){
			let vwidx = Number(tile.dataset.vwidx)
			if(min > vwidx)	min = vwidx
			if(max < vwidx)	max = vwidx
		}
		dlgVideoWall.querySelector('.spQueNextIdx1').innerHTML = min +1
		dlgVideoWall.querySelector('.spQueNextIdx2').innerHTML = max +1
	},
	//
	videoNext: function( startPausedVideos = false ){		//eventually select from different plugins
		player.next()
	},
	reset: function(){
		let itm = (this.cur == null ?null :this.itmByUid( this.cur.dlg.uid ) )

		window.removeEventListener('resize', videoWall.windowResize)
		player.close()
		grid.onclick = gridClick
		dlgFactory.bbl(`Loading last layout: ${videoWall.lastLayoutMode}`)
		renderer.fullscreen( false )
		gridLoad(this.lastLayoutMode, this.lastFilter)
		renderer.mainMenuGen(exts)
		videoWall.tiles = []
		videoWall._state = null
		videoWall.cur = null
		videoWall.width = null
		videoWall.height = null

		this.dlgUpdate()
		if(itm != null)
			selectItems( itm.pid )
	},
	//
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

		let uid = Number( cb.dataset.uid ),
				idx = videoWall.gridExclude.indexOf(uid)

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
	//
	windowSizeGet: function(){
		this.winwidth = document.querySelector('html').clientWidth
		this.winheight = document.querySelector('html').clientHeight
	},
	windowResize: function(){
		videoWall.gridResize()
	},
	//

	tilePlayLast: async function( tile ){
		// let tile = document.querySelector('#vid'+tid)
		if( tile.dataset.uidlast == '-1'){
			bbl('No last video to play.')
			return
		}
		let itm = videoWall.itmByUid( tile.dataset.uidlast )
		tile.dataset.uidlast = tile.dlg.uid
		// await videoWall.tileUpdate(itm, tile)
		await tile.dlg.update( itm )
		await tile.dlg.deselect()
	},
	tilePlayNext: async function( tid ){		//load new video into tile, called from renderer.js
		let tile = document.querySelector('#vid'+tid)
		let result = await tile.dlg.swap()
		if(result == -2){	//no more video files; empty tile to allow delete/move on file
			await tile.dlg.empty()
		}
	},
	tilesPrior: function(){	//play prior group of tiles
		let nextidx = this.que.nextIdx -(2 *this.tiles.length)
		if(nextidx < 0)
			nextidx = this.que.list.length +nextidx
		this.que.nextIdx = nextidx
		this.tilesNext()
		
	},
	tilesNext: async function(){	//play next group of tiles
		let playing = player.playing
		await player.hide()

		for(let tile of this.tiles){
			tile.dlg.swap()
		}
		this.dlgUpdate()		//update ui
		if(playing === true)
			await player.show( this.tiles[0], true)
	},
	itmIdxByPid: function(pid){
		//required: when shuffling videos, pid's do not align to items[idx]
		for(let ii = 0; ii < items.length; ii++){
			if(items[ii].pid == pid){
				return ii
			}
		}
		return false
	},
	itmByPid: function(pid){
		//required: when shuffling videos, pid's do not align to items[idx]
		let itm = null
		for(let ii = 0; ii < items.length; ii++){
			if(items[ii].pid == pid){
				itm = items[ii]
				//console.log('itmByPid ii===pid, uid', ii, pid, itm.uid, itm.basename)
				break
			}
		}
		return itm
	},
	itmByUid: function(uid){
		//required: when shuffling videos, becasue itm.pid != itm.uid
		let itm = null
		for(let ii = 0; ii < items.length; ii++){
			if(items[ii].uid == uid){
				itm = items[ii]
				break
			}
		}
		return itm
	},
	itmByTid: function(tid){
		let tile = videoWall.tiles[ tid ]		//video tile
		return videoWall.itmByUid( tile.dlg.uid )
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
	grid.onclick = null
	videoWall.state('init')
	window.addEventListener('resize', videoWall.windowResize)
}
videoWall.drawDlg = function(){
	let	tbhtml = `<div id=toolbar>
				<div class=toolCtrls>
					<span> Tiles: &nbsp; </span>
					<label><input id=edCols type=number value="${videoWall.gridCols}" style=''
						onchange='videoWall.gridCols = Number(this.value); videoWall.btnApplyClick()'
					> 
						Colums</label> &nbsp;&nbsp;
					<label><input id=edRows type=number value="${videoWall.gridRows}" style=''
						onchange='videoWall.gridRows = Number(this.value); videoWall.btnApplyClick()'
					> 
						Rows</label> &nbsp;&nbsp;
					<label title='Play videos for at least this many seconds'>Min play time 
						<input id=minPlayTime type=number value="${videoWall.minPlaytime}" style='width:3em'
							onchange='videoWall.minPlaytime = Number(this.value)'
						></label> &nbsp;&nbsp;
				</div>
				<div class=toolCtrls>
					<span> Order: </span>
					<label title='Randomize videos, overrides other Order settings'><input id=cbShuffle ${ui.args.shuffle===true ?'checked' :''}  onclick='(ui.args.shuffle = this.checked)' type=checkbox
						onchange='videoWall.btnApplyClick()'
					> 
					Shuffle</label> &nbsp;&nbsp;
					<label for=selOrder>Sort
						<select id=selOrder title='Change order of videos'
							onchange='ui.args.order = this.options[this.selectedIndex].text;  videoWall.btnApplyClick()'
						>
							<option ${ui.args.order == 'name' ?'selected' :''} >name</option>
							<option ${ui.args.order == 'date' ?'selected' :''}>date</option>
							<option ${ui.args.order == 'size' ?'selected' :''}>size</option>
						</select> 
					</label> &nbsp;&nbsp;
					<label title='Sort descending'><input id=cbDescending ${ui.args.descending===true ?'checked' :''}  type=checkbox
						onclick='(ui.args.descending = this.checked);  videoWall.btnApplyClick()' 
					> Descending</label> &nbsp;&nbsp;
				</div>
				<div class=toolCtrls>
					<span class=spTileLen>${this.tiles.length}</span> Tiles &nbsp; 
					<span class=spQueLen>${this.que.list.length}</span> Videos &nbsp; 
					Viewing: 
					<button class=spQueSpinner title='Click for last ${this.tiles.length} videos' style='transform:rotateY(180deg); display:inline-block;' 
						onclick='videoWall.tilesPrior()' >&#10152</button>
					#<span class=spQueNextIdx1> - </span> to <span class=spQueNextIdx2> - </span>
					<button class=spQueSpinner title='Click for next ${this.tiles.length} videos'
						onclick='videoWall.tilesNext()' >&#10152;</button>
					&nbsp;&nbsp;
				</div>
			</div>
			<table id=tbVidList style="border-collapse:collapse; border-spacing:0; display:${videoWall.viewAll===true ?'none' :'block'}; margin:1em 0 0 0; table-layout:fixed; ">
				<tbody id=tbodyHeader style='display:block; width:35em;'><tr style='color:var(--dlgColorHiLight); text-align:left;'>
					<td style='width:3em'>&nbsp;</td>
					<td style='width:3em'><input type=checkbox checked title='Toggle select all videos' onclick='videoWall.cbToggleAllClick(this)'></td>
					<td id=tdName style='width:50em'>Name</td>
				</tr></tbody>
				<tbody id=tbodyItems style="display:block; overflow:auto; max-height:35em; width:35em;">`

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
		#grid .videoTile {
			display:inline-block;
		}
		#dlgVideoWall #toolbar .toolCtrls .spQueNextIdx1, 
		#dlgVideoWall #toolbar .toolCtrls .spQueNextIdx2{ color: #fff; }
		#dlgVideoWall #toolbar .toolCtrls .spQueSpinner{ cursor:pointer; font-size:1.4em; padding:0; width:2em; }
	</style>
	${tbhtml}
	`

	dlgVideoWall = 	new CDialog({
		buttons:{
			default:'btnApply',
			btnApply:{
				caption:'Apply',
				title:'Apply settings to VideoWall',
				onClick:  function(dlg, btn){
					videoWall.btnApplyClick()
					videoWall.btnPlayClick()
				}
			},
			btnMute:{
				caption:'Mute',
				title:'Mute all videos',
				onClick: function(dlg, btn){
					player.mute()
					for(let tile of videoWall.tiles){
						tile.muted = true
					}
				}
			},
			// btnPlay:{
			// 	caption:'Play',
			// 	title:'Play/pause Videos',
			// 	onClick: function(dlg, btn){
			// 		videoWall.btnPlayClick()
			// 	}
			// },
			btnReset:{
				caption:'Reset',
				title:'Return to last layout',
				onClick: function(dlg, btn){
					videoWall.reset()
					//
					// dlgVideoWall.querySelector('#btnPlay').innerText = 'Play'
				}
			},
		},
		className:'dlgVideoWall',
		focusid:'btnApply',
		header:`<b>Testing: Video Wall Settings</b>
			<div style='color:#ddd; font-size:0.9em; font-style:italic; font-weight:normal; margin:3px auto 0.5em auto; text-align:center; width:90%; '>
				press ESC to toggle dialog
		</div>`,
		html:html,
		id:'dlgVideoWall',
		onClose:function(dlg,force){
			//only destroy dlg, leave videoWall state
			dlgVideoWall = null
		}
	})

	let btn = dlgVideoWall.querySelector('#btnClose')
	btn.style.marginRight = '1em'

	// btn = dlgVideoWall.querySelector('#btnPlay')
	// if(videoWall.state() === 'play')
	// 	btn.innerText = 'Pause'

	this.dlgUpdate()
	dlgVideoWall.dlg.minimized = false
	dlgVideoWall.dlg.show()
}

videoWall.gridLoad = function(){

	if(this.lastLayoutMode == null){
		this.lastFilter = Object.assign({}, gExtFilter)
		this.lastLayoutMode = (lastLayoutMode == null ?'vert' :lastLayoutMode)
	}else
	if(lastLayoutMode != 'videoWall'){
		this.lastFilter = Object.assign({}, gExtFilter)	//clone
		this.lastLayoutMode = lastLayoutMode
	}
	lastLayoutMode = 'videoWall'

	//renderer.fullscreen( true )
	player.hide()

	if(isotope!==null){
		ui.reset()
		//videoWall.reset()
	}

	if(items.length===0){
		console.log('videoWall.gridLoad(), no data to layout. Exiting.', items)
		return
	}

	if(videoWall.tiles == null
	|| videoWall.winwidth == null
	|| videoWall.winheight == null){	//setup grid

		if(ui.args.shuffle==true){
			// console.log('Shuffling videos items...', items[0].basename)
			items = arrShuffle( items )
			// console.log('Shuffling videos items:', items[0].basename)
		} else
		if(ui.args.order!==undefined && ui.args.order!==''){
			itemsSort(ui.args.order, ui.args.descending)
		}
		gExtFilter = videoWall.extFilter
		videoWall.gridHTML( videoWall.extFilter )
	}
	else
		videoWall.gridResize()

	if(videoWall.tiles == null){
		dlgFactory.bbl(`0 videos`)
		return
	}
	let cnt = videoWall.tiles.length
	if(cnt===items.length)
		dlgFactory.bbl(`${cnt} videos`)
	else
		dlgFactory.bbl(`${cnt}/${items.length} video items found`)
}

videoWall.gridResize = function( ){

	this.windowSizeGet()

	if(this.tiles === null) {
		//nothing to do
		return
	}

	player.hide()

	let wd = this.tileWidth(),
			ht = this.tileHeight()

	//console.log('resize window/cnt', videoWall.winwidth, videoWall.winheight, wd, ht)

	for(let ii = 0; ii < this.tiles.length; ii++){
		let video = videoWall.tiles[ii]
		video.dataset.width = wd
		video.dataset.height = ht
		video.style.width = wd+'px'
		video.style.height = ht+'px'
		if(videoWall.cur != null && videoWall.cur.id == video.id)
			video.dlg.selectCss()
		else
			video.dlg.deselectCss()
	}

	if( this.cur != null )
		player.show( videoWall.cur )
}
videoWall.gridHTML = function( extFilter ){

	videoWall.que.clear()

	this.windowSizeGet()
	let width = this.tileWidth(),
			height = this.tileHeight(),
			maxitems = this.gridCols * this.gridRows

	let tid=-1, 	//tile id
			itm, html = ''
	for(var idx in items){	//create video contaners
		items[idx].vwidx = Number( idx )
		itm = items[idx]

		if(	(itm.isDeleted && itm.isDeleted===true)
		||  (extFilter.ALL !== 1 && (extFilter[itm.type] !== 1 && extFilter[itm.mediaType] !== 1)) ){
			delete itm.videoWall		//just in case
			continue
		}
		// if(videoWall.gridExclude.indexOf(itm.videowallid) >= 0) continue
		videoWall.que.add( itm.uid )

		itm.videoWall = true

		if(++tid < maxitems) {
			items[idx].tid = tid		//tile number
			html += `<video controls muted=true preload='metadata' class='grid-item videoTile'
				id="vid${tid}" src="${itm.src}" type="video/${itm.type.substr(1)}"
				data-uid="${itm.uid}" data-uidlast="-1" data-tid="${tid}" data-vwidx="${idx}"
				data-width="${width}" data-height="${height}"
				style="width:${width}px; height:${height}px; object-fit:cover"
				title="${Number(idx) +1}. ${itm.basename} , ${ui.calc.bytesToStr(itm.size)}"
			></video>`
		}
		else {
			items[idx].tid = null			//not playing in a tile
			// videoWall.que.add( itm.uid )
		}
	}
	videoWall.que.nextIdx = maxitems

	grid.innerHTML = html
	this.tiles = grid.querySelectorAll('.videoTile')
	this.tileLogicAssign()
}
videoWall.tileHeight = function(){
	return Math.floor( (this.winheight -(this.gridRows * 10)) / this.gridRows)
}
videoWall.tileWidth = function(){
	return Math.floor(  (this.winwidth /this.gridCols) -15 )
}
videoWall.tileLogicAssign = function(){		//assign default logic to video elements
	// play wall videos muted
	// click to display video in player
	this.tiles.forEach( ( video ) => {

		video.addEventListener('click', function( event ) {	//select video
			if(event.currentTarget.id != video.id) return
			video.dlg.select( false )
			return ui.eventStop(event)
		})
		video.addEventListener('ended', async function( event ) {
			let canSwap = false

			if(videoWall.minPlaytime > 0){	//allow for min playing time
				video.dlg.timeTotal += video.duration
				if(video.dlg.timeTotal >= videoWall.minPlaytime){
					canSwap = true
				}
			}

			if(canSwap === true){
				let ii = await video.dlg.swap()
				if(ii == -2){	//no more video files; empty tile to allow delete/move on file
					await video.dlg.empty()
				}
			}
			else
				video.dlg.deselect()
		})

		video.dlg = {

			playing:false,
			timeTotal:0,
			tid: Number(video.dataset.tid),		// tile id
			uid: Number(video.dataset.uid),		// unique item id, assigned in main.js

			pause: async function(){
				video.dlg.deselectCss()
				video.dlg.playing = false
				await video.pause()
			},
			reset: async function(){
				video.dlg.timeTotal = 0
				video.currentTime = 0
			},
			swap: async function(){		//load next video from videoWall.que
				//assume: itm is of items
				let itm = videoWall.que.next( video.dlg.uid )
				if(itm === null){
					video.dlg.deselect()		//keep playing this video
					return -2
				}
				// itm.tid = video.dlg.tid

				video.dataset.uidlast = video.dlg.uid
				let itmlast = videoWall.itmByUid( video.dlg.uid )
				itmlast.tid = null		//not playing in a tile

				// await videoWall.tileUpdate(itm, video)
				await video.dlg.update( itm )
				await video.dlg.deselect()
				return videoWall.que.count()
			},
			select: async function( reset = false){
				//video.muted = true
				if(reset == true){
					video.currentTime = 0
				}

				//video.dlg.startTime = Date.now()
				//video.dlg.playing = true
				//await video.play()

				player.next(video)
				video.dlg.selectCss()
			},
			deselect: async function(){
				//video.dlg.timeTotal = 0
				// console.log('deselect()', video.title)
				video.muted = true
				video.dlg.deselectCss()
				video.dlg.playing = true
				await video.play()
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
			},

			empty: async function(){	//no video available
				await video.dlg.pause()
				video.dataset.vwidx = null
				video.dataset.uid = null
				video.dlg.uid = null
				video.src = ''
				video.title = 'No more videos to load'
			},
			update: async function( itm ){	//update video with itm details
				itm.tid = video.dlg.tid
				// let playing = (tile.dlg.playing === true)
				// if( playing ){
				// 	await tile.pause()
				// }
				video.dataset.vwidx = itm.vwidx
				video.dataset.uid = itm.uid
				video.dlg.uid = itm.uid
				video.dlg.timeTotal = 0			//reset
				video.title = `${itm.vwidx +1}. ${itm.basename}, ${ui.calc.bytesToStr(itm.size)}`
				video.type = `video/${itm.type.substr(1)}`
				video.src = itm.src
			},
		}
	})
}

//video player
var player = {

	el: null,				// HTML compenent
	lastTile:null,		// videoWall.cur, last tile used
	timeTotal:0,
	playing:false,

	next: function( tile = null ){	//when tile===null, select next rom grid

		if(videoWall.state() == 'pause'){
			player.hide()
			return
		}

		if(['init','play'].indexOf( videoWall.state()) < 0){
			console.error('player.next() error, unknown state found: ['+videoWall.state()+']')
			return false
		}

		if(videoWall.tiles === null || videoWall.tiles.length == 0){
			player.hide()
			return
		}

		//handle current video selection
		let resetTime = true
		if( tile != null ) {
			resetTime = false
			videoWall.cur = tile
		}
		else {
			let video = videoWall.cur,
				tid = ( video === null ?-1 :video.dlg.tid )
			tid++
			if(tid >= videoWall.tiles.length) tid = 0
			videoWall.cur = videoWall.tiles[tid]
		}

		player.show( videoWall.cur, resetTime )			//assigns this.lastTile
		videoWall.cur.dlg.selectCss()
		return videoWall.cur
	},

	close: async function(){
		if(this.el == null) return

		await this.el.pause()
		document.body.removeChild(this.el)
		delete this.el
		this.el = null
	},
	hide: async function(){
		this.playing = false
		if(this.el == null) return

		await this.el.pause()
		this.el.style.display = 'none'
		this.el.muted = true
	},
	mute: async function(){
		if(this.el == null) return
		this.el.muted = true
	},
	show: async function(tile, resetTime = false){
		//assume: resetTime == true then called from this.el.on(ended)
		//assume: resetTime == false then user clicked a tile
		if(tile === undefined) throw `player.show() error, tile arg is missing.`

		//disable last
		if(this.lastTile != null){ //update last selected grid video
			this.lastTile.dlg.deselect()
			if(resetTime === true && player.el != null){
				// this.lastTile.currentTime = player.el.currentTime
				if(this.lastTile.src === this.el.src)  	//force tile replay after this.el ends; ignore if src differs
					this.lastTile.dlg.reset()
			}
		}
		this.lastTile = tile
		//this.lastTile.muted = true

		if(this.el === null)
			this.elCreate()
		// else{			//pause
		// 	this.el.muted = true
		// 	await this.el.pause()
		// }

		this.elPosition( tile )

		this.el.title = tile.title
		this.el.type = tile.type
		this.el.muted = false
		this.el.controls = true

		this.el.src = tile.src
		// this.el.srcObject = tile.captureStream()

		if(resetTime === true){
			this.el.currentTime = 0
			tile.currentTime = 0
		}
		else
			this.el.currentTime = tile.currentTime		//fails when user manually seeks on grid control

		this.playing = true
		this.el.style.display = 'block'
		await this.el.play()
	},

	elCreate: function(){
		this.el = document.createElement('video')
		this.el.id = 'videoplayer'
		this.el.className = 'videoplayer'
		this.el.style.display = 'none'
		this.el.preload = 'none'

		document.body.appendChild(this.el)
		this.el.addEventListener('click', function(event){
			player.hide()

			if(player.lastTile != null){
				player.lastTile.currentTime = player.el.currentTime
				player.lastTile.muted = false
			}
			return ui.eventStop(event)
		})
		this.el.addEventListener('ended', async function( event ) {

			if(videoWall.minPlaytime > 0){
				player.timeTotal += player.el.duration		//ignore case where user manually skips ahead
				if(videoWall.minPlaytime > player.timeTotal){
					await player.el.play()
					return
				}
			}

			player.timeTotal = 0		//reset
			videoWall.videoNext()
		})
		this.el.addEventListener('error', async function( event ) {
			console.log('player error:\n', event )
		})
		// this.el.addEventListener('play', async function(event) {
		// 	if(player.lastTile == null) return
		// 	await player.lastTile.play()
		// })
		// this.el.addEventListener('pause', async function(event) {
		// 	if(player.lastTile == null) return
		// 	await player.lastTile.pause()
		// })
		// this.el.addEventListener('seeked', (event) => {
		// 	if(player.lastTile == null) return
		// 	player.lastTile.currentTime = player.el.currentTime
		// })
	},
	elPosition: function( tile ){
		//rules:
		// position this.el over tile
		// make this.el larger so it overlaps tile
		// account for screen edges by shifting away from edge
		let buf = 5,
			pos = ui.calc.xyAbs(tile),
			ow = Math.floor( tile.clientWidth /4),		//overflow width
			oh = Math.floor( tile.clientHeight /6),		//overflow height
			l = pos.left -ow,
			t = pos.top -oh,
			w = tile.clientWidth +(ow *2),
			h  = tile.clientHeight +(oh *2)

		if(l < 0) l=10
		else
		if(l  +w > videoWall.winwidth )
			l= videoWall.winwidth -w -buf;
		if(t < 0) t=1
		else
		if(t  +h > videoWall.winheight )
			t= videoWall.winheight -h -buf;

		this.el.style.left = l+'px'
		this.el.style.top = t+'px'
		this.el.style.width = w+'px'
		this.el.style.height = h+'px'
	}
}
