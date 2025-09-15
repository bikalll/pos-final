import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { colors, spacing, radius, shadow } from '../../theme';
import { getFirebaseAuthEnhanced } from '../../services/firebaseAuthEnhanced';
import { createAttendanceService } from '../../services/attendanceService';
import { imgbbService } from '../../services/imgbbService';

interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  timestamp: number;
  photoUri?: string;
  photoBase64?: string | null;
  type: 'in' | 'out';
  location?: string;
  address?: string;
  detailedAddress?: string;
  accuracy?: number;
  latitude?: number;
  longitude?: number;
}

const EmployeeAttendanceScreen: React.FC = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);
  
  const dispatch = useDispatch();
  const authState = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Get current user info from auth state
    if (authState.isLoggedIn && authState.userId) {
      console.log('🔍 Attendance Screen - User Role Debug:', {
        isLoggedIn: authState.isLoggedIn,
        userId: authState.userId,
        userName: authState.userName,
        role: authState.role,
        restaurantId: authState.restaurantId
      });
      
      setCurrentUser({
        id: authState.userId,
        name: authState.userName || 'Employee',
        role: authState.role || 'employee'
      });
    }
    
    // Request location permissions
    requestLocationPermission();
    
    // Load saved attendance records
    loadAttendanceRecords();
  }, [authState.isLoggedIn, authState.userId, authState.userName, authState.role]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    } catch (error) {
      console.error('Location permission error:', error);
      setLocationPermission(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      if (!locationPermission) {
        return null;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      });

      // Get detailed address from coordinates
      let address = 'Location not available';
      let detailedAddress = 'Location not available';
      try {
        const addressResponse = await Location.reverseGeocodeAsync({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
        
        if (addressResponse.length > 0) {
          const addressData = addressResponse[0];
          
          // Create detailed address with more specific information
          const addressParts = [
            addressData.name,           // Building name
            addressData.street,         // Street name
            addressData.streetNumber,   // Street number
            addressData.district,       // District/Area
            addressData.subregion,      // Sub-region
            addressData.city,           // City
            addressData.region,         // Region/State
            addressData.country         // Country
          ].filter(Boolean);
          
          // Create detailed address
          detailedAddress = addressParts.join(', ');
          
          // Create shorter address for display
          const shortAddressParts = [
            addressData.street,
            addressData.district || addressData.subregion,
            addressData.city,
            addressData.country
          ].filter(Boolean);
          
          address = shortAddressParts.join(', ');
        }
      } catch (error) {
        console.error('Error getting address:', error);
      }

      return {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
        address: address,
        detailedAddress: detailedAddress
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  const loadAttendanceRecords = async () => {
    try {
      const savedRecords = await AsyncStorage.getItem('attendanceRecords');
      if (savedRecords) {
        setAttendanceRecords(JSON.parse(savedRecords));
      }
    } catch (error) {
      console.error('Error loading attendance records:', error);
    }
  };

  const saveAttendanceRecord = async (record: AttendanceRecord) => {
    try {
      if (!authState.restaurantId) {
        throw new Error('Restaurant ID not found');
      }
      
      const attendanceService = createAttendanceService(authState.restaurantId);
      
      // If record has a photo URI, upload it to ImgBB first
      if (record.photoUri) {
        await attendanceService.recordAttendanceWithPhoto(record, record.photoUri);
      } else {
        await attendanceService.recordAttendance(record);
      }
      
      // Also save locally for immediate UI update
      const updatedRecords = [record, ...attendanceRecords];
      setAttendanceRecords(updatedRecords);
      await AsyncStorage.setItem('attendanceRecords', JSON.stringify(updatedRecords));
    } catch (error) {
      console.error('Error saving attendance record:', error);
      throw error;
    }
  };

  const takePicture = async () => {
    try {
      setIsLoading(true);
      console.log('📷 Starting photo capture process...');
      
      // Get current location first
      console.log('📍 Getting location...');
      const locationData = await getCurrentLocation();
      console.log('📍 Location obtained:', locationData ? 'Success' : 'Failed');
      
      // Take photo and upload to ImgBB directly
      console.log('📷 Taking photo and uploading to ImgBB...');
      const uploadResult = await imgbbService.takePhotoAndUpload();
      console.log('📷 Photo upload successful:', uploadResult.url);

      // Record self check-in with photo and location
      console.log('💾 Saving attendance record...');
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        staffId: currentUser?.id || 'unknown',
        staffName: currentUser?.name || 'Employee',
        timestamp: Date.now(),
        photoUri: uploadResult.url,
        type: 'in',
        location: 'Photo Check-in',
        address: locationData?.address || 'Location not available',
        detailedAddress: locationData?.detailedAddress || 'Location not available',
        accuracy: locationData?.accuracy || undefined,
        latitude: locationData?.latitude,
        longitude: locationData?.longitude,
      };
      
      await saveAttendanceRecord(newRecord);
      console.log('💾 Attendance record saved successfully');
      
      const locationMessage = locationData?.detailedAddress 
        ? `\nLocation: ${locationData.detailedAddress}\nAccuracy: ${Math.round(locationData.accuracy || 0)}m`
        : '\nLocation: Not available';
      
      Alert.alert(
        'Check In Successful',
        `${currentUser?.name || 'Employee'} checked in successfully with photo!${locationMessage}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Error taking picture:', error);
      Alert.alert('Error', `Failed to take photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      console.log('📷 Photo capture process completed');
    }
  };

  const handleSelfCheckIn = async () => {
    try {
      // Check if user can check in today
      if (!canCheckInToday()) {
        Alert.alert(
          'Already Checked In',
          'You have already checked in today. You can only check in once per day.',
          [{ text: 'OK' }]
        );
        return;
      }

      setIsLoading(true);
      
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required', 
          'Camera permission is required for attendance photos. Would you like to check in without photo?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Check In Without Photo', onPress: () => handleCheckInWithoutPhoto() }
          ]
        );
        setIsLoading(false);
        return;
      }
      
      // Take photo directly
      await takePicture();
    } catch (error) {
      console.error('Error in check-in:', error);
      Alert.alert(
        'Error', 
        'Failed to start camera. Would you like to check in without photo?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Check In Without Photo', onPress: () => handleCheckInWithoutPhoto() }
        ]
      );
      setIsLoading(false);
    }
  };

  const handleCheckInWithoutPhoto = async () => {
    try {
      setIsLoading(true);
      console.log('📍 Check-in without photo - Getting location...');
      
      // Get current location
      const locationData = await getCurrentLocation();
      console.log('📍 Location obtained:', locationData ? 'Success' : 'Failed');

      // Record self check-in without photo
      console.log('💾 Saving attendance record without photo...');
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        staffId: currentUser?.id || 'unknown',
        staffName: currentUser?.name || 'Employee',
        timestamp: Date.now(),
        type: 'in',
        location: 'Check-in',
        address: locationData?.address || 'Location not available',
        detailedAddress: locationData?.detailedAddress || 'Location not available',
        accuracy: locationData?.accuracy || undefined,
        latitude: locationData?.latitude,
        longitude: locationData?.longitude,
      };
      
      await saveAttendanceRecord(newRecord);
      console.log('💾 Attendance record saved successfully');
      
      const locationMessage = locationData?.detailedAddress 
        ? `\nLocation: ${locationData.detailedAddress}\nAccuracy: ${Math.round(locationData.accuracy || 0)}m`
        : '\nLocation: Not available';
      
      Alert.alert(
        'Check In Successful',
        `${currentUser?.name || 'Employee'} checked in successfully!${locationMessage}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('❌ Error checking in without photo:', error);
      Alert.alert('Error', `Failed to record check in: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      console.log('📍 Check-in without photo completed');
    }
  };

  const handleSelfCheckOut = async () => {
    try {
      // Check if user can check out today
      if (!canCheckOutToday()) {
        Alert.alert(
          'Cannot Check Out',
          'You can only check out if you have checked in today and haven\'t checked out yet.',
          [{ text: 'OK' }]
        );
        return;
      }

      setIsLoading(true);
      
      // Get current location
      const locationData = await getCurrentLocation();
      
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        staffId: currentUser?.id || 'unknown',
        staffName: currentUser?.name || 'Employee',
        timestamp: Date.now(),
        type: 'out',
        location: 'Self Check-out',
        address: locationData?.address || 'Location not available',
        detailedAddress: locationData?.detailedAddress || 'Location not available',
        accuracy: locationData?.accuracy || undefined,
        latitude: locationData?.latitude,
        longitude: locationData?.longitude,
      };
      
      await saveAttendanceRecord(newRecord);
      
      const locationMessage = locationData?.detailedAddress 
        ? `\nLocation: ${locationData.detailedAddress}\nAccuracy: ${Math.round(locationData.accuracy || 0)}m`
        : '\nLocation: Not available';
      
      Alert.alert(
        'Check Out Successful',
        `${currentUser?.name || 'Employee'} checked out successfully!${locationMessage}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error during check out:', error);
      Alert.alert('Error', 'Failed to record check out');
    } finally {
      setIsLoading(false);
    }
  };

  const getLastAttendanceStatus = () => {
    if (!currentUser) return null;
    const lastRecord = attendanceRecords
      .filter(r => r.staffId === currentUser.id)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    return lastRecord?.type || null;
  };

  const canCheckInToday = () => {
    if (!currentUser) return false;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const todayEnd = todayStart + (24 * 60 * 60 * 1000) - 1; // End of today
    
    // Check if user already checked in today
    const todayCheckIn = attendanceRecords.find(record => 
      record.staffId === currentUser.id && 
      record.type === 'in' &&
      record.timestamp >= todayStart && 
      record.timestamp <= todayEnd
    );
    
    return !todayCheckIn; // Can check in if no check-in found today
  };

  const canCheckOutToday = () => {
    if (!currentUser) return false;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const todayEnd = todayStart + (24 * 60 * 60 * 1000) - 1; // End of today
    
    // Check if user already checked out today
    const todayCheckOut = attendanceRecords.find(record => 
      record.staffId === currentUser.id && 
      record.type === 'out' &&
      record.timestamp >= todayStart && 
      record.timestamp <= todayEnd
    );
    
    // Can check out if checked in today but not checked out yet
    const todayCheckIn = attendanceRecords.find(record => 
      record.staffId === currentUser.id && 
      record.type === 'in' &&
      record.timestamp >= todayStart && 
      record.timestamp <= todayEnd
    );
    
    return todayCheckIn && !todayCheckOut;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const renderAttendanceRecord = ({ item }: { item: AttendanceRecord }) => (
    <View style={styles.attendanceRecord}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordStaffName}>{item.staffName}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.type === 'in' ? '#27ae60' : '#e74c3c' }
        ]}>
          <Text style={styles.statusText}>
            {item.type === 'in' ? 'IN' : 'OUT'}
          </Text>
        </View>
      </View>
      
      <View style={styles.recordDetails}>
        <Text style={styles.recordTime}>
          {formatTime(item.timestamp)} • {formatDate(item.timestamp)}
        </Text>
        {item.detailedAddress && (
          <Text style={styles.recordLocation}>📍 {item.detailedAddress}</Text>
        )}
        {item.accuracy && (
          <Text style={styles.recordAccuracy}>Accuracy: {Math.round(item.accuracy)}m</Text>
        )}
        {item.latitude && item.longitude && (
          <Text style={styles.recordCoords}>
            📍 {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
          </Text>
        )}
      </View>
      
      {item.photoUri && (
        <Image
          source={{ uri: item.photoUri }}
          style={styles.recordPhoto}
          resizeMode="cover"
        />
      )}
    </View>
  );

  // Don't render if user is not loaded
  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Employee Attendance</Text>
          <Text style={styles.subtitle}>Loading user information...</Text>
        </View>
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedText}>
            Please wait while we load your information.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Block owners from accessing employee attendance
  console.log('🔍 Attendance Screen - Access Control Check:', {
    currentUserRole: currentUser.role,
    isOwner: currentUser.role === 'Owner',
    isEmployee: currentUser.role === 'employee' || currentUser.role === 'Staff'
  });
  
  if (currentUser.role === 'Owner') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Employee Attendance</Text>
          <Text style={styles.subtitle}>Access restricted to employees only</Text>
        </View>
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedText}>
            Owners should use the attendance dashboard to view employee performance.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const lastStatus = getLastAttendanceStatus();
  const isCheckedIn = lastStatus === 'in';
  const canCheckIn = canCheckInToday();
  const canCheckOut = canCheckOutToday();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Employee Attendance</Text>
        <Text style={styles.subtitle}>Track your daily attendance</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Current User Status */}
        <View style={styles.section}>
          <View style={styles.userCard}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{currentUser.name}</Text>
              <Text style={styles.userRole}>{currentUser.role}</Text>
              <View style={styles.statusContainer}>
                <View style={[styles.statusIndicator, { backgroundColor: isCheckedIn ? colors.success : colors.textMuted }]} />
                <Text style={styles.userStatus}>
                  {isCheckedIn ? 'Currently Working' : 'Not Checked In'}
                </Text>
              </View>
            </View>
            
            <View style={styles.userActions}>
              {canCheckIn ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.checkInButton]}
                  onPress={handleSelfCheckIn}
                  disabled={isLoading}
                >
                  <Text style={styles.actionButtonText}>
                    {isLoading ? 'Processing...' : 'Check In'}
                  </Text>
                </TouchableOpacity>
              ) : canCheckOut ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.checkOutButton]}
                  onPress={handleSelfCheckOut}
                  disabled={isLoading}
                >
                  <Text style={styles.actionButtonText}>
                    {isLoading ? 'Processing...' : 'Check Out'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.actionButton, styles.completedButton]}>
                  <Text style={styles.actionButtonText}>Completed Today</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Recent Attendance Records */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {attendanceRecords.filter(r => r.staffId === currentUser.id).length > 0 ? (
            <FlatList
              data={attendanceRecords.filter(r => r.staffId === currentUser.id).slice(0, 5)}
              renderItem={renderAttendanceRecord}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No attendance records yet</Text>
              <Text style={styles.emptySubtext}>Your attendance history will appear here</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.background,
    padding: spacing.md,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  content: { flex: 1, padding: spacing.md },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.outline, ...shadow.card },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  userStatus: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  userActions: {
    marginLeft: spacing.md,
  },
  actionButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    minWidth: 100,
    alignItems: 'center',
  },
  checkInButton: {
    backgroundColor: colors.success,
  },
  checkOutButton: {
    backgroundColor: colors.danger,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  attendanceRecord: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordStaffName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  recordDetails: {
    gap: spacing.xs,
  },
  recordTime: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  recordLocation: {
    fontSize: 12,
    color: colors.textMuted,
  },
  recordPhoto: {
    width: Dimensions.get('window').width - 80,
    height: (Dimensions.get('window').width - 80) * 0.7,
    marginTop: spacing.sm,
    borderRadius: radius.md,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  accessDeniedText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  recordAccuracy: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  recordCoords: {
    fontSize: 12,
    color: colors.textMuted,
  },
  completedButton: {
    backgroundColor: colors.textMuted,
    opacity: 0.7,
  },
});

export default EmployeeAttendanceScreen;
