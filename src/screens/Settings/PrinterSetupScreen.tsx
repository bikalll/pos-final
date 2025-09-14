import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Switch,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, shadow } from '../../theme';
import { bluetoothManager, BluetoothDevice, BluetoothStatus } from '../../services/bluetoothManager';
import { Toast } from '../../services/toastService';
import PrinterTroubleshooter from '../../components/PrinterTroubleshooter';

interface PrinterSetupScreenProps {
  navigation: any;
}

export default function PrinterSetupScreen({ navigation }: PrinterSetupScreenProps) {
  const [status, setStatus] = useState<BluetoothStatus>({
    enabled: false,
    scanning: false,
    connected: false,
  });
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [moduleStatus, setModuleStatus] = useState<any>(null);
  const [autoConnect, setAutoConnect] = useState<boolean>(false);
  const [permissionsGranted, setPermissionsGranted] = useState<boolean>(false);
  const [showTroubleshooter, setShowTroubleshooter] = useState<boolean>(false);

  useEffect(() => {
    initializeBluetooth();
  }, []);

  const initializeBluetooth = async () => {
    try {
      // Check if Bluetooth is supported
      const supported = await bluetoothManager.isSupported();
      setIsSupported(supported);

      if (!supported) {
        const moduleStatus = bluetoothManager.getModuleStatus();
        setModuleStatus(moduleStatus);
        Toast.show('Bluetooth printing module not available', 'error');
        return;
      }

      // Check current permissions status
      const permissionsGranted = await bluetoothManager.requestPermissions();
      setPermissionsGranted(permissionsGranted);
      
      if (!permissionsGranted) {
        Toast.show('Bluetooth permissions are required for printer functionality', 'error');
        return;
      }

      // Check Bluetooth status
      await updateStatus();
    } catch (error) {
      console.error('Bluetooth initialization failed:', error);
      Toast.show('Failed to initialize Bluetooth', 'error');
    }
  };

  const requestBluetoothPermissions = async (): Promise<boolean> => {
    try {
      const permissionsGranted = await bluetoothManager.requestPermissions();
      setPermissionsGranted(permissionsGranted);
      if (!permissionsGranted) {
        Alert.alert(
          'Permissions Required',
          'Bluetooth and Location permissions are required for printer functionality. Please grant all permissions in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // You can add navigation to settings here if needed
              Toast.show('Please enable permissions in device settings', 'info');
            }}
          ]
        );
      }
      return permissionsGranted;
    } catch (error) {
      console.error('Permission request failed:', error);
      Toast.show('Failed to request permissions', 'error');
      setPermissionsGranted(false);
      return false;
    }
  };

  const updateStatus = async () => {
    const currentStatus = bluetoothManager.getStatus();
    setStatus(currentStatus);
  };

  const handleEnableBluetooth = async () => {
    try {
      if (!permissionsGranted) {
        Toast.show('Bluetooth permissions required. Please request permissions first.', 'error');
        return;
      }
      
      const success = await bluetoothManager.enableBluetooth();
      if (success) {
        Toast.show('Bluetooth enabled successfully', 'success');
        await updateStatus();
      } else {
        Toast.show('Failed to enable Bluetooth', 'error');
      }
    } catch (error) {
      Toast.show('Error enabling Bluetooth', 'error');
    }
  };

  const handleScanDevices = async () => {
    try {
      if (!permissionsGranted) {
        Toast.show('Bluetooth permissions required. Please request permissions first.', 'error');
        return;
      }
      
      setStatus(prev => ({ ...prev, scanning: true }));
      const discoveredDevices = await bluetoothManager.scanDevices();
      setDevices(discoveredDevices);
      Toast.show(`Found ${discoveredDevices.length} devices`, 'success');
    } catch (error) {
      Toast.show('Failed to scan for devices', 'error');
    } finally {
      setStatus(prev => ({ ...prev, scanning: false }));
      await updateStatus();
    }
  };

  const handleConnectDevice = async (device: BluetoothDevice) => {
    try {
      if (!permissionsGranted) {
        Toast.show('Bluetooth permissions required. Please request permissions first.', 'error');
        return;
      }
      
      const connected = await bluetoothManager.connectToDevice(device);
      if (connected) {
        Toast.show(`Connected to ${device.name}`, 'success');
        await updateStatus();
      } else {
        Toast.show('Failed to connect to device', 'error');
      }
    } catch (error) {
      Toast.show(`Connection failed: ${error}`, 'error');
    }
  };

  const handleDisconnect = async () => {
    try {
      if (!permissionsGranted) {
        Toast.show('Bluetooth permissions required. Please request permissions first.', 'error');
        return;
      }
      
      await bluetoothManager.disconnect();
      Toast.show('Disconnected from printer', 'success');
      await updateStatus();
    } catch (error) {
      Toast.show('Error disconnecting', 'error');
    }
  };

  const handleTestPrint = async () => {
    try {
      if (!permissionsGranted) {
        Toast.show('Bluetooth permissions required. Please request permissions first.', 'error');
        return;
      }
      
      const success = await bluetoothManager.testConnection();
      if (success) {
        Toast.show('Test print successful', 'success');
      } else {
        Toast.show('Test print failed', 'error');
      }
    } catch (error) {
      Toast.show('Test print error', 'error');
    }
  };

  const renderDevice = ({ item }: { item: BluetoothDevice }) => (
    <View style={styles.deviceItem}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceAddress}>{item.address}</Text>
        <View style={styles.deviceMeta}>
          <Text style={[styles.deviceStatus, item.paired && styles.pairedText]}>
            {item.paired ? 'Paired' : 'Found'}
          </Text>
          {item.connected && (
            <Text style={styles.connectedText}>Connected</Text>
          )}
          {item.rssi && (
            <Text style={styles.rssiText}>Signal: {item.rssi}dBm</Text>
          )}
        </View>
      </View>
      <View style={styles.deviceActions}>
        {item.connected ? (
          <TouchableOpacity
            style={getButtonStyle([styles.actionButton, styles.disconnectButton], !permissionsGranted)}
            onPress={handleDisconnect}
            disabled={!permissionsGranted}
          >
            <Text style={!permissionsGranted ? styles.disabledButtonText : styles.buttonText}>
              Disconnect
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={getButtonStyle([styles.actionButton, styles.connectButton], !permissionsGranted)}
            onPress={() => handleConnectDevice(item)}
            disabled={!permissionsGranted}
          >
            <Text style={!permissionsGranted ? styles.disabledButtonText : styles.buttonText}>
              Connect
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const getButtonStyle = (baseStyle: any, isDisabled: boolean = false) => {
    if (isDisabled) {
      return [baseStyle, styles.disabledButton];
    }
    return baseStyle;
  };

  const renderStatusCard = () => (
    <View style={styles.statusCard}>
      <Text style={styles.statusTitle}>Bluetooth Status</Text>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Module:</Text>
        <Text style={[styles.statusValue, isSupported ? styles.successText : styles.errorText]}>
          {isSupported ? 'Available' : 'Not Available'}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Permissions:</Text>
        <Text style={[styles.statusValue, permissionsGranted ? styles.successText : styles.errorText]}>
          {permissionsGranted ? 'Granted' : 'Not Granted'}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Bluetooth:</Text>
        <Text style={[styles.statusValue, status.enabled ? styles.successText : styles.errorText]}>
          {status.enabled ? 'Enabled' : 'Disabled'}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Connection:</Text>
        <Text style={[styles.statusValue, status.connected ? styles.successText : styles.errorText]}>
          {status.connected ? 'Connected' : 'Disconnected'}
        </Text>
      </View>
      {status.currentDevice && (
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Device:</Text>
          <Text style={styles.statusValue}>{status.currentDevice.name}</Text>
        </View>
      )}
      {status.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{status.error}</Text>
        </View>
      )}
    </View>
  );

  if (showTroubleshooter) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setShowTroubleshooter(false)}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Printer Troubleshooter</Text>
        </View>
        <PrinterTroubleshooter />
      </SafeAreaView>
    );
  }

  if (!isSupported) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.unsupportedContainer}>
          <Text style={styles.unsupportedTitle}>Bluetooth Printing Not Available</Text>
          <Text style={styles.unsupportedText}>
            The Bluetooth printing module is not available on this device.
          </Text>
          {moduleStatus?.error && (
            <Text style={styles.errorText}>Error: {moduleStatus.error}</Text>
          )}
          <TouchableOpacity
            style={styles.retryButton}
            onPress={initializeBluetooth}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {renderStatusCard()}

        {!permissionsGranted && (
          <View style={styles.permissionWarningCard}>
            <Text style={styles.permissionWarningTitle}>⚠️ Permissions Required</Text>
            <Text style={styles.permissionWarningText}>
              Bluetooth and Location permissions are required to scan for and connect to printers. 
              Please use the "Request Permissions" button above to grant the necessary permissions.
            </Text>
          </View>
        )}

        <View style={styles.controlsCard}>
          <Text style={styles.sectionTitle}>Controls</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={requestBluetoothPermissions}
          >
            <Text style={styles.buttonText}>Request Permissions</Text>
          </TouchableOpacity>
          
          {!status.enabled && (
            <TouchableOpacity
              style={getButtonStyle([styles.actionButton, styles.primaryButton], !permissionsGranted)}
              onPress={handleEnableBluetooth}
              disabled={!permissionsGranted}
            >
              <Text style={!permissionsGranted ? styles.disabledButtonText : styles.buttonText}>
                Enable Bluetooth
              </Text>
            </TouchableOpacity>
          )}

          {status.enabled && (
            <>
              <TouchableOpacity
                style={getButtonStyle([styles.actionButton, styles.primaryButton], !permissionsGranted)}
                onPress={handleScanDevices}
                disabled={status.scanning || !permissionsGranted}
              >
                {status.scanning ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={!permissionsGranted ? styles.disabledButtonText : styles.buttonText}>
                    Scan for Devices
                  </Text>
                )}
              </TouchableOpacity>

              {status.connected && (
                <>
                  <TouchableOpacity
                    style={getButtonStyle([styles.actionButton, styles.secondaryButton], !permissionsGranted)}
                    onPress={handleTestPrint}
                    disabled={!permissionsGranted}
                  >
                    <Text style={!permissionsGranted ? styles.disabledButtonText : styles.buttonText}>
                      Test Print
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={getButtonStyle([styles.actionButton, styles.dangerButton], !permissionsGranted)}
                    onPress={handleDisconnect}
                    disabled={!permissionsGranted}
                  >
                    <Text style={!permissionsGranted ? styles.disabledButtonText : styles.buttonText}>
                      Disconnect
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={[styles.actionButton, styles.infoButton]}
                onPress={() => setShowTroubleshooter(true)}
              >
                <Text style={styles.buttonText}>🛠️ Troubleshooter</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {devices.length > 0 && (
          <View style={styles.devicesCard}>
            <Text style={styles.sectionTitle}>Available Devices ({devices.length})</Text>
            <FlatList
              data={devices}
              renderItem={renderDevice}
              keyExtractor={(item) => item.address}
              scrollEnabled={false}
            />
          </View>
        )}

        <View style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Auto-connect to last device</Text>
            <Switch
              value={autoConnect}
              onValueChange={setAutoConnect}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={autoConnect ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    padding: spacing.md,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  successText: {
    color: colors.success,
  },
  errorText: {
    color: colors.danger,
  },
  errorContainer: {
    marginTop: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
  },
  controlsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  actionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.success,
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  infoButton: {
    backgroundColor: colors.info,
  },
  connectButton: {
    backgroundColor: colors.success,
  },
  disconnectButton: {
    backgroundColor: colors.danger,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: colors.outline,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  devicesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  deviceAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  deviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceStatus: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 8,
  },
  pairedText: {
    color: colors.success,
    fontWeight: '500',
  },
  connectedText: {
    fontSize: 12,
    color: colors.info,
    fontWeight: '500',
    marginRight: 8,
  },
  rssiText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  deviceActions: {
    marginLeft: spacing.sm,
  },
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  settingLabel: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  permissionWarningCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  permissionWarningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.warning,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  permissionWarningText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  unsupportedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  unsupportedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  unsupportedText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.md,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
});
