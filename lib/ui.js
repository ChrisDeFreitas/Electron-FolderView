ui = {
	updateDate:'20170119',
	args: {
		defaultImageNum:null,
		devtools:false,
		find:'',
		fontsize:'12px',
		fullscreen:false,
		isElectron:false,
		//lat:null,lon:null,
		layout:'cols',
		order:'',						//sort field: date, name, size, type
		descending:false,		//sort descending
		path:'',
		shuffle:false,
		scale:1,
		scroll:false,
		showSlideCaptions:true,
		slide:false
	}
}
var galleryDelay=15000
var lastLayoutMode="cols"
var scale=1
var scrollTimeout=21		//control speed grid scrolls, default 21ms
//
var grid=null			//<div id=grid>
var gallery=null	//photoswipe slideshow
var galleryScrollTimer = null
var gExtFilter={}
var isElectron = false
var isotope = null
var rulGridItem = null
var scrollDir=null
var scrollTimer=null

var exts = {}
var items = []
var itemselected=null

var objprefix = ['aud','fld','img','svg','unk','vid']
var imgtypes =	['.bmp','.ico','.gif','.jpg','.jpeg','.png']
var vidtypes =	['.avi','.flc','.flv','.mkv','.mov','.mp4','.mpg','.mov','.ogg','.qt','.swf','.webm','.wmv']
var audtypes =	['.flac','.mp3','.wma']

var dlgGalleryDelay = null
var slideCaptionOptions = {
//	at:null		//updated with each call: {x:window.innerWidth-60, y:window.innerHeight-40}
	canDestroy:false
//, delay:10000
, destroyOpacity: 0.05
, from:'bottomright'
, html:null			//defines initial state
, width:333
, attrib:{			//defaults removed after first call
		className:'imgCaption'
	, style:{overflow:'auto'}
	, onclick:function(){
			slideCaptionOptions.html.style.display='none'
		}
	}
}

ui.init = function(){
	dlgFactory.setBblClickAction('none')

	rulGridItem = findRule('.grid-item')
	if(rulGridItem===false)
		throw 'ui.init() error: .grid-item style not found.'

	if(ui.args.fontsize!=='12px'){
		rulGridItem.style.fontSize = ui.args.fontsize
		console.log(`Set grid-item.style.fontSize = ${rulGridItem.style.fontSize}`)
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
	  if (event.shiftKey===true) return
		const key = event.key;

	  if (event.ctrlKey==false) {
	  	if(event.target.nodeName==='INPUT' || event.target.nodeName==='TEXTAREA') return

		  if (event.altKey===true) {
			  if(key==='s') {		//	alt+s, shuffle items
			  	ui.gridShuffle()
					return ui.eventStop(event)
			  }
		  	return
		  }
			if(key==='Enter') {		//display scroll grid
				if(event.target.nodeName==='BUTTON') return
				if(gallery != null) {	//close gallery if open
					gallery.close()
					gallery=null
					return
				}
				if(itemselected==null) return
				galleryShow(itemselected.pid)
				return ui.eventStop(event)
		  }
		  if(key==='Escape') {		//toggle dlg
				if(gallery != null) return
				if(dlg!==undefined) {
					dlgToggle()
					return //ui.eventStop(event)
				}
				return
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
			if(event.target.nodeName==='INPUT' || event.target.nodeName==='TEXTAREA') return

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
				if(gallery===null){
					var pid = (itemselected==null ?0 :itemselected.pid)
					openPhotoSwipe(pid)
	    		galleryPlay(true, false)
				}	else
	    		galleryPlay(true, true)
	  		return ui.eventStop(event)
	    case "ArrowLeft":
				if(gallery===null){
					var pid = (itemselected==null ?0 :itemselected.pid)
					openPhotoSwipe(pid)
					galleryPlay(false, false)
				}	else
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
	ctrlFromStr:function(str){
		if(typeof str!='string'){
			//if(str.id!==undefined)
				return str	//probale HTMLElement
		}
		if(str[0] != '#') str='#'+str
		return document.body.querySelector(str)		//assume str is control id
	},
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
	toNumber: function(val){ return parseFloat(val) },
	toInt: function(val){	return parseInt(val,10)	},
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
		--num
		if(num<0){		//str[_idx] = '9'
			str = str.substr(0,_idx)+'9'+str.substr(_idx+1, str.length)
			return ui.calc.strDec(str, --_idx)
		} else {		//str[_idx] = num
			return str.substr(0,_idx)+num+str.substr(_idx+1, str.length)
		}
	},
	xyAbs: function(ctrl){
		///console.log(ctrl.nodeName, ctrl.id)
		var	top=ctrl.offsetTop
		var left=ctrl.offsetLeft
		/*while(ctrl.parentNode.nodeName!='BODY'){
			console.log(ctrl.offsetParent.nodeName, ctrl.offsetParent.id)
			ctrl=ctrl.parentNode
		}*/
		if(ctrl.offsetParent!=null){
			top+=ctrl.offsetParent.offsetTop
			left+=ctrl.offsetParent.offsetLeft
		}
		return {top:top, left:left}
	},
	xyIntersects(x, y, ctrl){
		if(x >= ctrl.offsetLeft && x <= ctrl.offsetLeft +ctrl.offsetWidth
		&& y >= ctrl.offsetTop && y <= ctrl.offsetTop +ctrl.offsetHeight )
			return true
		return false
	}
}
ui.var ={	//store dynamic vars here
}
ui.gridLoad = function(layoutMode, extFilter){
	if(isotope!==null){
		ui.reset()
	}
	console.log(`\nGrid settings: `)
	console.log(`descending=`, ui.args.descending)
	console.log(`filter=`, extFilter)
	console.log(`folders=`, ui.args.folders)
	console.log(`layout mode=`, lastLayoutMode)
	console.log(`order=`, ui.args.order)
	console.log(`scale=`, scale)
	console.log(`scroll=`, ui.args.scroll)
	console.log(`shuffle=`, ui.args.shuffle)
	if(items.length===0){
		console.log('ui.gridLoad(), no data to layout. Exiting.', items)
		return
	}
	if(ui.args.shuffle==true){
		console.log(`shuffling`)
		itemselected=null
		items = arrShuffle(items)
		ui.args.shuffle=false
		ui.var.lastOrder=ui.args.order
		ui.args.order=''
	} else
	if(ui.args.order!==undefined && ui.args.order!==''){
		itemselected=null
		itemsSort(ui.args.order, ui.args.descending)
		ui.var.lastOrder=ui.args.order
		ui.args.order=''
	}
	if(ui.args.folders=='first' || ui.args.folders=='last'){
		itemsFolders(ui.args.folders)
	}
	if(layoutMode===undefined)	layoutMode='wall'
	lastLayoutMode = layoutMode
	if(ui.args.isElectron===true && extFilter===undefined) {
		extFilter={}
		Object.assign(extFilter, exts)
	}
	gExtFilter = extFilter

	var html = '', cnt=0, layout=null
	if(layoutMode==='cols')	layout='masonry'
	else
	if(layoutMode==='rows')  layout='fitRows'
	else
	if(layoutMode==='vertical')	layout='vertical'
	else
	if(layoutMode==='vert')	layout='vertical'
	else
	if(layoutMode==='wall') 	layout='packery'
	for(var idx in items){	//define grid items
		items[idx].pid = idx	//reset in case of ui.args.shuffle=true
		items[idx].ctrl = null
		obj = items[idx]
		if(ui.args.folders==='hidden' && obj.isDirectory===true) continue
		if(extFilter!==undefined && extFilter[obj.type]===undefined) continue
		cnt++
		var width =(obj.w_z != undefined ?obj.w_z :obj.w)
		var height=(obj.g_z != undefined ?obj.g_z :obj.h)
		var src = obj.src
		if(obj.type==='youtube'){
			src=obj.src_z
			height=obj.h_z
			width=obj.w_z
		}else
		if(obj.src_z !== undefined){	//only use thumbnail is image.w > 1000px
			if(obj.w > 1000 && obj.w_z > 320)
				src = obj.src_z
		}
		if(layoutMode==='vert') {
			//layout='vertical'
			rulGridItem.style.textAlign='left'
			rulGridItem.style.verticalAlign='top'
			width=320
			height=obj.h/(obj.w/width)
		}else
		if(layoutMode==='cols') {		//cols
			//layout='masonry'
			rulGridItem.style.textAlign='center'
			rulGridItem.style.verticalAlign='middle'
			width=(window.innerWidth/3)-13
			height= obj.h /(obj.w/width)
		}else
		if(layoutMode==='rows') {		//rows
			//layout='fitRows'
			rulGridItem.style.textAlign='center'
			rulGridItem.style.verticalAlign='middle'
			height=(window.innerHeight/4)
			width=obj.w /(obj.h/height)
		}else{ 											//packery (wall)
			//layout='packery'
			rulGridItem.style.textAlign='center'
			rulGridItem.style.verticalAlign='middle'
			var itwdt = Math.floor(window.innerWidth/4)-10
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
		height=Math.floor( height *scale)
		width =Math.floor( width *scale)

		//html += `<div onclick="itemClick(${obj.pid});" onmouseover="itemMouseOver(event);" onmouseleave="itemMouseLeave(event);"  class='grid-item' id="obj${obj.pid}" title="${obj.basename}"
		html += `<div onclick="itemClick(${obj.pid});" class='grid-item' id="obj${obj.pid}" title="${obj.basename}"
			style="min-height:${height}px;width:${layout==='vertical'?'auto':width+'px'}">`
		if(layoutMode==='vert') {
			html += '<table class=vertTable><tr><td>'
		}
		if(imgtypes.indexOf(obj.type) >= 0) {
			html += `<img
				id="img${obj.pid}"	src="${src}"
				title="${obj.basename}, ${obj.w} x ${obj.h}"
				onclick="openPhotoSwipe(${obj.pid});"
				ondblclick="itemDblClick(${obj.pid})"
				style="height:${height}px;width:${width}px;display:${layout==='vertical'?'inline-table':'block'};"
			></img>`
		}	else
		if(obj.type==='youtube'){
			html += `<img
				id="img${obj.pid}"	src="${src}"
				title="${obj.basename}"
				onclick="openYoutube(${obj.pid});"
				ondblclick="itemDblClick(${obj.pid})"
				style="height:${height}px;width:${width}px;display:${layout==='vertical'?'inline-table':'block'};"
				ondblclick="itemDblClick(${obj.pid})">
			</img>`
		} else
		if(obj.isDirectory===true){
			html += `<img
				id="fld${obj.pid}"	src="${src}"
				alt="${obj.basename}"
				style="margin:2em auto 0 auto;padding:0 2em;"
				ondblclick="itemDblClick(${obj.pid})"
			></img>`
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
				style="height:${height-20}px;max-width:${width-20}px;"
				ondblclick="itemDblClick(${obj.pid})"
			></video>`
		} else
		if(audtypes.indexOf(obj.type) >= 0){
			html += `<audio controls preload='metadata'
				id="aud${obj.pid}" src="${src}"
				style="margin:${height/2}px auto 0 auto; max-height:${height-30}px;	width:${width}px;"
				ondblclick="itemDblClick(${obj.pid})"
			></audio>`
		}
		else {
			html += `<img
				id="unk${obj.pid}"	src="${src}"
				alt="${obj.basename}"
				style="margin:${layout==='vertical'?0:(height/3)+'px'} auto 0 auto;"
				ondblclick="itemDblClick(${obj.pid})"
			></img>`
		}
		//data handling
		if(layout==='vertical') {	//attach div with file data
			rulGridItem.style.marginBottom='1em'
			html += "</td><td>"
			var ss=''
			var dsc = (obj.dsc != undefined && obj.dsc != null && obj.dsc != ''
								? obj.dsc.replace(/&lt;/g, "<").replace(/&gt;/g, ">")	//.replace(/"/g, "'")
								: '')
			if(ui.args.isElectron===true)
				ss+=`${obj.basename}`
			else{
				if(obj.title!==undefined)
					ss+=`<a href="${obj.src}" target="_new">${obj.title}</a>`
				else
					ss+=`<a href="${obj.src}" target="_new">${obj.src}</a>`
			}
			if(obj.owner!==undefined){
				if(obj.url!==undefined)
					ss+=`<br>By <a href="${obj.url}" target="_new">${obj.owner}</a>`
				else
					ss+=`<br>By ${obj.owner}`
			}
			if(imgtypes.indexOf(obj.type) >= 0)
				ss+=`<br>${obj.w} x ${obj.h}`
			if(obj.size!==undefined && obj.size>0){
				if(obj.size<1024)
					ss+=`<br>${obj.size}bytes`
				else
				if(obj.size<(1024*1024))
					ss+=`<br>${Math.round(obj.size/1024 *10)/10}kb`
				else
					ss+=`<br>${Math.round(obj.size/1024/1024*100)/100}mb`
			}
			if(obj.date!==undefined)
				ss+=`<br>${new Date(obj.date).toString()}`
			if(obj.lat!=null && obj.lon!=null)
				ss+=`<br>Lat:${obj.lat}, Lon:${obj.lon}`
			if(dsc!='')
				ss+=`<br><br>${dsc}`
			html += `<div class='vertText'>${ss}</div>`	//close div.grid-item
						+ "</td></tr></table>"
		}
		else {
			rulGridItem.style.marginBottom=0
			//&& obj.type!=='youtube'
			if(imgtypes.indexOf(obj.type) < 0 && obj.type!=='.svg'){ //obj.basename at bottom
				html += `<div style='padding:0; margin:0 auto; height:30px; width:${width *scale -20}px; overflow:hidden; text-overflow:ellipsis;'>${obj.basename}</div>`
			}
		}
		html += '</div>'	//close div.grid-item
	}
	if(ui.args.showSlideCaptions===true)
		dlgFactory.bbl(layoutMode+' Layout, '+cnt+'/'+items.length+' displayed');
	//var grid = document.querySelectorAll('#grid')[0]
	grid = document.querySelectorAll('#grid')[0]
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
	if(itemselected!=null){	//may be changing layout, list is unchanged
		var pid = itemselected.pid
		itemselected=null
		itemSelect(pid)
		itemselected.ctrl.scrollIntoView({
			  behavior:'instant',	// "auto"  | "instant" | "smooth",
			  block:'start'
			})
	}
}
ui.gridShuffle = function(){
	if(isotope==null) return
	if(ui.args.showSlideCaptions===true)
		dlgFactory.bbl('Shuffle Items')
	isotope.shuffle()
}
ui.reset = function(){
	if(galleryScrollTimer!==null){
		clearTimeout(galleryScrollTimer)
		galleryScrollTimer=null
	}
	if(gallery!==null){
		gallery.close()
		gallery=null	//photoswipe slideshow
	}
	if(scrollTimer!==null){
		clearTimeout(scrollTimer)
		scrollTimer=null
	}
	//itemselected=null
	isotope.destroy()
	isotope=null
	document.querySelector('#grid').innerHTML=''
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

function itemClick(pid){
	itemSelect(pid)
	//if(itemSelect(pid)===false) return
	//openPhotoSwipe(pid)
}
function itemUnselect(pid){
	if(itemselected==null) return
	var ctrl=document.getElementById(`obj${itemselected.pid}`)
	classRemove(ctrl,'gridItemSelected')
	itemselected=null
}
/*
	itemSelect(pid)
		args: obj.pid or obj.src
*/
function itemSelect(pid){
	if(typeof pid==='string' && pid.length>11){	//assume img.src='http://....ext'
		//console.log(pid)
		pid = items.find(function(el,ii,list){
			if(el.src===pid){
				pid = el.pid
				return true
			}
			return false
		})
		//console.log(pid)
	}
	if(itemselected==null
	|| itemselected.pid!==pid) {	//new item
		if(itemselected!=null) {
			var ctrl =  document.getElementById(`obj${itemselected.pid}`)
			classRemove(ctrl,'gridItemSelected')
		}
		itemselected=items[pid]
		ctrl =  document.getElementById(`obj${pid}`)
		classAdd(ctrl,'gridItemSelected')
		if(itemselected.ctrl===undefined || itemselected.ctrl===null)
			itemselected.ctrl = ctrl
		return itemselected
	}
	return itemselected
}
function itemDblClick(pid){		//launch files in OS or open folders
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
	var pswpElement = document.querySelector('.pswp');
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
		hideAnimationDuration:0,	//333,
		history:false,
		index: defaultPid, // first slide to start with
		//mouseUsed:true,
		showAnimationDuration:333,
		showHideOpacity:false,
		//? spacing:0.8,
		timeToIdle: 4000,
	}
	document.body.style.overflow='hidden'	//hide scrollbars
	gallery = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, galleryItems, options);
	gallery.listen('destroy', function() {
		document.body.style.overflow='auto'	//show scrollbars
		if(slideCaptionOptions.html != null){
			//slideCaptionOptions.html.DLGDestroy(true)
			slideCaptionOptions.html.style.display='none'
		}
		if(itemselected!=null){			//window.scrollTo(0,itemselected.ctrl.offsetTop)
			if(itemselected.ctrl.offsetTop < window.scrollY
			|| itemselected.ctrl.offsetTop > window.scrollY +window.innerHeight) {
				itemselected.ctrl.scrollIntoView({
				  behavior:'smooth',	// "auto"  | "instant" | "smooth",
				  block:'start'})}
		}
		gallery=null
		if(galleryScrollTimer!=null) galleryPlay()	//will auto destroy
	})
	gallery.listen('afterChange', function() {
		var pid = gallery.currItem.pid
		var obj = itemSelect(pid)
		var dsc = (obj.dsc != undefined && obj.dsc != null && obj.dsc != ''
							? obj.dsc.replace(/&lt;/g, "<").replace(/&gt;/g, ">")	//.replace(/"/g, "'")
							: '')
		itemSelect(pid)
		if(ui.args.showSlideCaptions===true){
			var str = `<a href="${obj.url}" target="_new">${obj.basename}</a>
				<br>${obj.h} x ${obj.w}
				<div style="text-align:left">${dsc}</div>`
			if(slideCaptionOptions.html===null)	//first run
				slideCaptionOptions.html=str
			else
				slideCaptionOptions.html.innerHTML=str
			slideCaptionOptions.at = {x:window.innerWidth-40, y:window.innerHeight-20}	//incase it changes
			slideCaptionOptions.delay = (galleryDelay/2>10000 ?10000 : Math.round(galleryDelay/2))
			dlgFactory.tac(slideCaptionOptions)
			slideCaptionOptions.html.style.maxHeight='none'
			slideCaptionOptions.attrib=null
		}
	})
	gallery.init()
}
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
	//if(sc < inc) sc = inc
	//if(sc > 5) sc = 5
	if(wheelEvent==null)
		gallery.zoomTo(sc, {x:gallery.viewportSize.x/2,y:gallery.viewportSize.y/2}, 0)
	else
		gallery.zoomTo(sc, {x:wheelEvent.clientX,y:wheelEvent.clientY}, 0)
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
function galleryPlay(boo, skipCurrent) {
		//toggle slideshow

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
function galleryShow(pid){
	if(pid===undefined) pid=0
	if(gallery == null)
		openPhotoSwipe(pid)
	else
		gallery.goTo(pid)
	//galleryPlay(true, false);
}


function openYoutube(pid){
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

function itemsSort(srtFld, descending) {
	/*var obj = {
		basename: fn,
		date:stat.mtime,
		size:stat.size,
		isDirectory:stat.isDirectory(),
		pid: id,
		type: ext
	}*/
	var mult = (descending===true ?-1 :1)
	var newItems = items.sort(function(a, b){
		function localCmp(obj1, obj2, fld){
			if(typeof(obj1[fld])==='string'){
				if(obj1[fld].toLowerCase() < obj2[fld].toLowerCase()) return -1 *mult
				if(obj1[fld].toLowerCase() > obj2[fld].toLowerCase()) return 1 *mult
				return 0
			}
			if(obj1[fld] < obj2[fld]) return -1 *mult
			if(obj1[fld] > obj2[fld]) return 1 *mult
			return 0
		}
		if(srtFld==='date'
		|| srtFld==='size'){
			return localCmp(a,b, srtFld)
		}
		if(srtFld==='name'){
			return localCmp(a,b, 'basename')
		}
		if(srtFld==='type'){
			var result = localCmp(a,b, 'type')
			if(result != 0) return result
			return localCmp(a,b, 'basename')
		}
	})
	//console.log(newItems)
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
