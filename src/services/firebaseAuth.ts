import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './firebase';
import { createFirebaseService, initializeFirebaseService } from './firebaseService';
import { AppDispatch } from '../redux/store';
import { login, logout, setRestaurant } from '../redux/slices/authSlice';

export class FirebaseAuthService {
  private dispatch: AppDispatch;

  constructor(dispatch: AppDispatch) {
    this.dispatch = dispatch;
  }

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<void> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get user's restaurant information
      const firebaseService = createFirebaseService('temp'); // Temporary service to get user data
      const restaurantId = await firebaseService.getUserRestaurant(user.uid);
      
      if (!restaurantId) {
        throw new Error('User not associated with any restaurant');
      }

      // Initialize Firebase service with restaurant ID
      initializeFirebaseService(restaurantId);

      // Get restaurant info
      const restaurantInfo = await firebaseService.getRestaurantInfo();
      
      // Dispatch login action
      this.dispatch(login({
        userName: user.displayName || user.email || 'User',
        userId: user.uid,
        restaurantId: restaurantId,
        restaurantName: restaurantInfo?.name || 'Restaurant',
        logoUrl: restaurantInfo?.logoUrl,
        panVatImageUrl: restaurantInfo?.panVatImageUrl
      }));

    } catch (error) {
      console.error('Firebase sign in error:', error);
      throw error;
    }
  }

  // Create new user account
  async signUp(email: string, password: string, userName: string, restaurantId?: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // If restaurantId is provided, associate user with restaurant
      if (restaurantId) {
        const firebaseService = createFirebaseService(restaurantId);
        await firebaseService.createRestaurantUser({
          id: user.uid,
          email: email,
          restaurantId: restaurantId,
          role: 'Staff'
        });

        // Initialize Firebase service
        initializeFirebaseService(restaurantId);

        // Get restaurant info
        const restaurantInfo = await firebaseService.getRestaurantInfo();

        // Dispatch login action
        this.dispatch(login({
          userName: userName,
          userId: user.uid,
          restaurantId: restaurantId,
          restaurantName: restaurantInfo?.name || 'Restaurant',
          logoUrl: restaurantInfo?.logoUrl,
          panVatImageUrl: restaurantInfo?.panVatImageUrl
        }));
      } else {
        // Just sign up without restaurant association
        this.dispatch(login({
          userName: userName,
          userId: user.uid
        }));
      }

    } catch (error) {
      console.error('Firebase sign up error:', error);
      throw error;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
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
}

// Factory function to create auth service
export const createFirebaseAuthService = (dispatch: AppDispatch): FirebaseAuthService => {
  return new FirebaseAuthService(dispatch);
};
