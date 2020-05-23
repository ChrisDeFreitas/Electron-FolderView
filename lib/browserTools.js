/*

browserTools.js
- ui to manage Firefox Tools remote endpoints
- display a dialog controlling socket.io communicatons and showing list of endpoints
- requires socket.io client to send messages on selected port
- endpoint are dynamic: btools.add( { name:callback, ... } }


*/

var btools = {
    dlg:null,           //html div containing user interface
    endpoints:null,     //registerd endpoints
    io:null,
    port:8124,
    socketCnt:0,

    state:'ready',
    states:{
        init:'init',
        listen:'listen',
        ready:'ready',
    },
    stateSet:function( newState ){
        this.state = newState
        if(this.state === this.states.ready){
            btools.lblSettings = null
            btools.lblStatus = null
            btools.spnPort = null
            btools.divMsg = null
            btools.dlg = null
        } else
        if(this.state === this.states.init){
            btools.lblSettings = btools.dlg.querySelector('#lblSettings')
            btools.lblStatus = btools.dlg.querySelector('#lblStatus')
            btools.spnPort = btools.dlg.querySelector('#spnPort')
            btools.divMsg = btools.dlg.querySelector('#divMsg')
            btools.btnListen = btools.dlg.querySelector('#btn0')
            btools.btnDisconnect = btools.dlg.querySelector('#btn1')
        
            btools.lblSettings.style.display = 'block'
            btools.lblStatus.style.display = 'none'

            btools.btnListen.style.display = 'inline'
            btools.btnDisconnect.style.display = 'none'
        } else
        if(this.state === this.states.listen){
            btools.socketCnt = 0

            btools.lblSettings.style.display = 'none'
            btools.lblStatus.style.display = 'block'

            btools.spnPort.innerHTML = this.port
            btools.divMsg.innerHTML = 'No clients yet'

            btools.btnListen.style.display = 'none'
            btools.btnDisconnect.style.display = 'inline'
        }
        console.log('btools.state', btools.state)
    }    
}
btools.autoListenSet = function( bval = false ){
    if(bval !== true) bval = false
    ui.settingWrite('btools','autoListen', bval)
    // console.log('btools','autoListen', bval)
}
btools.init = function( options = null ){

    if(btools.state != btools.states.ready){        //state = init or listening
        dlgFactory.show(btools.dlg)
        return
    }

    if(options == null)   
        options = {}
    if(options.port)      
        this.portSet( options.port )
    else
    if(ui.settings.btools.port)
        this.portSet( ui.settings.btools.port )
    if(options.endpoints) 
        btools.add( options.endpoints )
        
    let html, buttons,
        autoCheck = (ui.settings.btools.autoListen===true ?'checked' :'')

    html = `
    <label id=lblSettings class="divBulkOptions" style="display:block;margin:1em auto; text-align:center;">
        Socket.io port to listen on: 
        <input id=dlgFVTPort type=number onclick="btools.portSet(this.value, event)" value="${this.port}" onfocus='this.select()' style='text-align:center; width:5em; '>
        <button id=btnDefaultPort class="el el-caret-down dlgButton" title="Use default port"  onclick="btools.portSet(8124, event)"></button>
    </label>
    <label id=lblStatus class="divBulkOptions" style="display:none;margin:1em auto; text-align:center;">
        Socket.io listening on: <span id=spnPort></span>
        <div id=divMsg style='color:#ccc; font-weight:normal; '>XXX</div>
    </label>
    <table  class="divBulkOptions" style="margin:0 0 0 1em">
    <tr><td  title="Automatically listen when application started.">
        <label for="cbFVTAutoListen" style="cursor:pointer">Listen on startup: </label></td>
        <td><input id=cbFVTAutoListen type=checkbox ${autoCheck} onclick="btools.autoListenSet(this.checked)"></td>
    </tr>
    </table>
    <div id=dlgFVTList class="divBulkOptions"></div>`

    buttons = {
        default:'Listen',
        Listen: function(dlg, btn){
            btools.listen()
        },
        Disconnect: function(dlg, btn){
            btools.disconnect()
        },
        Minimize: function(dlg, btn){
            dlgFactory.hdrClick( btools.dlg )
            //minimize window
            renderer.winMinize()
        }
    }

    btools.dlg = dlgFactory.create({
        attrib:{ className:'dlgBulk', style:{minWidth:'16em', zIndex:1600}},
        body:html,
        buttons:buttons,
        canDestroy:true,
        //focusId: '#btn0',
        rollup:true,
        title:'Firefox Tools EndPoints',
        onClose:function(dlg,force){
            btools.disconnect( function( io ){
                btools.stateSet( btools.states.ready )
            })
        },
    })

	btools.dlg.querySelector('#btn1').style.marginRight = '0'
	btools.dlg.querySelector('#btn2').title = 'Minimize the application'

    btools.stateSet( btools.states.init )
}
btools.listen = function(  ){
    if(btools.state == btools.states.listen){
        this.disconnect()
    }

    this.io = require('socket.io')(this.port, {
    // 	//path: '/browsertools', 
    // 	origins: '*'
    })
    console.log('io.init')

    this.io.on('connection', (socket) => {
        let nn = ++btools.socketCnt
        btools.socketMsg(nn, 'connect')

        console.log('io client connected')
        socket.on('disconnect', () => {
          console.log('io client  disconnected');
          btools.socketMsg(nn, 'disconnected');
        })
        socket.on('event', (msg) => {   //event is a label--it could be any string
          console.log('io.event: ' + msg);
        })
        socket.on('status', (data) => {   //event is a label--it could be any string
          let ss = `FolderView v${ui.updateDate}`
          console.log('io.status: ' + ss)
          btools.socketMsg(nn, 'status')
          socket.emit('status', ss)
        })
        socket.on('videoURLSend', (data) => {   //event is a label--it could be any string
          console.log('io.videoURLSend: ' + data)
          btools.socketMsg(nn, 'videoURLSend')

          videoDl.init({url:data, getInfo:true})

          renderer.winFocus()
          socket.emit('videoURLSend', data)
        })
    })

    btools.stateSet( btools.states.listen )
}
btools.disconnect = function( cb = null ){

    if(btools.state == btools.states.listen){
        this.io.close( function(){
            btools.io = null
            btools.stateSet( btools.states.init )
            if(cb != null)
                cb()
        } )
        return
    }

    if(cb != null)
        cb()
}
btools.portSet = function( newport, event ){
//    console.log('newport', newport, parseInt(newport, 10))
    newport = parseInt(newport, 10)
    btools.port = newport

    if(event && event.target.id != dlgFVTPort)
        btools.dlg.querySelector('#dlgFVTPort').value = newport
}
btools.add = function( endpoints ){
    for(let [ep, cb] of endpoints){
        this.endpoints[ep] = cb
    }
}
btools.del = function( endpoints ){
    for(let [ep, cb] of endpoints){
        delete this.endpoints[ep]
    }
}
btools.show = function( options = null ){
    btools.init( options )
}
btools.socketMsg = function(nn, msg){
    if(btools.state != btools.states.listen) return

    btools.divMsg.innerHTML = `#${nn}/${btools.socketCnt}: ${msg}`
}
