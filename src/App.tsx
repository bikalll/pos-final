import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider } from 'react-redux';
import { store } from './redux/storeFirebase';
import { createOptimizedMiddleware } from './redux/middleware/optimizedMiddleware';
import { applyMiddleware } from '@reduxjs/toolkit';

// Import optimized screens
import OptimizedMenuScreen from './screens/OptimizedMenuScreen';
import OptimizedTablesDashboardScreen from './screens/OptimizedTablesDashboardScreen';
import PerformanceMonitor from './components/PerformanceMonitor';

// Create optimized store with middleware
const optimizedStore = store;

const Stack = createStackNavigator();

const App: React.FC = () => {
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  
  return (
    <Provider store={optimizedStore}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Menu">
          <Stack.Screen 
            name="Menu" 
            component={OptimizedMenuScreen}
            options={{
              title: 'Menu',
              headerRight: () => (
                <TouchableOpacity
                  onPress={() => setShowPerformanceMonitor(true)}
                  style={{ marginRight: 16 }}
                >
                  <Text>📊</Text>
                </TouchableOpacity>
              )
            }}
          />
          <Stack.Screen 
            name="Tables" 
            component={OptimizedTablesDashboardScreen}
            options={{ title: 'Tables Dashboard' }}
          />
        </Stack.Navigator>
        
        <PerformanceMonitor
          visible={showPerformanceMonitor}
          onClose={() => setShowPerformanceMonitor(false)}
        />
      </NavigationContainer>
    </Provider>
  );
};

export default App;
