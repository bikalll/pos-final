import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEmailVerification } from '../hooks/useEmailVerification';

interface EmailVerificationBannerProps {
  onPress?: () => void;
  showResendButton?: boolean;
  compact?: boolean;
}

export const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  onPress,
  showResendButton = true,
  compact = false,
}) => {
  const { status, resendVerification, checkVerification } = useEmailVerification();

  // Don't show banner if email is verified or still loading
  if (status.isVerified || status.isLoading) {
    return null;
  }

  const handleResend = async () => {
    try {
      await resendVerification();
      Alert.alert(
        'Verification Email Sent',
        'A new verification email has been sent to your email address.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to resend verification email.',
        [{ text: 'OK' }]
      );
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Default action: check verification status
      checkVerification();
    }
  };

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactBanner} onPress={handlePress}>
        <Ionicons name="mail-unread" size={16} color="#FF9500" />
        <Text style={styles.compactText}>Verify your email</Text>
        <Ionicons name="chevron-forward" size={16} color="#FF9500" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.banner}>
      <View style={styles.bannerContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-unread" size={24} color="#FF9500" />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>Email Verification Required</Text>
          <Text style={styles.subtitle}>
            Please verify your email address to access all features
          </Text>
          {status.email && (
            <Text style={styles.emailText}>{status.email}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={handlePress}>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {showResendButton && (
        <View style={styles.resendContainer}>
          <TouchableOpacity style={styles.resendButton} onPress={handleResend}>
            <Ionicons name="refresh" size={16} color="#007AFF" />
            <Text style={styles.resendText}>Resend Email</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF4E6',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#FF9500',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 6,
    gap: 6,
  },
  resendText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 16,
    marginVertical: 4,
    gap: 8,
  },
  compactText: {
    flex: 1,
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '500',
  },
});

export default EmailVerificationBanner;

