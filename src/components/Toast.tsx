import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onHide: () => void;
  showViewOrderLink?: boolean;
  onViewOrder?: () => void;
}

const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'success',
  duration = 3000,
  onHide,
  showViewOrderLink = false,
  onViewOrder,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      // Show toast
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  const getToastStyle = () => {
    // Dark toast styling like your image
    return { 
      backgroundColor: '#1a1a1a', 
      borderColor: 'transparent' 
    };
  };

  const getTextColor = () => {
    // White text for black background
    return '#ffffff';
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        getToastStyle(),
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Green Checkmark Icon */}
      <View style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
      </View>
      
      <View style={styles.contentContainer}>
        <View style={styles.messageRow}>
          <Text style={[styles.message, { color: getTextColor() }]}>
            {message}
          </Text>
          {showViewOrderLink && onViewOrder && (
            <TouchableOpacity onPress={onViewOrder} style={styles.viewOrderLink}>
              <Text style={styles.viewOrderText}>View Order</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
        <Text style={[styles.closeText, { color: getTextColor() }]}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: spacing.md,
    right: spacing.md,
    borderRadius: 20, // Slightly less rounded for smaller size
    borderWidth: 0, // No border for cleaner look
    paddingVertical: spacing.sm, // Smaller padding
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
    marginRight: spacing.sm,
  },
  iconContainer: {
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewOrderLink: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  viewOrderText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '500',
    textDecorationLine: 'none',
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  closeText: {
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 18,
  },
});

export default Toast;
