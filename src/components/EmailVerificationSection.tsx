import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFirebaseAuthEnhanced } from '../services/firebaseAuthEnhanced';
import { useEmailVerification } from '../hooks/useEmailVerification';

interface EmailVerificationSectionProps {
  onVerificationComplete?: () => void;
}

export const EmailVerificationSection: React.FC<EmailVerificationSectionProps> = ({
  onVerificationComplete,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeUntilResend, setTimeUntilResend] = useState(0);

  const { status, resendVerification, checkVerification } = useEmailVerification();
  const authService = getFirebaseAuthEnhanced();

  useEffect(() => {
    startResendTimer();
  }, []);

  const startResendTimer = () => {
    const timer = setInterval(() => {
      setTimeUntilResend(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Set initial timer (1 minute cooldown)
    setTimeUntilResend(60);
  };

  const handleCheckVerification = async () => {
    try {
      setIsChecking(true);
      await checkVerification();
      
      if (status.isVerified) {
        Alert.alert(
          'Email Verified!',
          'Your email address has been successfully verified.',
          [{ text: 'OK', onPress: onVerificationComplete }]
        );
      } else {
        Alert.alert(
          'Email Not Verified',
          'Your email address is still not verified. Please check your email and click the verification link.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to check verification status. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsChecking(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setIsResending(true);
      await resendVerification();
      
      Alert.alert(
        'Verification Email Sent',
        'A new verification email has been sent to your email address. Please check your inbox and spam folder.',
        [{ text: 'OK' }]
      );
      
      // Reset timer
      setTimeUntilResend(60);
      startResendTimer();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to resend verification email. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleOpenEmailApp = () => {
    if (status.email) {
      const emailUrl = `mailto:${status.email}`;
      Linking.openURL(emailUrl).catch(() => {
        Alert.alert(
          'Cannot Open Email',
          'Please manually open your email app and check for the verification email.',
          [{ text: 'OK' }]
        );
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons 
          name={status.isVerified ? "checkmark-circle" : "mail-unread"} 
          size={24} 
          color={status.isVerified ? "#34C759" : "#FF9500"} 
        />
        <Text style={styles.title}>Email Verification</Text>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {status.isVerified ? 'Verified' : 'Not Verified'}
        </Text>
        {status.email && (
          <Text style={styles.emailText}>{status.email}</Text>
        )}
      </View>

      {!status.isVerified && (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>To verify your email:</Text>
          <View style={styles.stepContainer}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Check your email inbox (and spam folder)</Text>
          </View>
          <View style={styles.stepContainer}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Click the verification link in the email</Text>
          </View>
          <View style={styles.stepContainer}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Return here and tap "Check Verification"</Text>
          </View>
        </View>
      )}

      <View style={styles.buttonContainer}>
        {!status.isVerified ? (
          <>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCheckVerification}
              disabled={isChecking}
            >
              {isChecking ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Check Verification</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleOpenEmailApp}
            >
              <Ionicons name="mail" size={20} color="#007AFF" />
              <Text style={styles.secondaryButtonText}>Open Email App</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.resendButton,
                timeUntilResend > 0 && styles.resendButtonDisabled
              ]}
              onPress={handleResendVerification}
              disabled={isResending || timeUntilResend > 0}
            >
              {isResending ? (
                <ActivityIndicator color="#007AFF" size="small" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color="#007AFF" />
                  <Text style={styles.resendButtonText}>
                    {timeUntilResend > 0 
                      ? `Resend in ${formatTime(timeUntilResend)}`
                      : 'Resend Verification Email'
                    }
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.verifiedContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#34C759" />
            <Text style={styles.verifiedText}>Email Verified!</Text>
            <Text style={styles.verifiedSubtext}>
              Your email address has been successfully verified.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 12,
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  instructionsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
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
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  verifiedContainer: {
    alignItems: 'center',
    padding: 20,
  },
  verifiedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34C759',
    marginTop: 12,
    marginBottom: 8,
  },
  verifiedSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
});

export default EmailVerificationSection;
