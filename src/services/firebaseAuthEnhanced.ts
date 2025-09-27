import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User,
  updateProfile,
  getAuth,
  sendEmailVerification,
  reload,
  applyActionCode,
  checkActionCode,
  verifyPasswordResetCode,
  updatePassword,
  sendPasswordResetEmail,
  confirmPasswordReset
} from 'firebase/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, firestore, functions } from './firebase';
import { createFirestoreService, initializeFirestoreService } from './firestoreService';
import { stopRealtimeSync } from './realtimeSyncService';
import { getFirebaseService } from './firebaseService';
import { AppDispatch } from '../redux/storeFirebase';
import { login, logout, setRestaurant } from '../redux/slices/authSlice';
import { resetOrders } from '../redux/slices/ordersSliceFirebase';

export type UserRole = 'owner' | 'employee';
export type UserMetadata = {
  uid: string;
  email: string;
  role: UserRole;
  restaurantId: string;
  displayName: string;
  createdAt: number;
  isActive: boolean;
  createdBy?: string; // UID of the user who created this account
  photoURL?: string;
};

export class FirebaseAuthEnhanced {
  private dispatch: AppDispatch;

  constructor(dispatch: AppDispatch) {
    this.dispatch = dispatch;
  }

  // Sign in with email and password (MANDATORY EMAIL VERIFICATION)
  async signIn(email: string, password: string): Promise<UserMetadata> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // MANDATORY EMAIL VERIFICATION - BLOCK LOGIN IF NOT VERIFIED
      if (!user.emailVerified) {
        // Sign out the user immediately since email is not verified
        await signOut(auth);
        
        // Send verification email to help user verify
        try {
          // Create a temporary auth instance to send verification email
          const tempAuth = getAuth();
          const tempUserCredential = await signInWithEmailAndPassword(tempAuth, email, password);
          await sendEmailVerification(tempUserCredential.user);
          await signOut(tempAuth);
          console.log('Email verification sent to:', email);
        } catch (verificationError) {
          console.warn('Failed to send verification email:', verificationError);
        }
        
        // Throw specific error for email verification requirement
        throw new Error('EMAIL_VERIFICATION_REQUIRED');
      }
      
      // Get user metadata from Firestore
      let userMetadata = await this.getUserMetadata(user.uid);
      
      // If user metadata exists but doesn't have displayName, update it
      if (userMetadata && !userMetadata.displayName) {
        const updatedDisplayName = user.displayName || user.email?.split('@')[0] || 'User';
        await this.updateUserMetadata(user.uid, { displayName: updatedDisplayName });
        
        // Get updated metadata
        const updatedMetadata = await this.getUserMetadata(user.uid);
        if (!updatedMetadata) {
          throw new Error('Failed to get updated user metadata');
        }
        userMetadata = updatedMetadata;
      }
      if (!userMetadata) {
        // Create default user metadata for existing users
        const defaultMetadata: UserMetadata = {
          uid: user.uid,
          email: user.email || '',
          role: 'Owner', // Default to Owner for existing users
          restaurantId: 'default_restaurant',
          displayName: user.displayName || 'User',
          createdAt: Date.now(),
          isActive: true, // Always set to active
          createdBy: 'system'
        };
        
        await this.saveUserMetadata(defaultMetadata);
        
        // Use the default metadata
        const updatedMetadata = await this.getUserMetadata(user.uid);
        if (!updatedMetadata) {
          throw new Error('Failed to create user metadata');
        }
        
        return updatedMetadata;
      }

      if (!userMetadata.isActive) {
        await signOut(auth);
        throw new Error('This account has been deactivated. Please contact your administrator.');
      }

      // Initialize Firestore service with restaurant ID
      initializeFirestoreService(userMetadata.restaurantId);

      // Get restaurant info and resolve role from restaurant users mapping
      const firestoreService = createFirestoreService(userMetadata.restaurantId);
      const restaurantInfo = await firestoreService.getRestaurantInfo();

      // Prefer role from restaurants/{restaurantId}/users/{uid}.role if present
      let effectiveRole: any = undefined;
      try {
        const userMapping = await (firestoreService as any).read('users', user.uid);
        const mappedRole = (userMapping?.role || '').toString();
        if (mappedRole === 'Owner' || mappedRole === 'Manager' || mappedRole === 'Staff') {
          effectiveRole = mappedRole;
        }
      } catch {}

      if (!effectiveRole) {
        // Fallback: map metadata.role to proper Redux role
        if (userMetadata.role === 'Owner') {
          effectiveRole = 'Owner';
        } else if (userMetadata.role === 'manager') {
          effectiveRole = 'Manager';
        } else if (userMetadata.role === 'staff' || userMetadata.role === 'employee') {
          effectiveRole = 'Staff';
        } else {
          effectiveRole = 'Staff'; // Default fallback
        }
      }
      
      // Dispatch login action
      const role = effectiveRole;
      console.log('🔍 LOGIN DEBUG - User metadata found:', {
        uid: userMetadata.uid,
        email: userMetadata.email,
        role: userMetadata.role,
        restaurantId: userMetadata.restaurantId,
        displayName: userMetadata.displayName,
        isActive: userMetadata.isActive
      });
      console.log('🔍 LOGIN DEBUG - Restaurant info:', restaurantInfo);
      console.log('Dispatching login action with data:', {
        userName: userMetadata.displayName,
        role: role,
        userId: user.uid,
        restaurantId: userMetadata.restaurantId,
        restaurantName: restaurantInfo?.name || 'Restaurant'
      });
      console.log('🔍 AUTH DEBUG - Final role being dispatched:', role, '(type:', typeof role, ')');
      
      this.dispatch(login({
        userName: userMetadata.displayName,
        role: role,
        userId: user.uid,
        restaurantId: userMetadata.restaurantId,
        restaurantName: restaurantInfo?.name || 'Restaurant',
        logoUrl: restaurantInfo?.logoUrl,
        panVatImageUrl: restaurantInfo?.panVatImageUrl,
        userPhotoUrl: (user as any)?.photoURL || (userMetadata as any)?.photoURL
      }));
      
      console.log('✅ LOGIN DISPATCHED - Auth state should now have restaurantId:', userMetadata.restaurantId);

      return userMetadata;

    } catch (error) {
      console.error('Firebase sign in error:', error);
      throw error;
    }
  }

  // Create new user account (only for owners) - MANDATORY EMAIL VERIFICATION
  async createUser(
    email: string, 
    password: string, 
    displayName: string, 
    role: UserRole,
    restaurantId: string,
    createdBy: string
  ): Promise<UserMetadata> {
    try {
      // For system-created accounts (initial owner signup), skip creator verification
      if (createdBy !== 'system') {
        // Verify that the creator is an owner
        const creatorMetadata = await this.getUserMetadata(createdBy);
        if (!creatorMetadata || (creatorMetadata.role !== 'Owner' && creatorMetadata.role !== 'manager')) {
          throw new Error('Only owners and managers can create user accounts');
        }
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update user profile
      await updateProfile(user, { displayName });

      // AUTOMATIC: Send email verification (non-blocking)
      try {
        await sendEmailVerification(user);
        console.log('Email verification sent to:', email);
      } catch (verificationError) {
        console.error('Failed to send email verification:', verificationError);
        // Don't fail user creation, but log the error
      }

      // Create user metadata
      const userMetadata: UserMetadata = {
        uid: user.uid,
        email: email.toLowerCase(),
        role: role === 'owner' ? 'Owner' : role, // Convert 'owner' to 'Owner', keep others as is
        restaurantId,
        displayName,
        createdAt: Date.now(),
        isActive: true,
        createdBy
      };

      // Store user metadata in Firestore
      await this.saveUserMetadata(userMetadata);

      // Create restaurant user mapping for both owners and employees
      // This creates a separate document in the restaurant's users collection
      const firestoreService = createFirestoreService(restaurantId);
      
      // Map role to proper restaurant user role
      let restaurantRole;
      if (role === 'owner' || role === 'Owner') {
        restaurantRole = 'Owner';
      } else if (role === 'manager') {
        restaurantRole = 'Manager';
      } else {
        restaurantRole = 'Staff';
      }
      
      await firestoreService.create('users', {
        id: user.uid,
        email: email,
        restaurantId: restaurantId,
        role: restaurantRole
      });

      // User remains logged in after creation
      // Email verification happens in background

      return userMetadata;

    } catch (error) {
      console.error('Firebase create user error:', error);
      throw error;
    }
  }

  // Create employee credentials (owner/manager only) via Cloud Function (prevents auth session switching)
  // MANDATORY EMAIL VERIFICATION - Employee must verify email before first login
  async createEmployeeCredentials(
    email: string,
    displayName: string,
    restaurantId: string,
    createdBy: string,
    password?: string,
    staffRole?: 'manager' | 'staff'
  ): Promise<{ credentials: { email: string; password: string }; userMetadata: UserMetadata; emailVerificationSent: boolean }> {
    try {
      // Verify creator permissions locally for fast feedback
      const creatorMetadata = await this.getUserMetadata(createdBy);
      if (!creatorMetadata || (creatorMetadata.role !== 'Owner' && creatorMetadata.role !== 'manager')) {
        throw new Error('Only owners and managers can create employee accounts');
      }

      const createFn = httpsCallable(functions, 'createEmployeeCredentials');
      let response: any;
      let emailVerificationSent = false;
      
      try {
        response = await createFn({
          email: email.toLowerCase(),
          displayName,
          restaurantId,
          password,
          staffRole,
          requireEmailVerification: true, // Tell the function to send verification email
        });
        emailVerificationSent = true;
      } catch (fnError: any) {
        // Fallback if function is not deployed/found in region
        const isNotFound = (fnError?.code === 'functions/not-found') || /not-found/i.test(fnError?.message || '');
        if (!isNotFound) throw fnError;

        try {
          // Try alternate callable name
          const createUserFn = httpsCallable(functions, 'createUser');
          const fallbackResp: any = await createUserFn({
            email: email.toLowerCase(),
            password: password || this.generateTemporaryPassword(),
            displayName,
            role: 'employee',
            restaurantId,
            requireEmailVerification: true,
          });
          // Normalize shape to match primary path
          response = { data: {
            uid: fallbackResp?.data?.uid,
            email: email.toLowerCase(),
            displayName,
            password: (password || ''),
            role: (staffRole === 'manager') ? 'manager' : 'staff',
          }};
          emailVerificationSent = true;

          // Best-effort: mirror to Firestore so the app state remains consistent
          try {
            const createdUid = fallbackResp?.data?.uid as string;
            const userDoc = doc(firestore, `users/${createdUid}`);
            await setDoc(userDoc, {
              uid: createdUid,
              email: email.toLowerCase(),
              role: (staffRole === 'manager') ? 'manager' : 'staff',
              restaurantId,
              displayName,
              createdAt: Date.now(),
              isActive: true,
              createdBy,
            }, { merge: true });

            const firestoreService = createFirestoreService(restaurantId);
            await (firestoreService as any).create('users', {
              id: createdUid,
              email: email.toLowerCase(),
              restaurantId,
              role: (staffRole === 'manager') ? 'Manager' : 'Staff',
            });
          } catch (mirrorError) {
            console.log('Warning: Firestore mirror after fallback failed:', mirrorError);
          }
        } catch (cfFallbackError: any) {
          // Final fallback: use a secondary Firebase app instance to create Auth user without affecting current session
          console.log('Callable not found; using secondary app to create user.');
          const secondaryName = 'secondary-admin-app';
          const apps = getApps();
          const secondaryApp = apps.find(a => a.name === secondaryName) || initializeApp((getApp() as any).options, secondaryName);
          const secondaryAuth = getAuth(secondaryApp);

          const finalPassword = password || this.generateTemporaryPassword();
          const cred = await createUserWithEmailAndPassword(secondaryAuth, email.toLowerCase(), finalPassword);
          if (displayName) {
            await updateProfile(cred.user, { displayName });
          }

          // AUTOMATIC: Send email verification (non-blocking)
          try {
            await sendEmailVerification(cred.user);
            emailVerificationSent = true;
            console.log('Email verification sent to employee:', email);
          } catch (verificationError) {
            console.error('Failed to send email verification to employee:', verificationError);
          }

          // Sign out secondary session to avoid lingering state
          try { await signOut(secondaryAuth); } catch {}

          // Mirror metadata to Firestore and restaurant mapping
          const createdUid = cred.user.uid;
          const userDoc = doc(firestore, `users/${createdUid}`);
          await setDoc(userDoc, {
            uid: createdUid,
            email: email.toLowerCase(),
            role: (staffRole === 'manager') ? 'manager' : 'staff',
            restaurantId,
            displayName,
            createdAt: Date.now(),
            isActive: true,
            createdBy,
          }, { merge: true });

          const firestoreService = createFirestoreService(restaurantId);
          await (firestoreService as any).create('users', {
            id: createdUid,
            email: email.toLowerCase(),
            restaurantId,
            role: (staffRole === 'manager') ? 'Manager' : 'Staff',
          });

          response = { data: {
            uid: createdUid,
            email: email.toLowerCase(),
            displayName,
            password: finalPassword,
            role: (staffRole === 'manager') ? 'manager' : 'staff',
          }};
        }
      }

      const data = response.data || response; // compat
      const generatedPassword = data.password as string;
      const createdUid = data.uid as string;
      const effectiveRole = (data.role as any) || (staffRole === 'manager' ? 'manager' : 'staff');

      // Build compatible metadata object for the app
      const userMetadata: UserMetadata = {
        uid: createdUid,
        email: email.toLowerCase(),
        role: effectiveRole as any,
        restaurantId,
        displayName,
        createdAt: Date.now(),
        isActive: true,
        createdBy,
        photoURL: undefined,
      };

      return {
        credentials: { email: email.toLowerCase(), password: generatedPassword },
        userMetadata,
        emailVerificationSent,
      };
    } catch (error) {
      console.error('Create employee credentials error:', error);
      throw error;
    }
  }

  // Update user metadata
  async updateUserMetadata(uid: string, updates: Partial<UserMetadata>): Promise<void> {
    try {
      const userRef = doc(firestore, `users/${uid}`);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Update user metadata error:', error);
      throw error;
    }
  }

  // Fix owner role in restaurant users collection
  async fixOwnerRole(restaurantId: string, ownerUid: string): Promise<void> {
    try {
      const firestoreService = createFirestoreService(restaurantId);
      
      // Update the user document in the restaurant's users collection
      await firestoreService.update('users', ownerUid, {
        role: 'Owner'
      });
      
      console.log('✅ Fixed owner role for user:', ownerUid);
    } catch (error) {
      console.error('Error fixing owner role:', error);
      throw error;
    }
  }

  // Get user metadata
  async getUserMetadata(uid: string): Promise<UserMetadata | null> {
    try {
      console.log('Getting user metadata for UID:', uid);
      const userRef = doc(firestore, `users/${uid}`);
      const userSnap = await getDoc(userRef);
      
      console.log('User document exists:', userSnap.exists());
      if (userSnap.exists()) {
        const userData = { uid: userSnap.id, ...userSnap.data() } as UserMetadata;
        console.log('User metadata found:', userData);
        return userData;
      }
      console.log('User metadata not found in Firestore');
      return null;
    } catch (error) {
      console.error('Get user metadata error:', error);
      throw error;
    }
  }

  // Get user metadata by email
  async getUserMetadataByEmail(email: string): Promise<UserMetadata | null> {
    try {
      console.log('Getting user metadata for email:', email);
      const usersRef = collection(firestore, 'users');
      const lower = email.toLowerCase();

      // First attempt: query by lowercased email (preferred canonical form)
      let qTry = query(usersRef, where('email', '==', lower));
      let snap = await getDocs(qTry);
      if (!snap.empty) {
        const d = snap.docs[0];
        const userData = { uid: d.id, ...d.data() } as UserMetadata;
        console.log('User metadata found by email (lowercased match):', userData);
        return userData;
      }

      // Second attempt: query by the raw provided email (handles legacy mixed-case storage)
      if (lower !== email) {
        qTry = query(usersRef, where('email', '==', email));
        snap = await getDocs(qTry);
        if (!snap.empty) {
          const d = snap.docs[0];
          const userData = { uid: d.id, ...d.data() } as UserMetadata;
          console.log('User metadata found by email (raw match):', userData);
          return userData;
        }
      }

      // Final fallback: scan and compare case-insensitively client-side (rare, but resilient)
      const allSnap = await getDocs(usersRef);
      const found = allSnap.docs.find(docSnap => {
        const data = docSnap.data() as any;
        const e = (data.email || '').toString();
        return e.toLowerCase() === lower;
      });
      if (found) {
        const userData = { uid: found.id, ...found.data() } as UserMetadata;
        console.log('User metadata found by email (fallback scan):', userData);
        return userData;
      }

      console.log('User metadata not found for email:', email);
      return null;
    } catch (error) {
      console.error('Get user metadata by email error:', error);
      throw error;
    }
  }

  // Save user metadata
  private async saveUserMetadata(userMetadata: UserMetadata): Promise<void> {
    try {
      const userRef = doc(firestore, `users/${userMetadata.uid}`);
      await setDoc(userRef, {
        ...userMetadata,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Save user metadata error:', error);
      throw error;
    }
  }

  // Generate temporary password
  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      // Clear orders state locally to prevent cross-account leakage in UI
      this.dispatch(resetOrders());
      
      // Proactively stop all realtime listeners to avoid setState on unmounted screens
      try { stopRealtimeSync(); } catch {}
      
      // Clear any RTDB listeners if a service instance exists
      try { 
        const svc = getFirebaseService();
        (svc as any)?.removeAllListeners?.();
      } catch {}
      
      await signOut(auth);
      this.dispatch(logout());
    } catch (error) {
      console.error('Firebase sign out error:', error);
      throw error;
    }
  }

  // Listen to authentication state changes
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  // Get current user
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!auth.currentUser;
  }

  // Get current user metadata
  async getCurrentUserMetadata(): Promise<UserMetadata | null> {
    const user = this.getCurrentUser();
    if (!user) return null;
    return await this.getUserMetadata(user.uid);
  }

  // Check if current user is owner
  async isCurrentUserOwner(): Promise<boolean> {
    const metadata = await this.getCurrentUserMetadata();
    return metadata?.role === 'Owner' || false;
  }

  // Deactivate user account
  async deactivateUser(uid: string, deactivatedBy: string): Promise<void> {
    try {
      // Verify that the deactivator is an owner
      const deactivatorMetadata = await this.getUserMetadata(deactivatedBy);
      if (!deactivatorMetadata || (deactivatorMetadata.role !== 'Owner' && deactivatorMetadata.role !== 'manager')) {
        throw new Error('Only owners and managers can deactivate accounts');
      }

      await this.updateUserMetadata(uid, { isActive: false });
    } catch (error) {
      console.error('Deactivate user error:', error);
      throw error;
    }
  }

  // Reactivate user account
  async reactivateUser(uid: string, reactivatedBy: string): Promise<void> {
    try {
      // Verify that the reactivator is an owner
      const reactivatorMetadata = await this.getUserMetadata(reactivatedBy);
      if (!reactivatorMetadata || (reactivatorMetadata.role !== 'Owner' && reactivatorMetadata.role !== 'manager')) {
        throw new Error('Only owners and managers can reactivate accounts');
      }

      await this.updateUserMetadata(uid, { isActive: true });
    } catch (error) {
      console.error('Reactivate user error:', error);
      throw error;
    }
  }

  // Change user password
  async changePassword(newPassword: string): Promise<void> {
    try {
      const user = this.getCurrentUser();
      if (!user) throw new Error('No user logged in');

      // Note: In a real app, you'd use updatePassword from Firebase Auth
      // For now, we'll just log this action
      console.log('Password change requested for user:', user.uid);
      
      // In production, you'd implement proper password change logic
      // await updatePassword(user, newPassword);
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  // Update user password (Firebase Auth)
  async updatePassword(newPassword: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');

      await updatePassword(user, newPassword);
      console.log('Password updated successfully');
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('Password reset email sent to:', email);
    } catch (error: any) {
      console.error('Send password reset email error:', error);
      
      // Handle specific Firebase Auth errors
      switch (error.code) {
        case 'auth/user-not-found':
          throw new Error('No account found with this email address.');
        case 'auth/invalid-email':
          throw new Error('Please enter a valid email address.');
        case 'auth/too-many-requests':
          throw new Error('Too many password reset attempts. Please try again later.');
        case 'auth/network-request-failed':
          throw new Error('Network error. Please check your internet connection and try again.');
        default:
          throw new Error('Failed to send password reset email. Please try again.');
      }
    }
  }

  // Verify password reset code
  async verifyPasswordResetCode(code: string): Promise<string> {
    try {
      const email = await verifyPasswordResetCode(auth, code);
      console.log('Password reset code verified for email:', email);
      return email;
    } catch (error: any) {
      console.error('Verify password reset code error:', error);
      
      // Handle specific Firebase Auth errors
      switch (error.code) {
        case 'auth/invalid-action-code':
          throw new Error('Invalid or expired reset code. Please request a new password reset.');
        case 'auth/expired-action-code':
          throw new Error('Reset code has expired. Please request a new password reset.');
        case 'auth/user-disabled':
          throw new Error('This account has been disabled. Please contact support.');
        default:
          throw new Error('Invalid reset code. Please check your email and try again.');
      }
    }
  }

  // Confirm password reset with code
  async confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    try {
      await confirmPasswordReset(auth, code, newPassword);
      console.log('Password reset successful');
    } catch (error: any) {
      console.error('Confirm password reset error:', error);
      
      // Handle specific Firebase Auth errors
      switch (error.code) {
        case 'auth/invalid-action-code':
          throw new Error('Invalid or expired reset code. Please request a new password reset.');
        case 'auth/expired-action-code':
          throw new Error('Reset code has expired. Please request a new password reset.');
        case 'auth/weak-password':
          throw new Error('Password is too weak. Please choose a stronger password with at least 6 characters.');
        case 'auth/user-disabled':
          throw new Error('This account has been disabled. Please contact support.');
        default:
          throw new Error('Failed to reset password. Please try again.');
      }
    }
  }

  // Activate a user account (admin function)
  async activateUser(uid: string): Promise<void> {
    try {
      await this.updateUserMetadata(uid, { isActive: true });
      console.log('User account activated:', uid);
    } catch (error) {
      console.error('Error activating user account:', error);
      throw error;
    }
  }

  // Deactivate a user account (admin function)
  async deactivateUser(uid: string): Promise<void> {
    try {
      // First try to call the Cloud Function
      try {
        const deactivateUserFunction = httpsCallable(functions, 'deactivateUser');
        await deactivateUserFunction({ targetUid: uid });
        console.log('User account deactivated successfully via Cloud Function:', uid);
        return;
      } catch (functionError) {
        console.log('Cloud Function not available, using fallback method:', functionError.message);
        
        // Fallback: Update user metadata directly
        await this.updateUserMetadata(uid, { isActive: false });
        
        // Note: We can't disable Firebase Auth user without Cloud Functions
        // This is a limitation of the client-side SDK
        console.log('User account deactivated (metadata only):', uid);
        console.log('Note: Firebase Auth user is still enabled. Use Firebase Console to disable if needed.');
      }
      
    } catch (error) {
      console.error('Error deactivating user account:', error);
      throw error;
    }
  }

  // Delete a user account completely (admin function)
  async deleteUser(uid: string): Promise<void> {
    try {
      // Call the Cloud Function to completely delete the user
      const deleteUserFunction = httpsCallable(functions, 'deleteUser');
      await deleteUserFunction({ targetUid: uid });
      console.log('User account deleted permanently via Cloud Function:', uid);
      
    } catch (error) {
      console.error('Error deleting user account:', error);
      throw error;
    }
  }

  // Get all users for a restaurant (owner and manager only)
  async getRestaurantUsers(restaurantId: string, requesterUid: string): Promise<UserMetadata[]> {
    try {
      // Verify that the requester is an owner or manager
      const requesterMetadata = await this.getUserMetadata(requesterUid);
      if (!requesterMetadata || (requesterMetadata.role !== 'Owner' && requesterMetadata.role !== 'manager')) {
        throw new Error('Only owners and managers can view restaurant users');
      }

      // Get all users and filter by restaurant
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('restaurantId', '==', restaurantId));
      const querySnapshot = await getDocs(q);
      
      const users: UserMetadata[] = [];
      querySnapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() } as UserMetadata);
      });

      return users;

    } catch (error) {
      console.error('Get restaurant users error:', error);
      throw error;
    }
  }

  // ==================== EMAIL VERIFICATION METHODS ====================

  // Send email verification to current user
  async sendEmailVerification(): Promise<void> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        throw new Error('No user logged in');
      }

      if (user.emailVerified) {
        throw new Error('Email is already verified');
      }

      await sendEmailVerification(user);
      console.log('Email verification sent successfully');
    } catch (error) {
      console.error('Send email verification error:', error);
      throw error;
    }
  }

  // Send email verification to specific user (admin function)
  async sendEmailVerificationToUser(uid: string): Promise<void> {
    try {
      // This would typically be done via a Cloud Function for security
      // since we can't sign in as another user from the client
      const sendVerificationFn = httpsCallable(functions, 'sendEmailVerification');
      await sendVerificationFn({ targetUid: uid });
      console.log('Email verification sent to user:', uid);
    } catch (error) {
      console.error('Send email verification to user error:', error);
      throw error;
    }
  }

  // Check if current user's email is verified
  async isEmailVerified(): Promise<boolean> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        return false;
      }

      // Reload user to get latest verification status
      await reload(user);
      return user.emailVerified;
    } catch (error) {
      console.error('Check email verification error:', error);
      return false;
    }
  }

  // Verify email with action code (when user clicks verification link)
  async verifyEmail(actionCode: string): Promise<void> {
    try {
      // First check if the action code is valid
      await checkActionCode(auth, actionCode);
      
      // Apply the action code to verify the email
      await applyActionCode(auth, actionCode);
      
      console.log('Email verified successfully');
    } catch (error) {
      console.error('Verify email error:', error);
      throw error;
    }
  }

  // Check if action code is valid (before showing verification UI)
  async checkEmailVerificationCode(actionCode: string): Promise<{ valid: boolean; email?: string }> {
    try {
      const info = await checkActionCode(auth, actionCode);
      return {
        valid: true,
        email: info.data.email
      };
    } catch (error) {
      console.error('Check email verification code error:', error);
      return { valid: false };
    }
  }

  // Get email verification status for current user
  async getEmailVerificationStatus(): Promise<{
    isVerified: boolean;
    email: string | null;
    lastVerificationSent?: number;
  }> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        return { isVerified: false, email: null };
      }

      // Reload user to get latest verification status
      await reload(user);

      return {
        isVerified: user.emailVerified,
        email: user.email,
        lastVerificationSent: user.metadata.lastSignInTime ? 
          new Date(user.metadata.lastSignInTime).getTime() : undefined
      };
    } catch (error) {
      console.error('Get email verification status error:', error);
      return { isVerified: false, email: null };
    }
  }

  // Require email verification for login (enhanced sign in)
  async signInWithEmailVerification(email: string, password: string): Promise<{
    userMetadata: UserMetadata;
    emailVerified: boolean;
    requiresVerification: boolean;
  }> {
    try {
      // First, perform normal sign in
      const userMetadata = await this.signIn(email, password);
      
      // Check email verification status
      const verificationStatus = await this.getEmailVerificationStatus();
      
      return {
        userMetadata,
        emailVerified: verificationStatus.isVerified,
        requiresVerification: !verificationStatus.isVerified
      };
    } catch (error) {
      console.error('Sign in with email verification error:', error);
      throw error;
    }
  }

  // Create user with email verification requirement
  async createUserWithEmailVerification(
    email: string, 
    password: string, 
    displayName: string, 
    role: UserRole,
    restaurantId: string,
    createdBy: string,
    requireVerification: boolean = true
  ): Promise<{
    userMetadata: UserMetadata;
    emailVerificationSent: boolean;
  }> {
    try {
      // Create the user
      const userMetadata = await this.createUser(
        email, 
        password, 
        displayName, 
        role,
        restaurantId,
        createdBy
      );

      let emailVerificationSent = false;

      // Send email verification if required
      if (requireVerification) {
        try {
          await this.sendEmailVerification();
          emailVerificationSent = true;
        } catch (verificationError) {
          console.warn('Failed to send email verification:', verificationError);
          // Don't fail user creation if verification email fails
        }
      }

      return {
        userMetadata,
        emailVerificationSent
      };
    } catch (error) {
      console.error('Create user with email verification error:', error);
      throw error;
    }
  }

  // Resend email verification (with rate limiting)
  async resendEmailVerification(): Promise<void> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        throw new Error('No user logged in');
      }

      if (user.emailVerified) {
        throw new Error('Email is already verified');
      }

      // Check if we can resend (basic rate limiting)
      const lastSent = await this.getLastVerificationSentTime();
      const now = Date.now();
      const timeSinceLastSent = now - (lastSent || 0);
      
      // Rate limit: 1 minute between verification emails
      if (lastSent && timeSinceLastSent < 60000) {
        throw new Error('Please wait before requesting another verification email');
      }

      await sendEmailVerification(user);
      
      // Store the time this verification was sent
      await this.updateUserMetadata(user.uid, { 
        lastVerificationSent: now 
      });
      
      console.log('Email verification resent successfully');
    } catch (error) {
      console.error('Resend email verification error:', error);
      throw error;
    }
  }

  // Get last verification sent time
  private async getLastVerificationSentTime(): Promise<number | null> {
    try {
      const user = this.getCurrentUser();
      if (!user) return null;

      const metadata = await this.getUserMetadata(user.uid);
      return (metadata as any)?.lastVerificationSent || null;
    } catch (error) {
      console.error('Get last verification sent time error:', error);
      return null;
    }
  }
}

// Factory function to create enhanced auth service
export const createFirebaseAuthEnhanced = (dispatch: AppDispatch): FirebaseAuthEnhanced => {
  return new FirebaseAuthEnhanced(dispatch);
};

// Default enhanced auth service instance
export let firebaseAuthEnhanced: FirebaseAuthEnhanced | null = null;

export const initializeFirebaseAuthEnhanced = (dispatch: AppDispatch): FirebaseAuthEnhanced => {
  firebaseAuthEnhanced = new FirebaseAuthEnhanced(dispatch);
  return firebaseAuthEnhanced;
};

export const getFirebaseAuthEnhanced = (): FirebaseAuthEnhanced => {
  if (!firebaseAuthEnhanced) {
    throw new Error('Firebase auth enhanced not initialized. Call initializeFirebaseAuthEnhanced first.');
  }
  return firebaseAuthEnhanced;
};
