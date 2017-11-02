/*
	last modified: 20171006

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
	- default z-index:1000

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
		onHeaderClick: function(dlg){}
		onClose:function(dlg){}
		onShow:function(dlg){}
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


	///dlgFactory.tac2()
	///		- tack html to a location on screen
	///
	var div = dlgFactory.tac2({
	, at: {x:number, y:number}	//screen coords; use either: options.at or options.to
	, to: {ctrl:HTMLElement			//adds new dlg as childnode of this eement
				,from:string					//attachment pos on ctrl, one of:[center, 'nn%nn%', topleft, topright, bottomleft, bottomright]
				,fadeDelay:number			//if(fadeDelay>=0) call: dlgFactory.hvr({parent:to.ctrl, child:div, fadeDelay:to.fadeDelay})
				}
	, from: string							// oneOf:[center, topleft, topcenter, topright, bottom..., center...]
	, canDestroy:false					//used with dlgFactory.close() to remove obj from dom
	, createHidden:false
	, html:string	|| HTMLElement	//what is displayed in dialog
	, width:number								//may be undefined
	, height:number								//may be undefined
	, attrib:{										//HTMLElement attributes assigned to div container can include events handlers
		, className:string					//optional, '_dlg' always assigned
		, style:{}									//optional, please don't use: bottom, display, height, left, right, top, visibility or width
		}
	})

	//sample code
	dlgFactory.tac2({
		at:{x:500, y:500}
	, from:'centerleft'
	,	html:document.getElementById('id')
	})
	dlgFactory.tac2({
		to:{ctrl:'.btnList',from:'topright'}
	, from:'centerleft'
	,	html:`<button class=dlgBtnList>List Item</button>`
	})
	dlgFactory.tac2({
		to:{ctrl:window,from:'center'}
	, from:'center'
	,	html:`<button class=dlgBtnList>List Item</button>`
	})
	var ed = dlgFactory.tac2({
		to:{ctrl:window,from:'25%26%'}
	, from:'center'
	, focusCtrl:'.dlgEdList'
	,	html:`<input type=edit class=dlgEdList placeholder='Enter search text' value='' autocomplete='on' autofocus=true inputmode='latin' list=null maxlength=25 >`
	, attrib:{
		style:{ backgroundColor:'#080', padding:'1em', boxShadow:'7px 7px black' }
	}
	})


	///hvr dialog
	- show a ctrl when mouse hovered over parent ctrl or the ctrl itself
	- more options at "dlgFactory.hvr = function(..."
	- example:
	dlgFactory.hvr({
		child:btnlist						//control that fades in/out with mouseover
	, childFrom:'topleft'			//attach this part of child to parent
	, fadeDelay:50						//milliseconds pause before fading out
	, fadeInOpacityMs:0				//ms to fade in; 0 = no fade
	, fadeOutOpacity:0				//0 = hide child after fadeout
	, fadeOutOpacityMs:150		//ms to fadeout; 0 = no fade
	, fadeOutWaitMs:500				//ms to wait before fadeout
	, parent:ctrl							//control that takes mouseover activation; if null child fades in/out at current location
	, parentFrom:'bottomleft'	//attach this part of parent to child
	})

	//btnList
	- create a list of buttons from an array
	- includes keyboard and mouse handling

	//openHTML
	- put html page in dlg
	- sample code:
			var dlg = dlgFactory.openHTML({
							url:url
						,	visibility:'visible'
						})


	//utilities methods
	dlgFactory.msg(msg, title)
	dlgFactory.bigText(msg, title, heightVh, widthVw)

*/
var bblDur = 4500
var hvrFadeDelay = 150
var dlgFactory = {
	list:[],
	lastid:0,
	bblLast:null,		//last bubble message created
	inited:false,
	bblClickAction:'show',

	//dlg functions
	create: function(options) {
		if(this.inited===false) this.init()

		if(options.attrib===undefined) options.attrib=null
		if(options.canDestroy===undefined) options.canDestroy=true
		if(options.createHidden===undefined) options.createHidden=false
		if(options.footerHidden===undefined) options.footerHidden=false
		if(options.headerHidden===undefined) options.headerHidden=false
		if(options.onHeaderClick===undefined) options.onHeaderClick=null
		if(options.onClose===undefined) options.onClose=null
		if(options.onDragStart===undefined) options.onDragStart=null		//onDragStart(dlg, dragtarget, dragdata); return false to cancel drag
		if(options.onDragEnd===undefined) options.onDragEnd=null				//onDragEnd(dlg, dragtarget, dragdata); return false to cancel drag
		if(options.onShow===undefined) options.onShow=null
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
				btnhtml += "<button id='btn"+(btnidx++)+"' onclick='var dlg=dlgFactory.get(\""+id+"\"); dlg.dlg.options.buttons[\""+key+"\"]( dlg, this )' class=dlgButton>"+key+"</button> "
				//btnhtml += `<button id='btn${btnidx++}' onclick='var dlg=dlgFactory.get("${id}"); dlg.dlg.options.buttons["${key}"]( dlg, this )' class=dlgButton>${key}</button> `
			}
		}
		var	left=(options.left ?";left:"+options.left :''),
			top	=(options.top ?options.top :'10em'),
			height=(options.height ?options.height :'auto'),
			width=(options.width ?options.width :'auto'),
			hdrclick = (options.onHeaderClick===null ?'' :'onclick="dlgFactory.hdrClick(\''+id+'\')"')
			html = "\
		<div id=hdr class=dlgHeader draggable=true ondragstart='dlgFactory.dragStart(event)' ondragend='dlgFactory.dragEnd(event)'	\
		 "+hdrclick+" ondblclick='dlgFactory.close(\""+id+"\")' style='display:"+(options.headerHidden===false ?'block' :'none')+"'> "
			+options.title+" </div> \
		<div id=bdy"+id+" class=dlgBody>"+options.body+"</div>	\
		<div id=ftr"+id+" class=dlgFooter style='display:"+(options.footerHidden===true ?"none" :"block")+"' >"
			+btnhtml+" <button id=btnClose onclick='dlgFactory.close(\""+id+"\")' class=dlgButton style='display:"+(btnCloseHide===true ?'none' :'inline')+"'>Close</button>	\
		</div>"
			var dlg = document.createElement("DIV")
			dlg.id = id
			dlg.className='divDlg'
			dlg.style += left+";top:"+top+";width:"+width+";height:"+height+";display:block;visibility:hidden;"
			dlg.innerHTML = html
			dlg.dlg = {
				id: this.list.length
			,	options: options
			,	focused: false	//set in mouseEner/mouseLeave
			}
			if(options.attrib!=null){
				for(var key in options.attrib){
					if(key==='style')
						Object.assign(dlg[key], options.attrib[key])
					else
					if(key.indexOf('class')===0 && (key.toLowerCase()==='classname' || key==='class'))
						dlg['className'] += ' '+options.attrib[key]
					else
						dlg[key] = options.attrib[key]
				}
				options.attrib=null	//only apply once
			}
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
				if(ctrl!=null){
					ctrl.focus()
					if(ctrl.nodeName==='INPUT')
						ctrl.select()
				}
			}
			return dlg
	},
	hdrClick: function(dlgid){
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
		dlg.dlg.options.onHeaderClick(dlg)
	},
	btnDefault: function(dlg){	//excute the default button function
		if(!dlg.dlg.options
			|| !dlg.dlg.options.buttons
			|| !dlg.dlg.options.buttons.default
		) return
		var key = dlg.dlg.options.buttons.default
		if(dlg.dlg.options.buttons[key] !== undefined)
			dlg.dlg.options.buttons[key](dlg, key)		//activate button function
		else {
			if(key[0] != '#') key='#'+key
			var ctrl = dlg.querySelector(key)		//assume key is control id
			if(ctrl==null) return
			ctrl.click()
		}
	},
	get: function(dlgid){
		for(var ii=0; ii < this.list.length; ii++){
			var dlg = this.list[ii]
			if(dlg==null) continue //deleted item
			if(dlg.id===dlgid) return dlg
		}
		return false
	},
	getDlgParent: function(ctrl){  //based on: className.contains(divDlg)
		//find dlg in parent heirarchy
		while(ctrl!=null && ctrl.nodeName!='BODY'){
			if(ctrl.className && ctrl.className.indexOf('divDlg')>=0)
				return ctrl
			ctrl = ctrl.parentNode
		}
		return false
	},
	//
	show: function(dlgid, focusid){
		var dlg = ui.calc.ctrlFromStr(dlgid)
		if(dlg==null) return false
		if(dlg.dlg && dlg.dlg.options	&& dlg.dlg.options.onShow!=null)
			dlg.dlg.options.onShow(dlg)
		else
			dlg.style.display='block'
		//dlg.style.opacity = 1
		if(focusid != null){
			var focusctrl = null
			if(typeof focusid === 'string'){
				if(focusid[0]!='#'
				&& focusid[0]!='.') focusid='#'+focusid
				focusctrl = dlg.querySelector(focusid)		//assume key is control id
			} else
				focusctrl = focusid
			focusctrl.focus()
		}
		return dlg
	},
	close: function(dlgid, force){
		if(force==null) force=false
		var dlg = null
		if(typeof dlgid === 'number')
			dlg = this.get(dlgid)
		else
			dlg = ui.calc.ctrlFromStr(dlgid)
		if(dlg==false) return

		var options = (dlg.dlg ?dlg.dlg.options :null)
		if(options){
		  if(options.onClose!=null)
				options.onClose(dlg, force)
			else
				dlg.style.display = 'none'
			if(options.canDestroy==false && force===false)
				return
			if(dlg.dlg.id)
				delete(this.list[dlg.dlg.id])	//ok to leave holes in list
		}
		else{
			dlg.style.display = 'none'
			if(force===false) return
		}
		//console.log('remove:', dlg, dlg.parentNode)
		if(dlg.parentNode!=null)
			dlg.parentNode.removeChild(dlg)
	},
	//util dlgs
	msg: function(msg, title, options){
		if(options===undefined) options = {}
		//var options = {
		options.title=(title===undefined ?"Message" :title)
		if(options.attrib==null) options.attrib={}
		if(options.attrib.style==null) options.attrib.style={}
		options.attrib.style.zIndex=1500
		options.body=msg
		options.canDestroy=true
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
			body: "<textarea id='tata' class='dlgTextArea' readOnly style='height:"+heightVh+"vh;width:"+widthVw+"vw'>"+msg+"</textarea>",
			top:top+'vh', left:left+'vw',	height:'auto', width:'auto',
		}
		this.create(options)
	},
	//bubble messages
	setBblClickAction: function(str){	//what to do when bubble message clicked
		//assume str = show || none
		this.bblClickAction = str
	},
	bbl: function(msg, delay){
		if(this.inited===false) this.init()

		//assume msg is text not html
		if(delay===undefined) delay = 6000
		var id = 'bbl'+(++this.lastid)
		var bbl = document.createElement("DIV")
		bbl.id = id
		bbl.className='divDlg divBubble'
		bbl.innerHTML = msg		//+' '+id
		//bbl.dlgFactory = this
		bbl.dlg={
			focused:false
		, onLeaveDestroy:false
		}
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
		//bbl.dlg.focused = false
		//bbl.DLGMouseLeaveDestroy = false
		bbl.onmouseenter = function(event){bbl.dlg.focused = true; }
		bbl.onmouseleave = function(event){
			bbl.dlg.focused = false;
			if(bbl.dlg.onLeaveDestroy===true){	//waiting for mouse to exit before destroying
				bbl.style.opacity = 0								//fade out, then destroy
				window.setTimeout(function(){ dlgFactory.bblRemove(bbl) }, 1000) //destroy
			}
		}
		this.bblFadeIn(bbl, delay, bbltop)
	},
	bblFadeIn: function(bbl, delay, bbltop){
		window.setTimeout(function(){
			bbl.style.top = bbltop
			bbl.style.opacity = 1						//fade in
			window.setTimeout(function(){
				if(bbl.dlg.focused===true){		//don't destroy while focused
					bbl.dlg.onLeaveDestroy=true
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
			".dlgBase{background-color:#fff;	border: 2px solid #fff; border-radius:0.25em; outline:0; z-index:1000;}",
			".dlgFrm{background-color:#fff;	border:1px outset silver; border-radius:0.25em; outline:0; padding:1em; z-index:1000;}",
			".divDlg{ display:block; position:fixed; left:30vw; top:10vh; z-index:1000; \
			background-color:#fff;	border: 2px solid #fff; border-radius:0.25em; outline:0; \
			padding:0; margin:0; width: auto;	font-family:arial; font-weight:normal; text-align:center; }",
			".dlgHeader { background-color:#0d3;	border:0;	border-radius:0.25em; color:#fff; cursor:pointer; font-size:1.2em; font-weight:bold; padding:0.25em; margin:0;}",
  	//		".dlgBody{border:0;	color:#222; padding:0.5em 0.5em 0em 0.5em; margin:0; font-weight:normal;	font-size:1em; text-align:left; }",
			".dlgBody{ width:auto; height:95%; height:calc(100% - 5em); border:0;	color:#222; padding:0.5em 0.5em 0em 0.5em; margin:0; font-weight:normal;	font-size:1em; text-align:left; }",
			".dlgTextArea{ border:inset 1px silver; font-family:arial; font-size:1em; padding:0.5em; height:25vh; width:25vw; }",
			".dlgFooter{ background:#ffffff; border:0;	padding:5px 1em 0.5em 1em; margin:0; text-align:right; }",
			".dlgButton{ background:#0d3; border:0; cursor:pointer; color:#fff; font-size:0.8em; height:2em;}",
			".dlgButton:hover{ color:#272;}",
			".divBubble{ background-color:#0d3; color:#fff; cursor:pointer; border:2px solid #0d3; border-radius:0.8em; \
				font-family:arial; font-size:1em; font-weight:normal; font-style:normal; text-align:center; \
				position:fixed; left:7vw; opacity:0;  transition:top 1.5s, opacity 1s; \
				max-height:60vh; overflow:hidden; width:20em; z-index:10000;	padding:0.5em; margin:0; outline:0;	}",
			".dlgHvr{display:none; z-index:1000; padding:1em; position:fixed; visibility:hidden; text-align:left; }"]
		local_addStylesheetRules(rules)
	},
	dragStart: function(event) {	//allow dragging of windows with eyeball
		var targ	= event.target,
				parent= targ.parentNode
		//if(targ.dlg==null) parent=targ
		targ._DLGDRAGDATA = {
			xoffset: 	event.screenX -parent.offsetLeft,			//store offset to top-left corner
			yoffset: 	event.screenY -parent.offsetTop ,
			movementY: event.movementY,
			screenY: 	event.screenY,
			clientY: 	event.clientY,
			offsetY: 	event.offsetY,
			ptop: 		parent.offsetTop
		}
		//if(targ.dlg!=null) parent.style.opacity = 0.5;
		if(parent.dlg && parent.dlg.options.onDragStart != null){
			if(false===parent.dlg.options.onDragStart(parent, targ, targ._DLGDRAGDATA))
				return ui.eventStop(event)
		}
		event.dataTransfer.setData('text/plain', 'Dragging ['+targ.id+']');
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.dropEffect = "move"
	},
	dragEnd: function(event) {	//allow dragging of windows with eyeball
		var targ	= event.target,
				parent= targ.parentNode,
			 	data 	= targ._DLGDRAGDATA;
		//if(targ.dlg!=null) parent=targ
		parent.style.bottom='auto';
		parent.style.right='auto';
		parent.style.left = (event.screenX -data.xoffset)+'px';
		parent.style.top	= (event.screenY -data.yoffset)+'px';
		parent.style.opacity = 1;
		if(parent.dlg && parent.dlg.options.onDragEnd != null){
			parent.dlg.options.onDragEnd(parent, targ, targ._DLGDRAGDATA)
		}
		event.stopPropagation();
		return false
	},
	EventStopBubbling:function(e) {
		if(e.preventDefault) e.preventDefault();
		if(e.stopPropagation) e.stopPropagation();
		else e.cancelBubble=true;
		return false;
	}
}

dlgFactory.fadeIn = function(div, opacityMs, fadeOutOpacity, fadeOutOpacityMs, fadeOutWaitMs){
	if(opacityMs===undefined) opacityMs=1
	if(fadeOutOpacity===undefined) fadeOutOpacity=null
	if(fadeOutOpacityMs===undefined) fadeOutOpacityMs=null
	if(fadeOutWaitMs===undefined) fadeOutWaitMs=null
	if(div.dlg===undefined) div.dlg = {}
	if(div.dlg.timer!==null){
		window.clearTimeout(div.dlg.timer)
		div.dlg.timer=null
	}
	div.style.transition = `opacity ${opacityMs}ms`
	div.style.opacity=1
	div.style.display='block'
	div.style.visibility='visible'
	if(fadeOutWaitMs===null) return
	dlgFactory.fadeOut(div, fadeOutOpacity, fadeOutOpacityMs, fadeOutWaitMs)
}
dlgFactory.fadeOut = function(div, opacity, opacityMs, waitMs, force){
	if(opacity==null) opacity=0
	if(opacityMs===undefined) opacityMs=500	//hvrFadeDelay
	if(waitMs===undefined) waitMs=0
	if(force===undefined) force=false				//onClose() force destroy
	if(div.dlg===undefined) div.dlg = {}
	if(div.dlg.timer!==null){
		window.clearTimeout(div.dlg.timer)
		div.dlg.timer=null
	}
	div.dlg.fadeOutForce = force
	if(waitMs===0){																			//destroy immediately
		div.style.transition = `opacity ${opacityMs}ms`
		div.style.opacity = opacity
		if(opacity===0){	//remove from object model
			div.dlg.timer = window.setTimeout(function(){
				div.dlg.timer = null
				div.style.display='none'
				if(div.dlg.fadeOutForce===true)
					if(div.parentNode)
						div.parentNode.removeChild(div)
		 	}, opacityMs)
		}
		return true
	}
	div.dlg.timer = window.setTimeout(function(){	//delay before destroy
		div.dlg.timer = null
		if(div.dlg.focused && div.dlg.focused===true){		//don't destroy while focused
			div.dlg.leaveFadeOut=true	//div has mouseover/mouseout to handle this
			return
		}
		dlgFactory.fadeOut(div, opacity, opacityMs, 0, div.dlg.fadeOutForce)
	},waitMs)
	return div.dlg.timer
}
dlgFactory.hvr = function(options){
	if(this.inited===false) this.init()

	//if(options.parent==null) throw `dlgFactory.hvr() error, parent is null.`
	if(options.child==null) throw `dlgFactory.hvr() error, child is null.`
	if(options.fadeInOpacityMs===undefined) options.fadeInOpacityMs=0
	if(options.fadeOutOpacity===undefined) options.fadeoutOpacity=0
	if(options.fadeOutOpacityMs===undefined) options.fadeoutOpacityMs=hvrFadeDelay
	if(options.fadeOutWaitMs===undefined) options.fadeOutWaitMs=0
	if(options.onShow===undefined) options.onShow=null			//parent.mouseenter(event){ if(onShow(options,event)===false) return }
	if(options.parentFrom===undefined) options.parentFrom=null
	if(options.childFrom===undefined) options.childFrom=null

	options.parent = ui.calc.ctrlFromStr(options.parent)
	options.child = ui.calc.ctrlFromStr(options.child)
	var parent = options.parent
	var child = options.child
	var opts = options

	if(parent != null) {		//parent===null => hover in place
		if(parent.id=='') parent.id = 'hvrPa'+(++this.lastid)
		if(parent.dlg==null) parent.dlg={ options:{} }
		parent.dlg.hvrChild = options.child
		options.child.style.position='fixed'
		//parent.dlg.hvrOptions = options
		parent.addEventListener('mouseenter', (event) => {
			if(opts.parentFrom != null && opts.childFrom != null){	//re-position child?
				dlgFactory.tac2({
					to:{ctrl:parent,from:opts.parentFrom}
				, from:opts.childFrom
				,	html:child
				})
			}
			if(opts.onShow!=null){																	//confirm?
				if(false===opts.onShow(opts,event)) return
			}
			dlgFactory.fadeIn(child,opts.fadeInOpacityMs)						//display child
		})
		parent.addEventListener('mouseleave', (event) => {
			//dlgFactory.fadeOut(child,child.dlg.fadeDelay,false,event)
			dlgFactory.fadeOut(child,opts.fadeOutOpacity, opts.fadeOutOpacityMs, opts.fadeOutWaitMs)
		})
	}

	if(child.id=='') child.id = 'hvrCh'+(++this.lastid)
	if(child.dlg==null) child.dlg={ options:{ canDestroy:false }}
	child.dlg.hvrParent = options.parent
	//child.dlg.hvrOptions = options
	//
	child.dlg.leaveFadeOut=false			//true when focused=true and timer!=null
	child.dlg.focused=false
	child.onmouseenter = function(event){
		child.dlg.focused=true
	}
	child.onmouseleave = function(event){
		child.dlg.focused=false
		dlgFactory.fadeOut(child, opts.fadeOutOpacity, opts.fadeOutOpacityMs, opts.fadeOutWaitMs)
	}
}
dlgFactory.tac2 = function(options){	//tac2  - tack html to screen or control
	if(this.inited===false) this.init()

	if(options.at==undefined
	&& options.to==undefined) throw 'dlgFactory.tac2() error, neither options.to  nor options.at provided.'
	if(options.to && options.to.ctrl===undefined) throw 'dlgFactory.tac2() error, options.to.ctrl  not provided.'
	if(options.html==null) throw 'dlgFactory.tac2() error, options.html not provided, expect ctrl or html string.'

	if(options.to && options.to.from===undefined) options.to.from='topleft'
	if(options.to && options.to.fadeDelay===undefined) options.to.fadeDelay=null
	if(options.from===undefined) options.from='topleft'
	if(options.createHidden===undefined) options.createHidden=false			//use when typeof(options.html)===string
	if(options.focusCtrl!==undefined) options.focusCtrl=null
	if(options.maxHeightNone===undefined) options.maxHeightNone=false		//if false div...maxHeight = div...height
	if(options.maxWidthNone===undefined) options.maxWidthNone=false			//if false div...maxWidth = div...width

	var div = null
	if(typeof options.html == 'string'){
		div = document.createElement("DIV")
		div.id = 'dlg'+(++this.lastid)
		div.dlg = {options:options}
		div.style.visibility='hidden'
		div.style.display='block'
		div.innerHTML=options.html
		if(options.to && options.to.append===true)
			options.to.ctrl.appendChild(div)
		else{
			div.style.position='fixed'
			document.body.appendChild(div)
		}
		options.html=div
	}
	else {
		div = options.html
		div.style.visibility='hidden'
		if(options.from!=='append')
			div.style.position='fixed'
		div.style.display='block'
	}
	if(options.attrib!=null){
		for(var key in options.attrib){
			if(key==='style')
				Object.assign(div[key], options.attrib[key])
			else
			if(key==='className')
				div['className'] += ' '+options.attrib[key]
			else
				div[key] = options.attrib[key]
		}
		options.attrib=null	//only apply once
	}
	div.style.width='auto'
	div.style.height='auto'

	//get starting x,y
	var x=null,	y=null
	if(options.at!==undefined){
		x = options.at.x
		y = options.at.y
	}
	else { //process options.to
		var ctrl=ui.calc.ctrlFromStr(options.to.ctrl)
		var at = ui.calc.xyOffset(ctrl, options.to.from)
		x = at.x
		y = at.y
	}
	//position new div
	var top='auto', left='auto', right='auto', bottom='auto'
	var w = (options.width ?options.width :div.offsetWidth)
	var h = (options.height ?options.height :div.offsetHeight)
	if(w>window.innerWidth) w=Math.round(window.innerWidth *0.66)
	if(h>window.innerHeight) h=Math.round(window.innerHeight *0.66)

	if(options.from!=='append'){
		if(options.from.indexOf('top') ===0){
			top = y
		} else
		if(options.from.indexOf('bottom') ===0){
			//bottom=(window.innerHeight-y-2)
			bottom=(window.innerHeight-y)
			if(bottom<0) bottom=0
		} else
		if(options.from==='center'
		|| options.from.indexOf('center') ===0){
			top = (y-Math.round(h/2));
		}
		//
		if(options.from.indexOf('left') >0){
			left= x;
		} else
		if(options.from.indexOf('right') >0){
			//right = (window.innerWidth-x-2)
			right = (window.innerWidth-x)
			if(right<0) right=0
		} else
		if(options.from==='center'
		|| options.from.lastIndexOf('center') >0){
			left =(x-Math.round(w/2))
		}
	}//  options.from != append
	if(top !='auto'){
		if(top<0)	top='0px'
		if(top>window.innerHeight) top='0px'
		else
			top=top+'px'
	}
	if(bottom !='auto'){
		if(bottom<0) bottom=window.innerHeight+'px'
		if(bottom>window.innerHeight) bottom=window.innerHeight+'px'
		else
			bottom=bottom+'px'
	}
	if(left	!='auto'){
		if(left<0) 	left='0px'
		else
		if(left>window.innerWidth) 	left='0px'
		else
			left=left+'px'
	}
	if(right !='auto'){
		if(right<0) 	right='0px'
		else
		if(right>window.innerWidth)	right=window.innerWidth+'px'
		else
			right=right+'px'
	}
	div.style.top=top
	div.style.bottom=bottom
	div.style.left=left
	div.style.right=right
	if(options.from!=='append'){
		if(options.maxHeightNone===true)
			div.style.maxHeight='none'
		else
			div.style.maxHeight=h+'px'
		if(options.maxWidthNone===true)
			div.style.maxWidth='none'
		else
			div.style.maxWidth=w+'px'
	}
	if(options.createHidden===true)
		div.style.display='none'
	div.style.visibility='visible'
	if(options.to && options.to.fadeDelay!==null){
		dlgFactory.hvr({
			parent:options.to.ctrl
		, child:div
		, fadeOutWaitMs:options.to.fadeDelay
		, parentFrom:options.to.from
		, childFrom:options.from
		})
	}
	if(options.focusCtrl!=null){
		var ctrl = ui.calc.ctrlFromStr(options.focusCtrl)
		if(ctrl!=null) ctrl.focus()
	}
	return div
}
dlgFactory.btnList = function(options){
	options.parent = ui.calc.ctrlFromStr(options.parent)
	if(options.parent==null) throw "dlgFactory.btnList() options.parent is not provided."
	if(options.list==null || options.list.length==0) throw "dlgFactory.btnList() options.list is not provided."
	if(options.parent.dlg==null) options.parent.dlg = {}
	if(options.parentAppend==null) options.parentAppend = false
	if(options.parentFrom==null) options.parentFrom = 'centerright'
	if(options.attrib==null) options.attrib = null
	if(options.canDestroy==null) options.canDestroy = false
	if(options.createHidden==null) options.createHidden = false
	if(options.className==null) options.className = 'dlgBtnList'
	if(options.childDisplayCss==null) options.childDisplayCss = 'block'
	if(options.fadeDelay===undefined) options.fadeDelay = null
	if(options.focusCtrl==null) options.focusCtrl = ''
	if(options.from==null) options.from = 'centerleft'

	if(options.idPrefix==null) options.idPrefix= 'btnDlg'
	if(options.maxWidthNone===undefined) options.maxWidthNone=false
	if(options.maxHeightNone===undefined) options.maxHeightNone=false
	if(options.onClose===undefined) options.onClose=null
	//parent handlling
	//list handlling
	var html = ''
			, classHover = (options.className+'Hover')
			, classSelect = (options.className+'Select')
	for(var ii=0; ii<options.list.length; ii++){
		html += `<button id='${options.idPrefix +ii}' class='${options.className}' onclick='this.parentNode.dlg.btnItemSelect(this)'>${options.list[ii]}</button>`
		//html += `<div id='${options.idPrefix +ii}' class='${options.className}' onclick='this.parentNode.dlg.btnItemSelect(this)'>${options.list[ii]}</div>`
	}
	var btnList = dlgFactory.tac2({
		to:{ ctrl:options.parent
			 , append:options.parentAppend
			 , from:options.parentFrom
			 , fadeDelay:options.fadeDelay
		 }
	, from:options.from
	, canDestroy:options.canDestroy
	, createHidden:options.createHidden
	,	html:html
	, attrib:options.attrib
	, maxHeightNone:options.maxHeightNone
	, maxWidthNone:options.maxWidthNone
	, onClose:function(div, force){
			if(options.onClose!=null) options.onClose(div)
			for(var ii=0; ii < div.children.length; ii++){
				var child = div.children[ii]
				if(child.style)
					child.style.display='none'
				//attached to div:
				if(force===true || options.canDestroy===true)
					div.removeChild(child)
			}
			div.style.display='none'
			/*if(force===true || options.canDestroy===true){
				console.log('Destroy:', div.id)
				document.body.removeChild(div)
			}*/
		}
	, onShow:function(div){
			//console.log('dlgFactory.btnList.onShow()', div.id)
			for(var ii=0; ii < div.children.length; ii++){
				var child = div.children[ii]
				if(child.dlg===undefined) child.dlg={}
				child.style.display=options.childDisplayCss
			}
			//div.style.display='block'
			dlgFactory.tac2({
				to:{ ctrl:options.parent
					 , append:options.parentAppend
					 , from:options.parentFrom
					 , fadeDelay:options.fadeDelay
				}
			, from:options.from
			,	html:div
			})
			//if(btnList.dlg.btnSelected!=null)
				//btnList.dlg.btnItemSelect(btnList.dlg.btnSelected)
			if(btnList.dlg.btnActive!=null)
				btnList.dlg.btnItemActive(btnList.dlg.btnActive)
			if(options.onShow) options.onShow(div)
		}
	})

	btnList.dlg.options.list=options.list
	btnList.dlg.btnActive=null
	btnList.dlg.btnSelected=null
	btnList.dlg.btnItemActive = function(btn){
		var dlg= btnList.dlg
		if(dlg.btnActive!=null
		&& dlg.btnActive.id === btn.id) return
		//var nm = btn.innerHTML
		var nm = btn.innerText
			, idx = options.list.indexOf(nm)
		if(dlg.btnActive!=null)		//disable current selection
			ui.calc.classRemove(dlg.btnActive,classHover)
		dlg.btnActive = btn				//enable new selection
		ui.calc.classAdd(btn,classHover)
		btn.focus()
		if(options.onHover)					//notify parent
			options.onHover(btn, nm, idx, options.list)
	}
	btnList.dlg.btnItemSelect = function(btn){
		var dlg= btnList.dlg
			//, nm = btn.innerHTML
			, nm = btn.innerText
			, idx = options.list.indexOf(nm)
		if(dlg.btnSelected!=null)		//disable current selection
			ui.calc.classRemove(dlg.btnSelected,classSelect)
		dlg.btnSelected = btn				//enable new selection
		ui.calc.classAdd(btn,classSelect)
		btn.focus()
		if(options.onSelect)					//notify parent
			options.onSelect(btn, nm, idx, options.list)
	}
	btnList.dlg.toggle = function(show){
		//console.log('btnlist.dlg.toggle', btnList.id)
		if(show===true
		|| btnList.style.display=='none')
			dlgFactory.show(btnList, btnList.dlg.btnActive)
		else
			dlgFactory.close(btnList)
	}
	btnList.dlg.toggleItem = function(btn,fwd){
		var next = null
		if(fwd===false){
			next = btn.previousSibling
			if(next==null)
				next = btn.parentNode.children[(btn.parentNode.children.length -1)]
		}else
		if(fwd===true){
			next = btn.nextElementSibling
			if(next==null)
				next = btn.parentNode.children[0]
		}else{
			next = btn
		}
		btnList.dlg.btnItemActive(next)
	}
	btnList.addEventListener('mouseover', function(event){
		if(event.target.nodeName != 'BUTTON') return
		btnList.dlg.btnItemActive(event.target)
	})
	btnList.addEventListener('keydown', function(event){
		var dlg = btnList.dlg

		if(event.target.nodeName=='BUTTON'){
			switch (event.key) {
			case "ArrowDown":
				dlg.toggleItem(event.target, true)
				return dlgFactory.EventStopBubbling(event)
			case "ArrowUp":
				dlg.toggleItem(event.target, false)
				return dlgFactory.EventStopBubbling(event)
			case "Tab":
				if(event.shiftKey===true)
					dlg.toggleItem(event.target, false)
				else
					dlg.toggleItem(event.target, true)
				return dlgFactory.EventStopBubbling(event)
			}
		}

		switch (event.key) {
		case "Escape":
			//console.log("Escape", options.parent.id)
			dlgFactory.close(this)		//this=btnList
			dlgFactory.show(options.parent.parentNode)	//options.parent.parentNode===options.button.div;
			return dlgFactory.EventStopBubbling(event)
		case "Enter":
			if(event.target.nodeName!=='BUTTON') {
				//console.log('enter not on button')
				return
			}
			btnList.dlg.btnItemSelect(event.target)
			return dlgFactory.EventStopBubbling(event)
		}
	})
	options.parent.dlg.btnList = btnList
	btnList.dlg.toggleItem(btnList.childNodes[0])
	return btnList	//options.parent	//div
}
dlgFactory.openHTML=function(options){
	options.height=(options.height ?options.height :'50em')
	options.width=(options.width ?options.width :'50em')

	var html = `<iframe frameborder="0" allowfullscreen
				id="ifr"+(++this.lastid)
				src="${options.url}"
				style="height:100%; width:100%; margin:0 auto;"
				></iframe> `
				//style="height:${hh}px;width:${options.width}px;margin:0 auto;"></iframe> `
	var div=dlgFactory.create({
			title:(options.title ?options.title :'Untitle')
		, headerHidden:false
		, footerHidden:false
		, title:options.url
		,	focusId: '#btnClose'
		,	body:html
		, height:options.height
		, width:options.width
		, top:'5em'
		, onShow:function(div){
				div.style.display='block'
				//console.log('ifr show')
		}
	})
	div.style.resize='both'
	div.style.overflow='hidden'
	//div.style.border='1px solid black'
	/*div.addEventListener('drag', function(event){
		console.log('resize')
	})
	div.onload = function(event){
		console.log('resize2')
	}*/
	//no affect: div.querySelector('#btnClose').focus()
	return div
}
