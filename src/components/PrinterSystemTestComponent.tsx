import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { printerSystemValidator } from '../utils/printerSystemValidator';
import { printerDiscovery } from '../services/printerDiscovery';
import { printerRegistry } from '../services/printerRegistry';
import { printManager } from '../services/printManager';

interface ValidationResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

const PrinterSystemTestComponent: React.FC = () => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<{
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    successRate: number;
  } | null>(null);

  const runValidation = async () => {
    try {
      setIsRunning(true);
      setValidationResults([]);
      
      const results = await printerSystemValidator.validateAll();
      setValidationResults(results);
      
      const summaryResult = printerSystemValidator.getSummary();
      setSummary(summaryResult);
      
      if (summaryResult.failed === 0) {
        Alert.alert('Validation Complete', 'All tests passed! ✅');
      } else {
        Alert.alert('Validation Complete', `${summaryResult.passed} passed, ${summaryResult.failed} failed, ${summaryResult.warnings} warnings`);
      }
    } catch (error) {
      Alert.alert('Validation Error', `Failed to run validation: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testPrinterWorkflow = async () => {
    try {
      Alert.alert('Testing Workflow', 'This will test the complete printer workflow...');
      
      // Test 1: Start discovery
      await printerDiscovery.startDiscovery();
      
      // Test 2: Get printers
      const printers = printerDiscovery.getDiscoveredPrinters();
      
      if (printers.length > 0) {
        const printer = printers[0];
        
        // Test 3: Assign printer to role
        await printerRegistry.setPrinterMapping('Receipt', printer, true);
        
        // Test 4: Test print
        const sampleData = {
          restaurantName: 'Test Restaurant',
          receiptId: 'TEST-001',
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          table: 'Test Table',
          items: [{ name: 'Test Item', quantity: 1, price: 10.00 }],
          taxLabel: 'Tax',
          serviceLabel: 'Service',
          subtotal: 10.00,
          tax: 1.00,
          service: 1.00,
          total: 12.00,
        };
        
        const jobId = await printManager.printRole('Receipt', sampleData, 'high');
        Alert.alert('Workflow Test', `Print job created: ${jobId}`);
      } else {
        Alert.alert('Workflow Test', 'No printers discovered. Please ensure Bluetooth is enabled and printers are available.');
      }
    } catch (error) {
      Alert.alert('Workflow Test Failed', `Error: ${error}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'warning': return '⚠️';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return '#4CAF50';
      case 'fail': return '#F44336';
      case 'warning': return '#FF9800';
      default: return '#666';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Printer System Test</Text>
      
      {/* Summary */}
      {summary && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Validation Summary</Text>
          <Text style={styles.summaryText}>
            {summary.passed}/{summary.total} passed ({summary.successRate.toFixed(1)}%)
          </Text>
          <Text style={styles.summaryText}>
            {summary.failed} failed, {summary.warnings} warnings
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runValidation}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? 'Running Tests...' : 'Run Validation'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={testPrinterWorkflow}
        >
          <Text style={styles.buttonText}>Test Printer Workflow</Text>
        </TouchableOpacity>
      </View>

      {/* Validation Results */}
      {validationResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Validation Results</Text>
          {validationResults.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultIcon}>{getStatusIcon(result.status)}</Text>
                <Text style={styles.resultComponent}>{result.component}</Text>
                <Text style={[styles.resultStatus, { color: getStatusColor(result.status) }]}>
                  {result.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.resultMessage}>{result.message}</Text>
              {result.details && (
                <Text style={styles.resultDetails}>
                  {JSON.stringify(result.details, null, 2)}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Quick Status Check */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>Quick Status Check</Text>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Bluetooth Support:</Text>
          <Text style={styles.statusValue}>
            {printerDiscovery.getDiscoveryStatus().isEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Discovered Printers:</Text>
          <Text style={styles.statusValue}>
            {printerDiscovery.getDiscoveredPrinters().length}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Print Manager Status:</Text>
          <Text style={styles.statusValue}>
            {printManager.getStatus().isInitialized ? 'Initialized' : 'Not Initialized'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Registry Mappings:</Text>
          <Text style={styles.statusValue}>
            {printerRegistry.getState().mappings.size}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  summaryText: {
    fontSize: 16,
    marginBottom: 4,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultsContainer: {
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  resultItem: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  resultComponent: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    color: '#333',
  },
  resultStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  resultDetails: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});

export default PrinterSystemTestComponent;




