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
		onClose():function(dlg){}
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
	dlgFactory.hvr({
	, on: {ctrl:HTMLElement			//adds new dlg as childnode of this eement
				,from:string					//oneOf:[center, topleft, topright, bottomleft, bottomright]
				}
	, from: string							// oneOf:[center, topleft, topright, bottomleft, bottomright]
	,	delay: int									//seconds to display, if 0 dlg is not auto-destroyed
	, destroyOpacity:number				//on options.delay.end, div.style.opacity=options.destroyOpacity
	, html:string	|| HTMLElement	//what is displayed in dialog
	, height:number								//all below are optonal
	, width:number
	, onClose:function(dlg, event){}
	, onOpen: function(){dlg){}
	, attrib:{										//HTML attributes assigned to div container can include event handlers
		}
	})

	//sample code
	var hvr = dlgFactory.hvr({
		on: {ctrl:'btn0', from:'bottomleft'}
	, delay:hvrDelay
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
	, at: {x:number, y:number}	//screen coords; use either: options.at or options.to
	, to: {ctrl:HTMLElement			//adds new dlg as childnode of this eement
				,from:string					//oneOf:[center, topleft, topright, bottomleft, bottomright]
				, hover:false					//onmouseover=fadein new div ; onmouseleave= hvrFadeDelay then fadeout div new
				}
	, from: string							// oneOf:[center, topleft, topright, bottomleft, bottomright]
	//
	,	canDestroy:true							//if true dlg is removed from DOM after delay ms
																//if false, set style.display=none after delay
	, createHidden:false
	,	delay: int									//seconds to display, if null/undefined no delay handling
	, destroyOpacity:number				//on options.delay.end, div.style.opacity=options.destroyOpacity
	, html:string	|| HTMLElement	//what is displayed in dialog
	, width:number								//may be undefined
	, height:number								//may be undefined
	, attrib:{										//HTMLElement attributes assigned to div container can include events handlers
		, className:string					//optional, '_dlg' always assigned
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
var bblDur = 4500
var hvrFadeDelay = 250
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
		if(options.onHeaderClick===undefined) options.onHeaderClick=null
		if(options.onClose===undefined) options.onClose=null
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
				btnhtml += "<button id='btn"+(btnidx++)+"' onclick='var dlg=dlgFactory.get(\""+id+"\"); dlg.DlgOptions.buttons[\""+key+"\"]( dlg, this )' class=dlgButton>"+key+"</button> "
				//btnhtml += `<button id='btn${btnidx++}' onclick='var dlg=dlgFactory.get("${id}"); dlg.DlgOptions.buttons["${key}"]( dlg, this )' class=dlgButton>${key}</button> `
			}
		}
		var	left=(options.left ?";left:"+options.left :''),
			top	=(options.top ?options.top :'25vh'),
			height=(options.height ?options.height :'auto'),
			width=(options.width ?options.width :'auto'),
			hdrclick = (options.onHeaderClick===null ?'' :'onclick="dlgFactory.hdrClick(\''+id+'\')"')
			html = "\
<div id=hdr${id} class=dlgHeader draggable=true ondragstart='dlgFactory.dragStart(event)' ondragend='dlgFactory.dragEnd(event)'	\
 "+hdrclick+" ondblclick='dlgFactory.close(\""+id+"\")' style='display:"+(options.headerHidden===false ?'block' :'none')+"'> "
	+options.title+" </div> \
<div id=bdy"+id+" class=dlgBody>"+options.body+"</div>	\
<div id=ftr"+id+" class=dlgFooter>"
	+btnhtml+" <button id=btnClose onclick='dlgFactory.close(\""+id+"\")' class=dlgButton style='display:"+(btnCloseHide===true ?'none' :'inline')+"'>Close</button>	\
</div>"
		var dlg = document.createElement("DIV")
		dlg.id = id
		dlg.className='divDlg'
		dlg.style += left+";top:"+top+";width:"+width+";height:"+height+";display:block;visibility:hidden;"
		dlg.innerHTML = html
		dlg.DLGID = this.list.length
		dlg.DLGFactory = this
		dlg.DlgOptions = options
		dlg.DlgFocused = false	//set in mouseEner/mouseLeave
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

		dlg.style.display = 'none'
		if(dlg.DlgOptions.onClose!=null)
			dlg.DlgOptions.onClose(dlg)
		if(dlg.DlgOptions.canDestroy===false)
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
		dlg.DlgOptions.onHeaderClick(dlg)
	},
	btnDefault: function(dlg){	//excute the default button function
		if(!dlg.DlgOptions
			|| !dlg.DlgOptions.buttons
			|| !dlg.DlgOptions.buttons.default
		) return
		var key = dlg.DlgOptions.buttons.default
		if(dlg.DlgOptions.buttons[key] !== undefined)
			dlg.DlgOptions.buttons[key](dlg, key)		//activate button function
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
			//left:'40vw',
			//width:'20vw'
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
			body: "<textarea id='tata' class='dlgTextArea' readOnly style='height:"+heightVh+"vh;width:"+widthVw+"vw'>"+msg+"</textarea>",
			top:top+'vh', left:left+'vw',	height:'auto', width:'auto',
		}
		this.create(options)
	},

	//hvr dialog v2
	hvr: function(options){
		if(this.inited===false) this.init()
		if(options.on==undefined) throw 'dlgFactory.hvr() error, options.on  not found.'

		if(options.on.from===undefined) options.on.from='topleft'
		if(options.from===undefined) options.from='topleft'

		var ctrl=ui.calc.ctrlFromStr(options.on.ctrl)
		options.on.ctrl=ctrl
		ctrl.DlgHvr=null				//created on first use
		ctrl.DlgHvrActive=false	//true when ctrl.DlgHvr.style.display==='block'
		ctrl.DlgHovering=false	//true when ctrl.DlgHvr.DLGFocused === true
		ctrl.addEventListener('mouseenter', (event) => {
			var ctrl=ui.calc.ctrlFromStr(options.on.ctrl)
			var pos = ui.calc.xyAbs(ctrl)
			//var rec = div.getBoundingClientRect()
			var x=0, y=0
			if(options.on.from.indexOf('top') >=0)
				y=pos.top;
			if(options.on.from.indexOf('bottom') >=0)
				y=pos.top +ctrl.offsetHeight;
			if(options.on.from.indexOf('center')===0)
				y=pos.top +Math.round(ctrl.offsetHeight/2);
			if(options.on.from.indexOf('left') >=0)
				x=pos.left
			else
			if(options.on.from.indexOf('right') >=0)
				x=pos.left +ctrl.offsetWidth
			else
			if(options.on.from.indexOf('center')>0)
				x=pos.left +Math.round(ctrl.offsetWidth/2)
			//only first call creates dlg
			var div = dlgFactory.tac({
				at:{x:x, y:y}
			//, canDestroy:false
			//, delay:options.delay
			, from:options.from
			,	html:(ctrl.DlgHvr==null ?options.html :ctrl.DlgHvr)
			, attrib:(ctrl.DlgHvr==null ?options.attrib :null)
			})
			if(ctrl.DlgHvr==null){
				ctrl.DlgHvr=div
				div.DlgOptions=options
				div.DLGLeaveFadeOut=false			//true when focused=true and timer=null
				div.onmouseenter = function(event){
					div.DLGFocused=true
					ctrl.DlgHovering=true
					if(this.DlgOptions.timer!==null)return
					div.style.opacity=1
				}
				div.onmouseleave = function(event){
					this.DLGFocused=false
					ctrl.DlgHovering=false
					this.DLGDestroy(false, event)	//process destroy logic in destroy func
				}
				div.DLGDestroy = function(force, event){
					if(force===false && this.DlgOptions.timer!=null) return			//either delay or destroy timers
					if(force===false && this.DLGLeaveFadeOut===true){
						this.DLGLeaveFadeOut=false
						dlgFactory.tacFadeOut(this,0,false,event)
						return
					}
					ctrl.DlgHvrActive=false
					if(force===true
					||(this.DlgOptions.canDestroy!==undefined && this.DlgOptions.canDestroy===true)){
						if(this.DlgOptions.timer!=null)		//force timeout to end
							window.clearTimeout(this.DlgOptions.timer)
						this.DlgOptions.timer=null
						document.body.removeChild(this) //div.remove()
					} else
					if(this.DlgOptions.destroyOpacity!=null){			//leave on screen, at low opacity
						this.style.opacity = this.DlgOptions.destroyOpacity
					}
					else{
						//this.style.visibility = 'hidden'
						this.style.display='none'
					}
					if(this.DlgOptions.onClose!=null)
						this.DlgOptions.onClose(this, event)
				}
			}	//ctrl.DlgHvr==null
			//ctrl.DlgHovering=true
			ctrl.DlgHvrActive=true
			if(div.DlgOptions.onOpen!=null)
				div.DlgOptions.onOpen(this)
			dlgFactory.tacFadeIn(div, div.DlgOptions.delay)
		})
		ctrl.addEventListener('mouseleave', (event) => {
			dlgFactory.tacFadeOut(ctrl.DlgHvr,hvrFadeDelay,false,event)
		})
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
		if(options.at==undefined
		&& options.to==undefined) throw 'dlgFactory.tac() error, neither options.to  nor options.at found.'

		if(options.to && options.to.from===undefined) options.to.from='topleft'
		if(options.from===undefined) options.from='topleft'
		if(options.createHidden===undefined) options.createHidden=false

		var div = null
		if(typeof options.html == 'string'){
			div = document.createElement("DIV")
			div.style.visibility='hidden'
			div.style.display='block'
			div.style.position='fixed'
			div.innerHTML=options.html
			document.body.appendChild(div)
			//options.ctrl=div
			options.html=div
		}
		else {
			if(options.timer!=undefined && options.timer!==null)
				window.clearTimeout(options.timer)
			options.timer=null
			div = options.html
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
			var pos = ui.calc.xyAbs(ctrl)
			//var rec = div.getBoundingClientRect()
			//console.log(ctrl)
			if(options.to.from==='topleft'){
				y=pos.top; x=pos.left
			}else
			if(options.to.from==='topright'){
				y=pos.top; x=pos.left +ctrl.offsetWidth
				//y=pos.top; x=pos.left +ctrl.scrollWidth
			}else
			if(options.to.from==='bottomleft'){
				y=pos.top +ctrl.offsetHeight;	x=pos.left
				//y=pos.top +ctrl.scrollHeight;	x=pos.left
			}else
			if(options.to.from==='bottomright'){
				y=pos.top +ctrl.offsetHeight;	x=pos.left +ctrl.offsetWidth
				//y=pos.top +ctrl.scrollHeight;	x=pos.left +ctrl.scrollWidth
			}else{
		//if(options.to.from==='center')
				y=pos.top -Math.round(ctrl.offsetHeight/2);	x=pos.left -Math.round(ctrl.offsetWidth/2)
			}
			if(options.to.hover===undefined) options.to.hover=false
			if(options.to.hover===true){	//popup new div onmouseover, hide onmouseout
				ctrl.DlgHvr=div
				ctrl.addEventListener('mouseenter', (event) => {
					dlgFactory.tacFadeIn(ctrl.DlgHvr,0)
				})
				ctrl.addEventListener('mouseleave', (event) => {
					dlgFactory.tacFadeOut(ctrl.DlgHvr,hvrFadeDelay,false,event)
				})
			}	//hover===true
		}
		if((options.to && options.to.hover===true)
		|| options.delay>0){
				div.DlgOptions=options
				div.DLGLeaveFadeOut=false			//true when focused=true and timer=null
				div.onmouseenter = function(event){
					div.DLGFocused=true
					if(this.DlgOptions.timer!==null)return
					div.style.opacity=1
				}
				div.onmouseleave = function(event){
					this.DLGFocused=false
					this.DLGDestroy(false,event)	//process destroy logic in destroy func
				}
				div.DLGDestroy = function(force,event){
					if(force===false && this.DlgOptions.timer!=null) return			//either delay or destroy timers
					if(force===false && this.DLGLeaveFadeOut===true){
						this.DLGLeaveFadeOut=false
						dlgFactory.tacFadeOut(this,0,false,event)
						return
					}
					if(force===true
					||(this.DlgOptions.canDestroy!==undefined && this.DlgOptions.canDestroy===true)){
						if(this.DlgOptions.timer!=null)		//force timeout to end
							window.clearTimeout(this.DlgOptions.timer)
						this.DlgOptions.timer=null
						document.body.removeChild(this) //div.remove()
					}
					if(this.DlgOptions.destroyOpacity!=null){			//leave on screen, at low opacity
						this.style.opacity = this.DlgOptions.destroyOpacity
						return
					}
					//this.style.visibility = 'hidden'
					this.style.display='none'
				}
		}	//hover=true || destroyOpacity != null

		//position new div
		var top='auto', left='auto', right='auto', bottom='auto'
		var w = (options.width ?options.width :div.offsetWidth)
		var h = (options.height ?options.height :div.offsetHeight)
		if(w>window.innerWidth) w=Math.round(window.innerWidth *0.66)
		if(h>window.innerHeight) h=Math.round(window.innerHeight *0.66)

		if(options.from.indexOf('top') ===0){
			top = y
		} else
		if(options.from.indexOf('bottom') ===0){
			bottom=(window.innerHeight-y-2)
		} else
		if(options.from.indexOf('center') ===0){
			top = (y-Math.round(h/2));
		}
		//
		if(options.from.indexOf('left') >0){
			left= x;
		} else
		if(options.from.indexOf('right') >0){
			right = (window.innerWidth-x-2)
		} else
		if(options.from.indexOf('center') >0){
			left =(x-Math.round(w/2))
		}
		//
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
		div.style.maxHeight=h+'px'
		div.style.maxWidth=w+'px'

		if(options.createHidden===false
		&& options.delay && options.delay>0){
			div.style.opacity = 0
			options.timer=null
			div.DLGFocused=false
			dlgFactory.tacFadeIn(div, options.delay)
		}
		if(options.createHidden===true)
			div.style.display='none'
		div.style.visibility='visible'
		return div
	},
	tacFadeIn:function(div, delay){		//delay=0: no auto FadeOut
		if(div.DlgOptions.timer!==null){
			window.clearTimeout(div.DlgOptions.timer)
			div.DlgOptions.timer=null
		}
		if(delay===undefined) delay=0
		div.style.transition = 'opacity 1s'
		div.style.opacity=1
		div.style.display='block'
		div.style.visibility='visible'
		if(delay==0)
			return true
		div.DlgOptions.timer = window.setTimeout(function(){	//pause for options.delay then hide div
			div.DlgOptions.timer=null
			if(div.DLGFocused && div.DLGFocused===true){		//don't destroy while focused
				div.DLGLeaveFadeOut=true
				return
			}
			dlgFactory.tacFadeOut(div)
		}, delay)
		return div.DlgOptions.timer
	},
	tacFadeOut:function(div, delay, force, event){
		if(div.DlgOptions.timer!==null){
			window.clearTimeout(div.DlgOptions.timer)
			div.DlgOptions.timer=null
		}
		if(delay===undefined) delay=0
		if(force===undefined) force=false
		function local_destroyTimeout(){
			div.DlgOptions.timer = window.setTimeout(function(){
				div.DlgOptions.timer = null
				div.DLGDestroy(force, event)
			},300)
		}
		if(delay===0){																			//destroy immediately
			div.style.opacity = 0
			local_destroyTimeout()
			return
		}
		div.DlgOptions.timer = window.setTimeout(function(){	//delay before destroy
			div.DlgOptions.timer = null
			if(div.DLGFocused && div.DLGFocused===true){		//don't destroy while focused
				div.DLGLeaveFadeOut=true
				return
			}
			div.style.opacity = 0
			local_destroyTimeout()
		},delay)
		return div.DlgOptions.timer
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
		parent.style.bottom='auto';
		parent.style.right='auto';
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
			".dlgBase{background-color:#fff;	border: 2px solid #fff; border-radius:0.25em; outline:0; z-index:1000;}",
			".dlgFrm{background-color:#fff;	border:1px outset silver; border-radius:0.25em; outline:0; padding:1em; z-index:1000;}",
			".divDlg{ display:block; position:fixed; left:30vw; top:10vh; z-index:1000; \
			background-color:#fff;	border: 2px solid #fff; border-radius:0.25em; outline:0; \
			padding:0; margin:0; width: auto;	font-family:arial; font-weight:normal; text-align:center; }",
			".dlgHeader { background-color:#0d3;	border:0;	border-radius:0.25em; color:#fff; cursor:pointer; font-size:1.2em; font-weight:bold; padding:0.25em; margin:0;}",
			".dlgBody{border:0;	color:#222; padding:0.5em 0.5em 0em 0.5em; margin:0; font-weight:normal;	font-size:1em; text-align:left; }",
			".dlgTextArea{ border:inset 1px silver; font-family:arial; font-size:1em; padding:0.5em; height:25vh; width:25vw; }",
			".dlgFooter{ background:#ffffff; border:0;	padding:2px 1em 0.5em 1em; margin:0; text-align:right; }",
			".dlgButton{ background:#0d3; border:0; cursor:pointer; color:#fff; font-size:0.8em; height:2em;}",
			".dlgButton:hover{ color:#272;}",
			".divBubble{ background-color:#0d3; color:#fff; cursor:pointer; border:2px solid #0d3; border-radius:0.8em; \
				font-family:arial; font-size:1em; font-weight:normal; font-style:normal; text-align:center; \
				position:fixed; left:7vw; opacity:0;  transition:top 1.5s, opacity 1s; \
				max-height:60vh; overflow:hidden; width:20em; z-index:10000;	padding:0.5em; margin:0; outline:0;	}",
			".dlgHvr{display:none; z-index:1000; padding:1em; position:fixed; visibility:hidden; text-align:left; }"]
		local_addStylesheetRules(rules)
	},
	EventStopBubbling:function(e) {
		if(e.preventDefault) e.preventDefault();
		if(e.stopPropagation) e.stopPropagation();
		else e.cancelBubble=true;
		return false;
	}
}
