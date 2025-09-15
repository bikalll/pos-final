import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../../theme';
import { getFirebaseAuthEnhanced, createFirebaseAuthEnhanced, UserMetadata } from '../../services/firebaseAuthEnhanced';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/storeFirebase';
import { createFirestoreService } from '../../services/firestoreService';

interface Employee extends Omit<UserMetadata, 'role'> {
  phone?: string;
  designation?: string;
  joinDate?: number;
  isActive: boolean;
  role: 'Owner' | 'manager' | 'staff';
  employmentType?: 'full-time' | 'part-time';
}

interface FormErrors {
  displayName?: string;
  email?: string;
  password?: string;
  phone?: string;
  designation?: string;
}

const EmployeeManagementScreen: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [generatedCredentials, setGeneratedCredentials] = useState<{email: string; password: string} | null>(null);
  const [selectedEmployeeForMenu, setSelectedEmployeeForMenu] = useState<Employee | null>(null);
  const [showEmployeeMenu, setShowEmployeeMenu] = useState(false);
  const [showDesignationDropdown, setShowDesignationDropdown] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    displayName: '',
    email: '',
    password: '',
    phone: '',
    designation: '',
    role: 'staff' as 'manager' | 'staff',
    employmentType: 'full-time' as 'full-time' | 'part-time',
  });

  const authState = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();


  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    if (!authState.isLoggedIn || authState.role !== 'Owner') {
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

        return {
          ...user,
          role: user.role === 'employee' ? 'staff' : user.role as 'Owner' | 'manager' | 'staff',
          phone: staffInfo?.phone || '',
          designation: staffInfo?.designation || staffInfo?.role || '',
          employmentType: staffInfo?.employmentType || 'full-time',
          joinDate: staffInfo?.joinDate || user.createdAt,
          isActive: user.isActive,
        };
      });

      setEmployees(employeeList);
    } catch (error) {
      console.error('Error loading employees:', error);
      Alert.alert('Error', 'Failed to load employees. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEmployees = employees.filter(employee => 
    searchQuery === '' || employee.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!newEmployee.displayName.trim()) {
      errors.displayName = 'Name is required';
    } else if (newEmployee.displayName.trim().length < 2) {
      errors.displayName = 'Name must be at least 2 characters';
    }
    
    if (!newEmployee.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmployee.email.trim())) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!newEmployee.password.trim()) {
      errors.password = 'Password is required';
    } else if (newEmployee.password.trim().length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!newEmployee.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(newEmployee.phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    if (!newEmployee.designation.trim()) {
      errors.designation = 'Please select a job title';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddEmployee = async () => {
    if (!validateForm()) return;
    
    if (!authState.isLoggedIn || authState.role !== 'Owner') {
      Alert.alert('Error', 'Only owners can create employee accounts');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let authService;
      try {
        authService = getFirebaseAuthEnhanced();
      } catch (error) {
        console.log('Firebase auth enhanced not initialized, creating new instance...');
        authService = createFirebaseAuthEnhanced(dispatch);
      }
      
      // Create Firebase account with provided email and password
      const result = await authService.createEmployeeCredentials(
        newEmployee.email.trim().toLowerCase(),
        newEmployee.displayName.trim(),
        authState.restaurantId || '',
        authState.userId || '',
        newEmployee.password.trim() // Pass the user-provided password
      );

      // Create staff record in Firestore with additional details
      const firestoreService = createFirestoreService(authState.restaurantId || '');
      await firestoreService.createStaffMember({
        id: result.userMetadata.uid,
        name: newEmployee.displayName.trim(),
        email: newEmployee.email.trim().toLowerCase(),
        phone: newEmployee.phone.trim(),
        role: newEmployee.designation.trim() || 'Staff', // Use actual designation or default to Staff
        designation: newEmployee.designation.trim() || 'Staff', // Store designation separately
        employmentType: newEmployee.employmentType,
        joinDate: Date.now(),
        isActive: true,
      });

      // Show the credentials that were actually used to create the account
      setGeneratedCredentials({
        email: result.credentials.email,
        password: result.credentials.password
      });
      
      setShowCredentialsModal(true);
      
      // Refresh employee list
      await loadEmployeeData();
      
      setShowAddModal(false);
      resetNewEmployee();
      setFormErrors({});
      
    } catch (error: any) {
      console.error('Create employee error:', error);
      
      let errorMessage = 'Failed to create employee account. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      } else if (error.message === 'Only owners can create employee accounts') {
        errorMessage = 'You do not have permission to create employee accounts.';
      }
      
      Alert.alert('Create Employee Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (generatedCredentials) {
      // In a real app, you'd use a clipboard library
      Alert.alert(
        'Credentials Copied',
        `Email: ${generatedCredentials.email}\nPassword: ${generatedCredentials.password}\n\nPlease provide these credentials to the employee.`,
        [{ text: 'OK', onPress: () => setShowCredentialsModal(false) }]
      );
    }
  };


  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setNewEmployee({
      displayName: employee.displayName,
      email: employee.email,
      password: '', // Empty password for editing
      phone: employee.phone || '',
      designation: employee.designation || '',
      role: employee.role === 'Owner' ? 'manager' : employee.role,
      employmentType: employee.employmentType || 'full-time',
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee || !validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Update staff record in Firestore
      const firestoreService = createFirestoreService(authState.restaurantId || '');
      await firestoreService.updateStaffMember(editingEmployee.uid, {
        name: newEmployee.displayName.trim(),
        email: newEmployee.email.trim().toLowerCase(),
        phone: newEmployee.phone.trim(),
        role: newEmployee.designation.trim() || 'Staff',
        designation: newEmployee.designation.trim() || 'Staff',
        employmentType: newEmployee.employmentType,
      });
      
      const updatedEmployees = employees.map(employee => 
        employee.uid === editingEmployee.uid ? {
          ...employee,
          displayName: newEmployee.displayName.trim(),
          email: newEmployee.email.trim().toLowerCase(),
          phone: newEmployee.phone.trim(),
          designation: newEmployee.designation.trim(),
          role: newEmployee.role,
        } : employee
      );

      setEmployees(updatedEmployees);
      setShowAddModal(false);
      setEditingEmployee(null);
      resetNewEmployee();
      setFormErrors({});
      
      Alert.alert('Success', 'Employee updated successfully!');
    } catch (error) {
      console.error('Update employee error:', error);
      Alert.alert('Error', 'Failed to update employee. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateEmployee = async (employeeId: string) => {
    Alert.alert(
      'Activate Employee',
      'Are you sure you want to activate this employee? They will be able to log in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Activate', 
          style: 'default',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              
              // Get the auth service
              let authService;
              try {
                authService = getFirebaseAuthEnhanced();
              } catch (error) {
                authService = createFirebaseAuthEnhanced(dispatch);
              }
              
              // Activate the user account
              await authService.activateUser(employeeId);
              
              // Update local state to mark as active
              setEmployees(prev => prev.map(emp => 
                emp.uid === employeeId ? { ...emp, isActive: true } : emp
              ));
              
              Alert.alert('Success', 'Employee activated successfully! They can now log in.');
            } catch (error) {
              console.error('Error activating employee:', error);
              Alert.alert('Error', 'Failed to activate employee. Please try again.');
            } finally {
              setIsSubmitting(false);
            }
          }
        },
      ]
    );
  };

  const handleDeactivateEmployee = async (employeeId: string) => {
    // Check if the employee being deactivated is the current owner
    if (employeeId === authState.userId) {
      Alert.alert(
        'Cannot Deactivate',
        'You cannot deactivate your own account. Please ask another owner to deactivate your account if needed.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    Alert.alert(
      'Deactivate Employee',
      'Are you sure you want to deactivate this employee? They will not be able to log in but will remain in the list.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Deactivate', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              
              // Get the auth service
              let authService;
              try {
                authService = getFirebaseAuthEnhanced();
              } catch (error) {
                authService = createFirebaseAuthEnhanced(dispatch);
              }
              
              // Deactivate the user account (this will set isActive: false and prevent login)
              await authService.deactivateUser(employeeId);
              
              // Update local state to mark as inactive
              setEmployees(prev => prev.map(emp => 
                emp.uid === employeeId ? { ...emp, isActive: false } : emp
              ));
              
              Alert.alert('Success', 'Employee deactivated successfully! They can no longer log in.');
            } catch (error) {
              console.error('Error deactivating employee:', error);
              Alert.alert('Error', 'Failed to deactivate employee. Please try again.');
            } finally {
              setIsSubmitting(false);
            }
          }
        },
      ]
    );
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    // Check if the employee being deleted is the current owner
    if (employeeId === authState.userId) {
      Alert.alert(
        'Cannot Delete',
        'You cannot delete your own account. Please ask another owner to delete your account if needed.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    Alert.alert(
      'Delete Employee',
      'Are you sure you want to permanently delete this employee? This action cannot be undone and they will be completely removed from the system.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              
              // Get the auth service
              let authService;
              try {
                authService = getFirebaseAuthEnhanced();
              } catch (error) {
                authService = createFirebaseAuthEnhanced(dispatch);
              }
              
              // Deactivate the user account first
              await authService.deactivateUser(employeeId);
              
              // Remove from local state completely
              setEmployees(prev => prev.filter(emp => emp.uid !== employeeId));
              
              Alert.alert('Success', 'Employee deleted successfully! They have been completely removed from the system.');
            } catch (error) {
              console.error('Error deleting employee:', error);
              Alert.alert('Error', 'Failed to delete employee. Please try again.');
            } finally {
              setIsSubmitting(false);
            }
          }
        },
      ]
    );
  };

  const resetNewEmployee = () => {
    setNewEmployee({
      displayName: '',
      email: '',
      password: '',
      phone: '',
      designation: '',
      role: 'staff',
      employmentType: 'full-time',
    });
    setFormErrors({});
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingEmployee(null);
    setShowDesignationDropdown(false);
    resetNewEmployee();
  };

  const handleEmployeeMenu = (employee: Employee) => {
    setSelectedEmployeeForMenu(employee);
    setShowEmployeeMenu(true);
  };

  const handleEmployeeDetails = (employee: Employee) => {
    // For now, just show an alert with employee details
    Alert.alert(
      'Employee Details',
      `Name: ${employee.displayName}\nEmail: ${employee.email}\nPhone: ${employee.phone || 'Not provided'}\nRole: ${employee.role}\nStatus: ${employee.isActive ? 'Active' : 'Inactive'}\nJoined: ${new Date(employee.joinDate || employee.createdAt).toLocaleDateString()}`,
      [{ text: 'OK' }]
    );
  };

  const renderEmployee = ({ item }: { item: Employee }) => (
    <View style={[styles.employeeCard, !item.isActive && styles.inactiveEmployeeCard]}>
      {/* Status Badge */}
      <View style={styles.statusBadge}>
        <View style={[styles.statusDot, { backgroundColor: item.isActive ? colors.success : colors.danger }]} />
        <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
      </View>

      {/* Menu Button */}
      <TouchableOpacity 
        style={styles.menuButton}
        onPress={() => handleEmployeeMenu(item)}
      >
        <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Profile Picture */}
      <View style={styles.profilePicture}>
        <Ionicons name="person" size={40} color={colors.textSecondary} />
      </View>

      {/* Employee Name */}
      <Text style={styles.employeeName}>{item.displayName}</Text>
      
      {/* Designation */}
      <Text style={styles.employeeTitle}>
        {item.role === 'Owner' ? 'Owner' : (item.designation || 'Staff')}
      </Text>

      {/* Job Attributes */}
      <View style={styles.jobAttributes}>
        <Text style={styles.jobAttribute}>
          {item.role === 'Owner' ? 'Owner' : (item.designation || 'Staff')}
        </Text>
        <Text style={styles.jobAttributeSeparator}>•</Text>
        <Text style={styles.jobAttribute}>Onsite</Text>
        <Text style={styles.jobAttributeSeparator}>•</Text>
        <Text style={styles.jobAttribute}>
          {item.employmentType === 'part-time' ? 'Part Time' : 'Full Time'}
        </Text>
      </View>

      {/* Contact Information */}
      <View style={styles.contactInfo}>
        <Text style={styles.contactLabel}>Email : </Text>
        <Text style={styles.contactValue}>{item.email}</Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactLabel}>Phone : </Text>
        <Text style={styles.contactValue}>{item.phone || 'Not provided'}</Text>
      </View>

      {/* Bottom Section */}
      <View style={styles.cardBottom}>
        <Text style={styles.joinDate}>
          Joined : {item.joinDate ? new Date(item.joinDate).toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: '2-digit' 
          }) : new Date(item.createdAt).toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: '2-digit' 
          })}
        </Text>
        <TouchableOpacity 
          style={styles.detailsButton}
          onPress={() => handleEmployeeDetails(item)}
        >
          <Text style={styles.detailsButtonText}>Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'owner': return colors.primary;
      case 'manager': return colors.primary;
      case 'staff': return colors.success;
      default: return colors.outline;
    }
  };

  const renderFormField = (
    label: string,
    field: 'displayName' | 'email' | 'password' | 'phone' | 'designation',
    placeholder: string,
    keyboardType: 'default' | 'email-address' | 'phone-pad' = 'default',
    autoCapitalize: 'none' | 'sentences' | 'words' | 'characters' = 'sentences',
    secureTextEntry: boolean = false
  ) => (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[
          styles.formInput,
          formErrors[field] && styles.formInputError
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={newEmployee[field]}
        onChangeText={(text) => {
          setNewEmployee(prev => ({ ...prev, [field]: text }));
          if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: undefined }));
          }
        }}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        returnKeyType="next"
        blurOnSubmit={false}
        secureTextEntry={secureTextEntry}
      />
      {formErrors[field] && (
        <Text style={styles.errorText}>{formErrors[field]}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Employee Management</Text>
        <Text style={styles.subtitle}>Manage restaurant staff and roles</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{employees.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {employees.filter(e => e.isActive).length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {employees.filter(e => !e.isActive).length}
          </Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
      </View>

      {/* Search and Add Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employees..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>


      {/* Employee List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading employees...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          renderItem={renderEmployee}
          keyExtractor={(item) => item.uid}
          style={styles.employeeList}
          contentContainerStyle={styles.employeeListContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add/Edit Employee Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
                disabled={isSubmitting}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalForm}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalFormContent}
            >
              {/* Personal Information Section */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                
                {renderFormField('Full Name', 'displayName', 'Enter full name')}
                {renderFormField('Email Address', 'email', 'Enter email address', 'email-address', 'none')}
                {renderFormField('Phone Number', 'phone', 'Enter phone number', 'phone-pad')}
                
                {/* Designation Field */}
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Job Designation</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newEmployee.designation}
                    onChangeText={(text) => setNewEmployee(prev => ({ ...prev, designation: text }))}
                    placeholder="e.g.,Chef"
                    placeholderTextColor={colors.textSecondary}
                    editable={!isSubmitting}
                  />
                  {formErrors.designation && (
                    <Text style={styles.errorText}>{formErrors.designation}</Text>
                  )}
                </View>
              </View>

              {/* Employment Details Section */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Employment Details</Text>
                
                {/* Employment Type Selection */}
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Employment Type</Text>
                  <View style={styles.employmentTypeSelection}>
                    {(['full-time', 'part-time'] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.employmentTypeOption,
                          newEmployee.employmentType === type && styles.employmentTypeOptionActive
                        ]}
                        onPress={() => setNewEmployee(prev => ({ ...prev, employmentType: type }))}
                        disabled={isSubmitting}
                      >
                        <View style={styles.radioContainer}>
                          <View style={[
                            styles.radioButton,
                            newEmployee.employmentType === type && styles.radioButtonActive
                          ]}>
                            {newEmployee.employmentType === type && <View style={styles.radioButtonInner} />}
                          </View>
                          <Text style={[
                            styles.employmentTypeOptionText,
                            newEmployee.employmentType === type && styles.employmentTypeOptionTextActive
                          ]}>
                            {type === 'full-time' ? 'Full Time' : 'Part Time'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Role Selection */}
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Access Level</Text>
                  <View style={styles.roleSelection}>
                    {(['manager', 'staff'] as const).map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleOption,
                          newEmployee.role === role && styles.roleOptionActive
                        ]}
                        onPress={() => setNewEmployee(prev => ({ ...prev, role }))}
                        disabled={isSubmitting}
                      >
                        <View style={styles.radioContainer}>
                          <View style={[
                            styles.radioButton,
                            newEmployee.role === role && styles.radioButtonActive
                          ]}>
                            {newEmployee.role === role && <View style={styles.radioButtonInner} />}
                          </View>
                          <Text style={[
                            styles.roleOptionText,
                            newEmployee.role === role && styles.roleOptionTextActive
                          ]}>
                            {role === 'manager' ? 'Manager' : 'Staff'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Account Security Section */}
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Account Security</Text>
                {renderFormField('Password', 'password', 'Set login password', 'default', 'none', true)}
                <Text style={styles.helpText}>
                  Employee will use this password to sign in to the system
                </Text>
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={closeModal}
                disabled={isSubmitting}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.modalButtonConfirm,
                  isSubmitting && styles.modalButtonDisabled
                ]}
                onPress={handleAddEmployee}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <View style={styles.modalLoadingContainer}>
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                    <Text style={styles.modalButtonConfirmText}>Creating...</Text>
                  </View>
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Create Employee</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Credentials Modal */}
      <Modal
        visible={showCredentialsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCredentialsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Employee Credentials Created</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCredentialsModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.credentialsContent}>
              <View style={styles.credentialsIcon}>
                <Ionicons name="checkmark-circle" size={64} color={colors.success} />
              </View>
              
              <Text style={styles.credentialsTitle}>Account Created Successfully!</Text>
              <Text style={styles.credentialsSubtitle}>
                The employee can now sign in using these credentials:
              </Text>

              <View style={styles.credentialsBox}>
                <View style={styles.credentialItem}>
                  <Text style={styles.credentialLabel}>Email:</Text>
                  <Text style={styles.credentialValue}>{generatedCredentials?.email}</Text>
                </View>
                <View style={styles.credentialItem}>
                  <Text style={styles.credentialLabel}>Password:</Text>
                  <Text style={styles.credentialValue}>{generatedCredentials?.password}</Text>
                </View>
              </View>

              <Text style={styles.credentialsWarning}>
                ⚠️ Please provide these credentials to the employee securely. 
                They should change their password on first login.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowCredentialsModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Close</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleCopyCredentials}
              >
                <Text style={styles.modalButtonConfirmText}>Copy Credentials</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Employee Action Menu Modal */}
      <Modal
        visible={showEmployeeMenu}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowEmployeeMenu(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowEmployeeMenu(false)}
        >
          <View style={styles.menuContent}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>
                {selectedEmployeeForMenu?.displayName}
              </Text>
              <TouchableOpacity
                style={styles.menuCloseButton}
                onPress={() => setShowEmployeeMenu(false)}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.menuActions}>
              <TouchableOpacity
                style={styles.menuAction}
                onPress={() => {
                  setShowEmployeeMenu(false);
                  handleEmployeeDetails(selectedEmployeeForMenu!);
                }}
              >
                <Ionicons name="eye" size={20} color={colors.textPrimary} />
                <Text style={styles.menuActionText}>View Details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.menuAction}
                onPress={() => {
                  setShowEmployeeMenu(false);
                  handleEditEmployee(selectedEmployeeForMenu!);
                }}
              >
                <Ionicons name="create" size={20} color={colors.textPrimary} />
                <Text style={styles.menuActionText}>Edit Employee</Text>
              </TouchableOpacity>
              
              {selectedEmployeeForMenu?.isActive ? (
                <TouchableOpacity
                  style={[styles.menuAction, styles.menuActionWarning]}
                  onPress={() => {
                    setShowEmployeeMenu(false);
                    handleDeactivateEmployee(selectedEmployeeForMenu!.uid);
                  }}
                >
                  <Ionicons name="pause-circle" size={20} color={colors.warning} />
                  <Text style={[styles.menuActionText, styles.menuActionWarningText]}>Deactivate</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.menuAction, styles.menuActionSuccess]}
                  onPress={() => {
                    setShowEmployeeMenu(false);
                    handleActivateEmployee(selectedEmployeeForMenu!.uid);
                  }}
                >
                  <Ionicons name="play-circle" size={20} color={colors.success} />
                  <Text style={[styles.menuActionText, styles.menuActionSuccessText]}>Activate</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.menuAction, styles.menuActionDanger]}
                onPress={() => {
                  setShowEmployeeMenu(false);
                  handleDeleteEmployee(selectedEmployeeForMenu!.uid);
                }}
              >
                <Ionicons name="trash" size={20} color={colors.danger} />
                <Text style={[styles.menuActionText, styles.menuActionDangerText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    marginRight: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  addButton: {
    backgroundColor: colors.surface,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow.card,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadow.card,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  addButtonContainer: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  employeeList: {
    flex: 1,
  },
  employeeListContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  employeeCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    position: 'relative',
    minHeight: 200,
    ...shadow.card,
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  menuButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  employeeName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  employeeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  jobAttributes: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  jobAttribute: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  jobAttributeSeparator: {
    fontSize: 14,
    color: colors.textSecondary,
    marginHorizontal: spacing.sm,
  },
  contactInfo: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  contactLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    minWidth: 60,
  },
  contactValue: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  joinDate: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  detailsButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  inactiveEmployeeCard: {
    opacity: 0.6,
    backgroundColor: colors.surface2,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  actionButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    width: '95%',
    height: '85%',
    maxHeight: '90%',
    ...shadow.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalForm: {
    flex: 1,
  },
  modalFormContent: {
    padding: spacing.lg,
  },
  formSection: {
    marginBottom: spacing.xl + spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  roleSelection: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  roleOption: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface2,
    minHeight: 48,
    justifyContent: 'center',
  },
  roleOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '20',
    borderWidth: 2,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.outline,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonActive: {
    borderColor: colors.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  roleOptionText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  roleOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modalButtonCancelText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonConfirmText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: spacing.md,
  },
  modalLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  closeButton: {
    padding: spacing.sm,
  },
  formField: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    backgroundColor: colors.surface2,
    color: colors.textPrimary,
    minHeight: 48,
  },
  formInputError: {
    borderColor: colors.danger,
    borderWidth: 2,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    minHeight: 48,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  credentialsButton: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  modalButtonSecondary: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  modalButtonSecondaryText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  credentialsContent: {
    padding: spacing.md,
    alignItems: 'center',
  },
  credentialsIcon: {
    marginBottom: spacing.md,
  },
  credentialsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  credentialsSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  credentialsBox: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.md,
    width: '100%',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  credentialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  credentialLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  credentialValue: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  credentialsWarning: {
    fontSize: 14,
    color: colors.warning,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    width: '80%',
    maxWidth: 300,
    ...shadow.card,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
  },
  menuCloseButton: {
    padding: spacing.xs,
  },
  menuActions: {
    padding: spacing.sm,
  },
  menuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  menuActionText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: spacing.md,
    fontWeight: '500',
  },
  menuActionWarning: {
    backgroundColor: colors.warning + '10',
  },
  menuActionWarningText: {
    color: colors.warning,
  },
  menuActionSuccess: {
    backgroundColor: colors.success + '10',
  },
  menuActionSuccessText: {
    color: colors.success,
  },
  menuActionDanger: {
    backgroundColor: colors.danger + '10',
  },
  menuActionDangerText: {
    color: colors.danger,
  },
  // New styles for improved modal
  employmentTypeSelection: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  employmentTypeOption: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.background,
  },
  employmentTypeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  employmentTypeOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  employmentTypeOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});

export default EmployeeManagementScreen;
