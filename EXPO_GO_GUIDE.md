# Expo Go Development Guide

## 🚀 Quick Start for Expo Go

Your RN-POS app is now configured for Expo Go development! This allows you to test the app on your device without building a standalone APK.

## 📱 Prerequisites

1. **Install Expo Go** on your device:
   - **Android**: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - **iOS**: [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. **Make sure your device and computer are on the same WiFi network**

## 🏃‍♂️ Running the App

### Option 1: Using the Batch Script (Windows)
```bash
# Run the provided batch script
start-expo-go.bat
```

### Option 2: Manual Start
```bash
# Start the development server
npm start
```

## 📲 Connecting Your Device

1. **Start the development server** (see above)
2. **Open Expo Go** on your device
3. **Scan the QR code** that appears in your terminal
4. **Wait for the app to load** (this may take a few minutes on first run)

## 🎯 Available Features in Expo Go

### ✅ Working Features:
- **Complete UI/UX** - All screens and navigation
- **Menu Management** - Add, edit, delete menu items
- **Table Management** - Manage restaurant tables
- **Order Management** - Create and manage orders
- **Receipt Generation** - Generate digital receipts
- **PDF Printing** - Create and share PDF receipts
- **Employee Management** - Manage staff and roles
- **Enhanced Location Tracking** - Detailed location for attendance
- **Photo Capture** - Take photos for menu items and attendance
- **Data Persistence** - Local storage with SQLite
- **Settings Management** - App configuration

### ⚠️ Limited Features (Expo Go Limitations):
- **Bluetooth Printing** - Not available in Expo Go (requires native build)
- **Native Bluetooth** - Limited to basic location services

## 🖨️ Printing in Expo Go

Since Bluetooth printing isn't available in Expo Go, the app automatically uses **PDF generation and sharing**:

### Receipt Printing:
1. Complete an order
2. Go to Receipt Detail screen
3. Tap "Print Receipt"
4. App will generate a PDF
5. Share via email, messaging, or save to device

### KOT/BOT Printing:
1. Place an order
2. Tap "Print" in Order Confirmation
3. App will generate PDF tickets
4. Share with kitchen/bar staff

## 📍 Location Features

The enhanced location tracking works perfectly in Expo Go:

### Attendance Tracking:
- **Detailed addresses** with building names, street numbers, districts
- **High accuracy GPS** coordinates
- **Location accuracy** in meters
- **Geofencing** for office proximity

### Example Location Output:
- **Before**: "Kathmandu, Nepal"
- **After**: "Arbi Restaurant, Thamel Street 15, Thamel, Kathmandu, Nepal"

## 🔧 Development Commands

Once the server is running, you can use these commands:

- **`a`** - Open on Android device
- **`i`** - Open on iOS device  
- **`w`** - Open in web browser
- **`r`** - Reload the app
- **`m`** - Toggle developer menu
- **`j`** - Open debugger
- **`q`** - Quit the server

## 🐛 Troubleshooting

### Common Issues:

1. **"Unable to resolve module" errors**
   - Run `npm install` to ensure all dependencies are installed

2. **App won't load on device**
   - Check that device and computer are on same WiFi
   - Try switching between WiFi and mobile data
   - Restart Expo Go app

3. **Location not working**
   - Grant location permissions in Expo Go
   - Enable GPS on your device

4. **Camera not working**
   - Grant camera permissions in Expo Go
   - Check device camera settings

### Performance Tips:

1. **Close other apps** on your device for better performance
2. **Use a stable WiFi connection**
3. **Keep the development server running** while testing
4. **Reload the app** (`r` key) if you experience lag

## 📋 Testing Checklist

Test these features in Expo Go:

- [ ] **Menu Management** - Add/edit menu items
- [ ] **Table Management** - Create/manage tables
- [ ] **Order Creation** - Place orders with items
- [ ] **Receipt Generation** - Generate digital receipts
- [ ] **PDF Sharing** - Share receipts via email/messaging
- [ ] **Employee Management** - Add/edit staff
- [ ] **Attendance Tracking** - Check in/out with location
- [ ] **Photo Capture** - Take photos for menu items
- [ ] **Settings** - Navigate through all settings screens

## 🚀 Next Steps

Once you've tested everything in Expo Go and want **full Bluetooth printing functionality**:

1. **Build Standalone APK**: `npm run expo:build`
2. **Install APK** on your device
3. **Connect Bluetooth thermal printer**
4. **Test real printing functionality**

## 🎉 Enjoy Your Expo Go Development!

Your app is now ready for development and testing with Expo Go. All core features work perfectly, and you can test the complete user experience without building a standalone app.

**Happy coding!** 🚀

