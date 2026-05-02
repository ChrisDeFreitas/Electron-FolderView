
const pathSecurity = require('../lib/pathSecurity.js');
const path = require('path');

let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name, condition, message) {
	testCount++;
	if (condition) {
		passCount++;
		console.log(`  [PASS] ${name}`);
	} else {
		failCount++;
		console.log(`  [FAIL] ${name}: ${message}`);
	}
}

function printSection(title) {
	console.log(`\n========================================`);
	console.log(`${title}`);
	console.log(`========================================`);
}

printSection('测试 1: resolveAndNormalize 函数');

console.log('\n--- 测试路径规范化 ---');
let normalized1 = pathSecurity.resolveAndNormalize('/home/user/../user2');
console.log(`  输入: /home/user/../user2`);
console.log(`  输出: ${normalized1}`);
test('resolveAndNormalize 处理 .. 路径', 
	normalized1.includes('/home/user2'),
	`期望包含 /home/user2，实际为 ${normalized1}`);

let normalized2 = pathSecurity.resolveAndNormalize('C:\\Users\\test\\..\\test2');
console.log(`  输入: C:\\Users\\test\\..\\test2`);
console.log(`  输出: ${normalized2}`);

let normalized3 = pathSecurity.resolveAndNormalize('file:///home/user/docs');
console.log(`  输入: file:///home/user/docs`);
console.log(`  输出: ${normalized3}`);
test('resolveAndNormalize 处理 file:// 协议', 
	normalized3.includes('/home/user/docs'),
	`期望包含 /home/user/docs，实际为 ${normalized3}`);

printSection('测试 2: isPathUnderRoot 函数');

console.log('\n--- 测试正常路径 ---');
test('正常子路径应该被允许', 
	pathSecurity.isPathUnderRoot('/home/user/docs', '/home/user'),
	'/home/user/docs 应该在 /home/user 之下');

test('相同路径应该被允许', 
	pathSecurity.isPathUnderRoot('/home/user', '/home/user'),
	'/home/user 应该等于 /home/user');

console.log('\n--- 测试路径穿越 ---');
test('路径穿越到父目录应该被拒绝', 
	!pathSecurity.isPathUnderRoot('/home', '/home/user'),
	'/home 不应该在 /home/user 之下');

test('路径穿越到其他目录应该被拒绝', 
	!pathSecurity.isPathUnderRoot('/home/other', '/home/user'),
	'/home/other 不应该在 /home/user 之下');

console.log('\n--- 测试同名前缀目录问题 ---');
test('/home/user/data-old 不应该在 /home/user/data 之下', 
	!pathSecurity.isPathUnderRoot('/home/user/data-old', '/home/user/data'),
	'同名前缀目录应该被正确拒绝');

test('/home/user/data/old 应该在 /home/user/data 之下', 
	pathSecurity.isPathUnderRoot('/home/user/data/old', '/home/user/data'),
	'真正的子目录应该被允许');

console.log('\n--- 测试 Windows 风格路径 ---');
test('Windows 风格子路径应该被允许', 
	pathSecurity.isPathUnderRoot('C:\\Users\\test\\docs', 'C:\\Users\\test'),
	'C:\\Users\\test\\docs 应该在 C:\\Users\\test 之下');

test('Windows 同名前缀应该被拒绝', 
	!pathSecurity.isPathUnderRoot('C:\\Users\\test-old', 'C:\\Users\\test'),
	'C:\\Users\\test-old 不应该在 C:\\Users\\test 之下');

printSection('测试 3: isPathUnderAnyRoot 函数 - rootPaths 为空的情况');

pathSecurity.init();
test('rootPaths 为空时应该拒绝访问（安全修复）', 
	!pathSecurity.isPathUnderAnyRoot('/any/path'),
	'rootPaths 为空时应该拒绝所有路径');

printSection('测试 4: validatePath 函数');

pathSecurity.init();
pathSecurity.setRootPaths(['/home/user', '/tmp']);

console.log('\n--- 测试正常路径 ---');
let result1 = pathSecurity.validatePath('/home/user/docs', 'test');
test('正常路径验证应该通过', 
	result1.valid === true,
	`期望 valid=true，实际 valid=${result1.valid}, error=${result1.error}`);

console.log('\n--- 测试路径穿越 ---');
let result2 = pathSecurity.validatePath('/home/user/../other', 'test');
test('包含 .. 的路径应该被拒绝', 
	result2.valid === false,
	`期望 valid=false，实际 valid=${result2.valid}`);

let result3 = pathSecurity.validatePath('/etc/passwd', 'test');
test('根路径外的路径应该被拒绝', 
	result3.valid === false,
	`期望 valid=false，实际 valid=${result3.valid}, error=${result3.error}`);

console.log('\n--- 测试同名前缀目录 ---');
pathSecurity.init();
pathSecurity.setRootPaths(['/home/user/data']);

let result4 = pathSecurity.validatePath('/home/user/data-old', 'test');
test('同名前缀目录应该被拒绝', 
	result4.valid === false,
	`期望 valid=false，实际 valid=${result4.valid}, error=${result4.error}`);

let result5 = pathSecurity.validatePath('/home/user/data/subdir', 'test');
test('真正的子目录应该被允许', 
	result5.valid === true,
	`期望 valid=true，实际 valid=${result5.valid}, error=${result5.error}`);

console.log('\n--- 测试 Windows 风格路径 ---');
pathSecurity.init();
pathSecurity.setRootPaths(['C:\\Users\\test']);

let result6 = pathSecurity.validatePath('C:\\Users\\test\\docs', 'test');
test('Windows 风格子路径应该被允许', 
	result6.valid === true,
	`期望 valid=true，实际 valid=${result6.valid}, error=${result6.error}`);

let result7 = pathSecurity.validatePath('C:\\Users\\test-old', 'test');
test('Windows 同名前缀应该被拒绝', 
	result7.valid === false,
	`期望 valid=false，实际 valid=${result7.valid}, error=${result7.error}`);

console.log('\n--- 测试 rootPaths 为空时 ---');
pathSecurity.init();

let result8 = pathSecurity.validatePath('/any/path', 'test');
test('rootPaths 为空时应该拒绝所有路径', 
	result8.valid === false,
	`期望 valid=false，实际 valid=${result8.valid}, error=${result8.error}`);

printSection('测试 5: validateChildPath 函数');

pathSecurity.init();
pathSecurity.setRootPaths(['/home/user']);

console.log('\n--- 测试正常子目录名 ---');
let childResult1 = pathSecurity.validateChildPath('/home/user', 'docs', 'test');
test('正常子目录名应该被允许', 
	childResult1.valid === true,
	`期望 valid=true，实际 valid=${childResult1.valid}, error=${childResult1.error}`);

console.log('\n--- 测试危险的子目录名 ---');
let childResult2 = pathSecurity.validateChildPath('/home/user', '..', 'test');
test('子目录名 .. 应该被拒绝', 
	childResult2.valid === false,
	`期望 valid=false，实际 valid=${childResult2.valid}, error=${childResult2.error}`);

let childResult3 = pathSecurity.validateChildPath('/home/user', '.', 'test');
test('子目录名 . 应该被拒绝', 
	childResult3.valid === false,
	`期望 valid=false，实际 valid=${childResult3.valid}, error=${childResult3.error}`);

let childResult4 = pathSecurity.validateChildPath('/home/user', '../etc', 'test');
test('子目录名包含 .. 应该被拒绝', 
	childResult4.valid === false,
	`期望 valid=false，实际 valid=${childResult4.valid}, error=${childResult4.error}`);

let childResult5 = pathSecurity.validateChildPath('/home/user', 'sub/dir', 'test');
test('子目录名包含路径分隔符应该被拒绝', 
	childResult5.valid === false,
	`期望 valid=false，实际 valid=${childResult5.valid}, error=${childResult5.error}`);

printSection('测试总结');
console.log(`\n总测试数: ${testCount}`);
console.log(`通过: ${passCount}`);
console.log(`失败: ${failCount}`);
console.log(`\n${failCount === 0 ? '所有测试通过!' : '有测试失败!'}`);

process.exit(failCount === 0 ? 0 : 1);
