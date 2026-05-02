"use strict";

const path = require('path');
const fs = require('fs');

var pathSecurity = {
	rootPaths: [],
	
	init: function() {
		this.rootPaths = [];
	},
	
	addRootPath: function(rootPath) {
		if (!rootPath) return false;
		
		rootPath = this.normalizePath(rootPath);
		
		if (!rootPath) return false;
		
		if (this.rootPaths.indexOf(rootPath) === -1) {
			this.rootPaths.push(rootPath);
		}
		return true;
	},
	
	setRootPaths: function(paths) {
		this.rootPaths = [];
		if (Array.isArray(paths)) {
			for (let p of paths) {
				this.addRootPath(p);
			}
		}
	},
	
	getRootPaths: function() {
		return this.rootPaths.slice();
	},
	
	normalizePath: function(p) {
		if (!p) return '';
		
		p = p.trim();
		
		p = p.replace(/\\/g, '/');
		
		if (p.length >= 8 && p.substring(0, 8) === 'file:///') {
			p = p.substring(8);
		}
		
		if (p === '') return '';
		
		try {
			p = path.normalize(p);
		} catch(e) {
			console.error('pathSecurity.normalizePath() error:', e);
			return '';
		}
		
		p = p.replace(/\\/g, '/');
		
		if (p.length > 0 && p[p.length - 1] !== '/') {
			try {
				let stat = null;
				try {
					stat = fs.lstatSync(p);
				} catch(e) {}
				
				if (stat && stat.isDirectory()) {
					p += '/';
				}
			} catch(e) {}
		}
		
		return p;
	},
	
	resolveAndNormalize: function(p) {
		if (!p) return '';
		
		p = p.trim();
		
		p = p.replace(/\\/g, '/');
		
		if (p.length >= 8 && p.substring(0, 8) === 'file:///') {
			p = p.substring(8);
		}
		
		if (p === '') return '';
		
		try {
			p = path.resolve(p);
		} catch(e) {
			console.error('pathSecurity.resolveAndNormalize() error:', e);
			return '';
		}
		
		p = p.replace(/\\/g, '/');
		
		return p;
	},
	
	containsPathTraversal: function(p) {
		if (!p) return false;
		
		p = this.normalizePath(p);
		if (!p) return false;
		
		if (p.indexOf('../') >= 0 || p.indexOf('..\\') >= 0) {
			return true;
		}
		
		if (p.includes('/./') || p.includes('\\.\\')) {
			return true;
		}
		
		if (p.includes('~') || p.includes('$')) {
			return true;
		}
		
		return false;
	},
	
	isPathUnderRoot: function(targetPath, rootPath) {
		if (!targetPath || !rootPath) return false;
		
		let resolvedTarget = this.resolveAndNormalize(targetPath);
		let resolvedRoot = this.resolveAndNormalize(rootPath);
		
		if (!resolvedTarget || !resolvedRoot) return false;
		
		if (resolvedTarget === resolvedRoot) return true;
		
		let rootWithSep = resolvedRoot;
		if (rootWithSep[rootWithSep.length - 1] !== '/') {
			rootWithSep += '/';
		}
		
		return resolvedTarget.startsWith(rootWithSep);
	},
	
	isPathUnderAnyRoot: function(targetPath) {
		if (!targetPath) return false;
		
		if (this.rootPaths.length === 0) {
			console.warn('pathSecurity.isPathUnderAnyRoot() warning: rootPaths is empty. Access denied for security.');
			return false;
		}
		
		for (let root of this.rootPaths) {
			if (this.isPathUnderRoot(targetPath, root)) {
				return true;
			}
		}
		return false;
	},
	
	validatePath: function(targetPath, operation = 'operation') {
		let result = {
			valid: false,
			error: null,
			path: null
		};
		
		if (!targetPath) {
			result.error = `Path is required for ${operation}.`;
			return result;
		}
		
		let resolvedPath = this.resolveAndNormalize(targetPath);
		if (!resolvedPath) {
			result.error = `Invalid path format for ${operation}.`;
			return result;
		}
		
		result.path = resolvedPath;
		
		if (this.containsPathTraversal(targetPath)) {
			result.error = `Path contains potentially dangerous characters for ${operation}.`;
			return result;
		}
		
		if (!this.isPathUnderAnyRoot(resolvedPath)) {
			result.error = `Access denied for ${operation}. Path is outside allowed directories.`;
			return result;
		}
		
		result.valid = true;
		return result;
	},
	
	validateChildPath: function(parentPath, childName, operation = 'operation') {
		let result = {
			valid: false,
			error: null,
			fullPath: null
		};
		
		if (!parentPath || !childName) {
			result.error = `Parent path and child name are required for ${operation}.`;
			return result;
		}
		
		parentPath = this.resolveAndNormalize(parentPath);
		if (!parentPath) {
			result.error = `Invalid parent path for ${operation}.`;
			return result;
		}
		
		childName = childName.trim();
		
		if (childName === '' || childName === '.' || childName === '..') {
			result.error = `Invalid child name for ${operation}.`;
			return result;
		}
		
		if (childName.includes('/') || childName.includes('\\')) {
			result.error = `Child name cannot contain path separators for ${operation}.`;
			return result;
		}
		
		if (childName.includes('..')) {
			result.error = `Child name contains potentially dangerous characters for ${operation}.`;
			return result;
		}
		
		let fullPath = path.join(parentPath, childName);
		fullPath = this.resolveAndNormalize(fullPath);
		
		if (!this.isPathUnderRoot(fullPath, parentPath)) {
			result.error = `Resulting path is outside parent directory for ${operation}.`;
			return result;
		}
		
		if (!this.isPathUnderAnyRoot(fullPath)) {
			result.error = `Resulting path is outside allowed directories for ${operation}.`;
			return result;
		}
		
		result.fullPath = fullPath;
		result.valid = true;
		return result;
	},
	
	validateMoveOperation: function(sourcePath, destPath, operation = 'move') {
		let result = {
			valid: false,
			error: null
		};
		
		let sourceValidation = this.validatePath(sourcePath, `${operation} source`);
		if (!sourceValidation.valid) {
			result.error = sourceValidation.error;
			return result;
		}
		
		let destValidation = this.validatePath(destPath, `${operation} destination`);
		if (!destValidation.valid) {
			result.error = destValidation.error;
			return result;
		}
		
		result.valid = true;
		return result;
	}
};

module.exports = pathSecurity;
