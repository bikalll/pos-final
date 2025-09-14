import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { MenuItemForm, MenuItemImage, CategoryManagement } from '../../components';
import { MenuItem } from '../../components/MenuItemForm';
import { Category } from '../../components/CategoryManagement';
import { ImageInfo } from '../../services/imageService';
import { RootState } from '../../redux/store';
import { MenuItem as ReduxMenuItem, addMenuItem, updateMenuItem, removeMenuItem, toggleAvailability } from '../../redux/slices/menuSlice';
import { createFirestoreService } from '../../services/firestoreService';

const EnhancedMenuManagementScreen: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<ReduxMenuItem[]>([]);
  const [firestoreService, setFirestoreService] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const dispatch = useDispatch();

  // Initialize Firebase service
  useEffect(() => {
    const initFirebase = async () => {
      try {
        const service = createFirestoreService('default_restaurant');
        setFirestoreService(service);
        
        // Load categories
        const categoriesData = await service.getCategories();
        const categoriesArray = Object.values(categoriesData).map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
        }));
        setCategories(categoriesArray);
        
        // Load menu items
        const menuData = await service.getMenuItems();
        const menuItemsArray = Object.values(menuData).map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          price: item.price,
          category: item.category,
          isAvailable: item.isAvailable,
          modifiers: item.modifiers || [],
          image: item.image,
          orderType: item.orderType,
          ingredients: item.ingredients || [],
        }));
        setMenuItems(menuItemsArray);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing Firebase:', error);
        setIsLoading(false);
      }
    };
    
    initFirebase();
  }, []);

  const handleAddItem = async (item: MenuItem) => {
    try {
      // Convert component MenuItem to Redux MenuItem
      const reduxMenuItem: ReduxMenuItem = {
        id: Date.now().toString(),
        name: item.name,
        description: item.description || '', // Ensure description is always a string
        price: item.price,
        category: item.category,
        isAvailable: item.isAvailable,
        modifiers: [], // Default empty array for modifiers
        image: undefined, // Redux MenuItem uses image string, not imageInfo
        orderType: item.orderType,
        ingredients: item.ingredients || [],
      };
      
      // Save to Firebase
      if (firestoreService) {
        await firestoreService.createMenuItem(reduxMenuItem);
      }
      
      // Update local state
      setMenuItems(prev => [...prev, reduxMenuItem]);
      dispatch(addMenuItem(reduxMenuItem));
      
      setShowAddModal(false);
      Alert.alert('Success', 'Menu item added successfully!');
    } catch (error) {
      console.error('Error adding menu item:', error);
      Alert.alert('Error', 'Failed to add menu item. Please try again.');
    }
  };

  const handleEditItem = (item: ReduxMenuItem) => {
    const formItem: MenuItem = {
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category,
      imageInfo: null,
      isAvailable: item.isAvailable,
      preparationTime: 15,
      orderType: item.orderType,
      allergens: [],
      nutritionalInfo: {},
    };
    setEditingItem(formItem);
  };

  const handleUpdateItem = async (updatedItem: MenuItem) => {
    if (editingItem) {
      try {
        const reduxMenuItem: ReduxMenuItem = {
          id: editingItem.id || Date.now().toString(),
          name: updatedItem.name,
          description: updatedItem.description || '',
          price: updatedItem.price,
          category: updatedItem.category,
          isAvailable: updatedItem.isAvailable,
          modifiers: [], // Default empty array for modifiers
          image: undefined, // Redux MenuItem uses image string, not imageInfo
          orderType: updatedItem.orderType,
          ingredients: updatedItem.ingredients || [],
        };
        
        // Update in Firebase
        if (firestoreService) {
          await firestoreService.updateMenuItem(reduxMenuItem.id, reduxMenuItem);
        }
        
        // Update local state
        setMenuItems(prev => prev.map(item => 
          item.id === reduxMenuItem.id ? reduxMenuItem : item
        ));
        dispatch(updateMenuItem(reduxMenuItem));
        
        setEditingItem(null);
        Alert.alert('Success', 'Menu item updated successfully!');
      } catch (error) {
        console.error('Error updating menu item:', error);
        Alert.alert('Error', 'Failed to update menu item. Please try again.');
      }
    }
  };

  const handleDeleteItem = (itemId: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this menu item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from Firebase
              if (firestoreService) {
                await firestoreService.deleteMenuItem(itemId);
              }
              
              // Update local state
              setMenuItems(prev => prev.filter(item => item.id !== itemId));
              dispatch(removeMenuItem(itemId));
              Alert.alert('Success', 'Menu item deleted successfully!');
            } catch (error) {
              console.error('Error deleting menu item:', error);
              Alert.alert('Error', 'Failed to delete menu item. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleToggleAvailability = async (itemId: string) => {
    try {
      const item = menuItems.find(item => item.id === itemId);
      if (item && firestoreService) {
        const newAvailability = !item.isAvailable;
        
        // Update Firebase first
        await firestoreService.updateMenuItem(itemId, { isAvailable: newAvailability });
        
        // Only update local state if Firebase update succeeds
        const updatedItem = { ...item, isAvailable: newAvailability };
        setMenuItems(prev => prev.map(item => 
          item.id === itemId ? updatedItem : item
        ));
        dispatch(toggleAvailability(itemId));
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
      Alert.alert('Error', 'Failed to update availability. Please try again.');
    }
  };

  // Category management functions
  const handleAddCategory = async (category: Omit<Category, 'id'>) => {
    try {
      if (firestoreService) {
        const categoryId = await firestoreService.createCategory(category);
        const newCategory = { ...category, id: categoryId };
        setCategories(prev => [...prev, newCategory]);
      }
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Error', 'Failed to add category. Please try again.');
    }
  };

  const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      if (firestoreService) {
        await firestoreService.updateCategory(id, updates);
        setCategories(prev => prev.map(cat => 
          cat.id === id ? { ...cat, ...updates } : cat
        ));
      }
    } catch (error) {
      console.error('Error updating category:', error);
      Alert.alert('Error', 'Failed to update category. Please try again.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      if (firestoreService) {
        await firestoreService.deleteCategory(id);
        setCategories(prev => prev.filter(cat => cat.id !== id));
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      Alert.alert('Error', 'Failed to delete category. Please try again.');
    }
  };

  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const renderMenuItem = ({ item }: { item: ReduxMenuItem }) => (
    <View style={styles.menuItemCard}>
      <View style={styles.menuItemHeader}>
        <View style={styles.menuItemInfo}>
          <Text style={styles.menuItemName}>{item.name}</Text>
          <Text style={styles.menuItemCategory}>{item.category}</Text>
        </View>
        <View style={styles.menuItemActions}>
          <TouchableOpacity
            style={[
              styles.availabilityToggle,
              item.isAvailable && styles.availabilityToggleActive,
            ]}
            onPress={() => handleToggleAvailability(item.id!)}
          >
            <Text
              style={[
                styles.availabilityText,
                item.isAvailable && styles.availabilityTextActive,
              ]}
            >
              {item.isAvailable ? 'Available' : 'Not Available'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.menuItemContent}>
        <View style={styles.menuItemImage}>
          <MenuItemImage
            imageInfo={null} // Redux MenuItem doesn't have imageInfo, using null
            size="small"
            editable={false}
          />
        </View>
        
        <View style={styles.menuItemDetails}>
          <Text style={styles.menuItemDescription}>{item.description || ''}</Text>
          <View style={styles.menuItemMeta}>
            <Text style={styles.menuItemPrice}>₹{item.price.toFixed(2)}</Text>
            <Text style={styles.menuItemOrderType}>{item.orderType}</Text>
          </View>
        </View>
      </View>

      <View style={styles.menuItemFooter}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditItem(item)}
        >
          <Ionicons name="create-outline" size={20} color="#007AFF" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteItem(item.id!)}
        >
          <Ionicons name="trash-outline" size={20} color="#ff3b30" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCategoryFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryFilter}
      contentContainerStyle={styles.categoryFilterContent}
    >
      {['All', ...categories.map(cat => cat.name)].map((category) => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryChip,
            selectedCategory === category && styles.categoryChipSelected,
          ]}
          onPress={() => setSelectedCategory(category)}
        >
          <Text
            style={[
              styles.categoryChipText,
              selectedCategory === category && styles.categoryChipTextSelected,
            ]}
          >
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
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

  // Debug logging
  console.log('Menu Management Render:', {
    isLoading,
    categoriesCount: categories.length,
    menuItemsCount: menuItems.length,
    showCategoryManagement,
    selectedCategory
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Menu Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {/* Categories Section - Made Very Visible */}
      <View style={styles.categoriesSection}>
        <View style={styles.categoriesHeader}>
          <View style={styles.categoriesHeaderInfo}>
            <Text style={styles.categoriesTitle}>Categories</Text>
            <Text style={styles.categoriesSubtitle}>Manage the categories for your menu items</Text>
          </View>
          <TouchableOpacity
            style={styles.categoriesButton}
            onPress={() => {
              console.log('Categories button pressed');
              setShowCategoryManagement(true);
            }}
          >
            <Ionicons name="add" size={20} color="#007AFF" />
            <Text style={styles.categoriesButtonText}>Add Category</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderCategoryFilter()}

      <FlatList
        data={filteredItems}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id!}
        contentContainerStyle={styles.menuList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No menu items yet</Text>
            <Text style={styles.emptySubtext}>Add your first menu item to get started</Text>
          </View>
        }
      />

      {/* Add Item Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <MenuItemForm
          onSave={handleAddItem}
          onCancel={() => setShowAddModal(false)}
          categories={categories.map(cat => cat.name)}
        />
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        visible={!!editingItem}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <MenuItemForm
          item={editingItem!}
          onSave={handleUpdateItem}
          onCancel={() => setEditingItem(null)}
          categories={categories.map(cat => cat.name)}
        />
      </Modal>

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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  // Categories Section Styles
  categoriesSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoriesHeaderInfo: {
    flex: 1,
  },
  categoriesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  categoriesSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  categoriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  categoriesButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  categoryFilter: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryFilterContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryChipText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  menuList: {
    padding: 20,
  },
  menuItemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  menuItemCategory: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  menuItemActions: {
    alignItems: 'flex-end',
  },
  availabilityToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  availabilityToggleActive: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  availabilityText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  availabilityTextActive: {
    color: '#fff',
  },
  menuItemContent: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  menuItemImage: {
    marginRight: 12,
  },
  menuItemDetails: {
    flex: 1,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  menuItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  menuItemTime: {
    fontSize: 12,
    color: '#999',
  },
  menuItemOrderType: {
    fontSize: 12,
    color: '#999',
  },
  menuItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  editButtonText: {
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    color: '#ff3b30',
    fontWeight: '500',
    marginLeft: 4,
  },

});

export default EnhancedMenuManagementScreen;
