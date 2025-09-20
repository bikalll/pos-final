# Email Verification Setup Instructions

## 🚨 **Why You're Not Getting Emails**

The email verification system needs to be configured with your Gmail credentials to send emails. Here's how to fix it:

## 🔧 **Step 1: Set Up Gmail App Password**

1. **Go to your Google Account settings:**
   - Visit: https://myaccount.google.com/
   - Go to "Security" → "2-Step Verification"
   - Enable 2-Step Verification if not already enabled

2. **Generate App Password:**
   - Go to "Security" → "App passwords"
   - Select "Mail" and "Other (custom name)"
   - Enter "Restaurant POS" as the name
   - Copy the generated 16-character password

## 🔧 **Step 2: Configure Firebase Functions**

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Set your Gmail credentials
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.password="your-16-char-app-password"

# Deploy functions
firebase deploy --only functions
```

## 🔧 **Step 3: Test Email Sending**

1. **Create a new user account** in your app
2. **Check your email** (including spam folder)
3. **Click the verification link** in the email
4. **Try logging in** after verification

## 🚨 **Troubleshooting**

### **Still Not Getting Emails?**

1. **Check Firebase Functions logs:**
   ```bash
   firebase functions:log
   ```

2. **Verify Gmail credentials:**
   - Make sure you're using the app password (not your regular password)
   - Ensure 2-Step Verification is enabled
   - Check that the email address is correct

3. **Check spam folder:**
   - Gmail might mark verification emails as spam
   - Add the sender to your contacts

4. **Test with a different email:**
   - Try with a different Gmail account
   - Some email providers block automated emails

### **Common Issues:**

- ❌ **Wrong password**: Using regular password instead of app password
- ❌ **2FA not enabled**: App passwords require 2-Step Verification
- ❌ **Wrong email**: Make sure the email in config matches your Gmail
- ❌ **Spam folder**: Check spam/junk folder for emails

## 📧 **Email Configuration Example**

```bash
# Replace with your actual Gmail
firebase functions:config:set email.user="myrestaurant@gmail.com"

# Replace with your 16-character app password
firebase functions:config:set email.password="abcd efgh ijkl mnop"
```

## ✅ **Success Indicators**

When working correctly, you should see:
- ✅ User creation succeeds
- ✅ Email appears in inbox within 1-2 minutes
- ✅ Clicking link shows "Email Verified Successfully!"
- ✅ User can log in after verification

## 🆘 **Still Having Issues?**

If you're still not receiving emails:

1. **Check the Firebase Functions logs** for error messages
2. **Verify your Gmail app password** is correct
3. **Try with a different email address**
4. **Check your spam folder**

The email verification system is now properly configured and should work once you set up the Gmail credentials!
