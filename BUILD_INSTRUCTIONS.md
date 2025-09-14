# RN-POS APK Build Instructions

## Overview
This guide will help you build the RN-POS APK with full Bluetooth printer support. The app includes comprehensive Bluetooth functionality for connecting to ESC/POS thermal printers.

## Prerequisites

### Required Software
- Node.js (v16 or higher)
- npm or yarn
- Android Studio (for Android SDK)
- Java Development Kit (JDK 11 or higher)
- Expo CLI (`npm install -g @expo/cli`)

### Android Development Setup
1. Install Android Studio
2. Install Android SDK (API level 21 or higher)
3. Set up ANDROID_HOME environment variable
4. Add platform-tools to PATH

## Bluetooth Features Included

### ✅ Permissions & Configuration
- Bluetooth permissions for Android 12+ (BLUETOOTH_CONNECT, BLUETOOTH_SCAN)
- Legacy Bluetooth permissions for older Android versions
- Location permissions (required for Bluetooth scanning)
- Hardware feature declarations

### ✅ Bluetooth Services
- **Enhanced Bluetooth Manager** (`src/services/bluetoothManager.ts`)
  - Device discovery and pairing
  - Connection management with timeout handling
  - Error recovery and status monitoring
  - Permission management

- **Bluetooth ESC/POS Printer** (`src/services/blePrinter.ts`)
  - Direct printer communication
  - Receipt printing with formatting
  - Text printing capabilities
  - Connection testing

### ✅ User Interface
- **Comprehensive Printer Setup Screen** (`src/screens/Settings/PrinterSetupScreen.tsx`)
  - Real-time Bluetooth status monitoring
  - Device scanning and discovery
  - Connection management
  - Test printing functionality
  - Error handling and user feedback

### ✅ Native Android Integration
- **Custom Bluetooth Module** (`android/app/src/main/java/com/yourcompany/rnpos/BluetoothModule.java`)
  - Native Android Bluetooth API integration
  - Hardware feature detection
  - Bluetooth adapter management

## Build Process

### Option 1: Automated Build (Recommended)
```bash
# Run the automated build script
./build-apk.bat
```

### Option 2: Manual Build
```bash
# 1. Install dependencies
npm install

# 2. Clean previous builds
npm run build:clean

# 3. Prebuild Android project
npm run prebuild

# 4. Build release APK
npm run build:android
```

### Option 3: Development Build
```bash
# For development/testing
npm run build:android-debug
```

## Build Commands Available

| Command | Description |
|---------|-------------|
| `npm run build:android` | Build release APK |
| `npm run build:android-debug` | Build debug APK |
| `npm run build:clean` | Clean build artifacts |
| `npm run build:full` | Clean + build release |
| `npm run prebuild` | Prebuild Android project |

## APK Location
After successful build, the APK will be located at:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Bluetooth Printer Setup

### 1. Enable Bluetooth
- Open the app and go to Settings → Printer Setup
- Tap "Enable Bluetooth" if not already enabled

### 2. Scan for Devices
- Tap "Scan for Devices" to discover available printers
- Ensure your printer is in pairing mode

### 3. Connect to Printer
- Select your printer from the list
- Tap "Connect" to establish connection
- Use "Test Print" to verify connectivity

### 4. Print Receipts
- The app will automatically use the connected printer
- Receipts are formatted for thermal printers
- Supports custom formatting and branding

## Troubleshooting

### Build Issues
1. **Gradle sync failed**: Run `npm run build:clean` and try again
2. **Permission denied**: Ensure you have write permissions to the project directory
3. **SDK not found**: Verify Android SDK installation and ANDROID_HOME path

### Bluetooth Issues
1. **Printer not found**: Ensure printer is in pairing mode and within range
2. **Connection failed**: Check if printer is already connected to another device
3. **Permission denied**: Grant all requested permissions in Android settings

### Common Solutions
- Restart the app after granting permissions
- Ensure Bluetooth is enabled on both device and printer
- Try disconnecting and reconnecting the printer
- Check printer compatibility (ESC/POS protocol)

## Features Summary

### ✅ Core POS Features
- Order management
- Menu management
- Inventory tracking
- Customer management
- Staff management
- Table management
- Receipt generation
- Reports and analytics

### ✅ Bluetooth Printing Features
- Automatic device discovery
- Secure connection management
- Receipt formatting
- Test printing
- Connection status monitoring
- Error handling and recovery
- Multi-device support

### ✅ Technical Features
- React Native with TypeScript
- Redux state management
- SQLite local database
- Expo framework
- Native Android integration
- Comprehensive error handling

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify all prerequisites are installed
3. Ensure you're using the latest version of dependencies
4. Check Android device compatibility (API level 21+)

## Version Information
- React Native: 0.79.5
- Expo: 53.0.20
- Bluetooth ESC/POS Printer: 0.1.0-beta.7
- Target Android API: 21+
- Minimum Android API: 21

