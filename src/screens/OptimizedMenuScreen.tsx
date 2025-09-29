import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/storeFirebase';
import { MenuItem } from '../types/MenuItem';
import LazyImage from '../components/LazyImage';
import { useOptimizedListeners } from '../hooks/useOptimizedListeners';
import { useBatchReduxUpdates } from '../utils/batchReduxUpdates';
import { getOptimizedMenuItems } from '../services/OptimizedFirebaseService';

const OptimizedMenuScreen: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  const dispatch = useDispatch();
  const { restaurantId } = useSelector((state: RootState) => state.auth);
  const { addListener, cleanup } = useOptimizedListeners();
  const { addBatchUpdate } = useBatchReduxUpdates(dispatch);
  const { recordRenderTime } = useOptimizedListeners();
  
  // Memoized categories
  const categories = useMemo(() => {
    const cats = ['all', ...new Set(menuItems.map(item => item.category))];
    return cats.filter(Boolean);
  }, [menuItems]);
  
  // Memoized filtered items
  const processedItems = useMemo(() => {
    const startTime = performance.now();
    
    let filtered = menuItems;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    }
    
    const endTime = performance.now();
    recordRenderTime(endTime - startTime);
    
    return filtered;
  }, [menuItems, selectedCategory, searchQuery, recordRenderTime]);
  
  // Load menu items with optimization
  const loadMenuItems = useCallback(async () => {
    if (!restaurantId) return;
    
    try {
      setIsLoading(true);
      
      // Use optimized service
      const menuData = await getOptimizedMenuItems(restaurantId);
      const itemsArray = Object.values(menuData).map((item: any) => ({
        id: item.id || Object.keys(menuData).find(key => menuData[key] === item),
        name: item.name,
        description: item.description || '',
        price: item.price,
        category: item.category,
        isAvailable: item.isAvailable !== false,
        modifiers: item.modifiers || [],
        image: item.image || '',
        orderType: item.orderType || 'KOT',
        ingredients: item.ingredients || [],
      }));
      
      setMenuItems(itemsArray);
      
      // Batch update Redux state
      addBatchUpdate({
        type: 'menu/setMenuItems',
        payload: itemsArray
      });
      
    } catch (error) {
      console.error('❌ Error loading menu items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, addBatchUpdate]);
  
  // Setup real-time listener
  useEffect(() => {
    if (!restaurantId) return;
    
    const setupListener = () => {
      const { createFirestoreService } = require('../services/firestoreService');
      const service = createFirestoreService(restaurantId);
      
      return service.listenToMenuItems((items: Record<string, any>) => {
        const startTime = performance.now();
        
        const itemsArray = Object.values(items).map((item: any) => ({
          id: item.id || Object.keys(items).find(key => items[key] === item),
          name: item.name,
          description: item.description || '',
          price: item.price,
          category: item.category,
          isAvailable: item.isAvailable !== false,
          modifiers: item.modifiers || [],
          image: item.image || '',
          orderType: item.orderType || 'KOT',
          ingredients: item.ingredients || [],
        }));
        
        setMenuItems(itemsArray);
        
        // Batch update Redux state
        addBatchUpdate({
          type: 'menu/setMenuItems',
          payload: itemsArray
        });
        
        const endTime = performance.now();
        recordRenderTime(endTime - startTime);
      });
    };
    
    const unsubscribe = addListener('menu-realtime', setupListener());
    
    return () => {
      cleanup();
    };
  }, [restaurantId, addListener, cleanup, addBatchUpdate, recordRenderTime]);
  
  // Initial load
  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);
  
  // Render menu item
  const renderMenuItem = useCallback(({ item }: { item: MenuItem }) => (
    <TouchableOpacity style={styles.menuItem}>
      <View style={styles.menuItemContent}>
        <LazyImage
          src={item.image}
          width={80}
          height={80}
          style={styles.menuItemImage}
          placeholder={
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>Loading...</Text>
            </View>
          }
        />
        <View style={styles.menuItemInfo}>
          <Text style={styles.menuItemName}>{item.name}</Text>
          <Text style={styles.menuItemDescription}>{item.description}</Text>
          <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  ), []);
  
  // Render category filter
  const renderCategoryFilter = useCallback(() => (
    <View style={styles.categoryFilter}>
      {categories.map(category => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryButton,
            selectedCategory === category && styles.categoryButtonActive
          ]}
          onPress={() => setSelectedCategory(category)}
        >
          <Text style={[
            styles.categoryButtonText,
            selectedCategory === category && styles.categoryButtonTextActive
          ]}>
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  ), [categories, selectedCategory]);
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading menu...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search menu items..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      
      {renderCategoryFilter()}
      
      <FlatList
        data={processedItems}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.menuList}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={20}
        getItemLayout={(data, index) => ({
          length: 200,
          offset: 200 * index,
          index,
        })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    margin: 16,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryFilter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#333',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  menuList: {
    padding: 16,
  },
  menuItem: {
    flex: 1,
    margin: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItemContent: {
    flexDirection: 'row',
  },
  menuItemImage: {
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  placeholderText: {
    fontSize: 12,
    color: '#666',
  },
  menuItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});

export default OptimizedMenuScreen;
