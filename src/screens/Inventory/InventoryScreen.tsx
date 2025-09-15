import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadow } from '../../theme';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/storeFirebase';
import { createFirestoreService } from '../../services/firestoreService';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stockQuantity: number;
  minStockLevel: number;
  unit: string;
  supplier: string;
  lastUpdated: number;
  isActive: boolean;
}

const InventoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const { restaurantId } = useSelector((s: RootState) => s.auth);
  const [firestoreService, setFirestoreService] = useState<any>(null);
  
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    price: '',
    stockQuantity: '',
    minStockLevel: '',
    unit: '',
    supplier: '',
  });
  const [categoriesList, setCategoriesList] = useState<{ id: string; name: string }[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    const service = createFirestoreService(restaurantId);
    setFirestoreService(service);
    let unsubscribe: (() => void) | undefined;
    (async () => {
      await loadInventoryData(service);
      try {
        unsubscribe = service.listenToInventory?.((items: Record<string, any>) => {
          const mapped: InventoryItem[] = Object.values(items).map((it: any) => ({
            id: it.id,
            name: it.name,
            category: it.category || 'Uncategorized',
            price: Number(it.price) || 0,
            stockQuantity: Number(it.stockQuantity) || 0,
            minStockLevel: Number(it.minStockLevel) || 0,
            unit: it.unit || 'pcs',
            supplier: it.supplier || 'Unknown',
            lastUpdated: it.lastUpdated || Date.now(),
            isActive: it.isActive !== false,
          }));
          setInventoryItems(mapped);
        });
      } catch {}
    })();
    return () => { try { unsubscribe && unsubscribe(); } catch {} };
  }, [restaurantId]);

  const loadInventoryData = async (service = firestoreService) => {
    if (!service) return;
    try {
      const data = await service.getInventoryItems();
      const items: InventoryItem[] = Object.values(data).map((it: any) => ({
        id: it.id,
        name: it.name,
        category: it.category || 'Uncategorized',
        price: Number(it.price) || 0,
        stockQuantity: Number(it.stockQuantity) || 0,
        minStockLevel: Number(it.minStockLevel) || 0,
        unit: it.unit || 'pcs',
        supplier: it.supplier || 'Unknown',
        lastUpdated: it.lastUpdated || Date.now(),
        isActive: it.isActive !== false,
      }));
      setInventoryItems(items);
      // Load inventory categories list for dropdown
      try {
        const cats = await service.getInventoryCategories();
        const arr = Object.values(cats || {}).map((c: any) => ({ id: c.id, name: c.name }));
        setCategoriesList(arr);
      } catch {}
    } catch (e) {
      Alert.alert('Error', 'Failed to load inventory');
    }
  };

  const categories = ['All', ...Array.from(new Set(inventoryItems.map(item => item.category)))];
  const filteredItems = inventoryItems.filter(item => 
    (selectedCategory === 'All' || item.category === selectedCategory) &&
    (searchQuery === '' || item.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const lowStockItems = inventoryItems.filter(item => item.stockQuantity <= item.minStockLevel);
  const totalValue = inventoryItems.reduce((sum, item) => sum + (item.price * item.stockQuantity), 0);

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category || !newItem.price || !newItem.stockQuantity) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (!newItem.unit?.trim()) {
      Alert.alert('Error', 'Please provide a unit for this item (e.g., kg, g, l, ml, pcs)');
      return;
    }
    try {
      const id = `${Date.now()}`;
      const item = {
        id,
        name: newItem.name,
        category: newItem.category,
        price: parseFloat(newItem.price),
        stockQuantity: parseFloat(newItem.stockQuantity),
        minStockLevel: parseInt(newItem.minStockLevel) || 0,
        unit: newItem.unit || 'pcs',
        supplier: newItem.supplier || 'Unknown',
        lastUpdated: Date.now(),
        isActive: true,
      } as any;
      await firestoreService.createInventoryItem(item);
      await loadInventoryData();
      setShowAddModal(false);
      resetNewItem();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add inventory item');
    }
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      stockQuantity: item.stockQuantity.toString(),
      minStockLevel: item.minStockLevel.toString(),
      unit: item.unit,
      supplier: item.supplier,
    });
    setShowAddModal(true);
  };
  const handleUpdateItem = async () => {
    if (!editingItem) return;
    try {
      const updates = {
        name: newItem.name,
        category: newItem.category,
        price: parseFloat(newItem.price),
        stockQuantity: parseFloat(newItem.stockQuantity),
        minStockLevel: parseInt(newItem.minStockLevel) || 0,
        unit: (newItem.unit || '').trim(),
        supplier: newItem.supplier || 'Unknown',
        lastUpdated: Date.now(),
      };
      if (!updates.unit) {
        Alert.alert('Error', 'Please provide a unit for this item (e.g., kg, g, l, ml, pcs)');
        return;
      }
      await firestoreService.updateInventoryItem(editingItem.id, updates);
      await loadInventoryData();
      setShowAddModal(false);
      setEditingItem(null);
      resetNewItem();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update inventory item');
    }
  };

  const handleDeleteItem = (itemId: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestoreService.deleteInventoryItem(itemId);
              await loadInventoryData();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to delete inventory item');
            }
          },
        },
      ]
    );
  };

  const handleStockAdjustment = async (itemId: string, adjustment: number) => {
    const target = inventoryItems.find(i => i.id === itemId);
    if (!target || !firestoreService) return;
    const newQty = Math.max(0, Number(target.stockQuantity) + Number(adjustment));
    // Optimistic update
    const prevItems = inventoryItems;
    setInventoryItems(prevItems.map(item => item.id === itemId ? { ...item, stockQuantity: newQty, lastUpdated: Date.now() } : item));
    try {
      await firestoreService.updateInventoryItem(itemId, { stockQuantity: newQty, lastUpdated: Date.now() });
      // Listener will refresh; keep optimistic state meanwhile
    } catch (e: any) {
      // Rollback on failure
      setInventoryItems(prevItems);
      Alert.alert('Error', e?.message || 'Failed to update stock');
    }
  };

  const resetNewItem = () => {
    setNewItem({
      name: '',
      category: '',
      price: '',
      stockQuantity: '',
      minStockLevel: '',
      unit: '',
      supplier: '',
    });
  };

  const getStockStatusColor = (item: InventoryItem) => {
    if (item.stockQuantity === 0) return '#e74c3c';
    if (item.stockQuantity <= item.minStockLevel) return '#f39c12';
    return '#27ae60';
  };

  const getStockStatusText = (item: InventoryItem) => {
    if (item.stockQuantity === 0) return 'Out of Stock';
    if (item.stockQuantity <= item.minStockLevel) return 'Low Stock';
    return 'In Stock';
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.inventoryCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemCategory}>{item.category}</Text>
        </View>
        <View style={[
          styles.stockStatus,
          { backgroundColor: getStockStatusColor(item) }
        ]}>
          <Text style={styles.stockStatusText}>
            {getStockStatusText(item)}
          </Text>
        </View>
      </View>

      <View style={styles.itemDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price:</Text>
          <Text style={styles.detailValue}>Rs {item.price.toFixed(2)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Stock:</Text>
          <Text style={styles.detailValue}>
            {item.stockQuantity} {item.unit}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Min Level:</Text>
          <Text style={styles.detailValue}>
            {item.minStockLevel} {item.unit}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Supplier:</Text>
          <Text style={styles.detailValue}>{item.supplier}</Text>
        </View>
      </View>

      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.adjustButton]}
          onPress={() => handleStockAdjustment(item.id, 1)}
        >
          <Text style={styles.actionButtonText}>+1</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.adjustButton]}
          onPress={() => handleStockAdjustment(item.id, -1)}
        >
          <Text style={styles.actionButtonText}>-1</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditItem(item)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteItem(item.id)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredItems}
        renderItem={renderInventoryItem}
        keyExtractor={(item) => item.id}
        style={styles.inventoryList}
        contentContainerStyle={styles.inventoryListContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.title}>Inventory</Text>
              <Text style={styles.subtitle}>Track stock levels and manage inventory</Text>
            </View>

            <View style={styles.searchSection}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search inventory items..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[styles.categoryButton, selectedCategory === category && styles.categoryButtonActive]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={[styles.categoryButtonText, selectedCategory === category && styles.categoryButtonTextActive]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statGroup}>
                <Text style={styles.statHeading}>Total Items</Text>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{inventoryItems.length}</Text>
                </View>
              </View>
              <View style={styles.statGroup}>
                <Text style={styles.statHeading}>Low Stock</Text>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{lowStockItems.length}</Text>
                </View>
              </View>
              <View style={styles.statGroup}>
                <Text style={styles.statHeading}>Total Value (Rs)</Text>
                <View style={styles.statCard}>
                  <Text
                    style={[styles.statValue, { fontSize: 12 } ]}
                    numberOfLines={1}
                    ellipsizeMode="clip"
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    allowFontScaling
                  >
                    {totalValue.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {lowStockItems.length > 0 && (
              <View style={styles.alertSection}>
                <Text style={styles.alertTitle}>⚠️ Low Stock Alerts</Text>
                <Text style={styles.alertText}>{lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} need{lowStockItems.length !== 1 ? '' : 's'} restocking</Text>
              </View>
            )}
          </View>
        }
      />

      <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
        <Text style={styles.addButtonText}>+ Add Item</Text>
      </TouchableOpacity>

      <Modal visible={showAddModal} animationType="slide" transparent={true} onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingItem ? 'Edit Item' : 'Add New Item'}</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              <TextInput 
                style={styles.modalInput} 
                placeholder="Item Name" 
                placeholderTextColor={colors.textSecondary}
                value={newItem.name} 
                onChangeText={(text) => setNewItem(prev => ({ ...prev, name: text }))} 
              />
              {/* Category dropdown with add button */}
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>Category</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.modalInput, { flex: 1, justifyContent: 'center' }]}
                  onPress={() => setCategoryPickerVisible(true)}
                >
                  <Text style={{ color: newItem.category ? colors.textPrimary : colors.textSecondary }} numberOfLines={1}>
                    {newItem.category || 'Select category'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowAddCategoryModal(true)} style={{ paddingVertical: 12, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface }}>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>+ Add</Text>
                </TouchableOpacity>
              </View>
              <TextInput 
                style={styles.modalInput} 
                placeholder="Price" 
                placeholderTextColor={colors.textSecondary}
                value={newItem.price} 
                onChangeText={(text) => setNewItem(prev => ({ ...prev, price: text }))} 
                keyboardType="numeric" 
              />
              <TextInput 
                style={styles.modalInput} 
                placeholder="Stock Quantity" 
                placeholderTextColor={colors.textSecondary}
                value={newItem.stockQuantity} 
                onChangeText={(text) => setNewItem(prev => ({ ...prev, stockQuantity: text }))} 
                keyboardType="numeric" 
              />
              <TextInput 
                style={styles.modalInput} 
                placeholder="Minimum Stock Level" 
                placeholderTextColor={colors.textSecondary}
                value={newItem.minStockLevel} 
                onChangeText={(text) => setNewItem(prev => ({ ...prev, minStockLevel: text }))} 
                keyboardType="numeric" 
              />
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 6 }}>Unit</Text>
              <TouchableOpacity
                style={[styles.modalInput, { justifyContent: 'center' }]}
                onPress={() => setUnitPickerVisible(true)}
              >
                <Text style={{ color: newItem.unit ? colors.textPrimary : colors.textSecondary }} numberOfLines={1}>
                  {newItem.unit || 'Select unit (kg, g, l, ml, pcs)'}
                </Text>
              </TouchableOpacity>
              <TextInput 
                style={styles.modalInput} 
                placeholder="Supplier" 
                placeholderTextColor={colors.textSecondary}
                value={newItem.supplier} 
                onChangeText={(text) => setNewItem(prev => ({ ...prev, supplier: text }))} 
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => { setShowAddModal(false); setEditingItem(null); resetNewItem(); }}>
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonConfirm]} onPress={editingItem ? handleUpdateItem : handleAddItem}>
                <Text style={styles.modalButtonConfirmText}>{editingItem ? 'Update' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Category Picker Modal (similar to unit/ingredient pickers) */}
      <Modal visible={categoryPickerVisible} transparent animationType="fade" onRequestClose={() => setCategoryPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 380 }] }>
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {(categoriesList || []).length === 0 ? (
                <Text style={{ color: colors.textSecondary, padding: spacing.md, textAlign: 'center' }}>No categories. Tap + Add to create one.</Text>
              ) : (
                (categoriesList || []).map(c => (
                  <TouchableOpacity key={c.id} style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.outline }} onPress={() => { setNewItem(prev => ({ ...prev, category: c.name })); setCategoryPickerVisible(false); }}>
                    <Text style={{ color: colors.textPrimary }} numberOfLines={1}>{c.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Add Category Modal */}
      <Modal visible={showAddCategoryModal} animationType="fade" transparent onRequestClose={() => setShowAddCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 360 }]}>
            <Text style={styles.modalTitle}>Add Category</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Category name"
              placeholderTextColor={colors.textSecondary}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => { setShowAddCategoryModal(false); setNewCategoryName(''); }}>
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={async () => {
                  if (!newCategoryName.trim()) { Alert.alert('Error', 'Enter a category name'); return; }
                  try {
                    const svc = firestoreService || createFirestoreService((useSelector((s: RootState) => s.auth) as any)?.restaurantId);
                    await svc.createInventoryCategory({ name: newCategoryName.trim() });
                    const cats = await svc.getInventoryCategories();
                    const arr = Object.values(cats || {}).map((c: any) => ({ id: c.id, name: c.name }));
                    setCategoriesList(arr);
                    setNewItem(prev => ({ ...prev, category: newCategoryName.trim() }));
                    setNewCategoryName('');
                    setShowAddCategoryModal(false);
                    setShowCategoryDropdown(false);
                  } catch (e: any) {
                    Alert.alert('Error', e?.message || 'Failed to create category');
                  }
                }}
              >
                <Text style={styles.modalButtonConfirmText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Unit Picker Modal */}
      <Modal visible={unitPickerVisible} transparent animationType="fade" onRequestClose={() => setUnitPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 360 }] }>
            <Text style={styles.modalTitle}>Select Unit</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {['kg','g','l','ml','pcs'].map(u => (
                <TouchableOpacity key={u} style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.outline }} onPress={() => { setNewItem(prev => ({ ...prev, unit: u })); setUnitPickerVisible(false); }}>
                  <Text style={{ color: colors.textPrimary }}>{u}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  title: { fontSize: 28, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  searchSection: { backgroundColor: colors.surface, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  searchInput: { borderWidth: 1, borderColor: colors.outline, borderRadius: radius.md, padding: spacing.md, fontSize: 16, backgroundColor: colors.surface2, color: colors.textPrimary, marginBottom: spacing.md },
  categoriesContainer: {
    flexDirection: 'row',
  },
  categoryButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.outline, marginRight: spacing.sm, backgroundColor: colors.surface },
  categoryButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryButtonText: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  categoryButtonTextActive: { color: colors.textPrimary },
  statsContainer: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.md },
  statGroup: { flex: 1 },
  statHeading: { fontSize: 12, color: colors.textSecondary, marginLeft: 6, marginBottom: 6 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.outline, ...shadow.card },
  statValue: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  statLabel: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  alertSection: { backgroundColor: colors.surface, borderColor: colors.outline, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, margin: spacing.md },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: colors.warning, marginBottom: 4 },
  alertText: { fontSize: 14, color: colors.textSecondary },
  inventoryList: {
    flex: 1,
  },
  inventoryListContent: {
    padding: 16,
    paddingBottom: 100,
  },
  inventoryCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.outline, ...shadow.card },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  itemCategory: { fontSize: 12, color: colors.textSecondary },
  stockStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stockStatusText: { color: 'white', fontSize: 12, fontWeight: '600' },
  itemDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: { fontSize: 14, color: colors.textSecondary },
  detailValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: { flex: 1, padding: spacing.sm, borderRadius: radius.md, alignItems: 'center' },
  adjustButton: { backgroundColor: colors.primary },
  editButton: { backgroundColor: colors.warning },
  deleteButton: { backgroundColor: colors.danger },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: { 
    position: 'absolute', 
    bottom: 60, 
    right: 20, 
    backgroundColor: colors.success, 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderRadius: 30, 
    ...shadow.card 
  },
  addButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, width: '90%', maxWidth: 420, maxHeight: '80%', borderWidth: 1, borderColor: colors.outline },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginBottom: spacing.lg, textAlign: 'center' },
  modalScrollContent: { paddingBottom: spacing.md },
  modalInput: { borderWidth: 1, borderColor: colors.outline, borderRadius: radius.md, padding: spacing.md, fontSize: 16, marginBottom: spacing.md, backgroundColor: colors.surface2, color: colors.textPrimary },
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
  modalButtonCancel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
  modalButtonConfirm: { backgroundColor: colors.success },
  modalButtonCancelText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  modalButtonConfirmText: { fontSize: 16, fontWeight: '600', color: 'white' },
});
export default InventoryScreen;