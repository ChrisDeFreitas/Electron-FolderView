/*
	dlgFactory
	- simplify displaying random bits of html
	- css in this.init()
*/
var dlgFactory = {
	list:[],
	lastid:0,
	bblLast:null,		//last bubble message created
	inited:false,

	create: function(options) {
		if(this.inited===false) this.init()

		var id = 'dlg'+(++this.lastid),
		 	btnhtml = ''
		if(options.buttons){
			//assume: buttons[key] is a function
			for(key in options.buttons){
				if(key==='default') continue
				btnhtml += `<button onclick='var dlg=dlgFactory.get("${id}"); dlg.DLGOptions.buttons["${key}"]( dlg, "${key}" )' class=dlgButton>${key}</button>`
				//btnhtml += `<button onclick='var dlg=dlgFactory.get("${id}"); console.log(dlg.DLGOptions.buttons["${key}"])'>${key}</button>`
				//btnhtml += `<button onclick='console.log(this.parentNode.id)'>${key}</button>`
			}
		}
		var	left=(options.left ?options.left :'50vw'),
			top	=(options.top ?options.top :'40vh'),
			height=(options.height ?options.height :'auto'),
			width=(options.width ?options.width :'auto'),
			html = `
<div id=hdr${id} class=dlgHeader draggable=true ondragstart="dlgFactory.dragStart(event)" ondragend="dlgFactory.dragEnd(event)">
	${options.title}
</div>
<div id=bdy${id} class=dlgBody>
	${options.body}
</div>
<div id=ftr${id} class=dlgFooter>
	${btnhtml} <button onclick="dlgFactory.close('${id}')" class=dlgButton>Close</button>
</div>`
		var dlg = document.createElement("DIV")
		dlg.id = id
		dlg.className='divDlg'
		dlg.style=`left:${left};top:${top};width:${width};height:${height};`
		dlg.innerHTML = html
		dlg.DLGID = this.list.length
		dlg.DLGFactory = this
		dlg.DLGOptions = options
		this.list.push(dlg)
		document.body.appendChild(dlg)
		dlg.addEventListener('keydown', function(event){
			switch (event.key) {
			case "Escape": dlgFactory.close(this); return dlgFactory.EventStopBubbling(event);
			case "Enter": dlgFactory.btnDefault(this); return dlgFactory.EventStopBubbling(event);
			}
		})
		if(options.focusId !== undefined)
			dlg.querySelector(`${options.focusId}`).focus()
		return dlg
	},
	msg: function(msg, title){
		var options = {
			title: (title===undefined ?"Message" :title),
			body: msg,
			width:'20em'
		}
		return this.create(options)
	},
	bigText: function(msg, title){
		var options = {
			title: (title===undefined ?"Message" :title),
			body: `<textarea class='dlgTextArea'>${msg}</textarea>`,
			top:'35vh', left:'35vw'
		}
		this.create(options)
	},
	bbl: function(msg){
		//assume msg is text not html
		var id = 'bbl'+(++this.lastid)
		var bbl = document.createElement("DIV")
		bbl.id = id
		bbl.className='divBubble'
		bbl.innerHTML = msg+' '+id
		bbl.dlgFactory = this
		bbl.onclick = function(){
			this.dlgFactory.msg(this.innerHTML,"Bubble Message")
		}
		bbl.bblSibling = null
		bbl.bblUpdate = function(top) {
			var lasttop = this.style.top
			this.style.top = top
			if(this.bblSibling != null)
				this.bblSibling.bblUpdate(lasttop)
		}
		var bbltop = '5px'
		if(this.bblLast != null){
			this.bblLast.bblSibling = bbl		//assign sibling
			bbltop = (this.bblLast.offsetTop  +this.bblLast.offsetHeight +10)+'px' 	//assign bbl.top
		}
		bbl.style.top = bbltop
		this.bblLast = bbl							//assign new last bbl div
		document.body.appendChild(bbl)
		window.setTimeout(function(){
			bbl.style.top = bbltop
			bbl.style.opacity = 1						//fade in
			window.setTimeout(function(){
				bbl.style.opacity = 0					//fade out
				//console.log(performance.now())
				window.setTimeout(function(){			//destroy
					dlgFactory.bblRemove(bbl)
				}, 1000)
			}, 6000)
		}, 250)
	},
	bblRemove: function(bbl){
		document.body.removeChild(bbl)	//destroy
		console.log('destroyed:', bbl.id)
		if(this.bblLast.id === bbl.id)			//update our info
			this.bblLast = null	//no other bbl's
		if(bbl.bblSibling != null)					//update siblings position, will riple through siblings
			bbl.bblSibling.bblUpdate(bbl.style.top)
	},
	close: function(dlgid){
		var dlg = null
		if(typeof dlgid === 'string')
			dlg = this.get(dlgid)
		else
			dlg = dlgid
		if(dlg===false) return
		dlg.style.display = 'none'
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
		dlg.DLGOptions.buttons[key](dlg, key)
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
`.dlgButton{ background: #a0f0a0; border:0; cursor:pointer; color:#fff; font-size:0.8em;}`,
`.dlgButton:hover{ color:#272;}`,
`.divBubble{
	position:fixed; left:3vw;
	opacity:0;  transition:top 1s, opacity 1s;
	background-color:white; color:#333; cursor:pointer; width:20em; z-index:1000;
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
