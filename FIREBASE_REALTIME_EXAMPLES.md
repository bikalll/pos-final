# Firebase Realtime Updates - Sample Code

## Table Booking Real-time Updates

### 1. Reserve a Table (Updates All Users Instantly)

```typescript
import { useDispatch } from 'react-redux';
import { reserveTable } from '../redux/slices/tablesSliceFirebase';

const TableReservationComponent = () => {
  const dispatch = useDispatch();

  const handleReserveTable = (tableId: string) => {
    // This action will update Firebase and trigger real-time updates
    dispatch(reserveTable({
      id: tableId,
      reservedBy: 'John Doe',
      reservedUntil: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
      reservedNote: 'VIP customer - window seat preferred'
    }));
    
    // All connected users will see this table as reserved immediately
  };

  return (
    <TouchableOpacity onPress={() => handleReserveTable('table_1')}>
      <Text>Reserve Table 1</Text>
    </TouchableOpacity>
  );
};
```

### 2. Listen to Table Updates (Real-time UI Updates)

```typescript
import { useSelector } from 'react-redux';
import { selectActiveTables } from '../redux/slices/tablesSliceFirebase';

const TablesDashboard = () => {
  const tables = useSelector(selectActiveTables);

  return (
    <View>
      {tables.map(table => (
        <View key={table.id} style={[
          styles.tableCard,
          table.isReserved && styles.reservedTable
        ]}>
          <Text>{table.name}</Text>
          <Text>Seats: {table.seats}</Text>
          {table.isReserved && (
            <Text>Reserved by: {table.reservedBy}</Text>
          )}
        </View>
      ))}
    </View>
  );
};
```

## Order Management Real-time Updates

### 1. Create Order (Appears Instantly for All Staff)

```typescript
import { useDispatch } from 'react-redux';
import { createOrder, addItem } from '../redux/slices/ordersSliceFirebase';

const OrderCreationComponent = () => {
  const dispatch = useDispatch();

  const handleCreateOrder = (tableId: string) => {
    // Create order - appears in real-time for all staff
    dispatch(createOrder(tableId));
    
    // Add items to order
    dispatch(addItem({
      orderId: 'order_123',
      item: {
        menuItemId: 'margherita',
        name: 'Margherita Pizza',
        price: 299,
        quantity: 2,
        modifiers: ['Extra Cheese'],
        orderType: 'KOT'
      }
    }));
    
    // All kitchen staff will see this order immediately
  };

  return (
    <TouchableOpacity onPress={() => handleCreateOrder('table_1')}>
      <Text>Create Order for Table 1</Text>
    </TouchableOpacity>
  );
};
```

### 2. Order Status Updates (Real-time Kitchen Display)

```typescript
import { useSelector } from 'react-redux';

const KitchenDisplay = () => {
  const ongoingOrders = useSelector(state => state.orders.ongoingOrderIds);
  const orders = useSelector(state => state.orders.ordersById);

  return (
    <View>
      <Text>Kitchen Orders ({ongoingOrders.length})</Text>
      {ongoingOrders.map(orderId => {
        const order = orders[orderId];
        return (
          <View key={orderId} style={styles.orderCard}>
            <Text>Table: {order.tableId}</Text>
            <Text>Order ID: {orderId}</Text>
            {order.items.map((item, index) => (
              <Text key={index}>
                {item.quantity}x {item.name} - {item.orderType}
              </Text>
            ))}
            <Text>Total: ₹{order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</Text>
          </View>
        );
      })}
    </View>
  );
};
```

## Menu Item Availability (Real-time Updates)

### 1. Toggle Item Availability

```typescript
import { useDispatch } from 'react-redux';
import { toggleAvailability } from '../redux/slices/menuSliceFirebase';

const MenuManagement = () => {
  const dispatch = useDispatch();
  const menuItems = useSelector(state => state.menu.itemsById);

  const handleToggleAvailability = (menuItemId: string) => {
    // This will update availability in real-time
    dispatch(toggleAvailability(menuItemId));
    
    // All POS terminals will show updated availability
  };

  return (
    <View>
      {Object.values(menuItems).map(item => (
        <View key={item.id} style={[
          styles.menuItem,
          !item.isAvailable && styles.unavailableItem
        ]}>
          <Text>{item.name}</Text>
          <Text>₹{item.price}</Text>
          <TouchableOpacity onPress={() => handleToggleAvailability(item.id)}>
            <Text>{item.isAvailable ? 'Available' : 'Unavailable'}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};
```

## Inventory Updates (Real-time Stock Management)

### 1. Update Stock Levels

```typescript
import { useDispatch } from 'react-redux';
import { adjustStock } from '../redux/slices/inventorySliceFirebase';

const InventoryManagement = () => {
  const dispatch = useDispatch();
  const inventoryItems = useSelector(state => state.inventory.itemsById);

  const handleStockAdjustment = (itemId: string, delta: number) => {
    // Update stock - all users see changes immediately
    dispatch(adjustStock({ id: itemId, delta }));
    
    // Kitchen staff can see real-time stock levels
  };

  return (
    <View>
      {Object.values(inventoryItems).map(item => (
        <View key={item.id} style={styles.inventoryItem}>
          <Text>{item.name}</Text>
          <Text>Stock: {item.stockQuantity}</Text>
          <TouchableOpacity onPress={() => handleStockAdjustment(item.id, -1)}>
            <Text>-1</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleStockAdjustment(item.id, 1)}>
            <Text>+1</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};
```

## Customer Management (Real-time Updates)

### 1. Add/Update Customer

```typescript
import { useDispatch } from 'react-redux';
import { addOrUpdateCustomer } from '../redux/slices/customersSliceFirebase';

const CustomerManagement = () => {
  const dispatch = useDispatch();

  const handleAddCustomer = (customerData) => {
    // Add customer - available to all staff immediately
    dispatch(addOrUpdateCustomer({
      id: `customer_${Date.now()}`,
      name: customerData.name,
      phone: customerData.phone,
      email: customerData.email,
      loyaltyPoints: 0,
      visitCount: 1,
      createdAt: Date.now()
    }));
    
    // All staff can now see this customer in their system
  };

  return (
    <View>
      <TextInput placeholder="Customer Name" />
      <TextInput placeholder="Phone Number" />
      <TouchableOpacity onPress={handleAddCustomer}>
        <Text>Add Customer</Text>
      </TouchableOpacity>
    </View>
  );
};
```

## Staff Attendance (Real-time Tracking)

### 1. Clock In/Out

```typescript
import { useDispatch } from 'react-redux';
import { clockIn, clockOut } from '../redux/slices/staffSliceFirebase';

const AttendanceComponent = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.auth);

  const handleClockIn = () => {
    // Clock in - visible to managers in real-time
    dispatch(clockIn(
      currentUser.userId,
      latitude,
      longitude,
      photoUri
    ));
    
    // Manager dashboard shows staff status immediately
  };

  const handleClockOut = () => {
    // Clock out - updates in real-time
    dispatch(clockOut(
      currentUser.userId,
      latitude,
      longitude,
      photoUri
    ));
  };

  return (
    <View>
      <TouchableOpacity onPress={handleClockIn}>
        <Text>Clock In</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleClockOut}>
        <Text>Clock Out</Text>
      </TouchableOpacity>
    </View>
  );
};
```

## Real-time Dashboard (Manager View)

### 1. Live Restaurant Status

```typescript
const ManagerDashboard = () => {
  const tables = useSelector(selectActiveTables);
  const ongoingOrders = useSelector(state => state.orders.ongoingOrderIds);
  const staff = useSelector(state => state.staff.staffById);
  const attendance = useSelector(state => state.staff.attendanceById);

  const getStaffStatus = (staffId) => {
    const lastAttendance = Object.values(attendance)
      .filter(record => record.staffId === staffId)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    return lastAttendance?.type === 'in' ? 'On Duty' : 'Off Duty';
  };

  return (
    <View>
      <Text>Restaurant Status</Text>
      
      <Text>Tables: {tables.length} total, {tables.filter(t => t.isReserved).length} reserved</Text>
      <Text>Orders: {ongoingOrders.length} ongoing</Text>
      
      <Text>Staff Status:</Text>
      {Object.values(staff).map(member => (
        <Text key={member.id}>
          {member.name}: {getStaffStatus(member.id)}
        </Text>
      ))}
    </View>
  );
};
```

## Key Benefits of Real-time Updates

1. **Instant Synchronization**: All changes appear immediately across all devices
2. **No Manual Refresh**: UI updates automatically when data changes
3. **Multi-user Support**: Multiple staff can work simultaneously
4. **Conflict Resolution**: Firebase handles concurrent updates gracefully
5. **Offline Support**: Changes sync when connection is restored
6. **Scalable**: Works with any number of restaurants and users

## Testing Real-time Features

1. **Open Multiple Devices**: Test with 2+ devices/emulators
2. **Make Changes**: Create orders, reserve tables on one device
3. **Verify Updates**: Check that changes appear on other devices
4. **Test Offline**: Disconnect internet, make changes, reconnect
5. **Verify Sync**: Ensure offline changes sync when online

This real-time functionality ensures all restaurant staff stay synchronized and can work efficiently together.
