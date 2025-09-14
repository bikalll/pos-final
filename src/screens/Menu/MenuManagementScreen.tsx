import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, shadow } from '../../theme';
import { RootState } from '../../redux/store';
import { addMenuItem, updateMenuItem, removeMenuItem, toggleAvailability, MenuItem } from '../../redux/slices/menuSlice';
import { CategoryManagement } from '../../components';
import { createFirestoreService } from '../../services/firestoreService';

const MenuManagementScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { restaurantId } = useSelector((s: RootState) => s.auth);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [firestoreService, setFirestoreService] = useState<any>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);

  // Load data function
  const loadData = async () => {
    if (!restaurantId) return;
    
    try {
      setIsLoading(true);
      const service = createFirestoreService(restaurantId);
      setFirestoreService(service);
      
      // Load menu items and categories
      const [menuData, categoriesData] = await Promise.all([
        service.getMenuItems(),
        service.getCategories()
      ]);
      
      const itemsArray = Object.values(menuData).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        image: item.image,
        ingredients: item.ingredients,
        isAvailable: item.isAvailable !== false,
        modifiers: item.modifiers || [],
        orderType: item.orderType || 'KOT',
      }));
      
      setMenuItems(itemsArray);
      const categoriesArray = Object.values(categoriesData).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
      }));
      setCategories(categoriesArray);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load menu data');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Firebase service and load data
  React.useEffect(() => {
    loadData();
  }, [restaurantId]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('Menu Management focused - refreshing data...');
      loadData();
    }, [restaurantId])
  );

  const openAdd = () => {
    (navigation as any).navigate('AddDish');
  };

  const openEdit = (item: MenuItem) => {
    (navigation as any).navigate('AddDish', { item });
  };

  const confirmDelete = async (item: MenuItem) => {
    Alert.alert(
      'Delete Dish',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (firestoreService) {
                await firestoreService.deleteMenuItem(item.id);
                setMenuItems(prev => prev.filter(i => i.id !== item.id));
                dispatch(removeMenuItem(item.id));
              }
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const toggleItemAvailability = async (item: MenuItem) => {
    try {
      if (firestoreService) {
        const newAvailability = !item.isAvailable;
        
        // Update Firebase first
        await firestoreService.updateMenuItem(item.id, { isAvailable: newAvailability });
        
        // Only update local state if Firebase update succeeds
        setMenuItems(prev => 
          prev.map(i => i.id === item.id ? { ...i, isAvailable: newAvailability } : i)
        );
        dispatch(toggleAvailability(item.id));
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      Alert.alert('Error', 'Failed to update availability');
    }
  };

  const handleAddCategory = async (category: { name: string }) => {
    try {
      if (firestoreService) {
        await firestoreService.createCategory({ name: category.name });
        const categoriesData = await firestoreService.getCategories();
        const categoriesArray = Object.values(categoriesData).map((cat: any) => ({ id: cat.id, name: cat.name }));
        setCategories(categoriesArray);
      }
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Error', 'Failed to add category');
    }
  };

  const handleUpdateCategory = async (id: string, category: Partial<{ name: string }>) => {
    try {
      if (firestoreService && category.name) {
        await firestoreService.updateCategory(id, { name: category.name });
        const categoriesData = await firestoreService.getCategories();
        const categoriesArray = Object.values(categoriesData).map((cat: any) => ({ id: cat.id, name: cat.name }));
        setCategories(categoriesArray);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      Alert.alert('Error', 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      if (firestoreService) {
        await firestoreService.deleteCategory(categoryId);
        const categoriesData = await firestoreService.getCategories();
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      Alert.alert('Error', 'Failed to delete category');
    }
  };

  const allCategories = useMemo(() => {
    const cats = Array.isArray(categories) ? categories.map(c => c.name) : [];
    return ['All', ...cats];
  }, [categories]);

  const filtered = useMemo(() => {
    let filteredItems = menuItems;
    
    if (search) {
      filteredItems = filteredItems.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (categoryFilter !== 'All') {
      filteredItems = filteredItems.filter(item => item.category === categoryFilter);
    }
    
    return filteredItems;
  }, [menuItems, search, categoryFilter]);

  const renderItem = ({ item }: { item: MenuItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDescription}>{item.description || 'No description'}</Text>
          <Text style={styles.itemPrice}>Rs {item.price.toFixed(2)}</Text>
          <Text style={styles.itemCategory}>Category: {item.category}</Text>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={[styles.actionButton, item.isAvailable ? styles.availableButton : styles.unavailableButton]}
            onPress={() => toggleItemAvailability(item)}
          >
            <Ionicons 
              name={item.isAvailable ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color={item.isAvailable ? colors.success : colors.danger} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEdit(item)}
          >
            <Ionicons name="pencil" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => confirmDelete(item)}
          >
            <Ionicons name="trash" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading menu items...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Menu Management</Text>
        <Text style={styles.subtitle}>Manage your restaurant's menu items</Text>
      </View>

      {/* Categories Section */}
      <View style={styles.categoriesSection}>
        <View style={styles.categoriesHeader}>
          <Text style={styles.categoriesTitle}>Categories</Text>
          <TouchableOpacity
            style={styles.categoriesButton}
            onPress={() => setShowCategoryManagement(true)}
          >
            <Ionicons name="settings" size={16} color={colors.background} />
            <Text style={styles.categoriesButtonText}>Manage Categories</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filters}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search dishes..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        
        <FlatList
          horizontal
          data={allCategories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                categoryFilter === item && styles.filterChipActive
              ]}
              onPress={() => setCategoryFilter(item)}
            >
              <Text style={[
                styles.filterChipText,
                categoryFilter === item && styles.filterChipTextActive
              ]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: Math.max(120, 80 + insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No dishes found</Text>
            <Text style={styles.emptySubtext}>
              {search || categoryFilter !== 'All' 
                ? 'Try adjusting your search or filter' 
                : 'Add your first dish to get started'
              }
            </Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={[
          styles.addButton,
          { bottom: (insets.bottom || 0) + spacing.lg },
        ]} 
        onPress={openAdd}
      >
        <Text style={styles.addButtonText}>+ Add Dish</Text>
      </TouchableOpacity>

      {/* Category Management Modal */}
      <Modal
        visible={showCategoryManagement}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          console.log('Category modal closed');
          setShowCategoryManagement(false);
        }}
      >
        <CategoryManagement
          categories={categories}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: { 
    padding: spacing.md, 
    paddingTop: 0, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.outline 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: colors.textPrimary, 
    marginBottom: 4 
  },
  subtitle: { 
    color: colors.textSecondary 
  },
  categoriesSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoriesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  categoriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  categoriesButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  filters: { 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.sm, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.outline 
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  filterList: {
    paddingRight: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.background,
    fontWeight: '500',
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  itemDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  itemCategory: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  availableButton: {
    backgroundColor: colors.success + '20',
  },
  unavailableButton: {
    backgroundColor: colors.danger + '20',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  addButton: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadow.card,
  },
  addButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MenuManagementScreen;