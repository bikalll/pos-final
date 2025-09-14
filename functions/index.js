const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.database();

/**
 * Cloud Function to create user accounts securely
 * Only owners can create new user accounts
 */
exports.createUser = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { email, password, displayName, role, restaurantId } = data;
  const requesterUid = context.auth.uid;

  // Validate input
  if (!email || !password || !displayName || !role || !restaurantId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  if (!['owner', 'employee'].includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
  }

  try {
    // Verify requester is an owner
    const requesterRef = db.ref(`users/${requesterUid}`);
    const requesterSnapshot = await requesterRef.once('value');
    const requesterData = requesterSnapshot.val();

    if (!requesterData || requesterData.role !== 'owner') {
      throw new functions.https.HttpsError('permission-denied', 'Only owners can create user accounts');
    }

    // Verify requester belongs to the same restaurant
    if (requesterData.restaurantId !== restaurantId) {
      throw new functions.https.HttpsError('permission-denied', 'Cannot create users for different restaurants');
    }

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email: email.toLowerCase(),
      password: password,
      displayName: displayName,
    });

    // Create user metadata
    const userMetadata = {
      uid: userRecord.uid,
      email: email.toLowerCase(),
      role: role,
      restaurantId: restaurantId,
      displayName: displayName,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      isActive: true,
      createdBy: requesterUid,
    };

    // Save user metadata to Realtime Database
    await db.ref(`users/${userRecord.uid}`).set(userMetadata);

    // If this is an owner account, also create restaurant user mapping
    if (role === 'owner') {
      await db.ref(`restaurant_users/${userRecord.uid}`).set({
        id: userRecord.uid,
        email: email.toLowerCase(),
        restaurantId: restaurantId,
        role: 'Owner',
        createdAt: admin.database.ServerValue.TIMESTAMP,
        isActive: true,
      });
    }

    return {
      success: true,
      uid: userRecord.uid,
      email: email.toLowerCase(),
      displayName: displayName,
      role: role,
    };

  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Email already exists');
    } else if (error.code === 'auth/invalid-email') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email address');
    } else if (error.code === 'auth/weak-password') {
      throw new functions.https.HttpsError('invalid-argument', 'Password is too weak');
    } else {
      throw new functions.https.HttpsError('internal', 'Failed to create user account');
    }
  }
});

/**
 * Cloud Function to create employee credentials
 * Generates a temporary password for new employees
 */
exports.createEmployeeCredentials = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { email, displayName, restaurantId } = data;
  const requesterUid = context.auth.uid;

  // Validate input
  if (!email || !displayName || !restaurantId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  try {
    // Verify requester is an owner
    const requesterRef = db.ref(`users/${requesterUid}`);
    const requesterSnapshot = await requesterRef.once('value');
    const requesterData = requesterSnapshot.val();

    if (!requesterData || requesterData.role !== 'owner') {
      throw new functions.https.HttpsError('permission-denied', 'Only owners can create employee accounts');
    }

    // Verify requester belongs to the same restaurant
    if (requesterData.restaurantId !== restaurantId) {
      throw new functions.https.HttpsError('permission-denied', 'Cannot create users for different restaurants');
    }

    // Generate temporary password
    const tempPassword = generateTemporaryPassword();

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email: email.toLowerCase(),
      password: tempPassword,
      displayName: displayName,
    });

    // Create user metadata
    const userMetadata = {
      uid: userRecord.uid,
      email: email.toLowerCase(),
      role: 'employee',
      restaurantId: restaurantId,
      displayName: displayName,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      isActive: true,
      createdBy: requesterUid,
    };

    // Save user metadata to Realtime Database
    await db.ref(`users/${userRecord.uid}`).set(userMetadata);

    return {
      success: true,
      uid: userRecord.uid,
      email: email.toLowerCase(),
      displayName: displayName,
      password: tempPassword,
      role: 'employee',
    };

  } catch (error) {
    console.error('Error creating employee credentials:', error);
    
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Email already exists');
    } else if (error.code === 'auth/invalid-email') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email address');
    } else {
      throw new functions.https.HttpsError('internal', 'Failed to create employee account');
    }
  }
});

/**
 * Cloud Function to update user metadata
 * Only owners can update user information
 */
exports.updateUserMetadata = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { targetUid, updates } = data;
  const requesterUid = context.auth.uid;

  // Validate input
  if (!targetUid || !updates) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  try {
    // Verify requester is an owner
    const requesterRef = db.ref(`users/${requesterUid}`);
    const requesterSnapshot = await requesterRef.once('value');
    const requesterData = requesterSnapshot.val();

    if (!requesterData || requesterData.role !== 'owner') {
      throw new functions.https.HttpsError('permission-denied', 'Only owners can update user metadata');
    }

    // Get target user data
    const targetRef = db.ref(`users/${targetUid}`);
    const targetSnapshot = await targetRef.once('value');
    const targetData = targetSnapshot.val();

    if (!targetData) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    // Verify both users belong to the same restaurant
    if (requesterData.restaurantId !== targetData.restaurantId) {
      throw new functions.https.HttpsError('permission-denied', 'Cannot update users from different restaurants');
    }

    // Update user metadata
    await targetRef.update(updates);

    return {
      success: true,
      uid: targetUid,
      updates: updates,
    };

  } catch (error) {
    console.error('Error updating user metadata:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update user metadata');
  }
});

/**
 * Cloud Function to deactivate user account
 * Only owners can deactivate accounts
 */
exports.deactivateUser = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { targetUid } = data;
  const requesterUid = context.auth.uid;

  // Validate input
  if (!targetUid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing target user ID');
  }

  try {
    // Verify requester is an owner
    const requesterRef = db.ref(`users/${requesterUid}`);
    const requesterSnapshot = await requesterRef.once('value');
    const requesterData = requesterSnapshot.val();

    if (!requesterData || requesterData.role !== 'owner') {
      throw new functions.https.HttpsError('permission-denied', 'Only owners can deactivate accounts');
    }

    // Get target user data
    const targetRef = db.ref(`users/${targetUid}`);
    const targetSnapshot = await targetRef.once('value');
    const targetData = targetSnapshot.val();

    if (!targetData) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    // Verify both users belong to the same restaurant
    if (requesterData.restaurantId !== targetData.restaurantId) {
      throw new functions.https.HttpsError('permission-denied', 'Cannot deactivate users from different restaurants');
    }

    // Prevent deactivating own account
    if (targetUid === requesterUid) {
      throw new functions.https.HttpsError('invalid-argument', 'Cannot deactivate your own account');
    }

    // Deactivate user account
    await targetRef.update({ isActive: false });

    // Disable Firebase Auth user
    await admin.auth().updateUser(targetUid, { disabled: true });

    return {
      success: true,
      uid: targetUid,
      message: 'User account deactivated successfully',
    };

  } catch (error) {
    console.error('Error deactivating user:', error);
    throw new functions.https.HttpsError('internal', 'Failed to deactivate user account');
  }
});

/**
 * Cloud Function to get restaurant users
 * Only owners can view restaurant users
 */
exports.getRestaurantUsers = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { restaurantId } = data;
  const requesterUid = context.auth.uid;

  // Validate input
  if (!restaurantId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing restaurant ID');
  }

  try {
    // Verify requester is an owner
    const requesterRef = db.ref(`users/${requesterUid}`);
    const requesterSnapshot = await requesterRef.once('value');
    const requesterData = requesterSnapshot.val();

    if (!requesterData || requesterData.role !== 'owner') {
      throw new functions.https.HttpsError('permission-denied', 'Only owners can view restaurant users');
    }

    // Verify requester belongs to the requested restaurant
    if (requesterData.restaurantId !== restaurantId) {
      throw new functions.https.HttpsError('permission-denied', 'Cannot view users from different restaurants');
    }

    // Get all users for the restaurant
    const usersRef = db.ref('users');
    const usersSnapshot = await usersRef.once('value');
    const allUsers = usersSnapshot.val();

    if (!allUsers) {
      return { users: [] };
    }

    // Filter users by restaurant
    const restaurantUsers = Object.values(allUsers).filter(user => 
      user.restaurantId === restaurantId
    );

    return {
      success: true,
      users: restaurantUsers,
    };

  } catch (error) {
    console.error('Error getting restaurant users:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get restaurant users');
  }
});

/**
 * Helper function to generate temporary password
 */
function generateTemporaryPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
