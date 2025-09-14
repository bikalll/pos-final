# Employee Login Testing Guide

## Issue Fixed
The employee login functionality has been fixed. The main issues were:

1. **Missing `getUserMetadataByEmail` method** - Added method to get user metadata by email address
2. **Navigation after login** - Fixed navigation to be handled by RootNavigator based on auth state
3. **Role assignment** - Fixed role assignment for employee login
4. **Restaurant verification** - Fixed restaurant verification logic

## How to Test Employee Login

### Option 1: Create Test Accounts (Recommended)
1. Run the test script to create test accounts:
   ```bash
   node test-employee-login.js
   ```

2. Use the generated credentials to test employee login:
   - Owner's Email: `test-owner@example.com`
   - Employee Email: `test-employee@example.com`
   - Password: `test123456`

### Option 2: Create Accounts Manually
1. **Create Owner Account:**
   - Open the app
   - Go to "Create New Account"
   - Fill in owner details and restaurant information
   - Note the email and restaurant ID

2. **Create Employee Account:**
   - Login as the owner
   - Go to Settings > Employee Management
   - Click "Add Employee"
   - Fill in employee details
   - Note the generated credentials

3. **Test Employee Login:**
   - Go to Employee Login screen
   - Enter:
     - Owner's Email: (the owner's email from step 1)
     - Your Email: (the employee's email from step 2)
     - Password: (the employee's password from step 2)

## Expected Behavior

### Successful Login
- Employee should be logged in successfully
- Should see the main app dashboard
- Role should be set to "Staff" in the Redux state
- Should have access to appropriate screens based on role

### Failed Login Scenarios
- **Wrong owner email**: "You are not authorized to access this restaurant"
- **Wrong employee email**: "No account found with this email address"
- **Wrong password**: "Incorrect password. Please try again"
- **Employee not in owner's restaurant**: "You are not authorized to access this restaurant"

## Debugging

If employee login still doesn't work:

1. **Check Console Logs:**
   - Look for "Employee login successful" message
   - Check for any error messages in the console

2. **Verify Firebase Data:**
   - Check that both owner and employee have the same `restaurantId`
   - Verify that employee has `role: 'employee'` and `isActive: true`

3. **Check Redux State:**
   - After login, check if `authState.isLoggedIn` is `true`
   - Verify `authState.role` is set to "Staff"

## Files Modified

- `src/services/firebaseAuthEnhanced.ts` - Added `getUserMetadataByEmail` method
- `src/screens/Auth/EmployeeLoginScreen.tsx` - Fixed restaurant verification logic
- `src/screens/Auth/EmployeeLoginScreen.tsx` - Improved error handling and logging

## Next Steps

1. Test the employee login with the provided test accounts
2. If successful, create real employee accounts through the Employee Management screen
3. Test with real employee credentials
4. Report any remaining issues

