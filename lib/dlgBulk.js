/*
	dlgBulk.js

	- display dialog box listing folder items and operations to perform on them

*/

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

		if(gExtFilter!=null && (gExtFilter['ALL']!==1 && gExtFilter[obj.type]!==1)) continue
		list += `<label id=lbl${obj.pid}><span class=lblBulkListCounter>${++ii}.</span><input onclick='dlgBulk.dlg.itemToggle(this)' type=checkbox id=cb${obj.pid}> ${obj.basename}</label>\n`
	}

	dlgBulk = dlgFactory.create({
		attrib:{ className:'dlgBulk', style:{zIndex:1600, maxWidth:'60em', width:'40em'}},
		canDestroy:true,
		focusId: '#btnClose',
		rollup:true,
		title:'Bulk Ops: '+ui.args.path,
		onClose:function(dlg,force){
			if(gallery != null)
				document.querySelector('#pswpMain').focus()
			dlgBulk = null
		},
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
	dlgBulk.dlg.minimized=false
	dlgBulk.dlg.itemToggle = function(cb){
		if(cb.checked){
			let pid = Number(cb.id.substr(2)),
				ctrl = grid.querySelector(`#obj${pid}`)
				//ctrl = document.getElementById(`obj${pid}`)
				//ctrl = dlgBulk.querySelector(`#obj${pid}`)
			itemSelect(pid)
			if(ctrl != null)
				ctrl.scrollIntoView({behavior: "smooth", block: "start", inline: "start"})
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
		//console.log('dlgBulk.automode', automode)

		//make all items green
		dlgBulk.querySelectorAll('#divBulkList label input:checked').forEach( (cb) => {
			cb.parentNode.style.color = 'white'
			cb.parentNode.style.backgroundColor = '#3d3'
		})

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

		if(type=='Copy' || type=='Move'){		//use new execQue
			let cnt = 0
			var cbAfterExec = function(job){  //after exec callback
					//assume: job = {id, pid, command, msg, duration, stdout, err, stderr}
					itemRemove(job.pid)
					if(dlgBulk != null){
						let lbl = dlgBulk.querySelector('#lbl'+job.pid)
						if(lbl != null){
							if(job.err === true)
								lbl.style.background = 'red'
							else
							if(type=='Copy')
								lbl.style.background = `#e0bf50`
							else
								lbl.style.background = `#aaf`
						}
					}
					cnt++
					if(cnt < list.length)
						return
					//last item copied
					dlgFactory.bbl(`${type} done, ${list.length} items.`, 2000)
					renderer.recentAdd(dest)
					if(automode===true && dlgBulk != null){			//close dialog
						dlgFactory.close(dlgBulk)
						dlgBulk=null
						dlgFactory.bbl(`dlgBulk.autoMode: close dialog.`, 2000)
					}
			}
			var cbBeforeExec = function(job){		//before exec callback
				if(dlgBulk == null) return
				let lbl = dlgBulk.querySelector('#lbl'+job.pid)
				if(lbl == null) return
				if(type=='Copy')
					lbl.style.background = `#f08f00`
				else
					lbl.style.background = `#a0f`
			}
			if(type=='Copy')
				renderer.queFileCopy(list, dest, cbAfterExec, cbBeforeExec)
			else
				renderer.queFileMove(list, dest, cbAfterExec, cbBeforeExec)
			return
		}

		//operate on selected files
		let cmd = res = null
		for(let obj of list){
			let lbl = dlgBulk.querySelector('#lbl'+obj.pid),
				tmp = ui.args.path.replace(/\//g, '\\'),
				file = tmp +obj.basename

			//dlgFactory.bbl(`${type}: "${obj.basename}"`)
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
		dlgFactory.bbl(`${type} done, ${list.length} items.`, 2000)
		if(automode===true){ //close dialog
			dlgFactory.close(dlgBulk)
			dlgBulk=null
			console.log(`dlgBulk.autoMode: close dialog.`)
			dlgFactory.bbl(`dlgBulk.autoMode: close dialog.`, 2000)
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
