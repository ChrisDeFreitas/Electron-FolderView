/*

CDialog.js

usage:
	let dlg = new CDialog({
      html:"Hello World!",
      buttons:{
        SayHey:{
					caption:'Say what?',
					id:'btnSay',
          onClick:function(){
            new CDialog({ header:"World says:", html:"Hey!" })
          }
        }
      }
    })

requires:
	- dialog-polyfill.js

	
*/
"use strict"

class CDialog {
	constructor( options = {} ) {
		let dlg = null

		if(typeof options === 'string'){
			options = {
				html:options
			}
		}

		if(options.className == undefined) options.className = ''
    if(options.header == undefined) options.header = ''
		if(options.html == undefined) options.html = 'Test Content'
		if(options.footer == undefined) options.footer = ''
		
		if(options.id == undefined) options.id = 'dlg'+this.timestamp()
		if(options.buttons == undefined) options.buttons = {}
		if(options.buttons.Close == undefined) options.buttons.Close = {
			//caption:'Close',		// caption set to keyName if not provided
			id:'btnClose',
			onClick:function(btnKey, event){		//btnKey === "Close"
				// console.log('CDialg.btnCloseClick', event.target.dataset.dlgparentid, dlg.id, dlg.dlg.id)
				dlg.dlg.close()
			}
		}
		if(options.focusid == undefined) options.focusid = 'btnClose'
		
		let buttons = '', ii=0
		for(let key in options.buttons){
			if(key=='default') continue
			++ii
			let btn = options.buttons[key]
			if(btn.id==undefined) btn.id = key		//'btn'+ii
			if(btn.caption==undefined) btn.caption = key

			buttons += `<button id="${btn.id}" data-dlgParentId="${options.id}">${btn.caption}</button>\n`
		}

		dlg = document.createElement('dialog') 
		dlg.id = options.id
		dlg.className = 'CDialog '+options.className
		dlg.draggable = true 
		dlg.dlg = {
			focusid:options.focusid,
			dlgid:options.id
		}
		if(options.onClose){
			dlg.dlg.onClose = options.onClose
		}
		dlg.innerHTML = `<div id=dlgHeader style='cursor:grab; '>${options.header}</div>
			<div id=dlgBody>
				${options.html}
			</div>
			<div id=dlgFooter>
				<div id=dlgFooterText>${options.footer}</div>
				${buttons}
			</div>
		`,
		dlg.addEventListener('dragstart', function( event ){ 
			// console.log('CDialog dragStart')

			dlg._DLGDRAGDATA = {
				xoffset: 	event.screenX -dlg.offsetLeft,			//store offset to top-left corner
				yoffset: 	event.screenY -dlg.offsetTop ,
				movementY: event.movementY,
				screenY: 	event.screenY,
				clientY: 	event.clientY,
				offsetY: 	event.offsetY,
				ptop: 		dlg.offsetTop
			}

			event.dataTransfer.setData('text/plain', 'Dragging ['+dlg.id+']');
			event.dataTransfer.effectAllowed = "move";
			event.dataTransfer.dropEffect = "move"

			// return ui.eventStop(event)
		})
		dlg.addEventListener('dragend',  function( event ){
			// console.log('CDialog dragEnd')
			var data 	= dlg._DLGDRAGDATA //targ._DLGDRAGDATA;

			dlg.style.bottom='auto';
			dlg.style.right='auto';
			dlg.style.left = (event.screenX -data.xoffset)+'px';
			dlg.style.top	= (event.screenY -data.yoffset)+'px';
			dlg.style.opacity = 1;

			return ui.eventStop(event)
		})

		document.body.appendChild(dlg)
		dialogPolyfill.registerDialog(dlg)
		//assign button clicks
		for(let key in options.buttons){
			if(key=='default') continue

			let obj = options.buttons[key],
					btn = dlg.querySelector( '#'+obj.id )
			if(btn==null)
				console.error('CDialog::constructor//assignBtnClick error, btn not found: ['+key+']', obj, btn)
			else {
				if(obj.title) btn.title = obj.title
				btn.addEventListener('click', obj.onClick )
				// btn.addEventListener('click', function(event){
				// 	obj.onClick( key, event )
				// })
			}
		}
		//
		dlg.dlg.show = function(){
			dlg.show()
			if(options.focusid){
				let ctrl = dlg.querySelector('#'+options.focusid)
				if(ctrl)
					ctrl.focus()
			}
		}
		dlg.dlg.showModal = function(){
			dlg.showModal()
			if(options.focusid){
				let ctrl = dlg.querySelector('#'+options.focusid)
				if(ctrl)
					ctrl.focus()
			}
		}
		dlg.dlg.close = function(){
			dlg.close()
		}
		//
		dlg.addEventListener('close', (event) => {
			if(dlg==null) return
			if(dlg.dlg && dlg.dlg.onClose)
				dlg.dlg.onClose(dlg)

			document.body.removeChild(dlg)
			dlg = null
		})
		dlg.addEventListener('keydown', (event) => {
			// console.log('keydown', event.code, event.keyCode, document.activeElement)
			if(event.code==='Escape'){
				dlg.dlg.close()
				return false
			}else
			if(event.code==='Enter'){	//use default
				let ctrl = dlg.querySelector('#'+dlg.dlg.focusid)
				if(ctrl){
					ctrl.click()
					return false
				}
			}
		});
		//
		// console.log('CDialog', dlg)
		return dlg
	}

	padNumber(value, maxLength) {
		if(maxLength==null) maxLength=2
		if(typeof value != 'string') value=value.toString()
		var padlen = maxLength - value.length
	  if(padlen > 0) value = '0'.repeat(padlen) +value
    return value
	}
	timestamp(adatetime){
		var dt =(adatetime==null
					 ? new Date()
					 : new Date(adatetime))
			//, str = `${dt.getFullYear()}${this.padNumber(dt.getUTCMonth()+1, 2)}${this.padNumber(dt.getUTCDate(),2)}`
			, str = `${this.padNumber(dt.getUTCDate(),2)}`
						+ `${this.padNumber(dt.getHours(), 2)}${this.padNumber(dt.getMinutes(), 2)}${this.padNumber(dt.getSeconds(), 2)}`
						+ `${this.padNumber(dt.getMilliseconds(), 3)}`
		return str
	}
}

// Define the new element
//customElements.define('CDialog', CDialog, { extends: 'dialog' });