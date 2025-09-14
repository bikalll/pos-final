import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { blePrinter } from '../services/blePrinter';
import { PrintService } from '../services/printing';

const PrintDebugComponent: React.FC = () => {
  const [isTesting, setIsTesting] = useState(false);

  const testBluetoothStatus = async () => {
    setIsTesting(true);
    try {
      console.log('🔍 Testing Bluetooth status...');
      
      // Test basic support
      const isSupported = blePrinter.isSupported();
      console.log('✅ Bluetooth supported:', isSupported);
      
      // Test module status
      const moduleStatus = blePrinter.getModuleStatus();
      console.log('📦 Module status:', moduleStatus);
      
      // Test if enabled
      const isEnabled = await blePrinter.isEnabled();
      console.log('🔵 Bluetooth enabled:', isEnabled);
      
      // Test connection status
      const connectionStatus = await PrintService.checkPrinterConnection();
      console.log('🔗 Connection status:', connectionStatus);
      
      Alert.alert(
        'Bluetooth Status',
        `Supported: ${isSupported}\nEnabled: ${isEnabled}\nConnected: ${connectionStatus.connected}\n\nDetails: ${connectionStatus.message}`
      );
    } catch (error: any) {
      console.error('❌ Bluetooth test failed:', error);
      Alert.alert('Test Failed', error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const testKOTPrint = async () => {
    setIsTesting(true);
    try {
      console.log('🖨️ Testing KOT print...');
      
      const testData = {
        restaurantName: 'ARBI POS',
        ticketId: `TEST-KOT-${Date.now()}`,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        table: 'Test Table',
        items: [
          { name: 'Test Item 1', quantity: 2, price: 10.50, orderType: 'KOT' },
          { name: 'Test Item 2', quantity: 1, price: 15.00, orderType: 'KOT' }
        ],
        estimatedTime: '20-30 minutes',
        specialInstructions: 'Test print'
      };

      await blePrinter.printKOT(testData);
      Alert.alert('Success', 'KOT test print completed!');
    } catch (error: any) {
      console.error('❌ KOT test failed:', error);
      Alert.alert('KOT Test Failed', error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const testReceiptPrint = async () => {
    setIsTesting(true);
    try {
      console.log('🖨️ Testing Receipt print...');
      
      const testData = {
        restaurantName: 'ARBI POS',
        receiptId: `TEST-R-${Date.now()}`,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        table: 'Test Table',
        items: [
          { name: 'Test Item 1', quantity: 2, price: 10.50 },
          { name: 'Test Item 2', quantity: 1, price: 15.00 }
        ],
        taxLabel: 'Tax (5%)',
        serviceLabel: 'Service (10%)',
        subtotal: 36.00,
        tax: 1.80,
        service: 3.60,
        discount: 0,
        total: 41.40,
        payment: {
          method: 'Cash',
          amountPaid: 50.00,
          change: 8.60
        }
      };

      await blePrinter.printReceipt(testData);
      Alert.alert('Success', 'Receipt test print completed!');
    } catch (error: any) {
      console.error('❌ Receipt test failed:', error);
      Alert.alert('Receipt Test Failed', error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const testPrintService = async () => {
    setIsTesting(true);
    try {
      console.log('🖨️ Testing PrintService...');
      
      const testOrder = {
        id: 'test-order',
        createdAt: new Date().toISOString(),
        tableId: 'test-table',
        items: [
          { name: 'Test Item 1', quantity: 2, price: 10.50 },
          { name: 'Test Item 2', quantity: 1, price: 15.00 }
        ],
        taxPercentage: 5,
        serviceChargePercentage: 10,
        discountPercentage: 0,
        payment: {
          method: 'Cash',
          amountPaid: 50.00
        }
      };

      const testTable = { name: 'Test Table' };

      const result = await PrintService.printReceiptFromOrder(testOrder, testTable);
      
      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Failed', result.message);
      }
    } catch (error: any) {
      console.error('❌ PrintService test failed:', error);
      Alert.alert('PrintService Test Failed', error.message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Print Debug Component</Text>
      <Text style={styles.subtitle}>Test Bluetooth printing functionality</Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={testBluetoothStatus}
        disabled={isTesting}
      >
        <Text style={styles.buttonText}>
          {isTesting ? 'Testing...' : 'Test Bluetooth Status'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={testKOTPrint}
        disabled={isTesting}
      >
        <Text style={styles.buttonText}>
          {isTesting ? 'Testing...' : 'Test KOT Print'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={testReceiptPrint}
        disabled={isTesting}
      >
        <Text style={styles.buttonText}>
          {isTesting ? 'Testing...' : 'Test Receipt Print'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={testPrintService}
        disabled={isTesting}
      >
        <Text style={styles.buttonText}>
          {isTesting ? 'Testing...' : 'Test PrintService'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default PrintDebugComponent;


