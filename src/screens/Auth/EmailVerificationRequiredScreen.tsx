import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getFirebaseAuthEnhanced } from '../../services/firebaseAuthEnhanced';

interface EmailVerificationRequiredScreenProps {
  email: string;
  onVerificationComplete: () => void;
  onResendVerification: () => void;
  onLogout: () => void;
  onAccessSettings?: () => void; // New prop to access settings
}

export const EmailVerificationRequiredScreen: React.FC<EmailVerificationRequiredScreenProps> = ({
  email,
  onVerificationComplete,
  onResendVerification,
  onLogout,
  onAccessSettings,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeUntilResend, setTimeUntilResend] = useState(0);

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
      setIsLoading(true);
      const isVerified = await authService.isEmailVerified();
      
      if (isVerified) {
        // Email verified - automatically proceed to main app
        Alert.alert(
          'Email Verified!',
          'Your email has been successfully verified. You can now access all features.',
          [
            {
              text: 'Continue',
              onPress: () => {
                onVerificationComplete();
              }
            }
          ]
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
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setIsResending(true);
      await authService.resendEmailVerification();
      
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
    const emailUrl = `mailto:${email}`;
    Linking.openURL(emailUrl).catch(() => {
      Alert.alert(
        'Cannot Open Email',
        'Please manually open your email app and check for the verification email.',
        [{ text: 'OK' }]
      );
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? You will need to verify your email before logging in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail-unread" size={50} color="#FF9500" />
          </View>
          <Text style={styles.title}>Email Verification Required</Text>
          <Text style={styles.subtitle}>
            You must verify your email address before you can access the app.
          </Text>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={24} color="#FF9500" />
            <Text style={styles.warningText}>
              Your account has been created, but you cannot log in until your email is verified.
            </Text>
          </View>

          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>To verify your email:</Text>
            <View style={styles.stepContainer}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>
                Check your email inbox (and spam folder)
              </Text>
            </View>
            <View style={styles.stepContainer}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                Click the verification link in the email
              </Text>
            </View>
            <View style={styles.stepContainer}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>
                Return to this app and tap "I've Verified"
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCheckVerification}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>I've Verified My Email</Text>
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

            {onAccessSettings && (
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={onAccessSettings}
              >
                <Ionicons name="settings" size={16} color="#007AFF" />
                <Text style={styles.settingsButtonText}>Access Settings</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out" size={16} color="#FF3B30" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF4E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF4E6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '500',
    lineHeight: 20,
  },
  instructionsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
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
    marginRight: 10,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resendButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  settingsButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  settingsButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default EmailVerificationRequiredScreen;
