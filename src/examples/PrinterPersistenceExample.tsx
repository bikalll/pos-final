import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { printerPersistence } from '../services/printerPersistence';
import { printerDiscovery } from '../services/printerDiscovery';
import { printerRegistry } from '../services/printerRegistry';

/**
 * Example showing printer persistence and auto-reconnection features
 */
const PrinterPersistenceExample: React.FC = () => {
  const [savedPrinters, setSavedPrinters] = useState<any[]>([]);
  const [autoConnectStatus, setAutoConnectStatus] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load saved printer configurations
      const configs = await printerPersistence.loadAllPrinterConfigs();
      setSavedPrinters(configs);

      // Load auto-connect status
      const status = await printerPersistence.getAutoConnectStatus();
      setAutoConnectStatus(status);
    } catch (error) {
      console.error('Failed to load persistence data:', error);
    }
  };

  // Save a printer configuration
  const savePrinterConfig = async () => {
    try {
      const printers = printerDiscovery.getDiscoveredPrinters();
      if (printers.length === 0) {
        Alert.alert('No Printers', 'No printers discovered. Please start discovery first.');
        return;
      }

      const printer = printers[0]; // Use first discovered printer
      const roles = ['BOT', 'KOT', 'Receipt']; // Assign to all roles

      await printerPersistence.savePrinterConfig(printer.id, printer.name, roles);
      Alert.alert('Success', `Saved printer configuration for ${printer.name}`);
      loadData();
    } catch (error) {
      Alert.alert('Error', `Failed to save configuration: ${error}`);
    }
  };

  // Restore printer assignments
  const restoreAssignments = async () => {
    try {
      await printerPersistence.restorePrinterAssignments();
      Alert.alert('Success', 'Printer assignments restored');
      loadData();
    } catch (error) {
      Alert.alert('Error', `Failed to restore assignments: ${error}`);
    }
  };

  // Toggle auto-connect
  const toggleAutoConnect = async () => {
    try {
      const newStatus = !autoConnectStatus?.enabled;
      await printerPersistence.setAutoConnectEnabled(newStatus);
      setAutoConnectStatus({ ...autoConnectStatus, enabled: newStatus });
      Alert.alert('Success', `Auto-connect ${newStatus ? 'enabled' : 'disabled'}`);
    } catch (error) {
      Alert.alert('Error', `Failed to toggle auto-connect: ${error}`);
    }
  };

  // Clear all configurations
  const clearAllConfigs = async () => {
    try {
      Alert.alert(
        'Clear All Configurations',
        'Are you sure you want to clear all saved printer configurations?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear',
            style: 'destructive',
            onPress: async () => {
              await printerPersistence.clearAllConfigs();
              Alert.alert('Success', 'All configurations cleared');
              loadData();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to clear configurations: ${error}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Printer Persistence Example</Text>
      
      {/* Auto-Connect Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auto-Connect Status</Text>
        <Text>Enabled: {autoConnectStatus?.enabled ? 'Yes' : 'No'}</Text>
        <Text>Saved Printers: {autoConnectStatus?.savedPrintersCount || 0}</Text>
        {autoConnectStatus?.lastAutoConnect && (
          <Text>Last Auto-Connect: {new Date(autoConnectStatus.lastAutoConnect).toLocaleString()}</Text>
        )}
        <TouchableOpacity style={styles.button} onPress={toggleAutoConnect}>
          <Text style={styles.buttonText}>
            {autoConnectStatus?.enabled ? 'Disable' : 'Enable'} Auto-Connect
          </Text>
        </TouchableOpacity>
      </View>

      {/* Saved Printer Configurations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved Printer Configurations</Text>
        {savedPrinters.length === 0 ? (
          <Text style={styles.emptyText}>No saved configurations</Text>
        ) : (
          savedPrinters.map((config, index) => (
            <View key={index} style={styles.configItem}>
              <Text style={styles.configName}>{config.printerName}</Text>
              <Text style={styles.configRoles}>Roles: {config.roles.join(', ')}</Text>
              <Text style={styles.configDate}>
                Last Connected: {new Date(config.lastConnected).toLocaleString()}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <TouchableOpacity style={styles.button} onPress={savePrinterConfig}>
          <Text style={styles.buttonText}>Save Printer Config</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={restoreAssignments}>
          <Text style={styles.buttonText}>Restore Assignments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={clearAllConfigs}>
          <Text style={styles.buttonText}>Clear All Configs</Text>
        </TouchableOpacity>
      </View>

      {/* How It Works */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <Text style={styles.infoText}>
          • Printer assignments are automatically saved when you assign printers to roles
        </Text>
        <Text style={styles.infoText}>
          • The app will automatically reconnect to saved printers on startup
        </Text>
        <Text style={styles.infoText}>
          • Auto-connect runs every 30 seconds to reconnect disconnected printers
        </Text>
        <Text style={styles.infoText}>
          • All settings persist across app restarts
        </Text>
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
  dangerButton: {
    backgroundColor: '#F44336',
  },
  configItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  configName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  configRoles: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  configDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});

export default PrinterPersistenceExample;


