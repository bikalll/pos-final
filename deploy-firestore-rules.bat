@echo off
echo Deploying Firestore Security Rules...
echo.

echo Checking if Firebase CLI is installed...
firebase --version
if %errorlevel% neq 0 (
    echo Firebase CLI not found. Installing...
    npm install -g firebase-tools
)

echo.
echo Logging into Firebase...
firebase login

echo.
echo Deploying Firestore rules...
firebase deploy --only firestore:rules

echo.
echo Firestore rules deployed successfully!
echo.
echo To verify the rules are working:
echo 1. Go to Firebase Console
echo 2. Navigate to Firestore Database
echo 3. Check the Rules tab
echo 4. Verify the rules are active
echo.
pause






















