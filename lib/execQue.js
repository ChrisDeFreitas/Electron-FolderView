/*
	execQue.js
	- que console commands
	- spawn commands asynchronously
	- provide callbacks: beforeExecute(job), afterExecute(job)

	vars
		ui.var.execQueMax:1,			//max simultaneous executions
		ui.var.execQueCnt:0,			//number of executions occurring
		ui.var.execQueList:[],		//list of commands waiting to be executed

	job = {
		command:string,
		msg:string,	msg displayed in bubble message at start or end of execution, may be empty
		cbBeforeExec: function(job),
		cbAfterExec: function(job),
		bblmsgs: default = 'end', range = [both, start, end, none]; determine whether to display a bubble message before or after command execution

		... custom data is ok ...

		//populated with:
		execStart: int,
		execDuration: int
		queStart: int
		queDuration: int
		err: boolean			//(err != null) === an error occured
		stdout: string
		stderr: string
	}

	jobs = [job, ...]

*/
function execQue(jobs){

	if(jobs === null)
		throw new Error('launchFileCopy() requires an jobs argument')

	if(Array.isArray(jobs) === false)
			jobs = [jobs]

	let me = this
	this.enque = function(jobs){
		for(let job of jobs){

			if(job.command == null)
				throw new Error(`execQue.enque() error, job.command is null for [${job.msg}].`)

			//console.log('\nenque:', job.msg)

			if(job.msg == null) job.msg = ''
			if(job.bblmsgs == null) job.bblmsgs = 'end'
			job.queStart = ui.calc.timeStart()

			ui.var.execQueList.push(job)

			this.launch()
		}
	}
	this.launch = function(){
		while( ui.var.execQueList.length > 0
				&& ui.var.execQueCnt < ui.var.execQueMax){

			let job = ui.var.execQueList.shift()

			//console.log('launch:', job.msg)
			if(job.cbBeforeExec)
				job.cbBeforeExec(job)

			++ui.var.execQueCnt
			this.exec(job)
		}
	}
	this.exec = function(job){
		console.log('execQue.exec:', job.msg, job.command)
		job.execStart = ui.calc.timeStart()

		ui.calc.execAsync(job.command, function(err, stdout, stderr){
			//console.log('  exec result:', stdout)
			job.execDuration = ui.calc.timeEnd(job.execStart)
			job.err = err
			job.stdout = stdout
			job.stderr = stderr
			console.log('   exec done:', ui.calc.msecToStr(job.duration), job.msg)
			me.deque(job)
		})

		if(job.msg != '' && ['start','both'].indexOf(job.bblmsgs) >= 0)
			dlgFactory.bbl(`Start:<br>${job.msg}`)
	}
	this.deque = function(job){
		--ui.var.execQueCnt
		job.queDuration = ui.calc.timeEnd(job.queStart)
		//console.log('deque:', ui.calc.msecToStr(job.queDuration), job.msg)

		if(job.msg != '' && ['end','both'].indexOf(job.bblmsgs) >= 0)
			dlgFactory.bbl(`Completed:<br>${job.msg}`)

		if(job.err){
			console.log(`exec "${job.msg}" failed:`, job.err)
			alert(`"${job.msg}" failed:\n${job.err}.`)
		}

		if(job.cbAfterExec)
			job.cbAfterExec(job)

		this.launch()
	}

	this.enque(jobs)
}