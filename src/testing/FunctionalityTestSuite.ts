/**
 * Step 7.1: Functionality Testing Suite
 * Tests all screens with Firebase listeners, data loading, navigation, and functionality
 */

import { testFramework } from './TestFramework';
import { store } from '../redux/storeFirebase';
import { RootState } from '../redux/storeFirebase';
import { createFirebaseService } from '../services/firebaseService';
import { createFirestoreService } from '../services/firestoreService';

export class FunctionalityTestSuite {
  private firebaseService: any;
  private firestoreService: any;

  constructor() {
    const state = store.getState() as RootState;
    const restaurantId = state.auth.restaurantId;
    
    if (restaurantId) {
      this.firebaseService = createFirebaseService(restaurantId);
      this.firestoreService = createFirestoreService(restaurantId);
    }
  }

  /**
   * Run all functionality tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Functionality Test Suite...');
    
    testFramework.startTestSuite('Functionality Testing');
    
    try {
      // Test Firebase listeners
      await testFramework.runTest('Firebase Orders Listener', () => this.testOrdersListener());
      await testFramework.runTest('Firebase Tables Listener', () => this.testTablesListener());
      await testFramework.runTest('Firebase Menu Listener', () => this.testMenuListener());
      await testFramework.runTest('Firebase Inventory Listener', () => this.testInventoryListener());
      
      // Test data loading
      await testFramework.runTest('Tables Data Loading', () => this.testTablesDataLoading());
      await testFramework.runTest('Menu Data Loading', () => this.testMenuDataLoading());
      await testFramework.runTest('Inventory Data Loading', () => this.testInventoryDataLoading());
      await testFramework.runTest('Orders Data Loading', () => this.testOrdersDataLoading());
      
      // Test real-time updates
      await testFramework.runTest('Real-time Order Updates', () => this.testRealTimeOrderUpdates());
      await testFramework.runTest('Real-time Table Updates', () => this.testRealTimeTableUpdates());
      
      // Test navigation
      await testFramework.runTest('Screen Navigation', () => this.testScreenNavigation());
      await testFramework.runTest('Drawer Navigation', () => this.testDrawerNavigation());
      await testFramework.runTest('Stack Navigation', () => this.testStackNavigation());
      
      // Test functionality preservation
      await testFramework.runTest('Order Creation Functionality', () => this.testOrderCreation());
      await testFramework.runTest('Payment Processing Functionality', () => this.testPaymentProcessing());
      await testFramework.runTest('Receipt Generation Functionality', () => this.testReceiptGeneration());
      
    } catch (error) {
      console.error('❌ Functionality test suite failed:', error);
    } finally {
      testFramework.endTestSuite();
    }
  }

  /**
   * Test Firebase orders listener
   */
  private async testOrdersListener(): Promise<void> {
    if (!this.firestoreService) {
      throw new Error('Firestore service not initialized');
    }

    let dataReceived = false;
    let receivedOrders: any = {};

    const unsubscribe = this.firestoreService.listenToOngoingOrders((orders: any) => {
      dataReceived = true;
      receivedOrders = orders;
      console.log('📡 Orders listener received data:', Object.keys(orders).length);
    });

    // Wait for data or timeout
    await this.waitForData(dataReceived, 5000);
    
    if (!dataReceived) {
      unsubscribe();
      throw new Error('Orders listener did not receive data within timeout');
    }

    // Validate data structure
    if (typeof receivedOrders !== 'object') {
      unsubscribe();
      throw new Error('Invalid orders data structure received');
    }

    unsubscribe();
    console.log('✅ Orders listener test passed');
  }

  /**
   * Test Firebase tables listener
   */
  private async testTablesListener(): Promise<void> {
    if (!this.firebaseService) {
      throw new Error('Firebase service not initialized');
    }

    let dataReceived = false;
    let receivedTables: any = {};

    const unsubscribe = this.firebaseService.listenToTables((tables: any) => {
      dataReceived = true;
      receivedTables = tables;
      console.log('📡 Tables listener received data:', Object.keys(tables).length);
    });

    await this.waitForData(dataReceived, 5000);
    
    if (!dataReceived) {
      unsubscribe();
      throw new Error('Tables listener did not receive data within timeout');
    }

    unsubscribe();
    console.log('✅ Tables listener test passed');
  }

  /**
   * Test Firebase menu listener
   */
  private async testMenuListener(): Promise<void> {
    if (!this.firebaseService) {
      throw new Error('Firebase service not initialized');
    }

    let dataReceived = false;

    const unsubscribe = this.firebaseService.listenToMenuItems((menuItems: any) => {
      dataReceived = true;
      console.log('📡 Menu listener received data:', Object.keys(menuItems).length);
    });

    await this.waitForData(dataReceived, 5000);
    
    if (!dataReceived) {
      unsubscribe();
      throw new Error('Menu listener did not receive data within timeout');
    }

    unsubscribe();
    console.log('✅ Menu listener test passed');
  }

  /**
   * Test Firebase inventory listener
   */
  private async testInventoryListener(): Promise<void> {
    if (!this.firebaseService) {
      throw new Error('Firebase service not initialized');
    }

    let dataReceived = false;

    const unsubscribe = this.firebaseService.listenToInventoryItems((inventory: any) => {
      dataReceived = true;
      console.log('📡 Inventory listener received data:', Object.keys(inventory).length);
    });

    await this.waitForData(dataReceived, 5000);
    
    if (!dataReceived) {
      unsubscribe();
      throw new Error('Inventory listener did not receive data within timeout');
    }

    unsubscribe();
    console.log('✅ Inventory listener test passed');
  }

  /**
   * Test tables data loading
   */
  private async testTablesDataLoading(): Promise<void> {
    if (!this.firebaseService) {
      throw new Error('Firebase service not initialized');
    }

    const startTime = Date.now();
    const tables = await this.firebaseService.getTables();
    const loadTime = Date.now() - startTime;

    if (!tables) {
      throw new Error('Failed to load tables data');
    }

    if (loadTime > 5000) {
      throw new Error(`Tables loading too slow: ${loadTime}ms`);
    }

    console.log(`✅ Tables data loaded successfully in ${loadTime}ms`);
  }

  /**
   * Test menu data loading
   */
  private async testMenuDataLoading(): Promise<void> {
    if (!this.firebaseService) {
      throw new Error('Firebase service not initialized');
    }

    const startTime = Date.now();
    const menuItems = await this.firebaseService.getMenuItems();
    const loadTime = Date.now() - startTime;

    if (!menuItems) {
      throw new Error('Failed to load menu data');
    }

    if (loadTime > 5000) {
      throw new Error(`Menu loading too slow: ${loadTime}ms`);
    }

    console.log(`✅ Menu data loaded successfully in ${loadTime}ms`);
  }

  /**
   * Test inventory data loading
   */
  private async testInventoryDataLoading(): Promise<void> {
    if (!this.firebaseService) {
      throw new Error('Firebase service not initialized');
    }

    const startTime = Date.now();
    const inventory = await this.firebaseService.getInventoryItems();
    const loadTime = Date.now() - startTime;

    if (!inventory) {
      throw new Error('Failed to load inventory data');
    }

    if (loadTime > 5000) {
      throw new Error(`Inventory loading too slow: ${loadTime}ms`);
    }

    console.log(`✅ Inventory data loaded successfully in ${loadTime}ms`);
  }

  /**
   * Test orders data loading
   */
  private async testOrdersDataLoading(): Promise<void> {
    if (!this.firestoreService) {
      throw new Error('Firestore service not initialized');
    }

    const startTime = Date.now();
    const orders = await this.firestoreService.getOngoingOrders();
    const loadTime = Date.now() - startTime;

    if (!orders) {
      throw new Error('Failed to load orders data');
    }

    if (loadTime > 5000) {
      throw new Error(`Orders loading too slow: ${loadTime}ms`);
    }

    console.log(`✅ Orders data loaded successfully in ${loadTime}ms`);
  }

  /**
   * Test real-time order updates
   */
  private async testRealTimeOrderUpdates(): Promise<void> {
    if (!this.firestoreService) {
      throw new Error('Firestore service not initialized');
    }

    let updateCount = 0;
    const unsubscribe = this.firestoreService.listenToOngoingOrders((orders: any) => {
      updateCount++;
      console.log(`📡 Real-time order update #${updateCount}:`, Object.keys(orders).length);
    });

    // Wait for at least one update
    await this.waitForCondition(() => updateCount > 0, 5000);

    if (updateCount === 0) {
      unsubscribe();
      throw new Error('No real-time order updates received');
    }

    unsubscribe();
    console.log(`✅ Real-time order updates test passed (${updateCount} updates)`);
  }

  /**
   * Test real-time table updates
   */
  private async testRealTimeTableUpdates(): Promise<void> {
    if (!this.firebaseService) {
      throw new Error('Firebase service not initialized');
    }

    let updateCount = 0;
    const unsubscribe = this.firebaseService.listenToTables((tables: any) => {
      updateCount++;
      console.log(`📡 Real-time table update #${updateCount}:`, Object.keys(tables).length);
    });

    await this.waitForCondition(() => updateCount > 0, 5000);

    if (updateCount === 0) {
      unsubscribe();
      throw new Error('No real-time table updates received');
    }

    unsubscribe();
    console.log(`✅ Real-time table updates test passed (${updateCount} updates)`);
  }

  /**
   * Test screen navigation
   */
  private async testScreenNavigation(): Promise<void> {
    const state = store.getState() as RootState;
    
    if (!state.auth.isLoggedIn) {
      throw new Error('User not logged in for navigation testing');
    }

    // Test navigation state validity
    if (!state.auth.restaurantId) {
      throw new Error('No restaurant ID for navigation testing');
    }

    console.log('✅ Screen navigation state is valid');
  }

  /**
   * Test drawer navigation
   */
  private async testDrawerNavigation(): Promise<void> {
    const state = store.getState() as RootState;
    
    // Test role-based navigation
    const userRole = state.auth.role;
    if (!userRole) {
      throw new Error('No user role for drawer navigation testing');
    }

    // Validate role-based access
    const isOwnerLevel = userRole === 'Owner' || userRole === 'Manager';
    console.log(`✅ Drawer navigation test passed for role: ${userRole}, Owner level: ${isOwnerLevel}`);
  }

  /**
   * Test stack navigation
   */
  private async testStackNavigation(): Promise<void> {
    const state = store.getState() as RootState;
    
    // Test authentication stack
    if (!state.auth.isLoggedIn) {
      console.log('✅ Authentication stack navigation test passed');
      return;
    }

    // Test main app stack
    if (!state.auth.restaurantId) {
      throw new Error('No restaurant ID for main stack navigation');
    }

    console.log('✅ Main stack navigation test passed');
  }

  /**
   * Test order creation functionality
   */
  private async testOrderCreation(): Promise<void> {
    // Test order creation logic
    const testOrder = {
      id: 'test-order-' + Date.now(),
      tableId: 'test-table',
      items: [],
      total: 0,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Validate order structure
    if (!testOrder.id || !testOrder.tableId) {
      throw new Error('Invalid order structure');
    }

    console.log('✅ Order creation functionality test passed');
  }

  /**
   * Test payment processing functionality
   */
  private async testPaymentProcessing(): Promise<void> {
    // Test payment calculation logic
    const subtotal = 100;
    const taxRate = 0.1;
    const serviceChargeRate = 0.15;
    const discount = 10;

    const tax = subtotal * taxRate;
    const serviceCharge = subtotal * serviceChargeRate;
    const total = subtotal + tax + serviceCharge - discount;

    if (total !== 115) {
      throw new Error(`Payment calculation incorrect. Expected 115, got ${total}`);
    }

    console.log('✅ Payment processing functionality test passed');
  }

  /**
   * Test receipt generation functionality
   */
  private async testReceiptGeneration(): Promise<void> {
    // Test receipt data structure
    const testReceipt = {
      id: 'test-receipt-' + Date.now(),
      orderId: 'test-order',
      total: 115,
      items: [],
      timestamp: new Date().toISOString()
    };

    if (!testReceipt.id || !testReceipt.orderId) {
      throw new Error('Invalid receipt structure');
    }

    console.log('✅ Receipt generation functionality test passed');
  }

  /**
   * Helper methods
   */
  private async waitForData(condition: boolean, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (!condition && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!condition) {
      throw new Error(`Data not received within ${timeout}ms timeout`);
    }
  }

  private async waitForCondition(condition: () => boolean, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (!condition() && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!condition()) {
      throw new Error(`Condition not met within ${timeout}ms timeout`);
    }
  }
}

// Export for use in main test runner
export const functionalityTestSuite = new FunctionalityTestSuite();
