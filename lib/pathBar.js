function pathBar(){
	this.dlg=null
	this.btnResult = false
	this.dlgfolderitems = null
	var me = this
	this.show = function(options){
		if(options.onSelect==null) throw `folder.show() error: onSelect() missing.`
		if(options.onCancel===undefined) options.onCancel = null
		if(options.library==null) options.library = []
		if(options.recent==null) options.recent = []
		if(options.returnType===undefined) options.returnType = null	//'folder'
		if(options.title==null) options.title = 'Browse for File or Folder'
		this.options = options
		this.dlg = dlgFactory.create({
			canDestroy:true,				//whether the dialog should be hidden or destroyed in dlgFactory.close(dlgid)
			createHidden:false,			//if true: dlg.display=none
			footerHidden:true,
			headerHidden:false,
			//focusId: '#inpDelay',
			title: this.htmlHeader(options.title),
			//top/left/height/width: undefined	//if(left===undefined) auto-center dlg; if(top===undefined) dlg.style.top=25em

			style:{width:'40em', paddingBottom:'1em', zIndex:1000},		//key attached to dlg.style
			body: this.html(),
			//onHeaderClick: function(dlg){}
			onClose:function(dlg, force){
				var pathbar = dlg.dlg.pathBar
					, head = dlg.querySelector('#spHead')
				if(pathbar.btnResult===false){
					if(options.onCancel != null) options.onCancel(dlg)
				}
				for(var ii=0; ii< head.children.length; ii++){	//remove menu items
					var ctrl = head.children[ii]
					if(ctrl.className != 'btnMenu') continue
					if(ctrl.dlg!=null && ctrl.dlg.btnList!=null)
						dlgFactory.close(ctrl.dlg.btnList, true)	//force)
				}
				if(pathbar.dlgfolderitems)										//remove folder items
					dlgFactory.close(pathbar.dlgfolderitems, true)	//force)
				dlg.style.display=null												//hide div
			},
			/*buttons:{
				btnCloseHide:false,			//hide the close button
				default: 'Save',				//button caption to select when Enter key pressed; may also be an element.id: '#btnXXX'
				Save: function(dlg, btn){	//save and close
					dlg.dlg.pathBar.btnResult = true
					options.onSelect(ui.var.apipath)
					dlgFactory.close(dlg,true)
				}
			},*/
			onDragStart: function(dlg, dragtarget, dragdata){
				 //hide folder items
				 var dlgfldritems = dlg.dlg.pathBar.dlgfolderitems
				 if(dlgfldritems != null) dlgFactory.close(dlgfldritems)
			 },
			onDragEnd: function(dlg, dragtarget, dragdata){
				//reset pos of menuitems
				var head = dlg.querySelector('#spHead')
				for(var ii=0; ii< head.children.length; ii++){
					var ctrl = head.children[ii]
					if(ctrl.className != 'btnMenu') continue
					dlgFactory.tac2({
						to:{ ctrl:ctrl, from:'bottomleft' }
					, from:'topleft'
					,	html:ctrl.dlg.btnList
					, createHidden:true
					, maxWidthClear:true
					})
				}
		 	}
		})
		this.dlg.dlg.pathBar = this
		this.dlg.className += ' fldrFrame'
		this.dlg.querySelector('#hdr').className = 'fldrHdr'
		var ftr = this.dlg.querySelector('.dlgFooter')
		ftr.style.borderRadius = '5px'
		ftr.style.paddingTop = 0
		this.initCtrls()
		return this.dlg
	}
	this.initCtrls = function(){
		var head = this.dlg.querySelector('#spHead')
			, recentbtnlist=null
		for(var ii=0; ii< head.children.length; ii++){
			var ctrl = head.children[ii]
			if(ctrl.className != 'btnMenu') continue

			//console.log(ctrl.innerHTML)
			var btnlist = null, list=null, prefix=''
			var nm = ctrl.innerHTML
			if(nm==='Clipboard'
			|| nm==='Library'
			|| nm==='Recent'){
				if(nm==='Clipboard'){
					list=['Copy Path','Copy src','Paste']
					prefix='btnClip'
				}else
				if(nm==='Library'){
					list=renderer.pathMnuListLoad(nm, 'path')
					prefix='btnLibrary'
				}else
				if(nm==='Recent'){
					list= renderer.pathMnuListLoad(nm, 'path')
					if(list==null || list.length==0) continue
					prefix='btnRecent'
				}

				btnlist = dlgFactory.btnList({		//returns div container
						parent:ctrl
					,	list:list
					, canDestroy:false
					//, childDisplayCss: 'inline-table'
					, className:'btnMenuItem'
					, createHidden:true
					, from:'topleft'
					, parentFrom:'bottomleft'
					//, parentAppend:true
					, idPrefix:prefix
					, maxWidthNone:true
					,	onSelect: function(btn, path, idx, list){
						var pathBar =  btn.parentNode.dlg.pathBar
						var nm = btn.parentNode.dlg.hvrParent.dlg.nm
						if(path==='Paste'){
							//alert(renderer.clipboardRead())
							var path = renderer.clipboardRead()
							if(path.substr(0,8)==='file:///')
								path = path.substr(8)
							me.folderLoad( path, 'Loading folder items', false)
							return
						}
						if(path==='Copy Path'){
							renderer.clipboardWrite(ui.var.apipath)
							return
						}
						if(path==='Copy src'){
							var src = 'file:///'+ui.var.apipath.replace(/\\/g,'/')
							renderer.clipboardWrite(src)
							return
						}
						//console.log('menu select:', nm)
						var url = renderer.pathMnuItemFind(nm, path)
						//if(url==false) {
						if(url==null) {
							alert(`Record not found for ${nm}: "${path}".`)
							return
						}
						var child = btn.parentNode
						dlgFactory.fadeOut(child)
						pathBar.folderLoad(url, 'Loading folder items', false)
					}
				})
				btnlist.className='btnMenuItems'
				btnlist.style.maxHeight='none'
				btnlist.dlg.pathBar=this
				ctrl.dlg={btnList:btnlist, nm:nm, pathBar:this}
				dlgFactory.hvr({
					parent:ctrl
				, child:btnlist
				, fadeOutWaitMs:150
				})
				ctrl.onclick = function(event){
					//this.dlg.btnList.dlg.toggle()
					//this.onmouseleave()
					var child = this.dlg.hvrChild
					dlgFactory.fadeOut(child)	//,child.dlg.fadeDelay,false,event)
				}
				if(nm=='Recent'){
					recentbtnlist=btnlist
				}
			}
		}
		if(recentbtnlist!=null && recentbtnlist.children.length>0)
			recentbtnlist.children[0].click()
	}
	this.htmlHeader = function(title){ return `
		<div style='position:absolute; right:1em; top:2em;'>
			<button class='dlgButton' onclick='dlgFactory.getDlgParent(this).dlg.pathBar.save()'>Save</button>
			<button class='dlgButton' onclick='dlgFactory.close( dlgFactory.getDlgParent(this), true )'>Close</button>
		</div>
		<div style='font-size:1.5em; font-weight:bold; line-height:0.9; text-shadow:2px 2px 0 #333; '>${title}</div>
		<span id=spHead>
			<div class='btnMenu'>Library</div>
			<div class='btnMenu'>Recent</div>
			<!--div class='btnMenu'>Volumes</div-->
			<div class='btnMenu'>Clipboard</div>
		</span>
	`}
	this.html = function(){	return `
		<style>
			.fldrFrame{ border:1px solid #333;  border-radius:5px; box-shadow:8px 8px rgba(0,0,0,0.7); }
			.fldrHdr{ background:url(../resources/antique-butterflies-tileable-patterns-3.jpg);
				border-radius:5px; color:#eee; cursor:pointer; margin:3px; padding-top:0.8em; }
			.btnMenu{border:1px solid transparent; color:#e0e0e0c0; cursor:pointer;
				display:inline-block; font-size:1em; font-weight:normal; margin:0.25em 0.25em 0 0; padding:0; text-shadow:1px 1px 0 #333;}
			.btnMenuHvr{color:#0f0; }
			.btnMenuSel{border:1px solid #0f0; }
			.btnMenuItems{ background:#733 url(../resources/antique-butterflies-tileable-patterns-3.jpg);
				 border:0; color:#e0e0e0c0; width:auto; z-index:1010; }
			.btnMenuItem{ background:transparent; border:0; color:#e0e0e0; cursor:pointer;
				display:block; font-size:0.8em; font-weight:normal; margin:0; padding:0.25em 0.5em;
				text-align: left; }
			.btnMenuItem:hover{color:#0f0; }
			.btnFolderName{ background:#bfd9ff;
				border:0; border-radius:4px; color:#333; cursor:pointer; display:inline-table;
				font-weight:bold; margin:0 0.3em 0.3em 0; padding:0 0.5em; }
			.btnFolderNameHover{ /*border:1px solid #0ff;*/ }
			/*.btnFolderNameSel{ border:2px solid #0f0; }*/
			.btnFolderItems{ background:#fff; border:1px solid #000; box-shadow:4px 4px #333;
				overflow-x:hidden; overflow-y:auto; padding:0.25em; width:auto; z-index:1000; }
			.btnFolderItem{ background:#fff; border:0; color:#335; cursor:pointer; display:block;
				font-weight:normal; margin:0; padding:0 0.25em; text-align:left; width:auto;
				word-break:break-all; }
			.btnFolderItem:focus{color:#0b0; }
		</style>
		<div id=divpathBar style='background:#fff;  color:#000; padding:0; '></div>
	`}
	this.folderLoad = function(url, msg, showitems){
		url = ui.calc.pathTrailingSlash(url)
		//var _start = new Date().getTime();
		var tdresult = document.querySelector('#tdResult')

		console.log('\npathBar.folderLoad:', url)
		var data = renderer.pathFolderItemsLoad(url)
		//console.log('data returned:', data)

		if(typeof data === 'string'){
			console.log(`folderLoad() error for: [${url}] \nMessage: ${data}`)
			alert(`folderLoad() error for: [${url}] \nMessage: [${data}].`)
			return
		}else
		if(data.result < 0){
			console.log(`folderLoad() error for: [${url}] \nMessage: ${data.msg}`)
			alert(`folderLoad() error for: [${url}] \nMessage: [${data.msg}].`)
			return
		}
		var dlg = this.dlg
		var folderitems = data.items
		var isfile = (data.args.defaultImageNum!=null)
		ui.var.apiPathLast = ui.var.apipath
		ui.var.apipath = url
		ui.var.pathLast = ui.var.path
		ui.var.path = data.fldr
		//console.log('Callback (api,path):\n',ui.var.apipath,ui.var.path)
		//clean path names
		var arr = data.fldr.replace(/\\/g,'/').split('/')
		for(var key in arr){
			var str = arr[key]
			if(str[str.length-1]=='/') arr[key] = str.substr(0, str.length-1)
		}
		//fix last item in folder bar if empty
		if(arr[arr.length-1]==''){
			if(isfile	|| folderitems.length==0)
				arr.splice(arr.length-1, 1)
			else
				arr[arr.length-1] = '/'
		}
		//remove divpathBar.children and visible item list
		var divpathBar = dlg.querySelector('#divpathBar')
		if(this.dlgfolderitems){
			var id = this.dlgfolderitems.id
			ui.calc.ctrlRemove(this.dlgfolderitems)
			this.dlgfolderitems = null
			//	console.log('pathitem',id,dlg.querySelector(id))
		}
		ui.calc.childrenRemoveAll(divpathBar)
		var dlgfldrnames = dlgFactory.btnList({
				parent:divpathBar
			,	list:arr
			, canDestroy:false
			, childDisplayCss: 'inline-table'
			, className:'btnFolderName'
			, createHidden:true
			, from:'append'
			, parentFrom:'topleft'
			, parentAppend:true
			, idPrefix:'btnPath'
			,	onSelect: function(btn, nm, idx, list){
					var pathBar = btn.parentNode.dlg.pathBar
					if(nm=='/'){
						//should not be possible due to dlgFactory.hvr()
						return
					}
					var nmlen = nm.length
						, idx = ui.var.apipath.indexOf(nm)
					if(idx < 0) {
						dlgFactory.msg(`Selected folder, "${nm}", is not available for download.`,'Warning')
						return
					}
					if(idx == (ui.var.apipath.length -nmlen -1)) { //this is the folder whose contents are displayed
						if(pathBar.dlgfolderitems!=null){		//folder is not empty
							if(pathBar.dlgfolderitems.style.display=='block'
							&& (pathBar.dlgfolderitems.style.opacity==''
							||  pathBar.dlgfolderitems.style.opacity==1))
								dlgFactory.fadeOut(pathBar.dlgfolderitems)
							else{
								dlgFactory.fadeIn(pathBar.dlgfolderitems, 1000, 0, 1000, 2000)
								//pathBar.dlgfolderitems.focus()
							}
						}
						return
					}
					//download folder items
					var newpath = ui.var.apipath.substr(0,idx +nmlen +1)
					pathBar.folderLoad(newpath, 'Loading folder items for: '+newpath, true)
				}
		})
		dlgfldrnames.id='divFolderNames'
		dlgfldrnames.dlg.pathBar=this
		dlgFactory.show(dlgfldrnames)
		if(isfile==false && folderitems.length > 0){
			var last = dlgfldrnames.children[dlgfldrnames.children.length-1]
			this.folderItemsShow(last, folderitems, showitems)
		}
	}
	this.folderItemsShow = function(btnlast, folderitems, showitems){
		if(showitems==null) showitems=true
		//console.log('pathBar.folderItemsShow, last btn:', btnlast.id, btnlast.previousSibling.id)
		//
		folderitems = this.foldersFirst(folderitems)
		//add icons
		var items = []
		for(var ii=0; ii<folderitems.length; ii++){
			var obj = folderitems[ii]
				,	str = obj.basename
			if(obj.isDirectory)
				str = '<img src="../resources/folder_closed_64.png" border=0 width=12>'+str
			else {
				//console.log('iconLoad', renderer.iconLoad(obj.path) )
				str = '<div style="display:inline-block;width:12px">&nbsp;</div>'+str
			}
			items.push(str)
		}
		if(this.dlgfolderitems)
			ui.calc.ctrlRemove(this.dlgfolderitems)
		//automatically show items on hover over btnlast, "/"
		this.dlgfolderitems = dlgFactory.btnList({
				parent:btnlast
			,	list:items
			, canDestroy:false
			, className:'btnFolderItem'
			, createHidden:(showitems===false)
			, fadeDelay:150
			, from:'topleft'
			//, parentFrom:'topleft'	//bottomcenter'
			, parentFrom:'bottomleft'
			, idPrefix:'btnFolderItem'
			//, attrib:{ style:{}		}
			/*, onClose: function(dlg, force){
					console.log(21110, force)
				}*/
			,	onSelect: function(btn, nm, idx, list){
					var pathBar = btn.parentNode.dlg.pathBar
					var ii = nm.lastIndexOf('>')		//remove initial tag
					nm = nm.substr(ii+1).trim()
					var newpath = ui.var.apipath +nm
					console.log('pathItem select:',newpath)
					pathBar.folderLoad(newpath, 'pathBar loading folder items for: '+newpath, true)
				}
		})
		this.dlgfolderitems.dlg.pathBar = this
		this.dlgfolderitems.className='btnFolderItems'
		this.dlgfolderitems.style.maxWidth='none'
		//show items on hover over folder name
		dlgFactory.hvr({
			parent:btnlast.previousSibling
		, child:this.dlgfolderitems
		, fadeOutWaitMs:150
		})
		this.dlgfolderitems.children[0].focus()
	}
	this.foldersFirst = function(items){
		var list = []
		//get folders in list
		for(var ii=0; ii < items.length; ii++){
			items[ii].pid=ii
			if(items[ii].isDirectory===true){
				list.push(items[ii])
			}
		}
		//remove folders  from items
		for(var ii=list.length-1; ii >= 0; ii--){
			var idx = list[ii].pid
			items.splice(idx,1)
		}
		//re-add to items
		for(var ii=list.length-1; ii >= 0; ii--)
			items.unshift(list[ii])
		return items
	}
	this.save = function(){
		this.btnResult = true
		this.options.onSelect(ui.var.apipath)
		dlgFactory.close(this.dlg,true)
	}
}
