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

interface OptionalEmailVerificationBannerProps {
  onPress?: () => void;
  showResendButton?: boolean;
  compact?: boolean;
}

export const OptionalEmailVerificationBanner: React.FC<OptionalEmailVerificationBannerProps> = ({
  onPress,
  showResendButton = true,
  compact = false,
}) => {
  const { status, resendVerification } = useEmailVerification();

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
      Alert.alert(
        'Email Verification',
        'We\'ve sent a verification email to your address. Please check your inbox and click the verification link when convenient.',
        [{ text: 'OK' }]
      );
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
        
        <TouchableOpacity style={styles.textContainer} onPress={handlePress}>
          <Text style={styles.title}>Email Verification Pending</Text>
          <Text style={styles.subtitle}>
            Check your email for a verification link
          </Text>
          {status.email && (
            <Text style={styles.emailText}>{status.email}</Text>
          )}
        </TouchableOpacity>

        {showResendButton && (
          <TouchableOpacity style={styles.resendButton} onPress={handleResend}>
            <Ionicons name="refresh" size={16} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>
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
  resendButton: {
    backgroundColor: '#F0F8FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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

export default OptionalEmailVerificationBanner;

