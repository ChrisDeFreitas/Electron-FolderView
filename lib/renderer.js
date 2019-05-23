// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const {shell, remote} = require('electron')
const {Menu, MenuItem/*, screen*/} = remote
//const {clipboard, shell} = require('electron')

var library=null			//library folders
var recent=null				//recent foldes

var dlgSysInfo=null		//press F2 to toggle
var mainmenu = null
var ctxmenu = null		//context menu
var fltsubmenu=null		//mainmenu.filter.submenu, assign in mainMenuSet()
var layoutmenu=null		//mainmenu.layout.submenu, assign in mainMenuSet()
var MNUCOLS=4
var MNUROWS=MNUCOLS+1
var MNUVERT=MNUCOLS+2
var MNUWALL=MNUCOLS+3
var mitScroll=null		//scroll main menu item
let MNUORDERDESC = 0
let MNUORDERSHUF = MNUORDERDESC +1
let MNUORDERDATE = MNUORDERDESC +3
let MNUORDERNAME = MNUORDERDESC +4
let MNUORDERSIZE = MNUORDERDESC +5
let MNUORDERTYPE = MNUORDERDESC +6
//
var ordMenu=null
var ordCtxMenu=null
//var MNUORD=0

const main = remote.require('./main.js')
// exports.startTime = remote.require('./main.js').startTime
exports.startTime = main.startTime

exports.sayhey = function() {
	console.log('Hey Hey Hey!')
	console.log('FolderView v', ui.updateDate)
}
exports.titleSet = function(str) {
	var win = remote.getCurrentWindow()
	win.setTitle(str)
}
exports.devToolsToggle = function() {
	remote.getCurrentWindow().toggleDevTools()
}
exports.mainMenuGen = function(exts, layoutmode) {
	return mainMenuGen(exts, layoutmode)
}
exports.folderMenuClick = function(mnu){
			 if(mnu==='default') layoutmenu.items[1].submenu.items[0].click()
	else if(mnu==='first') layoutmenu.items[1].submenu.items[1].click()
	else if(mnu==='hidden') layoutmenu.items[1].submenu.items[2].click()
	else if(mnu==='last') layoutmenu.items[1].submenu.items[3].click()
}
exports.ordMenuClick = function(mnu){
			 if(mnu==='date') ordMenu.items[MNUORDERDATE].click()
	else if(mnu==='name') ordMenu.items[MNUORDERNAME].click()
	else if(mnu==='size') ordMenu.items[MNUORDERSIZE].click()
	else if(mnu==='type') ordMenu.items[MNUORDERTYPE].click()
}

exports.clipboardWrite = function(str){
	const {clipboard} = require('electron')
	clipboard.writeText(str)
}
exports.clipboardRead = function(){
	const {clipboard} = require('electron')
	return clipboard.readText()
}

exports.libraries = function(){
	if(library==null) libraryLoad()
	return library
}
exports.recentAdd = function(apath) {
	recentAdd(apath)
}

exports.pathMnuListLoad = function(nm, type){
	if(recent==null) recent = recentLoad()
	if(library==null) libraryLoad()
	var list = [], idx=null
	if(type=='url') idx=0
	if(type=='path') idx=1
	if(nm=='Recent'){
		recent.map(function(item){	//,idx,list){
			list.push(item[idx])
		})
	} else
	if(nm=='Library'){
		library.map(function(item){	//,idx,list){
			list.push(item[idx])
		})
	}
	return list
}
exports.pathMnuItemFind = function(nm, path){
	if(recent==null) recent = recentLoad()
	if(library==null) library = libraryLoad()
	var result = null
	if(nm=='Recent'){
		result = recent.find(function(item){	//,idx,list){
			if(item[1]==path) return true
		})
	} else
	if(nm=='Library'){
		result = library.find(function(item){	//,idx,list){
			if(item[1]==path) return true
		})
	}
	//console.log('mnuItemFind:', result)
	return (result==null ?null :result[1])
}
exports.pathFolderItemsLoad = function(path, simple) {
	if(pathMatch(path)===false)
		return `pathFolderItemsLoad() error: "${path}" is not in library.`
	return main.fldrLoad(path, simple)
}

exports.folderLoad = function(path) {
	//read path contents and display in grid
	folderLoad(path)
}
exports.folderNew = function(cb){
	folderNew(cb)
}
exports.folderUp = function(){
	folderUp()
}

exports.fileCopy = function(controlID) {
	return fileCopy(controlID)
}
exports.fileDelete = function(itemObj){
	return fileDelete(itemObj)
}
exports.fileMove = function(controlID, successFunc) {
	return fileMove(controlID, successFunc)
}
exports.openFile = function(obj) {
	shell.openItem(`"${obj.path}"`)
}

exports.execFileCopy = function(objlist, dir, cbAfterExec, cbBeforeExec){
	execFileCopy(objlist, dir, cbAfterExec, cbBeforeExec)
}


function mainMenuGen(exts, layoutmode) {
	var template = [
	  {
	    label: 'App',
	    submenu: [
				{
	        label: 'Change Folder', accelerator: 'F6',
					click: function(item, focusedWindow){
						folderChange()
					}
	      },{
					label: 'Folder Up', accelerator: 'Backspace',
					click: function(item, focusedWindow){
						if(document.activeElement.nodeName !== 'BODY'){
							//testing to see if key event leaks for Backspace as well
							//console.log('Folder Up skip:',document.activeElement.nodeName)
							return
						}
						folderUp()
					}
	      },{
					label: 'Last Folder', accelerator: '-',
					click: function(item, focusedWindow){
						if(document.activeElement.nodeName !== 'BODY'){
							//this shouldn't be necessary, key event is leaking for '-'
							//console.log('Last Folder skip:',document.activeElement.nodeName)
							return
						}
						folderLast()
					}
				},{
					label: 'New Folder', accelerator: 'F8',
					click: function(item, focusedWindow){
						folderNew()
					}
				},{
	        label: 'Reload', accelerator:'F5',
					click: function(item, focusedWindow){
						folderLoad(ui.args.path)
					}
				},{
        	type: 'separator'
      	},{ label: 'Bulk Operations', accelerator: 'F7',
					click: function(item, win, ev) {
						bulkOps()
					}
				},{
	        label: 'DevTools', role: 'toggledevtools', accelerator:'F12',
	      },{
	        label: 'Exit (Alt+F4)',
					click: function(item, focusedWindow) {
						if (focusedWindow)
							focusedWindow.close();
					}
	      },{
	        label: 'Export List', accelerator:'F4',
					click: function(item, focusedWindow){
						exportToFile()
					}
				},{
	        label: 'Full Screen', role: 'togglefullscreen'
				},{
	        label: 'System Info', accelerator:'F2',
					click: function(item, focusedWindow){
						if(dlgSysInfo===null){
							const app = remote.app
							const os = require('os')
							var dt = new Date(os.uptime()).getTime() /60 /60
							if(dt < 24) dt = (Math.round( dt *10) /10)+' hours'
							else dt = (Math.round( dt /24 *10) /10)+' days'
							var pdt = new Date(process.uptime()).getTime() /60 /60
							if(pdt < 24) pdt = (Math.round( pdt *100) /100)+' hours'
							else pdt = (Math.round( pdt /24 *10) /10)+' days'

							const {webFrame} = require('electron')
							var res=''
								, obj = webFrame.getResourceUsage()
							//console.log('webFrame.getResourceUsage', obj)
							for(var key in obj){
								if(obj[key].count === 0) continue
								var sz = ui.calc.bytesToStr(obj[key].size)
								//var sz = Math.round(obj[key].size /1024 *100)/100
								//if(sz < 1000)
								//	sz += 'KB'
								//else
								//	sz = (Math.round(obj[key].size /1024 /1024 *100)/100)+'MB'
								res += `${key} (${obj[key].count}): ${sz}<br>`
							}

							var str = `
								${os.type()} ${os.release()} ${os.arch()} (${os.platform()})<br>
								${os.cpus()[0].model}<br>
								<b>Uptime</b> ${dt}<br>
								<b>Hostname</b> ${os.hostname()}<br>
								<b>User</b> ${os.userInfo().username}<br>
								<br>
								<b>FolderView</b> v${ui.updateDate}<br>
								<b>Chrome</b> v${process.versions.chrome}<br>
								<b>Electron</b> v${process.versions.electron}<br>
								<b>Node</b> v${process.versions.node}<br>
								<br>`
								+ JSON.stringify(process.getSystemMemoryInfo()).replace(/"/g, '').replace(/,/g, '<br>').replace(/{/, '<b>System Memory(KB)</b><br>').replace(/}/g, '<br>')
								//+ JSON.stringify(process.getProcessMemoryInfo()).replace(/"/g, '').replace(/,/g, '<br>').replace(/{/, '<b>Process Memory(KB)</b><br>').replace(/}/g, '')
								+`<br><br>
								 <b>Application</b><br>
								 pid: ${process.pid}<br>
								 uptime: ${pdt}<br>
								 # folder items: ${items.length}<br>
								 ${res}
								 `
		  /*
			returns electron version:
				name: ${app.getName()}<br>
				version: ${app.getVersion()}<br>
			returns null:
				uid: ${process.getuid}<br>
			returns path to asar file:
				path: ${app.getAppPath()}<br>
		 */
							dlgSysInfo = dlgFactory.msg(str, 'System Info', {
								onClose:function(dlg,force){
									dlg.style.display = 'none'
									dlgSysInfo=null
								}
							})
							console.log(process.getHeapStatistics())
						}
						else{
							dlgFactory.fadeOut(dlgSysInfo,null,null,null,true)
							dlgSysInfo=null
						}
					}
				},{
	        label: 'Windows Explorer', accelerator:'F3',
					click: function(item, win, ev) {
						if(ui.args.defaultImageNum != null){
							var str = ui.args.path
							if(str[str.length-1]=='\\' || str[str.length-1]=='/')
								str = str.substr(0, str.length-2)
							shell.showItemInFolder( str )
						} else 	//isDirectory === true
							shell.openItem( ui.args.path )
					}
				}]
	  },{
		 label: 'Filter', submenu: fltSubmenuGen(exts, false)
		},{
			label: 'Help',
			role: 'help',
			submenu: [
			{
				label: 'About FolderView',
				click: function() { require('electron').shell.openExternal('https://github.com/ChrisDeFreitas/Electron-FolderView') }
			},{
				label: 'About Electron',
				click: function() { require('electron').shell.openExternal('http://electron.atom.io') }
			},
			]
		},{
			label: 'Layout',
			submenu: [
				{ label: 'Folders', accelerator:'Alt+Shift+F',
					submenu: [
					{	label: 'Default', type:'radio', checked:(ui.args.folders==='default'),
						click: function() { ui.args.folders='default'; ui.gridLoad(lastLayoutMode)} },
					{	label: 'First', type:'radio', checked:(ui.args.folders==='first'),
						click: function() { ui.args.folders='first'; ui.gridLoad(lastLayoutMode) } },
					{	label: 'Hidden', type:'radio', checked:(ui.args.folders==='hidden'),
						click: function() { ui.args.folders='hidden'; ui.gridLoad(lastLayoutMode) }  },
					{	label: 'Last', type:'radio', checked:(ui.args.folders==='last'),
					 click: function() { ui.args.folders='last'; ui.gridLoad(lastLayoutMode) } }
					]
				},
				{	label: 'Scale',
					submenu: [
						{
							label: 'Scale+0.1', accelerator: 'Alt+Up',
							click: function(item, win, ev) {
								scale = Math.round((scale +0.1) *10)/10
								ui.gridLoad(lastLayoutMode)
								//galleryScale()
							}
						},{
							label: 'Scale-0.1', accelerator: 'Alt+Down',
							click: function(item, win, ev) {
								if(scale===0.1) {
									console.log('Scale can not go below zero.')
									return
								}
								scale = Math.round((scale -0.1) *10)/10
								if(scale <= 0) scale=0.1
								ui.gridLoad(lastLayoutMode)
								//galleryScale()
							}
						},{
							label: `Scale=0.3`, accelerator: 'Alt+Left',
							click: function(item, win, ev) {
								scale = 0.3
								ui.gridLoad(lastLayoutMode)
							}
						},{
							label: `Scale=1`, accelerator: 'Alt+Right',
							click: function(item, win, ev) {
								scale = 1
								ui.gridLoad(lastLayoutMode)
								//galleryScale()
							}
						}
					]
				},{
					label: 'Scroll', type:'checkbox', checked:false, accelerator: 'Alt+S',
					click: function(item, win, ev) {
						gridScrollToggle()
					}
				},
				{ 	type: 'separator'
				},{	label: 'Cols',
						accelerator: 'Alt+C', type:'radio',
						click: function(item, win, ev) {
							ui.gridLoad('cols')
							isotope.layout()
							//ctxmenu.popup(win, menupos.x, menupos.y, item.position)
						}
				},/*{	label: 'horizontal',
						click: function(item, win, ev) {
							ui.gridLoad('horiz')
						}
				},*/{		label: 'Rows',
					accelerator: 'Alt+R', type:'radio',
					click: function(item, win, ev) {
						ui.gridLoad('rows')
						isotope.layout()
						//ctxmenu.popup(win, menupos.x, menupos.y, item.position)
					}
				},{	label: 'Vert',
						accelerator: 'Alt+V', type:'radio',
						click: function(item, win, ev) {
							ui.gridLoad('vert')
							isotope.layout()
							//ctxmenu.popup(win, menupos.x, menupos.y, item.position)
						}
				},{	label: 'Wall',
						accelerator: 'Alt+W', type:'radio',
						click: function(item, win, ev) {
							ui.gridLoad('wall')
							isotope.layout()
							//ctxmenu.popup(win, menupos.x, menupos.y, item.position)
						}
				}
			]
		},{	label: 'Order', accelerator:'Alt+Shift+O',
			submenu: [
				{ label: 'Descending', type:'checkbox', checked:(ui.args.descending===true), accelerator:'Alt+Shift+D',
					click: function(item, win, ev) {
						ui.args.descending=item.checked
						//ui.args.order=ui.var.lastOrder
						ui.gridLoad(lastLayoutMode)
					}
				},{	label: 'Shuffle', type:'checkbox', checked:(ui.args.shuffle==true), accelerator:'Alt+Shift+S',
						click: function(item, win, ev) { ui.args.shuffle=item.checked; ui.gridLoad(lastLayoutMode)	}
				},{	type: 'separator'
				},{
					label: 'File Date', type:'radio', checked:(ui.args.order=='date'),
					click: function() { ordMenu.items[MNUORDERSHUF].checked = ui.args.shuffle = false; ui.args.order='date'; ui.gridLoad(lastLayoutMode) }
				},{
					label: 'File Name', type:'radio', checked:(ui.args.order=='name'),
					click: function() { ordMenu.items[MNUORDERSHUF].checked = ui.args.shuffle = false; ui.args.order='name'; ui.gridLoad(lastLayoutMode) }
				},{
					label: 'File Size', type:'radio', checked:(ui.args.order=='size'),
					click: function() { ordMenu.items[MNUORDERSHUF].checked = ui.args.shuffle = false; ui.args.order='size'; ui.gridLoad(lastLayoutMode) }
				},{
					label: 'File Type', type:'radio', checked:(ui.args.order=='type'),
					click: function() { ordMenu.items[MNUORDERSHUF].checked = ui.args.shuffle = false; ui.args.order='type'; ui.gridLoad(lastLayoutMode) }
				},{ 	type: 'separator'
			},{
				label: 'File Date, Descending',
				click: function() {
					ordMenu.items[MNUORDERDESC].checked = ui.args.descending = true
					ordMenu.items[MNUORDERSHUF].checked = ui.args.shuffle = false
					ordMenu.items[MNUORDERDATE].click()
				}
			},{
				label: 'File Name, Ascending',
				click: function() {
					ordMenu.items[MNUORDERDESC].checked = ui.args.descending = false
					ordMenu.items[MNUORDERSHUF].checked = ui.args.shuffle = false
					ordMenu.items[MNUORDERNAME].click()
				}
			},{
				label: 'File Size, Descending',
				click: function() {
					ordMenu.items[MNUORDERDESC].checked = ui.args.descending = true
					ordMenu.items[MNUORDERSHUF].checked = ui.args.shuffle = false
					ordMenu.items[MNUORDERSIZE].click()
				}
			}
		 ]
		 },{
	    type: 'separator'
		},{
	    type: 'separator'
	  },,{
		 type: 'separator'
	 	},{
	    label: 'Change',
			click: function(item, win, ev) {
				folderChange()
			}
		},{
			label: 'Recent', submenu:recentMenuLoad()
		},{
	    label: 'Reload',
			click: function(item, win, ev) {
				let selectedFile=null
				if(itemselected!=null) selectedFile = itemselected.path
				folderLoad(ui.args.path)
				if(selectedFile != null) {
					selectedFile = itemPathFind(selectedFile)
					if(selectedFile != null){
						itemSelect(selectedFile.pid, true)
					}
				}
			}
		},{
	    label: 'SFTP',
			click: function(item, win, ev) {
				sftp(ui.args.path)
			}
		},{
	    label: 'Up',
			click: function(item, win, ev) {
				folderUp()
			}
		}
	];

	mainmenu = Menu.buildFromTemplate(template);
	fltsubmenu = mainmenu.items[1].submenu
	Menu.setApplicationMenu(mainmenu);
	layoutmenu = mainmenu.items[3].submenu
			 if(layoutmode=='cols')	layoutmenu.items[MNUCOLS].checked=true
	else if(layoutmode=='rows')	layoutmenu.items[MNUROWS].checked=true
	else if(layoutmode=='vert')	layoutmenu.items[MNUVERT].checked=true
	else if(layoutmode=='wall')	layoutmenu.items[MNUWALL].checked=true
	mitScroll =	layoutmenu.items[1]	//scroll menu item
	ordMenu = mainmenu.items[4].submenu
	//failed: cannot dynamically change menuitem.label
	//mnuScale1 = layoutmenu.items[0]
	//mnuScale1.label = 'Hi'
	//console.log(mnuScale1.label)
}
exports.contextMenuSet = function(exts) {
	var target = null
	//var menupos = {x:0, y:0}
	window.addEventListener('contextmenu', (e) => {
		const {webFrame} = require('electron')
		//var curzoom = Math.round(webFrame.getZoomFactor() *100)/100
		//menupos.x = e.clientX
		//menupos.y = e.clientY
		var template = null
		/*if (e.target.closest('[contenteditable="false"]')){
			console.log(111)
			console.log(e.target.nodeName, e.target)
		}*/
		if (e.target.closest('textarea, input, [contenteditable="true"]')) {
			console.log('Context on input')
			template = [
				{	label: 'Cut', role: 'cut'},
				{ label: 'Copy', role: 'copy'},
				{ label: 'Paste', role: 'paste'},
				{ label: 'Delete', role: 'delete'},
				{ type: 'separator'},
				{ label: 'Undo', role: 'undo'},
				{ label: 'Redo', role: 'redo'},
				{ type: 'separator'},
				{ label: 'Select All', role: 'selectall'}
			]
		}
		else { //default menu for folder items
			template = [	//basic context menu
				{
					label: 'Folder Up (Backspace)',
					click: function(item, focusedWindow) {
						folderUp()
					}
				},,{ label: 'Fullscreen', role: 'togglefullscreen'
				},{
			    label: 'Layout',
			    submenu: [
						{ label: 'Folders', accelerator:'Alt+Shift+F',
							submenu: [
							{	label: 'Default', type:'radio',
								checked:layoutmenu.items[1].submenu.items[0].checked,
								click: function() { layoutmenu.items[1].submenu.items[0].click() } },
							{	label: 'First', type:'radio',
								checked:layoutmenu.items[1].submenu.items[1].checked,
								click: function() { layoutmenu.items[1].submenu.items[1].click() } },
							{	label: 'Hidden', type:'radio',
								checked:layoutmenu.items[1].submenu.items[2].checked,
								click: function() { layoutmenu.items[1].submenu.items[2].click() }  },
							{	label: 'Last', type:'radio',
								checked:layoutmenu.items[1].submenu.items[3].checked,
							 	click: function() { layoutmenu.items[1].submenu.items[3].click() } }
							]
						},{	label: 'Scroll Toggle', type:'checkbox', checked:mitScroll.checked, accelerator: 'Alt+S',
							click: function(item, win, ev) {
								mitScroll.checked = item.checked
								mitScroll.click()
							}
						},{	type: 'separator'
						},{	label: 'Cols',
								accelerator: 'Alt+C', type:'radio',
								checked: layoutmenu.items[MNUCOLS].checked,
			        	click: function(item, win, ev) {
									var item = layoutmenu.items[MNUCOLS]
									item.click(item, win, ev)
								}
						},{		label: 'Rows',
							accelerator: 'Alt+R', type:'radio',
							checked: layoutmenu.items[MNUROWS].checked,
			        click: function(item, win, ev) {
								var item = layoutmenu.items[MNUROWS]
								item.click(item, win, ev)
							}
						},{	label: 'Vert',
								accelerator: 'Alt+V', type:'radio',
								checked: layoutmenu.items[MNUVERT].checked,
			        	click: function(item, win, ev) {
									var item = layoutmenu.items[MNUVERT]
									item.click(item, win, ev)
								}
						},{	label: 'Wall',
								accelerator: 'Alt+W', type:'radio',
								checked: layoutmenu.items[MNUWALL].checked,
			        	click: function(item, win, ev) {
									var item = layoutmenu.items[MNUWALL]
									item.click(item, win, ev)
								}
						}
			    ]
			  },{	label: 'Order', accelerator:'Alt+Shift+O',
					submenu: [
						{ label: 'Descending', type:'checkbox',
							checked:ordMenu.items[MNUORDERDESC].checked, accelerator:'Alt+Shift+D',
							click: function(item, win, ev) { ordMenu.items[MNUORDERDESC].click() }
						},{	label: 'Shuffle', type:'checkbox', checked:(ui.args.shuffle==true),
								click: function(item, win, ev) {
									ui.args.shuffle=item.checked
									ui.gridLoad(lastLayoutMode)
								}
						},{ 	type: 'separator'
						},{
							label: 'File Date', type:'radio', checked:ordMenu.items[MNUORDERDATE].checked,
							click: function() { ordMenu.items[MNUORDERDATE].click() }
						},{
							label: 'File Name', type:'radio',  checked:ordMenu.items[MNUORDERNAME].checked,
							click: function() { ordMenu.items[MNUORDERNAME].click() }
						},{
							label: 'File Size', type:'radio', checked:ordMenu.items[MNUORDERSIZE].checked,
							click: function() { ordMenu.items[MNUORDERSIZE].click() }
						},{
							label: 'File Type', type:'radio', checked:ordMenu.items[MNUORDERTYPE].checked,
							click: function() { ordMenu.items[MNUORDERTYPE].click() }
						}
					]
				},{
					label: 'Scale+0.5',
					click: function(item, win, ev) {
						scale = Math.round((scale +0.5) *10)/10
						ui.gridLoad(lastLayoutMode)
						console.log('Scale: '+scale)
					}
				},{
					label: 'Scale-0.5',
					click: function(item, win, ev) {
						if(scale===0.1) {
							console.log('Scale can not go below zero.')
							return
						}
						scale = Math.round((scale -0.5) *10)/10
						if(scale <= 0) scale=0.1
						ui.gridLoad(lastLayoutMode)
						console.log('Scale: '+scale)
					}
				},{
					label: `Scale=1 (${scale})`, accelerator: 'Alt+Right',
					click: function(item, win, ev) {
						scale = 1
						ui.gridLoad(lastLayoutMode)
						//gallery not open when context menu displayed
						//galleryScale()
					}
				}]
			if(window.getSelection().toString() != ''){
				template.unshift(	{
					label: 'Copy to Clipboard',
					click: function(item, focusedWindow) {
						//if (focusedWindow) focusedWindow.close();
						let txt = window.getSelection().toString()
						const { clipboard } = require('electron')
						clipboard.writeText(txt)
					}
				})
			}
			let obj = null
			if(gallery != null){
				obj = itemselected
				target = itemselected.ctrl
			} else
			if(e==undefined || !e.target.id || objprefix.indexOf(e.target.id.substr(0,3)) < 0) {
				target = null
			}
			else{
				target = e.target
				obj = controlIdToObj(target.id)
				itemSelect(obj.pid)
			}

			if(target != null){			//prepend obj functions to template
				//obj - tools
				var tooltmpl =[
					{ label: 'Bulk Operations',
						click: function(item, win, ev) {
							if(selectListHas(obj.pid))
								bulkOps(ui.var.selectList)
							else
								bulkOps(obj.pid)
						}
					},{ label: 'Clipboard',
			    	submenu: [
							{ label: 'Filename',
								click: function(item, win, ev) {
									const {clipboard} = require('electron')
									clipboard.writeText(obj.basename)
									console.log(clipboard.readText())
								}
							},{ label: 'Path',
								click: function(item, win, ev) {
									const {clipboard} = require('electron')
									clipboard.writeText(obj.path)
									console.log(clipboard.readText())
								}
							},{ label: 'src',
							click: function(item, win, ev) {
									const {clipboard} = require('electron')
									clipboard.writeText(obj.src)
									console.log(clipboard.readText())
								}
							}
						]
					},{	label: 'Delete', accelerator:'Delete',
					click: function(item, win, ev) {
						var obj = controlIdToObj(target.id)
						if(selectListHas(obj.pid))
							bulkOps(ui.var.selectList, null, true)
						else{
							fileDelete(obj)
						}
					}
				},{	label: 'Explore',
						click: function(item, win, ev) {
							var obj = controlIdToObj(target.id)
							shell.showItemInFolder(obj.path)
						}
				}
				]

				//handle exeApps
				var execapps = execAppsLoad()
				var mnuExecApps =
					{	label: 'Open with...',
						submenu: [
						{	label: 'Default application',
							click: function(item, win, ev) {
								var obj = controlIdToObj(target.id)
								if(obj.isDirectory===true){
									newFolderViewApp(obj)
									return
								}
								shell.openItem(`"${obj.path}"`)
							}
						},{	label: 'Find application..',
							click: function(item, win, ev) {
								var obj = controlIdToObj(target.id)
								findApp(obj)
							}
						}]
					}
				if(execapps.length>0){
					mnuExecApps.submenu.push(	{ 	type: 'separator' })
					for(var ii in execapps){
						const path = require('path')
						let apath = execapps[ii]
							, nm = path.basename(apath)
						let itm = {
							label: nm,
							click: function(item, win, ev) {
								var obj = controlIdToObj(target.id),
									arg = null,
									cwd = null
								if(obj.isDirectory){
									arg = ui.calc.pathTrailingSlashDel(obj.path).replace(/\//g,'\\')	//vlc fails with trailing slash
									cwd = arg
								}
								else {
//									arg = obj.path.replace(/\//g,'\\')
									cwd= path.dirname(obj.path).replace(/\//g,'\\')
									arg = obj.basename
								}
								console.log(`Exec app - ${nm}:`, apath, arg, cwd)
								ui.calc.execSpawn(apath, arg, cwd)
							}
						}
						//console.log(itm)
						mnuExecApps.submenu.push(itm)
					}
				}
				//tooltmpl.push(mnuExecApps)

				//obj - image menu items
				if(obj.type==='.jpg' || obj.type==='.png') {
					tooltmpl.push({ label: 'Set background - repeat',
						click: function(item, win, ev) {
							document.body.style.background = `repeat url("${obj.src}")`
							document.body.style.backgroundSize =	`cover`
						}
					})
					tooltmpl.push({ label: 'Set background - norepeat',
						click: function(item, win, ev) {
							document.body.style.background = `fixed no-repeat url("${obj.src}")`
							document.body.style.backgroundSize =	`cover`
						}
					})
				}

				//obj - general menu items
				template.unshift(	{ 	type: 'separator' })
				template.unshift(	{label: 'Tools',
						submenu: tooltmpl
				})
				template.unshift({ label: 'Rename',
					click: function(item, win, ev){
						fileRename(target.id)
					}
				})
				template.unshift(mnuExecApps)
				template.unshift({ label: 'Move', accelerator:'M',
					click: function(item, focusedWindow, event) {
							if(selectListHas(obj.pid))
								bulkOps(ui.var.selectList, null, true)
							else
								fileMove(target.id)
					}
				})
				template.unshift({ label: 'Copy', accelerator:'C',
					click: function(item, focusedWindow, event) {
							if(selectListHas(obj.pid))
								bulkOps(ui.var.selectList, null, true)
							else
								renderer.fileCopy(target.id)
					}
				})
				template.unshift({ label: 'Hide',
					click: function(item, win, ev) {
						var obj = controlIdToObj(target.id)
						var el = document.getElementById('obj'+obj.pid)
						isotope.hideItemElements( el )
						isotope.layout()
					}
				})
			}
		}
		e.preventDefault()
		ctxmenu = Menu.buildFromTemplate(template);
	  ctxmenu.popup(remote.getCurrentWindow())
	}, false)
}

/*
	filterAdd({'.ico','.bmp'}, filterMenuitem)
	purpose:
	 	1. assign global to filter
		2. update menuitem
*/
function filterAdd(ext, item){
	if(item===undefined) item=null

	if(ext==='ALL'){
		Object.assign(gExtFilter, exts)	//clone
		ui.gridLoad(lastLayoutMode, gExtFilter)
		var ii=0
		for(var key in exts){			//update menu items
			//mainmenu.items[2].submenu.items[ii].checked=true
			fltsubmenu.items[ii].checked=true
			ii++
		}
	} else
	if(gExtFilter[ext]===undefined) {
		gExtFilter[ext]=1
		ui.gridLoad(lastLayoutMode, gExtFilter)
	}
	if(item !== null && item.isCtxMenu===true)	{ //called from context menu
		fltsubmenu.items[item.itemId].checked=true
	}
}
function filterRemove(ext, item){
	if(item===undefined) item=null
	if(ext==='ALL'){
		gExtFilter = {}
		ui.gridLoad(lastLayoutMode, gExtFilter)
		var ii=0
		for(var key in exts){
			//mainmenu.items[2].submenu.items[ii].checked=false
			fltsubmenu.items[ii].checked=false
			ii++
		}
	} else
	if(gExtFilter[ext]!==undefined) {
		delete gExtFilter[ext]
		ui.gridLoad(lastLayoutMode, gExtFilter)
	}
	if(item !== null && item.isCtxMenu===true)	{ //called from context menu
		fltsubmenu.items[item.itemId].checked=false
	}
}
function fltSubmenuGen(exts, isCtxMenu) {
	if(isCtxMenu===undefined) isCtxMenu = false

	var fltsub = [], arr = []
	for(key in exts) {  arr.push(key) }
	arr.sort()

	for(var idx=0; idx<arr.length; idx++) {
		var key = arr[idx]
		fltsub.push({
			label: `${key} (${exts[key]})`,
			type:'checkbox', accelerator: `Alt+${idx+1}`,
			checked:(isCtxMenu===false ?true :fltsubmenu.items[0].checked),
			isCtxMenu:isCtxMenu, itemId:idx,
			click: function(item, win){
				var ii = item.label.lastIndexOf('(')
				var ext = item.label.substr(0, ii-1)
				if(item.checked===true){
					console.log(`${ext} On`);
					filterAdd(ext, item)
				}
				else {
					console.log(`${ext} Off`);
					filterRemove(ext, item)
				}
			}
		})
	}
	fltsub.push({type:'separator'	})
	fltsub.push({
		label: `Hide All`, accelerator: 'Alt+-',
		click: function(item, win){
			filterRemove('ALL')
		}
	})
	fltsub.push({
		label: `Show All`, accelerator: 'Alt+=',
		click: function(item, win){
			filterAdd('ALL')
		}
	})
	fltsub.push({
		label: `Select All`, accelerator: 'Alt+A',
		click: function(item, win){
			selectItems()
		}
	})
//	fltsub.push({
//		label: 'Show Hidden', accelerator: 'Alt+H',
//		click: function(item, win, ev) {
//			ui.gridLoad(lastLayoutMode)
//		}
//	})

	return fltsub
}

/*
function exec(command,args) {
  command = ui.calc.pathForOS(command)
  command = command.replace(/\\/g, '\\\\')
	console.log('Launching::['+command+']')
	if(typeof args === 'string') args = [args]
	const childexec = require('child_process').spawn;
	const child = childexec(command, args, {
		detached:true,
		stdio:['ignore','ignore','ignore'],
		shell:false,		//fails if true
		windowsVerbatimArguments:false
		}
	)
	child.on('close', (code) => {
  	console.log(`child process exited with code ${code}`);
	})
}
function execFile(command, argsArray) {
	console.log('execFile() Launching:['+command+']')
	const childexecFile = require('child_process').execFile;
	const child = childexecFile(command, argsArray, (error, stdout, stderr) => {
		//bug: error always generated even if command succeeds
		if(error && error.code != 1) {	//windows apps return 1 on success
			console.log('execFile() error:\n['+error+']');
			console.log(`error.code: [${error.code}]`);
			console.log(error);
			alert('execFile() error:\n['+error+']');
		}
	})
}
*/
function newFolderViewApp(obj) {
	console.log('Launching:['+obj.path+']')
	var args=[
				process.cwd()+'/main.js'
			, `--path=${obj.path}`
			, `--order=${ui.args.order}`
			]
	for(key in ui.args){
		if(ui.args[key]=='') continue		//order should ablways be blank
		if(key=='path') continue
		args.push(`--${key}=${ui.args[key]}`)
	}
	console.log(process.execPath, args)
	const spawn = require('child_process').spawn;
	var child = spawn(process.execPath, args, {detached:true, stdio: 'ignore'} )
	child.unref
}
function folderLoad(dir){
	const path = require('path');
	console.log('\nLoad folder items from:', dir)

	const {webFrame} = require('electron')
	webFrame.clearCache()

	let lastOrder = ui.args.order

	var fldrObj = main.fldrLoad(dir)
	renderer.recentAdd(fldrObj.fldr)

	ui.args.path=fldrObj.fldr
	ui.args.order=lastOrder
	ui.args.defaultImageName=fldrObj.args.defaultImageName
	ui.args.defaultImageNum=fldrObj.args.defaultImageNum
	ui.var.selectList=[]
	itemselected=null
	items=fldrObj.items
	exts=fldrObj.exts
	gExtFilter={}
	Object.assign(gExtFilter, exts)	//clone

	remote.getCurrentWindow().setTitle('FolderView - '+ui.args.path)
	//console.log('items:',items)
	//console.log('exts:', exts)	// === gExtFilter
	ui.gridLoad(lastLayoutMode)
}

function fileCopy(controlID,successFunc){
	const path = require('path');
	const fs = require('fs');
	let obj = controlIdToObj(controlID),
			subtitle = ui.calc.fileNameToCaption(obj.basename,55)
	//get new folder
	var bar = new pathBar()
	bar.show({
		library:renderer.libraries(),
		recent:renderer.recent,
		returnType:'folder',
		title:'Select Folder for Copy Operation',
		subtitle:`copying: ${subtitle}`,
		onCancel:function(dlg,force){
			galleryClose(bar.dlg.id)
		},
		onSelect: function(dir){
			execFileCopy(obj, dir, function(job){
				//assume: job = {id, pid, command, msg, duration, stdout, err, stderr}
				recentAdd(dir)
				if( galleryClose(bar.dlg.id) === false)
					document.querySelector('#pswpMain').focus()
			})
		}
	})
	if(gallery===null && imgtypes.indexOf(obj.type) >= 0){
		galleryShow(obj.pid)
		gallery.dlg.dlgParent = bar.dlg
	}
}
function fileDelete(obj){		//delete item from disk and remove from grid
	//assume: obj is an item object: {basename, path, ... }
	console.log(`Delete: "${obj.path}"`, obj)

	let galleryOpened = false
	if(gallery===null && imgtypes.indexOf(obj.type) >= 0){
		let result = galleryShow(obj.pid)
		galleryOpened = true
		gallery.listen('initialZoomInEnd', function() {
			window.setTimeout(function(){			//allow image to be displayed
				execFunc()
			}, 250)
		})
	}
	else
		execFunc()

	function execFunc(){
		if(!confirm(`Delete:\n"${obj.path}"`)) {
			if(galleryOpened === true)
				galleryClose()
			return false
		}

		const fs = require('fs')
		if(obj.isDirectory)
			ui.calc.folderDel(obj.path, fs)
		else
			fs.unlinkSync(obj.path)
		itemRemove(obj.pid)

		if(galleryOpened === true)
			galleryClose()
	}
	return true
}
function fileMove(controlID,successFunc){
	const path = require('path');
	const fs = require('fs');
	var obj = controlIdToObj(controlID),
			subtitle = ui.calc.fileNameToCaption(obj.basename,55)
	//get new folder
	var bar = new pathBar()
	bar.show({
		library:renderer.libraries(),
		recent:renderer.recent,
		returnType:'folder',
		title:'Select Folder for Move Operation',
		subtitle:`moving: ${subtitle}`,
		onCancel:function(dlg,force){
			if( galleryClose(bar.dlg.id) === false)
				document.querySelector('#pswpMain').focus()
		},
		onSelect: function(dir){
			var oldpath = ui.calc.pathForOS( obj.path),
					newpath = ui.calc.pathForOS( path.join( dir, path.basename(obj.path) ) )
			if(oldpath[oldpath.length-1] === '\\')
				oldpath = oldpath.slice(0, -1)
			if(oldpath==newpath){
				alert('Please select a different folder for move operation.')
				return;
			}
			console.log('Move:', oldpath, newpath)
			var mv = require('mv');
			mv(oldpath, newpath, function(err) {
				if(err){
					console.log(`Move "${obj.basename}" failed:`, err)
					alert(`Move "${obj.basename}" failed:\n${err}.`)
				}
				else {
					if(successFunc != null)
						successFunc()

					dlgFactory.bbl(`"${obj.basename}"  Moved`)
					console.log(`Move Success: "${obj.basename}"`)

					itemRemove(obj.pid)
					renderer.recentAdd(dir)
					galleryClose(bar.dlg.id)
				}
			})
		}
	})
	if(gallery===null && imgtypes.indexOf(obj.type) >= 0){
		galleryShow(obj.pid)
		gallery.dlg.dlgParent = bar.dlg
	}
}
function fileRename(controlId){
	dlgRenameCreate(controlId)	//dlgRename created in dlgRename.js
}

function folderLast(){
	if(recent.length < 2) {
		alert('No last folder saved!')
		return
	}
	let last = recent[1][1]
	console.log('folderLast():', last)

	var oldpath=ui.args.path
	folderLoad(last)
	itemSelect(oldpath)
}
function folderNew(cb){
	const {dialog} = remote
	dialog.showSaveDialog({
			title:`Supply New Folder Name`,
			defaultPath: ui.args.path.replace(/\//g,'\\'),
			buttonLabel:'Create Folder',
			nameFieldLabel:'Folder name'
		}
	, function (dir) {
		if (dir === undefined) return;
		let res = null,
			cmd = `mkdir "${dir}"`
		try{
			res = ui.calc.exec(cmd).trim()
		}
		catch(err){
			console.log(`"${cmd}" failed:`, err)
			alert(`"${cmd}" failed:\n${err}.`)
			return
		}
		if(res != ''){
			console.log(`"${cmd}" failed:`, err)
			alert(`"${cmd}" failed:\n${err}.`)
			return
		}
		folderLoad(ui.args.path)
		if(cb != undefined) cb(dir)
	})
}
function folderUp(){
	const path = require('path');
	var oldpath=ui.args.path, newpath=oldpath
	if(ui.args.defaultImageNum != null)
		newpath = path.dirname(newpath)
	newpath = path.dirname(newpath)
	folderLoad(newpath)
	//select the folder
	//console.log('oldpath',oldpath)
	itemSelect(oldpath)
}
function folderChange(){
	if(dlgPathBar==null){
		dlgPathBar = new pathBar()
		dlgPathBar.show({
			library:renderer.libraries()
		,	recent:renderer.recent
		, title:'Change Folder'
		, onCancel:function(){
				dlgPathBar=null
			}
		,	onSelect: function(path){
				folderLoad(path)
				dlgPathBar=null
			}
		})
	}
	else{
		dlgFactory.close(dlgPathBar.dlg, true)
		dlgPathBar=null
	}
}
function sftp(){
	var dlgsftp = new dlgSFTP()
	dlgsftp.show({localPath:ui.args.path})
}

function findApp(obj){
	if(dlgPathBar==null){
		dlgPathBar = new pathBar()
		dlgPathBar.show({
			library:renderer.libraries()
		,	recent:renderer.recent
		, title:'Find Application'
		, onCancel:function(){
				dlgPathBar=null
				//dlgFactory.close(dlgPathBar.dlg, true)
			}
		,	onSelect: function(apath){
				dlgPathBar=null
				if(apath==null) return
				apath = ui.calc.pathSlashFix(apath)
				apath = ui.calc.pathTrailingSlashDel(apath)
				ui.calc.execSpawn(apath, obj.path)
				execAppSave(apath)
			}
		})
	}
	else{
		dlgFactory.close(dlgPathBar.dlg, true)
		dlgPathBar=null
	}
}
function execAppSave(path){
	try{
		const fs = require('fs'),
					jsfn = ui.calc.pathSlashFix(__dirname+'/../tmp/execApps.json')
		var list = []
		if(fs.existsSync(jsfn)===true){
			list = JSON.parse(fs.readFileSync(jsfn, 'utf-8'))
		}
		if(list.indexOf(path)!=-1) return
		list.push(path)
//		list.sort()
		list = execAppSortList(list)
		fs.writeFileSync(jsfn, JSON.stringify(list, null, '\t'), 'utf-8')
	}catch(e){
		console.log('ExecAppSave() error:',e)
	}
}
function execAppSortList(list){			//sort list by application name
	const path = require('path');
	//make temp array to sort
	let arr = []
	for(let idx = 0; idx < list.length; idx++){
		let item = list[idx]
		arr.push(	[path.basename(item).toUpperCase(), idx] )
	}
	//
	arr.sort(function(a, b) {
	  var nameA = a[0]
	  var nameB = b[0]
	  if (nameA < nameB) return -1
	  if (nameA > nameB) return 1
	  return 0
	})
	//assign new items
	let result = []
	for(let ii = 0; ii < arr.length; ii++){
		let idx = arr[ii][1]
		result.push( list[idx] )
	}
	//console.log('execAppSortList',list,result)
	return result
}
function execAppsLoad(){
	try{
		const fs = require('fs')
		, jsfn = ui.calc.pathSlashFix(__dirname+'/../tmp/execApps.json')
		if(fs.existsSync(jsfn)===false) return []
		var list = fs.readFileSync(jsfn, 'utf-8')
		//console.log('reading:',jsfn)
		list = JSON.parse(fs.readFileSync(jsfn, 'utf-8'))
		return list
	}	catch(e){
		console.log('execAppsLoad() error:',e)
		return []
	}
}

function libraryLoadDefault(){
	var result = []
	const app = remote.app
	function local_add(tag, path){
		if(path==null) return
		path = path.trim()
		if(path == '') return
		path = path.replace(/\\/g,'/').toLowerCase()	//lowecase only works for windows' paths
		if(path[path.length-1] != '/')
			path += '/'
		result.push([tag,path])
	}
	//add system paths
	local_add('home',app.getPath('home'))		//.replace(/\\/g,'/')+'/')
	//local_add('appData',app.getPath('appData'))		//.replace(/\\/g,'/')+'/')
	//local_add('userData',app.getPath('userData'))		//.replace(/\\/g,'/')+'/')
	local_add('desktop',app.getPath('desktop'))		//.replace(/\\/g,'/')+'/')
	local_add('documents',app.getPath('documents'))		//.replace(/\\/g,'/')+'/')
	local_add('downloads',app.getPath('downloads'))		//.replace(/\\/g,'/')+'/')
	local_add('music',app.getPath('music'))		//.replace(/\\/g,'/')+'/')
	local_add('pictures',app.getPath('pictures'))		//.replace(/\\/g,'/')+'/')
	local_add('videos',app.getPath('videos'))		//.replace(/\\/g,'/')+'/')
	//add drive letters
	try{
		const execSync = require('child_process').execSync
		var res	= execSync(`fsutil fsinfo drives"`, {encoding:'ascii'})			//return arrayBuffer class
		res = res.trim()
		if(res.substr(0,8)==='Drives: '){
			res = res.substr(8).split(' ')
			for(var key in res){
				val = res[key];
				local_add(val,val)		//.replace(/\\/g,'/'))
			}
		}
		//add custom library paths from file: ./libaryPaths.json
		var arr = customLibraryLoad()
		if(arr.length>0)
			result = result.concat(arr)
		//console.log('libraryLoadDefault', arr, result)
	}
	catch(e){
		console.log('libraryLoadDefault() error while loading drive list:', e)
	}
	//console.log('libraryLoadDefault()',result)
	return result
	/*
	console.log('home\n',app.getPath('home'))
	console.log('appData\n',app.getPath('appData'))
	console.log('userData\n',app.getPath('userData'))
	console.log('temp\n',app.getPath('temp'))
	console.log('exe\n',app.getPath('exe'))
	console.log('module\n',app.getPath('module'))
	console.log('desktop\n',app.getPath('desktop'))
	console.log('documents\n',app.getPath('documents'))
	console.log('downloads\n',app.getPath('downloads'))
	console.log('music\n',app.getPath('music'))
	console.log('pictures\n',app.getPath('pictures'))
	console.log('videos\n',app.getPath('videos'))
	*/
}
function libraryLoad() {
	if(library==null){
		library= libraryLoadDefault()
		/*		library.push(
			//['root', 'c:/']
			['code', 'c:/users/chris/code/']
		,	['electron', 'c:/electron/']
		,	['temp', 'c:/users/chris/temp/']
		,	['website', 'c:/website/']
	)*/
		library.sort(function(a,b){
			var aa = a[1].toLowerCase()
			var bb = b[1].toLowerCase()
			if(aa < bb) return -1
			if (aa > bb) return 1
			return 0
		})
	}
	return library
}
function recentLoad() {
	var js = null
	try{
		const fs = require('fs')
		js = fs.readFileSync(__dirname+'/../tmp/recentFolders.json', 'utf8')
		if(js==null || js.length==0) return []
		var tmpArr = JSON.parse(js)
		//console.log('recentLoad', js,tmpArr)
		return tmpArr
	}
	catch(e){
		console.log('recentLoad() error:',e)
		return []
	}
}
function customLibraryLoad() {
	try{
		const fs = require('fs')
		  , ini = require('ini')
		var config = ini.parse(fs.readFileSync(__dirname+'/../tmp/customLibraries.ini', 'utf-8'))
		if(config==null || config.paths==null) return []
		var tmpArr=[], idx=0
		for(key in config.paths){
			//console.log(key)
			tmpArr.push(['custom'+(++idx),key])
		}
		console.log('customLibraryLoad() results:', tmpArr)
		return tmpArr
	}	catch(e){
		console.log('customLibraryLoad() error:',e)
		return []
	}
}
function recentAdd(apath){
	if(apath==null || apath=='') return
	if(recent==null) recent = recentLoad()
	apath = ui.calc.pathForOS(apath)
	let ap = apath.toLowerCase()
	let found = recent.findIndex( function(item, idx){
		if(item[1].toLowerCase()==ap) return true
	})
	if(found >= 0){
		recent.splice(found,1)
	} else {
//		while(recent.length>=15) recent.pop()
		while(recent.length>=ui.var.recentListMax)
			recent.pop()
	}
	recent.unshift(['',apath])
	var js = JSON.stringify(recent)
	const fs = require('fs')
	var fn = __dirname+'/../tmp/recentFolders.json'
	fs.writeFileSync(fn, js)
	//reload REcent folders menu
	mainMenuGen(exts, ui.args.layout)
}
function recentMenuLoad(){
	if(recent==null) recent = recentLoad()
	if(recent == null || recent.length===0) return []

	let template = []
	for(var ii in recent){
		let nm = recent[ii][1]
		//console.log('nm',nm)
		var itm = {
			label: nm,
			click: function(item, win, ev) {
				//console.log('Load recent', item.label)
				folderLoad(item.label)
			}
		}
		template.push(itm)
	}
	return template
}
function pathMatch(pathToFind) {
	pathToFind = pathToFind.toLowerCase().replace(/\\/g,'/')
	var result = library.find(function (element, idx) {
		var el = element[1].toLowerCase()
		var len = el.length
		var path = pathToFind.substr(0,len)
		//console.log(path, el, path===el)
		return (path===el)
	})
	return (result===undefined ?false :result)
}

function exportToFile(){
	if(dlgExport!==null){
		dlgFactory.close(dlgExport)
		dlgExport=null
		return
	}
	var list = ''
	for(key in items){
		var obj = items[key]
		if(gExtFilter!=null && gExtFilter[obj.type]===undefined) continue
		//console.log(obj)
		list += `${obj.basename}\n`
	}

	dlgExport = dlgFactory.create({
		//focusId: '#btn0',
		canDestroy:true,
		title:'Export File List',
		onClose:function(dlg,force){
			dlg.style.display='none'
			dlgExport = null
		},
		attrib:{ style:{zIndex:1501, maxWidth:'50em'}},
		body: `
	<style>
		#divOptions{border-bottom:1px #00 solid; line-height:2em; width:100%; }
		#divOptions button{ padding:0.5em 1em; }
		#divOptions input{ padding:0; vertical-align:top;  }
		#taList{border:1px solid silver; font-family:sans-serif; height:50vh; overflow:auto; padding:0.5em; text-overflow:ellipsis; width:98%; }
	</style>
	<div id=divOptions>
		&nbsp; Format:
		<label ><input onclick='dlgExport.dlg.listType(this,1)' name=ftype type=radio>CSV</label>
		<label ><input onclick='dlgExport.dlg.listType(this,1)' name=ftype type=radio>JSON</label>
		<label ><input onclick='dlgExport.dlg.listType(this,1)' name=ftype type=radio checked=true>List</label>
		<label ><input onclick='dlgExport.dlg.listType(this,1)' name=ftype type=radio>M3U</label>
		<br>
		&nbsp; Protocol:
		<label ><input onclick='dlgExport.dlg.listType(this,2)' name=format type=radio checked=true>None</label>
		<label ><input onclick='dlgExport.dlg.listType(this,2)' name=format type=radio>File</label>
		<label ><input onclick='dlgExport.dlg.listType(this,2)' name=format type=radio>HTTP</label>
		<label ><input onclick='dlgExport.dlg.listType(this,2)' name=format type=radio>HTTPS</label>
		<label ><input onclick='dlgExport.dlg.listType(this,2)' name=format type=radio>SMB</label>
		<br>
		&nbsp; Include:
		<label title='Include file date'><input onclick='dlgExport.dlg.listType(this,3)' type=checkbox>File date</label>
		<label title='Include file extension'><input onclick='dlgExport.dlg.listType(this,3)' type=checkbox>File ext</label>
		<label title='Include file path'><input onclick='dlgExport.dlg.listType(this,3)' type=checkbox>File path</label>
		<label title='Include file size'><input onclick='dlgExport.dlg.listType(this,3)' type=checkbox>File size</label>
		<label title='Include isDirectory?'><input onclick='dlgExport.dlg.listType(this,3)' type=checkbox>isDirectory</label>
		<label title='Include line numbers'><input onclick='dlgExport.dlg.listType(this,3)' type=checkbox>Line no</label>
		<label title='Include path'><input onclick='dlgExport.dlg.listType(this,3)' type=checkbox>Path</label>
	</div>
	<textarea id=taList>${list}</textarea>
		`,
		buttons:{
			default: 'Save',				//button caption to select when Enter key pressed; may also be an element.id: '#btnXXX'
			Clipboard: function(dlg, btn){	//save and close
				//var str = dlg.querySelector('#taList').innerText
				var str = dlg.querySelector('#taList').value
				console.log(str)
				const {clipboard} = require('electron')
				clipboard.writeText(str)			},
			Save: function(dlg, btn){	//save and close
				const {dialog} = remote
				var opts = dlgExport.dlg
				dialog.showSaveDialog({
						title:`Save ${opts.ftype=='List' ?'File List' :opts.ftype+' File'}`,
						defaultPath: ui.args.path
					}
				, function (fileName) {
					if (fileName === undefined) return;
					const fs = require('fs');
			    fs.writeFile(fileName, document.getElementById("taList").value, 'utf8', (err) => {
					  if (err) throw err;
					  console.log(`${fileName} saved.`);
					})
				})
			} //save button
		}
	})	//confirm dlg create
	dlgExport.dlg.ftype='List'
	dlgExport.dlg.format='None'
	dlgExport.dlg.include={'Path':false, 'Line no':false, 'File ext':false, 'File path':false, 'File size':false , 'File date':false, 'isDirectory':false}
	dlgExport.dlg.listType = function(ctrl,atype){
		const path = require('path');
		var host = require('os').hostname()
		var opts = dlgExport.dlg
		var html = '', idx=0
		if(atype===1){
			var key=ctrl.parentNode.childNodes[1].nodeValue
			opts.ftype = key
			//alert(key+': '+opts.ftype)
		}else
		if(atype===2){
			var key=ctrl.parentNode.childNodes[1].nodeValue
			opts.format = key
			//alert(key+': '+opts.format)
		}
		else{
			var key=ctrl.parentNode.childNodes[1].nodeValue
			opts.include[key] = ctrl.checked
			console.log(key+': '+opts.include[key]+' - '+ctrl.checked)
		}
		function local_Protocol(){
			if(opts.format=='None') return ''
			if(opts.format=='HTTP') return 'http://'
			if(opts.format=='HTTPS') return 'https://'
			if(opts.format=='SMB') return `//${host}/`
			if(opts.format=='File') return 'file:///'
		}
		function local_CSVHead(){
			var str = ''
			var tmp = (opts.include['Line no']==false ?'' :'id')
			if(tmp != '') str += tmp
			//tmp = (opts.include['File path']==false ?'Path' :`File name`)
			str += (str=='' ?'' :',')+'file'
			tmp = (opts.include['File date']==false ?'' :`date`)
			if(tmp != '') str += ','+tmp
			tmp = (opts.include['File ext']==false ?'' :`ext`)
			if(tmp != '') str += ','+tmp
			tmp = (opts.include['File size']==false ?'' :'size')
			if(tmp != '') str += ','+tmp
			tmp = (opts.include['isDirectory']==false ?'' :`isDirectory`)
			if(tmp != '') str += ','+tmp
			tmp = (opts.include['Path']==false ?'' :`Path`)
			if(tmp != '') str += ','+tmp
			return str
		}
		function local_CSV(idx, obj){
			var str = ''
			var tmp = (opts.include['Line no']==false ?'' :idx)
			if(tmp != '') str += tmp
			tmp = (opts.include['File path']==false ?`"${local_Protocol() +obj.basename}"` :`"${local_Protocol() +obj.path}"`)
			if(tmp != '') str += (str=='' ?'' :',')+tmp
			tmp = (opts.include['File date']==false ?'' :`"${new Date(obj.date).toString()}"`)
			if(tmp != '') str += ','+tmp
			tmp = (opts.include['File ext']==false ?'' :`"${obj.type}"`)
			if(tmp != '') str += ','+tmp
			tmp = (opts.include['File size']==false ?'' :obj.size)
			if(tmp != '') str += ','+tmp
			tmp = (opts.include['isDirectory']==false ?'' :(obj.isDirectory===true ?'true' :'false'))
			if(tmp != '') str += ','+tmp
			tmp = (opts.include['Path']==false ?'' :`"${path.dirname(obj.path)}"`)
			if(tmp != '') str += ','+tmp
			return (html=='' ?'' :'\n')+str
		}
		function local_JSONHead(){ return '['}
		function local_JSONFoot(){ return ']'}
		function local_JSON(idx, obj){
			var str = ''
			var tmp = (opts.include['Line no']==false ?'' :`"id":${idx}`)
			if(tmp != '') str += '  '+tmp
			tmp = (opts.include['File path']==false ?`"file":"${local_Protocol() +obj.basename}"` :`"file":"${local_Protocol() +obj.path}"`)
			if(tmp != '') str += (str=='' ?'  ' :',\n  ')+tmp
			tmp = (opts.include['File date']==false ?'' :`"date":"${new Date(obj.date).toString()}"`)
			if(tmp != '') str += ',\n  '+tmp
			tmp = (opts.include['File ext']==false ?'' :`"ext":"${obj.type}"`)
			if(tmp != '') str += ',\n  '+tmp
			tmp = (opts.include['File size']==false ?'' :`"size":${obj.size}`)
			if(tmp != '') str += ',\n  '+tmp
			tmp = (opts.include['isDirectory']==false ?'' :`"isDirectory":${obj.isDirectory}`)
			if(tmp != '') str += ',\n  '+tmp
			tmp = (opts.include['Path']==false ?'' :`"path":"${path.dirname(obj.path)}"`)
			if(tmp != '') str += ',\n  '+tmp
			str	+= '\n}'
			return (html=='[' ?'' :',')+'{\n'+str
		}
		function local_List(idx, obj){
			var str =
				 (opts.include['Line no']  ==false ?'' :idx+'. ')
				+local_Protocol() +(opts.include['File path']==false ?obj.basename :obj.path)
				+(opts.include['File date']==false ?'' :', '+new Date(obj.date).toString())
				+(opts.include['File ext']==false ?'' :', '+obj.type)
				+(opts.include['File size']==false ?'' :', '+obj.size+'bytes')
				+(opts.include['isDirectory']==false ?'' :', '+obj.isDirectory)
				+(opts.include['Path']==false ?'' :', '+path.dirname(obj.path))
			return (html=='' ?'' :'\n')+str
		}
		function local_M3U(idx, obj){
			var str = local_Protocol() +(opts.include['File path']==false ?obj.basename :obj.path)
			return (html=='' ?'' :'\n')+str
		}

		if(opts.ftype=='CSV')
			html = local_CSVHead()
		if(opts.ftype=='JSON')
				html = local_JSONHead()
		for(key in items){
			var obj = items[key]
			if(gExtFilter!=null && gExtFilter[obj.type]===undefined) continue
			if(opts.ftype=='CSV')
				html += local_CSV(++idx, obj)
			else
			if(opts.ftype=='JSON')
				html += local_JSON(++idx, obj)
			else
			if(opts.ftype=='List')
				html += local_List(++idx, obj)
			else
			if(opts.ftype=='M3U')
				html += local_M3U(++idx, obj)
		}
		if(opts.ftype=='JSON')
				html += local_JSONFoot()
		dlgExport.querySelector('#taList').value = html
	}
}

function execFileCopy(objlist, dir, cbAfterExec, cbBeforeExec){
	//assume: objlist = {} or [{}, ...], where {} === items[n]
	if(Array.isArray(objlist) != true)
		objlist = [objlist]

	let oldpath, newpath, cmd, id = 0

	for(let obj of objlist){
		oldpath = ui.calc.pathForOS( obj.path)
		newpath = ui.calc.pathForOS( dir )
		cmd = null
		// not using /V (verify files afte copy) for peformance
		if(obj.isDirectory==true)
			cmd = `xcopy "${oldpath}*" "${newpath}${obj.basename}\\" /E /I /Q /K /Y /J `
		else
			cmd = `xcopy "${oldpath}" "${newpath}" /I /Q /K /Y /J `
		//
		let localcallback = function(opt){
			//console.log('localcallback:', opt.msg)
			//assume: opt = {id, pid, command, msg, duration, stdout, err, stderr}
			if(opt.stdout.indexOf('File(s) copied') < 0 ){
				opt.err = true
				console.log(`${opt.msg} failed:`, opt.stdout)
				alert(`${opt.msg} failed:\n${opt.stdout}.`)
			}
			else {
				//console.log(`${opt.msg} completed:`, opt.duration, dir)
				if(cbAfterExec)
					cbAfterExec(opt)
				//dlgFactory.bbl(`${opt.msg} completed`)
			}
		}
		//see execQue.js:
		execQue({
			id: ++id,
			msg:`Copying: "${obj.basename}"`,
			command:cmd,
			cbBeforeExec:cbBeforeExec,
			cbAfterExec:localcallback,
			pid:obj.pid
		})
	}
}
