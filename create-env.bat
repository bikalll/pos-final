@echo off
echo Creating .env file for Arbi POS...
echo.
echo EXPO_PUBLIC_ENABLE_BLUETOOTH=true > .env
echo EXPO_PUBLIC_ENV=development >> .env
echo.
echo ✅ .env file created successfully!
echo.
echo The file contains:
echo EXPO_PUBLIC_ENABLE_BLUETOOTH=true
echo EXPO_PUBLIC_ENV=development
echo.
echo Now restart your development server:
echo expo start --clear
echo.
pause

