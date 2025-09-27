// src/screens/Orders/OrderTakingScreen.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Image,
} from 'react-native';
import { RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/storeFirebase';
import { selectActiveTables } from '../../redux/slices/tablesSliceFirebase';
import { addItem, removeItem, updateItemQuantity, createOrder, cancelOrder, markOrderReviewed } from '../../redux/slices/ordersSliceFirebase';
import { saveOrderToFirebase } from '../../redux/slices/ordersSliceFirebase';
import { MenuItem } from '../../redux/slices/menuSliceFirebase';
import { colors, spacing, radius, shadow } from '../../theme';
import { getOptimizedTables, getOptimizedMenuItems } from '../../services/DirectFirebaseService';
import { firebaseConnectionManager } from '../../services/FirebaseConnectionManager';
import { imageCacheService } from '../../services/ImageCacheService';

interface RouteParams {
  tableId: string;
  orderId: string;
}

const OrderTakingScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [footerHeight, setFooterHeight] = useState(0);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseTables, setFirebaseTables] = useState<Record<string, any>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // navigation typed as any to avoid unnecessary TS noise in this file
  const navigation = useNavigation<any>();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { restaurantId } = useSelector((state: RootState) => state.auth);

  const { tableId, orderId } = route.params as RouteParams;
  const [selectedTableId, setSelectedTableId] = useState(tableId);
  // Stage items locally when creating a brand-new order (orderId === 'new') until user presses Save
  const [pendingItems, setPendingItems] = useState<Record<string, { item: MenuItem; quantity: number }>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Re-enable save button only when a new item is added after a save
  useEffect(() => {
    if (orderId === 'new') {
      const hasItems = Object.keys(pendingItems).length > 0;
      if (hasItems) setIsSaving(false);
    }
  }, [pendingItems, orderId]);

  // When screen gains focus for a brand-new order, keep Save disabled until an item is added
  useFocusEffect(
    useCallback(() => {
      if (orderId === 'new') {
        const hasItems = Object.keys(pendingItems).length > 0;
        setIsSaving(!hasItems);
      }
    }, [orderId, pendingItems])
  );

  const order = useSelector((state: RootState) => state.orders.ordersById[orderId]);
  const ordersById = useSelector((state: RootState) => state.orders.ordersById);
  const activeTables = useSelector(selectActiveTables);

  // Get the selected table from Firebase tables instead of Redux
  const selectedTable = firebaseTables[selectedTableId] ? {
    id: selectedTableId,
    name: firebaseTables[selectedTableId].name,
    seats: firebaseTables[selectedTableId].seats,
    description: firebaseTables[selectedTableId].description,
    isActive: firebaseTables[selectedTableId].isActive,
  } : null;

  // Cache helpers (shared behavior with Menu screen)
  const getMenuCacheKey = (rid?: string) => `menu_cache_${rid || ''}`;

  const loadMenuFromCache = async (rid: string) => {
    try {
      const raw = await AsyncStorage.getItem(getMenuCacheKey(rid));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as MenuItem[];
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const saveMenuToCache = async (rid: string, list: MenuItem[]) => {
    try {
      await AsyncStorage.setItem(getMenuCacheKey(rid), JSON.stringify(list));
    } catch {}
  };

  const fetchMenuFromFirebase = async (rid: string) => {
    const menuData = await getOptimizedMenuItems(rid);
    const menuItemsArray = Object.values(menuData).map((item: any) => ({
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

    // Prime and apply local image URIs
    const urls = menuItemsArray.map((i: any) => i.image).filter(Boolean);
    const urlToLocal = await imageCacheService.primeCache(urls);
    const withLocalImages = menuItemsArray.map((i: any) => ({
      ...i,
      image: urlToLocal[i.image || ''] || i.image,
    }));

    setMenuItems(withLocalImages);
    await saveMenuToCache(rid, withLocalImages);
  };

  // Initial load: cache-first for menu; tables fetched fresh
  useEffect(() => {
    const init = async () => {
      if (!restaurantId) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        // Load tables (not cached)
        const tablesData = await getOptimizedTables(restaurantId);
        console.log('🔥 OrderTakingScreen - Firebase tables loaded:', tablesData);
        setFirebaseTables(tablesData);

        // Try cache first for menu
        const cached = await loadMenuFromCache(restaurantId);
        if (cached && cached.length > 0) {
          setMenuItems(cached);
        } else {
          await fetchMenuFromFirebase(restaurantId);
        }
      } catch (error) {
        console.error('Error initializing order taking screen:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [restaurantId]);

  const onRefreshMenu = async () => {
    if (!restaurantId) return;
    try {
      setIsRefreshing(true);
      await fetchMenuFromFirebase(restaurantId);
    } catch (e) {
      console.error('Manual refresh failed:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Cancel empty order when component unmounts or when navigating back
  useEffect(() => {
    return () => {
      // Check if order exists and has no items, then cancel it
      if (order && order.items.length === 0) {
        dispatch(cancelOrder({ orderId: order.id }));
      }

      // Cleanup Firebase connections
      if (restaurantId) {
        console.log('🧹 OrderTakingScreen: Cleaning up Firebase connections');
        firebaseConnectionManager.cleanupService(restaurantId);
      }
    };
  }, [order, dispatch, restaurantId]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(menuItems.map((i: MenuItem) => i.category)))], [menuItems]);

  // Debug: Log table information
  console.log('=== TABLE DEBUG INFO ===');
  console.log('Active tables count:', activeTables.length);
  console.log('Active tables:', activeTables.map((t: any) => ({ id: t.id, name: t.name, isActive: t.isActive })));
  console.log('=== END DEBUG INFO ===');

  const filteredItems = useMemo(() => (
    (menuItems || []).filter(item =>
      (categoryFilter === 'All' || item.category === categoryFilter) &&
      (searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  ), [menuItems, searchQuery, categoryFilter]);

  const handleAddItem = (item: MenuItem) => {
    if (orderId === 'new') {
      setPendingItems((prev) => {
        const current = prev[item.id]?.quantity || 0;
        return { ...prev, [item.id]: { item, quantity: current + 1 } };
      });
      return;
    }
    // Existing order flow
    dispatch(addItem({
      orderId,
      item: {
        menuItemId: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        quantity: 1,
        modifiers: [],
        orderType: item.orderType
      }
    }));

    // Note: we intentionally only update local store (redux); actual Firebase persisting is handled elsewhere
  };

  const handleUpdateQuantity = (menuItemId: string, quantity: number) => {
    if (orderId === 'new') {
      setPendingItems((prev) => {
        const existing = prev[menuItemId];
        if (!existing) return prev;
        const nextQty = Math.max(0, quantity);
        const copy = { ...prev } as any;
        if (nextQty === 0) delete copy[menuItemId];
        else copy[menuItemId] = { ...existing, quantity: nextQty };
        return copy;
      });
      return;
    }
    if (!order) return;
    if (quantity <= 0) {
      dispatch(removeItem({ orderId, menuItemId }));
    } else {
      dispatch(updateItemQuantity({ orderId, menuItemId, quantity }));
    }
  };

  const calculateTotal = () => {
    if (orderId === 'new') {
      return Object.values(pendingItems).reduce((sum, x) => sum + x.item.price * x.quantity, 0);
    }
    return order?.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0;
  };

  const totalItemsCount = () => {
    if (orderId === 'new') return Object.values(pendingItems).reduce((s, x) => s + x.quantity, 0);
    return (order?.items || []).reduce((sum: number, i: any) => sum + i.quantity, 0);
  };

  const renderMenuItem = ({ item }: { item: any }) => {
    // Check if this item is already in the order
    const orderItem = orderId === 'new' ? undefined : order?.items.find((orderItem: any) => orderItem.menuItemId === item.id);
    const currentQuantity = orderId === 'new' ? (pendingItems[item.id]?.quantity || 0) : (orderItem?.quantity || 0);

    return (
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => handleAddItem(item)}
        activeOpacity={1}
      >
        {/* Image Placeholder */}
        <View style={styles.menuItemImage}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.menuItemImageActual} />
          ) : (
            <View style={styles.menuItemImagePlaceholder}>
              <Text style={styles.menuItemImagePlaceholderText}>48 x 48</Text>
            </View>
          )}
        </View>

        {/* Item Details */}
        <View style={styles.menuItemDetails}>
          <Text style={styles.menuItemName}>{item.name}</Text>
          <Text style={styles.menuItemPrice}>Rs {item.price.toFixed(2)}</Text>
        </View>

        {/* Action Button */}
        {currentQuantity > 0 ? (
          // Show quantity controls if item is in order
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleUpdateQuantity(item.id, currentQuantity - 1)}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.quantityDisplay}>
              <Text style={styles.quantityText}>{currentQuantity}</Text>
            </View>

            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleUpdateQuantity(item.id, currentQuantity + 1)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          // Show add button if item is not in order
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddItem(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>ADD</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Items to Order</Text>
          <Text style={styles.subtitle}>Loading menu items...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left','right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Items to Order</Text>
        <Text style={styles.subtitle}>Add items to the order for {selectedTable?.name || `Table ${selectedTableId?.replace('table-', '') || selectedTableId}`}</Text>
      </View>

      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search menu..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
          {categories.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.categoryChip, categoryFilter === c && styles.categoryChipActive]}
              onPress={() => setCategoryFilter(c)}
            >
              <Text style={[styles.categoryText, categoryFilter === c && styles.categoryTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.id}
        style={styles.menuList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.lg + footerHeight }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefreshMenu} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No items found.</Text>
          </View>
        )}
      />

      {(orderId === 'new' ? Object.keys(pendingItems).length > 0 : (order && order.items.length > 0)) && (
        <View
          style={[styles.footer, { paddingBottom: spacing.md + insets.bottom }]}
          onLayout={({ nativeEvent }) => setFooterHeight(nativeEvent.layout.height)}
        >
          <View style={styles.footerSummary}>
            <Text style={styles.footerSummaryText}>
              {selectedTable?.name || `Table ${selectedTableId?.replace('table-', '') || selectedTableId}`} • {totalItemsCount()} items
            </Text>
            <Text style={styles.footerSummaryTotal}>Rs. {calculateTotal().toFixed(2)}</Text>
          </View>
          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reviewButton, (orderId === 'new' && (isSaving || Object.keys(pendingItems).length === 0)) && { opacity: 0.6 }]}
              disabled={orderId === 'new' ? (isSaving || Object.keys(pendingItems).length === 0) : false}
              onPress={async () => {
                if (orderId === 'new') {
                  // Create order now and persist pending items
                  if (isSaving) return;
                  setIsSaving(true);
                  try {
                    const action: any = dispatch(createOrder(selectedTableId));
                    const newOrderId = action.payload.id;
                    Object.values(pendingItems).forEach(({ item, quantity }) => {
                      dispatch(addItem({
                        orderId: newOrderId,
                        item: {
                          menuItemId: item.id,
                          name: item.name,
                          description: item.description,
                          price: item.price,
                          quantity,
                          modifiers: [],
                          orderType: item.orderType,
                        }
                      }));
                    });
                    // Do not save to Firebase here; confirmation screen handles saving
                    setPendingItems({});
                    // @ts-ignore
                    navigation.setParams({ tableId: selectedTableId, orderId: newOrderId });
                    // Navigate to Order Confirmation for review
                    // @ts-ignore
                    navigation.navigate('OrderConfirmation', { orderId: newOrderId, tableId: selectedTableId });
                  } catch (e) {
                    Alert.alert('Error', 'Failed to save order. Please try again.');
                  }
                  return;
                }
                // Existing order path - check if order still exists and is ongoing
                const currentOrder = ordersById[orderId];
                if (!currentOrder || currentOrder.status !== 'ongoing') {
                  // Order doesn't exist or is completed, create a new order instead
                  console.log('Order not found or completed, creating new order instead');
                  if (isSaving) return;
                  setIsSaving(true);
                  try {
                    const action: any = dispatch(createOrder(selectedTableId));
                    const newOrderId = action.payload.id;
                    Object.values(pendingItems).forEach(({ item, quantity }) => {
                      dispatch(addItem({
                        orderId: newOrderId,
                        item: {
                          menuItemId: item.id,
                          name: item.name,
                          description: item.description,
                          price: item.price,
                          quantity,
                          modifiers: [],
                          orderType: item.orderType,
                        }
                      }));
                    });
                    setPendingItems({});
                    // @ts-ignore
                    navigation.setParams({ tableId: selectedTableId, orderId: newOrderId });
                    // Navigate to Order Confirmation for review
                    // @ts-ignore
                    navigation.navigate('OrderConfirmation', { orderId: newOrderId, tableId: selectedTableId });
                  } catch (e) {
                    Alert.alert('Error', 'Failed to create new order. Please try again.');
                  } finally {
                    setIsSaving(false);
                  }
                  return;
                }

                // Order exists and is ongoing, proceed normally
                dispatch(markOrderReviewed({ orderId }));
                try {
                  // @ts-ignore
                  navigation.navigate('OrderConfirmation', {
                    orderId,
                    tableId: selectedTableId
                  });
                } catch (error) {
                  Alert.alert('Navigation Error', 'Unable to navigate to order confirmation. Please try again.');
                }
              }}
            >
              <Ionicons name={'cart'} size={18} color="white" style={styles.buttonIcon} />
              <Text style={styles.reviewButtonText}>Review Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  searchSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
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
    color: colors.textPrimary,
  },
  categoryFilter: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categoryChip: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryTextActive: {
    color: 'white',
  },
  menuList: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  menuRow: {
    justifyContent: 'space-between',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    backgroundColor: colors.background,
  },
  menuItemImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  menuItemImageActual: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  menuItemImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  menuItemImagePlaceholderText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  menuItemDetails: {
    flex: 1,
    marginRight: spacing.md,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  quantityDisplay: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.sm,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  footerSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  footerSummaryText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 16,
  },
  footerSummaryTotal: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  reviewButton: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  reviewButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  emptyState: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});

export default OrderTakingScreen;
