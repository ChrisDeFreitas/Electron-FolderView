# Electron FolderView

<img src="https://github.com/ChrisDeFreitas/Electron-FolderView/blob/master/scrnshots/scrn06 - pathBar.jpg" alt="Screen shot with layout menu" border=0 width=300>

I originally created this as a nodejs app to view local images.  I was frustrated with the free and paid image apps I had--I needed something to simply display images in a folder.  With the many wonderful image handling libraries available for the web, I thought it would be simple enough to throw something together in node...then I found the awesomeness of Electron!

This app allows me to quickly add functionality to handle various file management tasks.  The immediate one was to be able to view media files quickly without clunky widgets or ui chrome getting in the way.  With Electron I was able to create a general purpose directory browser with custom functionality using web technology in a Windows executable!

This is a work in progress.  Feel free to use and modify as you wish.


## Features
- main purpose is to view images on local disk
- display folder items with different grid layouts: cols, rows, vert, wall
- play media files using Chrome's built-in tools
- open file with Windows' default application  
- features:  clipboard, custom default folders, delete, export file list, filter, hide, keyboard shortcuts, move, open, rename +extra functions, order, open Windows Explorer, recent folders, scale, scroll, shuffle, slideshow
- keyboard commands for image handling match chrisd.gq/slideshow

## App Notes
1. Install:
  - Windows only; I use it on Win81 and Win7
  - requires node.js and electron  
  - after downloading to a local folder:  
			1. npm install electron -g  
			2. npm install  
			3. electron main.js  
			4. if you want to generate an executable:  
				npm install electron-packager -g  

2. Test: npm run test
  * executes scripts/testFolderView.bat
  * these are specific tests based on my folder structure; you will need to customize

3. Execute main.js:
  - electron version (requires: "npm install electron -g")  
    > electron main.js
  - node version (runs in default browser, HTML only, no menu functions)  
    > node main.js

4. Build FolderView.exe: npm run build
  * the app is built with Electron Packager so it can be used as a regular Windows program.
  * Electron Packager must be install globally:  npm install electron-packager -g
  * npm executes "build..." scripts from package.json: npm run build  
  * the scripts build, then zip, the Win64 version in the ./dist/ folder.  
  * you can modify this to use for your own purposes, see scripts/electronPackager.bat and scripts/zip.bat

5. Keyboard Shortcuts  
	 alt+up/down: scale grid items  
	 alt+c: grid cols layout  
	 alt+r: grid rows layout  
	 alt+v: grid vert layout  
	 alt+w: grid wall layout  
	 alt+shift+d:	toggle descending sort order on or off  
	 alt+shift+f: toggle folder display - default, first, hidden, last  
	 alt+shift+o: toggle sort order - date, name, size, type  
	 alt+shift+s: shuffle grid items
	 ctrl+up/down: scale grid/gallery images  
	 ctrl+left/right: toggle gallery slideshow forward/reverse  
	 esc: close gallery, return to grid  
	 left/right: manually scroll gallery  
	 s: toggle grid scrolling  
	 up/dn, pgup/pgdn, home/end: manually scroll grid  
	 F2: toggle System Info dialog  
	 F3: open Windows Explorer to current folder or default file  
	 F4: toggle Export List dialog  
	 F6: toggle Change Folder dialog  
	 F11: toggle fullscreen  
	 F12: toggle devtools  

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
	descending:{	keypath:'descending',	type:'boolean', default:false, notes:'sort items in descending order' },
	devtools:{keypath:'devtools',	type:'boolean', default:false },
	find:{ keypath:'find', type:'string',  default:'',	notes:"search flickr for images with `find`.(not implemented in FileBrowser, see chrisd.gq/slideshow?find=Altay)" },
	folders:{	keypath:'folders',  type:'string',  default:'default', range:['default','first','hidden','last'] },
	fontsize:{ keypath:'fontsize', 	type:'string',  default:'12px',	notes:'set the default font size for the document.' },
	fullscreen:{ keypath:'fullscreen', type:'boolean', default:false },
	layout:{	keypath:'layout', type:'string',	default:'wall',	range:['cols','rows','vert','wall']
				, notes:`cols:"default to item.width=(window.innerWidth/3).",rows:"item.height=300px",vert:"single col",wall:"wallboard of images"` },
	order:{ keypath:'order', type:'string',	default:'name', range:['date','name','size','type'], notes:'Sort order of items' },
	path:{ keypath:'path', type:'string',	default:'',			notes:'no trailing backslash allowed (for argv-to-object).' },
	scale:{	keypath:'scale', type:'number',  default:1, range:{greaterThan:0}, notes:"scale size of grid items." },
	scroll:{ keypath:'scroll', type:'boolean', default:false,	notes:"turn on/off scrolling grid whenever items loaded." },
	shuffle:{	keypath:'shuffle', type:'boolean',	default:false,	notes:"shuffle grid items via arrShuffle()" }
	}
```

## Sample customLibraries.ini
```
[paths]
c:/users/chris/code/
c:/electron/
c:/users/chris/temp/
c:/website/
```


## ToDo
- display image name/dimensions/kb during slideshow as caption  


## Changes
Apr 15/17
- added options to Export List's save dialog
- added path supplied on commandline to recent folders
- removed Filter from context menu
- fixed bugs in Filter menu handling
- added menu App/Folder Up, Backspace


Apr 14/17
- manually changed version to 0.6.0
- fixed bug in clipboard functions
- added menu App/"Export List" F4, to save file properties to file or clipboard  
- changed shortcut for "Change Folder" from F3 to F6  
- added menu App/"Windows Explorer" F3
- modified folder double-click action to load new folder items (not open new app)

Apr 4/17:
- added this section  
- added pathBar.js to select files and folders.  This is a custom control I created because I didn't like the default dialog box.  I have tried to find all the bugs but...  
- the pathBar's library paths are loaded from an .ini file: customLibraries.ini
- fixed issues with rename dialog box  
- fixed "Change Folder" and Reload functions  
- changed shortcut for "Change Folder" to F3  (changed to F6 April 14/17)
- added menu item: App/"System Info" , F2 to toggle  
- changed double-clicking folder icon to open new folderView.exe instance.  This will probably change in the future.  
- updated dev to electron 1.6.2  
- added and updated screen shots


## Thanks To
- http://electron.atom.io/
- https://github.com/electron-userland/electron-packager
- https://nodejs.org/
- https://www.npmjs.com/package/argv-to-object
- https://www.npmjs.com/package/image-size
- https://github.com/npm/ini  
- http://isotope.metafizzy.co
- http://photoswipe.com/
- http://www.iconarchive.com/show/series-folder-icons-by-softskin.html


Good Luck!

Chris
chrisd@europa.com
