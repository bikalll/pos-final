import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { colors, spacing, radius, shadow } from '../../theme';
import { createAttendanceService, EmployeeAttendanceSummary } from '../../services/attendanceService';

interface EmployeeAttendanceSummary {
  employeeId: string;
  employeeName: string;
  checkInTime?: number;
  checkOutTime?: number;
  checkInLocation?: string;
  checkOutLocation?: string;
  checkInPhoto?: string;
  checkOutPhoto?: string;
  status: 'checked-in' | 'checked-out' | 'not-checked-in';
  totalHours?: number;
}

const OwnerAttendanceDashboard: React.FC = () => {
  const [employeeSummaries, setEmployeeSummaries] = useState<EmployeeAttendanceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const authState = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    loadAttendanceData();
  }, [selectedDate]);

  const loadAttendanceData = async () => {
    if (!authState.restaurantId) {
      console.log('🔍 Owner Dashboard - No restaurant ID found:', authState);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔍 Owner Dashboard - Loading attendance data for restaurant:', authState.restaurantId);
      const attendanceService = createAttendanceService(authState.restaurantId);
      const summaries = await attendanceService.getAttendanceSummary(authState.restaurantId, selectedDate);
      setEmployeeSummaries(summaries);
    } catch (error) {
      console.error('Error loading attendance data:', error);
      Alert.alert('Error', 'Failed to load attendance data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendanceData();
    setRefreshing(false);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatHours = (hours: number) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked-in':
        return colors.success;
      case 'checked-out':
        return colors.primary;
      case 'not-checked-in':
        return colors.danger;
      default:
        return colors.textMuted;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'checked-in':
        return 'Active';
      case 'checked-out':
        return 'Completed';
      case 'not-checked-in':
        return 'Absent';
      default:
        return 'Unknown';
    }
  };

  const renderEmployeeCard = ({ item }: { item: EmployeeAttendanceSummary }) => (
    <TouchableOpacity style={styles.employeeCard}>
      <View style={styles.photoContainer}>
        {item.checkInPhoto ? (
          <Image source={{ uri: item.checkInPhoto }} style={styles.employeePhoto} />
        ) : (
          <View style={styles.defaultPhoto}>
            <Text style={styles.defaultPhotoText}>
              {item.employeeName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {item.status === 'checked-in' && <View style={styles.activeIndicator} />}
      </View>
      
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{item.employeeName}</Text>
        <Text style={styles.employeeRole}>Employee</Text>
        <Text style={styles.attendanceTime}>
          {item.checkInTime ? `Checked in: ${formatTime(item.checkInTime)}` : 'Not checked in today'}
        </Text>
        {item.checkInLocation && (
          <Text style={styles.attendanceLocation} numberOfLines={1} ellipsizeMode="tail">
            📍 {item.checkInLocation.split(',').slice(0, 2).join(',').trim()}
          </Text>
        )}
      </View>
      
      <View style={styles.rightSection}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
        {item.totalHours && (
          <Text style={styles.duration}>{formatHours(item.totalHours)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderDateSelector = () => (
    <View style={styles.dateSelector}>
      <TouchableOpacity 
        style={[styles.dateButton, selectedDate.toDateString() === new Date().toDateString() && styles.activeDateButton]}
        onPress={() => setSelectedDate(new Date())}
      >
        <Text style={[styles.dateText, selectedDate.toDateString() === new Date().toDateString() && styles.activeDateText]}>
          Today
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.dateButton}
        onPress={() => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          setSelectedDate(yesterday);
        }}
      >
        <Text style={styles.dateText}>Yesterday</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Employee Attendance</Text>
          <Text style={styles.subtitle}>Loading attendance data...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading attendance data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Employee Attendance</Text>
        <Text style={styles.subtitle}>
          {selectedDate.toDateString() === new Date().toDateString() ? 'Today\'s Performance' : 'Attendance Overview'}
        </Text>
        <Text style={styles.dateDisplay}>
          {selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderDateSelector()}

        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryStats}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {employeeSummaries.filter(emp => emp.status === 'checked-in').length}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {employeeSummaries.filter(emp => emp.status === 'checked-out').length}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {employeeSummaries.filter(emp => emp.status === 'not-checked-in').length}
              </Text>
            </View>
          </View>
          <View style={styles.summaryLabels}>
            <Text style={styles.summaryLabel}>Active</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>
        </View>

        <View style={styles.employeesSection}>
          <Text style={styles.sectionTitle}>Employee Details</Text>
          {employeeSummaries.length > 0 ? (
            <FlatList
              data={employeeSummaries}
              renderItem={renderEmployeeCard}
              keyExtractor={(item) => item.employeeId}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.employeeList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No employees found</Text>
              <Text style={styles.emptySubtext}>Add employees to start tracking attendance</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
    ...shadow.card,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  dateDisplay: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  dateSelector: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  dateButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    alignItems: 'center',
  },
  activeDateButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeDateText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  summarySection: {
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
  summaryStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface2,
    padding: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  summaryLabels: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  employeesSection: {
    marginBottom: spacing.lg,
  },
  employeeList: {
    gap: spacing.md,
  },
  employeeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow.card,
  },
  photoContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  employeePhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  defaultPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultPhotoText: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  employeeInfo: {
    flex: 2, // Give more space to employee info
    marginRight: spacing.sm,
    minWidth: 0,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  employeeRole: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  attendanceTime: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '400',
  },
  attendanceLocation: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '400',
    marginTop: 2,
    flex: 1,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: spacing.sm,
    flexShrink: 0,
    minWidth: 60, // Further reduced to give more space to location
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  duration: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
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

export default OwnerAttendanceDashboard;









