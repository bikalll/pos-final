import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { createFirestoreService } from '../services/firestoreService';

const FirebaseDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const addDebugInfo = (message: string) => {
    setDebugInfo(prev => prev + `\n${new Date().toLocaleTimeString()}: ${message}`);
  };

  const testFirebaseConnection = async () => {
    setIsLoading(true);
    setDebugInfo('Starting Firebase connection test...\n');
    
    try {
      addDebugInfo('Creating FirestoreService with restaurant ID: default_restaurant');
      const service = createFirestoreService('default_restaurant');
      
      addDebugInfo('Testing categories loading...');
      const categories = await service.getCategories();
      addDebugInfo(`Categories loaded: ${Object.keys(categories).length} items`);
      
      if (Object.keys(categories).length > 0) {
        Object.values(categories).forEach((cat: any) => {
          addDebugInfo(`  • ${cat.name}: ${cat.description}`);
        });
      } else {
        addDebugInfo('❌ No categories found');
      }
      
      addDebugInfo('\nTesting menu items loading...');
      const menuItems = await service.getMenuItems();
      addDebugInfo(`Menu items loaded: ${Object.keys(menuItems).length} items`);
      
      if (Object.keys(menuItems).length > 0) {
        Object.values(menuItems).forEach((item: any) => {
          addDebugInfo(`  • ${item.name} (${item.category})`);
          if (item.ingredients && item.ingredients.length > 0) {
            addDebugInfo(`    Ingredients: ${item.ingredients.length} items`);
          } else {
            addDebugInfo(`    Ingredients: None`);
          }
        });
      } else {
        addDebugInfo('❌ No menu items found');
      }
      
      addDebugInfo('\n✅ Firebase connection test completed successfully!');
      
    } catch (error) {
      addDebugInfo(`❌ Error: ${error.message}`);
      console.error('Firebase debug error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearDebugInfo = () => {
    setDebugInfo('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Debugger</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={testFirebaseConnection}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Test Firebase Connection'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearDebugInfo}
        >
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.debugContainer}>
        <Text style={styles.debugText}>
          {debugInfo || 'Click "Test Firebase Connection" to see debug info...'}
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#007AFF',
  },
  clearButton: {
    backgroundColor: '#ff3b30',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  debugContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  debugText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#333',
    lineHeight: 20,
  },
});

export default FirebaseDebugger;




