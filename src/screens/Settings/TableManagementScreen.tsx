import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/storeFirebase';
import { colors, spacing, radius } from '../../theme';
import { createFirestoreService } from '../../services/firestoreService';
import { toggleTableStatus, clearDuplicates, resetTables } from '../../redux/slices/tablesSliceFirebase';

const TableManagementScreen: React.FC = () => {
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [newTableName, setNewTableName] = useState('');
  const [newTableSeats, setNewTableSeats] = useState('4');
  const [newTableDescription, setNewTableDescription] = useState('');
  const [editTableName, setEditTableName] = useState('');
  const [editTableSeats, setEditTableSeats] = useState('4');
  const [editTableDescription, setEditTableDescription] = useState('');
  const [tables, setTables] = useState<any[]>([]);
  const [firestoreService, setFirestoreService] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { restaurantId } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  // Load tables from Firebase
  useEffect(() => {
    const loadTables = async () => {
      if (!restaurantId) {
        console.log('No restaurant ID available');
        return;
      }

      try {
        setIsLoading(true);
        const service = createFirestoreService(restaurantId);
        setFirestoreService(service);
        
        const tablesData = await service.getTables();
        const tablesArray = Object.values(tablesData).map((table: any) => ({
          id: table.id || Object.keys(tablesData).find(key => tablesData[key] === table),
          name: table.name,
          seats: table.seats,
          description: table.description || '',
          isActive: table.isActive !== false,
          createdAt: table.createdAt,
          restaurantId: table.restaurantId,
        }));
        setTables(tablesArray);
        
      } catch (error) {
        console.error('Error loading tables:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTables();
  }, [restaurantId]);

  const handleCleanupTables = async () => {
    Alert.alert(
      'Cleanup Tables',
      'This will delete all existing tables and recreate them with proper IDs. This will fix the random table name issue. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cleanup',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!firestoreService) {
                Alert.alert('Error', 'Firebase service not initialized');
                return;
              }
              
              await firestoreService.cleanupAndRecreateTables();
              
              // Reload tables
              const tablesData = await firestoreService.getTables();
              const tablesArray = Object.values(tablesData).map((table: any) => ({
                id: table.id || Object.keys(tablesData).find(key => tablesData[key] === table),
                name: table.name,
                seats: table.seats,
                description: table.description || '',
                isActive: table.isActive !== false,
                createdAt: table.createdAt,
                restaurantId: table.restaurantId,
              }));
              setTables(tablesArray);
              
              Alert.alert('Success', 'Tables cleaned up and recreated successfully!');
            } catch (error) {
              console.error('Error cleaning up tables:', error);
              Alert.alert('Error', 'Failed to cleanup tables');
            }
          },
        },
      ]
    );
  };

  const handleAddTable = async () => {
    if (!newTableName.trim()) {
      Alert.alert('Error', 'Please enter a table name');
      return;
    }

    if (!firestoreService) {
      Alert.alert('Error', 'Firebase service not initialized');
      return;
    }

    try {
      const seats = parseInt(newTableSeats) || 4;
      
      // Generate a consistent table ID based on the name
      const tableId = `table-${newTableName.trim().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      console.log('🔥 Creating table with ID:', tableId, 'Name:', newTableName.trim());
      
      const tableData = {
        id: tableId,
        name: newTableName.trim(),
        seats: seats,
        description: newTableDescription.trim() || '',
        isActive: true,
        restaurantId: restaurantId,
        createdAt: new Date().toISOString(),
      };
      
      console.log('🔥 Table data to save:', tableData);
      
      // Use setDocument with specific ID instead of createTable
      await firestoreService.setDocument('tables', tableId, tableData);
      console.log('✅ Table saved with ID:', tableId);
      
      // Reload tables
      const tablesData = await firestoreService.getTables();
      console.log('🔥 Tables loaded after creation:', tablesData);
      const tablesArray = Object.values(tablesData).map((table: any) => ({
        id: table.id || Object.keys(tablesData).find(key => tablesData[key] === table),
        name: table.name,
        seats: table.seats,
        description: table.description || '',
        isActive: table.isActive !== false,
        createdAt: table.createdAt,
        restaurantId: table.restaurantId,
      }));
      console.log('🔥 Processed tables array:', tablesArray);
      setTables(tablesArray);
      
      setNewTableName('');
      setNewTableSeats('4');
      setNewTableDescription('');
      setIsAddModalVisible(false);
      Alert.alert('Success', 'Table added successfully!');
    } catch (error) {
      console.error('Error adding table:', error);
      Alert.alert('Error', 'Failed to add table');
    }
  };

  const handleEditTable = async () => {
    if (!editTableName.trim() || !editingTable) {
      Alert.alert('Error', 'Please enter a table name');
      return;
    }

    if (!firestoreService) {
      Alert.alert('Error', 'Firebase service not initialized');
      return;
    }

    try {
      const seats = parseInt(editTableSeats) || 4;
      await firestoreService.updateTable(editingTable.id, {
        name: editTableName.trim(),
        seats: seats,
        description: editTableDescription.trim() || '',
      });
      
      // Reload tables
      const tablesData = await firestoreService.getTables();
      const tablesArray = Object.values(tablesData).map((table: any) => ({
        id: table.id || Object.keys(tablesData).find(key => tablesData[key] === table),
        name: table.name,
        seats: table.seats,
        description: table.description || '',
        isActive: table.isActive !== false,
        createdAt: table.createdAt,
        restaurantId: table.restaurantId,
      }));
      setTables(tablesArray);
      
      setEditTableName('');
      setEditTableSeats('4');
      setEditTableDescription('');
      setEditingTable(null);
      setIsEditModalVisible(false);
      Alert.alert('Success', 'Table updated successfully!');
    } catch (error) {
      console.error('Error updating table:', error);
      Alert.alert('Error', 'Failed to update table');
    }
  };

  const handleDeleteTable = (tableId: string) => {
    Alert.alert(
      'Delete Table',
      'Are you sure you want to delete this table? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (!firestoreService) {
                Alert.alert('Error', 'Firebase service not initialized');
                return;
              }

              await firestoreService.deleteTable(tableId);
              
              // Reload tables
              const tablesData = await firestoreService.getTables();
              const tablesArray = Object.values(tablesData).map((table: any) => ({
                id: table.id || Object.keys(tablesData).find(key => tablesData[key] === table),
                name: table.name,
                seats: table.seats,
                description: table.description || '',
                isActive: table.isActive !== false,
                createdAt: table.createdAt,
                restaurantId: table.restaurantId,
              }));
              setTables(tablesArray);
              
              Alert.alert('Success', 'Table deleted successfully!');
            } catch (error) {
              console.error('Error deleting table:', error);
              Alert.alert('Error', 'Failed to delete table');
            }
          }
        },
      ]
    );
  };


  const openEditModal = (table: any) => {
    console.log('Opening edit modal for table:', table);
    setEditingTable(table);
    setEditTableName(table.name);
    setEditTableSeats((table.seats || 4).toString());
    setEditTableDescription(table.description || '');
    setIsEditModalVisible(true);
  };

  const renderTable = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return null;


    const handleToggle = async () => {
      try {
        if (!firestoreService) return;
        await firestoreService.updateTable(table.id, { isActive: !table.isActive });
        try { (dispatch as any)(toggleTableStatus({ id: table.id })); } catch {}
        const refreshed = await firestoreService.getTables();
        const arr = Object.values(refreshed).map((t: any) => ({
          id: t.id,
          name: t.name,
          seats: t.seats,
          description: t.description || '',
          isActive: t.isActive !== false,
          createdAt: t.createdAt,
          restaurantId: t.restaurantId,
        }));
        setTables(arr);
      } catch (e) {
        Alert.alert('Error', 'Failed to update table status');
      }
    };

    return (
      <View key={table.id} style={[
        styles.tableCard,
      ]}>
        <View style={styles.tableInfo}>
          <Text style={styles.tableName}>
            {table.name}
          </Text>
          <Text style={styles.tableSeats}>{(table.seats || 4)} seats</Text>
          {table.description && (
            <Text style={styles.tableDescription}>{table.description}</Text>
          )}
          
          
          <View style={[styles.statusIndicator, { borderColor: table.isActive ? colors.success : colors.danger }]}> 
            <Ionicons name={table.isActive ? 'checkmark-circle' : 'close-circle'} size={14} color={table.isActive ? colors.success : colors.danger} />
            <Text style={[styles.statusText, { color: table.isActive ? colors.success : colors.danger }]}>
              {table.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        
        <View style={styles.tableActions}>
          
          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.editButton,
            ]}
            onPress={() => openEditModal(table)}
          >
            <Ionicons 
              name="create-outline" 
              size={20} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.toggleButton,
            ]}
            onPress={handleToggle}
          >
            <Ionicons 
              name={table.isActive ? "pause-circle" : "play-circle"} 
              size={20} 
              color={table.isActive ? colors.warning : colors.success} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.deleteButton,
            ]}
            onPress={() => handleDeleteTable(table.id)}
          >
            <Ionicons 
              name="trash-outline" 
              size={20} 
              color={colors.danger} 
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Table Management</Text>
          <Text style={styles.subtitle}>Loading tables...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Table Management</Text>
            <Text style={styles.subtitle}>
              Add, edit, and manage your restaurant tables ({tables.length} total, {tables.filter(t => t.isActive).length} active)
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                Alert.alert(
                  'Clear Duplicates',
                  'This will remove any duplicate tables. Are you sure?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Clear', 
                      style: 'default',
                      onPress: () => dispatch(clearDuplicates())
                    },
                  ]
                );
              }}
            >
              <Ionicons name="copy-outline" size={20} color={colors.warning} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                Alert.alert(
                  'Reset Tables',
                  'This will remove all tables and recreate the default ones. Are you sure?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Reset', 
                      style: 'destructive',
                      onPress: () => dispatch(resetTables())
                    },
                  ]
                );
              }}
            >
              <Ionicons name="refresh" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.addButtonContainer}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setIsAddModalVisible(true)}
        >
          <Ionicons name="add-circle" size={20} color={'white'} />
          <Text style={styles.addButtonText}>Add New Table</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.warning, marginTop: spacing.sm }]}
          onPress={handleCleanupTables}
        >
          <Ionicons name="construct-outline" size={18} color="white" />
          <Text style={[styles.addButtonText, { color: 'white' }]}>Fix Table Names</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {tables.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No tables configured</Text>
            <Text style={styles.emptyStateSubtext}>Add your first table to get started</Text>
          </View>
        ) : (
          <View style={styles.tablesList}>
            {/* Active Tables Section */}
            {tables.filter(t => t.isActive).length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Active Tables</Text>
                <Text style={styles.sectionSubtitle}>Tables available for orders</Text>
              </View>
            )}
            {tables.filter(t => t.isActive).map(table => renderTable(table.id))}
            
            {/* Inactive Tables Section */}
            {tables.filter(t => !t.isActive).length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Inactive Tables</Text>
                <Text style={styles.sectionSubtitle}>Tables currently disabled</Text>
              </View>
            )}
            {tables.filter(t => !t.isActive).map(table => renderTable(table.id))}
          </View>
        )}
      </ScrollView>

      {/* Add Table Modal */}
      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Table</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter table name (e.g., Table 1, VIP 1)"
              value={newTableName}
              onChangeText={setNewTableName}
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Enter number of seats (e.g., 4, 6)"
              value={newTableSeats}
              onChangeText={setNewTableSeats}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Enter table description (optional)"
              value={newTableDescription}
              onChangeText={setNewTableDescription}
              multiline
              numberOfLines={2}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setIsAddModalVisible(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleAddTable}
              >
                <Text style={styles.modalButtonPrimaryText}>Add Table</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Table Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Table</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter table name"
              value={editTableName}
              onChangeText={setEditTableName}
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Enter number of seats (e.g., 4, 6)"
              value={editTableSeats}
              onChangeText={setEditTableSeats}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Enter table description (optional)"
              value={editTableDescription}
              onChangeText={setEditTableDescription}
              multiline
              numberOfLines={2}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleEditTable}
              >
                <Text style={styles.modalButtonPrimaryText}>Save Changes</Text>
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
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start' 
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  resetButton: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  addButtonContainer: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 0,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: spacing.md,
    paddingTop: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tablesList: {
    width: '100%',
  },
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  tableInfo: {
    flex: 1,
  },
  tableName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  tableSeats: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  tableDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontStyle: 'italic',
  },
  mergedInfo: {
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    padding: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  mergedLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: 'bold',
    marginBottom: spacing.xs / 2,
  },
  mergedTableName: {
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  totalSeats: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  tableActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: { borderColor: colors.primary },
  toggleButton: { borderColor: colors.warning },
  deleteButton: { borderColor: colors.danger },
  actionButtonDisabled: {
    opacity: 0.5, // Indicate disabled state
    backgroundColor: colors.surface2, // Slightly different background for disabled buttons
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 18,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.outline,
    width: '100%',
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: colors.outline,
  },
  modalButtonSecondaryText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
  },
  modalButtonPrimaryText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  mergedBadge: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
});

export default TableManagementScreen;
