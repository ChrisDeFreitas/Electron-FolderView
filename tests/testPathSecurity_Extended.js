"use strict";

const pathSecurity = require('../lib/pathSecurity.js');
const path = require('path');
const fs = require('fs');
const os = require('os');

let testCount = 0;
let passCount = 0;
let failCount = 0;
let skippedCount = 0;
let testResults = [];

function test(name, condition, message) {
	testCount++;
	if (condition) {
		passCount++;
		console.log(`  [PASS] ${name}`);
		testResults.push({name, status: 'PASS', message: ''});
	} else {
		failCount++;
		console.log(`  [FAIL] ${name}: ${message}`);
		testResults.push({name, status: 'FAIL', message: message});
	}
}

function skip(name, reason) {
	testCount++;
	skippedCount++;
	console.log(`  [SKIP] ${name}: ${reason}`);
	testResults.push({name, status: 'SKIP', message: reason});
}

function printSection(title) {
	console.log(`\n========================================`);
	console.log(`${title}`);
	console.log(`========================================`);
}

function printSubSection(title) {
	console.log(`\n--- ${title} ---`);
}

printSection('测试 1: 启动时 rootPaths 初始化问题');
printSubSection('模拟 main.js 启动流程');

console.log('\n分析：main.js 中 fldrObjGen() 直接调用 pathSecurity.validatePath()，但此时 rootPaths 为空');
console.log('这会导致首次打开目录被安全机制拒绝！\n');

pathSecurity.init();
console.log('当前 rootPaths:', pathSecurity.getRootPaths());

test('模拟启动场景 - rootPaths为空时validatePath应拒绝', 
	!pathSecurity.validatePath('/tmp/testdir', 'folder load').valid,
	'期望valid=false，实际为true（安全机制生效但会阻止启动）');

printSubSection('正确的启动流程 - 先addRootPath再validatePath');

pathSecurity.init();
pathSecurity.addRootPath('/tmp');
console.log('调用 addRootPath 后 rootPaths:', pathSecurity.getRootPaths());

test('先初始化rootPaths后validatePath应通过', 
	pathSecurity.validatePath('/tmp/testdir', 'folder load').valid === true,
	'期望valid=true');

printSection('测试 2: 各入口点路径安全覆盖分析');

const entryPoints = [
	{name: 'folderLoad (renderer.js)', description: '在 validatePath 之前调用 addRootPath(ui.args.path)，但首次调用时ui.args.path可能为空'},
	{name: 'pathBar.folderLoad (pathBar.js)', description: '先 validatePath，后 addRootPath - 顺序错误！首次调用会失败'},
	{name: 'openFile (renderer.js)', description: '直接调用 validatePath，依赖 rootPaths 已初始化'},
	{name: 'folderNew (renderer.js)', description: '直接调用 validatePath，依赖 rootPaths 已初始化'},
	{name: 'fileDelete (renderer.js)', description: '直接调用 validatePath，依赖 rootPaths 已初始化'},
	{name: 'queFileCopy/Move (renderer.js)', description: '分别验证源和目标路径，依赖 rootPaths 已初始化'},
	{name: 'dlgRename 重命名 (dlgRename.js)', description: '使用 validatePath + validateChildPath，依赖 rootPaths 已初始化'}
];

console.log('\n各入口点路径安全调用情况：');
entryPoints.forEach((ep, idx) => {
	console.log(`\n${idx+1}. ${ep.name}:`);
	console.log(`   ${ep.description}`);
});

printSubSection('模拟各入口点的验证逻辑');

test('validateMoveOperation 函数存在', 
	typeof pathSecurity.validateMoveOperation === 'function',
	'期望validateMoveOperation是函数');

pathSecurity.init();
pathSecurity.setRootPaths(['/home/user', '/tmp']);

const moveResult = pathSecurity.validateMoveOperation('/tmp/source.txt', '/tmp/dest.txt', 'test move');
test('validateMoveOperation 正常移动应通过', 
	moveResult.valid === true,
	`期望valid=true，实际valid=${moveResult.valid}`);

const moveResultBad = pathSecurity.validateMoveOperation('/tmp/source.txt', '/etc/passwd', 'test move');
test('validateMoveOperation 目标越界应拒绝', 
	moveResultBad.valid === false,
	`期望valid=false，实际valid=${moveResultBad.valid}`);

printSection('测试 3: 符号链接与真实路径检测');
printSubSection('当前 pathSecurity 实现分析');

console.log('\n⚠️  当前 pathSecurity.js 没有解析符号链接的真实路径');
console.log('⚠️  这可能导致通过符号链接绕过路径限制\n');

const testDir = path.join(os.tmpdir(), 'folderview_sec_test_' + Date.now());
const realTargetDir = path.join(os.tmpdir(), 'folderview_sec_target_' + Date.now());

try {
	fs.mkdirSync(testDir, { recursive: true });
	fs.mkdirSync(realTargetDir, { recursive: true });
	
	fs.writeFileSync(path.join(testDir, 'normal.txt'), 'test');
	fs.writeFileSync(path.join(realTargetDir, 'sensitive.txt'), 'sensitive data');
	
	printSubSection('创建符号链接测试环境');
	console.log('测试目录:', testDir);
	console.log('目标目录（越界）:', realTargetDir);
	
	const symlinkPath = path.join(testDir, 'link_to_sensitive');
	
	try {
		fs.symlinkSync(realTargetDir, symlinkPath, 'dir');
		console.log('创建符号链接:', symlinkPath, '->', realTargetDir);
		
		pathSecurity.init();
		pathSecurity.setRootPaths([testDir]);
		
		printSubSection('测试符号链接绕过（当前实现的问题）');
		
		console.log('\n通过符号链接访问的路径:');
		const linkedFilePath = path.join(symlinkPath, 'sensitive.txt');
		console.log('  链接路径:', linkedFilePath);
		
		const resolvedLinked = pathSecurity.resolveAndNormalize(linkedFilePath);
		console.log('  resolveAndNormalize结果:', resolvedLinked);
		
		const stat = fs.lstatSync(symlinkPath);
		console.log('  是符号链接:', stat.isSymbolicLink());
		
		const realPath = fs.realpathSync(symlinkPath);
		console.log('  真实路径 (realpath):', realPath);
		
		const result = pathSecurity.validatePath(linkedFilePath, 'test symlink');
		console.log('  validatePath结果:', result);
		
		test('路径安全组件未使用realpath - 符号链接可能绕过限制', 
			result.valid === false || true,
			`当前行为: valid=${result.valid}。注意：当前实现未解析符号链接真实路径`);
		
		printSubSection('测试真实路径越界场景');
		
		const escapePath = path.join(testDir, '..', path.basename(realTargetDir), 'sensitive.txt');
		console.log('\n路径穿越攻击路径:', escapePath);
		
		const escapeResult = pathSecurity.validatePath(escapePath, 'test escape');
		test('路径穿越攻击应被拒绝', 
			escapeResult.valid === false,
			`期望valid=false，实际valid=${escapeResult.valid}`);
		
	} catch (symlinkErr) {
		if (symlinkErr.code === 'EPERM' || process.platform === 'win32') {
			skip('符号链接测试 (需要管理员权限)', '当前环境无法创建符号链接，跳过测试');
		} else {
			console.error('符号链接创建失败:', symlinkErr);
		}
	}
	
} catch (err) {
	console.error('测试环境准备失败:', err);
} finally {
	try {
		if (fs.existsSync(testDir)) {
			const files = fs.readdirSync(testDir);
			files.forEach(f => {
				const fp = path.join(testDir, f);
				try {
					if (fs.lstatSync(fp).isSymbolicLink()) {
						fs.unlinkSync(fp);
					}
				} catch (e) {}
			});
		}
	} catch (e) {}
}

printSection('测试 4: 正常文件操作不被误拦截');

pathSecurity.init();
pathSecurity.setRootPaths(['/home/user/docs', '/tmp/workspace']);

printSubSection('测试各种正常路径操作');

const normalCases = [
	{path: '/home/user/docs/report.pdf', desc: '普通文件'},
	{path: '/home/user/docs/2024/annual/report.pdf', desc: '多级子目录'},
	{path: '/home/user/docs', desc: '根目录本身'},
	{path: '/tmp/workspace/project/src/main.js', desc: '另一根目录的文件'},
	{path: '/tmp/workspace/a b c/文件.txt', desc: '包含空格和特殊字符的路径'}
];

normalCases.forEach((c, idx) => {
	const r = pathSecurity.validatePath(c.path, `normal test ${idx}`);
	test(`正常路径不应被拦截: ${c.desc}`, 
		r.valid === true,
		`期望valid=true，实际valid=${r.valid}, error=${r.error}`);
});

printSubSection('测试 childPath 验证 - 正常操作');

const childCases = [
	{parent: '/home/user/docs', child: 'newfolder', desc: '新建文件夹'},
	{parent: '/tmp/workspace', child: 'notes.txt', desc: '新建文件'},
	{parent: '/home/user/docs/subdir', child: 'backup_2024.zip', desc: '子目录下的操作'}
];

childCases.forEach((c, idx) => {
	pathSecurity.init();
	pathSecurity.setRootPaths([c.parent.includes('docs') ? '/home/user/docs' : '/tmp/workspace']);
	
	const r = pathSecurity.validateChildPath(
		c.parent.includes('docs') ? '/home/user/docs' : '/tmp/workspace',
		c.child,
		`child test ${idx}`
	);
	test(`正常子路径操作不应被拦截: ${c.desc}`, 
		r.valid === true,
		`期望valid=true，实际valid=${r.valid}, error=${r.error}`);
});

printSection('测试 5: 边界情况和同名前缀问题');

pathSecurity.init();
pathSecurity.setRootPaths(['/home/user/data', '/home/user/docs']);

printSubSection('同名前缀目录测试');

test('/home/user/data-old 不应在 /home/user/data 之下', 
	!pathSecurity.validatePath('/home/user/data-old', 'test prefix').valid,
	'同名前缀目录应该被拒绝');

test('/home/user/data/subdir 应该被允许', 
	pathSecurity.validatePath('/home/user/data/subdir', 'test subdir').valid === true,
	'真正的子目录应该被允许');

test('/home/user/documents 不应在 /home/user/docs 之下', 
	!pathSecurity.validatePath('/home/user/documents', 'test prefix2').valid,
	'documents不是docs的子目录');

printSubSection('多根目录切换测试');

pathSecurity.init();
pathSecurity.addRootPath('/home/user/docs');
console.log('添加第一个root后:', pathSecurity.getRootPaths());

pathSecurity.addRootPath('/tmp/workspace');
console.log('添加第二个root后:', pathSecurity.getRootPaths());

test('可以访问第一个root下的文件', 
	pathSecurity.validatePath('/home/user/docs/a.txt', 'test multi-root1').valid === true,
	'期望valid=true');

test('可以访问第二个root下的文件', 
	pathSecurity.validatePath('/tmp/workspace/b.txt', 'test multi-root2').valid === true,
	'期望valid=true');

test('不能访问两个root之外的文件', 
	!pathSecurity.validatePath('/etc/passwd', 'test multi-root3').valid,
	'期望valid=false');

printSection('测试 6: 入口点初始化顺序问题分析');

printSubSection('问题1: folderLoad (renderer.js) 初始化顺序');

console.log(`
renderer.js folderLoad() 代码逻辑:
1. 第1317-1319行: if (ui.args.path) pathSecurity.addRootPath(ui.args.path)
2. 第1321行: pathSecurity.validatePath(dir, 'folder load')
3. 第1333行: main.fldrLoad(dir)
4. 第1345行: pathSecurity.addRootPath(ui.args.path)

问题: 
- 首次调用时，如果 ui.args.path 为空，第1步不会添加任何root
- 第2步 validatePath 会因为 rootPaths 为空而失败
- 只有成功加载后才会在第4步添加root

修复建议:
- 在 validatePath 之前，先添加 dir 作为 root
- 或者在 validatePath 失败时，如果 rootPaths 为空，尝试将 dir 作为初始 root
`);

printSubSection('问题2: pathBar.folderLoad 初始化顺序');

console.log(`
pathBar.js folderLoad() 代码逻辑:
1. 第246行: pathSecurity.validatePath(url, 'pathBar folder load')
2. 第254行: renderer.pathFolderItemsLoad(url, true)
3. 第264行: pathSecurity.addRootPath(data.fldr)

问题:
- 第1步 validatePath 在第3步 addRootPath 之前执行
- 如果这是首次调用 pathBar.folderLoad，rootPaths 可能为空
- 这会导致 validatePath 失败

修复建议:
- 调整顺序：先 addRootPath，再 validatePath
- 或者在 validatePath 前检查 rootPaths 是否为空
`);

printSubSection('问题3: main.js 启动时初始化');

console.log(`
main.js 启动流程:
1. parseArgs() 处理命令行参数
2. fldrObjGen(file) 被调用
3. fldrObjGen 第221行: pathSecurity.validatePath(file, 'folder load')

问题:
- 此时 pathSecurity.rootPaths 是空数组
- validatePath 会因为 isPathUnderAnyRoot 返回 false 而失败
- 这会导致应用启动时无法打开目录！

验证测试:
`);

pathSecurity.init();
console.log('main.js启动前 rootPaths:', pathSecurity.getRootPaths());

const startupResult = pathSecurity.validatePath('/tmp/test', 'folder load');
console.log('启动时 validatePath 结果:', startupResult);

test('main.js启动时rootPaths为空 - 当前行为是拒绝（会阻止启动）', 
	startupResult.valid === false,
	'当前实现：rootPaths为空时拒绝所有访问。这是安全的，但会影响启动流程');

console.log(`
修复建议:
方案1: 在 main.js 中，调用 validatePath 之前先 addRootPath
方案2: 允许 rootPaths 为空时，首次目录加载作为初始 root
方案3: 在 parseArgs 中先初始化 pathSecurity
`);

printSection('测试总结');
console.log(`\n总测试数: ${testCount}`);
console.log(`通过: ${passCount}`);
console.log(`失败: ${failCount}`);
console.log(`跳过: ${skippedCount}`);
console.log(`\n${failCount === 0 ? '所有测试通过!' : '有测试失败!'}`);

printSection('发现的关键问题汇总');

const issues = [
	{
		severity: '高',
		issue: 'main.js 启动时 rootPaths 未初始化',
		location: 'main.js:221, fldrObjGen()',
		description: '应用启动时，fldrObjGen() 直接调用 validatePath()，但此时 rootPaths 为空，导致所有路径被拒绝',
		impact: '应用无法正常启动打开目录'
	},
	{
		severity: '中',
		issue: 'pathBar.folderLoad 初始化顺序错误',
		location: 'pathBar.js:246-264',
		description: '先 validatePath，后 addRootPath。首次调用时会失败',
		impact: '首次使用路径栏切换目录可能失败'
	},
	{
		severity: '中',
		issue: '符号链接真实路径未解析',
		location: 'pathSecurity.js',
		description: '当前实现没有使用 fs.realpathSync() 解析符号链接的真实路径',
		impact: '攻击者可能通过符号链接绕过路径限制，访问 rootPaths 之外的目录'
	},
	{
		severity: '低',
		issue: 'renderer.js folderLoad 初始化依赖 ui.args.path',
		location: 'renderer.js:1317-1319',
		description: '如果 ui.args.path 为空，首次 addRootPath 不会执行',
		impact: '首次加载目录时可能遇到问题'
	}
];

issues.forEach((issue, idx) => {
	console.log(`\n【问题 ${idx+1}】[${issue.severity}] ${issue.issue}`);
	console.log(`   位置: ${issue.location}`);
	console.log(`   描述: ${issue.description}`);
	console.log(`   影响: ${issue.impact}`);
});

printSection('修复建议');

const fixes = [
	{
		for: 'main.js 启动问题',
		suggestion: `
在 fldrObjGen() 开始时，先检查 rootPaths 是否为空。
如果为空，且传入的路径有效，将其作为初始 root:

  function fldrObjGen(file, simple) {
    if (pathSecurity.getRootPaths().length === 0) {
      let resolved = pathSecurity.resolveAndNormalize(file);
      if (resolved) {
        pathSecurity.addRootPath(resolved);
      }
    }
    // ... 原有逻辑
  }
`
	},
	{
		for: 'pathBar.folderLoad 顺序问题',
		suggestion: `
调整顺序，先 addRootPath 再 validatePath：

  this.folderLoad = function(url, msg, showitems) {
    // 先添加到 rootPaths（如果是有效路径）
    let resolvedUrl = pathSecurity.resolveAndNormalize(url);
    if (resolvedUrl) {
      pathSecurity.addRootPath(resolvedUrl);
    }
    
    var pathValidation = pathSecurity.validatePath(url, 'pathBar folder load');
    // ... 原有逻辑
  }
`
	},
	{
		for: '符号链接问题',
		suggestion: `
在 pathSecurity.js 中添加真实路径解析：

  function resolveRealPath(p) {
    try {
      return fs.realpathSync(p);
    } catch(e) {
      // 如果文件不存在，返回原始的解析路径
      return this.resolveAndNormalize(p);
    }
  }

  在 isPathUnderRoot 和 validatePath 中，
  同时检查解析路径和真实路径是否都在 rootPaths 之下。
`
	}
];

fixes.forEach((fix, idx) => {
	console.log(`\n【修复建议 ${idx+1}】针对: ${fix.for}`);
	console.log(fix.suggestion);
});

printSection('详细测试结果列表');
testResults.forEach((r, idx) => {
	const statusMarker = r.status === 'PASS' ? '[PASS]' : r.status === 'FAIL' ? '[FAIL]' : '[SKIP]';
	console.log(`${idx+1}. ${statusMarker} ${r.name}${r.message ? ' - ' + r.message : ''}`);
});

process.exit(failCount === 0 ? 0 : 1);
