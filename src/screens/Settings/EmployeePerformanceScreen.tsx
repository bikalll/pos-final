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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/storeFirebase';
import { colors, spacing, radius, shadow } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { createAttendanceService } from '../../services/attendanceService';
import { getFirebaseAuthEnhanced, createFirebaseAuthEnhanced } from '../../services/firebaseAuthEnhanced';
import { createFirestoreService } from '../../services/firestoreService';

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
  checkInTime?: number;
  checkOutTime?: number;
  workHours?: number;
  notJoinedYet?: boolean;
  joinDate?: number;
  checkInImage?: string;
  checkOutImage?: string;
  checkInLocation?: string;
  checkOutLocation?: string;
}

const EmployeePerformanceScreen: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeePerformances, setEmployeePerformances] = useState<EmployeePerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'all'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showDateDetailsModal, setShowDateDetailsModal] = useState(false);
  const [showEmployeeDetailModal, setShowEmployeeDetailModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedEmployeePerformance, setSelectedEmployeePerformance] = useState<EmployeePerformance | null>(null);
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [dateEmployees, setDateEmployees] = useState<Employee[]>([]);
  const [dateEmployeePerformances, setDateEmployeePerformances] = useState<EmployeePerformance[]>([]);

  const navigation = useNavigation();
  const dispatch = useDispatch();
  const authState = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    loadEmployeeData();
  }, [selectedPeriod, selectedDate, attendanceFilter]);

  const loadEmployeeData = async () => {
    if (!authState.restaurantId || !authState.isLoggedIn || (authState.role !== 'Owner' && authState.role !== 'Manager')) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      let authService;
      try {
        authService = getFirebaseAuthEnhanced();
      } catch (error) {
        console.log('Firebase auth enhanced not initialized, creating new instance...');
        authService = createFirebaseAuthEnhanced(dispatch);
      }

      // Get users from authentication system
      const restaurantUsers = await authService.getRestaurantUsers(
        authState.restaurantId || '',
        authState.userId || ''
      );

      // Get staff data from Firestore
      const firestoreService = createFirestoreService(authState.restaurantId || '');
      const staffData = await firestoreService.getStaffMembers();

      // Convert UserMetadata to Employee format and merge with staff data
      const employeeList: Employee[] = restaurantUsers.map(user => {
        // Find corresponding staff data
        const staffInfo = Object.values(staffData).find((staff: any) => 
          staff.email === user.email || staff.id === user.uid
        );

        // Prioritize role from staff collection, fallback to user role
        let finalRole: 'Owner' | 'manager' | 'staff';
        if (staffInfo?.role) {
          // Use role from staff collection (Manager/Staff) and convert to lowercase
          finalRole = staffInfo.role.toLowerCase() as 'manager' | 'staff';
        } else if (user.role === 'employee') {
          // Fallback to staff if user role is employee
          finalRole = 'staff';
        } else {
          // Use user role as is for owners
          finalRole = user.role as 'Owner' | 'manager' | 'staff';
        }

        return {
          ...user,
          role: finalRole,
          phone: staffInfo?.phone || '',
          designation: staffInfo?.designation || staffInfo?.role || '',
          employmentType: staffInfo?.employmentType || 'full-time',
          joinDate: staffInfo?.joinDate || user.createdAt,
          isActive: user.isActive,
        };
      });

      // Filter out owners and inactive employees
      let filteredEmployees = employeeList.filter(emp => 
        emp.isActive && emp.role !== 'Owner'
      );

      // Apply attendance filter if a specific date is selected
      if (selectedDate && attendanceFilter !== 'all') {
        const filteredByAttendance: Employee[] = [];
        
        for (const employee of filteredEmployees) {
          const wasPresent = await wasEmployeePresentOnDate(employee.uid, selectedDate);
          
          if (attendanceFilter === 'present' && wasPresent) {
            filteredByAttendance.push(employee);
          } else if (attendanceFilter === 'absent' && !wasPresent) {
            filteredByAttendance.push(employee);
          }
        }
        
        filteredEmployees = filteredByAttendance;
      }

      setEmployees(filteredEmployees);

      // Calculate performance for each employee
      const attendanceService = createAttendanceService(authState.restaurantId);
      const performances: EmployeePerformance[] = [];

      for (const employee of filteredEmployees as Employee[]) {
        try {
          const attendanceRecords = await attendanceService.getEmployeeAttendance(
            employee.uid,
            authState.restaurantId
          );

          // Calculate performance metrics
          const now = new Date();
          const last30DaysStart = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).getTime();
          const last30DaysEnd = now.getTime();

          const currentMonthRecords = attendanceRecords.filter(record => 
            record.timestamp >= last30DaysStart && record.timestamp <= last30DaysEnd
          );

          // Group records by date
          const recordsByDate = attendanceRecords.reduce((acc, record) => {
            const date = new Date(record.timestamp).toDateString();
            if (!acc[date]) {
              acc[date] = { checkIn: null, checkOut: null, records: [] };
            }
            acc[date].records.push(record);
            
            if (record.type === 'in') {
              acc[date].checkIn = record;
            } else if (record.type === 'out') {
              acc[date].checkOut = record;
            }
            
            return acc;
          }, {} as Record<string, { checkIn: any; checkOut: any; records: any[] }>);

          const currentMonthRecordsByDate = currentMonthRecords.reduce((acc, record) => {
            const date = new Date(record.timestamp).toDateString();
            if (!acc[date]) {
              acc[date] = { checkIn: null, checkOut: null, records: [] };
            }
            acc[date].records.push(record);
            
            if (record.type === 'in') {
              acc[date].checkIn = record;
            } else if (record.type === 'out') {
              acc[date].checkOut = record;
            }
            
            return acc;
          }, {} as Record<string, { checkIn: any; checkOut: any; records: any[] }>);

          // Calculate working days
          const totalWorkingDays = Object.values(recordsByDate).filter(day => 
            day.checkIn && day.checkOut
          ).length;

          const currentMonthWorkingDays = Object.values(currentMonthRecordsByDate).filter(day => 
            day.checkIn && day.checkOut
          ).length;

          // Calculate total hours
          const totalHours = Object.values(recordsByDate).reduce((total, day) => {
            if (day.checkIn && day.checkOut) {
              const hours = (day.checkOut.timestamp - day.checkIn.timestamp) / (1000 * 60 * 60);
              return total + hours;
            }
            return total;
          }, 0);

          const totalHoursThisMonth = Object.values(currentMonthRecordsByDate).reduce((total, day) => {
            if (day.checkIn && day.checkOut) {
              const hours = (day.checkOut.timestamp - day.checkIn.timestamp) / (1000 * 60 * 60);
              return total + hours;
            }
            return total;
          }, 0);

          // Get last check-in/out
          const sortedRecords = attendanceRecords.sort((a, b) => b.timestamp - a.timestamp);
          const lastCheckIn = sortedRecords.find(r => r.type === 'in')?.timestamp;
          const lastCheckOut = sortedRecords.find(r => r.type === 'out')?.timestamp;

          // Determine status
          let status: 'active' | 'inactive' | 'absent' = 'inactive';
          if (lastCheckIn && !lastCheckOut) {
            status = 'active';
          } else if (lastCheckIn && lastCheckOut) {
            const lastActivity = Math.max(lastCheckIn, lastCheckOut);
            const daysSinceLastActivity = (now.getTime() - lastActivity) / (1000 * 60 * 60 * 24);
            status = daysSinceLastActivity > 7 ? 'absent' : 'inactive';
          }

          const performance: EmployeePerformance = {
            employee: employee as Employee,
            totalWorkingDays,
            totalAbsentDays: Math.max(0, totalWorkingDays - currentMonthWorkingDays),
            currentMonthWorkingDays,
            currentMonthAbsentDays: Math.max(0, 30 - currentMonthWorkingDays),
            lastCheckIn,
            lastCheckOut,
            status,
            totalHoursThisMonth,
            averageHoursPerDay: currentMonthWorkingDays > 0 ? totalHoursThisMonth / currentMonthWorkingDays : 0,
          };

          performances.push(performance);
        } catch (error) {
          console.error(`Error loading performance for ${employee.displayName}:`, error);
        }
      }

      setEmployeePerformances(performances);
    } catch (error) {
      console.error('Error loading employee data:', error);
      Alert.alert('Error', 'Failed to load employee performance data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEmployeeData();
    setRefreshing(false);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status: 'active' | 'inactive' | 'absent') => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'inactive':
        return colors.warning;
      case 'absent':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: 'active' | 'inactive' | 'absent') => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      case 'absent':
        return 'Absent';
      default:
        return 'Unknown';
    }
  };

  const wasEmployeePresentOnDate = async (employeeId: string, date: Date): Promise<boolean> => {
    try {
      const attendanceService = createAttendanceService(authState.restaurantId);
      const attendanceRecords = await attendanceService.getEmployeeAttendance(
        employeeId,
        authState.restaurantId
      );

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const dayRecords = attendanceRecords.filter(record => 
        record.timestamp >= startOfDay.getTime() && record.timestamp <= endOfDay.getTime()
      );

      // Check if employee has both check-in and check-out on that day
      const hasCheckIn = dayRecords.some(record => record.type === 'in');
      const hasCheckOut = dayRecords.some(record => record.type === 'out');
      
      return hasCheckIn && hasCheckOut;
    } catch (error) {
      console.error('Error checking attendance for date:', error);
      return false;
    }
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const generateCalendarDays = (date: Date) => {
    const daysInMonth = getDaysInMonth(date);
    const firstDay = getFirstDayOfMonth(date);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(date.getFullYear(), date.getMonth(), day));
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedCalendarDate && date.toDateString() === selectedCalendarDate.toDateString();
  };

  const isFutureDate = (date: Date) => {
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return dateOnly > todayOnly;
  };

  const loadEmployeesForDate = async (date: Date) => {
    try {
      setIsLoading(true);
      
      let authService;
      try {
        authService = getFirebaseAuthEnhanced();
      } catch (error) {
        console.log('Firebase auth enhanced not initialized, creating new instance...');
        authService = createFirebaseAuthEnhanced(dispatch);
      }

      // Get users from authentication system
      const restaurantUsers = await authService.getRestaurantUsers(
        authState.restaurantId || '',
        authState.userId || ''
      );

      // Get staff data from Firestore
      const firestoreService = createFirestoreService(authState.restaurantId || '');
      const staffData = await firestoreService.getStaffMembers();

      // Convert UserMetadata to Employee format and merge with staff data
      const employeeList: Employee[] = restaurantUsers.map(user => {
        // Find corresponding staff data
        const staffInfo = Object.values(staffData).find((staff: any) => 
          staff.email === user.email || staff.id === user.uid
        );

        // Prioritize role from staff collection, fallback to user role
        let finalRole: 'Owner' | 'manager' | 'staff';
        if (staffInfo?.role) {
          // Use role from staff collection (Manager/Staff) and convert to lowercase
          finalRole = staffInfo.role.toLowerCase() as 'manager' | 'staff';
        } else if (user.role === 'employee') {
          // Fallback to staff if user role is employee
          finalRole = 'staff';
        } else {
          // Use user role as is for owners
          finalRole = user.role as 'Owner' | 'manager' | 'staff';
        }

        return {
          ...user,
          role: finalRole,
          phone: staffInfo?.phone || '',
          designation: staffInfo?.designation || staffInfo?.role || '',
          employmentType: staffInfo?.employmentType || 'full-time',
          joinDate: staffInfo?.joinDate || user.createdAt,
          isActive: user.isActive,
        };
      });

      // Filter out owners and inactive employees
      const filteredEmployees = employeeList.filter(emp => 
        emp.isActive && emp.role !== 'Owner'
      );

      // Get all employees for the date (including those who didn't work)
      const employeesForDate: Employee[] = [];
      const performancesForDate: EmployeePerformance[] = [];

      for (const employee of filteredEmployees) {
        // Check if employee had joined by the selected date
        const joinDate = new Date(employee.joinDate || Date.now());
        const selectedDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const joinDateOnly = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate());
        
        const hadJoined = joinDateOnly <= selectedDateOnly;
        
        if (!hadJoined) {
          // Employee hadn't joined yet on this date
          employeesForDate.push(employee);
          performancesForDate.push({
            employee: employee as Employee,
            totalWorkingDays: 0,
            totalAbsentDays: 0,
            currentMonthWorkingDays: 0,
            currentMonthAbsentDays: 0,
            lastCheckIn: undefined,
            lastCheckOut: undefined,
            status: 'absent',
            totalHoursThisMonth: 0,
            averageHoursPerDay: 0,
            notJoinedYet: true,
            joinDate: joinDate.getTime(),
          });
          continue;
        }

        // Employee had joined, check attendance
        const attendanceService = createAttendanceService(authState.restaurantId);
        const attendanceRecords = await attendanceService.getEmployeeAttendance(
          employee.uid,
          authState.restaurantId
        );

        // Get attendance records for the specific date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const dayRecords = attendanceRecords.filter(record => 
          record.timestamp >= startOfDay.getTime() && record.timestamp <= endOfDay.getTime()
        );

        const checkInRecord = dayRecords.find(record => record.type === 'in');
        const checkOutRecord = dayRecords.find(record => record.type === 'out');
        const wasPresent = checkInRecord && checkOutRecord;
        
        // Get attendance images if available
               const checkInImage = checkInRecord?.photoUri;
               const checkOutImage = checkOutRecord?.photoUri;
               const checkInLocation = checkInRecord?.detailedAddress || checkInRecord?.address || 
                 (checkInRecord?.latitude && checkInRecord?.longitude ? 
                   `${checkInRecord.latitude.toFixed(4)}, ${checkInRecord.longitude.toFixed(4)}` : undefined);
               const checkOutLocation = checkOutRecord?.detailedAddress || checkOutRecord?.address || 
                 (checkOutRecord?.latitude && checkOutRecord?.longitude ? 
                   `${checkOutRecord.latitude.toFixed(4)}, ${checkOutRecord.longitude.toFixed(4)}` : undefined);
               
               // Debug logging for location data
               if (checkInRecord) {
                 console.log('Check-in record for', employee.displayName, ':', {
                   detailedAddress: checkInRecord.detailedAddress,
                   address: checkInRecord.address,
                   location: checkInRecord.location,
                   finalLocation: checkInLocation
                 });
               }
               if (checkOutRecord) {
                 console.log('Check-out record for', employee.displayName, ':', {
                   detailedAddress: checkOutRecord.detailedAddress,
                   address: checkOutRecord.address,
                   location: checkOutRecord.location,
                   finalLocation: checkOutLocation
                 });
               }

        employeesForDate.push(employee);

        // Calculate performance for this employee
        const now = new Date();
        const last30DaysStart = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).getTime();
        const last30DaysEnd = now.getTime();

        const currentMonthRecords = attendanceRecords.filter(record => 
          record.timestamp >= last30DaysStart && record.timestamp <= last30DaysEnd
        );

        // Group records by date
        const recordsByDate = attendanceRecords.reduce((acc, record) => {
          const recordDate = new Date(record.timestamp).toDateString();
          if (!acc[recordDate]) {
            acc[recordDate] = { checkIn: null, checkOut: null, records: [] };
          }
          acc[recordDate].records.push(record);
          
          if (record.type === 'in') {
            acc[recordDate].checkIn = record;
          } else if (record.type === 'out') {
            acc[recordDate].checkOut = record;
          }
          
          return acc;
        }, {} as Record<string, { checkIn: any; checkOut: any; records: any[] }>);

        const currentMonthRecordsByDate = currentMonthRecords.reduce((acc, record) => {
          const recordDate = new Date(record.timestamp).toDateString();
          if (!acc[recordDate]) {
            acc[recordDate] = { checkIn: null, checkOut: null, records: [] };
          }
          acc[recordDate].records.push(record);
          
          if (record.type === 'in') {
            acc[recordDate].checkIn = record;
          } else if (record.type === 'out') {
            acc[recordDate].checkOut = record;
          }
          
          return acc;
        }, {} as Record<string, { checkIn: any; checkOut: any; records: any[] }>);

        // Calculate working days
        const totalWorkingDays = Object.values(recordsByDate).filter(day => 
          day.checkIn && day.checkOut
        ).length;

        const currentMonthWorkingDays = Object.values(currentMonthRecordsByDate).filter(day => 
          day.checkIn && day.checkOut
        ).length;

        // Calculate total hours
        const totalHours = Object.values(recordsByDate).reduce((total, day) => {
          if (day.checkIn && day.checkOut) {
            const hours = (day.checkOut.timestamp - day.checkIn.timestamp) / (1000 * 60 * 60);
            return total + hours;
          }
          return total;
        }, 0);

        const totalHoursThisMonth = Object.values(currentMonthRecordsByDate).reduce((total, day) => {
          if (day.checkIn && day.checkOut) {
            const hours = (day.checkOut.timestamp - day.checkIn.timestamp) / (1000 * 60 * 60);
            return total + hours;
          }
          return total;
        }, 0);

        // Get last check-in/out
        const sortedRecords = attendanceRecords.sort((a, b) => b.timestamp - a.timestamp);
        const lastCheckIn = sortedRecords.find(r => r.type === 'in')?.timestamp;
        const lastCheckOut = sortedRecords.find(r => r.type === 'out')?.timestamp;

        // Determine status
        let status: 'active' | 'inactive' | 'absent' = 'inactive';
        if (lastCheckIn && !lastCheckOut) {
          status = 'active';
        } else if (lastCheckIn && lastCheckOut) {
          const lastActivity = Math.max(lastCheckIn, lastCheckOut);
          const daysSinceLastActivity = (now.getTime() - lastActivity) / (1000 * 60 * 60 * 24);
          status = daysSinceLastActivity > 7 ? 'absent' : 'inactive';
        }

               const performance: EmployeePerformance = {
                 employee: employee as Employee,
                 totalWorkingDays,
                 totalAbsentDays: Math.max(0, totalWorkingDays - currentMonthWorkingDays),
                 currentMonthWorkingDays,
                 currentMonthAbsentDays: Math.max(0, 30 - currentMonthWorkingDays),
                 lastCheckIn,
                 lastCheckOut,
                 status,
                 totalHoursThisMonth,
                 averageHoursPerDay: currentMonthWorkingDays > 0 ? totalHoursThisMonth / currentMonthWorkingDays : 0,
                 checkInTime: checkInRecord?.timestamp,
                 checkOutTime: checkOutRecord?.timestamp,
                 workHours: wasPresent ? (checkOutRecord!.timestamp - checkInRecord!.timestamp) / (1000 * 60 * 60) : 0,
                 checkInImage,
                 checkOutImage,
                 checkInLocation,
                 checkOutLocation,
               };

        performancesForDate.push(performance);
      }

      console.log('Loaded employees for date:', employeesForDate.length);
      console.log('Loaded performances for date:', performancesForDate.length);
      console.log('Employee names:', employeesForDate.map(emp => emp.displayName));
      console.log('Performance data with locations:', performancesForDate.map(perf => ({
        name: perf.employee.displayName,
        checkInLocation: perf.checkInLocation,
        checkOutLocation: perf.checkOutLocation,
        checkInTime: perf.checkInTime,
        checkOutTime: perf.checkOutTime
      })));
      
      // If no employees found, try to load from the main employee list as fallback
      if (employeesForDate.length === 0) {
        console.log('No employees found for specific date, loading all employees as fallback');
        const fallbackEmployees = employees.filter(emp => emp.isActive && emp.role !== 'Owner');
        const fallbackPerformances = employeePerformances.filter(perf => 
          perf.employee.isActive && perf.employee.role !== 'Owner'
        );
        
        setDateEmployees(fallbackEmployees);
        setDateEmployeePerformances(fallbackPerformances);
      } else {
        setDateEmployees(employeesForDate);
        setDateEmployeePerformances(performancesForDate);
      }
      
      setSelectedCalendarDate(date);
      setShowDateDetailsModal(true);
      
    } catch (error) {
      console.error('Error loading employees for date:', error);
      Alert.alert('Error', 'Failed to load employee data for selected date.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToEmployeeDetail = (employee: Employee, performance: EmployeePerformance) => {
    (navigation as any).navigate('EmployeeDetail', { employee: employee as Employee, performance });
  };

  const handleEmployeeClick = (employee: Employee, performance: EmployeePerformance) => {
    console.log('Employee clicked:', employee.displayName);
    console.log('Performance data:', performance);
    console.log('Check-in location:', performance.checkInLocation);
    console.log('Check-out location:', performance.checkOutLocation);
    console.log('Check-in time:', performance.checkInTime);
    console.log('Check-out time:', performance.checkOutTime);
    setSelectedEmployee(employee);
    setSelectedEmployeePerformance(performance);
    setShowEmployeeDetailModal(true);
  };

  const renderDateFilter = () => (
    <View style={styles.dateFilterContainer}>
      <TouchableOpacity 
        style={styles.calendarButton}
        onPress={() => setShowCalendarModal(true)}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        <Text style={styles.calendarButtonText}>
          {selectedDate 
            ? selectedDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })
            : 'Select Date'
          }
        </Text>
        {selectedDate && (
          <TouchableOpacity 
            style={styles.clearDateButton}
            onPress={() => {
              setSelectedDate(null);
              setAttendanceFilter('all');
            }}
          >
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {selectedDate && (
        <View style={styles.attendanceFilterContainer}>
          <TouchableOpacity 
            style={[styles.filterButton, attendanceFilter === 'all' && styles.activeFilterButton]}
            onPress={() => setAttendanceFilter('all')}
          >
            <Text style={[styles.filterText, attendanceFilter === 'all' && styles.activeFilterText]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, attendanceFilter === 'present' && styles.activeFilterButton]}
            onPress={() => setAttendanceFilter('present')}
          >
            <Text style={[styles.filterText, attendanceFilter === 'present' && styles.activeFilterText]}>
              Present
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, attendanceFilter === 'absent' && styles.activeFilterButton]}
            onPress={() => setAttendanceFilter('absent')}
          >
            <Text style={[styles.filterText, attendanceFilter === 'absent' && styles.activeFilterText]}>
              Absent
            </Text>
          </TouchableOpacity>
        </View>
      )}
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

  const renderSummaryStats = () => {
    const totalEmployees = employeePerformances.length;
    const activeEmployees = employeePerformances.filter(emp => emp.status === 'active').length;
    const totalWorkingDays = employeePerformances.reduce((sum, emp) => 
      sum + (selectedPeriod === 'month' ? emp.currentMonthWorkingDays : emp.totalWorkingDays), 0
    );
    const totalHours = employeePerformances.reduce((sum, emp) => 
      sum + (selectedPeriod === 'month' ? emp.totalHoursThisMonth : emp.totalHoursThisMonth), 0
    );

    return (
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Performance Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{totalEmployees}</Text>
            <Text style={styles.summaryLabel}>Total Employees</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{activeEmployees}</Text>
            <Text style={styles.summaryLabel}>Active Now</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{totalWorkingDays}</Text>
            <Text style={styles.summaryLabel}>Working Days</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{totalHours.toFixed(1)}h</Text>
            <Text style={styles.summaryLabel}>Total Hours</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmployeeCard = ({ item }: { item: EmployeePerformance }) => {
    const workingDays = selectedPeriod === 'month' 
      ? item.currentMonthWorkingDays 
      : item.totalWorkingDays;
    const totalHours = selectedPeriod === 'month' 
      ? item.totalHoursThisMonth 
      : item.totalHoursThisMonth;

    return (
      <TouchableOpacity 
        style={styles.employeeCard}
        onPress={() => navigateToEmployeeDetail(item.employee, item)}
        activeOpacity={0.7}
      >
        <View style={styles.employeeHeader}>
          <View style={styles.employeeInfo}>
            {item.employee.photoURL ? (
              <Image source={{ uri: item.employee.photoURL }} style={styles.employeePhoto} />
            ) : (
              <View style={styles.defaultPhoto}>
                <Text style={styles.defaultPhotoText}>
                  {item.employee.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.employeeDetails}>
              <Text style={styles.employeeName}>{item.employee.displayName}</Text>
              <Text style={styles.employeeRole}>{item.employee.designation || item.employee.role}</Text>
              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                </View>
                {item.lastCheckIn && (
                  <Text style={styles.lastActivity}>
                    Last: {formatTime(item.lastCheckIn)}
                  </Text>
                )}
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.performanceMetrics}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{workingDays}</Text>
            <Text style={styles.metricLabel}>Days</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{totalHours.toFixed(1)}h</Text>
            <Text style={styles.metricLabel}>Hours</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>
              {workingDays > 0 ? (totalHours / workingDays).toFixed(1) : '0.0'}h
            </Text>
            <Text style={styles.metricLabel}>Avg/Day</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFullCalendarModal = () => (
    <Modal
      visible={showCalendarModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCalendarModal(false)}
    >
      <View style={styles.calendarModalOverlay}>
        <View style={styles.calendarModal}>
          {/* Header */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity 
              style={styles.calendarNavButton}
              onPress={() => navigateMonth('prev')}
            >
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            
            <Text style={styles.calendarMonthText}>
              {currentMonth.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </Text>
            
            <TouchableOpacity 
              style={styles.calendarNavButton}
              onPress={() => navigateMonth('next')}
            >
              <Ionicons name="chevron-forward" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {/* Day headers */}
            <View style={styles.dayHeaders}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} style={styles.dayHeaderText}>{day}</Text>
              ))}
            </View>

            {/* Calendar days */}
            <View style={styles.calendarDays}>
              {generateCalendarDays(currentMonth).map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.calendarDay,
                    date && isToday(date) && styles.todayDay,
                    date && isSelected(date) && styles.selectedDay,
                    date && isFutureDate(date) && styles.futureDay,
                    !date && styles.emptyDay
                  ]}
                  onPress={() => {
                    if (date && !isFutureDate(date)) {
                      loadEmployeesForDate(date);
                      setShowCalendarModal(false);
                    }
                  }}
                  disabled={!date || isFutureDate(date)}
                >
                  {date && (
                    <Text style={[
                      styles.calendarDayText,
                      isToday(date) && styles.todayDayText,
                      isSelected(date) && styles.selectedDayText,
                      isFutureDate(date) && styles.futureDayText
                    ]}>
                      {date.getDate()}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>


          {/* Footer */}
          <View style={styles.calendarFooter}>
            <TouchableOpacity 
              style={styles.calendarCloseButton}
              onPress={() => setShowCalendarModal(false)}
            >
              <Text style={styles.calendarCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDateDetailsModal = () => {
    const presentEmployees = dateEmployeePerformances.filter(emp => emp.checkInTime && emp.checkOutTime);
    const absentEmployees = dateEmployeePerformances.filter(emp => !emp.checkInTime && !emp.notJoinedYet);
    const notJoinedEmployees = dateEmployeePerformances.filter(emp => emp.notJoinedYet);

    return (
      <Modal
        visible={showDateDetailsModal}
        animationType="slide"
        onRequestClose={() => setShowDateDetailsModal(false)}
      >
        <SafeAreaView style={styles.fullScreenModal}>
          {/* Header */}
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setShowDateDetailsModal(false)}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={styles.fullScreenTitle}>
                {selectedCalendarDate?.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          {isLoading ? (
            <View style={styles.dateLoadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.dateLoadingText}>Loading employee data...</Text>
            </View>
          ) : (
            <ScrollView style={styles.fullScreenContent} showsVerticalScrollIndicator={false}>
              {/* Summary Stats */}
              <View style={styles.summaryStatsContainer}>
                <View style={styles.summaryStatCard}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  <Text style={styles.summaryStatNumber}>{presentEmployees.length}</Text>
                  <Text style={styles.summaryStatLabel}>Present</Text>
                </View>
                <View style={styles.summaryStatCard}>
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                  <Text style={styles.summaryStatNumber}>{absentEmployees.length}</Text>
                  <Text style={styles.summaryStatLabel}>Absent</Text>
                </View>
                <View style={styles.summaryStatCard}>
                  <Ionicons name="person-add" size={24} color={colors.warning} />
                  <Text style={styles.summaryStatNumber}>{notJoinedEmployees.length}</Text>
                  <Text style={styles.summaryStatLabel}>Not Joined</Text>
                </View>
              </View>

              {/* Present Employees Section */}
              {presentEmployees.length > 0 && (
                <View style={styles.employeeSection}>
                         <View style={styles.sectionHeader}>
                           <Text style={styles.sectionTitle}>Present Employees ({presentEmployees.length})</Text>
                         </View>
                  {presentEmployees.map((performance) => (
                    <TouchableOpacity
                      key={performance.employee.uid}
                      style={[styles.employeeCard, styles.presentCard]}
                      onPress={() => handleEmployeeClick(performance.employee, performance)}
                    >
                      <View style={styles.employeeCardContent}>
                        <View style={styles.employeeAvatarContainer}>
                          {performance.employee.photoURL ? (
                            <Image source={{ uri: performance.employee.photoURL }} style={styles.employeeAvatar} />
                          ) : (
                            <View style={styles.employeeAvatarPlaceholder}>
                              <Text style={styles.employeeAvatarText}>
                                {performance.employee.displayName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.employeeInfo}>
                          <View style={styles.employeeHeaderRow}>
                            <Text style={styles.employeeName}>{performance.employee.displayName}</Text>
                            <Text style={styles.employeeDesignation}>{performance.employee.designation || performance.employee.role}</Text>
                            <Text style={styles.workHoursText}>
                              {performance.workHours?.toFixed(1)}h
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                          </View>
                          <View style={styles.attendanceInfo}>
                            <Text style={styles.attendanceStatus}>
                              Present
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Absent Employees Section */}
              {absentEmployees.length > 0 && (
                <View style={styles.employeeSection}>
                         <View style={styles.sectionHeader}>
                           <Text style={styles.sectionTitle}>Absent Employees ({absentEmployees.length})</Text>
                         </View>
                  {absentEmployees.map((performance) => (
                    <TouchableOpacity
                      key={performance.employee.uid}
                      style={[styles.employeeCard, styles.absentCard]}
                      onPress={() => handleEmployeeClick(performance.employee, performance)}
                    >
                      <View style={styles.employeeCardContent}>
                        <View style={styles.employeeAvatarContainer}>
                          {performance.employee.photoURL ? (
                            <Image source={{ uri: performance.employee.photoURL }} style={styles.employeeAvatar} />
                          ) : (
                            <View style={styles.employeeAvatarPlaceholder}>
                              <Text style={styles.employeeAvatarText}>
                                {performance.employee.displayName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.employeeInfo}>
                          <View style={styles.employeeHeaderRow}>
                            <Text style={styles.employeeName}>{performance.employee.displayName}</Text>
                            <Text style={styles.employeeDesignation}>{performance.employee.designation || performance.employee.role}</Text>
                            <Text style={styles.workHoursText}>0h</Text>
                            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Not Joined Employees Section */}
              {notJoinedEmployees.length > 0 && (
                <View style={styles.employeeSection}>
                         <View style={styles.sectionHeader}>
                           <Text style={styles.sectionTitle}>Not Yet Joined ({notJoinedEmployees.length})</Text>
                         </View>
                  {notJoinedEmployees.map((performance) => (
                    <TouchableOpacity
                      key={performance.employee.uid}
                      style={[styles.employeeCard, styles.notJoinedCard]}
                      onPress={() => handleEmployeeClick(performance.employee, performance)}
                    >
                      <View style={styles.employeeCardContent}>
                        <View style={styles.employeeAvatarContainer}>
                          {performance.employee.photoURL ? (
                            <Image source={{ uri: performance.employee.photoURL }} style={styles.employeeAvatar} />
                          ) : (
                            <View style={styles.employeeAvatarPlaceholder}>
                              <Text style={styles.employeeAvatarText}>
                                {performance.employee.displayName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.employeeInfo}>
                          <View style={styles.employeeHeaderRow}>
                            <Text style={styles.employeeName}>{performance.employee.displayName}</Text>
                            <Text style={styles.employeeDesignation}>{performance.employee.designation || performance.employee.role}</Text>
                            <Text style={styles.workHoursText}>0h</Text>
                            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Empty State */}
              {dateEmployees.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={64} color={colors.textMuted} />
                  <Text style={styles.emptyStateText}>No employees found</Text>
                  <Text style={styles.emptyStateSubtext}>Unable to load employee data for this date</Text>
                  <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={() => selectedCalendarDate && loadEmployeesForDate(selectedCalendarDate)}
                  >
                    <Text style={styles.retryButtonText}>Retry Loading</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    );
  };

  const renderEmployeeDetailModal = () => {
    if (!selectedEmployee || !selectedEmployeePerformance) return null;
    
    console.log('Rendering modal for:', selectedEmployee.displayName);
    console.log('Modal performance data:', selectedEmployeePerformance);
    console.log('Modal check-in location:', selectedEmployeePerformance.checkInLocation);
    console.log('Modal check-out location:', selectedEmployeePerformance.checkOutLocation);
    console.log('Modal check-in time:', selectedEmployeePerformance.checkInTime);
    console.log('Modal check-out time:', selectedEmployeePerformance.checkOutTime);
    console.log('Modal selected date:', selectedCalendarDate);

    return (
      <Modal
        visible={showEmployeeDetailModal}
        animationType="slide"
        onRequestClose={() => setShowEmployeeDetailModal(false)}
      >
        <SafeAreaView style={styles.fullScreenModal}>
          {/* Header */}
          <View style={styles.fullScreenHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setShowEmployeeDetailModal(false)}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="person" size={20} color={colors.primary} />
              <Text style={styles.fullScreenTitle}>Employee Details</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.fullScreenContent} showsVerticalScrollIndicator={false}>
            {/* Employee Info Card */}
            <View style={styles.employeeDetailCard}>
              <View style={styles.employeeDetailHeader}>
                <View style={styles.employeeDetailAvatarContainer}>
                  {selectedEmployee.photoURL ? (
                    <Image source={{ uri: selectedEmployee.photoURL }} style={styles.employeeDetailAvatar} />
                  ) : (
                    <View style={styles.employeeDetailAvatarPlaceholder}>
                      <Text style={styles.employeeDetailAvatarText}>
                        {selectedEmployee.displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.employeeDetailInfo}>
                  <Text style={styles.employeeDetailName}>{selectedEmployee.displayName}</Text>
                  <Text style={styles.employeeDetailRole}>{selectedEmployee.designation || selectedEmployee.role}</Text>
                  <Text style={styles.employeeDetailEmail}>{selectedEmployee.email}</Text>
                  {selectedEmployee.phone && (
                    <Text style={styles.employeeDetailPhone}>{selectedEmployee.phone}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Date Info */}
            <View style={styles.dateInfoCard}>
              <View style={styles.dateInfoHeader}>
                <Ionicons name="calendar" size={20} color={colors.primary} />
                <Text style={styles.dateInfoTitle}>Attendance for {selectedCalendarDate?.toLocaleDateString()}</Text>
              </View>
            </View>

            {/* Attendance Details */}
            {selectedEmployeePerformance.notJoinedYet ? (
              <View style={styles.attendanceDetailCard}>
                <View style={styles.attendanceStatusContainer}>
                  <Ionicons name="person-add" size={48} color={colors.warning} />
                  <Text style={styles.attendanceStatusTitle}>Not Yet Joined</Text>
                  <Text style={styles.attendanceStatusText}>
                    This employee has not joined yet
                  </Text>
                </View>
              </View>
            ) : selectedEmployeePerformance.checkInTime && selectedEmployeePerformance.checkOutTime ? (
              <View style={styles.attendanceDetailCard}>
                <View style={styles.attendanceStatusContainer}>
                  <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                  <Text style={styles.attendanceStatusTitle}>Present</Text>
                </View>

                       {/* Check-in Details */}
                       <View style={styles.attendanceTimeSection}>
                         <View style={styles.attendanceTimeHeader}>
                           <Ionicons name="log-in" size={20} color={colors.success} />
                           <Text style={styles.attendanceTimeTitle}>Check-in</Text>
                         </View>
                         <Text style={styles.attendanceTime}>
                           {new Date(selectedEmployeePerformance.checkInTime).toLocaleTimeString([], {
                             hour: '2-digit',
                             minute: '2-digit',
                             second: '2-digit'
                           })}
                         </Text>
                         <View style={styles.locationSection}>
                           <Ionicons name="location" size={16} color={colors.primary} />
                           <Text style={styles.locationText}>
                             {selectedEmployeePerformance.checkInLocation || 'Location not available'}
                           </Text>
                         </View>
                         {selectedEmployeePerformance.checkInImage && (
                           <View style={styles.attendanceImageSection}>
                             <Text style={styles.attendanceImageTitle}>Check-in Photo</Text>
                             <Image
                               source={{ uri: selectedEmployeePerformance.checkInImage }}
                               style={styles.attendanceDetailImage}
                             />
                           </View>
                         )}
                       </View>

                       {/* Check-out Details */}
                       <View style={styles.attendanceTimeSection}>
                         <View style={styles.attendanceTimeHeader}>
                           <Ionicons name="log-out" size={20} color={colors.error} />
                           <Text style={styles.attendanceTimeTitle}>Check-out</Text>
                         </View>
                         <Text style={styles.attendanceTime}>
                           {new Date(selectedEmployeePerformance.checkOutTime).toLocaleTimeString([], {
                             hour: '2-digit',
                             minute: '2-digit',
                             second: '2-digit'
                           })}
                         </Text>
                         <View style={styles.locationSection}>
                           <Ionicons name="location" size={16} color={colors.primary} />
                           <Text style={styles.locationText}>
                             {selectedEmployeePerformance.checkOutLocation || 'Location not available'}
                           </Text>
                         </View>
                         {selectedEmployeePerformance.checkOutImage && (
                           <View style={styles.attendanceImageSection}>
                             <Text style={styles.attendanceImageTitle}>Check-out Photo</Text>
                             <Image
                               source={{ uri: selectedEmployeePerformance.checkOutImage }}
                               style={styles.attendanceDetailImage}
                             />
                           </View>
                         )}
                       </View>

                {/* Work Hours */}
                <View style={styles.workHoursSection}>
                  <View style={styles.workHoursHeader}>
                    <Ionicons name="time" size={20} color={colors.primary} />
                    <Text style={styles.workHoursTitle}>Work Hours</Text>
                  </View>
                  <Text style={styles.workHoursValue}>
                    {selectedEmployeePerformance.workHours?.toFixed(1)} hours
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.attendanceDetailCard}>
                <View style={styles.attendanceStatusContainer}>
                  <Ionicons name="close-circle" size={48} color={colors.error} />
                  <Text style={styles.attendanceStatusTitle}>Absent</Text>
                  <Text style={styles.attendanceStatusText}>
                    No attendance recorded for this date
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Employee Performance</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading performance data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Employee Performance</Text>
        <Text style={styles.subtitle}>Track attendance and performance metrics</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderDateFilter()}
        {renderPeriodSelector()}
        {renderSummaryStats()}

        <View style={styles.employeesSection}>
          <Text style={styles.sectionTitle}>Employee Performance</Text>
          {employeePerformances.length > 0 ? (
            <FlatList
              data={employeePerformances}
              renderItem={renderEmployeeCard}
              keyExtractor={(item) => item.employee.uid}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.employeesList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyText}>No employees found</Text>
              <Text style={styles.emptySubtext}>
                Add employees in Employee Management to track their performance
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {renderFullCalendarModal()}
      {renderDateDetailsModal()}
      {renderEmployeeDetailModal()}
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
  },
  content: {
    flex: 1,
    padding: spacing.lg,
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: colors.surface2,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  employeesSection: {
    marginBottom: spacing.lg,
  },
  employeesList: {
    gap: spacing.md,
  },
  employeeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow.card,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  employeeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginBottom: 2,
  },
  employeePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: spacing.md,
  },
  defaultPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  defaultPhotoText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  employeeDetails: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  employeeRole: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statusText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  lastActivity: {
    fontSize: 12,
    color: colors.textMuted,
  },
  performanceMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
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
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  dateFilterContainer: {
    marginBottom: spacing.lg,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow.card,
  },
  calendarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  clearDateButton: {
    marginLeft: spacing.sm,
  },
  attendanceFilterContainer: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    alignItems: 'center',
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeFilterText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  // Full Calendar Modal Styles
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  calendarModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '90%',
    ...shadow.card,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  calendarNavButton: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },
  calendarMonthText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  calendarGrid: {
    padding: spacing.lg,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
  },
  calendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  emptyDay: {
    backgroundColor: 'transparent',
  },
  todayDay: {
    backgroundColor: colors.primary,
  },
  selectedDay: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  todayDayText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  selectedDayText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  selectedDateUsers: {
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    padding: spacing.lg,
    maxHeight: 300,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  usersList: {
    maxHeight: 200,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow.card,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.md,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  userAvatarText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  userStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  userStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  calendarFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  calendarCloseButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  calendarCloseButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  // Date Details Modal Styles
  dateDetailsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  dateDetailsModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '90%',
    ...shadow.card,
  },
  dateDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  dateDetailsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateDetailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  dateDetailsCloseButton: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },
  dateSummaryStats: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  dateStatCard: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  dateStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  dateStatLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dateEmployeesList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  dateEmployeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow.card,
  },
  dateEmployeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateEmployeeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: spacing.md,
  },
  dateEmployeeAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  dateEmployeeAvatarText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  dateEmployeeDetails: {
    flex: 1,
  },
  dateEmployeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  dateEmployeeRole: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dateEmployeeHours: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  dateEmployeeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateStatusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  dateEmptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  dateEmptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  dateEmptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Future date styles
  futureDay: {
    backgroundColor: colors.surface2,
    opacity: 0.5,
  },
  futureDayText: {
    color: colors.textMuted,
  },
  // Employee detail styles
  notJoinedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  notJoinedText: {
    fontSize: 12,
    color: colors.warning,
    marginLeft: 4,
    fontWeight: '500',
  },
  attendanceDetails: {
    marginTop: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  workHoursText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  absentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  absentText: {
    fontSize: 12,
    color: colors.error,
    marginLeft: 4,
    fontWeight: '500',
  },
  // Date loading styles
  dateLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dateLoadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  // Retry button styles
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Enhanced card styles
  presentCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    backgroundColor: colors.surface,
  },
  absentCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    backgroundColor: colors.surface,
  },
  notJoinedCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    backgroundColor: colors.surface,
  },
  employeeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusBadgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  workHoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  // Attendance image styles
  attendanceImageContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  attendanceImageLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  attendanceImage: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  // Full Screen Modal Styles
  fullScreenModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    ...shadow.card,
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: spacing.md,
  },
  fullScreenTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  headerSpacer: {
    width: 40,
  },
  fullScreenContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  // Summary Stats
  summaryStatsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  summaryStatCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow.card,
  },
  summaryStatNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  summaryStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Employee Sections
  employeeSection: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  employeeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  employeeAvatarContainer: {
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  employeeAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeAvatarText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  quickInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 2,
  },
  quickInfoText: {
    fontSize: 10,
    color: colors.textMuted,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.pill,
    fontWeight: '500',
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  employeeDesignation: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  attendanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  attendanceInfoAbsent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
    paddingTop: 2,
  },
  attendanceTime: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  attendanceStatus: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  // Employee Detail Modal Styles
  employeeDetailCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow.card,
  },
  employeeDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeDetailAvatarContainer: {
    marginRight: spacing.md,
  },
  employeeDetailAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  employeeDetailAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeDetailAvatarText: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  employeeDetailInfo: {
    flex: 1,
  },
  employeeDetailName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  employeeDetailRole: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  employeeDetailEmail: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 1,
  },
  employeeDetailPhone: {
    fontSize: 12,
    color: colors.textMuted,
  },
  dateInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow.card,
  },
  dateInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  attendanceDetailCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow.card,
  },
  attendanceStatusContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  attendanceStatusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  attendanceStatusText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  attendanceTimeSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  attendanceTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  attendanceTimeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  attendanceImageSection: {
    marginTop: spacing.sm,
  },
  attendanceImageTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  attendanceDetailImage: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  workHoursSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  workHoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  workHoursTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  workHoursValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  locationText: {
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
    fontWeight: '500',
  },
});

export default EmployeePerformanceScreen;
