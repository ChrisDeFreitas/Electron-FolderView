# Electron FolderView

<img src="https://github.com/ChrisDeFreitas/Electron-FolderView/blob/master/scrnshots/scrn06 - pathBar.jpg" alt="Screen shot with layout menu" border=0 width=300>

I originally created this as a nodejs app to view local images.  I was frustrated with the free and paid image apps I had--I needed something to simply display images in a folder.  With the many wonderful image handling libraries available for the web, I thought it would be simple enough to throw something together in node...then I found the awesomeness of Electron!

This app allows me to quickly add functionality to handle various file management tasks.  The immediate one was to be able to view media files quickly without clunky widgets or ui chrome getting in the way.  With Electron I was able to create a general purpose directory browser with custom functionality using web technology in a Windows executable!

This is a work in progress.  Feel free to use and modify as you wish.


## Features
- main purpose is to view images on local disk
- display folder items with different grid layouts: cols, rows, vert, wall
- click image file to view slideshow; scale slideshow images with mouse wheelor keyboard
- play media files using Chrome's built-in tools
- open file with Windows' default application
- Open With...: run any application on disk with selected file as argument
- SFTP browse/download/delete remote system; minimize by clicking dlg title bar
- bulk copy/delete/move operations
- export lists of file in various file formats
- keyboard commands for image handling match chrisd.gq/slideshow
- create zero length files; when a folder is selected this function will delete all files in sub-folders but sub-folders will remain


## App Notes
1. Install:
    - Windows only; I use it on Win81 and Win7
    - requires node.js and electron  
    - after downloading to a local folder:  
        1. \> npm install electron -g  
        2. \> npm install  
        3. \> electron main.js  
        4. if you want to generate an executable:  
            \> npm install electron-packager -g  

2. Test:  
 		\> npm run test
    * executes scripts/testFolderView.bat
    * these are specific tests based on my folder structure; you will need to customize

3. Execute main.js:  
    - electron version (requires: "npm install electron -g")  
        \> electron main.js  
    - node version (runs in default browser, HTML only, no menu functions)   
        \> node main.js  

4. Build FolderView.exe:  
    \> npm run build
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
	 s: toggle grid scrolling  
	 Backspace: load parent folder  
	 ESC: close gallery, return to grid  
	 F2: toggle System Info dialog  
	 F3: open Windows Explorer to current folder or selected item
	 F4: toggle Export List dialog  
	 F5: reload folder items
	 F6: toggle Change Folder dialog  
	 F7: toggle Bulk Copy/Delete/Move dialog  
	 F8: Create new folder  
	 F11: toggle fullscreen  
	 F12: toggle devtools  
	 Home/End, Up/Down, PageUp/PageDown: manually scroll grid  
	 Left/Right: manually scroll gallery  

6. commandline switches
    * handled by "argv-to-object"
    * if --path option not supplied app looks to commandline arguments for path, for example:  
				\> node main.js c:\users\pictures  
				\> electron main.js c:\users\pictures	--layout=cols  
				\> FolderView.exe c:\users\pictures	--fullscreen  
    * commandline arguments documented in main.js:  
```Javascript
var argmap =
{
	descending:{	keypath:'descending',	type:'boolean', default:false, notes:'sort items in descending order' },
	devtools:{keypath:'devtools',	type:'boolean', default:false },
	folders:{	keypath:'folders',  type:'string',  default:'default', range:['default','first','hidden','last'] },
	fontsize:{ keypath:'fontsize', 	type:'string',  default:'12px',	notes:'set the default font size for the document.' },
	fullscreen:{ keypath:'fullscreen', type:'boolean', default:false },
	height:{	keypath:'height', type:'number', default:0, notes:'default window height; 0 = max height' },
	layout:{	keypath:'layout', type:'string',	default:'wall',	range:['cols','rows','vert','wall']
				, notes:`cols:"default to item.width=(window.innerWidth/3).",rows:"item.height=300px",vert:"single col",wall:"wallboard of images"` },
	order:{ keypath:'order', type:'string',	default:'name', range:['date','name','size','type'], notes:'Sort order of items' },
	path:{ keypath:'path', type:'string',	default:'',			notes:'no trailing backslash allowed (for argv-to-object).' },
	scale:{	keypath:'scale', type:'number',  default:1, range:{greaterThan:0}, notes:"scale size of grid items." },
	scroll:{ keypath:'scroll', type:'boolean', default:false,	notes:"turn on/off scrolling grid whenever items loaded." },
	sftpDownloadMax:{	keypath:'sftpDownloadMax', type:'number', default:2,	notes:"Set max number of files to download at once." },
	shuffle:{	keypath:'shuffle', type:'boolean',	default:false,	notes:"shuffle grid items via arrShuffle()" },
	width:{	keypath:'width', type:'number', default:0, notes:'default window width; 0 = max width' }
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
- complete testing new SFTP auto connect/download functions
- complete testing Bulk Ops dialog
- display image name/dimensions/kb during slideshow as caption  
- save/restore SFTP settings
- sftpDownloadMax option only limits downloads of top level files and folders. So if a folder contains many files they won't be affected by sftpDownloadMax.
- update keyboardshortcuts.txt


## Changes
Oct 30/17
- no errors in bulkOpsDlg since last update
- add to bulkOps: create zero length files (and empty folders of all files)
- add to dlgSftp: auto connect and auto download functions
- add to top Order menu:
	"File Date, Descending"
	"File Name, Ascending"
	"File Size, Descending"

Oct 6/17
- SFTP testing done; no errors since last git update in July.
- added Bulk Copy/Delete/Move dialog, F7 shortcut key
- added New Folder function, F8 shortcut key
- added folder selected in Move operations to recent folder list
- added height argument, if height=== 0 then max height
- added width argument, if width === 0 then max width
- updates to rename dlg
- updates to pathBar
- added text functions context menu for input, textarea
- top menu items in alpha order
- move item function: remove item from items array
- included changes from https://github.com/tyzbit/Electron-FolderView
  1. added .webm video file type
  2. included keyboardshortcuts.txt (requires more updates)
- general tweaks and fixes:  
  1. comment out height/width px of item names; text is no longer vertically truncated with large fonts  
	2. comment out galleryScale() in renderer.js; was generating error
	3. exclude tmp and scrnshots folders from zip files (npm run build:zip)
	4. store paths internally using '/' (not Windows '\\') to maintain compatibility with Linux file handling
	5. add Elusive Icons to replace usage of HTML entities

Jul 20/17
- context menu/Tools/Delete now deletes the item from the internal list so sort functions no longer display them from browser cache
- items tooltips now include file size in GB/MB/KB/bytes as appropriate
- changed context menu/Delete to not use shell function due to limitations on drives with no RecycleBin
- added context menu/"Open With...".  Allows files to be opened with any app in file system.  Apps selected are stored in tmp/execApps.json and displayed on submenu.
- added SFTP dialog with remote browse/download/delete functions
- updated node.js and Electron versions to latest

Apr 27/17
- added F5 accelerator to menu App/Reload
- added a separator and Reload to top menu

Apr 15/17
- configured Export List's save dialog
- added path supplied on commandline to recent folders
- removed Filter from context menu
- fixed bugs in Filter menu handling
- added menu App/Folder Up, Backspace key  
- created menus Up and Change to quickly access the these functions
- set folders to be displayed first by default
- fixed bug in pathBar when path has no trailing slash
- added package.json version number to menu App/"System Info",F2  
- added path export to Export List  
- recent list now stores last 15 folders (was 10)
- changed app version to date format (ui.updateDate)

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
- http://elusiveicons.com/  
- https://github.com/electron-userland/electron-packager  
- https://nodejs.org/  
- https://www.npmjs.com/package/argv-to-object  
- https://www.npmjs.com/package/image-size  
- https://github.com/npm/ini   
- https://github.com/tyzbit/Electron-FolderView  
- http://isotope.metafizzy.co  
- http://photoswipe.com/  
- http://www.iconarchive.com/show/series-folder-icons-by-softskin.html  
- https://github.com/mscdex/ssh2  


Good Luck!

Chris
chrisd@europa.com
