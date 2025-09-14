import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius } from '../theme';
import { RootState } from '../redux/storeFirebase';
import { logout } from '../redux/slices/authSlice';
import { getFirebaseAuthEnhanced } from '../services/firebaseAuthEnhanced';

const LogoutTest: React.FC = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const auth = useSelector((state: RootState) => state.auth);

  const handleLogout = async () => {
    Alert.alert(
      'Logout Test',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Starting logout process...');
              
              // Use Firebase authentication service for logout
              const authService = getFirebaseAuthEnhanced();
              await authService.signOut();
              
              console.log('Firebase logout successful');
              
              // RootNavigator will automatically handle navigation to Auth screen based on isLoggedIn state
              console.log('Navigation will be handled automatically by RootNavigator');
              
            } catch (error) {
              console.error('Logout error:', error);
              
              // Even if Firebase logout fails, still clear local state
              dispatch(logout());
              // RootNavigator will automatically handle navigation to Auth screen based on isLoggedIn state
              
              console.log('Fallback logout completed');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Logout Test</Text>
      <Text style={styles.subtitle}>Current User: {auth?.userName || 'Not logged in'}</Text>
      <Text style={styles.subtitle}>Role: {auth?.role || 'Unknown'}</Text>
      <Text style={styles.subtitle}>Restaurant: {auth?.restaurantName || 'Unknown'}</Text>
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Test Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  logoutButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LogoutTest;
