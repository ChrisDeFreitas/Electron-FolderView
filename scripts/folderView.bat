@echo off
cls
echo.
echo sample execution: exec.bat "C:\Users\chris\temp\New folder\images\drcrnk_080e70.jpg"
echo.
echo.

echo process request with main.js...
rem node "c:\electron\folderView\main.js" %1
electron "c:\electron\folderView\main.js" %1
