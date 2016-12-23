// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const {remote} = require('electron')
const {Menu, MenuItem, screen} = remote	//screen used in main.js
const {clipboard, shell} = require('electron')

var mainmenu = null
var ctxmenu = null		//context menu
var fltsubmenu=null		//mainmenu.filter.submenu, assign in mainMenuSet()
var layoutmenu=null		//mainmenu.layout.submenu, assign in mainMenuSet()
var MNUCOLS=5
var MNUROWS=MNUCOLS+1
var MNUVERT=MNUCOLS+2
var MNUWALL=MNUCOLS+3
var mitScroll=null		//scroll main menu item

exports.sayhey = function() {
	console.log('Hey Hey Hey!')
}
exports.openFile = function(obj) {
	/*var path = ''
	if(obj.isDirectory)
		path = `explorer "${obj.path}"`
	else
		path = `"${obj.path}"`
	exec(path)*/
	shell.openItem(`"${obj.path}"`)
}
exports.fldrBrowse = function(obj) {
	fldrBrowse(obj)
}
exports.devToolsToggle = function() {
	remote.getCurrentWindow().toggleDevTools()
}
exports.mainMenuGen = function(exts, layoutmode) {
	return mainMenuGen(exts, layoutmode)
}

function mainMenuGen(exts, layoutmode) {
	var template = [
	  {
	    label: 'App',
	    submenu: [
				{
	        label: 'Change Folder',
	        accelerator: 'Alt+F',
					click: function(item, focusedWindow){
						console.log('Change Folder')
						const {dialog} = remote
						var dir = dialog.showOpenDialog(focusedWindow, {
							defaultPath: './',
							filter:[{name: 'All Files', extensions: ['*']}],
							properties: ['openDirectory'],
							title:'Change Folder'
						})
						console.log('New folder:', dir[0])
						const main = remote.require('./main.js')
						//reset vars
						var fldrObj = main.fldrLoad(dir[0])
						items = fldrObj.items
						exts	= fldrObj.exts
						gExtFilter={}
						Object.assign(gExtFilter, exts)	//clone
						defaultImageNum=null
						itemselected=null
						mainMenuGen(exts, layoutmode)
						console.log('items:',items)
						console.log('exts:', exts)	// === gExtFilter
						loadFunc(lastLayoutMode)
					}
	      },{
        	type: 'separator'
      	},{
	        label: 'Close',
					click: function(item, focusedWindow) {
						if (focusedWindow)
							focusedWindow.close();
					}
	      },/*{
					label: 'Minimize', role: 'minimize'
				},*/{
	        label: 'DevTools', role: 'toggledevtools', accelerator:'F12',
	      },{
	        label: 'Full Screen', role: 'togglefullscreen'
				},{
	        label: 'Reload', role: 'reload'
				}/*,{
					label: 'Zoom In', role: 'zoomin'
	      },{
					label: 'Zoom Out', role: 'zoomout'
	      },{
					label: 'Zoom Reset', role: 'resetzoom'
				}*/
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
								loadFunc(lastLayoutMode)
								galleryScale()
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
								loadFunc(lastLayoutMode)
								galleryScale()
							}
						},{
							label: `Scale=0.3`, accelerator: 'Alt+Left',
							click: function(item, win, ev) {
								scale = 0.3
								loadFunc(lastLayoutMode)
							}
						},{
							label: `Scale=1`, accelerator: 'Alt+Right',
							click: function(item, win, ev) {
								scale = 1
								loadFunc(lastLayoutMode)
								galleryScale()
							}
						}
					]
				},{
					label: 'Scroll', type:'checkbox', checked:false, accelerator: 'Alt+S',
					click: function(item, win, ev) {
						pageScrollToggle()
					}
				},{	label: 'Show Hidden', accelerator: 'Alt+H',
						click: function(item, win, ev) {
							loadFunc(lastLayoutMode)
							//isotope.layout()
							//ctxmenu.popup(win, menupos.x, menupos.y, item.position)
						}
				},{	label: 'Shuffle', accelerator: 'Alt+Shift+S',
						click: function(item, win, ev) {
							shuffle=true
							loadFunc(lastLayoutMode)
						}
				},{ 	type: 'separator'
				},{	label: 'Cols',
						accelerator: 'Alt+C', type:'radio',
						click: function(item, win, ev) {
							loadFunc('cols')
							isotope.layout()
							//ctxmenu.popup(win, menupos.x, menupos.y, item.position)
						}
				},/*{	label: 'horizontal',
						click: function(item, win, ev) {
							loadFunc('horiz')
						}
				},*/{		label: 'Rows',
					accelerator: 'Alt+R', type:'radio',
					click: function(item, win, ev) {
						loadFunc('rows')
						isotope.layout()
						//ctxmenu.popup(win, menupos.x, menupos.y, item.position)
					}
				},{	label: 'Vert',
						accelerator: 'Alt+V', type:'radio',
						click: function(item, win, ev) {
							loadFunc('vert')
							isotope.layout()
							//ctxmenu.popup(win, menupos.x, menupos.y, item.position)
						}
				},{	label: 'Wall',
						accelerator: 'Alt+W', type:'radio',
						click: function(item, win, ev) {
							loadFunc('wall')
							isotope.layout()
							//ctxmenu.popup(win, menupos.x, menupos.y, item.position)
						}
				}
			]
		},{
	    label: 'Filter',
	    submenu: fltSubmenuGen(exts, false)
	  },{
	    label: 'Help',
	    role: 'help',
	    submenu: [
				{
					label: 'About FolderView',
	        click: function() { require('electron').shell.openExternal('http://184.68.158.254') }
				},{
	        label: 'About Electron',
	        click: function() { require('electron').shell.openExternal('http://electron.atom.io') }
	      },
	    ]
	  },
	];
	mainmenu = Menu.buildFromTemplate(template);
	fltsubmenu = mainmenu.items[2].submenu
	Menu.setApplicationMenu(mainmenu);
	layoutmenu = mainmenu.items[1].submenu
			 if(layoutmode=='cols')	layoutmenu.items[MNUCOLS].checked=true
	else if(layoutmode=='rows')	layoutmenu.items[MNUROWS].checked=true
	else if(layoutmode=='vert')	layoutmenu.items[MNUVERT].checked=true
	else if(layoutmode=='wall')	layoutmenu.items[MNUWALL].checked=true
	mitScroll =	layoutmenu.items[1]	//scroll menu item
	//failed: cannot dynamically change menuitem.label
	//mnuScale1 = layoutmenu.items[0]
	//mnuScale1.label = 'Hi'
	//console.log(mnuScale1.label)
}
exports.contextMenuSet = function(exts) {
	var objClicked = null
	var menupos = {x:0, y:0}

	window.addEventListener('contextmenu', (e) => {
		const {webFrame} = require('electron')
		var curzoom = Math.round(webFrame.getZoomFactor() *100)/100
		menupos.x = e.clientX
		menupos.y = e.clientY
		var template = [	//basic context menu
			{
				label: 'Close',
				click: function(item, focusedWindow) {
					if (focusedWindow)
						focusedWindow.close();
				}
			},{
				label: 'DevTools',
				click: function(item, focusedWindow) {
					if (focusedWindow)
						focusedWindow.toggleDevTools();
				}
			},{
		    label: 'Filter',
		    submenu: fltSubmenuGen(exts, true)
		  },{
					label: 'Fullscreen', role: 'togglefullscreen'
			},{
		    label: 'Layout',
		    submenu: [
					{	label: 'Scroll Toggle', type:'checkbox', checked:mitScroll.checked, accelerator: 'Alt+S',
						click: function(item, win, ev) {
							mitScroll.checked = item.checked
							mitScroll.click()
						}
					},{	label: 'Show Hidden',	accelerator: 'Alt+H',
		        	click: function(item, win, ev) {
								loadFunc(lastLayoutMode)
								//isotope.layout()
								//ctxmenu.popup(win, menupos.x, menupos.y, item.position)
							}
					},{	label: 'Shuffle', accelerator: 'Alt+Shift+S',
		        	click: function(item, win, ev) {
								shuffle=true
								loadFunc(lastLayoutMode)
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
								loadFunc('horiz')
							}
					},*/{		label: 'Rows',
						accelerator: 'Alt+R', type:'radio',
						checked: layoutmenu.items[MNUROWS].checked,
		        click: function(item, win, ev) {
							var item = layoutmenu.items[MNUROWS]
							item.click(item, win, ev)
							//loadFunc('fitRows')
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
		  },{
				label: 'Scale+0.5',
				click: function(item, win, ev) {
					scale = Math.round((scale +0.5) *10)/10
					loadFunc(lastLayoutMode)
					//console.log('Scale: '+scale)
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
					loadFunc(lastLayoutMode)
					//console.log('Scale: '+scale)
				}
			},{
				label: `Scale=1 (${scale})`, accelerator: 'Alt+Right',
				click: function(item, win, ev) {
					scale = 1
					loadFunc(lastLayoutMode)
					//gallery not open when context menu displayed
					//galleryScale()
				}
			}
		]
		if(e==undefined || !e.target.id || objprefix.indexOf(e.target.id.substr(0,3)) < 0) {
			objClicked = null
		}
		else {		//prepend obj functions to template
			objClicked = e.target
			var obj = idToObj(objClicked.id)

			//obj - tools
			var tooltmpl =[
				{
			    label: 'Clipboard',
			    submenu: [
						{ label: 'Filename',
							click: function(item, win, ev) {
								clipboard.writeText(obj.basename)
								console.log(clipboard.readText())
							}
						},{ label: 'Path',
							click: function(item, win, ev) {
								clipboard.writeText(obj.path)
								console.log(clipboard.readText())
							}
						},{ label: 'src',
						click: function(item, win, ev) {
								clipboard.writeText(obj.src)
								console.log(clipboard.readText())
							}
						}
					]
				},{	label: 'Delete',
					click: function(item, win, ev) {
						var obj = idToObj(objClicked.id)
						console.log(`Delete: "${obj.path}"`)
						if(!confirm(`Delete:\n"${obj.path}"`)) return
						shell.moveItemToTrash(obj.path)
/*
						const fs = require('fs');
						if(obj.isDirectory)
							fs.rmdir(obj.path)
						else
							fs.unlinkSync(obj.path)
*/
						var el = document.getElementById('obj'+obj.pid)
						isotope.remove( el )
						el.style.display = 'none'
					}
				},{	label: 'Explore',
						click: function(item, win, ev) {
							var obj = idToObj(objClicked.id)
							shell.showItemInFolder(obj.path)
							//var cmd = `explorer /select, "${obj.path}"`
							//exec(cmd)
						}
				}
			]
			//obj - image menu items
			if(obj.type==='.jpg' || obj.type==='.png') {
				tooltmpl.push({ label: 'Set background - repeat',
					click: function(item, win, ev) {
						document.body.style.background = `repeat url("${obj.src}")`
						document.body.style.backgroundSize =	`auto`
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
			template.unshift(	{
					label: 'Tools',
					submenu: tooltmpl
			})
			template.unshift(	{
					label: 'Open',
					click: function(item, win, ev) {
						var obj = idToObj(objClicked.id)
						if(obj.isDirectory===true){
							fldrBrowse(obj)
							return
						}
						//exec(`"${obj.path}"`)
						shell.openItem(`"${obj.path}"`)
					}
			})
			template.unshift(	{
					label: 'Hide',
					click: function(item, win, ev) {
						var obj = idToObj(objClicked.id)
						var el = document.getElementById('obj'+obj.pid)
						isotope.hideItemElements( el )
						isotope.layout()
					}
			})
		}
	  e.preventDefault()
		ctxmenu = Menu.buildFromTemplate(template);
	  ctxmenu.popup(remote.getCurrentWindow())
	}, false)
}

function idToObj(id) {
	var pid = id.substr(3,10)
	var obj = items[pid]
	return obj
}
function exec(command) {
	console.log('Launching:['+command+']')
	const exec = require('child_process').exec;
	const child = exec(command, (error, stdout, stderr) => {
		//bug: error always generated even if command succeeds
		if(error && error.code != 1) {	//windows apps return 1 on success
			console.log('exec() error:\n['+error+']');
			console.log(`error.code: [${error.code}]`);
			alert('exec() error:\n['+error+']');
		}
	})
}
function fldrBrowse(obj) {
	console.log('Launching:['+obj.path+']')
	//const app = remote.app
	const {webFrame} = require('electron')
	//var zoomfactor = webFrame.getZoomFactor()
	const {browserLaunch} = remote.require('./main.js')
	var win = browserLaunch(obj.path)
	//var win = browserLaunch(obj.path, false, scale, false, lastLayoutMode, false, fontSize)
	console.log(win)
	return win
}
function filterAdd(ext, item){
	if(item===undefined) item=null

	if(ext==='ALL'){
		Object.assign(gExtFilter, exts)	//clone
		loadFunc(lastLayoutMode)
		var ii=0
		for(var key in exts){			//update menu items
			//mainmenu.items[2].submenu.items[ii].checked=true
			fltsubmenu.items[ii].checked=true
			ii++
		}
	} else
	if(gExtFilter[ext]===undefined) {
		gExtFilter[ext]=1
		loadFunc(lastLayoutMode)
	}
	if(item !== null && item.isCtxMenu===true)	{ //called from context menu
		fltsubmenu.items[item.itemId].checked=true
	}
}
function filterRemove(ext, item){
	if(item===undefined) item=null
	if(ext==='ALL'){
		gExtFilter = {}
		loadFunc(lastLayoutMode)
		var ii=0
		for(var key in exts){
			//mainmenu.items[2].submenu.items[ii].checked=false
			fltsubmenu.items[ii].checked=false
			ii++
		}
	} else
	if(gExtFilter[ext]!==undefined) {
		delete gExtFilter[ext]
		loadFunc(lastLayoutMode)
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
	return fltsub
}
