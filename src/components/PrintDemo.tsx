import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { blePrinter } from '../services/blePrinter';
import { colors, spacing, radius } from '../theme';

const PrintDemo: React.FC = () => {
  const [moduleStatus, setModuleStatus] = useState<{ supported: boolean; error?: string } | null>(null);
  const [bluetoothEnabled, setBluetoothEnabled] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<{ paired: Array<any>; found: Array<any> } | null>(null);

  useEffect(() => {
    checkModuleStatus();
  }, []);

  const checkModuleStatus = () => {
    const status = blePrinter.getModuleStatus();
    setModuleStatus(status);
    console.log('Bluetooth module status:', status);
  };

  const checkBluetoothStatus = async () => {
    try {
      const enabled = await blePrinter.isEnabled();
      setBluetoothEnabled(enabled);
      if (!enabled) {
        Alert.alert('Bluetooth Status', 'Bluetooth is disabled. Please enable Bluetooth in your device settings.');
      }
    } catch (error) {
      console.error('Error checking Bluetooth status:', error);
      Alert.alert('Error', 'Failed to check Bluetooth status');
    }
  };

  const scanDevices = async () => {
    try {
      const deviceList = await blePrinter.scanDevices();
      setDevices(deviceList);
      console.log('Scanned devices:', deviceList);
    } catch (error) {
      console.error('Error scanning devices:', error);
      Alert.alert('Error', 'Failed to scan for devices');
    }
  };

  const testPrint = async () => {
    try {
      await blePrinter.printText('Test Print - Bluetooth Module Working!\n');
      Alert.alert('Success', 'Test print completed!');
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Error', `Print failed: ${error}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Bluetooth Printer Demo</Text>
      
      {/* Module Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Module Status</Text>
        <View style={[styles.statusCard, { backgroundColor: moduleStatus?.supported ? colors.success : colors.danger }]}>
          <Text style={styles.statusText}>
            {moduleStatus?.supported ? '✓ Module Loaded' : '✗ Module Not Available'}
          </Text>
          {moduleStatus?.error && (
            <Text style={styles.errorText}>{moduleStatus.error}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.button} onPress={checkModuleStatus}>
          <Text style={styles.buttonText}>Refresh Status</Text>
        </TouchableOpacity>
      </View>

      {/* Bluetooth Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bluetooth Status</Text>
        <View style={[styles.statusCard, { backgroundColor: bluetoothEnabled ? colors.success : colors.warning }]}>
          <Text style={styles.statusText}>
            {bluetoothEnabled === null ? 'Unknown' : bluetoothEnabled ? '✓ Enabled' : '✗ Disabled'}
          </Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={checkBluetoothStatus}>
          <Text style={styles.buttonText}>Check Bluetooth</Text>
        </TouchableOpacity>
      </View>

      {/* Device Scanning */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Scanning</Text>
        <TouchableOpacity style={styles.button} onPress={scanDevices}>
          <Text style={styles.buttonText}>Scan for Devices</Text>
        </TouchableOpacity>
        
        {devices && (
          <View style={styles.deviceList}>
            <Text style={styles.deviceTitle}>Paired Devices:</Text>
            {devices.paired.map((device: any, index: number) => (
              <Text key={`paired-${device.address}-${index}`} style={styles.deviceItem}>
                {device.name || 'Unknown'} ({device.address})
              </Text>
            ))}
            
            <Text style={styles.deviceTitle}>Found Devices:</Text>
            {devices.found.map((device: any, index: number) => (
              <Text key={`found-${device.address}-${index}`} style={styles.deviceItem}>
                {device.name || 'Unknown'} ({device.address})
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Test Print */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Print</Text>
        <TouchableOpacity 
          style={[styles.button, styles.testButton]} 
          onPress={testPrint}
          disabled={!moduleStatus?.supported}
        >
          <Text style={styles.buttonText}>Test Print</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  statusCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: 'white',
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: colors.success,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceList: {
    marginTop: spacing.md,
  },
  deviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  deviceItem: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    paddingLeft: spacing.md,
  },
});

export default PrintDemo;



