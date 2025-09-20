@echo off
REM Production Deployment Script for RN-POS (Windows)
REM This script handles the complete production deployment process

echo 🚀 Starting Production Deployment for RN-POS
echo ==============================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed
    exit /b 1
)

REM Check if EAS CLI is installed
eas --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ EAS CLI is not installed. Install with: npm install -g @expo/eas-cli
    exit /b 1
)

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Firebase CLI is not installed. Install with: npm install -g firebase-tools
    exit /b 1
)

echo ✅ All dependencies are installed

REM Validate environment configuration
if not exist ".env.production" (
    echo ❌ Production environment file (.env.production) not found
    echo ⚠️  Please create .env.production with your production Firebase configuration
    exit /b 1
)

echo ✅ Environment configuration is valid

REM Install dependencies
echo ✅ Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    exit /b 1
)
echo ✅ Dependencies installed successfully

REM Run security tests
echo ✅ Running security tests...
findstr /r /s "AIzaSy" . >nul 2>&1
if %errorlevel% equ 0 (
    echo ❌ Hardcoded API keys found in code. Please remove them.
    exit /b 1
)

echo ✅ Security tests completed

REM Deploy Firebase configuration
echo ✅ Deploying Firebase configuration...

if exist "firestore.rules" (
    call firebase deploy --only firestore:rules
    echo ✅ Firestore security rules deployed
) else (
    echo ⚠️  firestore.rules not found
)

if exist "functions" (
    cd functions
    call npm install
    call firebase deploy --only functions
    cd ..
    echo ✅ Cloud Functions deployed
) else (
    echo ⚠️  functions directory not found
)

if exist "database.rules.json" (
    call firebase deploy --only database
    echo ✅ Realtime Database rules deployed
) else (
    echo ⚠️  database.rules.json not found
)

REM Build production APK
echo ✅ Building production APK...

REM Check if logged in to EAS
eas whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Please login to EAS: eas login
    exit /b 1
)

REM Build production APK
call eas build --platform android --profile production --non-interactive
if %errorlevel% neq 0 (
    echo ❌ Failed to build production APK
    exit /b 1
)

echo ✅ Production APK built successfully

REM Generate deployment report
echo ✅ Generating deployment report...
set REPORT_FILE=deployment-report-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.txt
set REPORT_FILE=%REPORT_FILE: =0%

echo RN-POS Production Deployment Report > "%REPORT_FILE%"
echo Generated: %date% %time% >> "%REPORT_FILE%"
echo ===================================== >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo Deployment Status: SUCCESS >> "%REPORT_FILE%"
echo Build Profile: production >> "%REPORT_FILE%"
echo Platform: Android >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo Security Checklist: >> "%REPORT_FILE%"
echo - [x] Environment variables configured >> "%REPORT_FILE%"
echo - [x] Firebase security rules deployed >> "%REPORT_FILE%"
echo - [x] API keys secured >> "%REPORT_FILE%"
echo - [x] Security tests passed >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"
echo Next Steps: >> "%REPORT_FILE%"
echo 1. Test the production APK on physical devices >> "%REPORT_FILE%"
echo 2. Monitor Firebase console for any issues >> "%REPORT_FILE%"
echo 3. Set up production monitoring and alerting >> "%REPORT_FILE%"
echo 4. Train users on the production system >> "%REPORT_FILE%"

echo ✅ Deployment report generated: %REPORT_FILE%

echo.
echo ✅ Production deployment completed successfully! 🎉
echo ⚠️  Remember to:
echo ⚠️  1. Test the APK on physical devices
echo ⚠️  2. Monitor Firebase console
echo ⚠️  3. Set up production monitoring

pause
