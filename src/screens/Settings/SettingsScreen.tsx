import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../redux/storeFirebase';
import { colors, spacing, radius, shadow } from '../../theme';
import { getFirebaseAuthEnhanced } from '../../services/firebaseAuthEnhanced';
import { logout, resetOrders } from '../../redux/slices/authSlice';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  navigation,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { role, designation } = useSelector((state: RootState) => state.auth);
  const isOwnerLevel = role === 'Owner' || role === 'Manager';
  
  // Change password state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const authService = getFirebaseAuthEnhanced();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: async () => {
          try {
            // Sign out from Firebase Auth
            await authService.signOut();
            
            // Clear Redux state
            dispatch(logout());
            dispatch(resetOrders());
            
            console.log('Logout successful');
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        }},
      ]
    );
  };

  const handleOfficeManagement = () => {
    navigation.navigate('OfficeManagement');
  };

  const handleTableManagement = () => {
    navigation.navigate('TableManagement');
  };

  const handleMenuManagement = () => {
    // Navigate to menu management screen
    navigation.navigate('MenuManagement');
  };

  const handleInventoryManagement = () => {
    // Navigate to inventory management screen
    navigation.navigate('InventoryManagement');
  };

  const handlePrinterSetup = () => {
    navigation.navigate('PrinterSetup');
  };

  const handlePrintDemo = () => {
    navigation.navigate('PrintDemo');
  };

  const handleEmployeeManagement = () => {
    navigation.navigate('EmployeeManagement');
  };

  const handleEmployeePerformance = () => {
    navigation.navigate('EmployeePerformance');
  };

  const handleVendorManagement = () => {
    navigation.navigate('VendorManagement');
  };

  const handleBluetoothDebug = () => {
    navigation.navigate('BluetoothDebug');
  };

  const handlePrintDebug = () => {
    navigation.navigate('PrintDebug');
  };

  const handleAbout = () => {
    navigation.navigate('About');
  };

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
  };

  const handleCloseChangePasswordModal = () => {
    setShowChangePasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const handleSubmitPasswordChange = async () => {
    // Validation
    if (!currentPassword.trim()) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Error', 'Please confirm your new password');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      Alert.alert('Error', passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    try {
      setIsChangingPassword(true);
      
      // Get current user email
      const currentUser = authService.getCurrentUser();
      if (!currentUser || !currentUser.email) {
        Alert.alert('Error', 'Unable to get current user information');
        return;
      }

      // Re-authenticate user with current password
      await authService.signIn(currentUser.email, currentPassword);
      
      // Update password
      await authService.updatePassword(newPassword);
      
      Alert.alert(
        'Success',
        'Password changed successfully!',
        [{ text: 'OK', onPress: handleCloseChangePasswordModal }]
      );
      
    } catch (error: any) {
      console.error('Password change error:', error);
      
      let errorMessage = 'Failed to change password. Please try again.';
      
      switch (error.code) {
        case 'auth/wrong-password':
          errorMessage = 'Current password is incorrect. Please check your password and try again.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Current password is incorrect. Please check your password and try again.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'User account not found. Please log out and log back in.';
          break;
        case 'auth/weak-password':
          errorMessage = 'New password is too weak. Please choose a stronger password with at least 6 characters.';
          break;
        case 'auth/requires-recent-login':
          errorMessage = 'Please log out and log back in, then try again.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please wait a moment and try again.';
          break;
        default:
          if (error.message) {
            errorMessage = error.message;
          }
      }
      
      Alert.alert('Error', errorMessage);
      
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleNotifications = () => {
    Alert.alert(
      'Notifications',
      'There are no notifications now',
      [{ text: 'OK' }]
    );
  };


  const handleSupport = () => {
    Alert.alert(
      'Support & Contact',
      'Email Support: houseofjobnp@gmail.com\nPhone Support: +977 9841610920',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        
        {/* GENERAL Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GENERAL</Text>
          
          {/* Office Management */}
          <TouchableOpacity style={styles.settingCard} onPress={handleOfficeManagement}>
            <View style={styles.iconContainer}>
              <Ionicons name="business" size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Office Management</Text>
              <Text style={styles.cardSubtitle}>Business profile, logo, owner and PAN/VAT</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Table Management */}
          <TouchableOpacity style={styles.settingCard} onPress={handleTableManagement}>
            <View style={styles.iconContainer}>
              <Ionicons name="grid" size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Table Management</Text>
              <Text style={styles.cardSubtitle}>Add, edit, and manage restaurant tables</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Menu Management */}
          <TouchableOpacity style={styles.settingCard} onPress={handleMenuManagement}>
            <View style={styles.iconContainer}>
              <Ionicons name="restaurant" size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Menu Management</Text>
              <Text style={styles.cardSubtitle}>Add, edit, or remove menu items</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Inventory Management */}
          <TouchableOpacity style={styles.settingCard} onPress={handleInventoryManagement}>
            <View style={styles.iconContainer}>
              <Ionicons name="cube" size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Inventory Management</Text>
              <Text style={styles.cardSubtitle}>Manage stock levels and inventory items</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Printer Setup */}
          <TouchableOpacity style={styles.settingCard} onPress={handlePrinterSetup}>
            <View style={styles.iconContainer}>
              <Ionicons name="print" size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Printer Setup</Text>
              <Text style={styles.cardSubtitle}>Configure Bluetooth and USB printers</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Printing Demo */}
          <TouchableOpacity style={styles.settingCard} onPress={handlePrintDemo}>
            <View style={styles.iconContainer}>
              <Ionicons name="document-text" size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Printing Demo</Text>
              <Text style={styles.cardSubtitle}>Test printing functionality</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Employee Management */}
          <TouchableOpacity style={styles.settingCard} onPress={handleEmployeeManagement}>
            <View style={styles.iconContainer}>
              <Ionicons name="people" size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Employee Management</Text>
              <Text style={styles.cardSubtitle}>Manage staff accounts and permissions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Employee Performance */}
          <TouchableOpacity style={styles.settingCard} onPress={handleEmployeePerformance}>
            <View style={styles.iconContainer}>
              <Ionicons name="trending-up" size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Employee Performance</Text>
              <Text style={styles.cardSubtitle}>Track and view employee performance</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Vendor Management */}
          <TouchableOpacity style={styles.settingCard} onPress={handleVendorManagement}>
            <View style={styles.iconContainer}>
              <Ionicons name="storefront" size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Vendor Management</Text>
              <Text style={styles.cardSubtitle}>Manage suppliers and vendors</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Bluetooth Debug */}
          <TouchableOpacity style={styles.settingCard} onPress={handleBluetoothDebug}>
            <View style={styles.iconContainer}>
              <Ionicons name="bluetooth" size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Bluetooth Debug</Text>
              <Text style={styles.cardSubtitle}>Debug Bluetooth connections</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Print Debug */}
          <TouchableOpacity style={styles.settingCard} onPress={handlePrintDebug}>
            <View style={styles.iconContainer}>
              <Ionicons name="bug" size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Print Debug</Text>
              <Text style={styles.cardSubtitle}>Debug printing issues</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* About */}
          <TouchableOpacity style={styles.settingCard} onPress={handleAbout}>
            <View style={styles.iconContainer}>
              <Ionicons name="information-circle" size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>About</Text>
              <Text style={styles.cardSubtitle}>App information and version</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ACCOUNT Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          
          {/* Change Password */}
          <TouchableOpacity style={styles.settingCard} onPress={handleChangePassword}>
            <View style={styles.iconContainer}>
              <Ionicons name="key" size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Change Password</Text>
              <Text style={styles.cardSubtitle}>Update your account password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Notifications */}
          <TouchableOpacity style={styles.settingCard} onPress={handleNotifications}>
            <View style={styles.iconContainer}>
              <Ionicons name="notifications" size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Notifications</Text>
              <Text style={styles.cardSubtitle}>Configure notification preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>


          {/* Support */}
          <TouchableOpacity style={styles.settingCard} onPress={handleSupport}>
            <View style={styles.iconContainer}>
              <Ionicons name="help-circle" size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.cardTitle}>Support</Text>
              <Text style={styles.cardSubtitle}>Get help and support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutCard} onPress={handleLogout}>
            <View style={styles.iconContainer}>
              <Ionicons name="log-out" size={24} color={colors.danger} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.logoutTitle}>Logout</Text>
              <Text style={styles.logoutSubtitle}>Sign out of your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseChangePasswordModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={handleCloseChangePasswordModal}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {/* Current Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter current password"
                    placeholderTextColor={colors.textMuted}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <Ionicons
                      name={showCurrentPassword ? "eye-off" : "eye"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* New Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.textMuted}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye-off" : "eye"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
          <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCloseChangePasswordModal}
                disabled={isChangingPassword}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.changeButton, isChangingPassword && styles.changeButtonDisabled]}
                onPress={handleSubmitPasswordChange}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? (
                  <ActivityIndicator color={colors.textPrimary} size="small" />
                ) : (
                  <Text style={styles.changeButtonText}>Change Password</Text>
                )}
          </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
    letterSpacing: 0.5,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow.card,
  },
  logoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.danger,
    ...shadow.card,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  logoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
    marginBottom: 2,
  },
  logoutSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    width: '100%',
    maxWidth: 400,
    ...shadow.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: spacing.md,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  eyeButton: {
    padding: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  changeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeButtonDisabled: {
    opacity: 0.6,
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

export default SettingsScreen;