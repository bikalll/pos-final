# Building Expo Standalone APK with Physical Printing Support

## Overview

Your React Native POS app can be built as an Expo Standalone APK that supports **physical printing** through two methods:

1. **PDF Generation & Sharing** (Works immediately)
2. **Direct Bluetooth Thermal Printing** (Requires configuration)

## ✅ What's Already Configured

- ✅ Bluetooth permissions in `app.json`
- ✅ `react-native-bluetooth-escpos-printer` plugin configured
- ✅ Dependencies properly set up
- ✅ Printing services implemented

## 🚀 Building the APK

### Prerequisites

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g @expo/eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure EAS Build** (if not already done):
   ```bash
   eas build:configure
   ```

### Build Commands

#### Option 1: Development Build (Recommended for testing)
```bash
eas build --platform android --profile development
```

#### Option 2: Preview Build (For distribution)
```bash
eas build --platform android --profile preview
```

#### Option 3: Production Build
```bash
eas build --platform android --profile production
```

## 🖨️ Printing Capabilities in the APK

### 1. PDF Generation & Sharing (Always Works)
- ✅ Generates professional receipts as PDFs
- ✅ Shares PDFs to other apps (email, cloud storage, printing apps)
- ✅ Works on all Android devices
- ✅ No additional hardware required

### 2. Direct Bluetooth Thermal Printing
- ✅ Connects directly to Bluetooth thermal printers
- ✅ Supports ESC/POS commands
- ✅ Real-time printing without file generation
- ⚠️ Requires compatible thermal printer hardware

## 📱 Testing Printing in the APK

### PDF Printing Workflow:
1. Generate receipt in the app
2. App creates PDF file
3. Share dialog opens
4. Choose printing app or email
5. Print through selected method

### Bluetooth Printing Workflow:
1. Go to Settings → Printer Setup
2. Scan for Bluetooth devices
3. Connect to thermal printer
4. Test print functionality
5. Use for receipts and kitchen tickets

## 🔧 Troubleshooting

### Common Issues:

1. **Bluetooth permissions not granted**:
   - Go to Android Settings → Apps → Your App → Permissions
   - Enable Bluetooth and Location permissions

2. **Printer not found**:
   - Ensure printer is in pairing mode
   - Check if printer supports ESC/POS protocol
   - Verify Bluetooth is enabled on both devices

3. **Print quality issues**:
   - Check printer paper alignment
   - Verify printer settings (paper width, etc.)
   - Test with different thermal paper

### Debug Commands:
```bash
# Check build status
eas build:list

# Download APK
eas build:download

# View build logs
eas build:view
```

## 📋 Hardware Requirements

### For PDF Printing:
- Any Android device
- Internet connection for sharing
- Optional: Printing app installed

### For Bluetooth Thermal Printing:
- Android device with Bluetooth 4.0+
- Compatible thermal printer (ESC/POS)
- Common brands: Epson, Star, Citizen, Bixolon

## 🎯 Recommended Printers

### Budget Options:
- **Epson TM-T20II** - Reliable, widely supported
- **Star TSP100** - Good for small receipts
- **Citizen CT-S310II** - Compact design

### Professional Options:
- **Epson TM-T88VI** - High-speed, network capable
- **Star TSP143III** - Durable, good for busy environments
- **Bixolon SRP-350III** - Advanced features

## 📞 Support

If you encounter issues:
1. Check the build logs in EAS dashboard
2. Verify all permissions are granted
3. Test with different printer models
4. Check printer manufacturer documentation

## 🚀 Next Steps

1. **Build the APK** using the commands above
2. **Test on physical device** with your printer
3. **Configure printer settings** in the app
4. **Deploy to production** when ready

Your app is now ready for physical printing in the Expo Standalone APK! 🎉

