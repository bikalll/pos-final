import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadow } from '../../theme';

interface StaffMember {
  id: string;
  name: string;
  role: 'Owner' | 'Staff' | 'Waiter';
  email: string;
  phone: string;
  joinDate: number;
  isActive: boolean;
}

const StaffManagementScreen: React.FC = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('All');
  
  const [newStaff, setNewStaff] = useState({
    name: '',
    role: 'Waiter' as StaffMember['role'],
    email: '',
    phone: '',
  });

  useEffect(() => {
    loadStaffData();
  }, []);

  const loadStaffData = () => {
    const mockStaff: StaffMember[] = [
      {
        id: '1',
        name: 'John Doe',
        role: 'Waiter',
        email: 'john.doe@restaurant.com',
        phone: '+1 (555) 123-4567',
        joinDate: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
        isActive: true,
      },
      {
        id: '2',
        name: 'Jane Smith',
        role: 'Staff',
        email: 'jane.smith@restaurant.com',
        phone: '+1 (555) 234-5678',
        joinDate: Date.now() - 180 * 24 * 60 * 60 * 1000, // 6 months ago
        isActive: true,
      },
      {
        id: '3',
        name: 'Mike Johnson',
        role: 'Staff',
        email: 'mike.johnson@restaurant.com',
        phone: '+1 (555) 345-6789',
        joinDate: Date.now() - 730 * 24 * 60 * 60 * 1000, // 2 years ago
        isActive: true,
      },
      {
        id: '4',
        name: 'Sarah Wilson',
        role: 'Waiter',
        email: 'sarah.wilson@restaurant.com',
        phone: '+1 (555) 456-7890',
        joinDate: Date.now() - 90 * 24 * 60 * 60 * 1000, // 3 months ago
        isActive: false,
      },
    ];
    setStaffMembers(mockStaff);
  };

  const roles = ['All', 'Owner', 'Staff', 'Waiter'];
  const filteredStaff = staffMembers.filter(staff => 
    (selectedRole === 'All' || staff.role === selectedRole) &&
    (searchQuery === '' || staff.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddStaff = () => {
    if (!newStaff.name || !newStaff.email || !newStaff.phone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const staff: StaffMember = {
      id: Date.now().toString(),
      name: newStaff.name,
      role: newStaff.role,
      email: newStaff.email,
      phone: newStaff.phone,
      joinDate: Date.now(),
      isActive: true,
    };

    setStaffMembers(prev => [staff, ...prev]);
    setShowAddModal(false);
    resetNewStaff();
  };

  const handleEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
    setNewStaff({
      name: staff.name,
      role: staff.role,
      email: staff.email,
      phone: staff.phone,
    });
    setShowAddModal(true);
  };

  const handleUpdateStaff = () => {
    if (!editingStaff) return;

    const updatedStaff = staffMembers.map(staff => 
      staff.id === editingStaff.id ? {
        ...staff,
        name: newStaff.name,
        role: newStaff.role,
        email: newStaff.email,
        phone: newStaff.phone,
      } : staff
    );

    setStaffMembers(updatedStaff);
    setShowAddModal(false);
    setEditingStaff(null);
    resetNewStaff();
  };

  const handleDeleteStaff = (staffId: string) => {
    Alert.alert(
      'Delete Staff Member',
      'Are you sure you want to delete this staff member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setStaffMembers(prev => prev.filter(staff => staff.id !== staffId));
          },
        },
      ]
    );
  };

  const handleToggleStatus = (staffId: string) => {
    setStaffMembers(prev => 
      prev.map(staff => 
        staff.id === staffId ? { ...staff, isActive: !staff.isActive } : staff
      )
    );
  };

  const resetNewStaff = () => {
    setNewStaff({
      name: '',
      role: 'Waiter',
      email: '',
      phone: '',
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Owner': return '#e74c3c';
      case 'Manager': return '#f39c12';
      case 'Chef': return '#9b59b6';
      case 'Waiter': return '#3498db';
      default: return '#95a5a6';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const renderStaffMember = ({ item }: { item: StaffMember }) => (
    <TouchableOpacity style={styles.staffCard}>
      <View style={styles.photoContainer}>
        <View style={styles.defaultPhoto}>
          <Text style={styles.silhouetteIcon}>
            {item.name.toLowerCase().includes('jane') || item.name.toLowerCase().includes('sarah') ? '👩' : '👨'}
          </Text>
        </View>
      </View>
      
      <View style={styles.staffInfo}>
        <Text style={styles.eventTitle}>{item.role}</Text>
        <Text style={styles.eventDuration}>
          {item.isActive ? 'Active' : 'Inactive'}
        </Text>
      </View>
      
      <View style={styles.overlay}>
        <Text style={styles.staffName}>{item.name}</Text>
        <View style={styles.dateRow}>
          <Text style={styles.startDate}>{formatDate(item.joinDate)}</Text>
          <View style={styles.arrowIcon}>
            <Text style={styles.arrowText}>→</Text>
          </View>
          <Text style={styles.endDate}>Present</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Employee Management</Text>
        <Text style={styles.subtitle}>Manage restaurant employees and roles</Text>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search staff members..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        
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
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Staff Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{staffMembers.length}</Text>
          <Text style={styles.statLabel}>Total Staff</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {staffMembers.filter(s => s.isActive).length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {staffMembers.filter(s => s.role === 'Waiter').length}
          </Text>
          <Text style={styles.statLabel}>Waiters</Text>
        </View>
      </View>

      {/* Staff List */}
      <FlatList
        data={filteredStaff}
        renderItem={renderStaffMember}
        keyExtractor={(item) => item.id}
        style={styles.staffList}
        contentContainerStyle={styles.staffListContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Staff Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.addButtonIcon}>⚙️</Text>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingStaff ? 'Edit Employee' : 'Add New Employee'}
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Full Name"
              value={newStaff.name}
              onChangeText={(text) => setNewStaff(prev => ({ ...prev, name: text }))}
            />
            
            <View style={styles.roleSelector}>
              <Text style={styles.roleSelectorLabel}>Role:</Text>
              {(['Owner', 'Staff', 'Waiter'] as const).map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    newStaff.role === role && styles.roleOptionActive
                  ]}
                  onPress={() => setNewStaff(prev => ({ ...prev, role }))}
                >
                  <Text style={[
                    styles.roleOptionText,
                    newStaff.role === role && styles.roleOptionTextActive
                  ]}>
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Email Address"
              value={newStaff.email}
              onChangeText={(text) => setNewStaff(prev => ({ ...prev, email: text }))}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Phone Number"
              value={newStaff.phone}
              onChangeText={(text) => setNewStaff(prev => ({ ...prev, phone: text }))}
              keyboardType="phone-pad"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowAddModal(false);
                  setEditingStaff(null);
                  resetNewStaff();
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={editingStaff ? handleUpdateStaff : handleAddStaff}
              >
                <Text style={styles.modalButtonConfirmText}>
                  {editingStaff ? 'Update' : 'Add'}
                </Text>
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
  searchSection: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    backgroundColor: colors.surface2,
    marginBottom: spacing.md,
    color: colors.textPrimary,
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
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
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
    fontWeight: '500',
  },
  staffList: {
    flex: 1,
  },
  staffListContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  staffCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    position: 'relative',
    height: 120,
  },
  photoContainer: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.md,
    zIndex: 2,
  },
  defaultPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.outline,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  silhouetteIcon: {
    fontSize: 30,
    color: colors.textMuted,
  },
  staffInfo: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    alignItems: 'flex-end',
    zIndex: 2,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  eventDuration: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: spacing.md,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  staffName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  startDate: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  arrowIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  endDate: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
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
  addButtonIcon: {
    fontSize: 20,
    color: colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    marginBottom: spacing.md,
    backgroundColor: colors.surface2,
    color: colors.textPrimary,
  },
  roleSelector: {
    marginBottom: spacing.md,
  },
  roleSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  roleOption: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface2,
  },
  roleOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleOptionText: {
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '500',
  },
  roleOptionTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
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
    backgroundColor: colors.success,
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

export default StaffManagementScreen;
