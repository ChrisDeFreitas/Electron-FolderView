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

const crypto = require('crypto')
const fs = require('fs')
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
		"Cancel": function(dlg, btn) {
			if (scanState.isScanning) {
				scanState.isCancelled = true
				btn.disabled = true
				btn.innerHTML = 'Cancelling...'
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

	function startScan(dlg) {
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

		runAsync(function() {
			return collectFiles(folder, includeSubfolders, skipZeroSize)
		}, function(files) {
			if (scanState.isCancelled) {
				finishScan(dlg, true)
				return
			}

			if (files.length === 0) {
				showMessage(dlg, 'No files found in the selected folder')
				finishScan(dlg, false)
				return
			}

			scanState.currentPhase = 'grouping'
			scanState.total = files.length

			updateProgress(dlg, `Found ${files.length} files. Grouping by size...`, 0, files.length)

			runAsync(function() {
				return groupBySize(files)
			}, function(sizeGroups) {
				if (scanState.isCancelled) {
					finishScan(dlg, true)
					return
				}

				let candidates = []
				for (let size in sizeGroups) {
					if (sizeGroups[size].length > 1) {
						candidates = candidates.concat(sizeGroups[size])
					}
				}

				if (candidates.length === 0) {
					showMessage(dlg, `Scanned ${files.length} files. No potential duplicates found (all files have unique sizes).`)
					finishScan(dlg, false)
					return
				}

				scanState.currentPhase = 'hashing'
				scanState.total = candidates.length
				scanState.filesProcessed = 0

				updateProgress(dlg, `Calculating hashes for ${candidates.length} potential duplicates...`, 0, candidates.length)

				calculateHashesAsync(dlg, candidates, 0, function(hashGroups) {
					if (scanState.isCancelled) {
						finishScan(dlg, true)
						return
					}

					let duplicates = []
					let totalDuplicateFiles = 0
					let wastedSpace = 0

					for (let hash in hashGroups) {
						const group = hashGroups[hash]
						if (group.length > 1) {
							duplicates.push({
								hash: hash,
								size: group[0].size,
								files: group
							})
							totalDuplicateFiles += group.length
							wastedSpace += group[0].size * (group.length - 1)
						}
					}

					scanState.results = {
						totalFiles: files.length,
						duplicateGroups: duplicates,
						totalDuplicateFiles: totalDuplicateFiles,
						wastedSpace: wastedSpace
					}

					showResults(dlg, scanState.results)
					finishScan(dlg, false)
				})
			})
		})
	}

	function collectFiles(folder, includeSubfolders, skipZeroSize) {
		const result = []
		const queue = [folder]

		while (queue.length > 0 && !scanState.isCancelled) {
			const currentFolder = queue.shift()
			let items = []

			try {
				items = fs.readdirSync(currentFolder)
			} catch (e) {
				continue
			}

			for (let item of items) {
				if (scanState.isCancelled) break

				const fullPath = path.join(currentFolder, item)
				let stat = null

				try {
					stat = fs.lstatSync(fullPath)
				} catch (e) {
					continue
				}

				if (stat.isDirectory()) {
					if (includeSubfolders) {
						queue.push(fullPath)
					}
				} else if (stat.isFile()) {
					if (skipZeroSize && stat.size === 0) {
						continue
					}
					result.push({
						path: fullPath.replace(/\\/g, '/'),
						size: stat.size,
						basename: item
					})
				}
			}
		}

		return result
	}

	function groupBySize(files) {
		const groups = {}
		for (let file of files) {
			if (scanState.isCancelled) break
			const size = file.size.toString()
			if (!groups[size]) {
				groups[size] = []
			}
			groups[size].push(file)
		}
		return groups
	}

	function calculateHashesAsync(dlg, candidates, startIndex, callback) {
		if (scanState.isCancelled) {
			callback({})
			return
		}

		const batchSize = 20
		const endIndex = Math.min(startIndex + batchSize, candidates.length)

		const hashGroups = dlg.dlg.hashGroups || {}
		dlg.dlg.hashGroups = hashGroups

		for (let i = startIndex; i < endIndex && !scanState.isCancelled; i++) {
			const file = candidates[i]
			const hash = calculateFileHash(file.path)

			if (hash) {
				if (!hashGroups[hash]) {
					hashGroups[hash] = []
				}
				hashGroups[hash].push(file)
			}

			scanState.filesProcessed++
		}

		scanState.progress = scanState.filesProcessed
		updateProgress(
			dlg,
			`Calculating hashes... (${scanState.filesProcessed}/${scanState.total})`,
			scanState.filesProcessed,
			scanState.total
		)

		if (endIndex < candidates.length && !scanState.isCancelled) {
			setTimeout(function() {
				calculateHashesAsync(dlg, candidates, endIndex, callback)
			}, 0)
		} else {
			callback(hashGroups)
		}
	}

	function calculateFileHash(filePath) {
		try {
			const hash = crypto.createHash('sha256')
			const fd = fs.openSync(filePath, 'r')
			const buffer = Buffer.alloc(65536)
			let bytesRead = 0

			while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length)) > 0) {
				hash.update(buffer.slice(0, bytesRead))
				if (scanState.isCancelled) {
					fs.closeSync(fd)
					return null
				}
			}

			fs.closeSync(fd)
			return hash.digest('hex')
		} catch (e) {
			return null
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

	function runAsync(workFunc, callback) {
		setTimeout(function() {
			const result = workFunc()
			setTimeout(function() {
				callback(result)
			}, 0)
		}, 0)
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
