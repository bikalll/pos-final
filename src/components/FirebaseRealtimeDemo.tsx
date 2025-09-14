import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/storeFirebase';
import { createOrder, addItem, completeOrder } from '../redux/slices/ordersSliceFirebase';
import { reserveTable, unreserveTable } from '../redux/slices/tablesSliceFirebase';
import { selectActiveTables, selectVisibleTables } from '../redux/slices/tablesSliceFirebase';
import { getFirebaseService } from '../services/firebaseService';

const FirebaseRealtimeDemo: React.FC = () => {
  const dispatch = useDispatch();
  const [isConnected, setIsConnected] = useState(false);
  
  // Selectors
  const tables = useSelector(selectActiveTables);
  const visibleTables = useSelector(selectVisibleTables);
  const orders = useSelector((state: RootState) => state.orders.ordersById);
  const ongoingOrderIds = useSelector((state: RootState) => state.orders.ongoingOrderIds);
  const completedOrderIds = useSelector((state: RootState) => state.orders.completedOrderIds);

  useEffect(() => {
    // Check Firebase connection
    const checkConnection = () => {
      try {
        const firebaseService = getFirebaseService();
        setIsConnected(true);
      } catch (error) {
        setIsConnected(false);
      }
    };

    checkConnection();
  }, []);

  // Demo: Reserve a table
  const handleReserveTable = (tableId: string) => {
    dispatch(reserveTable({
      id: tableId,
      reservedBy: 'Demo User',
      reservedUntil: Date.now() + (2 * 60 * 60 * 1000), // 2 hours from now
      reservedNote: 'Demo reservation'
    }));
    
    Alert.alert('Table Reserved', `Table ${tableId} has been reserved. This will update in real-time for all users.`);
  };

  // Demo: Unreserve a table
  const handleUnreserveTable = (tableId: string) => {
    dispatch(unreserveTable({ id: tableId }));
    Alert.alert('Table Unreserved', `Table ${tableId} is now available. This will update in real-time for all users.`);
  };

  // Demo: Create a new order
  const handleCreateOrder = (tableId: string) => {
    dispatch(createOrder(tableId, 'demo-restaurant'));
    
    // Add a sample item to the order
    const orderId = `order-${Date.now()}`;
    dispatch(addItem({
      orderId,
      item: {
        menuItemId: 'margherita',
        name: 'Margherita Pizza',
        description: 'Fresh mozzarella, tomato sauce, basil',
        price: 299,
        quantity: 1,
        modifiers: ['Extra Cheese'],
        orderType: 'KOT'
      }
    }));
    
    Alert.alert('Order Created', `New order created for table ${tableId}. This will appear in real-time for all users.`);
  };

  // Demo: Complete an order
  const handleCompleteOrder = (orderId: string) => {
    dispatch(completeOrder({ orderId }));
    Alert.alert('Order Completed', `Order ${orderId} has been completed. This will update in real-time for all users.`);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Firebase Realtime Demo</Text>
        <View style={[styles.statusIndicator, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]}>
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tables ({tables.length})</Text>
        {tables.map((table) => (
          <View key={table.id} style={styles.tableCard}>
            <Text style={styles.tableName}>{table.name}</Text>
            <Text style={styles.tableInfo}>
              Seats: {table.seats} | Status: {table.isReserved ? 'Reserved' : 'Available'}
            </Text>
            {table.isReserved && (
              <Text style={styles.reservationInfo}>
                Reserved by: {table.reservedBy} | Until: {new Date(table.reservedUntil || 0).toLocaleTimeString()}
              </Text>
            )}
            <View style={styles.tableActions}>
              {table.isReserved ? (
                <TouchableOpacity
                  style={[styles.button, styles.unreserveButton]}
                  onPress={() => handleUnreserveTable(table.id)}
                >
                  <Text style={styles.buttonText}>Unreserve</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.button, styles.reserveButton]}
                  onPress={() => handleReserveTable(table.id)}
                >
                  <Text style={styles.buttonText}>Reserve</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.button, styles.orderButton]}
                onPress={() => handleCreateOrder(table.id)}
              >
                <Text style={styles.buttonText}>Create Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ongoing Orders ({ongoingOrderIds.length})</Text>
        {ongoingOrderIds.map((orderId) => {
          const order = orders[orderId];
          if (!order) return null;
          
          return (
            <View key={orderId} style={styles.orderCard}>
              <Text style={styles.orderId}>Order: {orderId}</Text>
              <Text style={styles.orderInfo}>Table: {order.tableId}</Text>
              <Text style={styles.orderInfo}>Items: {order.items.length}</Text>
              <Text style={styles.orderInfo}>Total: ₹{order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</Text>
              <TouchableOpacity
                style={[styles.button, styles.completeButton]}
                onPress={() => handleCompleteOrder(orderId)}
              >
                <Text style={styles.buttonText}>Complete Order</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Completed Orders ({completedOrderIds.length})</Text>
        {completedOrderIds.slice(0, 5).map((orderId) => {
          const order = orders[orderId];
          if (!order) return null;
          
          return (
            <View key={orderId} style={[styles.orderCard, styles.completedOrderCard]}>
              <Text style={styles.orderId}>Order: {orderId}</Text>
              <Text style={styles.orderInfo}>Table: {order.tableId}</Text>
              <Text style={styles.orderInfo}>Items: {order.items.length}</Text>
              <Text style={styles.orderInfo}>Status: Completed</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Real-time Features Demonstrated:</Text>
        <Text style={styles.infoText}>• Table reservations update instantly across all devices</Text>
        <Text style={styles.infoText}>• Orders appear in real-time for all restaurant staff</Text>
        <Text style={styles.infoText}>• Order status changes are synchronized immediately</Text>
        <Text style={styles.infoText}>• All data is stored in Firebase Realtime Database</Text>
        <Text style={styles.infoText}>• Changes persist even when offline and sync when online</Text>
      </View>
    </ScrollView>
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
    padding: 16,
    backgroundColor: '#2196F3',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  tableCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tableName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tableInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  reservationInfo: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 4,
    fontStyle: 'italic',
  },
  tableActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  orderCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  completedOrderCard: {
    backgroundColor: '#f0f0f0',
    opacity: 0.8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  reserveButton: {
    backgroundColor: '#4CAF50',
  },
  unreserveButton: {
    backgroundColor: '#FF9800',
  },
  orderButton: {
    backgroundColor: '#2196F3',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  infoSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 4,
  },
});

export default FirebaseRealtimeDemo;
