/*
	last modified: 20170109

	dlgFactory
	- simplify displaying random bits of html
	- css in this.init()

	//dialog box
	- display html string or text
	- drag title bar
	- dblClick title bar to close
	- auto-handling of close button
	- esc key closes
	- enter key selects default button
	- default z-index: 1000

	//sample code
	var options = {
		canDestroy:true,				//whether the dialog should be hidden or destroyed in dlgFactory.close(dlgid)
		createHidden:false,			//if true: dlg.display=none
		focusId: '#inpDelay',
		title: 'Set Slideshow Delay',
		top/left/height/width: undefined	//if(left===undefined) auto-center dlg; if(top===undefined) dlg.style.top=25em
		body: `<label><input id=inpDelay type=number value=${galleryDelay} min=1 style='width:3em; text-align:right;' tabindex=0> seconds</label>`,
		onCloseFunc: function(dlg){} //may by null
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

	//bubble messsages
	- display html string or text
	- messages fade-in/out in column on left side of screen
	- specify duration messages remain on screen

	//sample code
	dlgFactory.setBblClickAction('show' || 'none')		//what to do when user clicks a bubble message; default=show
	dlgFactory.bbl(msg, delay)											//show floating message in upper  left of window; automatically destroy message after delay seconds

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
<div id=hdr${id} class=dlgHeader draggable=true ondragstart="dlgFactory.dragStart(event)" ondragend="dlgFactory.dragEnd(event)" ondblclick="dlgFactory.close('${id}')">
	${options.title}
</div>
<div id=bdy${id} class=dlgBody>
	${options.body}
</div>
<div id=ftr${id} class=dlgFooter>
	${btnhtml} <button id=btnDlgClose onclick="dlgFactory.close('${id}')" class=dlgButton style="display:${(btnCloseHide===true ?'none' :'inline')}">Close</button>
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
				/*if(event.className!=='dlgButton') return
				if(event.classNam==='dlgButton'){
					alert(1)
					event.target.onclick(event)
				}else*/
					dlgFactory.btnDefault(this)
				return dlgFactory.EventStopBubbling(event)
			}
		})

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
	msg: function(msg, title){
		var options = {
			focusId:'#btnDlgClose',
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
			focusId: '#tata',
			title: (title===undefined ?"Message" :title),
			body: `<textarea id='tata' class='dlgTextArea' style="height:${heightVh}vh;width:${widthVw}vw">${msg}</textarea>`,
			top:top+'vh', left:left+'vw',	height:'auto', width:'auto',
		}
		this.create(options)
	},
	close: function(dlgid){
		var dlg = null
		if(typeof dlgid === 'string')
			dlg = this.get(dlgid)
		else
			dlg = dlgid
		if(dlg===false) return

		dlg.style.display = 'none'
		if(dlg.DLGOptions.canDestroy===false)
			return
		if(dlg.DLGOptions.onCloseFunc!==undefined)
			dlg.DLGOptions.onCloseFunc(dlg)
		dlg.remove()	//may not be ie compatible
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
		bbl.className='divBubble'
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
			bbl.bblSibling.bblUpdate(bbl.style.top)
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
`.divDlg{ display:block; position:fixed; left:30vw; top:10vh; z-index:10000;
background: #fff;	border: 0px solid #fff; outline: 1px outset silver;
padding:0.25em; margin:0; width: auto;
font-family:arial; font-weight:normal; text-align:center;
}`,
`.dlgHeader {
background: #a0f0a0;	border:0;	border-radius:0.25em; color:#fff; cursor:pointer; padding:0.25em; margin:0;
font-size:1.2em; font-weight:bold;
}`,
`.dlgBody{
border:0;	padding:0.5em; margin:0;
color:#222; font-weight:normal;	text-align:left;
font-size:1em;
}`,
`.dlgTextArea{ border:inset 1px silver; font-family:arial; font-size:1em; padding:0.5em; height:25vh; width:25vw; }`,
`.dlgFooter{ border:0;	padding:0.5em 1em; margin:0; text-align:right;
}`,
`.dlgButton{ background: #a0f0a0; border:0; cursor:pointer; color:#fff; font-size:0.8em; height:2em;}`,
`.dlgButton:hover{ color:#272;}`,
`.divBubble{
	position:fixed; left:7vw;
	opacity:0;  transition:top 1.5s, opacity 1s;
	background-color:white; color:#333; cursor:pointer; max-height:60vh; overflow:hidden; width:20em; z-index:10000;
	border:2px solid #a0f0a0; border-radius:0.8em; outline:0;
	padding:0.5em; margin:0;
	font-family:arial; font-size:1em; font-weight:normal; font-style:normal; text-align:center;
}`]
		local_addStylesheetRules(rules)
	},
	EventStopBubbling:function(e) {
		if(e.preventDefault) e.preventDefault();
		if(e.stopPropagation) e.stopPropagation();
		else e.cancelBubble=true;
		return false;
	}
}
