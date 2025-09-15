import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/storeFirebase';

const NewOwnerRedirect: React.FC = () => {
  const navigation = useNavigation();
  const [hasChecked, setHasChecked] = useState(false);
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const role = useSelector((state: RootState) => state.auth.role);

  useEffect(() => {
    const checkNewOwnerRedirect = async () => {
      // Only check for owners who are logged in
      if (!isLoggedIn || role !== 'Owner' || hasChecked) {
        return;
      }

      try {
        const needsSetup = await AsyncStorage.getItem('newOwnerNeedsSetup');
        if (needsSetup === 'true') {
          console.log('Redirecting new owner to Office Management');
          // Clear the flag immediately to prevent repeated redirects
          await AsyncStorage.removeItem('newOwnerNeedsSetup');
          // Navigate to Office Management
          navigation.navigate('Settings' as any, { 
            screen: 'OfficeManagement' 
          } as any);
        }
      } catch (error) {
        console.error('Error checking new owner redirect:', error);
      } finally {
        setHasChecked(true);
      }
    };

    checkNewOwnerRedirect();
  }, [isLoggedIn, role, hasChecked, navigation]);

  // This component doesn't render anything
  return null;
};

export default NewOwnerRedirect;
