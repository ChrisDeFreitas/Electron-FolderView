/*
	actionMap.js
	- execute functions, given an action cue
	- an action cue: is an ordered list of actions/keys/keywords/strings/tokens/words
	- an action cue: [ 'action1', ... ]
	- an action map: {
			'action1': function1,
			...
	}
	- built for playing back "select" functions in dlgRename.js

*/

dlgRenameAm = {
	recording:false,
	cue:[],		
	map:{					//populated in dlgRename.js
		dlgRenameSelClear: null, //ui.var.dlgRenameSelClear,
		dlgRenameSelMoveRightWs: null, //ui.var.dlgRenameSelMoveRightWs,
		dlgRenameSelMoveRight: null, //ui.var.dlgRenameSelMoveRight,
		dlgRenameSelMoveLeft: null, //ui.var.dlgRenameSelMoveLeft,
		dlgRenameSelMoveLeftWs: null, //ui.var.dlgRenameSelMoveLeftWs,
		dlgRenameSelMoveLeftAuto: null, //ui.var.dlgRenameSelMoveLeftAuto,
		dlgRenameBtnRenameClick: null, //ui.var.dlgRenameBtnRenameClick,
	},

	//methods
	clear: function(){ 
		this.cue.length = 0 
	},
	dump: function()	{
		console.log('dlgRenameAm:', dlgRenameAm)
	},
	play: function(){
		if(dlgRename == null) return

		dlgRename.querySelector('#cbRNRecord').checked = false
		this.recording = false
		
		actionMap( this.cue, this.map )
	},
	push: function( action ){ 
		if(this.recording !== true) return
		this.cue.push( action )
		//console.log('push', action )
	},
	recordingToggle: function(){
		if(this.recording === false){
			this.clear()
			this.recording = true
			return
		}

		this.recording = false
	}
}

actionMap = function(cue, map, event = {}){

	let idx = 0
	for(let action of cue){
		if(map[action] == undefined){
			console.log('actionMap('+action+'): map[action] == undefined')
		}
		else{
			event.action = action
			event.action_idx = ++idx
			event.action_max = cue.length

			// console.log('actionMap('+action+'):', event)
			let result = map[ action ](event)
			if(result === true)
				break
		}
	}

}