import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../redux/storeFirebase';
import { initializeFirebaseAuthEnhanced } from '../services/firebaseAuthEnhanced';
import { testFirestoreConnection } from '../services/firebase';
import { createFirestoreService } from '../services/firestoreService';
import { initializeRealtimeSync } from '../services/realtimeSyncService';
import { initializeReceiptSync } from '../services/receiptSyncService';
import { initializeAutoReceiptService, clearAutoReceiptService } from '../services/autoReceiptService';
import { initializeFirebaseService } from '../services/firebaseService';
import { NavigationContainerRefWithCurrent } from '@react-navigation/native';

const AppInitializer: React.FC = () => {
  const dispatch = useDispatch();
  const tableIds = useSelector((state: RootState) => state.tables.tableIds);
  const restaurantId = useSelector((state: RootState) => state.auth.restaurantId);
  const role = useSelector((state: RootState) => state.auth.role);
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);

  // Initialize Firebase Auth Enhanced service (always needed for login)
  useEffect(() => {
    try {
      console.log('AppInitializer: Initializing Firebase Auth Enhanced service');
      initializeFirebaseAuthEnhanced(dispatch);
    } catch (error) {
      console.error('Error initializing Firebase Auth Enhanced:', error);
    }
  }, [dispatch]);

  useEffect(() => {
    const initializeApp = async () => {
      // Only initialize other services if user is logged in
      if (!isLoggedIn) {
        console.log('AppInitializer: User not logged in, skipping other services initialization');
        return;
      }

      // Test Firebase Firestore connection
      try {
        const isConnected = await testFirestoreConnection();
        if (!isConnected) {
          console.warn('Firebase Firestore connection failed');
        }
      } catch (error) {
        console.error('Firebase Firestore connection error:', error);
      }

      // Do not auto-create default tables; new accounts should start with none

      // Do not auto-create default menu items

      // Initialize real-time sync for customers and receipts
      try {
        if (restaurantId) {
          // Initialize Firebase service
          initializeFirebaseService(restaurantId);
          
          initializeRealtimeSync(restaurantId);
          initializeReceiptSync(restaurantId);
          initializeAutoReceiptService(restaurantId);
          // If owner, check office info and navigate to OfficeManagement if missing
          if (role === 'Owner') {
            try {
              const fs = createFirestoreService(restaurantId);
              const info = await fs.getRestaurantInfo();
              if (!info || !info.name || !info.ownerName) {
                // Set a flag in AsyncStorage to indicate new owner needs setup
                await AsyncStorage.setItem('newOwnerNeedsSetup', 'true');
                console.log('New owner detected - needs restaurant setup');
              } else {
                // Clear the flag if restaurant info is complete
                await AsyncStorage.removeItem('newOwnerNeedsSetup');
              }
            } catch (e) {
              console.error('Error checking restaurant info:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing sync services:', error);
      }
    };

    initializeApp();
  }, [dispatch, tableIds.length, isLoggedIn]);

  // Re-initialize services when restaurantId changes
  useEffect(() => {
    if (restaurantId && isLoggedIn) {
      try {
        // Clear old services first
        clearAutoReceiptService();
        
        // Re-initialize Firebase service with new restaurantId
        initializeFirebaseService(restaurantId);
        
        // Re-initialize with new restaurantId
        initializeRealtimeSync(restaurantId);
        initializeReceiptSync(restaurantId);
        initializeAutoReceiptService(restaurantId);
      } catch (error) {
        console.error('Error re-initializing services:', error);
      }
    }
  }, [restaurantId, isLoggedIn]);

  return null; // This component doesn't render anything
};

export default AppInitializer;

