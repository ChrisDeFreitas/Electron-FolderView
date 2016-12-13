# Electron FolderView

I originally created this as a nodejs app to view local images.  I was frustrated with the complexity of the free and paid image viewing apps I had.  With the many wonderful image handling libraries available for the web, I thought it would be simple enough to throw something together in node...then I found the awesomeness of Electron!

This app is intended for my personal use--not to make a million dollars dominating a market niche.  It allows me to quickly add functionality to handle various file handling tasks.  The immediate one was to be able to view images quickly without clunky widgets or ui chrome getting in the way.  With the Electron functionality I was able to generate a general purpose directory browser (and explore Electron's functionality).

Therefore, this is a work in progress.  Feel free to use and modify as you wish.  It should be pretty easy to dig into the code and tweak.


## Functions
- display folder contents in customizeable grid
- double click to launch file with OS's default app
- play videos and music from grid (using Chrome's built-in tools)
- click image for slideshow
- main menu with custom functions
- right click for extra functions
- some functions: auto-scroll, copy path/src, delete, filter by file ext, image scale


## App Notes
0. Windows only
  * I use it on Win8.1 and Win7

1. to install
  * requires node.js/npm
  * after downloading to a folder: npm install

2. npm test
  * executes scripts/test.bat
  * these are specific tests based on my OS and functionality needs

2. npm run build
  * executes buid... from package.json
  * builds and zips electron Win64 version in local folder
  * you will need to modify this to use for your own purposes

3. to manually run:
  * electron version = electron main.js
  * node version = node main.js

4. command line switches
  * handled by "argv-to-object"
  * documented in main.js:
```Javascript
var argmap =
{
			devtools:{		keypath:'devtools', 	type:'boolean', default:false },
			fontsize:{		keypath:'fontsize', 	type:'string',  default:'12px'
							,	notes:'set the default font size for the item captions.' },
			fullscreen:{	keypath:'fullscreen', type:'boolean', default:false },
			layout:{			keypath:'layout', 		type:'string',	default:'wall',	range:['cols','rows','vertical','wall']
		 					, notes:'isotope translations: cols=masonry, width=300px; rows=fitRows,height=300px; vertical=vertical, width=300px; wall=packery, width dependent on image size'},
			path:{				keypath:'path', 			type:'string',	default:'',			notes:'no trailing backslash allowed (for argv-to-object).' },
			scale:{				keypath:'scale',			type:'number',  default:1,		range:{min:0.1, max:'infinity'}, notes:"scale size of grid items." },
			shuffle:{			keypath:'shuffle',		type:'boolean',	default:false,	notes:'randomize display of items'}
	}
```

## 5. ToDo
- fixup this doc
- add screen shots of grid layouts
- add mouseover/out border for selected item
- add special handling for audio files
- add recent folders list
- add scale dialog to simplify scaling grid images


## Thanks To
- http://electron.atom.io/
- https://nodejs.org/
- https://www.npmjs.com/package/argv-to-object
- https://www.npmjs.com/package/image-size
- http://isotope.metafizzy.co
- http://photoswipe.com/


Good Luck!

Chris
chrisd@europa.com
