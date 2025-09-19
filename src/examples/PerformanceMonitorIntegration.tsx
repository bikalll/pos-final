import React from 'react';
import { View, StyleSheet } from 'react-native';
import PerformanceMonitor from '../components/PerformanceMonitor';

/**
 * Example of how to integrate PerformanceMonitor into key screens
 * 
 * Add this component to your main screens to monitor performance:
 * - OrdersScreen
 * - InventoryScreen  
 * - TablesScreen
 * - MenuScreen
 * - CustomersScreen
 */

// Example integration for OrdersScreen
export const OrdersScreenWithMonitoring: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Your existing OrdersScreen content */}
      <View style={styles.content}>
        {/* Orders screen content goes here */}
      </View>
      
      {/* Add performance monitoring */}
      <PerformanceMonitor
        componentName="OrdersScreen"
        showInProduction={false} // Only show in development
        position="top-right"
      />
    </View>
  );
};

// Example integration for InventoryScreen
export const InventoryScreenWithMonitoring: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Your existing InventoryScreen content */}
      <View style={styles.content}>
        {/* Inventory screen content goes here */}
      </View>
      
      {/* Add performance monitoring */}
      <PerformanceMonitor
        componentName="InventoryScreen"
        showInProduction={false}
        position="top-left"
      />
    </View>
  );
};

// Example integration for TablesScreen
export const TablesScreenWithMonitoring: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Your existing TablesScreen content */}
      <View style={styles.content}>
        {/* Tables screen content goes here */}
      </View>
      
      {/* Add performance monitoring */}
      <PerformanceMonitor
        componentName="TablesScreen"
        showInProduction={false}
        position="bottom-right"
      />
    </View>
  );
};

// Example integration for MenuScreen
export const MenuScreenWithMonitoring: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Your existing MenuScreen content */}
      <View style={styles.content}>
        {/* Menu screen content goes here */}
      </View>
      
      {/* Add performance monitoring */}
      <PerformanceMonitor
        componentName="MenuScreen"
        showInProduction={false}
        position="bottom-left"
      />
    </View>
  );
};

// Example integration for CustomersScreen
export const CustomersScreenWithMonitoring: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Your existing CustomersScreen content */}
      <View style={styles.content}>
        {/* Customers screen content goes here */}
      </View>
      
      {/* Add performance monitoring */}
      <PerformanceMonitor
        componentName="CustomersScreen"
        showInProduction={false}
        position="top-right"
      />
    </View>
  );
};

// Example of using the performance monitor hook directly
export const CustomPerformanceComponent: React.FC = () => {
  const { metrics, alerts, measurePerformance, getStats } = usePerformanceMonitor('CustomComponent');

  const handleExpensiveOperation = async () => {
    // Measure performance of expensive operations
    await measurePerformance(async () => {
      // Your expensive operation here
      await new Promise(resolve => setTimeout(resolve, 1000));
      return 'Operation completed';
    }, 'ExpensiveOperation');
  };

  return (
    <View style={styles.container}>
      {/* Your component content */}
      
      {/* Display metrics inline */}
      {metrics && (
        <View style={styles.metricsDisplay}>
          <Text>Render Time: {metrics.renderTime.toFixed(2)}ms</Text>
          <Text>Listeners: {metrics.listenerCount}</Text>
          <Text>Memory: {metrics.memoryUsage.toFixed(2)}MB</Text>
        </View>
      )}
      
      {/* Display alerts */}
      {alerts.length > 0 && (
        <View style={styles.alertsDisplay}>
          {alerts.map((alert, index) => (
            <Text key={index} style={styles.alertText}>
              {alert.type}: {alert.message}
            </Text>
          ))}
        </View>
      )}
      
      {/* Performance monitor overlay */}
      <PerformanceMonitor
        componentName="CustomComponent"
        showInProduction={false}
        position="top-right"
      />
    </View>
  );
};

// Example of app initialization with optimization services
export const AppWithOptimization: React.FC = () => {
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize optimization services
        const { initializeOptimizationServices } = await import('../services/OptimizationInitializer');
        await initializeOptimizationServices({
          backgroundProcessing: { enabled: true },
          debouncing: { enabled: true },
          deduplication: { enabled: true },
          firebaseOptimization: { enabled: true },
          errorHandling: { enabled: true },
          periodicCleanup: { enabled: true },
          performanceMonitoring: { enabled: true },
        });
        
        setInitialized(true);
        console.log('✅ App: Optimization services initialized');
      } catch (error) {
        console.error('❌ App: Failed to initialize optimization services:', error);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      const { getOptimizationInitializer } = require('../services/OptimizationInitializer');
      const initializer = getOptimizationInitializer();
      if (initializer.isInitialized()) {
        initializer.shutdown();
      }
    };
  }, []);

  if (!initialized) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Initializing optimization services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Your app content */}
      
      {/* Global performance monitor */}
      <PerformanceMonitor
        componentName="App"
        showInProduction={false}
        position="top-right"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsDisplay: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    margin: 10,
    borderRadius: 5,
  },
  alertsDisplay: {
    backgroundColor: '#fff3cd',
    padding: 10,
    margin: 10,
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  alertText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 5,
  },
});

// Import the hook
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

export default {
  OrdersScreenWithMonitoring,
  InventoryScreenWithMonitoring,
  TablesScreenWithMonitoring,
  MenuScreenWithMonitoring,
  CustomersScreenWithMonitoring,
  CustomPerformanceComponent,
  AppWithOptimization,
};
