@echo off
echo Restoring React Native POS project from GitHub...
echo.

if exist rn-pos (
    echo Removing existing directory...
    rmdir /s /q rn-pos
)

echo Cloning repository from GitHub...
git clone https://github.com/bikalll/rn-pos.git

echo Installing dependencies...
cd rn-pos
npm install

echo.
echo Project restored successfully!
echo You can now run: npm start
pause

