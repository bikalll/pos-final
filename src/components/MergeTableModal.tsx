import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../theme';
import { Table } from '../redux/slices/tablesSlice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/storeFirebase';
import { mergeTables } from '../redux/slices/tablesSliceFirebase';
import { mergeOrders } from '../redux/slices/ordersSliceFirebase';
import { createFirestoreService } from '../services/firestoreService';
import { useNavigation } from '@react-navigation/native';

interface MergeTableModalProps {
  visible: boolean;
  onClose: () => void;
  baseTableId?: string; // When launched from an ongoing order, the clicked table
}

const MergeTableModal: React.FC<MergeTableModalProps> = ({ visible, onClose, baseTableId }) => {
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [mergedName, setMergedName] = useState('');
  
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const tables = useSelector((state: RootState) => state.tables.tablesById);
  const [firebaseTables, setFirebaseTables] = useState<Record<string, any>>({});
  const ongoingOrders = useSelector((state: RootState) => state.orders.ordersById);
  const ongoingOrderIds = useSelector((state: RootState) => state.orders.ongoingOrderIds);
  const restaurantId = useSelector((state: RootState) => (state as any).auth.restaurantId);

  const isTableOccupied = (tableId: string) => {
    return ongoingOrderIds.some((orderId: string) => {
      const order = ongoingOrders[orderId];
      return order && order.tableId === tableId && order.status === 'ongoing';
    });
  };

  const toggleTableSelection = (tableId: string) => {
    // Prevent deselecting the base table if provided
    if (baseTableId && tableId === baseTableId) return;

    const alreadySelected = selectedTables.has(tableId);
    // If it's already selected, allow deselect without prompts
    if (alreadySelected) {
      const newSelection = new Set(selectedTables);
      newSelection.delete(tableId);
      setSelectedTables(newSelection);
      return;
    }

    // If selecting a new table that is occupied (has ongoing order), warn first
    if (isTableOccupied(tableId)) {
      Alert.alert(
        'Table Occupied',
        `${tables[tableId]?.name || 'This table'} has an active order. Merging will consolidate orders into the merged table. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            style: 'default',
            onPress: () => {
              const newSelection = new Set(selectedTables);
              newSelection.add(tableId);
              setSelectedTables(newSelection);
            },
          },
        ]
      );
      return;
    }

    const newSelection = new Set(selectedTables);
    newSelection.add(tableId);
    setSelectedTables(newSelection);
  };

  const handleMergeTables = () => {
    if (selectedTables.size < 2) {
      Alert.alert('Error', 'Please select at least 2 tables to merge');
      return;
    }

    if (!mergedName.trim()) {
      Alert.alert('Error', 'Please provide a name for the merged table');
      return;
    }

    const selectedTableIds = Array.from(selectedTables);
    const selectedTableNames = selectedTableIds.map(id => tables[id]?.name || id);
    
    // Check if any selected tables have active orders
    const tablesWithOrders = selectedTableIds.filter(tableId => {
      return ongoingOrderIds.some((orderId: string) => {
        const order = ongoingOrders[orderId];
        return order && order.tableId === tableId && order.status === 'ongoing';
      });
    });

    if (tablesWithOrders.length > 0) {
      // Show confirmation for merging tables with orders
      Alert.alert(
        'Tables with Active Orders',
        `The following tables have active orders: ${tablesWithOrders.map(id => tables[id]?.name).join(', ')}. Merging will consolidate all orders into a single merged table order. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Merge Tables & Orders', 
            style: 'default',
            onPress: () => performTableMerge(selectedTableIds, selectedTableNames)
          },
        ]
      );
    } else {
      // No active orders, proceed with merge
      performTableMerge(selectedTableIds, selectedTableNames);
    }
  };

  const performTableMerge = (tableIds: string[], tableNames: string[]) => {
    const name = mergedName.trim();
    // Generate a deterministic merged table id to use across both reducers
    const newMergedTableId = `merged-${Date.now()}`;

    // First create the merged table with the known id
    dispatch(mergeTables({
      tableIds: tableIds,
      mergedName: name,
      mergedTableId: newMergedTableId,
    }));

    // Immediately merge any existing orders into the new merged table id
    dispatch(mergeOrders({
      tableIds: tableIds,
      mergedTableId: newMergedTableId,
      mergedTableName: name,
    }));

    // Firebase operations are now handled by the middleware
    // No need to duplicate Firebase operations here

    // Small delay to allow state to update, then redirect to ongoing orders
    setTimeout(() => {
      setSelectedTables(new Set());
      setMergedName('');
      onClose();
      (navigation as any).navigate('Orders', { screen: 'OngoingOrders' });
    }, 100);
  };

  const getTotalSeats = () => {
    return Array.from(selectedTables).reduce((total, tableId) => {
      const table = tables[tableId];
      return total + (table?.seats || 0);
    }, 0);
  };

  const isFormValid = () => {
    // If launched from a base table, require at least 1 additional table
    const requiredCount = baseTableId ? 2 : 2;
    return selectedTables.size >= requiredCount && mergedName.trim().length >= 2;
  };

  const resetForm = () => {
    setSelectedTables(new Set());
    setMergedName('');
  };

  useEffect(() => {
    if (!visible) {
      resetForm();
      return;
    }
    // When opening with a base table (from ongoing order), preselect it
    if (visible && baseTableId) {
      setSelectedTables(new Set([baseTableId]));
    }
    // Load tables from Firebase scoped to this restaurant
    (async () => {
      try {
        if (!restaurantId) return;
        const svc = createFirestoreService(restaurantId);
        const t = await svc.getTables();
        setFirebaseTables(t || {});
      } catch {}
    })();
  }, [visible, baseTableId]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Merge Tables</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              Select multiple tables to merge them into a single table group. 
              This is useful for large parties or events.
            </Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Tables</Text>
              <Text style={styles.sectionSubtitle}>
                {baseTableId ? 'Select other tables to merge with the base table' : 'Select tables to merge (minimum 2)'}
              </Text>
              {selectedTables.size > 0 && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning" size={16} color={colors.warning} />
                  <Text style={styles.warningText}>
                    {(() => {
                      const tablesWithOrders = Array.from(selectedTables).filter(tableId => {
                        return ongoingOrderIds.some((orderId: string) => {
                          const order = ongoingOrders[orderId];
                          return order && order.tableId === tableId && order.status === 'ongoing';
                        });
                      });
                      
                      if (tablesWithOrders.length > 0) {
                        return `Warning: ${tablesWithOrders.length} selected table(s) have active orders. Merging will consolidate all orders into a single merged table order.`;
                      }
                      return '';
                    })()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.tablesGrid}>
              {Object.values(firebaseTables).map((table: any) => (
                <TouchableOpacity
                  key={table.id}
                  style={[
                    styles.tableCard,
                    isTableOccupied(table.id) && styles.tableCardOccupied,
                    !isTableOccupied(table.id) && styles.tableCardEmpty,
                    baseTableId === table.id && styles.tableCardBase,
                    selectedTables.has(table.id) && styles.tableCardSelected
                  ]}
                  onPress={() => toggleTableSelection(table.id)}
                  disabled={baseTableId === table.id}
                >
                  <View style={styles.tableCardHeader}>
                    <Text style={[
                      styles.tableName,
                      selectedTables.has(table.id) && styles.tableNameSelected
                    ]}>
                      {table.name}
                    </Text>
                    {selectedTables.has(table.id) && (
                      <Ionicons 
                        name="checkmark-circle" 
                        size={20} 
                        color={colors.primary} 
                      />
                    )}
                  </View>
                  <Text style={[
                    styles.tableSeats,
                    selectedTables.has(table.id) && styles.tableSeatsSelected
                  ]}>
                    {(table.seats || 0)} seats
                  </Text>
                  <Text style={styles.occupancyText}>
                    {isTableOccupied(table.id) ? 'Occupied' : 'Empty'}
                  </Text>
                  {table.description && (
                    <Text style={[
                      styles.tableDescription,
                      selectedTables.has(table.id) && styles.tableDescriptionSelected
                    ]}>
                      {table.description}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {selectedTables.size > 0 && (
              <View style={styles.selectionSummary}>
                <Text style={styles.summaryTitle}>Selection Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Selected Tables:</Text>
                  <Text style={styles.summaryValue}>
                    {Array.from(selectedTables).map(id => tables[id]?.name).join(', ')}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Seats:</Text>
                  <Text style={styles.summaryValue}>{getTotalSeats()} seats</Text>
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>
                  Merged Table Name <Text style={styles.requiredIndicator}>*</Text>
                </Text>
                {mergedName.trim().length >= 2 && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                )}
              </View>
              <TextInput
                style={[
                  styles.input,
                  !mergedName.trim() && styles.inputRequired,
                  mergedName.trim().length >= 2 && styles.inputValid
                ]}
                value={mergedName}
                onChangeText={setMergedName}
                placeholder="e.g., Party Table, Large Group"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={styles.inputHint}>
                This name will be used for the merged table.
              </Text>
              <Text style={[
                styles.characterCounter,
                mergedName.length >= 2 && styles.characterCounterValid
              ]}>
                {mergedName.length}/2 characters minimum
              </Text>
              {mergedName.length > 0 && mergedName.length < 2 && (
                <Text style={styles.validationError}>
                  Table name must be at least 2 characters long
                </Text>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={onClose}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButtonConfirm,
                  !isFormValid() && styles.modalButtonDisabled
                ]}
                onPress={handleMergeTables}
                disabled={!isFormValid()}
              >
                <Text style={styles.modalButtonConfirmText}>Merge Tables</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    width: '90%',
    maxHeight: '80%',
    ...shadow.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tablesGrid: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  tableCard: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.outline,
  },
  tableCardSelected: {
    borderColor: colors.info,
    backgroundColor: colors.primary + '10',
  },
  tableCardEmpty: {
    borderColor: colors.success,
    backgroundColor: colors.success + '10',
  },
  tableCardOccupied: {
    borderColor: colors.warning,
    backgroundColor: colors.warning + '10',
  },
  tableCardBase: {
    borderColor: colors.info,
    backgroundColor: colors.info + '10',
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tableName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tableNameSelected: {
    color: colors.primary,
  },
  tableSeats: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  tableSeatsSelected: {
    color: colors.primary,
  },
  occupancyText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  tableDescription: {
    fontSize: 12,
    color: colors.textMuted,
  },
  tableDescriptionSelected: {
    color: colors.primary + '80',
  },
  selectionSummary: {
    backgroundColor: colors.primary + '10',
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  inputGroup: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  inputHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  characterCounter: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  characterCounterValid: {
    color: colors.success,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  modalButtonCancel: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginLeft: spacing.sm,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  modalButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '10',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  warningText: {
    fontSize: 12,
    color: colors.warning,
    marginLeft: spacing.xs,
    flexShrink: 1,
  },
  requiredIndicator: {
    color: colors.danger,
    fontSize: 16,
    marginLeft: spacing.xs,
  },
  inputRequired: {
    borderColor: colors.danger,
  },
  inputValid: {
    borderColor: colors.success,
  },
  validationError: {
    fontSize: 12,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});

export default MergeTableModal;


