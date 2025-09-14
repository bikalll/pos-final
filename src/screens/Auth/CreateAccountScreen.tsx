import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { colors, spacing, radius } from '../../theme';
import { getFirebaseAuthEnhanced, createFirebaseAuthEnhanced } from '../../services/firebaseAuthEnhanced';
import { createFirestoreService } from '../../services/firestoreService';
import { RootState } from '../../redux/storeFirebase';

type CreateAccountScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'CreateAccount'>;

const CreateAccountScreen: React.FC = () => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    restaurantName: '',
    restaurantAddress: '',
    restaurantPhone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const navigation = useNavigation<CreateAccountScreenNavigationProp>();
  const dispatch = useDispatch();
  const authState = useSelector((state: RootState) => state.auth);

  // Note: This screen is now accessible from login screen
  // The actual account creation will be handled by Cloud Functions
  // which will verify the creator's permissions

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (formData.displayName.trim().length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.restaurantName.trim()) {
      newErrors.restaurantName = 'Restaurant name is required';
    } else if (formData.restaurantName.trim().length < 2) {
      newErrors.restaurantName = 'Restaurant name must be at least 2 characters';
    }

    if (!formData.restaurantAddress.trim()) {
      newErrors.restaurantAddress = 'Restaurant address is required';
    } else if (formData.restaurantAddress.trim().length < 5) {
      newErrors.restaurantAddress = 'Please enter a complete address';
    }

    if (!formData.restaurantPhone.trim()) {
      newErrors.restaurantPhone = 'Restaurant phone is required';
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.restaurantPhone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.restaurantPhone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('Starting account creation process...');
      
      // Try to get the initialized service, or create one if not initialized
      let authService;
      try {
        authService = getFirebaseAuthEnhanced();
        console.log('Using existing Firebase auth enhanced service');
      } catch (error) {
        console.log('Firebase auth enhanced not initialized, creating new instance...');
        authService = createFirebaseAuthEnhanced(dispatch);
      }
      
      // Generate a unique restaurant ID
      const restaurantId = `restaurant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('Generated restaurant ID:', restaurantId);
      
      // Create the owner account
      console.log('Creating owner account...');
      const userMetadata = await authService.createUser(
        formData.email.trim().toLowerCase(),
        formData.password,
        formData.displayName.trim(),
        'owner',
        restaurantId,
        'system' // System-created account
      );
      console.log('Owner account created successfully:', userMetadata);

      // Create restaurant information
      console.log('Creating restaurant information...');
      const firestoreService = createFirestoreService(restaurantId);
      await firestoreService.createRestaurant({
        id: restaurantId,
        name: formData.restaurantName.trim(),
        address: formData.restaurantAddress.trim(),
        phone: formData.restaurantPhone.trim(),
        createdAt: Date.now(),
        isActive: true
      });
      console.log('Restaurant information created successfully');

      // Do not create default tables; user will add via Table Management

      Alert.alert(
        'Account Created Successfully!',
        `Owner account created for ${formData.displayName}. You can now login with your credentials.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setFormData({
                displayName: '',
                email: '',
                password: '',
                confirmPassword: '',
                restaurantName: '',
                restaurantAddress: '',
                restaurantPhone: '',
              });
              setErrors({});
              // Navigate back to login
              navigation.goBack();
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('Create account error:', error);
      
      let errorMessage = 'Failed to create account. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.message === 'Only owners can create user accounts') {
        errorMessage = 'Account creation failed. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.log('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      Alert.alert('Create Account Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderInput = (
    label: string,
    field: keyof typeof formData,
    placeholder: string,
    secureTextEntry = false,
    keyboardType: 'default' | 'email-address' | 'phone-pad' = 'default',
    autoCapitalize: 'none' | 'sentences' | 'words' = 'sentences'
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      {secureTextEntry ? (
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={formData[field]}
            onChangeText={(value) => handleInputChange(field, value)}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            secureTextEntry={field === 'password' ? !showPassword : !showConfirmPassword}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => {
              if (field === 'password') {
                setShowPassword(!showPassword);
              } else {
                setShowConfirmPassword(!showConfirmPassword);
              }
            }}
            disabled={isLoading}
          >
            <Text style={styles.eyeButtonText}>
              {field === 'password' 
                ? (showPassword ? '👁️' : '👁️‍🗨️')
                : (showConfirmPassword ? '👁️' : '👁️‍🗨️')
              }
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TextInput
          style={[styles.input, errors[field] && styles.inputError]}
          value={formData[field]}
          onChangeText={(value) => handleInputChange(field, value)}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={!isLoading}
        />
      )}
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  // Remove the access denied check since this is now accessible from login screen

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Owner Account</Text>
            <Text style={styles.subtitle}>Set up your restaurant and owner account</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Owner Information</Text>
            {renderInput('Full Name', 'displayName', 'Enter your full name')}
            {renderInput('Email Address', 'email', 'Enter your email address', false, 'email-address', 'none')}
            {renderInput('Password', 'password', 'Create a password', true, 'default', 'none')}
            {renderInput('Confirm Password', 'confirmPassword', 'Confirm your password', true, 'default', 'none')}

            <Text style={styles.sectionTitle}>Restaurant Information</Text>
            {renderInput('Restaurant Name', 'restaurantName', 'Enter restaurant name')}
            {renderInput('Restaurant Address', 'restaurantAddress', 'Enter complete address')}
            {renderInput('Restaurant Phone', 'restaurantPhone', 'Enter phone number', false, 'phone-pad')}

            <TouchableOpacity 
              style={[styles.createButton, isLoading && styles.createButtonDisabled]} 
              onPress={handleCreateAccount}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.createButtonText}>Creating Owner Account...</Text>
                </View>
              ) : (
                <Text style={styles.createButtonText}>Create Owner Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              You will be able to sign in with these credentials and manage your restaurant.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: spacing.xl,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  accessDeniedText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.danger,
    marginBottom: spacing.md,
  },
  accessDeniedSubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingBottom: spacing.xs,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: radius.md,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#2a2a2a',
    color: 'white',
  },
  inputError: {
    borderColor: colors.danger,
    borderWidth: 2,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: radius.md,
    backgroundColor: '#2a2a2a',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: 'white',
  },
  eyeButton: {
    padding: 16,
  },
  eyeButtonText: {
    fontSize: 16,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default CreateAccountScreen;
