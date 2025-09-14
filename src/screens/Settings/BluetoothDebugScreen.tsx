import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadow } from '../../theme';
import { bluetoothDebugger, DebugInfo } from '../../services/bluetoothDebugger';
import { bluetoothManager } from '../../services/bluetoothManager';
import { blePrinter } from '../../services/blePrinter';

const BluetoothDebugScreen: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [connectionDetails, setConnectionDetails] = useState<any>(null);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const info = await bluetoothDebugger.runDiagnostics();
      setDebugInfo(info);
      setDebugLog(bluetoothDebugger.getDebugLog());
      
      const details = await bluetoothDebugger.getConnectionDetails();
      setConnectionDetails(details);
    } catch (error) {
      Alert.alert('Error', `Diagnostics failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testPrintWithDebug = async () => {
    setLoading(true);
    try {
      const result = await bluetoothDebugger.testPrintWithDebug();
      
      if (result.success) {
        Alert.alert('Success', 'Test print completed successfully!');
      } else {
        Alert.alert('Test Print Failed', `Error: ${result.error}\n\nDetails: ${JSON.stringify(result.details, null, 2)}`);
      }
      
      // Refresh diagnostics
      await runDiagnostics();
    } catch (error) {
      Alert.alert('Error', `Test print error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testAllPrintMethods = async () => {
    setLoading(true);
    try {
      const result = await blePrinter.testAllPrintMethods();
      
      if (result.success) {
        const passedTests = Object.entries(result.results)
          .filter(([_, passed]) => passed)
          .map(([test, _]) => test)
          .join(', ');
        
        Alert.alert(
          'Print Tests Completed', 
          `✅ Passed: ${passedTests}\n\n❌ Failed: ${Object.keys(result.errors).join(', ')}\n\nCheck console for detailed results.`
        );
      } else {
        Alert.alert(
          'All Print Tests Failed', 
          `All printing methods failed. Check console for detailed error information.\n\nErrors: ${JSON.stringify(result.errors, null, 2)}`
        );
      }
      
      // Refresh diagnostics
      await runDiagnostics();
    } catch (error) {
      Alert.alert('Error', `Comprehensive test error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const retryModuleLoad = async () => {
    setLoading(true);
    try {
      const success = blePrinter.retryLoadModule();
      
      if (success) {
        Alert.alert('Success', 'Bluetooth module loaded successfully!');
      } else {
        Alert.alert(
          'Module Load Failed', 
          'Failed to load Bluetooth module. Check console for detailed error information.'
        );
      }
      
      // Refresh diagnostics
      await runDiagnostics();
    } catch (error) {
      Alert.alert('Error', `Module load error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const forceReconnect = async () => {
    if (!debugInfo?.currentDevice?.address) {
      Alert.alert('Error', 'No device connected to reconnect to');
      return;
    }

    setLoading(true);
    try {
      const result = await bluetoothDebugger.forceReconnect(debugInfo.currentDevice.address);
      
      if (result.success) {
        Alert.alert('Success', 'Device reconnected successfully!');
      } else {
        Alert.alert('Reconnect Failed', `Error: ${result.error}`);
      }
      
      await runDiagnostics();
    } catch (error) {
      Alert.alert('Error', `Reconnect error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => {
    bluetoothDebugger.clearDebugLog();
    setDebugLog([]);
  };

  const renderStatusItem = (label: string, value: any, color?: string) => (
    <View style={styles.statusItem}>
      <Text style={styles.statusLabel}>{label}:</Text>
      <Text style={[styles.statusValue, color && { color }]}>
        {typeof value === 'boolean' ? (value ? '✅ Yes' : '❌ No') : String(value || 'N/A')}
      </Text>
    </View>
  );

  const renderDebugSection = (title: string, data: any) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.debugText}>{JSON.stringify(data, null, 2)}</Text>
    </View>
  );

  const renderModuleStatus = () => {
    const moduleStatus = blePrinter.debugModuleStatus();
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Module Status</Text>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Module Loaded:</Text>
          <Text style={styles.statusValue}>
            {moduleStatus.moduleLoaded ? '✅ Yes' : '❌ No'}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>BluetoothManager:</Text>
          <Text style={styles.statusValue}>
            {moduleStatus.BluetoothManager ? '✅ Loaded' : '❌ Not Loaded'}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>BluetoothEscposPrinter:</Text>
          <Text style={styles.statusValue}>
            {moduleStatus.BluetoothEscposPrinter ? '✅ Loaded' : '❌ Not Loaded'}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Required Methods:</Text>
          <Text style={styles.statusValue}>
            {moduleStatus.methodCheck.available ? '✅ All Available' : `❌ Missing: ${moduleStatus.methodCheck.missing.join(', ')}`}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>ALIGN Constants:</Text>
          <Text style={styles.statusValue}>
            {typeof moduleStatus.alignConstants === 'object' ? '✅ Available' : '❌ Not Available'}
          </Text>
        </View>
        {moduleStatus.moduleLoadError && (
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Load Error:</Text>
            <Text style={[styles.statusValue, { color: 'red' }]}>
              {moduleStatus.moduleLoadError}
            </Text>
          </View>
        )}
        <TouchableOpacity 
          style={styles.debugButton} 
          onPress={() => Alert.alert('Module Details', JSON.stringify(moduleStatus, null, 2))}
        >
          <Text style={styles.debugButtonText}>View Full Module Details</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Bluetooth Debug</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={runDiagnostics}>
            <Text style={styles.buttonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Running diagnostics...</Text>
        </View>
      )}

      {debugInfo && (
        <View style={styles.content}>
          {/* Module Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Module Status</Text>
            <View style={styles.sectionContent}>
              {renderStatusItem('Module Supported', debugInfo.moduleSupported, debugInfo.moduleSupported ? 'green' : 'red')}
              {debugInfo.moduleError && renderStatusItem('Module Error', debugInfo.moduleError, 'red')}
            </View>
          </View>

          {/* Bluetooth Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bluetooth Status</Text>
            <View style={styles.sectionContent}>
              {renderStatusItem('Bluetooth Enabled', debugInfo.bluetoothEnabled)}
              {renderStatusItem('Permissions Granted', debugInfo.permissionsGranted)}
              {renderStatusItem('Device Connected', debugInfo.deviceConnected)}
              {debugInfo.lastError && renderStatusItem('Last Error', debugInfo.lastError, 'red')}
            </View>
          </View>

          {/* Current Device */}
          {debugInfo.currentDevice && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Device</Text>
              <View style={styles.sectionContent}>
                {renderStatusItem('Name', debugInfo.currentDevice.name)}
                {renderStatusItem('Address', debugInfo.currentDevice.address)}
                {renderStatusItem('Paired', debugInfo.currentDevice.paired)}
                {renderStatusItem('Connected', debugInfo.currentDevice.connected)}
              </View>
            </View>
          )}

          {/* Device List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Devices ({debugInfo.deviceList.length})</Text>
            <View style={styles.sectionContent}>
              {debugInfo.deviceList.length === 0 ? (
                <Text style={styles.noDevices}>No devices found</Text>
              ) : (
                debugInfo.deviceList.map((device, index) => (
                  <View key={`${device.address}-${index}`} style={styles.deviceItem}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceAddress}>{device.address}</Text>
                    <Text style={styles.deviceStatus}>
                      {device.paired ? 'Paired' : 'Found'} {device.connected ? '• Connected' : ''}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.testButton]} 
              onPress={testPrintWithDebug}
              disabled={loading || !debugInfo.deviceConnected}
            >
              <Text style={styles.buttonText}>🧪 Test Print</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.testButton]} 
              onPress={testAllPrintMethods}
              disabled={loading || !debugInfo.deviceConnected}
            >
              <Text style={styles.buttonText}>🔍 Test All Print Methods</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.reconnectButton]} 
              onPress={retryModuleLoad}
              disabled={loading}
            >
              <Text style={styles.buttonText}>🔄 Retry Module Load</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.reconnectButton]} 
              onPress={forceReconnect}
              disabled={loading || !debugInfo.deviceConnected}
            >
              <Text style={styles.buttonText}>🔗 Force Reconnect</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.clearButton]} 
              onPress={clearLogs}
            >
              <Text style={styles.buttonText}>🗑️ Clear Logs</Text>
            </TouchableOpacity>
          </View>

          {/* Debug Log */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Debug Log</Text>
            <View style={styles.logContainer}>
              {debugLog.length === 0 ? (
                <Text style={styles.noLogs}>No debug logs</Text>
              ) : (
                debugLog.map((log, index) => (
                  <Text key={`log-${index}`} style={styles.logEntry}>{log}</Text>
                ))
              )}
            </View>
          </View>

          {/* Module Status */}
          {renderModuleStatus()}

          {/* Connection Details */}
          {connectionDetails && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Connection Details</Text>
              <View style={styles.sectionContent}>
                {renderDebugSection('Module', connectionDetails.module)}
                {renderDebugSection('Bluetooth', connectionDetails.bluetooth)}
                {renderDebugSection('Permissions', { granted: connectionDetails.permissions })}
              </View>
            </View>
          )}
        </View>
      )}
        </ScrollView>
      </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  refreshButton: {
    backgroundColor: colors.info,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
  content: {
    padding: spacing.md,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadow.card,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    padding: spacing.md,
    backgroundColor: colors.surface2,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  sectionContent: {
    padding: spacing.md,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statusLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    flex: 1,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  deviceItem: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  deviceAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  deviceStatus: {
    fontSize: 12,
    color: colors.info,
    marginTop: 2,
  },
  noDevices: {
    textAlign: 'center',
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: colors.success,
  },
  reconnectButton: {
    backgroundColor: colors.warning,
  },
  clearButton: {
    backgroundColor: colors.danger,
  },
  logContainer: {
    maxHeight: 200,
  },
  logEntry: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  noLogs: {
    textAlign: 'center',
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  debugKey: {
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  debugButton: {
    backgroundColor: colors.info,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  debugButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default BluetoothDebugScreen;







