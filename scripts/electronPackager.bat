@echo off
cls

echo.
echo electron-packager . FolderView --no-prune --overwrite ^
 --icon="./lib/Softskin-Series-Folder-Folder-Season-Pack.ico" ^
 --win32metadata.ProductName="FolderView" ^
 --win32metadata.InternalName="FolderView" ^
 --win32metadata.FileDescription="View and play folder contents"
 echo.
 electron-packager . FolderView --no-prune --overwrite ^
  --icon="./lib/Softskin-Series-Folder-Folder-Season-Pack.ico" ^
  --win32metadata.ProductName="FolderView" ^
  --win32metadata.InternalName="FolderView" ^
  --win32metadata.FileDescription="View and play folder contents"

echo.
echo "C:\Program Files\7-Zip\7z.exe" a -r "C:\electron\folderview\FolderView-win32-x64.zip" ^
 "C:\electron\folderview\FolderView-win32-x64\"
 echo.
"C:\Program Files\7-Zip\7z.exe" a -r "C:\electron\folderview\FolderView-win32-x64.zip" ^
  "C:\electron\folderview\FolderView-win32-x64\"

echo.
dir "C:\electron\folderview\FolderView-win32-x64.zip"
