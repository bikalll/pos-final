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

interface StaffMember {
  id: string;
  name: string;
  role: 'Owner' | 'Staff' | 'Waiter';
  email: string;
  phone: string;
  joinDate: number;
  isActive: boolean;
  performance: {
    ordersHandled: number;
    totalSales: number;
    rating: number;
  };
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
        performance: {
          ordersHandled: 156,
          totalSales: 2340.50,
          rating: 4.8,
        },
      },
      {
        id: '2',
        name: 'Jane Smith',
        role: 'Chef',
        email: 'jane.smith@restaurant.com',
        phone: '+1 (555) 234-5678',
        joinDate: Date.now() - 180 * 24 * 60 * 60 * 1000, // 6 months ago
        isActive: true,
        performance: {
          ordersHandled: 89,
          totalSales: 1567.25,
          rating: 4.9,
        },
      },
      {
        id: '3',
        name: 'Mike Johnson',
        role: 'Manager',
        email: 'mike.johnson@restaurant.com',
        phone: '+1 (555) 345-6789',
        joinDate: Date.now() - 730 * 24 * 60 * 60 * 1000, // 2 years ago
        isActive: true,
        performance: {
          ordersHandled: 234,
          totalSales: 4567.80,
          rating: 4.7,
        },
      },
      {
        id: '4',
        name: 'Sarah Wilson',
        role: 'Waiter',
        email: 'sarah.wilson@restaurant.com',
        phone: '+1 (555) 456-7890',
        joinDate: Date.now() - 90 * 24 * 60 * 60 * 1000, // 3 months ago
        isActive: false,
        performance: {
          ordersHandled: 45,
          totalSales: 678.90,
          rating: 4.5,
        },
      },
    ];
    setStaffMembers(mockStaff);
  };

  const roles = ['All', 'Owner', 'Manager', 'Chef', 'Waiter'];
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
      performance: {
        ordersHandled: 0,
        totalSales: 0,
        rating: 5.0,
      },
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
    <View style={styles.staffCard}>
      <View style={styles.staffHeader}>
        <View style={styles.staffInfo}>
          <Text style={styles.staffName}>{item.name}</Text>
          <View style={[
            styles.roleBadge,
            { backgroundColor: getRoleColor(item.role) }
          ]}>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.isActive ? '#27ae60' : '#e74c3c' }
        ]}>
          <Text style={styles.statusText}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.staffDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email:</Text>
          <Text style={styles.detailValue}>{item.email}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone:</Text>
          <Text style={styles.detailValue}>{item.phone}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Join Date:</Text>
          <Text style={styles.detailValue}>{formatDate(item.joinDate)}</Text>
        </View>
      </View>

      <View style={styles.performanceSection}>
        <Text style={styles.performanceTitle}>Performance</Text>
        <View style={styles.performanceMetrics}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{item.performance.ordersHandled}</Text>
            <Text style={styles.metricLabel}>Orders</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>${item.performance.totalSales.toFixed(2)}</Text>
            <Text style={styles.metricLabel}>Sales</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{item.performance.rating}</Text>
            <Text style={styles.metricLabel}>Rating</Text>
          </View>
        </View>
      </View>

      <View style={styles.staffActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditStaff(item)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.actionButton,
            item.isActive ? styles.deactivateButton : styles.activateButton
          ]}
          onPress={() => handleToggleStatus(item.id)}
        >
          <Text style={styles.actionButtonText}>
            {item.isActive ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteStaff(item.id)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Staff Management</Text>
        <Text style={styles.subtitle}>Manage restaurant staff and roles</Text>
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
        <Text style={styles.addButtonText}>+ Add Staff</Text>
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
              {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Full Name"
              value={newStaff.name}
              onChangeText={(text) => setNewStaff(prev => ({ ...prev, name: text }))}
            />
            
            <View style={styles.roleSelector}>
              <Text style={styles.roleSelectorLabel}>Role:</Text>
              {(['Owner', 'Manager', 'Chef', 'Waiter'] as const).map((role) => (
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  searchSection: {
    backgroundColor: 'white',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginBottom: 12,
  },
  rolesContainer: {
    flexDirection: 'row',
  },
  roleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
    backgroundColor: '#fafafa',
  },
  roleButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  roleButtonText: {
    color: '#7f8c8d',
    fontSize: 14,
    fontWeight: '500',
  },
  roleButtonTextActive: {
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  staffList: {
    flex: 1,
  },
  staffListContent: {
    padding: 12,
    paddingBottom: 100,
  },
  staffCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  staffDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  detailValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  performanceSection: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  performanceMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  staffActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#f39c12',
  },
  activateButton: {
    backgroundColor: '#27ae60',
  },
  deactivateButton: {
    backgroundColor: '#e74c3c',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#27ae60',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  roleSelector: {
    marginBottom: 16,
  },
  roleSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  roleOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  roleOptionActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  roleOptionText: {
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'center',
  },
  roleOptionTextActive: {
    color: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalButtonConfirm: {
    backgroundColor: '#27ae60',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default StaffManagementScreen;
