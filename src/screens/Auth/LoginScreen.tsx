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
import { login } from '../../redux/slices/authSlice';
import { colors, spacing, radius } from '../../theme';
import { getFirebaseAuthEnhanced, createFirebaseAuthEnhanced } from '../../services/firebaseAuthEnhanced';
import { RootState } from '../../redux/storeFirebase';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const dispatch = useDispatch();
  const authState = useSelector((state: RootState) => state.auth);

  // Check if user is already logged in
  useEffect(() => {
    if (authState.isLoggedIn) {
      // User is already logged in, navigate to main app
      // This would typically navigate to the main dashboard
      console.log('User already logged in:', authState.userName);
    }
  }, [authState.isLoggedIn]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔐 Login attempt started for email:', email);
      
      // Try to get the initialized service, or create one if not initialized
      let authService;
      try {
        authService = getFirebaseAuthEnhanced();
        console.log('✅ Firebase auth enhanced service found');
      } catch (error) {
        console.log('⚠️ Firebase auth enhanced not initialized, creating new instance...', error);
        authService = createFirebaseAuthEnhanced(dispatch);
        console.log('✅ Firebase auth enhanced service created');
      }
      
      console.log('🔐 Attempting to sign in...');
      const userMetadata = await authService.signIn(email.trim(), password);
      console.log('✅ Sign in successful, user metadata:', userMetadata);
      
      // Verify that the user is an owner only (managers and employees should use employee login)
      if (userMetadata.role !== 'Owner') {
        // Sign out the user immediately since they're not authorized
        await authService.signOut();
        if (userMetadata.role === 'manager') {
          throw new Error('This is a manager account. Please use the employee login instead.');
        } else if (userMetadata.role === 'employee' || userMetadata.role === 'staff') {
          throw new Error('This is an employee account. Please use the employee login instead.');
        } else {
          throw new Error('This account is not authorized. Please contact support.');
        }
      }
      
      // Login successful - user is automatically logged in via Redux
      console.log('Owner login successful:', userMetadata);
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
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
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password.';
      } else if (error.message === 'User metadata not found') {
        errorMessage = 'Account not properly set up. Please contact your administrator.';
      } else if (error.message === 'Account is deactivated') {
        errorMessage = 'Your account has been deactivated. Please contact your administrator.';
      } else if (error.message === 'This is an employee account. Please use the employee login instead.') {
        errorMessage = 'This is an employee account. Please use the employee login instead.';
      } else if (error.message === 'This account is not an owner account. Please contact support.') {
        errorMessage = 'This account is not an owner account. Please contact support.';
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

  const handleCreateAccount = () => {
    // Navigate to create account screen
    navigation.navigate('CreateAccount' as any);
  };

  const handleEmployeeLogin = () => {
    // Navigate to employee login screen
    navigation.navigate('EmployeeLogin' as any);
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
          <Text style={styles.subtitle}>Restaurant Management System</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
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
              <Text style={styles.loginButtonText}>Sign In as Owner</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.secondaryButton, isLoading && styles.secondaryButtonDisabled]} 
            onPress={handleEmployeeLogin}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Login as Employee</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleCreateAccount} disabled={isLoading}>
            <Text style={styles.createAccountLink}>Create New Account</Text>
          </TouchableOpacity>
          <Text style={styles.footerText}>
            Need help? Contact your restaurant administrator.
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
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  footer: {
    alignItems: 'center',
  },
  createAccountLink: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginBottom: spacing.sm,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  signupLink: {
    color: colors.textMuted,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
