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
	${btnhtml} <button onclick="dlgFactory.close('${id}')" class=dlgButton style="display:${(btnCloseHide===true ?'none' :'inline')}">Close</button>
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
		this.bblFadeIn(bbl, delay, bbltop)
		/* moved to: bblFadeIn0
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
		*/
	},
	bblFadeIn: function(bbl, delay, bbltop){
		var phases=[false, false, false]
		ui.calc.pulse(delay+1250, 12, function(data){
			if(data.ms <= 250 ){			//fade in
				if(phases[0]===true) return true
				bbl.style.top = bbltop
				bbl.style.opacity = 1
				phases[0]=true
			}else
			if(data.ms >= delay ){		//fadeout
				if(bbl.DLGFocused===true){		//don't destroy while focused
					bbl.DLGMouseLeaveDestroy=true
					return false	//cancel pulse
				}
				if(phases[1]===true) return true
				bbl.style.opacity = 0
				phases[1]=true
			}else
			if(data.ms >= delay+1000 ){	//destroy
				if(phases[2]===true) return true
				dlgFactory.bblRemove(bbl)
				phases[2]=true
			}
			//console.log(data.ms)
			return true
		})
	},
	bblFadeIn0: function(bbl, delay, bbltop){
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
		//update ui
		if(ui===undefined) u = {}
		if(ui.var===undefined) u.var = {}
		if(ui.calc===undefined) u.calc = {}
		if(ui.calc.pulse===undefined) ui.calc.pulse = function(maxMs, maxFrames, cb){
			if(cb===undefined)
				throw "ui.calc.pulse() error: cb is undefined"
			if(maxMs===undefined) maxMs=1000
			if(maxFrames===undefined) maxFrames=12
			//
			var data={
				//https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
				start:performance.now(),
				ts:null,		//timestamp
				tsLast:0,		//
				ms:null,		//elapsed ms = ts -start
				callNo:-1,	//number of calls to callback
				fmax:maxFrames, //
				fno:-1,
				fnoLast:-99,
				fps:0,
				stop: false	//indicate to fn timer is to be cancelled
			}
			data.ts=data.start
			//
			var msPerFrame = Math.round(1000/data.fmax)
			var cbResult = null
			var pulseFunc = function(ts) {
				data.tsLast = data.ts
				data.ts	= ts,	//performance.now()
				data.ms = data.ts -data.start
				data.fps= Math.round(1000/(data.ts -data.tsLast))
				data.callNo++
				data.fno = Math.floor( (data.ms/msPerFrame) % data.fmax)	//use ms incase time interrupted
				//console.log(msPerFrame, data.tsLast, data.ts, data.start, data.ms, data.fps, data.callNo, data.frameNo )
				data.stop = (maxMs <= data.ms)
				if(data.fno < 0)
					cbResult = true	//may be timing error between data.start and ts (chrome v55.0.2883.87 m)
				else
				if(data.fnoLast < data.fno)		//verify fno is unique (errors may be due to timer)
			    cbResult = cb(data)					//if fnResult===false, cancel pulse
			  if(data.stop===false && cbResult==true){
				  data.fnoLast = data.fno
					window.requestAnimationFrame(pulseFunc)
				}
			}
			window.requestAnimationFrame(pulseFunc)
		}
		/*ui.calc.pulse(1000, 12, function(data){
			console.log(data.ms, data.fps, data.callNo, data.fno)
			return true
		})*/

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
