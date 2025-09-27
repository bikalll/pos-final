import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getFirebaseAuthEnhanced } from '../../services/firebaseAuthEnhanced';

interface EmailVerificationLinkScreenProps {
  actionCode: string;
  onVerificationComplete: () => void;
  onVerificationFailed: (error: string) => void;
}

export const EmailVerificationLinkScreen: React.FC<EmailVerificationLinkScreenProps> = ({
  actionCode,
  onVerificationComplete,
  onVerificationFailed,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationInfo, setVerificationInfo] = useState<{
    valid: boolean;
    email?: string;
  }>({ valid: false });

  const authService = getFirebaseAuthEnhanced();

  useEffect(() => {
    checkVerificationCode();
  }, [actionCode]);

  const checkVerificationCode = async () => {
    try {
      setIsLoading(true);
      const info = await authService.checkEmailVerificationCode(actionCode);
      setVerificationInfo(info);
      
      if (!info.valid) {
        onVerificationFailed('Invalid or expired verification link');
      }
    } catch (error: any) {
      console.error('Error checking verification code:', error);
      onVerificationFailed(error.message || 'Invalid verification link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    try {
      setIsVerifying(true);
      await authService.verifyEmail(actionCode);
      
      Alert.alert(
        'Email Verified!',
        'Your email has been successfully verified. You can now access all features of the app.',
        [
          {
            text: 'Continue',
            onPress: onVerificationComplete,
          },
        ]
      );
    } catch (error: any) {
      console.error('Error verifying email:', error);
      onVerificationFailed(error.message || 'Failed to verify email');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Checking verification link...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!verificationInfo.valid) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="close-circle" size={80} color="#FF3B30" />
          </View>
          <Text style={styles.errorTitle}>Invalid Link</Text>
          <Text style={styles.errorText}>
            This verification link is invalid or has expired. Please request a new verification email.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => onVerificationFailed('Invalid link')}
          >
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail" size={80} color="#007AFF" />
          </View>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            Ready to verify your email address?
          </Text>
          {verificationInfo.email && (
            <Text style={styles.emailText}>{verificationInfo.email}</Text>
          )}
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            Click the button below to complete the email verification process.
            This will confirm that you own this email address and enable all app features.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleVerifyEmail}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Verify Email</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => onVerificationFailed('User cancelled')}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 10,
  },
  emailText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
  },
  instructionsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
  },
  instructionsText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
});

export default EmailVerificationLinkScreen;

