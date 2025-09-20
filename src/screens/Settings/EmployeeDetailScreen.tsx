import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/storeFirebase';
import { colors, spacing, radius, shadow } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { createAttendanceService } from '../../services/attendanceService';
import { AttendanceRecord } from '../../utils/types';

interface Employee {
  uid: string;
  displayName: string;
  email: string;
  role: 'Owner' | 'manager' | 'staff';
  phone?: string;
  designation?: string;
  joinDate?: number;
  isActive: boolean;
  employmentType?: 'full-time' | 'part-time';
  photoURL?: string;
}

interface EmployeePerformance {
  employee: Employee;
  totalWorkingDays: number;
  totalAbsentDays: number;
  currentMonthWorkingDays: number;
  currentMonthAbsentDays: number;
  lastCheckIn?: number;
  lastCheckOut?: number;
  status: 'active' | 'inactive' | 'absent';
  totalHoursThisMonth: number;
  averageHoursPerDay: number;
}

interface RouteParams {
  employee: Employee;
  performance: EmployeePerformance;
}

const EmployeeDetailScreen: React.FC = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'all'>('month');
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');

  const navigation = useNavigation();
  const route = useRoute();
  const authState = useSelector((state: RootState) => state.auth);
  
  const { employee, performance } = route.params as RouteParams;

  useEffect(() => {
    loadAttendanceRecords();
  }, [selectedPeriod]);

  const loadAttendanceRecords = async () => {
    if (!authState.restaurantId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const attendanceService = createAttendanceService(authState.restaurantId);
      
      const allRecords = await attendanceService.getEmployeeAttendance(
        employee.uid, 
        authState.restaurantId
      );

      // Filter by period (last 30 days from today)
      const now = new Date();
      const last30DaysStart = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).getTime();
      const last30DaysEnd = now.getTime();

      const filteredRecords = selectedPeriod === 'month' 
        ? allRecords.filter(record => 
            record.timestamp >= last30DaysStart && record.timestamp <= last30DaysEnd
          )
        : allRecords;

      // Group records by date and calculate hours for each day
      const recordsByDate = filteredRecords.reduce((acc, record) => {
        const date = new Date(record.timestamp);
        const dateKey = date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        
        if (!acc[dateKey]) {
          acc[dateKey] = { checkIn: null, checkOut: null, records: [] };
        }
        
        acc[dateKey].records.push(record);
        
        if (record.type === 'in') {
          acc[dateKey].checkIn = record;
        } else if (record.type === 'out') {
          acc[dateKey].checkOut = record;
        }
        
        return acc;
      }, {} as Record<string, { checkIn: AttendanceRecord | null; checkOut: AttendanceRecord | null; records: AttendanceRecord[] }>);

      // Convert to array format with hours calculation
      const groupedRecords = Object.entries(recordsByDate)
        .map(([date, data]) => {
          let hours = 0;
          if (data.checkIn && data.checkOut) {
            hours = (data.checkOut.timestamp - data.checkIn.timestamp) / (1000 * 60 * 60);
          }
          
          return {
            date,
            records: data.records.sort((a, b) => a.timestamp - b.timestamp), // Sort by time
            hours: hours > 0 ? hours : undefined
          };
        })
        .sort((a, b) => {
          // Sort by date (newest first)
          const dateA = new Date(a.records[0].timestamp);
          const dateB = new Date(b.records[0].timestamp);
          return dateB.getTime() - dateA.getTime();
        });

      setAttendanceRecords(groupedRecords);
    } catch (error) {
      console.error('Error loading attendance records:', error);
      Alert.alert('Error', 'Failed to load attendance records. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendanceRecords();
    setRefreshing(false);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (type: 'in' | 'out') => {
    return type === 'in' ? colors.success : colors.primary;
  };

  const getStatusText = (type: 'in' | 'out') => {
    return type === 'in' ? 'Check In' : 'Check Out';
  };

  const showImage = (imageUri: string) => {
    setSelectedImage(imageUri);
    setShowImageModal(true);
  };

  const renderAttendanceRecord = ({ item }: { item: { date: string; records: AttendanceRecord[]; hours?: number } }) => (
    <View style={styles.dateCard}>
      <View style={styles.dateHeader}>
        <Text style={styles.dateTitle}>{item.date}</Text>
        {item.hours && (
          <Text style={styles.dateHours}>{item.hours.toFixed(1)}h</Text>
        )}
      </View>
      
      {item.records.map((record, index) => (
        <View key={record.id} style={[
          styles.recordCard,
          index === item.records.length - 1 && styles.lastRecordCard
        ]}>
          <View style={styles.recordHeader}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.type) }]}>
              <Text style={styles.statusText}>{getStatusText(record.type)}</Text>
            </View>
            <Text style={styles.recordTime}>{formatTime(record.timestamp)}</Text>
          </View>
          
          {(record.detailedAddress || record.address || record.location) && (
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.locationText} numberOfLines={2}>
                {record.detailedAddress || record.address || record.location}
              </Text>
            </View>
          )}
          
          {record.photoUri && (
            <TouchableOpacity 
              style={styles.photoContainer}
              onPress={() => showImage(record.photoUri!)}
            >
              <Image source={{ uri: record.photoUri }} style={styles.recordPhoto} />
              <View style={styles.photoOverlay}>
                <Ionicons name="eye-outline" size={20} color="white" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      <TouchableOpacity 
        style={[styles.periodButton, selectedPeriod === 'month' && styles.activePeriodButton]}
        onPress={() => setSelectedPeriod('month')}
      >
        <Text style={[styles.periodText, selectedPeriod === 'month' && styles.activePeriodText]}>
          Last 30 Days
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.periodButton, selectedPeriod === 'all' && styles.activePeriodButton]}
        onPress={() => setSelectedPeriod('all')}
      >
        <Text style={[styles.periodText, selectedPeriod === 'all' && styles.activePeriodText]}>
          All Time
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPerformanceStats = () => {
    const workingDays = selectedPeriod === 'month' 
      ? performance.currentMonthWorkingDays 
      : performance.totalWorkingDays;
    const totalHours = selectedPeriod === 'month' 
      ? performance.totalHoursThisMonth 
      : attendanceRecords.reduce((total, dayGroup) => {
          return total + (dayGroup.hours || 0);
        }, 0);

    return (
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Performance Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{workingDays}</Text>
            <Text style={styles.statLabel}>Working Days</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalHours.toFixed(1)}h</Text>
            <Text style={styles.statLabel}>Total Hours</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {workingDays > 0 ? (totalHours / workingDays).toFixed(1) : '0.0'}h
            </Text>
            <Text style={styles.statLabel}>Avg Hours/Day</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{attendanceRecords.length}</Text>
            <Text style={styles.statLabel}>Check-ins</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderImageModal = () => (
    <Modal
      visible={showImageModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowImageModal(false)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalCloseButton}
          onPress={() => setShowImageModal(false)}
        >
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
        <Image 
          source={{ uri: selectedImage }} 
          style={styles.modalImage}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Employee Details</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading attendance records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{employee.displayName}</Text>
          <Text style={styles.subtitle}>{employee.designation || employee.role}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Employee Info Card */}
        <View style={styles.employeeCard}>
          <View style={styles.employeeInfo}>
            {employee.photoURL ? (
              <Image source={{ uri: employee.photoURL }} style={styles.employeePhoto} />
            ) : (
              <View style={styles.defaultPhoto}>
                <Text style={styles.defaultPhotoText}>
                  {employee.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.employeeDetails}>
              <Text style={styles.employeeName}>{employee.displayName}</Text>
              <Text style={styles.employeeEmail}>{employee.email}</Text>
              {employee.phone && (
                <Text style={styles.employeePhone}>{employee.phone}</Text>
              )}
              <Text style={styles.employeeRole}>
                {employee.designation || employee.role} • {employee.employmentType}
              </Text>
            </View>
          </View>
        </View>

        {renderPeriodSelector()}
        {renderPerformanceStats()}

        <View style={styles.attendanceSection}>
          <Text style={styles.sectionTitle}>Attendance Records</Text>
          {attendanceRecords.length > 0 ? (
            <FlatList
              data={attendanceRecords}
              renderItem={renderAttendanceRecord}
              keyExtractor={(item) => item.date}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.recordsList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No attendance records found</Text>
              <Text style={styles.emptySubtext}>
                {selectedPeriod === 'month' ? 'No records for last 30 days' : 'No records available'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {renderImageModal()}
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow.card,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  employeeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow.card,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: spacing.lg,
  },
  defaultPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  defaultPhotoText: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '700',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  employeeEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  employeePhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  employeeRole: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    alignItems: 'center',
  },
  activePeriodButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activePeriodText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  statsSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow.card,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface2,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  attendanceSection: {
    marginBottom: spacing.lg,
  },
  recordsList: {
    gap: spacing.md,
  },
  dateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow.card,
    marginBottom: spacing.sm,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dateHours: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  recordCard: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  lastRecordCard: {
    borderBottomWidth: 0,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  recordTime: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  recordDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  locationText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  addressText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  photoContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  recordPhoto: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 10,
  },
  modalImage: {
    width: width * 0.9,
    height: height * 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
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
});

export default EmployeeDetailScreen;
