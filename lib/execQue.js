/*
	execQue.js
	- que console commands
	- spawn commands asynchronously
	- provide callbacks: beforeExecute(job), afterExecute(job)
	- commands being executed have status dialogs in upper right of browser

	vars
		ui.var.execQueMax:1,			//max simultaneous executions
		ui.var.execQueCnt:0,			//number of executions occurring
		ui.var.execQueList:[],		//list of commands waiting to be executed

	job = {
		command:string,
		msg:string,		required, msg displayed when command executed
		cbBeforeExec: function(job){},
		cbAfterExec: function(job){},

		... custom data is ok ...

		//populated with:
		execStart: int
		execDuration: int
		queStart: int
		queDuration: int
		err: boolean			//(err != null) === an error occured
		stdout: string
		stderr: string
	}

	jobs = [job, ...]

*/
var dlgExecQ = null
function execQue(jobs){

	if(jobs === null)
		throw new Error('execQue() requires a jobs argument')

	if(Array.isArray(jobs) === false)
			jobs = [jobs]

	let me = this
	this.queTime = ui.calc.timeStart()

	this.enque = function(jobs){
		for(let job of jobs){

			if(job.msg == null)
				throw new Error(`execQue.enque() error, job.msg is null.`)
			if(job.command == null)
				throw new Error(`execQue.enque() error, job.command is null for [${job.msg}].`)

			//console.log('\nenque:', job.msg)

			if(job.msg == null) job.msg = ''
			if(job.bblmsgs == null) job.bblmsgs = 'end'
			job.queStart = ui.calc.timeStart()

			ui.var.execQueList.push(job)
			this.queStatus()

			this.launch()
		}
	}
	this.launch = function(){
		if(ui.var.execQueList.length === 0
		&& ui.var.execQueCnt === 0){
			this.queStatusDone()
			return
		}
		while( ui.var.execQueList.length > 0
				&& ui.var.execQueCnt < ui.var.execQueMax){

			let job = ui.var.execQueList.shift()
			this.queStatus()

			//console.log('launch:', job.msg)
			if(job.cbBeforeExec)
				job.cbBeforeExec(job)

			this.exec(job)
		}
	}
	this.exec = function(job){
		console.log(`execQue.exec:  ${job.msg}\n  ${job.command}`)

		++ui.var.execQueCnt
		this.jobStatus(job)
		job.execStart = ui.calc.timeStart()

		ui.calc.execAsync(job.command, function(err, stdout, stderr){
			//console.log('  exec result:', stdout)
			job.execDuration = ui.calc.timeEnd(job.execStart)
			job.err = err
			job.stdout = stdout
			job.stderr = stderr
			console.log('   exec done:', ui.calc.msecToStr(job.execDuration), job.msg)
			me.deque(job)
		})
	}
	this.deque = function(job){
		--ui.var.execQueCnt
		job.queDuration = ui.calc.timeEnd(job.queStart)
		//console.log('deque:', ui.calc.msecToStr(job.queDuration), job.msg)

		if(job.err){
			console.log(`exec "${job.msg}" failed:`, job.err)
			alert(`"${job.msg}" failed:\n${job.err}.`)
		}

		if(job.cbAfterExec)
			job.cbAfterExec(job)

		this.jobStatusDone(job)
		this.launch()
	}

	this.queStatus = function(job){
		if(dlgExecQ !== null)
			dlgExecQ.querySelector('#eqLabel span').innerHTML = ui.var.execQueList.length
		else {
			//create dlg
			dlgExecQ = dlgFactory.tac2({
				to:{
					ctrl:document.body,
					from:'topright'
				},
				from:'topright',
				onClose:function(dlg, force){
					dlgExecQ = null
				},
				html:`
						<div id=divExecQue title='Commands being executed; ${ui.var.execQueMax} command(s) run at a time.'>
							<div id=eqLabel>Remaining jobs: <span>${ui.var.execQueList.length}</span></div>
						</div>
					`
				}
			)
		}
	}
	this.queStatusDone = function(){
		if(dlgExecQ == null) return

		this.queTime = ui.calc.timeEnd( this.queTime )
		console.log(`ExecQue done, duration: ${ui.calc.msecToStr(this.queTime)}.`)

		dlgFactory.close(dlgExecQ)
	}
	this.jobStatus = function(job){
		let jobStatusClick = function(event){
			dlgFactory.msg('Not implemented: '+job.msg, 'Job Status Click')
		}
		//onclick="jobStatusClick(event)"
		job.ctrl = document.createElement('div')
		job.ctrl.innerHTML = `<div class=eqStatus>
			${job.msg}
		</div>`
		dlgExecQ.appendChild(job.ctrl)
	}
	this.jobStatusDone = function(job){
		dlgFactory.fadeOut(job.ctrl, 0, 500, 500, true)
		//job.ctrl.remove()
		this.queStatus()
	}
	this.jobStatusFail = function(job){
		//???
	}

	this.enque(jobs)
}