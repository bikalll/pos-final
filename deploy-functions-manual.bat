@echo off
echo ========================================
echo  DEPLOY FIREBASE FUNCTIONS MANUALLY
echo ========================================
echo.
echo The Cloud Function has been updated to allow managers to view restaurant users.
echo.
echo To deploy the updated function, you need to:
echo.
echo 1. Update Node.js to version 20 or higher
echo    - Download from: https://nodejs.org/
echo    - Install the LTS version (20.x or 22.x)
echo.
echo 2. After updating Node.js, run these commands:
echo    cd functions
echo    npm run deploy
echo.
echo 3. Or use Firebase CLI directly:
echo    firebase deploy --only functions
echo.
echo ========================================
echo  WHAT WAS FIXED:
echo ========================================
echo.
echo The getRestaurantUsers Cloud Function was updated to allow managers:
echo.
echo OLD: Only owners could view restaurant users
echo NEW: Both owners and managers can view restaurant users
echo.
echo This fixes the "Only owners can view restaurant users" error
echo that managers were getting when trying to access employee data.
echo.
echo ========================================
pause
