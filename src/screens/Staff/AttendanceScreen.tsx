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

const AttendanceScreen: React.FC = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  
  const dispatch = useDispatch();
  
  // Current user - in a real app, this would come from authentication
  const currentUser = {
    id: 'current-user',
    name: 'Current User',
    role: 'Staff'
  };

  useEffect(() => {
    // Request location permissions
    requestLocationPermission();
    
    // Load saved attendance records
    loadAttendanceRecords();
  }, []);

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

  const saveAttendanceRecords = async (records: AttendanceRecord[]) => {
    try {
      await AsyncStorage.setItem('attendanceRecords', JSON.stringify(records));
    } catch (error) {
      console.error('Error saving attendance records:', error);
    }
  };

  const takePicture = async () => {
    try {
      setIsLoading(true);
      
      // Get current location first
      const locationData = await getCurrentLocation();
      
      const photo = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio
        quality: 0.8,
        base64: true,
      });
      
      if (photo.canceled) {
        setIsLoading(false);
        return;
      }

      // Record self check-in with photo and location
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        staffId: currentUser.id,
        staffName: currentUser.name,
        timestamp: Date.now(),
        photoUri: photo.assets[0].uri,
        photoBase64: photo.assets[0].base64 || '',
        type: 'in',
        location: 'Photo Check-in',
        address: locationData?.address || 'Location not available',
        detailedAddress: locationData?.detailedAddress || 'Location not available',
        accuracy: locationData?.accuracy || undefined,
        latitude: locationData?.latitude,
        longitude: locationData?.longitude,
      };
      
      const updatedRecords = [newRecord, ...attendanceRecords];
      setAttendanceRecords(updatedRecords);
      await saveAttendanceRecords(updatedRecords);
      
      const locationMessage = locationData?.detailedAddress 
        ? `\nLocation: ${locationData.detailedAddress}\nAccuracy: ${Math.round(locationData.accuracy || 0)}m`
        : '\nLocation: Not available';
      
      Alert.alert(
        'Check In Successful',
        `${currentUser.name} checked in successfully with photo!${locationMessage}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsLoading(false);
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
        Alert.alert('Permission Required', 'Camera permission is required to take attendance photos.');
        setIsLoading(false);
        return;
      }
      
      // Take photo directly
      await takePicture();
    } catch (error) {
      console.error('Error in check-in:', error);
      Alert.alert('Error', 'Failed to start camera. Please try again.');
      setIsLoading(false);
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
        staffId: currentUser.id,
        staffName: currentUser.name,
        timestamp: Date.now(),
        type: 'out',
        location: 'Self Check-out',
        address: locationData?.address || 'Location not available',
        detailedAddress: locationData?.detailedAddress || 'Location not available',
        accuracy: locationData?.accuracy || undefined,
        latitude: locationData?.latitude,
        longitude: locationData?.longitude,
      };
      
      const updatedRecords = [newRecord, ...attendanceRecords];
      setAttendanceRecords(updatedRecords);
      await saveAttendanceRecords(updatedRecords);
      
      const locationMessage = locationData?.detailedAddress 
        ? `\nLocation: ${locationData.detailedAddress}\nAccuracy: ${Math.round(locationData.accuracy || 0)}m`
        : '\nLocation: Not available';
      
      Alert.alert(
        'Check Out Successful',
        `${currentUser.name} checked out successfully!${locationMessage}`,
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
    const lastRecord = attendanceRecords
      .filter(r => r.staffId === currentUser.id)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    return lastRecord?.type || null;
  };

  const canCheckInToday = () => {
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

  const lastStatus = getLastAttendanceStatus();
  const isCheckedIn = lastStatus === 'in';
  const canCheckIn = canCheckInToday();
  const canCheckOut = canCheckOutToday();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Self Attendance</Text>
        <Text style={styles.subtitle}>Check yourself in and out with a selfie</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Current User Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Status</Text>
          <View style={styles.userCard}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{currentUser.name}</Text>
              <Text style={styles.userRole}>{currentUser.role}</Text>
              <Text style={styles.userStatus}>
                Status: {isCheckedIn ? 'Checked In' : 'Not Checked In'}
              </Text>
              <Text style={styles.dailyStatus}>
                Today: {canCheckIn ? 'Can Check In' : canCheckOut ? 'Can Check Out' : 'Already Completed'}
              </Text>
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
          <Text style={styles.sectionTitle}>Your Attendance History</Text>
          {attendanceRecords.filter(r => r.staffId === currentUser.id).length > 0 ? (
            <FlatList
              data={attendanceRecords.filter(r => r.staffId === currentUser.id).slice(0, 10)}
              renderItem={renderAttendanceRecord}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.emptyText}>No attendance records yet</Text>
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
  userStatus: {
    fontSize: 12,
    color: colors.primary,
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
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 16,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  recordAccuracy: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  recordCoords: {
    fontSize: 12,
    color: colors.textMuted,
  },
  dailyStatus: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
     completedButton: {
     backgroundColor: colors.textMuted,
     opacity: 0.7,
   },
});

export default AttendanceScreen;
