@echo off
echo ========================================
echo    Arbi POS - Printer Issue Fixer
echo ========================================
echo.

echo Step 1: Creating .env file...
if not exist .env (
    echo EXPO_PUBLIC_ENABLE_BLUETOOTH=true > .env
    echo EXPO_PUBLIC_ENV=development >> .env
    echo ✅ .env file created successfully
) else (
    echo ✅ .env file already exists
)

echo.
echo Step 2: Checking dependencies...
npm list tp-react-native-bluetooth-printer
if %errorlevel% neq 0 (
    echo ❌ Bluetooth printer module not found
    echo Installing tp-react-native-bluetooth-printer...
    npm install tp-react-native-bluetooth-printer
) else (
    echo ✅ Bluetooth printer module found
)

echo.
echo Step 3: Cleaning and rebuilding...
echo This will take a few minutes...
expo prebuild --clean
if %errorlevel% neq 0 (
    echo ❌ Prebuild failed
    pause
    exit /b 1
)

echo.
echo Step 4: Building Android app...
expo run:android
if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ Printer setup complete!
echo ========================================
echo.
echo Next steps:
echo 1. Open the app
echo 2. Go to Settings > Printer Setup
echo 3. Enable Bluetooth permissions
echo 4. Scan for your printer
echo 5. Test printing
echo.
echo If you still have issues, check:
echo - PRINTER_SETUP_INSTRUCTIONS.md
echo - Make sure you're using a thermal printer
echo - Not connected to PC/Phone
echo.
pause

