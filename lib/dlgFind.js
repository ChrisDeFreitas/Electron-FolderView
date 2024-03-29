﻿/*
	dlgFind.js
	- interface to search folder items

	usage:
		require('./dlgFind.js').open()

*/
exports.open = dlgFindCreate
exports.defaultOptions = defaultOptions

var defaultOptions = {
			folder: '',
			find: '',
			findCase: false,					//case sensitive search
			findInvert: false,				//invert search result: !indexOf()
			findRegex: false,
			subFolders: true,					//iterate subfolders
}
var dlgid = 0

function dlgFindCreate( options = null ) {

	const path = require('path')
	let html, buttons, find, findCase, findInvert, findRegex, subFolders

	if(options != null){
		for(let opt in defaultOptions){
			if(options[opt]){
				defaultOptions[opt] = options[opt]
			}
		}
	}

	if(defaultOptions.folder == '')
		defaultOptions.folder = ui.args.path
	find = defaultOptions.find
	findCase = (defaultOptions.findCase===true ?'checked' :'')
	findInvert = (defaultOptions.findInvert===true ?'checked' :'')
	findRegex = (defaultOptions.findRegex===true ?'checked' :'')
	subFolders = (defaultOptions.subFolders===true ?'checked' :'')

	let folderId = 'folder'+ui.calc.timestamp(null, false)
	let findId = 'find'+ui.calc.timestamp(null, false)

	html =`
		<style>
			#divFindOpts label{ color:#eee; cursor:pointer; display:block; font-weight:normal; padding-left:1em; }
			#divFindOpts label input{ position:relative; top:2px; }
			#divFindOpts label a,
			#divFindOpts label a:visited{ color:#eee; }
			#tbResults tr th{ cursor:pointer; width:7em; }
			#tbResults tr th:nth-child(1){ width:3em; }
			#tbResults tr th:nth-child(2){ width:24em; }
			#tbResults tr { vertical-align:top; }
			#tbResults tr:hover td { color:#3f3; }
			#tbResults tr .folder { color:#ffd; font-weight:bold; }
			#tbResults tr td{ color:#fff; cursor:pointer; font-weight:normal; padding-bottom:0.5em; width:7em; }
			#tbResults tr td:nth-child(1){ text-align:center; width:3em; }
			#tbResults tr td:nth-child(2){ text-align:left; word-break:break-word; width: 25em; }
			#tbResults tr td:nth-child(3){ text-align:right; font-size:11px; }
			#tbResults tr td:nth-child(4){ text-align:right; font-size:11px; }
		</style>
		<label class="divBulkOptions" style='color:##ffaf00; display:block; margin:0.5em auto;'>Folder:
			<input id='${folderId}' value='${ui.args.path}' style="width:80%; " onclick="this.select()">
			<button title='Change folder to search' onclick="renderer.folderSelectAuto(document.querySelector('#${folderId}').value, 'Select Search Folder', '${folderId}' )">...</button>
		</label>
		<label class="divBulkOptions" style='color:##ffaf00; display:block; margin:0 auto; width:90%;'>
			Find:	<input id='${findId}' value='${find}' style="width:80%; " onclick="this.select()" spellcheck=false autocorrect=off >
			<button id=btnFindPaste class="el el-arrow-down dlgButton" title="Paste and search"></button>
		</label>
		<div class="divBulkOptions" style="margin:0.3em auto 0.5em auto; text-align:center; font-style:italic; font-size:0.9em; font-weight:normal; ">Leave blank to return all items</div>
		<div id=divFindOpts style="margin:0 auto; width:80%">
			<label><input type=checkbox id=findCase ${findCase}> Case-sensitive</label>
			<label><input type=checkbox id=findRegex ${findRegex}> Find string is a <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions" title='Goto MDN Regular Expressions' target=_new>regex</a> 
				<button id=btnReExamples onclick="let vvv = this.parentNode.parentNode.querySelector('#divReExamples').style; vvv.height=(vvv.height==='auto'?'0px':'auto')" style="font-size:0.8em; margin-left: 1em;">Examples</button>
				<div id='divReExamples' style="font-size:0.9em; height:0px; overflow:hidden; ">
				&nbsp; &nbsp; &nbsp;To find file names - 
					<br> &nbsp; &nbsp; &nbsp; * beginning with HDTV: ^(HDTV)
					<br> &nbsp; &nbsp; &nbsp; * ending with .mp4: (\\.mp4)$
					<br> &nbsp; &nbsp; &nbsp; * containing words beginning with HDTV: \\b(HDTV)
					<br> &nbsp; &nbsp; &nbsp; * containing words ending with HDTV: (HDTV)\\b
					<br> &nbsp; &nbsp; &nbsp; * with HDTV or PDTV: (HDTV)|(PDTV)
					<br> &nbsp; &nbsp; &nbsp; * without HDTV or PDTV: (HDTV)|(PDTV) and check "Invert Results"
					<br> &nbsp; &nbsp; &nbsp; * with HDTV twice: (HDTV){2}
					<br> &nbsp; &nbsp; &nbsp; * with HDTV then 720p or 1080p: (HDTV).*(720p|1080p)
					<br> &nbsp; &nbsp; &nbsp; * with HDTV ending with .mp4: (HDTV).*(\\.mp4)$
				</div>
			</label>
			<label><input type=checkbox id=findInvert ${findInvert}> Invert results</label>
			<label><input type=checkbox id=subFolders ${subFolders}> Iterate subfolders</label>
		</div>
		<div id=divResults class="divBulkOptions" style="display:none; margin:0.5em auto 0 auto; text-align:center; width:100%;">
		</div>
	`

	buttons = {
		default: 'Find',
		"Back": function(dlg,btn){	//return to original folder
			renderer.folderLoad( document.querySelector('#'+folderId).value )
			dlg.querySelector('#btn0').style.visibility = 'hidden'
		},
		"Find": function(dlg,btn){
			let options, divResults, html, ii, ss, ss2

			let folderId = dlg.dlg.folderId
			let findId = dlg.dlg.findId
			let findText = dlg.querySelector('#'+findId).value

			dlg.querySelector('#btn0').style.visibility = 'hidden'

			options = Object.assign({}, defaultOptions)
			options.folder = dlg.querySelector('#'+folderId).value
			options.find = findText
			options.findCase = dlg.querySelector('#findCase').checked
			options.findInvert = dlg.querySelector('#findInvert').checked
			options.findRegex = dlg.querySelector('#findRegex').checked
			options.subFolders = dlg.querySelector('#subFolders').checked
			console.log('options',options)

			divResults = dlg.querySelector('#divResults')
			divResults.style.display = 'block'
			divResults.innerHTML = 'loading items...'

			let result = require('./folderWalk/folderWalk.js').exec(options)
			console.log('result',result)

			ss =  (result.folderSize == 0?'' :'('+ui.calc.bytesToStr(result.folderSize)+')')
			//html = `Found: ${result.fileCount.toLocaleString()} files (${ui.calc.bytesToStr(result.fileSize)}) and ${result.folderCount.toLocaleString()} folders ${ss}`
			//html = `Found: ${result.treeCount.toLocaleString()} items (${ui.calc.bytesToStr(result.treeSize)})`
			html = `<div style='font-weight:normal; margin:0 auto 0.5em auto; width:auto; '>
				[${findText}] found:<br>
				${result.treeCount.toLocaleString()} items (${ui.calc.bytesToStr(result.treeSize)}),
				${result.fileCount.toLocaleString()} files (${ui.calc.bytesToStr(result.fileSize)}) and
				${result.folderCount.toLocaleString()} folders ${ss}
				</div>`

			if(result.items.length > 0){
				html += `<table id=tbResults class=tbRowHilight style="table-layout:fixed; border-collapse:collapse; border-spacing:0;">
					<thead><tr style="display:flex;">
						<th onclick="tableSort('tbResults', 0, 1, true)" title='Click for default order'>#</th>
						<th onclick="tableSort('tbResults', 1, 1, false)" title='Click to toggle sort by name'>Name</th>
						<th onclick="tableSort('tbResults', 4, 1, true)" title='Click to toggle sort by size'>Size</th>
						<th onclick="tableSort('tbResults', 3, 1, false)" title='Click to toggle sort by date'>Modified</th>
					</tr></thead>
					<tbody style="display:block; overflow:auto; max-height:35em; width:100%;">
				`
				ii = 0
				for(let itm of result.items){
					let fullpath = path.posix.join(itm.path, itm.basename),
							dt = local_dateFormat( itm.date )
					if(itm.isDirectory==true)
						fullpath = ui.calc.pathTrailingSlash( fullpath, 'posix')
					html += `<tr title="${fullpath}" ondblclick="if(renderer.folderLoadIfNotFound('${fullpath}')===true) {dlg.querySelector('#btn0').style.visibility = 'visible';} return true;"><td>${++ii}. </td>`
					if(itm.isDirectory===true){
						if(itm.treeSize === undefined){
							ss = 'colspan=2'
							ss2 = '<td style="display:none"></td>'
						}
						else {
							ss = ''
							ss2 = `<td>${ui.calc.bytesToStr(itm.treeSize)}</td>`
						}
						html += `<td ${ss} class=folder>${itm.basename}</td>${ss2}<td>${dt}</td><td style='display:none'>${(itm.treeSize === undefined ?itm.size :itm.treeSize)}</td></tr>`
					}
					else
						html += `<td style="font-weight:lighter">${itm.basename}</td><td>${ui.calc.bytesToStr(itm.size)}</td><td>${dt}</td><td style='display:none'>${itm.size}</td></tr>`
				}
				html += '</tbody></table></div>'
			}

			divResults.innerHTML = html
		}
	}

	dlg = dlgFactory.create({	//rename dlg
		// attrib:{ className:'dlgBulk', style:{maxWidth:'42em', width:'42em', zIndex:1500}},
		attrib:{ className:'dlgBulk', style:{minWidth:'16em', zIndex:1500}},
		buttons:buttons,
		canDestroy:true,
		focusId: '#'+findId,
		id:'dlgFind'+(++dlgid),
		rollup:true,
		title:'Find Folder Items #'+dlgid,
		//onClose:function(dlg,force){},
		body: html
	})

	dlg.dlg.folderId = folderId
	dlg.dlg.findId = findId
	dlg.querySelector('#btnClose').style.marginRight = '3em'
	dlg.querySelector('#btn1').style.marginRight = 0

	let btn = dlg.querySelector('#btn0')
	btn.style.marginRight = 0
	btn.style.visibility = 'hidden'
	btn.title = 'Return main window to default folder'

	dlg.querySelector('#btnFindPaste').onclick = function(){
		let txt = renderer.clipboardRead()
		dlg.querySelector('#'+findId).value = txt.trim()
		dlg.querySelector('#btn1').click()
	}

	return dlg
}

function local_dateFormat( str ){
	let dt = new Date( str )
	return `${dt.getFullYear()}/${ui.calc.padNumber(dt.getMonth()+1, 2)}/${ui.calc.padNumber(dt.getDate(),2)}`
					+ ` ${ui.calc.padNumber(dt.getHours(), 2)}:${ui.calc.padNumber(dt.getMinutes(), 2)}:${ui.calc.padNumber(dt.getSeconds(), 2)}`
					+ ` ${ui.calc.padNumber(dt.getMilliseconds(), 3)}`
}
