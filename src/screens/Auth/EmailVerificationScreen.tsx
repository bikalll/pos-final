import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createFirebaseAuthEnhanced } from '../../services/firebaseAuthEnhanced';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../redux/storeFirebase';

interface EmailVerificationScreenProps {
  navigation: any;
  route: {
    params: {
      email: string;
      token?: string;
    };
  };
}

const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ navigation, route }) => {
  const [email, setEmail] = useState(route.params?.email || '');
  const [verificationToken, setVerificationToken] = useState(route.params?.token || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState('');

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // If token is provided in route params, automatically verify
    if (route.params?.token) {
      handleVerifyEmail(route.params.token);
    }
  }, [route.params?.token]);

  const handleVerifyEmail = async (token?: string) => {
    const tokenToUse = token || verificationToken;
    
    if (!tokenToUse.trim()) {
      Alert.alert('Error', 'Please enter a verification token');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const authService = createFirebaseAuthEnhanced(dispatch);
      await authService.verifyEmail(tokenToUse);
      
      setVerificationStatus('success');
      Alert.alert(
        'Success',
        'Your email has been verified successfully! You can now log in.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    } catch (error: any) {
      console.error('Email verification error:', error);
      setVerificationStatus('error');
      
      let errorMessage = 'Failed to verify email. Please try again.';
      if (error.message?.includes('Invalid verification token')) {
        errorMessage = 'Invalid verification token. Please check your email for the correct link.';
      } else if (error.message?.includes('expired')) {
        errorMessage = 'Verification token has expired. Please request a new one.';
      }
      
      setErrorMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsResending(true);
    setErrorMessage('');

    try {
      const authService = createFirebaseAuthEnhanced(dispatch);
      await authService.resendVerificationEmail(email);
      
      Alert.alert(
        'Success',
        'A new verification email has been sent to your email address. Please check your inbox.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Resend verification error:', error);
      
      let errorMessage = 'Failed to resend verification email. Please try again.';
      
      // Handle different error types
      if (error.code === 'functions/not-found' || error.message?.includes('not found') || error.message?.includes('User not found')) {
        errorMessage = 'No account found with this email address. Please check your email or create a new account.';
      } else if (error.code === 'functions/already-exists' || error.message?.includes('already verified')) {
        errorMessage = 'Your email is already verified. You can now log in.';
      } else if (error.code === 'functions/invalid-argument') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'functions/internal') {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      setErrorMessage(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const handleOpenEmailApp = () => {
    Linking.openURL('mailto:');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Email Verification</Text>
        </View>

        <View style={styles.content}>
          {verificationStatus === 'success' ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
              <Text style={styles.successTitle}>Email Verified!</Text>
              <Text style={styles.successMessage}>
                Your email has been successfully verified. You can now log in to your account.
              </Text>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.loginButtonText}>Go to Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.iconContainer}>
                <Ionicons name="mail" size={80} color="#007bff" />
              </View>

              <Text style={styles.subtitle}>
                Verify Your Email Address
              </Text>

              <Text style={styles.description}>
                We've sent a verification link to your email address. Please check your inbox and click the verification link, or enter the verification token below.
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!route.params?.email}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Verification Token</Text>
                <TextInput
                  style={styles.input}
                  value={verificationToken}
                  onChangeText={setVerificationToken}
                  placeholder="Enter verification token from email"
                  autoCapitalize="none"
                />
              </View>

              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.verifyButton, isLoading && styles.disabledButton]}
                onPress={() => handleVerifyEmail()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify Email</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resendButton, isResending && styles.disabledButton]}
                onPress={handleResendVerification}
                disabled={isResending}
              >
                {isResending ? (
                  <ActivityIndicator color="#007bff" />
                ) : (
                  <Text style={styles.resendButtonText}>Resend Verification Email</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.emailButton}
                onPress={handleOpenEmailApp}
              >
                <Ionicons name="mail-outline" size={20} color="#007bff" />
                <Text style={styles.emailButtonText}>Open Email App</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToLoginButton}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.backToLoginText}>Back to Login</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  verifyButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  resendButtonText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: '600',
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  emailButtonText: {
    color: '#007bff',
    fontSize: 16,
    marginLeft: 8,
  },
  backToLoginButton: {
    paddingVertical: 12,
  },
  backToLoginText: {
    color: '#666',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 20,
    marginBottom: 15,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmailVerificationScreen;
