/*
	dlgVidWall
	- video wall dialog for FolderView

	usage:
		vidWallInit()

	requires:
		CDialog.js
		ui.js
		renderer.js

*/
"use strict"

var dlgVidWall = null

var videoWall = {
	
	state:null,		//play, pause
	vlist:null,		//video list

	hide: function(){
		console.log('hide')
		dlgVidWall.style.display = 'none'
	},
	// pause: function(){
	// 	console.log('pause')
	// 	if(videoWall.vlist === null) return
	// 	videoWall.vlist.forEach( (vid, idx) => {
	// 		// if( idx > 2) return
	// 		vid.pause()
	// 	})
	
	// },
	play: function(){
		console.log('play')

		if(videoWall.vlist === null || videoWall.state === 'pause') {
			if(videoWall.vlist === null)
				videoWall.vlist = document.querySelectorAll('video[class="videoWall"]')
			videoWall.vlist.forEach( (vid, idx) => {
				// if( idx > 2) return
				vid.loop = true
				vid.play()
			})
			videoWall.state = 'play'
			dlgVidWall.querySelector('#btnPlay').innerText = 'Pause'
		}
		else {	//pause
			videoWall.vlist.forEach( (vid, idx) => {
				// if( idx > 2) return
				vid.pause()
			})
			videoWall.state = 'pause'
			dlgVidWall.querySelector('#btnPlay').innerText = 'Play'
		}		
	}
}
videoWall.toggle = function( options ){

	if(dlgVidWall != null) {
		dlgVidWall.style.display = 'block'
		// dlgVidWall.close()
		return
	}

	renderer.fullscreen( true )
	//document.querySelector('body').style.margin = 'auto'
	// document.querySelector('#grid').style.margin = '0px'
	// document.querySelector('#grid').style.height = 'auto'

	if(options == null)
		options = {url:'https://www.youtube.com/watch?v=qDQgZrKwAeY'}
	else
	if(typeof options == 'string')
			options = {url:options}
	videoDl.cfg.url = options.url

	let list = [],
			flt = [],
			tbhtml = `<table id=tbVidList style="border-collapse:collapse; border-spacing:0; table-layout:fixed; max-width:50em;">
			<tbody style='display:block; width:35em;'><tr style='text-align: center;'>
				<td style='width:20em'>Name</td>
				<td style='width:5em'>Type</td>
				<td style='width:5em'>Hide</td>
				<td style='width:5em'>Audio</td>
			</tr></tbody>
			<tbody style="display:block; overflow:auto; max-height:35em; width:35em;">`

	items.map( itm => {
		if(itm.mediaType !== 'video') return
		list.push(itm)
		if(flt.indexOf( itm.type ) < 0)
			flt.push(itm.type)
			tbhtml += `<tr id="trVid${itm.pid}">
			<td style='width:20em'>${itm.basename}</td>
			<td style='width:5em'>${itm.type}</td>
			<td style='width:5em'><input id="cbVidHide${itm.pid}" type=checkbox></td>
			<td style='width:5em'><input id="cbVidAudio${itm.pid}" type=checkbox></td>
			</tr>`
	})
	tbhtml += '</tbody></table>'

	let html = `<style>
		:root{
			--dlgBgColor:#303050;
			--dlgColor:#ddd;
			--dlgColorHiLight:#dfa612;
		}
		dialog {
			background-color:var(--dlgBgColor);
			border:none; border-radius:5px;
			box-shadow:    0px 0px 60px rgba(0,0,0,0.1), 0 0 60px rgba(0,0,0,0.7);
			color:var(--dlgColor);
			font-family:Geneva, Verdana, sans-serif;
			font-size:14px;
			top:20em;
			width:300px;
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
			cursor:pointer;
			color:var(--dlgColorHiLight);  letter-spacing:1px; font-size:0.8em;
			padding:0.5em 1em;  
			/*width:7em;*/
		}
		dialog button:active{ color:#7e7; box-shadow:none; }
		.dlgVideoDl{
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

	dlgVidWall = 	new CDialog({
		buttons:{
			default:'btnPlay',
			btnPlay:{
				caption:'Play',
				title:'Play Videos',
				onClick: function(dlg, btn){
					videoWall.play()
				}
			},
			// btnPause:{
			// 	caption:'Pause',
			// 	title:'Pause Videos',
			// 	onClick: function(dlg, btn){
			// 		videoWall.pause()
			// 	}
			// },
			btnHide:{
				caption:'Hide',
				title:'Hide Video Wall dialog',
				onClick: function(dlg, btn){
					videoWall.hide()
				}
			}
		},
		className:'dlgVideoDl', 
		focusid:'btnPlay',
		header:'<b>Video Wall</b>',
		html:html,
		id:'dlgVideoDl',
		onClose:function(dlg,force){
			dlgVidWall = null
			videoWall.vlist = null
			videoWall.state = null
			//renderer.fullscreen( false )
		}
	})
	dlgVidWall.dlg.minimized = false

	dlgVidWall.querySelector('#btnClose').style.marginRight = '3em'
	dlgVidWall.dlg.show()

	//configure with isotope
	this.gridLoad()
/*
	this.gridLoad('wall', { '.mp4':1 , '.mpg':1, '.mkv':1, '.ogg':1, '.webm':1 } )
	let ll = document.querySelectorAll('.grid-itemCaption')
	ll.forEach( ctrl => ctrl.style.display = 'none' )

	ll = document.querySelectorAll('.grid-item')
	let n = 4,	//Math.floor(winwidth / defaultwidth),
			wall = makeGrid({
				colcnt: n,
				// rowcnt:	Math.ceil(ll.length / n)
				rowcnt:	4
				//colWidth:400,
				//colHeight:300
			})
	console.log('wall', wall)

	for(let ii = 0; ii < ll.length; ii++){
		let ctrl = ll[ii],
				video = ctrl.querySelector('video')

		if(wall.cells.length <= ii){
			//alert('Limit reached')
			ctrl.style.display = 'none'
			video.muted = true
			continue
		}
		let	cell = wall.cells[ii]
				// videohtml = video.outerHTML
		// console.log(ii, videohtml)

		ctrl.style.minHeight = 'auto'
		ctrl.style.minWidth = 'auto'
		ctrl.style.maxHeight = 'none'
		ctrl.style.maxWidth = 'none'
	
		ctrl.dataset.cellid = ii
		ctrl.style.left = cell.left+'px'
		ctrl.style.top = cell.top+'px'
		ctrl.style.height = cell.height+'px'
		ctrl.style.width = cell.width+'px'
		ctrl.style.border = 'none'
		
		video.dataset.cellid = ii
		video.className="videoWall"
		video.style.maxHeight = 'none'
		video.style.maxWidth = 'none'
		video.style.height = cell.height+'px'
		video.style.width = cell.width+'px'
		video.style.objectFit = 'cover'
		video.muted = true
		// video.preload = 'metadata'
	}
*/
}

videoWall.gridLoad = function(extFilter = null){
	if(isotope!==null){
		ui.reset()
	}

	if(items.length===0){
		console.log('videoWall.gridLoad(), no data to layout. Exiting.', items)
		return
	}

	let selectedFile=null
	if(ui.args.shuffle==true){
		if(itemselected!=null) selectedFile = itemselected.path
		itemselected=null
		dlgFactory.bbl('Shuffling videos items...')
		items = arrShuffle(items)
	} else
	if(ui.args.order!==undefined && ui.args.order!==''){
		if(itemselected!=null) selectedFile = itemselected.path
		itemselected=null
		itemsSort(ui.args.order, ui.args.descending)
	}
	let layoutMode='videoWall'
	lastLayoutMode = layoutMode
	if(extFilter==null) {
		extFilter = { '.mp4':1 , '.mpg':1, '.mkv':1, '.ogg':1, '.webm':1 }
	}
	gExtFilter = extFilter

	var html = '', cnt=0, layout=null, obj=null,
			io = ui.args.iconsOnly,
			winwidth=window.innerWidth, winheight=window.innerHeight,
			defaultwidth=320, defaultheight=200

	layout='masonry'
	// layout='packery'
	rulGridItem.style.textAlign='center'
	rulGridItem.style.verticalAlign='middle'
	defaultwidth = Math.floor(winwidth/4)
	// defaultwidth = Math.floor(winwidth/4)-10
	//defaultheight = 200
	console.log('defaultwidth', defaultwidth)
	for(var idx in items){	//define grid items
		items[idx].pid = idx	//reset in case of ui.args.shuffle=true
		items[idx].ctrl = null
		obj = items[idx]

		if(obj.isDeleted && obj.isDeleted===true) continue
		// if(ui.args.folders==='hidden' && obj.isDirectory===true) continue
		if(extFilter.ALL !== 1 && (extFilter[obj.type] !== 1 && extFilter[obj.mediaType] !== 1)) continue

		cnt++
		let width=defaultwidth, height=obj.h
		//packery (wall)
		/*
		let width=obj.w, height=obj.h
		//var itwdt = Math.floor(winwidth/4)-10
		if(obj.w >= 1600)	//resize to maintain relative sizes
			width = Math.floor(defaultwidth*1.33)
		else
		if(obj.w > 640)
			width = defaultwidth
		else
			width = Math.floor(defaultwidth*0.66)
		height= obj.h /(obj.w/width)
		*/

		//apply user's scale argument
		if(scale !== 1){
			height=Math.floor( height *scale)
			width =Math.floor( width *scale)
		}
		//build childhtml:
		let childhtml = '',
				onclick 	= `itemClick(${obj.pid}, event)`,
				title			= obj.basename

		title += `, ${ui.calc.bytesToStr(obj.size)}`
		childhtml = `<video controls preload='none'
			id="vid${obj.pid}" src="${obj.src}" type="video/${obj.type.substr(1)}"
			style="width:${width -10}px; object-fit:cover"
			class='videoWall' muted=true
			title="${Number(idx) +1}. ${title}"
			></video>`
			// style="height:${height-20}px; max-width:${width-20}px; object-fit:cover"
				

		//compose html:
		// html += `<div
		// 		class='grid-item' id="obj${obj.pid}"
		// 		draggable="true" ondragstart="itemDragStart(event)" ondrop="itemDrop(event)"
		// 		style="min-height:${height}px;width:${width}px"
		// 		onclick="${onclick}"
		// 		title="${Number(idx) +1}. ${title}"
		// 	>
		// 		${childhtml}
		// 	</div>`
		html += childhtml
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
	// if(ui.args.scroll===true){
	// 	gridScrollToggle(true)
	// 	ui.args.scroll=false
	// }
	if(cnt===items.length)
		dlgFactory.bbl(`${cnt} videos`)
	else
		dlgFactory.bbl(`${cnt}/${items.length} videos displayed`)
	console.log('defaultwidth end', defaultwidth)

}

function makeGrid( options = {} ){
	if(options.maxx === undefined) options.maxx = window.innerWidth -5
	if(options.maxy === undefined) options.maxy = window.innerHeight -5
	if(options.z === undefined) options.z = 1000

	if(options.padding === undefined) options.padding = 0
	
	if(options.colcnt === undefined) options.colcnt = 3
	if(options.rowcnt === undefined) options.rowcnt = 3

	// if(options.colWidth !== undefined) options.colcnt = Math.floor(options.maxx / options.colWidth)
	// if(options.colHeight !== undefined) options.rowcnt = Math.floor(options.maxy / options.colHeight)

	let ii = -1, cells = [],
			cellw = Math.ceil( (options.maxx - (options.padding *2)) / options.colcnt),
			cellh = Math.ceil( (options.maxy - (options.padding *2)) / options.rowcnt)

	for(let xx = 0; xx < options.colcnt; xx++){
		for(let yy = 0; yy < options.rowcnt; yy++){
			let cell = {
				id:++ii,
				left:options.padding +(cellw *xx), 
				top:options.padding +(cellh *yy), 
				width:cellw, 
				height:cellh, 
				z:options.z
			}
			cell.right = cell.left +cell.width
			cell.bottom = cell.top +cell.height
			cells.push(cell)
		}
	}
	options.cells = cells
	return options
}
