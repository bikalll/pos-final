@echo off
echo Starting Expo Go with Updates Disabled...
echo.
echo Setting environment variables to disable updates...
set EXPO_NO_UPDATES=true
set EXPO_DISABLE_UPDATES=true
set EXPO_PUBLIC_DISABLE_UPDATES=true
set EXPO_PUBLIC_ENABLE_BLUETOOTH=true
set EXPO_PUBLIC_ENV=development
echo.
echo Starting Expo server...
npx expo start --clear --no-dev-client
pause
