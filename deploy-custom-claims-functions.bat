@echo off
echo ========================================
echo Deploying Custom Claims Cloud Functions
echo ========================================

echo.
echo Checking Firebase CLI installation...
firebase --version
if %errorlevel% neq 0 (
    echo ERROR: Firebase CLI not found. Please install it first.
    echo Run: npm install -g firebase-tools
    pause
    exit /b 1
)

echo.
echo Checking if logged in to Firebase...
firebase projects:list >nul 2>&1
if %errorlevel% neq 0 (
    echo Please log in to Firebase first:
    firebase login
)

echo.
echo Installing function dependencies...
cd functions
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Deploying Cloud Functions...
call firebase deploy --only functions
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy functions
    pause
    exit /b 1
)

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo The following functions have been deployed:
echo - setUserClaimsOnSignup (Auth trigger)
echo - refreshUserClaimsOnLogin (Auth trigger) 
echo - updateUserCustomClaims (Callable)
echo - getUserCustomClaims (Callable)
echo.
echo Next steps:
echo 1. Test user signup to verify claims are set automatically
echo 2. Update your Firestore security rules to use custom claims
echo 3. Update your client code to refresh ID tokens after login
echo.
echo For detailed usage instructions, see: CUSTOM_CLAIMS_IMPLEMENTATION_GUIDE.md
echo.
pause
