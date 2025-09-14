@echo off
echo Starting USB Debugging for React Native POS...
echo.

echo Checking ADB connection...
adb devices

echo.
echo Setting up USB port forwarding...
adb reverse tcp:8081 tcp:8081

echo.
echo Starting Expo development server...
npx expo start --localhost

echo.
echo USB Debugging Setup Complete!
echo 1. Install Expo Go on your Android device
echo 2. Scan the QR code that appears
echo 3. Your app will load via USB connection
pause
