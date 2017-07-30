var Client = require('ssh2').Client

function dlgSFTP(){
	this.dlg=null
	this.optons = null
	this.uri = null
	this.conn=null
	this.connSettings={
     host: 'myserver-direction.com',
     port: 22, // Normal is 22 port
     username: 'myUsername',
     password: 'myPassword',
		 forceIPv4:true
	}
	this.sftpstream = null	//set after connection made
	this.trFiles = null		//div containing file list
	this.list = null				//list of files downloaded
	this.defaultPath = null	//path loaded after connection made
	this.remotePath = null	//remotepath being viewed
	//this.selectState = false //for selecting all items
	var me = this

	this.show = function(options){
		if(options.localPath==null) throw 'dlgSFTP.show() error, options.localPath is not supplied.'
		this.options = options
		this.dlg = dlgFactory.create({
			canDestroy:true,				//whether the dialog should be hidden or destroyed in dlgFactory.close(dlgid)
			createHidden:false,			//if true: dlg.display=none
			headerHidden:false,
			focusId: '#inpHost',
			title: `SFTP: ${this.options.localPath}`,
			body: document.querySelector('#dlgSftp').outerHTML,
			attrib:{
				className:'dlgSftpParent',
				style:{width:'30em', top:'5em'}
			},
			onClose:function(dlg, force){
				me.closeConn()
				dlg.style.display='none'
			},
			onHeaderClick:function(dlg){
				if(dlg.dlg.minimized===false){
					dlg.dlg.minimized=true
					dlg.style.padding = '0'
					dlg.style.border = '0'
					dlg.querySelector('.dlgBody').style.display = 'none'
					dlg.querySelector('.dlgFooter').style.display = 'none'
				}else{
					dlg.dlg.minimized=false
					dlg.style.padding = '1em 2em'
					dlg.style.border = '2px inset rgba(138, 134, 134, 0.6)'
					dlg.querySelector('.dlgBody').style.display = 'block'
					dlg.querySelector('.dlgFooter').style.display = 'block'
				}
			}
		})
		//this.dlg.style.margin = '0 auto'
		this.dlg.style.left = ''
		this.initCtrls()
		this.dlg.dlg.dlgsftp = this
		this.dlg.dlg.minimized=false
		return this.dlg
	}
	this.initCtrls = function(){
		this.dlg.querySelector('.dlgSftp').style.display = 'block'
		//this.dlg.querySelector('#inpLocal').innerHTML = this.options.localPath
		this.trFiles = this.dlg.querySelector('#trFiles')

		//make connection via connect click
		this.dlg.querySelector('#btnCon').onclick = function(event){
			if(me.conn != null){
				dlgFactory.bbl('Already connected to: '+ me.uri)
				return
			}
			//load connections settings
			me.connSettings.host = me.dlg.querySelector('#inpHost').value
			me.connSettings.port = Number(me.dlg.querySelector('#inpPort').value)
			me.connSettings.username = me.dlg.querySelector('#inpUser').value
			me.connSettings.password = me.dlg.querySelector('#inpPw').value
			me.uri = `${me.connSettings.username}@${me.connSettings.host}:${me.connSettings.port}`
			me.defaultPath = me.dlg.querySelector('#inpPath').value
			me.conn = new Client()
			me.conn.on('error', function(err) {
				dlgFactory.bbl('SFTP Error Handled: '+err)
				console.log('SFTP Error Handled:', me.uri, err)
				me.closeConn()
			})
			me.conn.on('ready', function() {
				//dlgFactory.bbl('Connected: '+me.uri)
				console.log('Connected: '+me.uri)
		    me.conn.sftp(function(err, sftp) {
	        if(err){
						dlgFactory.bbl('SFTP error: '+err)
						console.log(err)
						me.closeConn()
						return
					}
					me.sftpstream = sftp
					me.remoteShow(me.defaultPath)
		    })
			})
			.connect(me.connSettings)
			//dlgFactory.bbl('Connecting to: '+me.uri)
			console.log('Connecting to: '+me.uri, me.connSettings)
		}
		//close connection
		this.dlg.querySelector('#btnDis').onclick = function(event){
			me.closeConn()
		}
	}
	this.remoteShow = function(path){
		this.remotePath = ui.calc.pathTrailingSlashDel(path)
		if(this.remotePath == '') this.remotePath = '/'
		//
		//dlgFactory.bbl('Reading: '+this.remotePath)
		this.remoteList(this.remotePath, function(err, list){
			if(list===false) {
				alert(err)
				return
			}
			// List the directory in the dlg
			me.list = list
			let dirs=[], files=[]
			for(var ii in list){
				list[ii].ii = ii
				list[ii].isFolder = (list[ii].longname[0]=='d')
				list[ii].canRead = (list[ii].longname[1]=='r')
				list[ii].isHidden = (list[ii].filename[0]=='.')
				let itm = list[ii]
				if(itm.isHidden===true) continue
				if(itm.isFolder)
					dirs.push({itm:itm, fn:itm.filename.toLowerCase()})
				else
					files.push({itm:itm, fn:itm.filename.toLowerCase()})
			}
			dirs.sort(function(a,b){
				if(a.fn > b.fn) return 1
				if(a.fn < b.fn) return -1
				return 0
			})
			files.sort(function(a,b){
				if(a.fn > b.fn) return 1
				if(a.fn < b.fn) return -1
				return 0
			})
			let html = ''
				, lbl= `<label id=itm$ii	ondblclick='dlgSFTP.itemClick(event)'>
				<input type=checkbox onclick='this.className=(this.checked ?"Selected" :""); this.parentNode.className=this.className'> $fn </label>`
			for(let obj of dirs){
				let itm = obj.itm
					, fn = `&lt;${itm.filename}&gt;`
				html += lbl.replace('$ii', itm.ii).replace('$fn', fn)
			}
			for(let obj of files){
				let itm = obj.itm
					, fn = `${itm.filename}, ${ui.calc.bytesToStr(itm.attrs.size)}`
					//, fn = `${itm.filename}, ${Math.round(itm.attrs.size/1024/1024 *10)/10}MB`
					html += lbl.replace('$ii', itm.ii).replace('$fn', fn)
			}
			//dlgFactory.bbl(`Reading ${path} found: ${dirs.length+files.length} items.`)
			me.trFiles.querySelector('#divFiles').innerHTML = html
			me.trFiles.style.display = 'table-row'
			//make remote folder links
			html = '', arr = me.remotePath.split('/')
			if(me.remotePath=='/') arr.splice(0,1)
			for(let ii in arr){
				let str = arr[ii]
				html += `<span id=spn${ii} onclick='dlgSFTP.remotePathClick(event)'>${str}</span> / `
			}
			me.dlg.querySelector('#tdFolder').innerHTML = html	//me.remotePath
			me.dlg.querySelector('#trFolder').style.display = 'table-row'
			me.dlg.querySelector('#trButtons').style.display = 'table-row'
		})
	}
	this.remoteList = function(path, callback){	//callback(err,list)
		//return list of items in this.uri+path
		if(this.conn == null){
			let msg = 'dlgSFTP.remoteList() error: Connection not established.'
			console.log(msg)
			callback(msg, false)
			return
		}
		if(this.sftpstream == null){
			let msg = 'dlgSFTP.remoteList() error: sftpstream is null.'
			console.log(msg)
			callback(msg, false)
			return
		}
		//dlgFactory.bbl('Reading: '+this.uri+path)
		console.log('Reading: '+this.uri+path)
		this.sftpstream.readdir(path, function(err, list) {
			if(err){
				let msg = `dlgSFTP.remoteList(${path}) error with sftp.ReadDir(): ${err}.`
				console.log(err)
				//me.closeConn()
				callback(msg, false)
				return
			}
			console.log(`dlgSFTP.remoteList(${path}): ${list.length} files.`)
			callback(err, list)
		})
	}
	this.remoteDelete = function(item, remotepath, stepfunc, donefunc){
		remotepath = remotepath+'/'+item.filename
		if(item.isFolder!=true){
			this.sftpstream.unlink(remotepath, function(err){
				if(err && err != 'Error: No such file'){
					console.log(`this.remoteDelete(${remotepath}) error:`, err)
					if(donefunc != null) donefunc(err)
				}else{
					if(err && err == 'Error: No such file')
						console.log(`this.remoteDelete(${remotepath}) does not exist.`)
					else
						console.log(`this.remoteDelete(${remotepath}) done.`)
					if(stepfunc != null) stepfunc(1,1,1)
					if(donefunc != null) donefunc(null)
				}
			})
			return
		}
		//get items from folder
		this.remoteList(remotepath, function(err, list){
			if(list===false) {
				console.log(`dlgSFTP.remoteDelete() error getting list.`)
				if(donefunc != null)
					donefunc(err)
				return
			}
			if(list.length===0){
				me.sftpstream.rmdir(remotepath, function(err){
					if(err)
						console.log(`dlgSFTP.remoteDelete(${remotepath}) error: ${err}`)
					else
						console.log(`dlgSFTP.remoteDelete(${remotepath}) Done.`)
					if(stepfunc != null) stepfunc(1,1,1)
					if(donefunc != null) donefunc(err)
				})
				return
			}
			//clean list
			let items=[]
			for(var ii in list){
				list[ii].ii = ii
				list[ii].isFolder = (list[ii].longname[0]=='d')
				list[ii].canRead = (list[ii].longname[1]=='r')
				list[ii].isHidden = (list[ii].filename[0]=='.')
				let itm = list[ii]
				//if(itm.isHidden===true) continue
				items.push({itm:itm, fn:itm.filename.toLowerCase()})
			}
			items.sort(function(a,b){
				if(a.fn > b.fn) return 1
				if(a.fn < b.fn) return -1
				return 0
			})
			//delete each item
			let idx = 0, donecount = 0
			console.time('Delete Timer')
			for(let obj of items){
				++idx
				console.log(`dlgSFTP.remoteDelete() ${idx}/${items.length}: ${remotepath}/${obj.itm.filename}`)
				let local_stepfunc = function(total_transferred, chunk, total){
					let pct = (Math.round(total_transferred/total *10)/100)
					if(stepfunc != null) stepfunc( (idx-1 +pct),1,items.length)
				 }
				, local_donefunc= function(err){
						donecount++	//sync to delete parent when last item deleted
						if(err){
							console.log(`dlgSFTP.remoteDelete(${remotepath}/${obj.itm.filename}) error: ${err}.`)
							if(donefunc != null) donefunc(err)
							if(donecount >= items.length) console.timeEnd('Delete Timer')
							return
						}
						if(donecount < items.length){
							if(stepfunc != null) stepfunc(idx,1,items.length)
						} else {
							//remove parent folder after last item deleted
							me.sftpstream.rmdir(remotepath, function(err){
								if(err)
									console.log(`dlgSFTP.remoteDelete(${remotepath}) error: ${err}`)
								else
									console.log(`dlgSFTP.remoteDelete(${remotepath}) Done.`)
								if(donefunc != null) donefunc(err)
								console.timeEnd('Delete Timer')
							})
						}
					}
				//remove child item
				me.remoteDelete(obj.itm, remotepath, local_stepfunc, local_donefunc)
			}
		})
	}
	this.remoteDownload = function(item, remotepath, localpath, stepfunc, donefunc){
		if(stepfunc===undefined) stepfunc = null
		if(donefunc===undefined) donefunc = null
		if(item.isFolder===true){
			this.remoteDownloadFolder(item, remotepath, localpath, stepfunc, donefunc)
			return
		}
		remotepath = remotepath+'/'+item.filename
		console.log('Downloading: '+remotepath+' to '+localpath)	//, item)
		this.sftpstream.fastGet(
			remotepath, localpath+'\\'+item.filename
		, {concurrency:64, chunkSize:32768, step:stepfunc}
		, function(err){
			if(err)
				console.log(`Error downloading "${item.filename}"`, err)
			else
				console.log('Download Done: '+item.filename)
			if(donefunc != null)
				donefunc(err)
		})
	}
	this.remoteDownloadFolder = function(item, remotepath, localpath, stepfunc, donefunc){
		//create new fold
		remotepath = remotepath + '/' + item.filename
		localpath = localpath + '\\' + item.filename
		var fs = require('fs');
		if(fs.existsSync(localpath)===false){
			console.log(`dlgSFTP.remoteDownloadFolder() create folder: ${localpath}`)
			fs.mkdirSync(localpath)
		}
		fs = null
		//get items
		this.remoteList(remotepath, function(err, list){
			if(list===false) {
				console.log(`dlgSFTP.remoteDownloadFolder() error getting list.`)
				if(donefunc != null)
					donefunc(err)
				return
			}
			//clean list
			let items=[]
			for(var ii in list){
				list[ii].ii = ii
				list[ii].isFolder = (list[ii].longname[0]=='d')
				list[ii].canRead = (list[ii].longname[1]=='r')
				list[ii].isHidden = (list[ii].filename[0]=='.')
				let itm = list[ii]
				if(itm.isHidden===true) continue
				items.push({itm:itm, fn:itm.filename.toLowerCase()})
			}
			items.sort(function(a,b){
				if(a.fn > b.fn) return 1
				if(a.fn < b.fn) return -1
				return 0
			})
			//download each item
			let idx = 0, donecount = 0, donepct=0
			//console.time('Download Timer')
			for(let obj of items){
				++idx
				let pct = 0
				console.log(`dlgSFTP.remoteDownloadFolder() ${idx}/${items.length}: ${remotepath}/${obj.itm.filename}`)
				let local_stepfunc = function(total_transferred, chunk, total){
					if(stepfunc == null) return
					let newpct = (Math.round(total_transferred/total *100)/100)
					donepct += (newpct -pct)	//inc by difference
					pct = newpct
					//console.log('donepct', donepct,items.length)
					stepfunc(donepct,1,items.length)
				 }
				, local_donefunc = function(err){
						donecount++	//only inc when donefunc() called; allows synchronization
						if(donecount < items.length) {
							//if(stepfunc != null) stepfunc(idx,1,items.length)
							if(stepfunc != null) stepfunc(donecount,1,items.length)
						} else {
							console.log(`dlgSFTP.remoteDownloadFolder() Done: ${remotepath}`)
							//console.timeEnd('Download Timer')
							if(donefunc != null) donefunc(err)
					}}
				me.remoteDownload(obj.itm, remotepath, localpath, local_stepfunc, local_donefunc)
			}
		})
	}
	this.closeConn = function(){
		if(me.conn != null){
			this.conn.end()
			this.conn = null
			this.defaultPath = null
			this.remotePath = null
			this.list = null
			this.sftpstream = null
			this.trFiles.style.display = 'none'
			this.dlg.querySelector('#trFolder').style.display = 'none'
			this.dlg.querySelector('#trButtons').style.display = 'none'
			//dlgFactory.bbl('SFTP Closed: '+this.uri)
			this.uri = null
		}
	}
}
dlgSFTP.itemClick = function(event){
	let div = event.currentTarget
	, dlg = dlgFactory.getDlgParent(div)
	, dlgsftp = dlg.dlg.dlgsftp
	, itemid = Number(div.id.substr(3))
	, item = dlgsftp.list[itemid]
	, fn = item.filename
	if(item.isFolder===true){
		if(dlgsftp.remotePath=='/')
			fn = '/'+fn
		else
			fn = dlgsftp.remotePath+'/'+fn
		console.log('dblclick',item)
		dlgsftp.remoteShow(fn)
	}
	//alert(fn)
}
dlgSFTP.folderUpClick = function(event){
	let btn = event.currentTarget
	, dlg = dlgFactory.getDlgParent(btn)
	, dlgsftp = dlg.dlg.dlgsftp
	, list = dlgsftp.remotePath.split('/')
	list.splice(list.length-1, 1)
	let path = list.join('/')
	console.log(dlgsftp.remotePath, path,list)
	dlgsftp.remoteShow(path)
	//alert(dlgsftp.remotePath)
}
dlgSFTP.selectAllClick = function(event){
	let btn = event.currentTarget
	, dlg = dlgFactory.getDlgParent(btn)
	, dlgsftp = dlg.dlg.dlgsftp
	//dlgsftp.selectState = (dlgsftp.selectState==false)
	//var arr = dlgsftp.dlg.querySelector('#divFiles').querySelectorAll('input')
	let arr = dlgsftp.dlg.querySelector('#divFiles').querySelectorAll('input.Selected')
		, selectState = (arr.length == 0)
	if(selectState==true)
		arr = dlgsftp.dlg.querySelector('#divFiles').querySelectorAll('input')
	for(let inp of arr){
		inp.checked = (selectState===true)
		inp.className = (selectState===true ?'Selected' :'')
		//console.log(inp.checked, inp.className)
	}
}
dlgSFTP.remotePathClick = function(event){
	let span = event.currentTarget
	, dlg = dlgFactory.getDlgParent(span)
	, dlgsftp = dlg.dlg.dlgsftp
	, arr = dlgsftp.remotePath.split('/')
	, itemid = Number(span.id.substr(3))
	, path = ''
	for(var ii = 0; ii <= itemid; ii++){
		if(ii==0)
			path = '/'
		else
			path += arr[ii] +'/'
	}
	if(path == dlgsftp.remotePath) return
	dlgsftp.remoteShow(path)
}
dlgSFTP.deleteClick = function(event){
	let btn = event.currentTarget
	, dlg = dlgFactory.getDlgParent(btn)
	, dlgsftp = dlg.dlg.dlgsftp
	let arr = dlgsftp.dlg.querySelector('#divFiles').querySelectorAll('input.Selected')
	if(arr.length===0){
		dlgFactory.bbl('Nothing selected to delete.')
		return
	}
	if(!confirm(`Delete ${arr.length} selected items?`)) return
	for(let inp of arr){
		let lbl = inp.parentNode
		 	, itemid = Number(lbl.id.substr(3))
			, item = dlgsftp.list[itemid]
			, local_stepfunc =  function(total_transferred, chunk, total){
				let pct = (Math.round(total_transferred/total *10)/10) *100
				if(pct != item.lastpct){
				 item.lastpct = pct
				 lbl.style.background = `linear-gradient(to right, #cf0030 ${pct}%, transparent ${pct}%)`
				 console.log(pct, item.filename)
			 }}
			, local_donefunc = function(err){
				if(err){
					dlgFactory.bbl(`Error deleting "${item.filename}".`)
					console.log(`Error deleting "${item.filename}": ${err}.`)
					return
				}
				lbl.style.background = `#cf5050`
				//dlgFactory.bbl('Deleted: '+item.filename)
				console.log('Deleted: '+item.filename)
			}
		dlgsftp.remoteDelete(item, dlgsftp.remotePath, local_stepfunc, local_donefunc)
	}
}
dlgSFTP.downloadClick = function(event){
	let btn = event.currentTarget
	, dlg = dlgFactory.getDlgParent(btn)
	, dlgsftp = dlg.dlg.dlgsftp
	var arr = dlgsftp.dlg.querySelector('#divFiles').querySelectorAll('input.Selected')
	if(arr.length===0){
		dlgFactory.bbl('Nothing selected to download.')
		return
	}
	if(!confirm(`Download ${arr.length} selected items?`)) return
	//
	for(let inp of arr){
		let lbl = inp.parentNode
		lbl.style.background='transparent'
	}
	let counter=0, donecount = 0, tm = ui.calc.timeStart()
	for(counter=0; counter < arr.length; counter++){
		if(counter === ui.args.sftpDownloadMax){
			counter--
			break
		}
		local_launchDownload()
	}
	//for(let inp of arr){
	function local_launchDownload(){
		if(counter >= arr.length) return
		let inp = arr[counter]
		 	, lbl = inp.parentNode
		 	, itemid = Number(lbl.id.substr(3))
			, item = dlgsftp.list[itemid]
		item.lastpct=0
		dlgsftp.remoteDownload(item
		, dlgsftp.remotePath
		, dlgsftp.options.localPath
		, function(total_transferred, chunk, total){
			//console.log('total_transferred, chunk, total, localPath',total_transferred, chunk, total, localPath)
			let pct = (Math.round(total_transferred/total *100)/100) *100
			if(pct != item.lastpct){
			 item.lastpct = pct
			 lbl.style.background = `linear-gradient(to right, #f08f00 ${pct}%, transparent ${pct}%)`
			 if(pct % 10 == 0) console.log(pct, item.filename)
		 }}
		,function(err){
			//donecount++
			if(err){
				dlgFactory.bbl(`Error downloading "${item.filename}": ${err}.`)
				//if(donecount >= arr.length) console.log(`Downloading finished: ${donecount} items in ${ui.calc.timeEnd(tm,'m')}.`)
				return
			}
			lbl.style.background = `#e0bf50`
			dlgFactory.bbl('Downloaded: '+item.filename)
			++donecount
			console.log(item.filename, 'counter', counter, arr.length, donecount)
			if(donecount < arr.length) {
				++counter
				local_launchDownload()
			}
			else
				console.log(`Downloading finished: ${arr.length} items in ${ui.calc.timeEnd(tm,'m')}.`)
		})
	}
}
/*
dlgSFTP.downloadClick = function(event){
	let btn = event.currentTarget
	, dlg = dlgFactory.getDlgParent(btn)
	, dlgsftp = dlg.dlg.dlgsftp
	var arr = dlgsftp.dlg.querySelector('#divFiles').querySelectorAll('input.Selected')
	if(arr.length===0){
		dlgFactory.bbl('Nothing selected to download.')
		return
	}
	if(!confirm(`Download ${arr.length} selected items?`)) return
	//console.log('arr',arr)
	let tm = ui.calc.timeStart(), donecount = 0
	for(let inp of arr){
		let lbl = inp.parentNode
		 	, itemid = Number(lbl.id.substr(3))
			, item = dlgsftp.list[itemid]
			//, remotePath = dlgsftp.remotePath+'/'+item.filename
			//, localPath = dlgsftp.options.localPath+'\\'+item.filename
		item.lastpct=0
		//dlgFactory.bbl(`Downloading: ${item.filename}`)
		dlgsftp.remoteDownload(item
		, dlgsftp.remotePath
		, dlgsftp.options.localPath
		, function(total_transferred, chunk, total){
			//console.log('total_transferred, chunk, total, localPath',total_transferred, chunk, total, localPath)
			let pct = (Math.round(total_transferred/total *100)/100) *100
			if(pct != item.lastpct){
			 item.lastpct = pct
			 lbl.style.background = `linear-gradient(to right, #f08f00 ${pct}%, transparent ${pct}%)`
			 if(pct % 10 == 0) console.log(pct, item.filename)
		 }}
		,function(err){
			donecount++
			if(err){
				dlgFactory.bbl(`Error downloading "${item.filename}": ${err}.`)
				if(donecount >= arr.length) console.log(`Downloading finished: ${donecount} items in ${ui.calc.timeEnd(tm,'m')}.`)
				return
			}
			lbl.style.background = `#e0bf50`
			dlgFactory.bbl('Downloaded: '+item.filename)
			if(donecount >= arr.length) console.log(`Downloading finished: ${donecount} items in ${ui.calc.timeEnd(tm,'m')}.`)
		})
	}
}
*/
