# Electron FolderView

<img src="https://github.com/ChrisDeFreitas/Electron-FolderView/blob/master/scrnshots/scrn01 - wall layout - fullscreen.jpg" alt="Screen shot with layout menu" border=0 width=300>

I originally created this as a nodejs app to view local images.  I was frustrated with the free and paid image apps I had--I needed something to simply display images in a folder.  With the many wonderful image handling libraries available for the web, I thought it would be simple enough to throw something together in node...then I found the awesomeness of Electron!

This app allows me to quickly add functionality to handle various file management tasks.  The immediate one was to be able to view media files quickly without clunky widgets or ui chrome getting in the way.  With Electron I was able to create a general purpose directory browser with custom functionality using web technology in a Windows executable!

This is a work in progress.  Feel free to use and modify as you wish.


## Features
- main purpose is to view images on local disk
- display folder items with different grid layouts: cols, rows, vert, wall
- play media files using Chrome's built-in tools
- open file with Windows' default app
- features:  clipboard, delete, filter, hide, keyboard shortcuts, move, open, rename +extra functions, scale, scroll, shuffle, slideshow
- keyboard commands match chrisd.tk/slideshow

## App Notes
1. Install:
	* Windows only -- I use it on Win81 and Win7
  * requires node.js and electron
  * after downloading to a local folder:  
			1. npm install electron -g  
			2. npm install  
			3. electron main.js  
			4. if you want to generate an executable:  
				npm install electron-packager -g

2. Test: npm run test
  * executes scripts/testFolderView.bat
  * these are specific tests based on my folder structure; you will need to customize

3. Execute main.js:
  * electron version (requires: "npm install electron -g") > electron main.js
  * node version (runs in default browser, HTML only, no custom menu functions) > node main.js

4. Build FolderView.exe: npm run build
	* the app is built with Electron Packager so it can be used as a regular Windows program.
	* Electron Packager must be install globally:  npm install electron-packager -g
  * npm executes "build..." scripts from from package.json
  * the scripts build, then zip, the Win64 version in in the ./dist/ folder.
  * you can modify this to use for your own purposes, see scripts/electronPackager.bat and scripts/zip.bat

5. Keyboard Shortcuts  
	 alt+up/down: scale grid items  
	 alt+c: grid cols layout
	 alt+r: grid rows layout  
	 alt+v: grid vert layout  
	 alt+w: grid wall layout  
	 ctrl+up/down: scale grid/gallery images  
	 ctrl+left/right: toggle gallery slideshow forward/reverse  
	 esc: close gallery, return to grid  
	 left/right: manually scroll gallery  
	 s: toggle grid scrolling  
	 up/dn, pgup/pgdn, home/end: manually scroll grid  

6. commandline switches
  * handled by "argv-to-object"
	* if --path option not supplied app looks to argument for path, for example:  
				- node main.js c:\users\pictures  
				- electron main.js c:\users\pictures	--layout=cols   
				- FolderView.exe c:\users\pictures	--fullscreen  
  * commandline arguments documented in main.js:
```Javascript
var argmap =
{
	devtools:{		keypath:'devtools', 	type:'boolean', default:false },
	find:{				keypath:'find',				type:'string',  default:'',	notes:"search flickr for images with `find`.(not implemented in FileBrowser, see chrisd.tk/slideshow?find=Altay)" },
	fontsize:{		keypath:'fontsize', 	type:'string',  default:'12px',	notes:'set the default font size for the document.' },
	fullscreen:{	keypath:'fullscreen', type:'boolean', default:false },
	layout:{			keypath:'layout', 		type:'string',	default:'wall',	range:['cols','rows','vert','wall']
				, notes:`cols:"default to item.width=(window.innerWidth/3).",rows:"item.height=300px",vert:"single col",wall:"wallboard of images"` },
	path:{				keypath:'path', 			type:'string',	default:'',			notes:'no trailing backslash allowed (for argv-to-object).' },
	scale:{				keypath:'scale',			type:'number',  default:1, range:{greaterThan:0}, notes:"scale size of grid items." },
	scroll:{			keypath:'scroll',			type:'boolean', default:false,	notes:"turn on/off scrolling grid whenever items loaded." },
	shuffle:{			keypath:'shuffle',		type:'boolean',	default:false,	notes:"shuffle grid items via arrShuffle()" }
	}
```


## ToDo
- add recent folders list


## Thanks To
- http://electron.atom.io/
- https://github.com/electron-userland/electron-packager
- https://nodejs.org/
- https://www.npmjs.com/package/argv-to-object
- https://www.npmjs.com/package/image-size
- http://isotope.metafizzy.co
- http://photoswipe.com/
- http://www.iconarchive.com/show/series-folder-icons-by-softskin.html

Good Luck!

Chris  
chrisd@europa.com
