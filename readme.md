# Electron FolderView

<img src="https://github.com/ChrisDeFreitas/Electron-FolderView/blob/master/scrnshots/scrn04 - fullscreen.jpg" alt="Screen shot with layout menu" border=0 width=300>

I originally created this as a nodejs app to view local images.  I was frustrated with the complexity of the free and paid image viewing apps I had.  With the many wonderful image handling libraries available for the web, I thought it would be simple enough to throw something together in node...then I found the awesomeness of Electron!

This app is intended for my personal use--not to make a million dollars dominating a market niche.  It allows me to quickly add functionality to handle various file management tasks.  The immediate one was to be able to view images quickly without clunky widgets or ui chrome getting in the way.  With the Electron functionality I was able to create a general purpose directory browser for Windows.

This is a work in progress.  Feel free to use and modify as you wish.  It should be pretty easy to dig into the code and tweak.


## Functions
- display folder contents in customizeable grid
- double click to launch file with OS's default app
- play videos and music from grid (using Chrome's built-in tools)
- click image for slideshow
- main menu with custom functions
- right click for extra functions
- some functions: auto-scroll, copy path/src, delete, filter by file ext, image scale


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
  * electron version (requires: "npm install electron -g") = electron main.js
  * node version (runs in default browser, HTML only, no custom menu functions) = node main.js

4. Build FolderView.exe: npm run build
	* the app is built with Electron Packager so it can be used as a regular Windows program.
	* Electron Packager must be install globally:  npm install electron-packager -g
  * npm executes "build..." scripts from from package.json
  * the scripts build, then zip, the Win64 version in in the ./dist/ folder.
  * you can modify this to use for your own purposes, see scripts/electronPackager.bat and scripts/zip.bat

5. commandline switches
  * handled by "argv-to-object"
  * documented in main.js:
```Javascript
var argmap =
{
			devtools:{	keypath:'devtools', 	type:'boolean', default:false },
			fontsize:{	keypath:'fontsize', 	type:'string',  default:'12px',	notes:'set the default font size for the item captions.' },
			fullscreen:{keypath:'fullscreen', type:'boolean', default:false },
			layout:{		keypath:'layout', 		type:'string',	default:'wall',	range:['cols','rows','vert','wall'], notes:'isotope translations: cols=masonry, width=300px; rows=fitRows, height=300px; vert=vertical, width=300px; wall=packery, width dependent on image size.'},
			path:{			keypath:'path', 			type:'string',	default:'',		notes:'no trailing backslash allowed (for argv-to-object).' },
			scale:{			keypath:'scale',			type:'number',  default:1,		range:{greaterThan:0}, notes:"scale size of grid items." },
			shuffle:{		keypath:'shuffle',		type:'boolean',	default:false, notes:'randomize display of items.'}
	}
```

## ToDo
- add special handling for audio files
- add recent folders list
- add scale dialog to simplify scaling grid images and zooming app


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
