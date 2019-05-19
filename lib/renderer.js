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
var MNUCOLS=5
var MNUROWS=MNUCOLS+1
var MNUVERT=MNUCOLS+2
var MNUWALL=MNUCOLS+3
var mitScroll=null		//scroll main menu item
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
			 if(mnu==='default') ordMenu.items[1].submenu.items[0].click()
	else if(mnu==='first') ordMenu.items[1].submenu.items[1].click()
	else if(mnu==='hidden') ordMenu.items[1].submenu.items[2].click()
	else if(mnu==='last') ordMenu.items[1].submenu.items[3].click()
}
exports.ordMenuClick = function(mnu){
			 if(mnu==='date') ordMenu.items[3].click()
	else if(mnu==='name') ordMenu.items[4].click()
	else if(mnu==='size') ordMenu.items[5].click()
	else if(mnu==='type') ordMenu.items[6].click()
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
		while(recent.length>=15) recent.pop()
	}
	recent.unshift(['',apath])
	var js = JSON.stringify(recent)
	const fs = require('fs')
	var fn = __dirname+'/../tmp/recentFolders.json'
	fs.writeFileSync(fn, js)
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

exports.bulkOps = function(pid, dest, autoMode) {
	bulkOps(pid, dest, autoMode)
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
						renderer.bulkOps()
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
		 label: 'Filter',
		 submenu: fltSubmenuGen(exts, false)
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
				},{	label: 'Show Hidden', accelerator: 'Alt+H',
						click: function(item, win, ev) {
							ui.gridLoad(lastLayoutMode)
							//isotope.layout()
							//ctxmenu.popup(win, menupos.x, menupos.y, item.position)
						}
				},{	label: 'Shuffle', accelerator: 'Alt+Shift+S',
						click: function(item, win, ev) {
							ui.args.shuffle=true
							ui.gridLoad(lastLayoutMode)
						}
				},{ 	type: 'separator'
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
						ui.args.order=ui.var.lastOrder
						ui.gridLoad(lastLayoutMode)
					}
				},{ label: 'Folders', accelerator:'Alt+Shift+F',
					submenu: [
					{	label: 'Default', type:'radio', checked:(ui.args.folders==='default'),
						click: function() { ui.args.folders='default'; ui.args.order=ui.var.lastOrder; ui.gridLoad(lastLayoutMode)} },
					{	label: 'First', type:'radio', checked:(ui.args.folders==='first'),
						click: function() { ui.args.folders='first'; ui.args.order=ui.var.lastOrder; ui.gridLoad(lastLayoutMode) } },
					{	label: 'Hidden', type:'radio', checked:(ui.args.folders==='hidden'),
						click: function() { ui.args.folders='hidden'; ui.args.order=ui.var.lastOrder; ui.gridLoad(lastLayoutMode) }  },
					{	label: 'Last', type:'radio', checked:(ui.args.folders==='last'),
					 click: function() { ui.args.folders='last'; ui.args.order=ui.var.lastOrder; ui.gridLoad(lastLayoutMode) } }
					]
				},{	label: 'Shuffle', accelerator: 'Alt+Shift+S',
						click: function(item, win, ev) {
							ui.args.shuffle=true
							ui.gridLoad(lastLayoutMode)
						}
				},{ 	type: 'separator'
				},{
					label: 'File Date', type:'radio', checked:(ui.args.order==='date'),
					click: function() { ui.args.order='date'; ui.gridLoad(lastLayoutMode) }
				},{
					label: 'File Name', type:'radio', checked:(ui.args.order==='name'),
					click: function() { ui.args.order='name'; ui.gridLoad(lastLayoutMode) }
				},{
					label: 'File Size', type:'radio', checked:(ui.args.order==='size'),
					click: function() { ui.args.order='size'; ui.gridLoad(lastLayoutMode) }
				},{
					label: 'File Type', type:'radio', checked:(ui.args.order==='type'),
					click: function() { ui.args.order='type'; ui.gridLoad(lastLayoutMode) }
				},{ 	type: 'separator'
			},{
				label: 'File Date, Descending',
				click: function() {
					ordMenu.items[0].checked = ui.args.descending = true
					ordMenu.items[4].click()
				}
			},{
				label: 'File Name, Ascending',
				click: function() {
					ordMenu.items[0].checked = ui.args.descending = false
					ordMenu.items[5].click()
				}
			},{
				label: 'File Size, Descending',
				click: function() {
					ordMenu.items[0].checked = ui.args.descending = true
					ordMenu.items[6].click()
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
	var objClicked = null
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
				{ label: 'Select All', role: 'selectall'},
			]
		}
		else { //default menu for folder items
			template = [	//basic context menu
				/*{
					label: 'Exit (Alt+F4)',
					click: function(item, focusedWindow) {
						if (focusedWindow) focusedWindow.close();
					}
				},*/
				{
					label: 'Folder Up (Backspace)',
					click: function(item, focusedWindow) {
						folderUp()
					}
				},/*{ label: 'DevTools', accelerator: 'ctrl+i', type:'checkbox',
					click: function(item, focusedWindow) {
						if (focusedWindow) focusedWindow.toggleDevTools();
					}
				},{ label: 'Filter',
			  	submenu: fltSubmenuGen(exts, true)
			  }*/,{ label: 'Fullscreen', role: 'togglefullscreen'
				},{
			    label: 'Layout',
			    submenu: [
						{	label: 'Scroll Toggle', type:'checkbox', checked:mitScroll.checked, accelerator: 'Alt+S',
							click: function(item, win, ev) {
								mitScroll.checked = item.checked
								mitScroll.click()
							}
						},{	label: 'Show Hidden',		accelerator: 'Alt+H',
			        	click: function(item, win, ev) {
									ui.gridLoad(lastLayoutMode)
									//isotope.layout()
									//ctxmenu.popup(win, menupos.x, menupos.y, item.position)
								}
						},{	label: 'Shuffle', accelerator: 'Alt+Shift+S',
			        	click: function(item, win, ev) {
									ui.args.shuffle=true
									ui.gridLoad(lastLayoutMode)
								}
						},{ 	type: 'separator'
						},{	label: 'Cols',
								accelerator: 'Alt+C', type:'radio',
								checked: layoutmenu.items[MNUCOLS].checked,
			        	click: function(item, win, ev) {
									var item = layoutmenu.items[MNUCOLS]
									item.click(item, win, ev)
								}
						},/*{	label: 'horizontal',
			        	click: function(item, win, ev) {
									ui.gridLoad('horiz')
								}
						},*/{		label: 'Rows',
							accelerator: 'Alt+R', type:'radio',
							checked: layoutmenu.items[MNUROWS].checked,
			        click: function(item, win, ev) {
								var item = layoutmenu.items[MNUROWS]
								item.click(item, win, ev)
								//ui.gridLoad('fitRows')
								//isotope.layout()
								//ctxmenu.popup(win, menupos.x, menupos.y, item.position)
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
							checked:ordMenu.items[0].checked, accelerator:'Alt+Shift+D',
							click: function(item, win, ev) { ordMenu.items[0].click() }
						},{ label: 'Folders', accelerator:'Alt+Shift+F',
							submenu: [
							{	label: 'Default', type:'radio',
								checked:ordMenu.items[1].submenu.items[0].checked,
								click: function() { ordMenu.items[1].submenu.items[0].click() } },
							{	label: 'First', type:'radio',
								checked:ordMenu.items[1].submenu.items[1].checked,
								click: function() { ordMenu.items[1].submenu.items[1].click() } },
							{	label: 'Hidden', type:'radio',
								checked:ordMenu.items[1].submenu.items[2].checked,
								click: function() { ordMenu.items[1].submenu.items[2].click() }  },
							{	label: 'Last', type:'radio',
								checked:ordMenu.items[1].submenu.items[3].checked,
							 	click: function() { ordMenu.items[1].submenu.items[3].click() } }
							]
						},{	label: 'Shuffle', accelerator: 'Alt+Shift+S',
								click: function(item, win, ev) {
									ui.args.shuffle=true
									ui.gridLoad(lastLayoutMode)
								}
						},{ 	type: 'separator'
						},{
							label: 'File Date', type:'radio', checked:ordMenu.items[4].checked,
							click: function() { ordMenu.items[4].click() }
						},{
							label: 'File Name', type:'radio',  checked:ordMenu.items[5].checked,
							click: function() { ordMenu.items[5].click() }
						},{
							label: 'File Size', type:'radio', checked:ordMenu.items[6].checked,
							click: function() { ordMenu.items[6].click() }
						},{
							label: 'File Type', type:'radio', checked:ordMenu.items[7].checked,
							click: function() { ordMenu.items[7].click() }
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
				objClicked = itemselected.ctrl
			} else
			if(e==undefined || !e.target.id || objprefix.indexOf(e.target.id.substr(0,3)) < 0) {
				objClicked = null
			}
			else{
				objClicked = e.target
				obj = idToObj(objClicked.id)
				itemSelect(obj.pid)
			}

			if(objClicked != null){			//prepend obj functions to template
				//obj - tools
				var tooltmpl =[
					{ label: 'Bulk Operations',
						click: function(item, win, ev) {
							if(selectListHas(obj.pid))
								renderer.bulkOps(ui.var.selectList)
							else
								renderer.bulkOps(obj.pid)
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
						var obj = idToObj(objClicked.id)
						if(selectListHas(obj.pid))
							renderer.bulkOps(ui.var.selectList, null, true)
						else{
							fileDelete(obj)
						}
					}
				},{	label: 'Explore',
						click: function(item, win, ev) {
							var obj = idToObj(objClicked.id)
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
								var obj = idToObj(objClicked.id)
								if(obj.isDirectory===true){
									newFolderViewApp(obj)
									return
								}
								shell.openItem(`"${obj.path}"`)
							}
						},{	label: 'Find application..',
							click: function(item, win, ev) {
								var obj = idToObj(objClicked.id)
								findApp(obj)
							}
						}]
					}
				if(execapps.length>0){
					mnuExecApps.submenu.push(	{ 	type: 'separator' })
					for(var ii in execapps){
						const path = require('path')
							, apath = execapps[ii]
							, nm = path.basename(apath)
						var itm = {	label: nm,
							click: function(item, win, ev) {
								var obj = idToObj(objClicked.id),
									arg = null
								if(obj.isDirectory)
									arg = ui.calc.pathTrailingSlashDel(obj.path).replace(/\//g,'\\')	//vlc fails with trailing slash
								else
									arg = obj.path.replace(/\//g,'\\')
								//console.log(nm, apath, obj.path)
								ui.calc.execSpawn(apath, arg)
							}
						}
						//console.log(itm)
						mnuExecApps.submenu.push(itm)
					}
				}
//				tooltmpl.push(mnuExecApps)

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
				/*tooltmpl.push({ label: 'Zero file/folder',
					click: function(item, win, ev) {
						alert(1)
					}
				})*/

				//obj - general menu items
				template.unshift(	{ 	type: 'separator' })
				template.unshift(	{label: 'Tools',
						submenu: tooltmpl
				})
				template.unshift({ label: 'Rename',
					click: function(item, win, ev){
						fileRename(objClicked.id)
					}
				})
				template.unshift(mnuExecApps)
				template.unshift({ label: 'Move', accelerator:'M',
					click: function(item, focusedWindow, event) {
							if(selectListHas(obj.pid))
								renderer.bulkOps(ui.var.selectList, null, true)
							else
								fileMove(objClicked.id)
					}
				})
				template.unshift({ label: 'Copy', accelerator:'C',
					click: function(item, focusedWindow, event) {
							if(selectListHas(obj.pid))
								renderer.bulkOps(ui.var.selectList, null, true)
							else
								renderer.fileCopy(objClicked.id)
					}
				})
				template.unshift({ label: 'Hide',
					click: function(item, win, ev) {
						var obj = idToObj(objClicked.id)
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
	return fltsub
}

function idToObj(id) {
	var pid = Number(id.substr(3,10))
	var obj = items[pid]
	return obj
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
			, `--order=${ui.var.lastOrder}`
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
	//const main = remote.require('./main.js')
	const path = require('path');
	console.log('\nLoad folder items from:', dir)

	const {webFrame} = require('electron')
	webFrame.clearCache()

	var fldrObj = main.fldrLoad(dir)
	renderer.recentAdd(fldrObj.fldr)

	ui.args.path=fldrObj.fldr
	ui.args.order=ui.var.lastOrder
	ui.args.defaultImageName=fldrObj.args.defaultImageName
	ui.args.defaultImageNum=fldrObj.args.defaultImageNum
	ui.var.selectList=[]
	itemselected=null
	items=fldrObj.items
	exts=fldrObj.exts
	gExtFilter={}
	Object.assign(gExtFilter, exts)	//clone

	remote.getCurrentWindow().setTitle('FolderView - '+ui.args.path)
	mainMenuGen(exts, ui.args.layout)
	console.log('items:',items)
	console.log('exts:', exts)	// === gExtFilter
	ui.gridLoad(lastLayoutMode)
}

function fileCopy(controlID,successFunc){
	const path = require('path');
	const fs = require('fs');
	let obj = idToObj(controlID),
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
			if(gallery!=null
			&& gallery.dlg.dlgParent !== null
			&& gallery.dlg.dlgParent.id === bar.dlg.id) {
				gallery.dlg.dlgParent = null
				galleryClose()
			}
		},
		onSelect: function(dir){
			var oldpath = ui.calc.pathForOS( obj.path),
					newpath = ui.calc.pathForOS( dir ),
					tmr = ui.calc.timeStart()
			let cmd = null
			if(obj.isDirectory==true){
				cmd = `xcopy "${oldpath}*" "${newpath}${obj.basename}\\" /E /V /I /Q /K /Y /J `
			}
			else
				cmd = `xcopy "${oldpath}" "${newpath}" /V /I /Q /K /Y /J `
			console.log('Copy:', cmd)
			//exec
			ui.calc.execAsync(cmd, function(err, res, stderr){
				if(err){
					console.log(`Copy "${obj.basename}" failed:`, err)
					alert(`Copy "${obj.basename}" failed:\n${err}.`)
					return
				}
				//console.log('Result:', res)
				if(res.indexOf('File(s) copied') < 0 ){
					console.log(`Copy "${obj.basename}" failed:`, res)
					alert(`Copy "${obj.basename}" failed:\n${res}.`)
				}
				else {
					console.log(`Copy completed:`, ui.calc.timeEnd(tmr,'s'), obj.basename, newpath)
					if(successFunc != null)
						successFunc()
					dlgFactory.bbl(`Copy completed: "${obj.basename}"`)
					//let dir = path.dirname()
					renderer.recentAdd(newpath)
				}
				if(gallery != null){
					if(gallery.dlg.dlgParent !== null	&& gallery.dlg.dlgParent.id === bar.dlg.id) {
						gallery.dlg.dlgParent = null
						galleryClose()
					}
					else
					 document.querySelector('#pswpMain').focus()
				}
			})
			dlgFactory.bbl(`Copying "${obj.basename}" ...`)
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

		//shell.moveItemToTrash(obj.path)
		const fs = require('fs')
		if(obj.isDirectory)
			ui.calc.folderDel(obj.path, fs)
		else
			fs.unlinkSync(obj.path)
		itemRemove(obj.pid)

		if(galleryOpened === true)
			galleryClose()
		else
		if(gallery != null)
			galleryRemoveCurrentItem()
	}
	return true
}
function fileMove(controlID,successFunc){
	const path = require('path');
	const fs = require('fs');
	var obj = idToObj(controlID),
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
			if(gallery!=null
			&& gallery.dlg.dlgParent !== null
			&& gallery.dlg.dlgParent.id === bar.dlg.id) {
				gallery.dlg.dlgParent = null
				galleryClose()
			}
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
					itemRemove(obj.pid)
					if(successFunc != null)
						successFunc()
					dlgFactory.bbl(`"${obj.basename}"  Moved`)
					console.log(`Move Success: "${obj.basename}"`)
					renderer.recentAdd(dir)
				}
				if(gallery != null){
					if(gallery.dlg.dlgParent !== null	&& gallery.dlg.dlgParent.id === bar.dlg.id) {
						gallery.dlg.dlgParent = null
						galleryClose()
					}
					else {
						//document.querySelector('#pswpMain').focus()
						galleryRemoveCurrentItem()
					}
				}
			})
		}
	})
	if(gallery===null && imgtypes.indexOf(obj.type) >= 0){
		galleryShow(obj.pid)
		gallery.dlg.dlgParent = bar.dlg
	}
}
function fileRename(objid){
	const path = require('path');
	const fs = require('fs');

	ui.var.dlgRenameEd=null		//reset each call
	ui.var.dlgRenameSelRepeat=null

	if(typeof ui.var.renamedLast==='undefined'){ //only set in this func
		ui.var.renamedLast=''
		ui.var.renamedAutoLoad=true
		ui.var.dlgRenameLoad = function(event){	//called by rename dlg
			var nm = ui.var.renamedLast
			if(nm!=='')
			  document.getElementById('inpRNNew').value=nm
			//if(nm!=='')
			//	document.getElementById('inpRNNew').value=ui.calc.strInc(nm)
			//else
			//	dlgFactory.bbl('No previous filename used.');
		}
		ui.var.dlgRenamePaste = function(event){	//called by rename dlg
			const {clipboard} = require('electron')
			document.getElementById('inpRNNew').value=clipboard.readText()
		}
		ui.var.dlgRenameCopy = function(event){	//called by rename dlg
			const {clipboard} = require('electron')
			clipboard.writeText(document.getElementById('inpRNNew').value)
		}
		ui.var.dlgRenameDec = function(event){	//called by rename dlg
			fnnew = document.getElementById('inpRNNew').value
			var parts = path.parse(fnnew)
			fnnew = ui.calc.strDec(parts.name)+parts.ext
			document.getElementById('inpRNNew').value=fnnew
		}
		ui.var.dlgRenameInc = function(event){	//called by rename dlg
			fnnew = document.getElementById('inpRNNew').value
			var parts = path.parse(fnnew)
			fnnew = ui.calc.strInc(parts.name)+parts.ext
			document.getElementById('inpRNNew').value=fnnew
		}

		ui.var.dlgRenameSelClear = function(event){
			let ed = ui.var.dlgRenameEd
			if(ed === null) return ui.eventStop(event)

			let len = ed.value.length,
					start = ed.selectionStart,
					end = ed.selectionEnd

			let val = ''
			if(start > 0)
				val = ed.value.substr(0, start)
			if(end < len)
				val += ed.value.substr(end, len)
			console.log('selection clear:', val, ed.value)
			ui.var.dlgRenameEd = null
			ed.value = val

			ed.focus()
			return ui.eventStop(event)
		}
		ui.var.dlgRenameSelMoveRightWs = function(event){
			let ed = ui.var.dlgRenameEd,
					init = false
			if(ed === null){
				ed = document.getElementById('inpRNNew')
				ui.var.dlgRenameEd = ed
				init = true
			}
			let len = ed.value.length,
					start = ed.selectionStart,
					end = ed.selectionEnd,
					dir = ed.selectionDirection
//			console.log('FilenameSelMoveRight:', ed.value.length, ed.selectionDirection, ed.selectionStart, ed.selectionEnd)
			if(init === true){
				dir = 'forward'
				start = 0
				end = 1
			} else
			if(start === end)
				dir = 'forward'		//browser defaults to this

			let results = []
			if(dir === 'forward') {
				for(let ch of ui.var.dlgRenameSelWhitespace){
					let ii = ed.value.indexOf(ch, end)
					if(ii >= 0)
						results.push( ii +1)
				}
			}
			else {
				for(let ch of ui.var.dlgRenameSelWhitespace){
					let ii = ed.value.indexOf(ch, start +1)
					if(ii >= 0)
						results.push( ii )
				}
			}

			if(results.length === 0){
				if(dir === 'forward')
					end = len
				else
					start = 0
			} else
			if(dir === 'forward')
				end = results.sort((a, b) => a - b)[0]
			else
				start = results.sort((a, b) => a - b)[0]

			if(start >= 0 && start <= len && end >= 0 && end <= len){
				ed.setSelectionRange(start, end, dir)
//				console.log('  FilenameSelMoveRight:', len, dir, start, end)
//				console.log('    FilenameSelMoveRight:', ed.value.length, ed.selectionDirection, ed.selectionStart, ed.selectionEnd)
			}
//			console.log('FilenameSelMoveRightWs:', event.detail, len, dir, results)
			ed.focus()
			return ui.eventStop(event)
		}
		ui.var.dlgRenameSelMoveRight = function(event){
			let ed = ui.var.dlgRenameEd,
					init = false
			if(ed === null){
				ed = document.getElementById('inpRNNew')
				ui.var.dlgRenameEd = ed
				init = true
			}
			let len = ed.value.length,
					start = ed.selectionStart,
					end = ed.selectionEnd,
					dir = ed.selectionDirection
//			console.log('FilenameSelMoveRight:', ed.value.length, ed.selectionDirection, ed.selectionStart, ed.selectionEnd)
			if(init === true){
				dir = 'forward'
				start = 0
				end = 1
			} else
			if(start === end){
				dir = 'forward'
				if(start === len) start = 0
				end = start +1
			} else
			if(dir === 'forward')
				end += 1
			else
				start +=1

			if(start >= 0 && start <= len && end >= 0 && end <= len){
				ed.setSelectionRange(start, end, dir)
//				console.log('  FilenameSelMoveRight:', len, dir, start, end)
//				console.log('    FilenameSelMoveRight:', ed.value.length, ed.selectionDirection, ed.selectionStart, ed.selectionEnd)
			}
			ed.focus()

			if(ui.var.dlgRenameSelRepeat === 'dlgRenameSelMoveRight')			//mouse held down; called by self
				return
			if(ui.var.dlgRenameSelRepeat === null) {												//initiate mouse hold action
				ui.var.dlgRenameSelRepeat = 'dlgRenameSelMoveRight'
				let nIntervId = window.setInterval(function(){
					if(ui.var.dlgRenameSelRepeat === 'dlgRenameSelMoveRight')
						ui.var.dlgRenameSelMoveRight(event)
					else
						window.clearInterval(nIntervId)
				}, ui.var.dlgRenameSelRepeatDelay)
			}

			return ui.eventStop(event)
		}
		ui.var.dlgRenameSelMoveLeft = function(event){
			let ed = ui.var.dlgRenameEd,
					init = false
			if(ed === null){
				ed = document.getElementById('inpRNNew')
				ui.var.dlgRenameEd = ed
				init = true
			}
			let len = ed.value.length,
					start = ed.selectionStart,
					end = ed.selectionEnd,
					dir = ed.selectionDirection
//			console.log('dlgRenameSelMoveLeft:', ed.value.length, ed.selectionDirection, ed.selectionStart, ed.selectionEnd)

			if(init === true){
				dir = 'backward'
				start = len -1
				end = len
				let ii = ed.value.substring( len -4).lastIndexOf('.')
				if(ii >= 0){
					ii = len -4 +ii			//set to char before .
					start = ii -1
					end = ii
				}
			} else
			if(start === end){
				dir = 'backward'
				if(end === 0) end = len
				start = end -1
			} else
			if(dir === 'forward')
				end -= 1
			else
				start -=1

			if(start >= 0 && start <= len	&& end >= 0	&& end <= len){
				ed.setSelectionRange(start, end, dir)
//				console.log('_dlgRenameSelMoveRight:', len, dir, start, end)
//				console.log('___dlgRenameSelMoveLeft:', ed.value.length, ed.selectionDirection, ed.selectionStart, ed.selectionEnd)
				ed.focus()
			}
			if(ui.var.dlgRenameSelRepeat === 'dlgRenameSelMoveLeft')			//mouse held down; called by self
				return
			if(ui.var.dlgRenameSelRepeat === null) {												//initiate mouse hold action
				ui.var.dlgRenameSelRepeat = 'dlgRenameSelMoveLeft'
				let nIntervId = window.setInterval(function(){
					if(ui.var.dlgRenameSelRepeat === 'dlgRenameSelMoveLeft')
						ui.var.dlgRenameSelMoveLeft(event)
					else
						window.clearInterval(nIntervId)
				}, ui.var.dlgRenameSelRepeatDelay)
			}
			return ui.eventStop(event)
		}
		ui.var.dlgRenameSelMoveLeftWs = function(event){
			let ed = ui.var.dlgRenameEd,
					init = false
			if(ed === null){
				ed = document.getElementById('inpRNNew')
				ui.var.dlgRenameEd = ed
				init = true
			}
			let len = ed.value.length,
					start = ed.selectionStart,
					end = ed.selectionEnd,
					dir = ed.selectionDirection
//			console.log('FilenameSelMoveLeftWs:', ed.value.length, ed.selectionDirection, ed.selectionStart, ed.selectionEnd)
			if(init === true){
				dir = 'backward'
				start = len -1
				end = len
				//fix: replace with path.extname()
				let ii = ed.value.substring( len -4).lastIndexOf('.')
				if(ii >= 0){
					ii = len -4 +ii			//set to char before .
					start = ii -1
					end = ii
				}
			}else
			if(start === end)
				dir = 'backward'

			let results = []
			if(dir === 'forward') {
				for(let ch of ui.var.dlgRenameSelWhitespace){
					let ii = ed.value.lastIndexOf(ch, end -1)
					if(ii >= 0)
						results.push( ii )
				}
			}
			else {
				for(let ch of ui.var.dlgRenameSelWhitespace){
					let ii = ed.value.lastIndexOf(ch, start -1)
					if(ii >= 0)
						results.push( ii )
				}
			}

			if(results.length === 0){
				if(dir === 'forward')
					end = 0
				else
					start = 0
			}else
			if(dir === 'forward')
				end = results.sort((a, b) => a - b)[results.length -1]
			else
				start = results.sort((a, b) => a - b)[results.length -1]

			if(start >= 0 && start <= len && end >= 0 && end <= len){
				ed.setSelectionRange(start, end, dir)
//				console.log('  FilenameSelMoveLeftWs:', len, dir, start, end)
//				console.log('    FilenameSelMoveLeftWs:', ed.value.length, ed.selectionDirection, ed.selectionStart, ed.selectionEnd)
			}
//			console.log('FilenameSelMoveLeftWs:', event.detail, len, dir, results)
			ed.focus()
			return ui.eventStop(event)
		}

		ui.var.dlgRenameReplace = function(event){
			let ed = document.getElementById('inpRNNew'),
					val = ed.value,
					dlgReplace = null
			dlgReplace = dlgFactory.create({
					focusId: '#inpRNReplace',
					title:'Replace text in file name',
					width:'51em',
					attrib:{ style:{zIndex:1501, maxWidth:'none'}},
					body: `
						<label style="display:block;margin-top:0.5em">File name:<br>&nbsp; &nbsp; <textarea id=inpOld readonly style='border:0; font-family:Arial; width:94%; text-align:left;'>${val}</textarea></label>
						<label style="display:block;margin-top:0.5em">Find:<br>&nbsp; &nbsp; <input id=inpRNReplace type=text value='.' style='width:54%; text-align:left;'></label>
						<label style="display:block;margin-top:0.5em">Replace with:<br>&nbsp; &nbsp; <input id=inpRNWith type=text value=' ' style='width:54%; text-align:left;'></label>
					`,
					buttons:{
						default: 'Confirm',				//button caption to select when Enter key pressed; may also be an element.id: '#btnXXX'
						Confirm: function(dlgConfirm, btn){	//save and close
							let rep = dlgReplace.querySelector('#inpRNReplace').value,
									wi = dlgReplace.querySelector('#inpRNWith').value
							dlgFactory.close(dlgReplace,true)
							if(rep === '' ) {
								console.log('Replace nothing to do', rep, wi)
								return
							}
							let from = val.length -1
							if(rep==='.'){ //preserve file extension
								//const path = require('path');
								let ext = path.extname(val)
								if(ext != '')
									from -= ext.length
							}
							let idx = val.lastIndexOf(rep, from)
							while(idx >= 0){
								val = val.replace(rep, wi)
								idx = val.lastIndexOf(rep, from)
							}
//							console.log('replace', rep, wi, from, val, ed.value)
							ed.value = val
						} //confirm button
					}
				})	//dlgReplace create
			return ui.eventStop(event)
		}
	}

	var obj = idToObj(objid)
	var fn = path.basename(obj.path)
	var ext = path.extname(obj.path)
	var fnnew=fn	//ui.calc.strInc(fn)

	var dlgRename = dlgFactory.create({	//rename dlg
		attrib:{ className:'dlgRename', style:{zIndex:1500}},
		canDestroy:true,
		focusId: '#inpRNNew',
		title:'Rename file',
		width:'51em',
		onClose:function(dlg,force){
//			dlg.style.display='none'
			if(gallery!=null
			&& gallery.dlg.dlgParent !== null
			&& gallery.dlg.dlgParent.id === dlgRename.id) {
				gallery.dlg.dlgParent = null
				galleryClose()
			}
		},
		body: `<style>
					.dlgRename .dlgBody .dlgButton{ border-radius:2px; font-size:1em; }
					.divRenameHover{ background:beige; border:1px solid silver; border-top:none; box-shadow:1px 1px 1px #2f2f2f; font-size:1em; padding:0.5em; margin:1px 0 0 3px; z-index:1600; }
					.divRenameHover label{ display:block; }
					</style>
					<label style="display:block;margin-top:0.5em">Old name <br> <input id=inpOld type=text value="${fn}" readonly style='background:#ddd; color:#000; border:1px solid silver; text-align:left; width:45em;'> </label>
					 <label style="display:block;margin:0.5em 0 0.5em 0">New name<br>
					 	<!--input id=inpRNNew type=text value="${fnnew}" style='text-align:left; width:45em;' tabindex=0-->
					 	<textarea id=inpRNNew onclick="ui.var.dlgRenameEd=this;" type=text style='font-family:Arial; text-align:left; width:44.7em;' tabindex=0>${fnnew}</textarea>
					 </label>
					 <button class='el el-plus dlgButton' onclick="ui.var.dlgRenameInc(event)" title="Increment the new filename"></button> </label>
					 <button class='el el-minus dlgButton' onclick="ui.var.dlgRenameDec(event)" title="Decrement the new filename"></button> </label>
					 <button class='el el-plus-sign dlgButton' onclick="ui.var.dlgRenameLoad(event)" title="Load and increment the last filename used"></button>
					 &nbsp; &nbsp;
					 <button class='el el-circle-arrow-right dlgButton' title="Select/Deselect right to next whitespace char" onmousedown="ui.var.dlgRenameSelMoveRightWs(event)" onmouseup="ui.var.dlgRenameSelRepeat=null"></button>
					 <button class='el el-arrow-right dlgButton' title="Select/Deselect right, hold to repeat" onmousedown="ui.var.dlgRenameSelMoveRight(event)" onmouseup="ui.var.dlgRenameSelRepeat=null"></button>
					 <button class='el el-remove dlgButton' title="Delete selection" onclick="ui.var.dlgRenameSelClear(event)"></button>
					 <button class='el el-arrow-left dlgButton' title="Select/Deselect left, hold to repeat" onmousedown="ui.var.dlgRenameSelMoveLeft(event)" onmouseup="ui.var.dlgRenameSelRepeat=null"></button>
					 <button class='el el-circle-arrow-left dlgButton' title="Select/Deselect left to next whitespace char" onmousedown="ui.var.dlgRenameSelMoveLeftWs(event)" onmouseup="ui.var.dlgRenameSelRepeat=null"></button>
					 &nbsp; &nbsp;
					 <button class='el el-search dlgButton' title="Search and replace characters" onclick="ui.var.dlgRenameReplace(event)"></button>
					 &nbsp; &nbsp;
					 <button class='el el-refresh dlgButton' onclick="document.getElementById('inpRNNew').value='${fn}'; ui.var.dlgRenameEd=null;" title="Reset new filename"></button>
					 <button class='el el-arrow-down dlgButton' onclick="ui.var.dlgRenamePaste(event)" title="Paste text from clipboard"></button>
					 <button class='el el-arrow-up dlgButton' onclick="ui.var.dlgRenameCopy(event)" title="Copy text to clipboard"></button>
					 <label style="display:block;margin-top:0.5em"><input id=cbRNAutoload type=checkbox ${ui.var.renamedAutoLoad===true ?'checked' :''}> Reload folder items after change</label>`,
		buttons:{
			default: 'Rename',				//button caption to select when Enter key pressed; may also be an element.id: '#btnXXX'
			Rename: function(dlg, btn){	//save and close
				//assume: dlg === dlgRename
				var newfn = dlgRename.querySelector('#inpRNNew').value.trim()
				var autoload = dlgRename.querySelector('#cbRNAutoload').checked
				if(newfn==='') {
					dlgFactory.bbl(`Please supply a new filename.`)
					return
				}
				let oldpath = ui.calc.pathForOS(obj.path),
						newpath = path.join(path.dirname(obj.path), '/', newfn)
				if(obj.isDirectory) newpath += '\\'
				if(fs.existsSync(newpath)===true){
					dlgFactory.bbl(`An item named "${newfn}" was found in this folder.`)
					return
				}
				dlgRename.style.display = 'none'

				dlgFactory.create({
					focusId: '#btn0',
					title:'Confirm file rename',
					width:'51em',
					onClose:function(dlgConfirm,force){
						dlgConfirm.style.display='none'
						if(force===true){
							dlgFactory.close(dlgRename,true)
						}
						else{
							dlgRename.style.display = 'block'
						}
					},
					attrib:{ style:{zIndex:1501, maxWidth:'none'}},
					body: `<label style="display:block;margin-top:0.5em">Rename:<br>&nbsp; &nbsp; <textarea id=inpOld type=text readonly style='border:0; font-family:Arial; width:94%; text-align:left;'>[${fn}]</textarea></label>
								 <label style="display:block;margin-top:0.5em">To:<br>&nbsp; &nbsp; <textarea id=inpRNNew type=text readonly style='border:0; font-family:Arial; width:94%; text-align:left;'>[${newfn}]</textarea></label>
								 <label style="display:block;margin-top:0.5em"><input id=cbRNAutoload type=checkbox ${autoload===true ?'checked' :''}> Reload folder items after change</label>`,
					buttons:{
						default: 'Confirm',				//button caption to select when Enter key pressed; may also be an element.id: '#btnXXX'
						Confirm: function(dlgConfirm, btn){	//save and close
							var autoload = dlg.querySelector('#cbRNAutoload').checked
							dlgFactory.close(dlgConfirm,true)
							let cmd = `rename "${oldpath}" "${newfn}"`
							console.log('Renaming:', cmd)
							try{
								res = ui.calc.exec(cmd).trim()
							}
							catch(err){
								console.log(`Rename "${obj.basename}" failed:`, err)
								alert(`Rename "${obj.basename}" failed:\n${err}.`)
								return
							}
							if(res != ''){
								console.log(`Copy "${obj.basename}" failed:`, res)
								alert(`Copy "${obj.basename}" failed:\n${res}.`)
							}
							else {
								ui.var.renamedLast = newfn
								dlgFactory.bbl(`Copy Success`)
								console.log(`Rename Success`)
							}
							if(autoload===true) {
								folderLoad(ui.args.path)
								let itm = itemPathFind(newpath)
								if(itm != null)
									itemSelect(itm.pid, true)
								else
									console.log('Warning: renamed item not found in list:', newpath)
							} else {
								var el = document.getElementById('obj'+obj.pid)
								isotope.remove( el )
								el.style.display = 'none'
							}
						} //confirm button
					}
				})	//confirm dlg create
			}	//btn rename click
		} //
	})	//rename dlg
	if(gallery===null && imgtypes.indexOf(obj.type) >= 0){
		galleryShow(obj.pid)
		gallery.dlg.dlgParent = dlgRename
		gallery.listen('initialZoomInEnd', function() {
			let ctrl = document.querySelector('#inpRNNew')
			console.log('initialZoomInEnd', ctrl.id)
			if(ctrl != null){
				ctrl.focus()
			}
		})
	}
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
function bulkOps(pid, dest, automode){
	if(dlgBulk!==null){
		dlgFactory.close(dlgBulk)
		dlgBulk=null
		return
	}
	//
	if(dest == undefined) dest = null
	if(dest != null)
		ui.var.dlgBulkDest = dest
	else
	if(ui.var.dlgBulkDest==null) 	//init
		ui.var.dlgBulkDest = ''

	if(automode == undefined || automode == false)
		automode = ''
	else
		automode = 'checked'

	let buttons = {
			default: 'All',				//button caption to select when Enter key pressed; may also be an element.id: '#btnXXX'
			All:  function(dlg, btn){
				let arr = dlgBulk.querySelectorAll('#divBulkList label input:checked')
					, selectState = (arr.length == 0)
				if(selectState==true)		//if none checked then check all
					arr = dlgBulk.querySelectorAll('#divBulkList label input')
				for(let inp of arr){
					inp.checked = (selectState===true)
					dlgBulk.dlg.itemToggle(inp)
				}
			},
			Clipboard: function(dlg, btn){
				let list = dlgBulk.dlg.selectedGet('basename')
				console.log(list.join('\n'))
				const {clipboard} = require('electron')
				clipboard.writeText(list.join('\n'))
			},
			Copy: function(dlg, btn){ dlgBulk.dlg.exec('Copy') },
			Delete: function(dlg, btn){ dlgBulk.dlg.exec('Delete') },
			Move: function(dlg, btn){ dlgBulk.dlg.exec('Move') },
			Zero: function(dlg, btn){ dlgBulk.dlg.exec('Zero') }
		}

	var list = '', 	//list of labels for each items[]
			ii = 0
	for(key in items){
		var obj = items[key]
		if(obj.isDeleted === true) continue

		if(gExtFilter!=null && gExtFilter[obj.type]===undefined) continue
		list += `<label id=lbl${obj.pid}><span class=lblBulkListCounter>${++ii}.</span><input onclick='dlgBulk.dlg.itemToggle(this)' type=checkbox id=cb${obj.pid}> ${obj.basename}</label>\n`
	}

	dlgBulk = dlgFactory.create({
		focusId: '#btnClose',
		canDestroy:true,
		title:'Bulk Ops: '+ui.args.path,
		onClose:function(dlg,force){
			dlg.style.display='none'
			dlgBulk = null
		},
		attrib:{ className:'dlgBulk', style:{zIndex:1600, maxWidth:'60em', width:'40em'}},
		body: `
			<div class=divBulkOptions>
				<label id=lblBulkAutoMode><input id=cbBulkAutoMode type=checkbox ${automode}> Auto mode: Do not display confirm dialog and close after operartion</label>
			</div>
			<div class=divBulkOptions title='Select destination folder'>
				Destination:
				<input id=inpBulkDest value='${ui.var.dlgBulkDest}' type=text>
				<button onclick='dlgBulk.dlg.destFolderGet()'>...</button>
			</div>
			<div class=divBulkOptions>
				Select: <span id=divBulkOptCount><span id=boSelCount>n</span>/${items.length}</span>
			</div>
			<div id=divBulkList>
				${list}
			</div>
			`,
		buttons:buttons
	})	//confirm dlg create
	dlgBulk.dlg.itemToggle = function(cb){
		if(cb.checked){
			let pid = Number(cb.id.substr(2)),
				ctrl = dlgBulk.querySelector(`#obj${pid}`)
//				ctrl = document.getElementById(`obj${pid}`)
			itemSelect(pid)
			if(ctrl != null) ctrl.scrollIntoView({behavior: "smooth", block: "start", inline: "start"})
			cb.parentNode.style.color = 'white'
			cb.parentNode.style.backgroundColor = '#3d3'
		} else {
			cb.parentNode.style.color = '#222'
			cb.parentNode.style.backgroundColor = 'white'
		}
		dlgBulk.querySelector('#boSelCount').innerHTML = dlgBulk.dlg.selectedCount()
	}
	dlgBulk.dlg.selectedCount = function(){
		let inplist = dlgBulk.querySelectorAll('#divBulkList label input:checked')
		return inplist.length
	}
	dlgBulk.dlg.selectedGet = function(prop){
		let inplist = dlgBulk.querySelectorAll('#divBulkList label input:checked'),
			list = []
		if(inplist.length == 0) return list

		for(let inp of inplist){
			let ii = inp.id.substr(2)
			if(prop != undefined)
				list.push(items[ii].basename)
			else
				list.push(items[ii])
		}
		return list
	}
	dlgBulk.dlg.destFolderGet = function( inp ){
		var bar = new pathBar()
		bar.show({
			library:renderer.libraries()
		,	recent:renderer.recent
		, returnType:'folder'
		, title:'Select Destination Folder'
		,	onSelect: function(dir){
				if(dir.toLowerCase()==ui.args.path.toLowerCase()){
					alert('Error, destination is the same as source folder.')
					return
				}
				dlgBulk.querySelector('#inpBulkDest').value = dir
			}
		})
	}
	dlgBulk.dlg.sort = function( type ){
		console.log(type)
	}
	dlgBulk.dlg.testZeroDirResults = function(res){
		res = res.trim()
		if(res == '') return true

		let list = res.split('\n')
		for(let ii = 0; ii < list.length; ii++){
			if(list[ii].startsWith('Deleted') === false)
				return false
		}
		return true
	}
	dlgBulk.dlg.exec = function(type){	//save and close
		let dest = dlgBulk.querySelector('#inpBulkDest').value.trim(),
				list = dlgBulk.dlg.selectedGet()
		//test
		if(type!=='Copy' && type!=='Delete' && type!=='Move' && type!=='Zero')
			throw new Error('dlgBulk.exec() error, unknown type parameter: '+type)
		if(dest=='' && (type=='Copy' || type=='Move') ){
			alert('Please select a destination folder.')
			return
		}
		if(list.length==0){
			alert(`Please select items to ${type}.`)
			return
		}

		let automode = dlgBulk.querySelector('#cbBulkAutoMode').checked
		console.log('dlgBulk.automode', automode)

		//confirm
		if(automode !== true || type === 'Delete') {
			if(type=='Delete'){
				if(!confirm(`Delete ${list.length} items?\nFrom: "${ui.args.path}"`)) return
				console.log('Delete From:', ui.args.path, '\nFiles:\n', dlgBulk.dlg.selectedGet('basename').join('\n'))
			} else
			if(type=='Zero'){
				if(!confirm(`Create zero length files of these ${list.length} items?\nNote, selected folders will have files deleted from all subfolders.\n\nPath: "${ui.args.path}"`)) return
				console.log('Zero From:', ui.args.path, '\nFiles:\n', dlgBulk.dlg.selectedGet('basename').join('\n'))
			}
			else {
				if(!confirm(`${type} ${list.length} items?\nFrom: "${ui.args.path}"\nTo: "${dest}"`)) return
				console.log(`${type} From: `, ui.args.path, '\nTo:', dest, '\nFiles:\n', dlgBulk.dlg.selectedGet('basename').join('\n'))
			}
		}

		//save settings
		if(type=='Copy' || type=='Move'){
			ui.var.dlgBulkDest = dest
		}
		//operate on selected files
		let cmd = res = null
		for(let obj of list){
			let lbl = dlgBulk.querySelector('#lbl'+obj.pid),
				tmp = ui.args.path.replace(/\//g, '\\'),
				file = tmp +obj.basename

			dlgFactory.bbl(`${type}: "${obj.basename}"`)
			if(type==='Copy'){
				if(obj.isDirectory==true){
					//cmd = `xcopy "${file}" "${dest.replace(/\//g, '\\')}" /E /V /I /Q /K /Y /J `
					cmd = `xcopy "${file}\\*" "${dest.replace(/\//g, '\\')}\\${obj.basename}\\" /E /V /I /Q /K /Y /J `
				}else
					cmd = `xcopy "${file}" "${dest.replace(/\//g, '\\')}" /V /I /Q /K /Y /J `
				lbl.style.background = `#f08f00`
			} else
			if(type==='Move'){
				cmd = `move /Y "${file}" "${dest.replace(/\//g, '\\')}" `
				lbl.style.background = `#a0f`
			} else
			if(type==='Delete'){
				if(obj.isDirectory)
					cmd = `rmdir  /S /Q "${file}" `
				else
					cmd = `del  /F /Q "${file}" `
				lbl.style.background = `#f03`
			} else
			if(type==='Zero'){
				if(obj.isDirectory)
					cmd = `del  /F /Q /S "${file}\\*" `
				else
					cmd = `copy /V /Y NUL "${file}" `
				lbl.style.background = `#0f0`
			}

			console.log('Exec:', cmd)
			try{
				res = ui.calc.exec(cmd).trim()
			}
			catch(err){
				console.log(`${type} "${obj.basename}" failed:`, err)
				alert(`${type} "${obj.basename}" failed:\n${err}.`)
				return
			}
			console.log('Result:', res)

			if((type==='Copy' && res.indexOf('File(s) copied') < 0 )
			|| (type==='Delete' && res != '')
			|| (type==='Move' && obj.isDirectory===false && res.indexOf('file(s) moved') < 0 )
			|| (type==='Move' && obj.isDirectory===true && res.indexOf('dir(s) moved') < 0 )
			|| (type==='Zero' && obj.isDirectory===false && res.indexOf('file(s) copied') < 0 )
			|| (type==='Zero' && obj.isDirectory===true && dlgBulk.dlg.testZeroDirResults(res) == false)
			){
				alert(`${type} "${obj.basename}" failed:\n${res}`)
				throw new Error(`${type} "${obj.basename}" failed: ${res}`)
			}
			if(type==='Copy') {
				lbl.style.background = `#e0bf50`
			}
			if(type==='Delete'){
				itemRemove(obj.pid)
				lbl.style.background = `#f55`
			}
			if(type==='Move'){
				itemRemove(obj.pid)
				lbl.style.background = `#aaf`
			}
			if(type==='Zero'){
				lbl.style.background = `#0fa`
			}
		}	//for(obj of list)

		if(type!='Delete' && type!='Zero') renderer.recentAdd(dest)
		console.log(`${type} done, ${list.length} items.`)
		dlgFactory.bbl(`${type} done, ${list.length} items.`)
		if(automode===true){ //close dialog
			dlgFactory.close(dlgBulk)
			dlgBulk=null
			console.log(`dlgBulk.autoMode: close dialog.`)
			dlgFactory.bbl(`dlgBulk.autoMode: close dialog.`)
		}
	}
	if(pid != null){ //select item(s)
		if(typeof pid === 'string'){	//convert to array
			if(pid.indexOf(',') >= 0)
				pid = pid.split(',')
			else
				pid = [pid]
		}
		let arr = pid.sort(function(a, b) {	//sort numerically for smooth transitions in checkbox list
		  var nameA = Number(a)
		  var nameB = Number(0)
		  if (nameA < nameB) return -1
		  if (nameA > nameB) return 1
		  return 0
		})

		for(pid of arr){
			let cb = dlgBulk.querySelector('#cb'+pid)
			if(cb==null) continue
			cb.checked = true
			dlgBulk.dlg.itemToggle(cb)
			cb.scrollIntoView({behavior:"smooth", block:"end", inline:"end"})
		}
	}
}
