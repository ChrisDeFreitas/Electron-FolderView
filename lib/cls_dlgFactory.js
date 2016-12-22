/*
	dlgFactory
	- simplify displaying random bits of html
	- css in this.init()
*/
var dlgFactory = {
	list: [],
	lastid: 0,
	inited:false,

	create: function(options) {
		if(this.inited===false) this.init()

		var id = 'dlg'+(++this.lastid),
		 	btnhtml = ''
		if(options.buttons){
			//assume: buttons[key] is a function
			for(key in options.buttons){
				if(key==='default') continue
				btnhtml += `<button onclick='var dlg=dlgFactory.get("${id}"); dlg.DLGOptions.buttons["${key}"]( dlg, "${key}" )'>${key}</button>`
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
	${btnhtml} <button onclick="dlgFactory.close('${id}')">Close</button>
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
	/*
		bug: event.screenX/Y not always reported correctly in FF or same version on different computers,
				onDragStart event.screenX/Y, but onDragEnd event.screenX/Y may be off
				therefore on some machines it may be impossible to position dragged controls

				fails on:
					Windows7 FF v44, 43, 42
	*/
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
		//causes drag to fail:  event.preventDefault();
		//don't return anything either: return EventStopBubbling(event);
	},
	dragEnd: function(event) {	//allow dragging of windows with eyeball
	/*
	bug: event.screenX/Y not always reported correctly in FF or same version on different computers,
			onDragStart event.screenX/Y, but onDragEnd event.screenX/Y may be off
			therefore on some machines it may be impossible to position dragged controls
	*/
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
`.dlgFooter button{ background: #a0f0a0; border:0; cursor:pointer; color:#fff; font-size:0.8em;}`,
`.dlgFooter button:hover{ color:#272;}`	]
		local_addStylesheetRules(rules)
	},
	EventStopBubbling:function(e) {
		if(e.preventDefault) e.preventDefault();
		if(e.stopPropagation) e.stopPropagation();
		else e.cancelBubble=true;
		return false;
	}
}
