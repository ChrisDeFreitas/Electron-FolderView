# Electron FolderView

<img src="https://github.com/ChrisDeFreitas/Electron-FolderView/blob/master/scrnshots/scrn06 - pathBar.jpg" alt="Screen shot with layout menu" border=0 width=300>

I originally created this as a nodejs app to view local images.  I was frustrated with the free and paid image apps I had--I needed something to simply display images in a folder.  With the many wonderful image handling libraries available for the web, I thought it would be simple enough to throw something together in node...then I found the awesomeness of Electron!

This app allows me to quickly add functionality to handle various file management tasks.  The immediate one was to be able to view media files quickly without clunky widgets or ui chrome getting in the way.  With Electron I was able to create a general purpose directory browser with custom functionality using web technology in a Windows executable!

This is a work in progress.  Feel free to use and modify as you wish.


## Features
- main purpose is to view folder items
- item functions: copy, clipboard..., delete, explore, open, move, rename, set image as background, zero
- items displayed in a grid
- grid functions: hide items, filter, folder up, last folder, order, scale, scroll, click an image to start slideshow, double-click item to launch with Windows' default application
- grid layouts: cols, rows, vert, wall
- clicking images starts slideshow
- slideshow functions: copy, delete, fullscreen, move, zoom, auto play, auto play delay
- "Tools/Open With" context menu: run any application on disk with selected file as argument
- SFTP functions: browse, delete, download, minimize by clicking dialog title bar
- create zero length files; when a folder is selected this function will delete all files in sub-folders but sub-folders will remain
- export lists of file in various text file formats
- pathBar dialog: handy dialog for selecting a folder
- rename dialog: handy tools for renaming a file

## App Notes
1. Install:
    - Windows only; I use it on Win81 and Win7
    - requires Node.js be installed on your system (https://nodejs.org/)
    - download to a local folder:
        \> git clone https://github.com/ChrisDeFreitas/Electron-FolderView
        \> cd Electron-FolderView
    - to use with a global installation of Electron:
        \> npm install electron -g
    - install required packages (installs local Electron if not installed globally):
        \> npm install
    - if you want to generate an executable, install Electron Package Manager:
        \> npm install electron-packager -g

2. Test:
    - the test script is not included as it is specific to my sytem
    - create this batch file to execute your tests: scripts/testFolderView.bat
    - then run
 			  \> npm run test

3. Execute main.js:
    - with a local installation of Electron
        \> "node_modules/electron/dist/electron.exe" main.js
    - with a global installation of Electron
        \> electron main.js

4. Build FolderView.exe:
    \> npm run build
    * the app is built with Electron Packager so it can be used as a regular Windows program.
    * Electron Packager must be install globally:  npm install electron-packager -g
    * npm executes "build..." scripts from package.json: npm run build
    * the scripts will build, then zip, the Win64 version in the ./dist/ folder.
    * you can modify this to use for your own purposes, see scripts/electronPackager.bat and scripts/zip.bat
    * the executable is: dist\\FolderView-win32-x64\\FolderView.exe
    * the source and settings are in: dist\\FolderView-win32-x64\\resources\\app

5. Keyboard Shortcuts
		see keyboardshortcuts.txt

6. Commandline switches
    * handled by "argv-to-object"
    * if "--path" option not supplied app looks to commandline arguments for path, for example:
				\> electron main.js c:\users\pictures	--fullscreen=true --layout=cols
				\> FolderView.exe c:\users\pictures	--fullscreen=true --layout=cols
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
	showSlideCaptions:{	keypath:'showSlideCaptions', type:'boolean',	default:true,	notes:"Display slideshow captions" },
	shuffle:{	keypath:'shuffle', type:'boolean',	default:false,	notes:"shuffle grid items via arrShuffle()" },
	width:{	keypath:'width', type:'number', default:0, notes:'default window width; 0 = max width' }
}
```

## Sample tmp/customLibraries.ini
```
[paths]
c:/users/chris/code/
c:/electron/
c:/users/chris/temp/
c:/website/
```

## tmp/settings.ini
At this point, this file only contains default sftp settings. The values are initially empty.
Here is an example:
```
[sftp]
host=192.168.0.111
port=22
user=SshUserName
pw=SshPassword
defaultpath=/home/UserName/FolderWithFilesToDownload

```

## ToDo
- BulkOps dialog: add rename function to work with a list of files
- BulkOps dialog: create async copy operation
- create new dialog: view keyboardshortcuts.txt
- selectList: allow Shift+Click to select a range of items
- SFTP dialog: re-write with async/await
- SFTP dialog: sftpDownloadMax option only limits downloads of top level files and folders. So if a folder contains many files they won't be affected by sftpDownloadMax.


## Changes

May 10/2019

Primarily made it easier to copy/delete/edit/move/rename folder items.  After many years of use its a new direction for the application.
And it seems to be working pretty well.  With the new rename dialog, I've gone rename crazy (perhaps due to years of trauma with Windows Explorer: F2, Home, delete, delete, etc)

- copying folders now works
- removed keyboard shortcuts: c(col mode), r(row mode), s(scroll), v(vert mode), w(wall mode); use Alt+ combintaions
- showSlideCaptions application argument: enabled and documented, default=true; displays captions filename, dimensions, size in slideshow
- fontsize application argument: now defaults to 20px
- "Last Folder" menu: new function opens the second item in the recent folders list, "-" keyboard shortcut
- "New Folder" menu: additonal shortcut key = n
- Exit context menu: removed
- slideshow: now only handles keyboard events with it's event.target.id  (pswpMain)
- slideshow: added item functions to context menu
- slideshow: pressing c/m/delete will operate on the current item
- pathBar dialog: added subtitle
- pathBar dialog: after creating a new folder, items reloaded to display new folder
- Open With context menu: moved to top of context menu
- Open With context menu: applications are now sorted by executable name (instead of path) when execApps.json written
- Open With context menu: execApps.json contents formatted with tab characters for easy editing
- Open With context menu: created ui.calc.execSpawn() to spawn applications without blocking events or causing maxBuffer errors
- Rename dialog: items are no longer automatically renamed by incrementing numeric portion of file name
- Rename dialog: when Reload enabled, item is now selected after being renamed
- Rename dialog: when closing, now closes slideshow
- Rename dialog: no longer using fs.rename() because renaming a folder generates an EBUSY error
- Rename dialog: added functions to select/unselect text
- Rename dialog: added search and replace function
- ui.var.selectList: implemented code to manage a subset of items, items in list have a green border, last item added has red border (a standard selection)
- Filter/Selected All menu (Alt+A/Ctrl+A): if selectList is empty, add all items to selectList, else empty selectList
- Ctrl+Left Click: Toggle assigning to selectList
- Left Click: Empty selectList, execute default click action for item
- Copy context menu: new function to copy items or selectList, keyboard shortcut = "c"
- Copy context menu: created ui.calc.execAsync() to copy asynchronously (prevent large files from slowing UI)
- Move context menu: if item in selectList, will open bulkOps
- Tools/Delete context menu: if item in selectList will open bulkOps
- Delete function: if item in selectList, will open bulkOps
- Delete function: now activated by "Delete" key
- BulkOps dialog: added "Auto Mode" checkbox, disables confirmation and closes dialog after selected operation completes.
- BulkOps dialog: automode is OFF only when opened via "Tools/Bulk Operations" context menu
- BulkOps dialog: tried to make interface easier to use
- BulkOps dialog: many bug fixes
- Tools/"Bulk Operations" context menu: will use selectList if item in list; default to autoMode = false
- keyboardshortcuts.txt: updated

Apr 28/19
- run under Node.js v10 LTS
- upgraded to Electron v3.1.8; could not upgrade Electron to v5.0.0 because the browser's default double-click hanlder is run before the user defined handler
- upgraded to Electron Package Manager v13.1.1
- added mv (https://github.com/andrewrk/node-mv) because fs.rename fails between drives and the file system's move command fails with certain file names
- pathBar.js: clicking header buttons toggles associated list
- pathBar.js: added hoverDelayMs (500ms) to header buttons, this smooths navigation by preventing the lists from popping up immediately when mouse enters a header buttons
- pathBar.js: added highlighting to folder item under mouse cursor (.btnFolderItem:hover)
- pathBar.js: sped up loading folder items
- pathBar.js: folder items now display file date and size in tooltip
- pathBar.js: fixed bug that occurred when selecting a file, a new file list would be returned
- updated keyboardshortcuts.txt with slideshow keys
- included sample and note for settings.ini

Jan 22/19
- upgraded to Node v10
- upgraded to Electron v3.1.1;	electron v4.0.2 has problem where dblcick event maximizes video before calling user code
- upgraded to Electron Package Manager v13.0.1
- addresssed new security issue: https://electronjs.org/docs/tutorial/security#2-disable-nodejs-integration-for-remote-content
- ignored all warnings "[Violation] 'XXX' handler took NNNms"
- fixed Move operation error when moving items between drives: "EXDEV: cross-device link not permitted ..."
- changed on all menus: "Close" to "Exit (Alt+F4)"
- added to context menu: "Folder Up (Backspace)"
- added to context menu: "Copy to Clipboard"; when selected text available
- removed from context menu: "Dev Tools (F12)"; currently available on "App Menu"
- removed Application memory usage due to deprecation of process.getProcessMemoryInfo() in Electron v4 (will add later)

Nov 5/17
- bug fixes for sftpDlg Auto functions
- update to Node v8.9
- update to Electron v1.7.9
- added tmp/settings to store default sftp connection settings (using node-iniparser)

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
- added menu App/Folder Up, Backspace shortcut key
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
- added menu item: App/"System Info", F2 to toggle
- changed double-clicking folder icon to open new folderView.exe instance.  This will probably change in the future.
- updated dev to electron 1.6.2
- added and updated screen shots


## Thanks To
- http://electron.atom.io
- http://elusiveicons.com
- https://github.com/electron-userland/electron-packager
- https://www.npmjs.com/package/iniparser
- https://nodejs.org
- https://www.npmjs.com/package/argv-to-object
- https://www.npmjs.com/package/image-size
- https://github.com/andrewrk/node-mv
- https://github.com/npm/ini
- https://github.com/tyzbit/Electron-FolderView
- http://isotope.metafizzy.co
- http://photoswipe.com
- http://www.iconarchive.com/show/series-folder-icons-by-softskin.html
- https://github.com/mscdex/ssh2


Good Luck!

Chris

chrisd@europa.com
