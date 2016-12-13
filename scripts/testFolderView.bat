@echo off
rem cls
echo.

rem nodesjs tests:
rem node main.js --path="C:\Users\chris\temp\New folder\images" --layout=rows --shuffle=false --scale=1
rem node main.js --path="C:\Users\chris\Videos" --scale=0.1 --layout=rows --fontsize=20px
rem node main.js --path="C:\Users\chris\Lib\backgrounds" --scale=0.5  --layout=cols
rem node main.js --path="C:\Users\chris\Videos" --fontsize='12px' --layout=cols
rem node main.js --path="C:\Users\chris\Lib\Icons - Elusive" --layout=cols

rem electron tests
rem electron main.js --devtools=true --scale=0.3
rem electron main.js --path="C:\Users\chris\Lib\Icons - BMP"
rem electron main.js --path="C:\Users\chris\Lib\Icons - SVG"
rem electron main.js --path="C:\Users\chris\Lib\backgrounds"  --devtools=true --fontsize='12px' --layout=cols --scale=0.5

rem electron main.js --path="C:\Users\chris\Videos" --devtools=false --fontsize=12px --fullscreen=false --layout=cols
rem electron main.js --path="C:\Users\chris\temp\New Folder"
electron main.js --path="C:\Users\chris\temp\New folder\images" --devtools=false --fullscreen=false --layout=wall --scale=0.3 --shuffle
rem electron main.js --path="C:\Users\chris\Lib\Icons - Elusive"
