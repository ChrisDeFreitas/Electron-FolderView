/*
	last modified: 20170119

	dlgFactory
	- simplify displaying random bits of html
	- css in this.init()

	///create a draggable dialog box
	- display html string or text
	- drag title bar
	- dblClick title bar to close
	- auto-handling of close button
	- esc key closes
	- enter key selects default button
	- default z-index:1500

	//sample code
	var options = {
		canDestroy:true,				//whether the dialog should be hidden or destroyed in dlgFactory.close(dlgid)
		createHidden:false,			//if true: dlg.display=none
		headerHidden:false,
		focusId: '#inpDelay',
		title: 'Set Slideshow Delay',
		top/left/height/width: undefined	//if(left===undefined) auto-center dlg; if(top===undefined) dlg.style.top=25em
		style:{zIndex:1000;},		//key attached to dlg.style
		body: `<label><input id=inpDelay type=number value=${galleryDelay} min=1 style='width:3em; text-align:right;' tabindex=0> seconds</label>`,
		onClose:function(dlg){}
		buttons:{
			btnCloseHide:false,			//hide the close button
			default: 'Save',				//button caption to select when Enter key pressed; may also be an element.id: '#btnXXX'
			Save: function(dlg, btn){	//save and close
				local_update()
				dlgFactory.close(dlg)
			},
			"\u227B": function(dlg,btn){	//save and start slideshow
				local_update()
				galleryPlay(true)
			}
		 }
	}
	var dlg = dlgFactory.create(options)


	///bubble messsages
	- display html string or text
	- messages fade-in/out in column on left side of screen
	- specify duration messages remain on screen

	//sample code
	dlgFactory.setBblClickAction('show' || 'none')		//what to do when user clicks a bubble message; default=show
	dlgFactory.bbl(msg, delay)											//show floating message in upper  left of window; automatically destroy message after delay seconds


	///hvr dialog
	- popup dialog when mouse hovered over element

	//sample code
	var hvr = dlgFactory.hvr({
		focusId:'btn0'
	,	attrib:{
		className:'dlgHover'
	}
	,	body:`
	<button onclick='aboutShow()' class=dlgButton title='About this page'>About</button>
	<button onclick='ui.gridLoad("cols"); ' class=dlgButton title='Grid layout: columns'> Cols Layout [c]</button>
	<button onclick='ui.gridLoad("rows"); ' class=dlgButton title='Grid layout: rows'> Rows Layout [r]</button>
	<button onclick='ui.gridLoad("vert"); ' class=dlgButton title='Grid layout: one vertical column'> Vert Layout [v]</button>
	<button onclick='ui.gridLoad("wall"); ' class=dlgButton title='Grid layout: wall'> Wall Layout [w]</button>
	<button onclick='ui.gridShuffle(); ' 		class=dlgButton title='Shuffle items'> Shuffle [alt+s]</button>
	`})


	///tac messages
	- tack html to a location on screen
	- specify screen coords
	- specify tac type: center, topleft, topright, bottomleft, bottomright
	- dlg.style.top/left adjusted to maintain screen coords
	dlgFactory.tac({
		canDestroy:bool							//if true dlg is removed from DOM after delay ms
																//if false, set style.display=none after delay
	, ctrl: HTMLElement may be undefined or null
	,	delay: int									//seconds to display, if null/undefined no delay handling
	, destroyOpacity:number				//on options.delay.end, div.style.opacity=options.destroyOpacity
	, from: {x:number, y:number}	//screen coords
	, html:string					//what is displayed in dialog
	, to: string									// oneOf:[center, topleft, topright, bottomleft, bottomright]
	, width:number								//may be undefined
	, height:number								//may be undefined
	, attrib:{										//HTMLElement attributes assigned to ctrl can include events handlers
		, className:string					//optional
		, style:{}									//optional, please don't use: display, height, visibility or width
		}
	})

	//sample code
	tac = dlgFactory.tac({
		ctrl:null
	, to:{x:window.innerWidth-200, y:window.innerHeight-200}
	, from:'bottomright'
	, delay:bblDur
	, canDestroy:false
	,	attrib:{
			innerHTML: ' displayed'
		, className: 'imgCaption'
		}
	})


*/
var dlgFactory = {
	list:[],
	lastid:0,
	bblLast:null,		//last bubble message created
	inited:false,
	bblClickAction:'show',

	//dlg functions
	create: function(options) {
		if(this.inited===false) this.init()

		if(options.canDestroy===undefined) options.canDestroy=true
		if(options.createHidden===undefined) options.createHidden=false
		if(options.headerHidden===undefined) options.headerHidden=false
		if(options.style===undefined) options.style={}

		var id = 'dlg'+(++this.lastid),
		 	btnhtml = '',
		 	btnCloseHide=false
		if(options.buttons){
			if(options.buttons.btnCloseHide===undefined)
				options.buttons.btnCloseHide=false
			btnCloseHide = options.buttons.btnCloseHide
			//assume: buttons[key] is a function
			var btnidx=0
			for(key in options.buttons){
				if(key==='btnCloseHide'
				|| key==='default') continue
				btnhtml += `<button id='btn${btnidx++}' onclick='var dlg=dlgFactory.get("${id}"); dlg.DLGOptions.buttons["${key}"]( dlg, this )' class=dlgButton>${key}</button> `
			}
		}
		var	left=(options.left ?`;left:${options.left}` :''),
			top	=(options.top ?options.top :'25vh'),
			height=(options.height ?options.height :'auto'),
			width=(options.width ?options.width :'auto'),
			html = `
<div id=hdr${id} class=dlgHeader draggable=true ondragstart="dlgFactory.dragStart(event)" ondragend="dlgFactory.dragEnd(event)"
 ondblclick="dlgFactory.close('${id}')" style="display:${options.headerHidden===false ?'block' :'none'}">
	${options.title}
</div>
<div id=bdy${id} class=dlgBody>
	${options.body}
</div>
<div id=ftr${id} class=dlgFooter>
	${btnhtml} <button id=btnClose onclick="dlgFactory.close('${id}')" class=dlgButton style="display:${(btnCloseHide===true ?'none' :'inline')}">Close</button>
</div>`
		var dlg = document.createElement("DIV")
		dlg.id = id
		dlg.className='divDlg'
		dlg.style += `${left};top:${top};width:${width};height:${height};display:block;visibility:hidden;`
		dlg.innerHTML = html
		dlg.DLGID = this.list.length
		dlg.DLGFactory = this
		dlg.DLGOptions = options
		dlg.addEventListener('keydown', function(event){
			switch (event.key) {
			case "Escape":
				dlgFactory.close(this)
				return dlgFactory.EventStopBubbling(event)
			case "Enter":
				if(event.target.nodeName==='BUTTON') return
				dlgFactory.btnDefault(this)
				return dlgFactory.EventStopBubbling(event)
			}
		})
		for(var key in options.style){
			dlg.style[key] = options.style[key]
		}
		this.list.push(dlg)
		document.body.appendChild(dlg)

		if(options.left===undefined)	//center dlg
			dlg.style.left = ((window.innerWidth- dlg.offsetWidth) *0.5)+'px'
		//console.log(options.createHidden, dlg.style.left, window.innerWidth, dlg.offsetWidth)
		if(options.createHidden===true)
			dlg.style.display='none'
		dlg.style.visibility='visible'

		if(options.focusId !== undefined){	//focus default ctrl: focusId
			var ctrl = dlg.querySelector(options.focusId)
			ctrl.focus()
			if(ctrl.nodeName==='INPUT')
				ctrl.select()
		}
		return dlg
	},
	close: function(dlgid){
		var dlg = null
		if(typeof dlgid === 'string')
			dlg = this.get(dlgid)
		else
		if(dlgid.className===undefined
		|| dlgid.className.indexOf('divDlg')<0)		//find dlg in parent heirarchy
			dlg = this.getDlgParent(dlgid)
		else
			dlg = dlgid
		if(dlg===false) return

		if(dlg.DLGOptions.onClose)
			dlg.DLGOptions.onClose(dlg)

		dlg.style.display = 'none'
		if(dlg.DLGOptions.canDestroy===false)
			return
		document.body.removeChild(dlg)
		//dlg.remove()	//may not be ie compatible
		delete(this.list[dlg.DLGID])	//ok to leave holes in list
	},
	get: function(dlgid){
		for(var ii in this.list){
			var dlg = this.list[ii]
			if(dlg==undefined) continue //deleted item
			if(dlg.id===dlgid) return dlg
		}
		return false
	},
	btnDefault: function(dlg){	//excute the default button function
		if(!dlg.DLGOptions
			|| !dlg.DLGOptions.buttons
			|| !dlg.DLGOptions.buttons.default
		) return
		var key = dlg.DLGOptions.buttons.default
		if(dlg.DLGOptions.buttons[key] !== undefined)
			dlg.DLGOptions.buttons[key](dlg, key)		//activate button function
		else {
			if(key[0] != '#') key='#'+key
			var ctrl = dlg.querySelector(key)		//assume key is control id
			if(ctrl==null) return
			ctrl.click()
		}
	},
	getDlgParent: function(ctrl){
		//find dlg in parent heirarchy
		while(ctrl!=null && ctrl.nodeName!='BODY'){
			if(ctrl.className && ctrl.className.indexOf('divDlg')>=0)
				return ctrl
			ctrl = ctrl.parentNode
		}
		return false
	},

	//util dlgs
	msg: function(msg, title){
		var options = {
			title: (title===undefined ?"Message" :title),
			body: msg,
			left:'40vw',
			width:'20vw'
		}
		return this.create(options)
	},
	bigText: function(msg, title, heightVh, widthVw){
		if(heightVh===undefined) heightVh=35
		if(widthVw===undefined) widthVw=35
		var top = ((100 - heightVh -10)/2)
		var left = ((100 - widthVw -2)/2)
		if(top < 1) top=1
		if(left < 1) left=1
		var options = {
			focusId: '#btnClose',
			title: (title===undefined ?"Message" :title),
			body: `<textarea id='tata' class='dlgTextArea' readOnly style="height:${heightVh}vh;width:${widthVw}vw">${msg}</textarea>`,
			top:top+'vh', left:left+'vw',	height:'auto', width:'auto',
		}
		this.create(options)
	},

	//hvr dialog
	hvr: function(options){
		if(this.inited===false) this.init()
		if(options.focusId===undefined)
			throw "dlgFactory.hvr() error, a focusId is required.  This indicated which ctrl should be hovered over."
		if(options.from==null) options.from='topleft'
		options.canDestroy=false	//force

		var id = 'dlg'+(++this.lastid)
		var hvr = document.createElement("DIV")
		hvr.DLGID = this.list.length
		hvr.DLGFactory = this
		hvr.DLGOptions = options
		hvr.id=id
		hvr.className='divDlg dlgHvr'
		hvr.innerHTML=options.body
		if(options.attrib){
			for(var key in options.attrib){
				if(key==='style')
					Object.assign(hvr[key], options.attrib[key])
				else
				if(key==='class' || key==='classname')
					hvr['className'] += ' '+options.attrib[key]
				else
					hvr[key] = options.attrib[key]
			}
		}
		hvr.style.display='none'
		hvr.style.position='fixed'
		hvr.style.zIndex='1500'
		hvr.style.visibility='visible'
		hvr.DLGDestroyFunc = function(boo){
			this.DLGFocused=false
			this.style.display='none'
			if(boo===true){
				hvr.DLGCtrl.DLGHvr=null
				document.body.removeChild(this)
			}
		}
		hvr.addEventListener("mouseenter", function(event){
			this.DLGFocused=true
		})
		hvr.addEventListener("mouseleave", function(event){
			this.DLGDestroyFunc(false)
			//return dlgFactory.EventStopBubbling()
		})
		document.body.appendChild(hvr)
		//
		ctrl=document.getElementById(options.focusId)
		ctrl.DLGHvr=hvr
		hvr.DLGCtrl=ctrl
		ctrl.addEventListener("mouseenter", function(event){
			var hvr = this.DLGHvr
			if(hvr==null)return
			if(hvr.style.display=='block'){	//hide hvr dlg
				//hvr.DLGDestroyFunc(false)
				return
			}
			//show hover dlg
			var pos = ui.calc.xyAbs(this)
			var ctrl = this
			var from=hvr.DLGOptions.from,x=0,y=0
			pos.top += 2
			pos.left += 1
			if(from==='topleft'){
				from ='bottomleft';	x=pos.left; y=pos.top;
			} else
			if(from==='topright'){
				from = 'bottomright';	x=pos.left +ctrl.offsetWidth; y=pos.top;
			} else
			if(from==='bottomleft'){
				from = 'topleft';	x=pos.left; y=pos.top +ctrl.offsetHeight;
			} else{
			//if(from==='bottomright'){
				from = 'topright';	x=pos.left +ctrl.offsetWidth; y=pos.top +ctrl.offsetHeight;
			}
			dlgFactory.tac({
				ctrl:hvr
			, delay:null	//not fade handling
			, from:from
			, to:{x:x, y:y}
			})
			return dlgFactory.EventStopBubbling(event)
		})
		/*ctrl.addEventListener("mouseleave", function(event){
			console.log(event.target.id)
			if(event.target.id
			&& event.target.id != this.DLGHvr.id)
				this.DLGHvr.style.display='none'
		},true)*/
		return hvr
	},

	//bubble messages
	setBblClickAction: function(str){	//what to do when bubble message clicked
		//assume str = show || none
		this.bblClickAction = str
	},
	bbl: function(msg, delay){
		//assume msg is text not html
		if(delay===undefined) delay = 6000
		var id = 'bbl'+(++this.lastid)
		var bbl = document.createElement("DIV")
		bbl.id = id
		bbl.className='divDlg divBubble'
		bbl.innerHTML = msg		//+' '+id
		bbl.dlgFactory = this
		if(this.bblClickAction==='show') {
			bbl.onclick = function(){
				this.dlgFactory.msg(this.innerHTML,"Message")
			}
		}
		bbl.bblSibling = null
		bbl.bblUpdate = function(top) {
			this.style.top = top
			if(this.bblSibling != null) {
				var nexttop = parseInt(top,10) + this.offsetHeight +10
				this.bblSibling.bblUpdate(nexttop+'px')
			}
		}
		var bbltop = '5px'
		if(this.bblLast != null){
			this.bblLast.bblSibling = bbl		//assign sibling
			bbltop = (this.bblLast.offsetTop  +this.bblLast.offsetHeight +10)+'px' 	//assign bbl.top
		}
		bbl.style.top = bbltop
		this.bblLast = bbl							//assign new last bbl div
		document.body.appendChild(bbl)
		bbl.DLGFocused = false
		bbl.DLGMouseLeaveDestroy = false
		bbl.onmouseenter = function(event){bbl.DLGFocused = true; }
		bbl.onmouseleave = function(event){
			bbl.DLGFocused = false;
			if(bbl.DLGMouseLeaveDestroy===true){	//waiting for mouse to exit before destroying
				bbl.style.opacity = 0								//fade out, then destroy
				window.setTimeout(function(){ dlgFactory.bblRemove(bbl) }, 1000) //destroy
			}
		}
		this.bblFadeIn(bbl, delay, bbltop)
	},
	/*bblPopOut: function(bbl, delay, bbltop) {
		bbl.addEventListener("transitionend", function(event) {
			console.log('end', event.propertyName)
		}, false)
		window.requestAnimationFrame(function(){
			//bbl.style.top = bbltop
			bbl.style.opacity = 1						//fade in
		})

	},*/
	bblFadeIn: function(bbl, delay, bbltop){
		window.setTimeout(function(){
			bbl.style.top = bbltop
			bbl.style.opacity = 1						//fade in
			window.setTimeout(function(){
				if(bbl.DLGFocused===true){		//don't destroy while focused
					bbl.DLGMouseLeaveDestroy=true
					return
				}
				bbl.style.opacity = 0					//fade out, then destroy
				window.setTimeout(function(){	dlgFactory.bblRemove(bbl) }, 1000)
			}, delay)
		}, 250)
	},
	bblRemove: function(bbl){
		document.body.removeChild(bbl)	//destroy
		//console.log('destroyed:', bbl.id)
		if(this.bblLast != null && this.bblLast.id === bbl.id)			//update our info
			this.bblLast = null	//no other bbl's
		if(bbl.bblSibling != null)					//update siblings position, will riple through siblings
			bbl.bblSibling.bblUpdate(bbl.style.top, bbl)
	},

	//tac dialog
	tac: function(options){
		//console.log(options)
		if(options.to===undefined) throw 'dlgFactory.tac() error, options.to.x, options.to.y missing.'
		if(options.from===undefined) throw 'dlgFactory.tac() error, options.from missing; use one of: center, topleft, topright, bottomleft, bottomright.'

		var div = null
		if(options.ctrl===undefined || options.ctrl==null){
			div = document.createElement("DIV")
			div.style.visibility='hidden'
			div.style.display='block'
			div.style.position='fixed'
			document.body.appendChild(div)
			options.ctrl=div
		}
		else {
			if(options.timer!=undefined)
				window.clearTimeout(options.timer)
			div = options.ctrl
			div.style.visibility='hidden'
			div.style.position='fixed'
			div.style.display='block'
		}
		if(options.attrib && options.attrib!=null){
			for(var key in options.attrib){
				if(key==='style')
					Object.assign(div[key], options.attrib[key])
				else
				if(key==='class' || key==='classname')
					div['className'] += ' '+options.attrib[key]
				else
					div[key] = options.attrib[key]
			}
		}
		if(options.html) div.innerHTML=options.html
		div.style.width='auto'
		div.style.height='auto'
		var x = options.to.x
		var y = options.to.y
		var w = (options.width ?options.width :div.clientWidth)
		var h = (options.height ?options.height :div.clientHeight)
		if(w>window.innerWidth) w=window.innerWidth-60
		if(h>window.innerHeight) h=window.innerHeight-60
		if(options.from==='topleft'){ /*no changes*/ }
		else
		if(options.from==='topright'){ x=x-w}
		else
		if(options.from==='bottomright'){ x=x-w; y=y-h}
		else
		if(options.from==='bottomleft'){ y=y-h}
		else
		if(options.from==='center'){ y=y-Math.round(h/2); x=x-Math.round(w/2)}
		if(x<0) x=0
		if(x>window.innerWidth) x=window.innerWidth
		if(y<0) y=0
		if(y>window.innerHeight) y=window.innerHeight
		div.style.left = x+'px'
		div.style.top = y+'px'
		div.style.height=h+'px'
		div.style.width=w+'px'

		//console.log('x', window.innerWidth,  w,options.to.x, x)
		//console.log('y', window.innerHeight, h,options.to.y, y)

		if(options.delay && options.delay>0){
			div.style.opacity = 0
			options.timer=null
			div.DLGFocused=false

			div.DLGDestroyFunc = function(boo){
				if(boo===true) options.timer=null		//delay timeout over
				if(options.timer!=null) return				//either delay or destroy timers
				if(options.destroyOpacity!=null){			//leave on screen, at low opacity
					div.style.opacity = options.destroyOpacity
					return
				}
				options.timer = dlgFactory.tacFadeOut(div)
			}
			div.onmouseenter = function(event){
				div.DLGFocused=true
				if(options.timer==null) div.style.opacity=1
			}
			div.onmouseleave = function(event){
				div.DLGFocused = false;
				div.DLGDestroyFunc(false)
			}
			options.timer=dlgFactory.tacFadeIn(div, options.delay)
		}
		div.style.visibility='visible'
		return options
	},
	tacFadeIn:function(div, delay){
		if(delay===undefined) delay=5000//ms
		div.style.transition = 'opacity 1s'
		div.style.opacity=1
		var timer = window.setTimeout(function(){	//pause for options.delay then hide div
			if(div.DLGFocused && div.DLGFocused===true)		//don't destroy while focused
				return
			div.DLGDestroyFunc(true)			//delay timeout over
		}, delay)
		return timer
	},
	tacFadeOut:function(div){
		div.style.opacity = 0
		var timer = window.setTimeout(function(){
			options.timer = null
			div.style.visibility = 'hidden'
			if(options.canDestroy!==undefined && options.canDestroy===true)
				document.body.removeChild(div) //div.remove()
		},200)
		return timer
	},

	dragStart: function(event) {	//allow dragging of windows with eyeball
		var targ	= event.target,
				parent= targ.parentNode
		targ._MAPDRAGDATA = {
			xoffset: 	event.screenX -parent.offsetLeft,			//store offset to top-left corner
			yoffset: 	event.screenY -parent.offsetTop ,
			movementY: event.movementY,
			screenY: 	event.screenY,
			clientY: 	event.clientY,
			offsetY: 	event.offsetY,
			ptop: 		parent.offsetTop
		}
		parent.style.opacity = 0.5;
		event.dataTransfer.setData('text/plain', 'Dragging ['+targ.id+']');
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.dropEffect = "move"
	},
	dragEnd: function(event) {	//allow dragging of windows with eyeball
		var targ	= event.target,
				parent= targ.parentNode,
			 	data 	= targ._MAPDRAGDATA;
		parent.style.left = (event.screenX -data.xoffset)+'px';
		parent.style.top	= (event.screenY -data.yoffset)+'px';
		parent.style.opacity = 1;
		event.stopPropagation();
		return false
	},

	init: function(){
		this.inited = true

		//1. events
		document.addEventListener('dragover', function(event){event.preventDefault(); })
		document.addEventListener('drop', function(event){event.preventDefault(); })
		///2. css
		function local_addStylesheetRules (rules) {
		  var styleEl = document.createElement('style'),
		      styleSheet;
		  document.head.appendChild(styleEl);
		  styleSheet = styleEl.sheet;
		  for (var ii in rules) {
		    styleSheet.insertRule(rules[ii], styleSheet.cssRules.length);
		  }
		}
		var rules = [
			`.dlgBase{background-color:#fff;	border: 2px solid #fff; border-radius:0.25em; outline:0; z-index:1500;}`,
			`.dlgFrm{background-color:#fff;	border:1px outset silver; border-radius:0.25em; outline:0; padding:1em; z-index:1500;}`,
			`.divDlg{ display:block; position:fixed; left:30vw; top:10vh; z-index:1500;
			background-color:#fff;	border: 2px solid #fff; border-radius:0.25em; outline:0;
			padding:0; margin:0; width: auto;
			font-family:arial; font-weight:normal; text-align:center;
			}`,
			`.dlgHeader { background-color:#0d3;	border:0;	border-radius:0.25em; color:#fff; cursor:pointer;
			 font-size:1.2em; font-weight:bold; padding:0.25em; margin:0;}`,
			`.dlgBody{border:0;	color:#222; padding:0.5em 0.5em 0em 0.5em; margin:0;
			 font-weight:normal;	font-size:1em; text-align:left; }`,
			`.dlgTextArea{ border:inset 1px silver; font-family:arial; font-size:1em; padding:0.5em; height:25vh; width:25vw; }`,
			`.dlgFooter{ background:#ffffff; border:0;	padding:0.5em 1em; margin:0; text-align:right; }`,
			`.dlgButton{ background:#0d3; border:0; cursor:pointer; color:#fff; font-size:0.8em; height:2em;}`,
			`.dlgButton:hover{ color:#272;}`,
			`.divBubble{ background-color:white; color:#333; cursor:pointer; border:2px solid #0d3; border-radius:0.8em;
				font-family:arial; font-size:1em; font-weight:normal; font-style:normal; text-align:center;
				position:fixed; left:7vw; opacity:0;  transition:top 1.5s, opacity 1s;
				max-height:60vh; overflow:hidden; width:20em; z-index:10000;	padding:0.5em; margin:0; outline:0;
			}`,
			`.dlgHvr{display:none; z-index:1500; padding:1em; position:fixed; visibility:hidden; text-align:left; }`]
		local_addStylesheetRules(rules)
	},
	EventStopBubbling:function(e) {
		if(e.preventDefault) e.preventDefault();
		if(e.stopPropagation) e.stopPropagation();
		else e.cancelBubble=true;
		return false;
	}
}
