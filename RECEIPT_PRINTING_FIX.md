# Receipt Printing Fix Guide

## 🚨 Quick Fix (Most Common Issue)

**Problem:** Receipts are not printing at all

**Solution:**
1. **Create `.env` file** - Run `create-env.bat` or manually create `.env` file with:
   ```
   EXPO_PUBLIC_ENABLE_BLUETOOTH=true
   EXPO_PUBLIC_ENV=development
   ```

2. **Restart the app** - Run `expo start --clear`

3. **Check permissions** - Grant Bluetooth and Location permissions when prompted

## 🔧 Step-by-Step Troubleshooting

### Step 1: Environment Setup
- [ ] Create `.env` file in root directory
- [ ] Add `EXPO_PUBLIC_ENABLE_BLUETOOTH=true`
- [ ] Restart development server

### Step 2: Bluetooth Permissions
- [ ] Enable Bluetooth on device
- [ ] Grant Bluetooth permissions
- [ ] Grant Location permissions (required for scanning)
- [ ] Make sure you're not connected to PC/Phone

### Step 3: Printer Connection
- [ ] Use a Bluetooth thermal printer (not PC/Phone)
- [ ] Printer should be ESC-POS compatible
- [ ] Printer should be turned on and in pairing mode
- [ ] Look for printer names like "Thermal Printer", "ESC-POS Printer"

### Step 4: Test Printing
- [ ] Go to Settings > Printer Setup
- [ ] Click "🛠️ Troubleshooter" button
- [ ] Run the automated troubleshooting
- [ ] Follow the step-by-step fixes

## 🛠️ Automated Fixes

### Option 1: Use the Fix Script
```bash
# Run the automated fix script
fix-printer-issues.bat
```

### Option 2: Manual Setup
```bash
# Create environment file
create-env.bat

# Install dependencies
npm install tp-react-native-bluetooth-printer

# Clean and rebuild
expo prebuild --clean
expo run:android
```

## 🔍 Common Error Messages & Solutions

### "Bluetooth printing module not available"
**Solution:**
1. Run `npm install tp-react-native-bluetooth-printer`
2. Run `expo prebuild --clean && expo run:android`

### "left of undefined" error
**Cause:** Connected to PC/Phone instead of printer
**Solution:**
1. Disconnect from PC/Phone
2. Connect to actual Bluetooth thermal printer
3. PCs don't have printer constants (ALIGN.LEFT, ALIGN.CENTER)

### "No printer devices found"
**Solution:**
1. Enable Bluetooth on device
2. Grant Location permissions (required for scanning)
3. Make sure printer is in pairing mode
4. Try scanning multiple times

### "Permission denied"
**Solution:**
1. Go to device Settings > Apps > Your App > Permissions
2. Enable Bluetooth, Location permissions
3. Restart the app

### "Connection timeout"
**Solution:**
1. Check if printer is turned on
2. Move device closer to printer
3. Check printer battery level
4. Restart both device and printer

## 📱 Using the Troubleshooter

1. **Open the app**
2. **Go to Settings > Printer Setup**
3. **Click "🛠️ Troubleshooter" button**
4. **Click "Run Troubleshooter"**
5. **Follow the step-by-step fixes**

The troubleshooter will:
- ✅ Check environment configuration
- ✅ Verify Bluetooth module loading
- ✅ Test permissions
- ✅ Check Bluetooth status
- ✅ Scan for printer devices
- ✅ Test printer connection
- ✅ Send test print

## 🖨️ Supported Printer Types

- **Bluetooth thermal printers**
- **ESC-POS compatible printers**
- **USB thermal printers**
- **Network printers (via IP)**

## ❌ What NOT to Connect To

**Avoid connecting to:**
- ❌ Desktop computers
- ❌ Laptops
- ❌ iPhones
- ❌ Android phones
- ❌ Tablets

**Only connect to:**
- ✅ Bluetooth thermal printers
- ✅ ESC-POS printers
- ✅ Receipt printers
- ✅ Kitchen printers

## 📋 Printer Setup Checklist

- [ ] Environment file created (.env)
- [ ] Bluetooth enabled on device
- [ ] Permissions granted (Bluetooth + Location)
- [ ] Thermal printer turned on
- [ ] Printer in pairing mode
- [ ] Connected to actual printer (not PC/Phone)
- [ ] Test print successful

## 🆘 Still Having Issues?

1. **Check the console logs** for specific error messages
2. **Run the troubleshooter** in the app
3. **Check PRINTER_SETUP_INSTRUCTIONS.md** for detailed guide
4. **Verify printer compatibility** - must be ESC-POS compatible
5. **Try a different printer** if available

## 📞 Support Information

If issues persist, provide:
- Device model and Android version
- Printer model information
- Exact error message from console
- Steps taken to troubleshoot

## 🎯 Quick Commands

```bash
# Create environment file
create-env.bat

# Run full fix script
fix-printer-issues.bat

# Manual rebuild
expo prebuild --clean && expo run:android

# Check dependencies
npm list tp-react-native-bluetooth-printer
```

---

**Remember:** The most common issue is missing the `.env` file or connecting to PC/Phone instead of an actual thermal printer!

