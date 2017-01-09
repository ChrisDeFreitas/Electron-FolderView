ui = {
	updateDate:'20170109',
	args: {
		defaultImageNum:null,
		devtools:false,
		find:'',
		fontsize:'12px',
		fullscreen:false,
		isElectron:false,
		layout:'cols',
		path:'',
		shuffle:false,
		scale:1,
		scroll:false,
		slide:false
	}
}
//complex vars
var bblDur = 5000
var gallery=null	//photoswipe slideshow
var galleryDelay=15
var galleryScrollTimer = null
var gExtFilter={}
var isElectron = false
var isotope = null
var scrollDir=null
var scrollTimeout=21		//control speed grid scrolls, default 21ms
var scrollTimer=null

//internal
var exts = {}
var items = []
var itemselected=null
var lastLayoutMode="cols"
var scale=1

var objprefix = ['aud','fld','img','svg','unk','vid']
var imgtypes =	['.bmp','.ico','.gif','.jpg','.jpeg','.png']
var vidtypes =	['.avi','.flc','.flv','.mkv','.mov','.mp4','.mpg','.mov','.ogg','.qt','.swf','.webm','.wmv']
var audtypes =	['.flac','.mp3','.wma']

ui.init = function(){
	dlgFactory.setBblClickAction('none')

	document.getElementById('btnGalleryDur').innerHTML = galleryDelay+'s'
	document.getElementById('pswp__item2').addEventListener("wheel", function(event){		//scale gallery image
		if(gallery===null) return
		galleryImageScale(event, (event.deltaY < 0))
	})
	document.addEventListener('keydown', (event) => {
	  if (event.altKey===true) return
		const key = event.key;
	  if (event.ctrlKey==false) {
	  	if(event.target.nodeName==='INPUT'
	  	|| event.target.nodeName==='TEXTAREA') return

		  if(key==='Escape') {		//toggle dlg
		  	if(gallery != null) return
				dlgToggle();	return ui.eventStop(event)
		  }
		  if(key==='s') {		//scroll grid
				gridScrollToggle();	return ui.eventStop(event)
		  }
		  if(key==='c') {		//cols mode
				ui.gridLoad('cols');	return ui.eventStop(event)
		  }
		  if(key==='r') {		//rows mode
				ui.gridLoad('rows');	return ui.eventStop(event)
		  }
		  if(key==='v') {		//vert mode
				ui.gridLoad('vert');	return ui.eventStop(event)
		  }
		  if(key==='w') {		//wall mode
				ui.gridLoad('wall');	return ui.eventStop(event)
		  }
		}
	  if (event.ctrlKey===true) {
			if(event.target.nodeName==='INPUT'
	  	|| event.target.nodeName==='TEXTAREA') return

			var inc=0.05
			switch (event.key) {
	    case "ArrowUp":		//scale up
				if(gallery==null) {	//scale grid images up
			  	scale += inc
			  	ui.gridLoad(lastLayoutMode)
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
					ui.gridLoad(lastLayoutMode)
				}
				else {		//scale gallery image down
					var sc = gallery.getZoomLevel()
					sc -= inc
					gallery.zoomTo(sc, {x:gallery.viewportSize.x/2,y:gallery.viewportSize.y/2}, 333)
				}
	  		return ui.eventStop(event)
	    case "ArrowRight":
				var pid = (itemselected===null ?0 :itemselected.pid)
				openPhotoSwipe(pid)
	    	galleryPlay(true, true);
	  		return ui.eventStop(event)
	    case "ArrowLeft":
				var pid = (itemselected===null ?0 :itemselected.pid)
				openPhotoSwipe(pid)
	    	galleryPlay(false, true);
	  		return ui.eventStop(event)
	  	}
	  	return
  	}
	}, false)
}
ui.eventStop = function(e){
	if(e.preventDefault) e.preventDefault();
	if(e.stopPropagation) e.stopPropagation();
	else e.cancelBubble=true;
	return false;
}
ui.getQueryVariables = function(){
	var result = {}
  var query = window.location.search.substring(1);
  var vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    ui.args[decodeURIComponent(pair[0].toLowerCase())] = decodeURIComponent(pair[1])
  }
	ui.args.devtools = ui.calc.toBool(ui.args.devtools)
	ui.args.fullscreen = ui.calc.toBool(ui.args.fullscreen)
	ui.args.scale = ui.calc.toNumber(ui.args.scale)
	ui.args.scroll = ui.calc.toBool(ui.args.scroll)
	ui.args.shuffle = ui.calc.toBool(ui.args.shuffle)
	ui.args.slide = ui.calc.toBool(ui.args.slide)
  return ui.args
}
ui.calc = {
	toBool: function(val){
		var typ = typeof val
		if(typ==='string') {
			val = val.toLowerCase()
			if(val==="true"
			|| val==="yes"
			|| val==="ok")
				return true
		}else
		if(typ==='number')
			return (val > 0)
		else
		if(val===true)
			return true
		return false
	},
	toNumber(val){ return parseFloat(val) },
	toInt(val){	return parseInt(val,10)	}
}

ui.gridLoad = function(layoutMode, extFilter){
	console.log(`\nGrid settings: `)
	console.log(`filter=`, extFilter)
	console.log(`layout mode=`, lastLayoutMode)
	console.log(`scale=`, scale)
	console.log(`scroll=`, ui.args.scroll)
	console.log(`shuffle=`, ui.args.shuffle)
	if(ui.args.shuffle==true){
		console.log(`shuffling`)
		items = arrShuffle(items)
		ui.args.shuffle=false
	}
	if(layoutMode===undefined)	layoutMode='wall'
	lastLayoutMode = layoutMode
	var layout=null
	if(layoutMode==='cols')	layout='masonry'
	else
	if(layoutMode==='rows')  layout='fitRows'
	else
	if(layoutMode==='vertical')	layout='vertical'
	else
	if(layoutMode==='vert')	layout='vertical'
	else
	if(layoutMode==='wall') 	layout='packery'
	//if(extFilter===undefined) extFilter = gExtFilter
	gExtFilter = extFilter
	var html = '', cnt=0
	for(var idx in items){	//define grid items
		items[idx].pid = idx	//reset in case of ui.args.shuffle=true
		obj = items[idx]
		if(extFilter!==undefined && extFilter[obj.type]===undefined) continue
		cnt++
		var width =(obj.w_z != undefined ?obj.w_z :obj.w)
		var height=(obj.g_z != undefined ?obj.g_z :obj.h)
		var src = obj.src
		if(obj.src_z !== undefined){	//only use thumbnail is image.w > 1000px
			if(obj.w > 1000 && obj.w_z > 320)
				src = obj.src_z
		}
		if(layout==='vertical') {
			width=320
			height=obj.h/(obj.w/width)
		}else
		if(layout==='masonry') {		//cols
			width=(window.innerWidth/3)-13
			height= obj.h /(obj.w/width)
		}else
		if(layout==='fitRows') {		//rows
			height=(window.innerHeight/4)
			width=obj.w /(obj.h/height)
		}else{ 											//packery (wall)
			var itwdt = Math.floor(window.innerWidth/4)
			if(obj.w >= 1600)	//resize to maintain relative sizes
				width = Math.floor(itwdt*1.33)
			else
			if(obj.w > 640)
				width = itwdt
			else
				width = Math.floor(itwdt*0.66)
			height= obj.h /(obj.w/width)
		}
		//apply user's scale argument
		width =Math.floor( width *scale)
		height=Math.floor( height *scale)
		html += `<div onclick="itemclick(${obj.pid});" class='grid-item' id="obj${obj.pid}" title="${obj.basename}" `
		if(imgtypes.indexOf(obj.type) >= 0) {
			html += `	style="height:${height}px; width:${width}px;">
			<img
				id="img${obj.pid}"	src="${src}"
				width=${width}
				height=${height}
				title="${obj.basename}, ${obj.w} x ${obj.h}"
				onclick="openPhotoSwipe(${obj.pid});"
				ondblclick="dblClick(${obj.pid})"
			></img>`
			html += '</div>'	//close div.grid-item
			continue
		} else
			html += `>`

		//no filename displayed for images
		if(obj.isDirectory===true){
			html += `<img
				id="fld${obj.pid}"	src="${src}"
				alt="${obj.basename}"
				style="padding:3em 3em 1em 3em;"
				ondblclick="dblClick(${obj.pid})"
			></img>
			<div style='padding:0; margin:0 0 ${75 *scale}px 0; width:${320 *scale}px; overflow:hidden; text-overflow:ellipsis;'>${obj.basename}</div>`
		} else
		if(obj.type==='.svg'){
			html += `<img
				id="svg${obj.pid}"	src="${src}"
				height=${height}	width=${width}
				alt="${obj.basename}"
				onclick="openPhotoSwipe(${obj.pid});"
				style="background-color:whitesmoke;"
			></img>`
		} else
		if(vidtypes.indexOf(obj.type) >= 0){
			html += `<video controls preload='metadata'
				id="vid${obj.pid}" src="${src}"
				type="video/${obj.type.substr(1)}"
				style="height:${height}px;	width:${width}px;"
				ondblclick="dblClick(${obj.pid})"
			></video>
			<div style='padding:0; width:${320 *scale}px; overflow:hidden; text-overflow:ellipsis;'>${obj.basename}</div>`
		} else
		if(audtypes.indexOf(obj.type) >= 0){
			html += `<audio controls preload='metadata'
				id="aud${obj.pid}" src="${src}"
				style="height:${height}px;	width:${width}px;"
				ondblclick="dblClick(${obj.pid})"
			></audio>
			<div style='padding:0; width:${320 *scale}px; overflow:hidden; text-overflow:ellipsis;'>${obj.basename}</div>`
		}
		else {
			html += `<img
				id="unk${obj.pid}"	src="${src}"
				height=${height}	width=${width}
				alt="${obj.basename}"
				style='padding:3em 0 0 0;''
				ondblclick="dblClick(${obj.pid})"
			></img>
			<div style='padding:0; width:${320 *scale}px; overflow:hidden; text-overflow:ellipsis;'>${obj.basename}</div>`
		}
		html += '</div>'	//close div.grid-item
	}
	var grid = document.querySelectorAll('#grid')[0]
	grid.innerHTML = html
	isotope = new Isotope(grid, {
		layoutMode: layout,
		//layoutMode: 'fitRows',					//items arranged in rows
	  //layoutMode: 'vertical',					//one column
	  //layoutMode: 'masonry',					//??? Items are arranged in a vertically cascading grid
	  //layoutMode: 'packery',					//fill empty spaces
		//buggy, not used: layoutMode: 'horiz',					//one horizontal row
	  /*horiz: {
		  verticalAlignment: 0		// align to top
		},*/
		masonry: {		//take columnWidth from first element
		  //columnWidth: (300 *scale),
		  gutter: 0	//(10 *scale)
		},
		itemSelector: '.grid-item',
  	//percentPosition: true,
  	gutter: 0,
  	fitWidth: true,
  	//stagger: 30,
  	resize: true,
	});
	//dlgFactory.bbl(`"${cnt}" images loaded`, bblDur)
	if(ui.args.defaultImageNum != null) {	//note: ui.args.shuffle=true will this mess up
		var obj = items[ui.args.defaultImageNum]
		if(imgtypes.indexOf(obj.type) >= 0) {
			openPhotoSwipe(ui.args.defaultImageNum)
			ui.args.defaultImageNum = null
		}
	}
	if(ui.args.scroll===true){
		gridScrollToggle(true)
		ui.args.scroll=false
	}
}
function gridScrollToggle(boo){
	if(boo===undefined) boo=(scrollTimer===null)	//this is the toggle case
	var scrollPause=0	//pause briefly when changing direction
	if(boo===true){
		scrollTimer = window.setInterval(function(){
			if(scrollPause > 0) {		//pause when changing direction
				scrollPause--
				return
			}
			window.scrollBy(0,scrollDir)
			if(scrollDir===null || window.pageYOffset<=0){	//reset at top and bottom of page
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

function itemclick(pid){
	if(itemSelect(pid)===false) return
	//openPhotoSwipe(pid)
}
function itemSelect(pid){
	if(itemselected === null
	|| itemselected.pid !== pid) {	//new item
		if(itemselected !== null) {
			var ctrl =  document.getElementById(`obj${itemselected.pid}`)
			classRemove(ctrl,'gridItemSelected')
		}
		itemselected = items[pid]
		ctrl =  document.getElementById(`obj${pid}`)
		classAdd(ctrl,'gridItemSelected')
		return itemselected
	}
	//clear existing selection
	var ctrl =  document.getElementById(`obj${itemselected.pid}`)
	classRemove(ctrl,'gridItemSelected')
	itemselected = null
	return false
}
function dblClick(pid){		//launch files in OS or open folders
	if(isElectron==false) return
	var obj = items[pid]
	if(obj.isDirectory)
		renderer.fldrBrowse(obj)
	else
		renderer.openFile(obj)
}

function openPhotoSwipe(pid) {
	if(gallery!==null) return
	if(pid===undefined) pid=0
	var pswpElement = document.querySelectorAll('.pswp')[0];
	var galleryItems = [], defaultPid = 0
	for(var idx in items) {	//scale images
		var item=items[idx]
		if(imgtypes.indexOf(item.type) < 0) continue
		if(defaultPid===0 && pid==idx) defaultPid = galleryItems.length
		galleryItems[galleryItems.length] = {
			src: item.src,
			w: item.w *(scale<=1 ? 1 :scale),
			h: item.h *(scale<=1 ? 1 :scale),
			pid: idx	//item.pid
		}
	}
	var options = {
		bgOpacity: 0.85,
		closeOnScroll: false,
		escKey: true,
		galleryPIDs:true,
		hideAnimationDuration:333,
		history:false,
		index: defaultPid, // first slide to start with
		//mouseUsed:true,
		showAnimationDuration:333,
		showHideOpacity:false,
		//? spacing:0.8,
		timeToIdle: 4000,
	}
	gallery = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, galleryItems, options);
	gallery.listen('destroy', function() { gallery = null; });
	gallery.listen('afterChange', function() {
		var pid = gallery.currItem.pid
		var obj = itemSelect(pid)
		var dsc = (obj.dsc != undefined && obj.dsc != null && obj.dsc != ''
							? obj.dsc.replace(/&lt;/g, "<").replace(/&gt;/g, ">")	//.replace(/"/g, "'")
							: '')
		dlgFactory.bbl(`<a href="${obj.url}" target="_new">${obj.basename}</a>
			<br>${obj.h} x ${obj.w}
			<div style="text-align:left">
			${dsc}
			</div>`, bblDur)
	});
	gallery.init();
}
function galleryDur(){	//get slideshow delay
	var tmpdlg = null
	function local_update(){
		galleryDelay = tmpdlg.querySelector('#inpDelay').value
		document.getElementById('btnGalleryDur').innerHTML = galleryDelay+'s'
		dlgFactory.close(tmpdlg)
	}
	tmpdlg = dlgFactory.create({
		focusId: '#inpDelay',
		title: 'Set Slideshow Delay',
		body: `<label style="text-align:center;margin:0;"><input id=inpDelay type=number value=${galleryDelay} min=1 style='width:3em; text-align:right;' tabindex=0> seconds</label>`,
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
function galleryPlay(boo, skipCurrent) {	//toggle slideshow

	if(galleryScrollTimer!=null) {								//toggle off
		clearTimeout(galleryScrollTimer)
		galleryScrollTimer=null
		dlgFactory.bbl('Slideshow stopped', bblDur)
		return
	}

	if(boo===undefined) boo=true
	if(skipCurrent===undefined) skipCurrent=true

	var local_func = function(){
		if(gallery==null){
			clearTimeout(galleryScrollTimer)
			galleryScrollTimer = null
			dlgFactory.bbl('Slideshow stopped', bblDur)
			return
		}
		if(boo===true) gallery.next()	//gallery automatically resets index at end of list
		else gallery.prev()
	}

	if(boo===true){
		dlgFactory.bbl('Slideshow started', bblDur)
		if(skipCurrent===true)
	 		gallery.next()
	}else{
		dlgFactory.bbl('Slideshow playing in reverse', bblDur)
		if(skipCurrent===true)
			gallery.prev()
	}
	galleryScrollTimer = window.setInterval(local_func, galleryDelay*1000); // scrolls every n milliseconds
}
/*
function galleryScale() {
	if(gallery == null || scale < 1)  return
	//console.log('galleryScale()', scale)
	//update the currently view item
	gallery.zoomTo(scale, {x:gallery.viewportSize.x/2*scale,y:gallery.viewportSize.y/2*scale}, 333)
	//update remaining items
	for(var ii in gallery.items) {
		var gitem = gallery.items[ii]
		var obj = items[gitem.pid]	//itemsFindByPid(item.pid)
		if(obj==undefined) continue
		gitem.w = obj.w * scale
		gitem.h = obj.h * scale
	}
}
*/
function galleryImageScale(wheelEvent, boo) {
	if(gallery == null)  return
	if(wheelEvent===undefined) wheelEvent = null
	var sc = gallery.getZoomLevel(),
			inc= 0.05
	if(boo===true) sc += inc
	else sc -= inc
	if(sc < inc) sc = inc
	if(sc > 5) sc = 5
	//console.log(wheelEvent.clientX, gallery.viewportSize.x, gallery.viewportSize.x/2)
	if(wheelEvent==null)
		gallery.zoomTo(sc, {x:gallery.viewportSize.x/2,y:gallery.viewportSize.y/2}, 0)
	else{
		gallery.zoomTo(sc, {x:wheelEvent.clientX,y:wheelEvent.clientY}, 0)
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
	//1. get the local styelsheet
	var stylesheet = null
	for(var key=0; key < document.styleSheets.length; key++){
		if(document.styleSheets[key].href !== null) continue
		stylesheet = document.styleSheets[key];
		break;
	}
	if(stylesheet===null){
		console.log(`findRule(${selector}) error, default stylesheet not found.`)
		return
	}
	for(var key in stylesheet.cssRules){
		var tmprule = stylesheet.cssRules[key]
		if(tmprule.selectorText===selector){
			return tmprule
		}
	}
	return false
}
