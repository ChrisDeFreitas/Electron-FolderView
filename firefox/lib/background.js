/*
  background.js

*/

var background = {
    id:null,
    title:null,
    url:null,
    port:null,    //store handle to FolderView.exe
    //contentPort:null,     //port to content.js
    contentTabId:null       //used to invalidate scrips
  }
background.bbl = function( msg, title = null){
  if(title == null) title = 'FolderView Tools'
  browser.notifications.create({
    "iconUrl": browser.extension.getURL("../icons/donut_small-black-18dp.svg"),
    "message": msg,
    "title": title,
    "type": "basic"
  });        
}
background.tabActiveGet = async function(){
  let tab = await browser.tabs.query({active:true})
  if(tab != null) {
    if(Array.isArray(tab) && tab.length > 0)
      tab = tab[0]
  }
  return tab
}

function toggleSidebar() {
  browser.sidebarAction.toggle()
}
async function contentScriptLoad( msgData ){
  let tab = await background.tabActiveGet()

  console.log('contentScriptLoad', background.contentTabId, tab.id)
  if(background.contentTabId != tab.id){
    let executing = await browser.tabs.executeScript({
      file : `../lib/content.js`,
      runAt: "document_idle"
    })
    console.log('executing',executing)
    if(executing == null) 
      return
  }
  // background.contentPort.postMessage({ greeting:msgData.greeting });
  background.contentTabId = tab.id
  browser.tabs.sendMessage( tab.id, msgData )
}

//init
window.addEventListener('DOMContentLoaded',  function(event){
  browser.browserAction.onClicked.addListener(toggleSidebar);
  browser.commands.onCommand.addListener(function (command) {
    if (command === "toggle-sidebar") {   //keystroke = ctrl+alt+c
      //browser.sidebarAction.toggle()
      toggleSidebar()
      console.log("Toggle sidebar visibility");
    }
  })
  
  browser.runtime.onMessage.addListener( async function( message ){
    if(message.handler || !message.to || message.to !== 'background')
      return

    switch (message.type) {
      case 'bbl': 
        background.bbl( message.data.msg,  message.data.title )
        break
/*      case 'content-ping': 
        console.log(`background.content-ping from `)
        message.handler = 'background'
        background.contentPort.postMessage({ greeting:"Ping from background" })
        background.bbl( 'received from: '+message.sender, "background.js "+message.type )
        break*/
      case 'sidebar-ping': 
        message.handler = 'background'
        console.log(`background.sidebar-ping from `, message.sender)
        browser.runtime.sendMessage({
          sender:'background',
          to: 'sidebar',
          type: 'ping'
        });      
        background.bbl( 'from: '+message.sender, "background.js "+message.type)
        break
      case 'ping': 
        message.handler = 'background'
        console.log(`background.ping from `, message.sender)
        background.bbl('from: '+message.sender, "background.js "+message.type)
        break
      case 'contentScriptLoad': 
        contentScriptLoad( message.data )
        break
      case 'imgList': 
        message.handler = 'background'
        console.log(`background.imgList from `, message.sender)
        browser.runtime.sendMessage({
          sender:'background',
          to:'sidebar',
          type:'imgList',
          data:message.data
        });
        // background.bbl('from: '+message.sender, "background.js "+message.type)
        break
      case 'nativeApp':           //test calling native app
        message.handler = 'background'
        console.log(`background.nativeApp called from `, message.sender)
        
        //Connection-based messaging
        background.port = browser.runtime.connectNative( "FolderView" )
        background.port.onMessage.addListener((response) => {
            console.log("port received: " + response);
        })
        background.port.onDisconnect.addListener((p) => {
          if (p.error)
            console.log(`port Disconnected due to an error: ${p.error.message}`)
          else
            console.log(`port Disconnected.`)
          background.port = null
        })
        background.bbl('Tried to launch FolderView.exe')
        break
    }
    if(message.handler){
      // message.handled = ui.calc.timeStamp()
    }
  })
  
  console.log('background.init')    
})

/*/Connection-based messaging with content.js:
browser.runtime.onConnect.addListener( async function(port) {
  background.contentPort = port
  let tab = await background.tabActiveGet()
  background.contentTabId = tab.id

  console.log('background connected to content.js in tab.id =', tab.id)
})
*/

//reset content.js connection when tab content changes
browser.tabs.onUpdated.addListener(function handleUpdated(tabId, changeInfo, tabInfo) {
  if(tabId == background.contentTabId){
    //background.contentPort = null
    background.contentTabId = null
    console.log("content.js reset for tabId =", tabId);
  }
})




console.log(`background js init`)