import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/storeFirebase';
import { initializeFirebaseService } from '../services/firebaseService';
import { initializeFirestoreService } from '../services/firestoreService';

/**
 * OfflineAuthHandler - Ensures app works offline with persisted login
 * This component handles authentication state restoration when the app starts
 */
const OfflineAuthHandler: React.FC = () => {
  const dispatch = useDispatch();
  const { isLoggedIn, restaurantId, userId } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const initializeOfflineAuth = async () => {
      try {
        // If user is logged in (from persisted state) but services aren't initialized
        if (isLoggedIn && restaurantId && userId) {
          console.log('🔄 OfflineAuthHandler: Restoring offline session...');
          console.log('  - Restaurant ID:', restaurantId);
          console.log('  - User ID:', userId);
          console.log('  - Is Logged In:', isLoggedIn);

          // Initialize Firebase service for offline functionality
          try {
            initializeFirebaseService(restaurantId);
            console.log('✅ OfflineAuthHandler: Firebase service initialized for offline mode');
          } catch (error) {
            console.warn('⚠️ OfflineAuthHandler: Firebase service initialization failed (offline mode):', error);
          }

          // Initialize Firestore service for offline functionality
          try {
            initializeFirestoreService(restaurantId);
            console.log('✅ OfflineAuthHandler: Firestore service initialized for offline mode');
          } catch (error) {
            console.warn('⚠️ OfflineAuthHandler: Firestore service initialization failed (offline mode):', error);
          }

          console.log('✅ OfflineAuthHandler: Offline session restored successfully');
        } else {
          console.log('🔍 OfflineAuthHandler: No persisted session found or incomplete auth data');
        }
      } catch (error) {
        console.error('❌ OfflineAuthHandler: Error during offline auth initialization:', error);
      }
    };

    initializeOfflineAuth();
  }, [isLoggedIn, restaurantId, userId, dispatch]);

  // This component doesn't render anything, it just handles side effects
  return null;
};

export default OfflineAuthHandler;
