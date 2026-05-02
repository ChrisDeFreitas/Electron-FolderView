/*
	dlgDuplicateScan.js
	- 重复文件扫描功能
	- 用户选择目录后，扫描其中的重复文件
	- 先按文件大小分组，再对可能重复的文件计算hash
	- 扫描过程中显示进度，用户可以中途取消
	- 取消后不要留下半截状态，也不要让界面卡死
	- 结果页展示重复文件分组、文件路径、大小和hash

	usage:
		require('./dlgDuplicateScan.js').open()
*/
'use strict'

exports.open = dlgDuplicateScanCreate

const path = require('path')

var dlgInstance = null

function dlgDuplicateScanCreate() {
	if (dlgInstance !== null) {
		dlgFactory.show(dlgInstance)
		return dlgInstance
	}
	let html, buttons

	let folderId = 'folder' + ui.calc.timestamp(null, false)
	let progressId = 'progress' + ui.calc.timestamp(null, false)
	let statusId = 'status' + ui.calc.timestamp(null, false)
	let resultsId = 'results' + ui.calc.timestamp(null, false)

	let scanState = {
		isScanning: false,
		isCancelled: false,
		currentPhase: '',
		progress: 0,
		total: 0,
		filesProcessed: 0,
		results: null
	}

	html = `
		<style>
			#dlgDuplicateScan .divScanOptions label { color:#333; cursor:pointer; display:block; font-weight:normal; padding-left:0.5em; }
			#dlgDuplicateScan .divScanOptions label input { position:relative; top:2px; }
			#dlgDuplicateScan .progressBar { 
				width:100%; height:24px; background:#eee; border:1px solid #ccc; border-radius:3px; overflow:hidden;
			}
			#dlgDuplicateScan .progressFill { 
				height:100%; background:#0d3; width:0%; transition:width 0.3s;
			}
			#dlgDuplicateScan .statusText { 
				color:#666; font-size:0.9em; margin-top:0.5em; text-align:center;
			}
			#dlgDuplicateScan .btnAction {
				min-width:80px;
			}
			#dlgDuplicateScan .scanResults {
				max-height:50vh; overflow:auto; margin-top:1em;
			}
			#dlgDuplicateScan .duplicateGroup {
				border:1px solid #ddd; border-radius:4px; margin-bottom:1em; background:#fafafa;
			}
			#dlgDuplicateScan .groupHeader {
				background:#e8e8e8; padding:0.5em 1em; cursor:pointer; font-weight:bold;
				border-bottom:1px solid #ddd;
			}
			#dlgDuplicateScan .groupHeader:hover {
				background:#ddd;
			}
			#dlgDuplicateScan .groupContent {
				padding:0.5em; display:none;
			}
			#dlgDuplicateScan .groupContent.expanded {
				display:block;
			}
			#dlgDuplicateScan .fileItem {
				padding:0.3em 0.5em; border-bottom:1px solid #eee; font-family:monospace; font-size:0.85em;
			}
			#dlgDuplicateScan .fileItem:hover {
				background:#f0f0f0;
			}
			#dlgDuplicateScan .fileItem:last-child {
				border-bottom:none;
			}
			#dlgDuplicateScan .filePath {
				word-break:break-all; color:#333;
			}
			#dlgDuplicateScan .fileMeta {
				color:#666; font-size:0.9em; margin-top:0.2em;
			}
			#dlgDuplicateScan .hashValue {
				color:#060; font-weight:bold;
			}
			#dlgDuplicateScan .summaryInfo {
				background:#f0f8f0; border:1px solid #d0e8d0; border-radius:4px;
				padding:0.8em; margin-bottom:1em;
			}
			#dlgDuplicateScan .summaryInfo p {
				margin:0.3em 0; color:#333;
			}
		</style>
		<div class="divScanOptions">
			<label style="color:#ffaf00; display:block; margin:0.5em auto;">
				Folder to scan:
				<input id='${folderId}' value='${ui.args.path}' style="width:70%;" onclick="this.select()">
				<button id="btnBrowse" title="Change folder to scan">...</button>
			</label>
			<label>
				<input type="checkbox" id="includeSubfolders" checked>
				Include subfolders
			</label>
			<label>
				<input type="checkbox" id="skipZeroSize">
				Skip zero-size files (recommended)
			</label>
		</div>
		<div id="${progressId}" style="display:none; margin:1em 0;">
			<div class="progressBar">
				<div class="progressFill"></div>
			</div>
			<div id="${statusId}" class="statusText">Ready</div>
		</div>
		<div id="${resultsId}" class="scanResults" style="display:none;">
		</div>
	`

	buttons = {
		default: 'Scan',
		"Scan": function(dlg, btn) {
			startScan(dlg)
		},
		"Cancel": async function(dlg, btn) {
			if (scanState.isScanning) {
				btn.disabled = true
				btn.innerHTML = 'Cancelling...'
				renderer.duplicateScanService.cancelScan()
			} else {
				dlgFactory.close(dlg)
			}
		},
		"Close": function(dlg, btn) {
			dlgFactory.close(dlg)
		}
	}

	let dlg = dlgFactory.create({
		attrib: { id: 'dlgDuplicateScan', style: { minWidth: '50em', zIndex: 1500 } },
		buttons: buttons,
		canDestroy: false,
		createHidden: false,
		focusId: '#btnBrowse',
		id: 'dlgDuplicateScan',
		rollup: true,
		title: 'Duplicate File Scanner',
		body: html,
		onClose: function(dlg, force) {
			renderer.duplicateScanService.cancelScan()
			scanState.isCancelled = true
			scanState.isScanning = false
			dlg.style.display = 'none'
			if (force === true) {
				dlgInstance = null
			}
		}
	})

	dlgInstance = dlg
	dlg.dlg.scanState = scanState
	dlg.dlg.folderId = folderId
	dlg.dlg.progressId = progressId
	dlg.dlg.statusId = statusId
	dlg.dlg.resultsId = resultsId

	let btnCancel = dlg.querySelector('#btn0')
	let btnScan = dlg.querySelector('#btn1')
	let btnClose = dlg.querySelector('#btnClose')

	btnCancel.style.display = 'none'
	btnClose.style.display = 'none'
	btnScan.className += ' btnAction'
	btnCancel.className += ' btnAction'

	dlg.querySelector('#btnBrowse').onclick = function() {
		renderer.folderSelectAuto(
			dlg.querySelector('#' + folderId).value,
			'Select Folder to Scan',
			folderId
		)
	}

	return dlg

	async function startScan(dlg) {
		const folder = dlg.querySelector('#' + folderId).value.trim()
		const includeSubfolders = dlg.querySelector('#includeSubfolders').checked
		const skipZeroSize = dlg.querySelector('#skipZeroSize').checked

		if (!folder || folder === '') {
			alert('Please select a folder to scan')
			return
		}

		const stat = ui.calc.stat(folder)
		if (!stat || !stat.isDirectory) {
			alert('Selected path is not a valid directory')
			return
		}

		scanState = {
			isScanning: true,
			isCancelled: false,
			currentPhase: 'collecting',
			progress: 0,
			total: 0,
			filesProcessed: 0,
			results: null,
			includeSubfolders: includeSubfolders,
			skipZeroSize: skipZeroSize,
			folder: folder
		}
		dlg.dlg.scanState = scanState

		btnScan.style.display = 'none'
		btnCancel.style.display = 'inline'
		btnCancel.disabled = false
		btnCancel.innerHTML = 'Cancel'
		btnClose.style.display = 'none'

		dlg.querySelector('#' + progressId).style.display = 'block'
		dlg.querySelector('#' + resultsId).style.display = 'none'

		updateProgress(dlg, 'Collecting files...', 0, 1)

		try {
			const result = await renderer.duplicateScanService.scan(
				{ folder, includeSubfolders, skipZeroSize },
				function(progress) {
					scanState.filesProcessed = progress.processed
					scanState.total = progress.total || scanState.total
					
					let message = ''
					if (progress.phase === 'collecting') {
						message = `Collecting files... (${progress.processed} items processed)`
						updateProgress(dlg, message, 0, 1)
					} else if (progress.phase === 'hashing') {
						scanState.currentPhase = 'hashing'
						message = `Calculating hashes... (${progress.processed}/${progress.total})`
						updateProgress(dlg, message, progress.processed, progress.total)
					}
				},
				function(phaseData) {
					if (phaseData.phase === 'collecting') {
						updateProgress(dlg, phaseData.message, 0, 1)
					} else if (phaseData.phase === 'grouping') {
						updateProgress(dlg, phaseData.message, 0, 1)
					} else if (phaseData.phase === 'hashing') {
						scanState.total = phaseData.total
						updateProgress(dlg, phaseData.message, 0, phaseData.total)
					} else if (phaseData.phase === 'files-collected') {
						scanState.total = phaseData.fileCount
						updateProgress(dlg, `Found ${phaseData.fileCount} files. Grouping by size...`, 0, phaseData.fileCount)
					}
				}
			)

			if (result.cancelled) {
				finishScan(dlg, true)
				return
			}

			if (result.totalFiles === 0) {
				showMessage(dlg, 'No files found in the selected folder')
				finishScan(dlg, false)
				return
			}

			if (result.noCandidates) {
				showMessage(dlg, `Scanned ${result.totalFiles} files. No potential duplicates found (all files have unique sizes).`)
				finishScan(dlg, false)
				return
			}

			scanState.results = result
			showResults(dlg, result)
			finishScan(dlg, false)

		} catch (error) {
			console.error('Duplicate scan error:', error)
			showMessage(dlg, `Error: ${error.message}`)
			finishScan(dlg, false)
		}
	}

	function updateProgress(dlg, statusText, current, total) {
		const progressDiv = dlg.querySelector('#' + dlg.dlg.progressId)
		const progressFill = progressDiv.querySelector('.progressFill')
		const statusDiv = dlg.querySelector('#' + dlg.dlg.statusId)

		const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0
		progressFill.style.width = percent + '%'
		statusDiv.innerHTML = statusText + ` (${percent}%)`
	}

	function showMessage(dlg, message) {
		const resultsDiv = dlg.querySelector('#' + dlg.dlg.resultsId)
		resultsDiv.style.display = 'block'
		resultsDiv.innerHTML = `<div style="padding:1em; text-align:center; color:#666;">${message}</div>`
	}

	function showResults(dlg, results) {
		const resultsDiv = dlg.querySelector('#' + dlg.dlg.resultsId)
		resultsDiv.style.display = 'block'

		let html = ''

		html += `<div class="summaryInfo">
			<p><b>Total files scanned:</b> ${results.totalFiles.toLocaleString()}</p>
			<p><b>Duplicate groups found:</b> ${results.duplicateGroups.length.toLocaleString()}</p>
			<p><b>Total duplicate files:</b> ${results.totalDuplicateFiles.toLocaleString()}</p>
			<p><b>Potential wasted space:</b> ${ui.calc.bytesToStr(results.wastedSpace)}</p>
		</div>`

		if (results.duplicateGroups.length === 0) {
			html += `<div style="padding:1em; text-align:center; color:#666;">
				No duplicate files found.
			</div>`
		} else {
			html += `<div style="font-size:0.9em; color:#666; margin-bottom:0.5em;">
				Click on a group to expand/collapse. Groups with same size and hash are shown.
			</div>`

			for (let i = 0; i < results.duplicateGroups.length; i++) {
				const group = results.duplicateGroups[i]
				const groupId = 'group' + i

				html += `<div class="duplicateGroup">
					<div class="groupHeader" onclick="toggleDuplicateGroup('${groupId}')">
						[${i + 1}] ${group.files.length} files &bull; ${ui.calc.bytesToStr(group.size)} each &bull; 
						Total: ${ui.calc.bytesToStr(group.size * group.files.length)} &bull; 
						Wasted: ${ui.calc.bytesToStr(group.size * (group.files.length - 1))}
					</div>
					<div id="${groupId}" class="groupContent">
						<div style="padding:0.3em 0.5em; background:#f0f0f0; border-bottom:1px solid #ddd;">
							<b>Hash (SHA256):</b> <span class="hashValue">${group.hash}</span>
						</div>`

				for (let j = 0; j < group.files.length; j++) {
					const file = group.files[j]
					html += `<div class="fileItem">
						<div class="filePath">${file.path}</div>
						<div class="fileMeta">
							Size: ${ui.calc.bytesToStr(file.size)}
						</div>
					</div>`
				}

				html += `</div></div>`
			}
		}

		resultsDiv.innerHTML = html

		if (results.duplicateGroups.length > 0) {
			const firstGroup = resultsDiv.querySelector('#group0')
			if (firstGroup) {
				firstGroup.className += ' expanded'
			}
		}
	}

	function finishScan(dlg, wasCancelled) {
		scanState.isScanning = false

		btnScan.style.display = 'inline'
		btnCancel.style.display = 'none'
		btnClose.style.display = 'inline'

		if (wasCancelled) {
			updateProgress(dlg, 'Scan cancelled by user', 0, 1)
			dlg.querySelector('#' + dlg.dlg.progressId).style.display = 'none'
			showMessage(dlg, 'Scan was cancelled. No results to display.')
		}
	}
}

window.toggleDuplicateGroup = function(groupId) {
	const content = document.getElementById(groupId)
	if (content) {
		if (content.className.indexOf('expanded') >= 0) {
			content.className = content.className.replace(' expanded', '')
		} else {
			content.className += ' expanded'
		}
	}
}
