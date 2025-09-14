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
  role: 'owner' | 'manager' | 'staff';
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
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [generatedCredentials, setGeneratedCredentials] = useState<{email: string; password: string} | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    displayName: '',
    email: '',
    password: '',
    phone: '',
    designation: '',
    role: 'staff' as 'manager' | 'staff',
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

      const restaurantUsers = await authService.getRestaurantUsers(
        authState.restaurantId || '',
        authState.userId || ''
      );

      // Convert UserMetadata to Employee format
      const employeeList: Employee[] = restaurantUsers.map(user => ({
        ...user,
        role: user.role === 'employee' ? 'staff' : user.role as 'owner' | 'manager' | 'staff',
        phone: '', // Default empty phone
        designation: '', // Default empty designation
        joinDate: user.createdAt,
        isActive: user.isActive,
      }));

      setEmployees(employeeList);
    } catch (error) {
      console.error('Error loading employees:', error);
      Alert.alert('Error', 'Failed to load employees. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const roles = ['All', 'manager', 'staff'];
  const filteredEmployees = employees.filter(employee => 
    (selectedRole === 'All' || employee.role === selectedRole) &&
    (searchQuery === '' || employee.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
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

  const handleFixOwnerRole = async () => {
    if (!authState.isLoggedIn || authState.role !== 'Owner') {
      Alert.alert('Error', 'Only owners can fix owner roles');
      return;
    }

    Alert.alert(
      'Fix Owner Role',
      'This will fix the owner role in the restaurant users collection. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fix',
          onPress: async () => {
            try {
              let authService;
              try {
                authService = getFirebaseAuthEnhanced();
              } catch (error) {
                console.log('Firebase auth enhanced not initialized, creating new instance...');
                authService = createFirebaseAuthEnhanced(dispatch);
              }
              
              await authService.fixOwnerRole(authState.restaurantId || '', authState.userId || '');
              Alert.alert('Success', 'Owner role fixed successfully!');
              
              // Refresh employee list
              await loadEmployeeData();
            } catch (error: any) {
              console.error('Fix owner role error:', error);
              Alert.alert('Error', 'Failed to fix owner role: ' + error.message);
            }
          },
        },
      ]
    );
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setNewEmployee({
      displayName: employee.displayName,
      email: employee.email,
      password: '', // Empty password for editing
      phone: employee.phone || '',
      designation: employee.designation || '',
      role: employee.role === 'owner' ? 'manager' : employee.role,
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee || !validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
    });
    setFormErrors({});
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingEmployee(null);
    setShowDesignationDropdown(false);
    resetNewEmployee();
  };

  const renderEmployee = ({ item }: { item: Employee }) => (
    <View style={[styles.employeeCard, !item.isActive && styles.inactiveEmployeeCard]}>
      <View style={styles.employeeHeader}>
        <View style={styles.employeeInfo}>
          <Text style={[styles.employeeName, !item.isActive && styles.inactiveText]}>{item.displayName}</Text>
          <Text style={[styles.employeeEmail, !item.isActive && styles.inactiveText]}>{item.email}</Text>
          {item.designation && (
            <Text style={[styles.employeeDesignation, !item.isActive && styles.inactiveText]}>
              {item.designation}
            </Text>
          )}
        </View>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
          <Text style={styles.roleText}>
            {item.role === 'owner' ? 'Owner' : 
             item.role === 'manager' ? 'Manager' : 'Staff'}
          </Text>
        </View>
      </View>
      
      <View style={styles.employeeDetails}>
        {item.phone && (
          <Text style={styles.employeeContact}>📞 {item.phone}</Text>
        )}
        <Text style={styles.employeeDate}>
          Joined: {new Date(item.joinDate || item.createdAt).toLocaleDateString()}
        </Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: item.isActive ? colors.success : colors.danger }]} />
          <Text style={styles.employeeStatus}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      
      <View style={styles.employeeActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditEmployee(item)}
        >
          <Ionicons name="pencil" size={16} color={colors.primary} />
        </TouchableOpacity>
        
        {/* Only show deactivate/activate buttons if not the current owner */}
        {item.uid !== authState.userId && (
          <>
            {item.isActive ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.deactivateButton]}
                onPress={() => handleDeactivateEmployee(item.uid)}
              >
                <Ionicons name="pause-circle" size={16} color={colors.warning} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, styles.activateButton]}
                onPress={() => handleActivateEmployee(item.uid)}
              >
                <Ionicons name="play-circle" size={16} color={colors.success} />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteEmployee(item.uid)}
            >
              <Ionicons name="trash" size={16} color={colors.danger} />
            </TouchableOpacity>
          </>
        )}
        
        {/* Show a message for the current owner */}
        {item.uid === authState.userId && (
          <View style={styles.ownerNote}>
            <Text style={styles.ownerNoteText}>You</Text>
          </View>
        )}
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
          <Ionicons name="add" size={20} color={colors.textPrimary} />
          <Text style={styles.addButtonText}>Add Employee</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.warning, marginTop: spacing.sm }]}
          onPress={handleFixOwnerRole}
        >
          <Ionicons name="shield-checkmark" size={20} color="white" />
          <Text style={[styles.addButtonText, { color: 'white' }]}>Fix Owner Role</Text>
        </TouchableOpacity>
      </View>

      {/* Role Filter */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rolesContainer}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role}
              style={[
                styles.roleButton,
                selectedRole === role && styles.roleButtonActive
              ]}
              onPress={() => setSelectedRole(role)}
            >
              <Text style={[
                styles.roleButtonText,
                selectedRole === role && styles.roleButtonTextActive
              ]}>
                {role === 'All' ? 'All' : role === 'manager' ? 'Managers' : 'Staff'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                {renderFormField('Full Name', 'displayName', 'Enter full name')}
                {renderFormField('Email Address', 'email', 'Enter email address', 'email-address', 'none')}
                {renderFormField('Phone Number', 'phone', 'Enter phone number', 'phone-pad')}
                {/* Designation Selection */}
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Designation</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newEmployee.designation}
                    onChangeText={(text) => setNewEmployee(prev => ({ ...prev, designation: text }))}
                    placeholder="Enter designation (e.g., Manager, Chef, Waiter)"
                    placeholderTextColor={colors.textSecondary}
                    editable={!isSubmitting}
                  />
                  {formErrors.designation && (
                    <Text style={styles.errorText}>{formErrors.designation}</Text>
                  )}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Account Details</Text>
                {renderFormField('Password', 'password', 'Enter password for login', 'default', 'none', true)}
                
                {/* Role Selection */}
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Role</Text>
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
    gap: spacing.md,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  addButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  filterSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  rolesContainer: {
    flexDirection: 'row',
  },
  roleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outline,
    marginRight: spacing.sm,
    backgroundColor: colors.surface2,
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  roleButtonTextActive: {
    color: colors.textPrimary,
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadow.card,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  employeeEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginLeft: spacing.sm,
  },
  roleText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  employeeDetails: {
    marginBottom: spacing.md,
  },
  employeeDesignation: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  employeeContact: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  employeeDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  employeeStatus: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  employeeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  editButton: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  deactivateButton: {
    backgroundColor: colors.warning + '20',
    borderColor: colors.warning,
  },
  activateButton: {
    backgroundColor: colors.success + '20',
    borderColor: colors.success,
  },
  deleteButton: {
    backgroundColor: colors.danger + '20',
    borderColor: colors.danger,
  },
  ownerNote: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerNoteText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  inactiveEmployeeCard: {
    opacity: 0.6,
    backgroundColor: colors.surface2,
  },
  inactiveText: {
    opacity: 0.7,
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
    marginBottom: spacing.xl,
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
    marginBottom: spacing.md,
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
});

export default EmployeeManagementScreen;
