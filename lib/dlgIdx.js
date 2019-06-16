var dlgIdx = null
function dlgIdxInit(){

	if(dlgIdx != null) {
		dlgIdx.remove()
		dlgIdx = null
	}

	if(items.length <= ui.var.dlgIdxMinItems) return

	let winheight = window.innerHeight

	if(winheight +20 >= grid.scrollHeight) return

	var html, left, childleft, ctrl, inc, hinc, max, item, itemidx, ii, ii2

	max = Math.round( winheight / 40)
	if(max >= items.length){
		max = items.length
		inc = 1
	}
	else
		inc = (items.length /(max -1))
	hinc = Math.floor(winheight / max)

	//console.log('dlgIdx', max, hinc, inc, items.length, winheight)

	html=''
	ii2=0
	left=200
	childleft=left-20
	for(ii=0; ii < max -1; ii++){

		itemidx = Math.round(ii2)
		if(itemidx >= items.length -1) break
		ii2 += inc

		item = items[itemidx]
		html += `<div class=dlgIdxItem onclick="itemSelect(${item.pid}, true); dlgIdx.onmouseleave(null)"
			style="top:${hinc*ii}px; width:${childleft}px;" title="${item.basename}">
		${itemidx +1}. ${item.basename}
		</div>`
	}
	//add last item in list
	itemidx = items.length-1
	item = items[itemidx]
	html += `<div class=dlgIdxItem onclick="itemSelect(${item.pid}, true); dlgIdx.onmouseleave(null)"
		style="top:${hinc*ii}px; width:${childleft}px;" title="${item.basename}">
	${itemidx +1}. ${item.basename}
	</div>`
	//
	html = `<div id=dlgIdxChild style='width:${left+5}px; height:${winheight -25}px; '>
		${html}
		<div id=dlgIdxThumb>&nbsp;</div>
	</div>`

	dlgIdx = dlgFactory.tac2({
		at:{x:0, y:10},
		createHidden:true,
		from:'topleft',
		html:html,
		id:'dlgIdx',
		maxHeightNone:true,
		maxWidthNone:true,
	})
	dlgIdx.dlg.left = left
	dlgIdx.onmouseenter = function(event){
		let ctrl = event.target
		ctrl.style.left = '0px'
	}
	dlgIdx.onmouseleave = function(event){
		//let ctrl = event.target
		dlgIdx.style.left = `-${dlgIdx.dlg.left}px`
	}
	//
	dlgIdx.style.left = `-${dlgIdx.dlg.left}px`
	dlgIdx.style.display = 'block'
}

