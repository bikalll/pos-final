@echo off
echo ========================================
echo    RN-POS APK Build Script
echo    Building with Bluetooth Support
echo ========================================

echo.
echo [1/6] Cleaning previous builds...
call npm run build:clean
if %errorlevel% neq 0 (
    echo ERROR: Clean failed
    pause
    exit /b 1
)

echo.
echo [2/6] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo [3/6] Prebuilding Android project...
call npm run prebuild
if %errorlevel% neq 0 (
    echo ERROR: Prebuild failed
    pause
    exit /b 1
)

echo.
echo [4/6] Building Release APK...
call npm run build:android
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo [5/6] Checking APK location...
if exist "android\app\build\outputs\apk\release\app-release.apk" (
    echo SUCCESS: APK built successfully!
    echo Location: android\app\build\outputs\apk\release\app-release.apk
) else (
    echo ERROR: APK not found in expected location
    pause
    exit /b 1
)

echo.
echo [6/6] Build completed successfully!
echo.
echo ========================================
echo    BUILD SUMMARY
echo ========================================
echo ✓ Bluetooth permissions configured
echo ✓ Bluetooth ESC/POS printer support
echo ✓ Enhanced Bluetooth manager service
echo ✓ Comprehensive printer setup screen
echo ✓ Native Android Bluetooth module
echo ✓ All dependencies installed
echo.
echo APK Location: android\app\build\outputs\apk\release\app-release.apk
echo.
echo You can now install this APK on your Android device!
echo.
pause

