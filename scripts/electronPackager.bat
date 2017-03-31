@echo.
electron-packager . FolderView --out="dist" --no-prune --overwrite ^
  --icon="./resources/Softskin-Series-Folder-Folder-Season-Pack.ico" ^
  --win32metadata.ProductName="FolderView" ^
  --win32metadata.InternalName="FolderView" ^
  --win32metadata.FileDescription="FolderView"
