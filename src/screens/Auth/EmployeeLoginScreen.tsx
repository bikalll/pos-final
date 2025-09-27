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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { colors, spacing, radius } from '../../theme';
import { getFirebaseAuthEnhanced, createFirebaseAuthEnhanced } from '../../services/firebaseAuthEnhanced';
import { RootState } from '../../redux/storeFirebase';
import EmailVerificationDialog from '../../components/EmailVerificationDialog';

type EmployeeLoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'EmployeeLogin'>;

const EmployeeLoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const navigation = useNavigation<EmployeeLoginScreenNavigationProp>();
  const dispatch = useDispatch();
  const authState = useSelector((state: RootState) => state.auth);

  // Check if user is already logged in
  useEffect(() => {
    if (authState.isLoggedIn) {
      // User is already logged in, navigate to main app
      console.log('User already logged in:', authState.userName);
      // Navigation will be handled by RootNavigator based on auth state
    }
  }, [authState.isLoggedIn]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim() || !ownerEmail.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!ownerEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid owner email address');
      return;
    }

    setIsLoading(true);

    try {
      // Try to get the initialized service, or create one if not initialized
      let authService;
      try {
        authService = getFirebaseAuthEnhanced();
      } catch (error) {
        console.log('Firebase auth enhanced not initialized, creating new instance...');
        authService = createFirebaseAuthEnhanced(dispatch);
      }
      
      // First, validate the owner's email exists and get their restaurant ID
      const ownerMetadata = await authService.getUserMetadataByEmail(ownerEmail);
      if (!ownerMetadata) {
        throw new Error('Owner account not found. Please check the owner\'s email address.');
      }
      
      if (ownerMetadata.role !== 'Owner') {
        throw new Error('The specified email does not belong to an owner account.');
      }
      
      const ownerRestaurantId = ownerMetadata.restaurantId;
      if (!ownerRestaurantId) {
        throw new Error('Owner account is not properly configured with a restaurant.');
      }
      
      // Now try to login the employee
      const userMetadata = await authService.signIn(email.trim(), password);
      
      // Verify that the employee belongs to the specified owner's restaurant
      if (!userMetadata.restaurantId) {
        throw new Error('Employee account not properly configured');
      }
      
      if (userMetadata.restaurantId !== ownerRestaurantId) {
        // Sign out the user immediately since they don't belong to this restaurant
        await authService.signOut();
        throw new Error('Employee does not belong to the specified owner\'s restaurant');
      }
      
      // Verify the user is not an owner (owners should use main login screen)
      if (userMetadata.role === 'Owner') {
        // Sign out the user immediately since they're an owner
        await authService.signOut();
        throw new Error('This is an owner account. Please use the main login screen instead.');
      }
      
      // Allow managers, staff, and employees to proceed
      if (userMetadata.role !== 'manager' && userMetadata.role !== 'staff' && userMetadata.role !== 'employee') {
        // Sign out the user immediately since they're not authorized
        await authService.signOut();
        throw new Error('This account is not authorized for employee login. Please contact your administrator.');
      }
      
      // Login successful - user is already logged in via Redux
      console.log('Employee login successful:', userMetadata);
      console.log('Employee role:', userMetadata.role);
      console.log('Restaurant ID:', userMetadata.restaurantId);
      console.log('Owner verified:', ownerMetadata.email);
      
    } catch (error: any) {
      console.error('Employee login error:', error);
      
      // Handle email verification requirement
      if (error.message === 'EMAIL_VERIFICATION_REQUIRED') {
        setVerificationEmail(email.trim());
        setShowVerificationDialog(true);
        setIsLoading(false);
        return;
      }
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.message === 'User metadata not found') {
        errorMessage = 'Account not properly set up. Please contact your administrator.';
      } else if (error.message === 'Account is deactivated') {
        errorMessage = 'Your account has been deactivated. Please contact your administrator.';
      } else if (error.message === 'Owner account not found. Please check the owner\'s email address.') {
        errorMessage = 'Owner account not found. Please check the owner\'s email address.';
      } else if (error.message === 'The specified email does not belong to an owner account.') {
        errorMessage = 'The specified email does not belong to an owner account.';
      } else if (error.message === 'Owner account is not properly configured with a restaurant.') {
        errorMessage = 'Owner account is not properly configured. Please contact support.';
      } else if (error.message === 'Employee does not belong to the specified owner\'s restaurant') {
        errorMessage = 'You are not authorized to access this restaurant. Please check the owner email.';
      } else if (error.message === 'Employee account not properly configured') {
        errorMessage = 'Your account is not properly configured. Please contact your administrator.';
      } else if (error.message === 'This is an owner account. Please use the owner login instead.') {
        errorMessage = 'This is an owner account. Please use the owner login instead.';
      } else if (error.message === 'This account is not an employee account. Please use the owner login instead.') {
        errorMessage = 'This account is not an employee account. Please use the owner login instead.';
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Please contact your restaurant administrator to reset your password.',
      [{ text: 'OK' }]
    );
  };

  const handleBackToOwnerLogin = () => {
    navigation.goBack();
  };

  const handleCloseVerificationDialog = () => {
    setShowVerificationDialog(false);
    setVerificationEmail('');
  };

  const handleRetryLogin = () => {
    // Retry the login process
    handleLogin();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image source={require('../../../logo.png')} style={styles.logoImage} />
            </View>
            <Text style={styles.title}>Arbi POS</Text>
            <Text style={styles.subtitle}>Employee Login</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Owner's Email</Text>
              <TextInput
                style={styles.input}
                value={ownerEmail}
                onChangeText={setOwnerEmail}
                placeholder="Enter owner's email address"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.passwordHeader}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity onPress={handleForgotPassword} disabled={isLoading}>
                  <Text style={styles.forgotPassword}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Text style={styles.eyeButtonText}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.loginButtonText}>Signing In...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Sign In as Employee</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.backButton, isLoading && styles.backButtonDisabled]} 
              onPress={handleBackToOwnerLogin}
              disabled={isLoading}
            >
              <Text style={styles.backButtonText}>Back to Owner Login</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Need help? Contact your restaurant administrator.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      <EmailVerificationDialog
        visible={showVerificationDialog}
        email={verificationEmail}
        onClose={handleCloseVerificationDialog}
        onRetryLogin={handleRetryLogin}
      />
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
    justifyContent: 'center',
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    // container for spacing only; no background or fixed size
    marginBottom: spacing.md,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  logoImage: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  form: {
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  forgotPassword: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
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
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.textSecondary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButtonDisabled: {
    opacity: 0.6,
  },
  backButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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

export default EmployeeLoginScreen;
