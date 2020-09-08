/*
  sidebar.js
  - must be loaded via <script> to have access to sidebar.html's DOM

*/

var sidebar = {
    id:null,
    fldStatus:null,   //html control with connection status
    title:null,
    url:null,
    socket:null     //socket.io manager
}
sidebar.autoLoad = async function(){ //call imgList when new tab loads
  let tabs = await browser.tabs.query({active:true})
  console.log('sidebar.autoLoad()', tabs[0].id)

  browser.tabs.onHighlighted.addListener(sidebar.autLoadCallback)
}
sidebar.autLoadCallback = async function(){
  let tabs = await browser.tabs.query({active:true})
  console.log('sidebar.autoLoadCallback()', tabs[0].id)
  browser.tabs.onHighlighted.removeListener(sidebar.autLoadCallback)
  document.querySelector('#btnImgList').click()
}
sidebar.bbl = function( msg, title = null){
  if(title == null) title = 'FolderView Tools'
  browser.notifications.create({
    "type": "basic",
    "iconUrl": browser.extension.getURL("../icons/donut_small-black-18dp.svg"),
    "title": title,
    "message": msg
  });        
}
sidebar.connectStatus = function( tab ){
  console.log('sidebar.connectStatus()')
  let socket = sidebar.socket
  socket.connect()
  //fails to run callback
  // socket.emit('event', 'HelloPeter', function(data){
  //   console.log('sidebar.event.ack:', data)
  //   //socket.disconnect()
  // })
  socket.on('status', function(data){
    console.log('socket.status:', data)
    socket.off('status')
    sidebar.fldStatus.value = data
    sidebar.socket.disconnect()
  })
  socket.emit('status', 'Ehh?')
}
sidebar.imgList = function( jsonArray ){
  let arr = JSON.parse( jsonArray )
  console.log('sidebar.imgList')
  
  //generate html
  let html = ''
  for(let id = 0; id < arr.length; id++){
    let rec = arr[id]
    let aStart = ''
    let aEnd   = ''
    if(rec.link != ''){
      aStart = `<a href="${rec.link}" title="click to open in new tab">`
      aEnd   = `</a>` 
    /*} 
    else{
      aStart = `<a href="${rec.src}" download title="click to download">`
      aEnd   = `</a>` 
    /*/}
    html += `
    <tr id='trImg${rec.id}' class='trImg img' >
      <td class=tdImgIcon><a href="${rec.src}" download title="click to download">
        <img id='img${rec.id}' src="${rec.src}">
      </a></td>
      <td class=tdImgLabel>${aStart}
      ${rec.id}. ${rec.title}<br>
      ${rec.w} X  ${rec.h}<br>
      ${rec.link}
      ${aStart}</td>
    </tr>
    `
  }
  // //reset grid
  sidebar.tbImages.innerHTML = `<div id=divImages>${arr.length} Images Found<br>`
                              + html
                              +'</div>'
let list = sidebar.tbImages.querySelectorAll('a')
for(let ii=0; ii<list.length; ii++){
  list[ii].onclick = function(){
    console.log(111, this.id)
    sidebar.autoLoad()
  }
}
  // console.log('sidebar img list:', sidebar.tbImages.querySelectAll('img'))
  //sidebar.bbl(arr.length +' img found.', 'Images')
}
sidebar.toggle = function() {
  // console.log('sidebar.toggle()')
  browser.sidebarAction.toggle()
}
sidebar.videoGet = function() {
  browser.tabs.query({windowId: sidebar.id, active: true})
    .then((tabs) => {

      sidebar.title.value = tabs[0].title
      let url = tabs[0].url
      //console.log('url',url, sidebar.url.value)
      if(url.indexOf('https://www.youtube.com') !== 0){
        url = 'Not a video url'
      }
      sidebar.url.value = url
    
      //return browser.storage.local.get(tabs[0].url);
      //sidebar.connectStatus( tabs[0] )
    })
}
sidebar.videoURLSend = function() {
  console.log('sidebar.videoURLSend()')
  let socket = sidebar.socket,
      url = sidebar.url.value
  if(url == '' || url == 'Not a video URL'){
    sidebar.bbl("No video URL to transfer to FolderView")
    return
  }
  socket.connect()
  //fails to run callback
  // socket.emit('event', 'HelloPeter', function(data){
  //   console.log('sidebar.event.ack:', data)
  //   //socket.disconnect()
  // })
  socket.on('videoURLSend', function(data){
    console.log('socket.videoURLSend:', data)
    sidebar.socket.off('videoURLSend')
    sidebar.socket.disconnect()
  })
  socket.emit('videoURLSend', url)
}

//init
window.addEventListener('DOMContentLoaded', (event) => {

  //socket.io connection to FolderView native app
  sidebar.socket = io('ws://127.0.0.1:8124', {
    autoConnect:false,      //default = true
    //path: '/browsertools', 
    //query: {token: 'status' },
    reconnectionAttempts: 3   //default = Infinity
  })
  sidebar.socket.on('connect', function(){
    console.log('socket connect')
  })
  sidebar.socket.on('connect_error', (error) => {
    let msg = 'Socket connection error: '+error.toString()
    console.log(msg)
    sidebar.fldStatus.value = msg
    sidebar.bbl(msg)
    sidebar.socket.close()
  })
  sidebar.socket.on('error', (error) => {
    let msg = 'Socket error: '+error.toString()
    console.log(msg)
    sidebar.fldStatus.value = msg
    sidebar.bbl(msg)
    sidebar.socket.close()
  })
  sidebar.socket.on('disconnect', function(){
    console.log('socket disconnect')
  })

  //cache controls
  sidebar.fldStatus = document.querySelector("#fldStatus")
  sidebar.title = document.querySelector("#fld-title")
  sidebar.url = document.querySelector("#fld-url")
  sidebar.tbImages = document.querySelector("#tbImages")
  //sidebar.tbImagesCache = sidebar.tbImages.innerHTML

  //test local socket.io connection
  // document.querySelector('#btnSocket').addEventListener('click', function(event){
  //   console.log('sidebar.btnSocketClick()', event)

  //   var socket = io('ws://127.0.0.1:8124')
  //   socket.on('connect', function(){
  //     console.log('socket connect')
  //   })
  //   socket.on('event', function(data){
  //     console.log('socket event:', data)
  //   })
  //   socket.on('disconnect', function(){
  //     console.log('socket disconnect')
  //   })
  //   // socket.emit('event', 'HelloPeter')
  //   socket.emit('event', 'HelloPeter', (data) => {
  //     console.log('sidebar.status.ack:', data)
  //     socket.disconnect()
  //   })
  // })
  
  //test calling native app
  // document.querySelector('#btNativeApp').addEventListener('click', function(event){
  //   console.log('browser_action.btNativeApp()', event)

  //   browser.runtime.sendMessage({
  //     sender:'browser_action.btNativeApp',
  //     to: 'background',
  //     type: 'nativeApp',
  //     data:' sent from browser_action.btNativeApp()'
  //   });
  // })

  //test basic message passing  
  browser.runtime.onMessage.addListener( function( message ){
    if(message.handler || !message.to || message.to !== 'sidebar')
      return

    switch (message.type) {
      case 'ping': 
        message.handler = 'sidebar'
        console.log(`sidebar.ping from `, message.sender)
        // browser.notifications.create({
        //   "type": "basic",
        //   "iconUrl": browser.extension.getURL("link.png"),
        //   "title": "sidebar.js Ping",
        //   "message": message.sender
        // }); 
        sidebar.bbl( 'received from: '+message.sender, "background.js "+message.type )
        break
      case 'updateContent': 
        message.handler = 'sidebar'
        console.log(`sidebar.updateContent from `, message.sender)
        sidebar.videoGet()
        break
     case 'imgList': 
        message.handler = 'sidebar'
        //console.log(`sidebar.imgList from `, message.sender, message.data)
        sidebar.imgList( message.data )
        break
    }
    if(message.handler){
      // message.handled = ui.calc.timeStamp()
    }
  })

  ///
  document.querySelector('#btnStatus').addEventListener('click', function(event){
    console.log('sidebar.btnStatus()')
    sidebar.connectStatus()
  })
  document.querySelector('#btnImgClear').addEventListener('click', function(event){
    sidebar.tbImages.innerHTML = '<tr><td>Ready</td></tr>'
  })
  document.querySelector('#btnImgList').addEventListener('click', function(event){
    console.log('sidebar.btnImgList()')
    browser.runtime.sendMessage({
      sender:'sidebar.btnImgListClick',
      to: 'background',
      type: 'contentScriptLoad',
      data:{ greeting:"imgList" }
    })      
  })
  document.querySelector('#btnVideoGet').addEventListener('click', function(event){
    console.log('sidebar.btnVideoGet()')
    sidebar.videoGet()
  })
  document.querySelector('#btnVideoSend').addEventListener('click', function(event){
    console.log('sidebar.btnVideoSend()')
    sidebar.videoURLSend()
  })

  console.log(`sidebar.init`)
});

console.log(`sidebar.js init`)