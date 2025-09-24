import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { printerDiscovery } from '../services/printerDiscovery';
import { printerRegistry } from '../services/printerRegistry';
import { printManager } from '../services/printManager';

/**
 * Example component showing how to integrate the new printer system
 * This demonstrates the key features and usage patterns
 */
const PrinterIntegrationExample: React.FC = () => {
  const [printers, setPrinters] = useState(printerDiscovery.getDiscoveredPrinters());
  const [registryState, setRegistryState] = useState(printerRegistry.getState());
  const [printManagerStatus, setPrintManagerStatus] = useState(printManager.getStatus());

  useEffect(() => {
    // Initialize the print manager
    printManager.initialize();

    // Set up listeners
    const unsubscribeDiscovery = printerDiscovery.addDiscoveryListener((discoveredPrinters) => {
      setPrinters(discoveredPrinters);
    });

    const unsubscribeRegistry = printerRegistry.addListener((state) => {
      setRegistryState(state);
    });

    const unsubscribePrintManager = printManager.addEventListener((event) => {
      setPrintManagerStatus(printManager.getStatus());
      console.log('Print Event:', event);
    });

    return () => {
      unsubscribeDiscovery();
      unsubscribeRegistry();
      unsubscribePrintManager();
    };
  }, []);

  // Example: Start printer discovery
  const startDiscovery = async () => {
    try {
      await printerDiscovery.startDiscovery();
      Alert.alert('Success', 'Printer discovery started');
    } catch (error) {
      Alert.alert('Error', `Discovery failed: ${error}`);
    }
  };

  // Example: Assign printer to role
  const assignPrinterToRole = async (printerId: string, role: 'BOT' | 'KOT' | 'Receipt') => {
    try {
      const printer = printerDiscovery.getPrinter(printerId);
      if (!printer) {
        Alert.alert('Error', 'Printer not found');
        return;
      }

      await printerRegistry.setPrinterMapping(role, printer, true);
      Alert.alert('Success', `Printer assigned to ${role}`);
    } catch (error) {
      Alert.alert('Error', `Assignment failed: ${error}`);
    }
  };

  // Example: Print a sample receipt
  const printSampleReceipt = async () => {
    try {
      const sampleReceiptData = {
        restaurantName: 'Sample Restaurant',
        receiptId: `REC-${Date.now()}`,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        table: 'Sample Table',
        items: [
          { name: 'Sample Item 1', quantity: 2, price: 10.00 },
          { name: 'Sample Item 2', quantity: 1, price: 15.00 },
        ],
        taxLabel: 'Tax',
        serviceLabel: 'Service',
        subtotal: 35.00,
        tax: 3.50,
        service: 3.50,
        total: 42.00,
        payment: { method: 'Cash', amountPaid: 50.00, change: 8.00 },
      };

      const jobId = await printManager.printRole('Receipt', sampleReceiptData, 'high');
      Alert.alert('Success', `Receipt print job created: ${jobId}`);
    } catch (error) {
      Alert.alert('Error', `Print failed: ${error}`);
    }
  };

  // Example: Print for an order (multiple roles)
  const printOrderTickets = async () => {
    try {
      const orderData = {
        restaurantName: 'Sample Restaurant',
        ticketId: `ORD-${Date.now()}`,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        table: 'Sample Table',
        items: [
          { name: 'Kitchen Item 1', quantity: 1, price: 20.00, orderType: 'KOT' },
          { name: 'Bar Item 1', quantity: 2, price: 15.00, orderType: 'BOT' },
        ],
        estimatedTime: '15-20 minutes',
      };

      const jobIds = await printManager.printForOrder([
        { role: 'KOT', payload: orderData, priority: 'high' },
        { role: 'BOT', payload: orderData, priority: 'high' },
      ]);

      Alert.alert('Success', `Order print jobs created: ${jobIds.length} jobs`);
    } catch (error) {
      Alert.alert('Error', `Order print failed: ${error}`);
    }
  };

  // Example: Test printer connection
  const testPrinter = async (printerId: string) => {
    try {
      const result = await printManager.testPrinter(printerId);
      Alert.alert('Printer Test', result.message);
    } catch (error) {
      Alert.alert('Test Failed', String(error));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Printer System Integration Example</Text>
      
      {/* Discovery Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Discovery Status</Text>
        <Text>Discovered Printers: {printers.length}</Text>
        <Text>Connected Printers: {printers.filter(p => p.connected).length}</Text>
        <TouchableOpacity style={styles.button} onPress={startDiscovery}>
          <Text style={styles.buttonText}>Start Discovery</Text>
        </TouchableOpacity>
      </View>

      {/* Printer Registry Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Printer Assignments</Text>
        <Text>BOT: {registryState.mappings.get('BOT')?.printerName || 'Not assigned'}</Text>
        <Text>KOT: {registryState.mappings.get('KOT')?.printerName || 'Not assigned'}</Text>
        <Text>Receipt: {registryState.mappings.get('Receipt')?.printerName || 'Not assigned'}</Text>
      </View>

      {/* Print Manager Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Print Manager</Text>
        <Text>Total Jobs: {printManagerStatus.totalJobs}</Text>
        <Text>Pending: {printManagerStatus.pendingJobs}</Text>
        <Text>Completed: {printManagerStatus.completedJobs}</Text>
        <Text>Failed: {printManagerStatus.failedJobs}</Text>
      </View>

      {/* Discovered Printers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Discovered Printers</Text>
        {printers.map((printer) => (
          <View key={printer.id} style={styles.printerItem}>
            <Text style={styles.printerName}>
              {printer.friendlyName || printer.name}
            </Text>
            <Text style={styles.printerStatus}>
              {printer.connected ? 'Connected' : printer.status}
            </Text>
            <View style={styles.printerActions}>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => testPrinter(printer.id)}
              >
                <Text style={styles.smallButtonText}>Test</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => assignPrinterToRole(printer.id, 'BOT')}
              >
                <Text style={styles.smallButtonText}>Assign BOT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => assignPrinterToRole(printer.id, 'KOT')}
              >
                <Text style={styles.smallButtonText}>Assign KOT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => assignPrinterToRole(printer.id, 'Receipt')}
              >
                <Text style={styles.smallButtonText}>Assign Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Print Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Print Actions</Text>
        <TouchableOpacity style={styles.button} onPress={printSampleReceipt}>
          <Text style={styles.buttonText}>Print Sample Receipt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={printOrderTickets}>
          <Text style={styles.buttonText}>Print Order Tickets</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  printerItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  printerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  printerStatus: {
    fontSize: 12,
    color: '#666',
    marginVertical: 4,
  },
  printerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  smallButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default PrinterIntegrationExample;


