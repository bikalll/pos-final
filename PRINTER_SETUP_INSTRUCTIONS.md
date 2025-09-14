# Printer Setup and Troubleshooting Guide

## Quick Fix Checklist

### 1. Environment Configuration
- [ ] Create a `.env` file in the root directory
- [ ] Add `EXPO_PUBLIC_ENABLE_BLUETOOTH=true`
- [ ] Restart the development server after creating `.env`

### 2. Bluetooth Permissions
- [ ] Grant Bluetooth permissions when prompted
- [ ] Grant Location permissions (required for Bluetooth scanning)
- [ ] Enable Bluetooth on your device
- [ ] Make sure you're not connected to PC/Phone (only connect to actual printers)

### 3. Printer Connection
- [ ] Use a Bluetooth thermal printer (not PC/Phone)
- [ ] Printer should be ESC-POS compatible
- [ ] Printer should be turned on and in pairing mode
- [ ] Look for printer names like "Thermal Printer", "ESC-POS Printer", "Receipt Printer"

### 4. Common Issues and Solutions

#### Issue: "Bluetooth printing module not available"
**Solution:**
1. Check if `tp-react-native-bluetooth-printer` is installed
2. Run `npm install tp-react-native-bluetooth-printer`
3. Rebuild the app: `expo prebuild --clean && expo run:android`

#### Issue: "left of undefined" error
**Cause:** Connected to PC/Phone instead of printer
**Solution:**
1. Disconnect from PC/Phone
2. Connect to actual Bluetooth thermal printer
3. PCs don't have printer constants (ALIGN.LEFT, ALIGN.CENTER)

#### Issue: "No printer devices found"
**Solution:**
1. Enable Bluetooth on device
2. Grant Location permissions (required for scanning)
3. Make sure printer is in pairing mode
4. Try scanning multiple times

#### Issue: "Permission denied"
**Solution:**
1. Go to device Settings > Apps > Your App > Permissions
2. Enable Bluetooth, Location permissions
3. Restart the app

#### Issue: "Connection timeout"
**Solution:**
1. Check if printer is turned on
2. Move device closer to printer
3. Check printer battery level
4. Restart both device and printer

### 5. Testing Steps

1. **Open the app**
2. **Go to Settings > Printer Setup**
3. **Check Bluetooth Status:**
   - Should show "Bluetooth enabled"
   - Should show "Connected" if printer is paired
4. **Scan for devices:**
   - Look for actual printer devices
   - Avoid PC/Phone devices
5. **Test print:**
   - Use the "Test Print" button
   - Check if receipt prints

### 6. Fallback Options

If Bluetooth printing doesn't work:
1. **Save as PDF:** Receipts can be saved as files
2. **Share via email:** Send receipts via email
3. **USB printing:** Connect printer via USB cable

### 7. Supported Printer Types

- **Bluetooth thermal printers**
- **ESC-POS compatible printers**
- **USB thermal printers**
- **Network printers (via IP)**

### 8. Debug Information

To get detailed debug info:
1. Go to Settings > Bluetooth Debug
2. Check console logs for error messages
3. Look for specific error codes

### 9. Contact Support

If issues persist:
1. Check the console logs
2. Note the exact error message
3. Provide device model and Android version
4. Include printer model information

## Environment File Setup

Create a `.env` file in the root directory with:

```
EXPO_PUBLIC_ENABLE_BLUETOOTH=true
EXPO_PUBLIC_ENV=development
```

## Rebuild Instructions

If you make changes to the environment or dependencies:

```bash
# Clean and rebuild
expo prebuild --clean
expo run:android

# Or use the provided script
npm run expo:build:clean
```
