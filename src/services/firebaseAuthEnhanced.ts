import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User,
  updateProfile
} from 'firebase/auth';
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
};

export class FirebaseAuthEnhanced {
  private dispatch: AppDispatch;

  constructor(dispatch: AppDispatch) {
    this.dispatch = dispatch;
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<UserMetadata> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
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

      // Get restaurant info
      const firestoreService = createFirestoreService(userMetadata.restaurantId);
      const restaurantInfo = await firestoreService.getRestaurantInfo();
      
      // Dispatch login action
      const role = userMetadata.role === 'Owner' ? 'Owner' : 'Staff';
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
      
      this.dispatch(login({
        userName: userMetadata.displayName,
        role: role,
        userId: user.uid,
        restaurantId: userMetadata.restaurantId,
        restaurantName: restaurantInfo?.name || 'Restaurant',
        designation: userMetadata.designation
      }));
      
      console.log('✅ LOGIN DISPATCHED - Auth state should now have restaurantId:', userMetadata.restaurantId);

      return userMetadata;

    } catch (error) {
      console.error('Firebase sign in error:', error);
      throw error;
    }
  }

  // Create new user account (only for owners)
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
        if (!creatorMetadata || creatorMetadata.role !== 'Owner') {
          throw new Error('Only owners can create user accounts');
        }
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update user profile
      await updateProfile(user, { displayName });

      // Create user metadata
      const userMetadata: UserMetadata = {
        uid: user.uid,
        email: email.toLowerCase(),
        role: role === 'owner' ? 'Owner' : role, // Convert 'owner' to 'Owner'
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
      await firestoreService.create('users', {
        id: user.uid,
        email: email,
        restaurantId: restaurantId,
        role: role === 'owner' || role === 'Owner' ? 'Owner' : 'Staff'
      });

      return userMetadata;

    } catch (error) {
      console.error('Firebase create user error:', error);
      throw error;
    }
  }

  // Create employee credentials (owner only)
  async createEmployeeCredentials(
    email: string,
    displayName: string,
    restaurantId: string,
    createdBy: string,
    password?: string,
    staffRole?: 'manager' | 'staff'
  ): Promise<{ credentials: { email: string; password: string }; userMetadata: UserMetadata }> {
    try {
      // Verify that the creator is an owner
      const creatorMetadata = await this.getUserMetadata(createdBy);
      if (!creatorMetadata || creatorMetadata.role !== 'Owner') {
        throw new Error('Only owners can create employee accounts');
      }

      // Use provided password or generate temporary password
      const employeePassword = password || this.generateTemporaryPassword();

      // Create user account
      const userMetadata = await this.createUser(
        email,
        employeePassword,
        displayName,
        'employee',
        restaurantId,
        createdBy
      );

      // Persist staff role/designation accurately (Manager or Staff)
      const normalizedRole = (staffRole === 'manager') ? 'Manager' : 'Staff';
      try {
        await this.updateUserMetadata(userMetadata.uid, { designation: normalizedRole } as any);
      } catch (e) {
        console.warn('Failed to set designation on user metadata:', (e as Error).message);
      }

      // Update restaurant users mapping to reflect Manager/Staff instead of default
      try {
        const fs = createFirestoreService(restaurantId);
        await fs.update('users', userMetadata.uid, { role: normalizedRole } as any);
      } catch (e) {
        console.warn('Failed to update restaurant user role to', normalizedRole, ':', (e as Error).message);
      }

      return {
        credentials: { email, password: employeePassword },
        userMetadata
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
      if (!deactivatorMetadata || deactivatorMetadata.role !== 'Owner') {
        throw new Error('Only owners can deactivate accounts');
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
      if (!reactivatorMetadata || reactivatorMetadata.role !== 'Owner') {
        throw new Error('Only owners can reactivate accounts');
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

  // Get all users for a restaurant (owner only)
  async getRestaurantUsers(restaurantId: string, requesterUid: string): Promise<UserMetadata[]> {
    try {
      // Verify that the requester is an owner
      const requesterMetadata = await this.getUserMetadata(requesterUid);
      if (!requesterMetadata || requesterMetadata.role !== 'Owner') {
        throw new Error('Only owners can view restaurant users');
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
