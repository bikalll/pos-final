import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { printerDiscovery, PrinterDevice } from '../../services/printerDiscovery';
import { printerRegistry, PrinterRole } from '../../services/printerRegistry';
import { printManager } from '../../services/printManager';
import { printerPersistence, SavedPrinterConfig } from '../../services/printerPersistence';

interface PrinterSetupScreenProps {
  navigation: any;
}

const PrinterSetupScreen: React.FC<PrinterSetupScreenProps> = ({ navigation }) => {
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [discoveryStatus, setDiscoveryStatus] = useState(printerDiscovery.getDiscoveryStatus());
  const [registryState, setRegistryState] = useState(printerRegistry.getState());
  const [printManagerStatus, setPrintManagerStatus] = useState(printManager.getStatus());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterDevice | null>(null);
  const [testingPrinter, setTestingPrinter] = useState<string | null>(null);
  const [savedPrinters, setSavedPrinters] = useState<SavedPrinterConfig[]>([]);
  const [openMenuPrinterId, setOpenMenuPrinterId] = useState<string | null>(null); // legacy; menu now always visible

  // Load initial data (no auto-refresh/spinner; do not scan)
  useEffect(() => {
    // Lightweight hydrate without triggering refresh UI or scanning
    loadData(false);
    setupListeners();
  }, []);

  // Setup listeners
  const setupListeners = () => {
    // Printer discovery listener
    const unsubscribeDiscovery = printerDiscovery.addDiscoveryListener((discoveredPrinters, status) => {
      setPrinters(discoveredPrinters);
      setDiscoveryStatus(status);
    });

    // Printer registry listener
    const unsubscribeRegistry = printerRegistry.addListener((state) => {
      setRegistryState(state);
    });

    // Print manager listener
    const unsubscribePrintManager = printManager.addEventListener((event) => {
      setPrintManagerStatus(printManager.getStatus());
    });

    return () => {
      unsubscribeDiscovery();
      unsubscribeRegistry();
      unsubscribePrintManager();
    };
  };

  // Load data
  const loadData = async (userInitiated: boolean = true) => {
    try {
      if (userInitiated) setIsRefreshing(true);
      
      // Do not re-initialize here to avoid auto refresh/scan; app initializes on launch
      // Load saved (app-paired) printers
      const saved = await printerPersistence.loadAllPrinterConfigs();
      setSavedPrinters(saved);
      
      // Load discovered printers
      const discoveredPrinters = printerDiscovery.getDiscoveredPrinters();
      setPrinters(discoveredPrinters);
      
      // Load registry state
      setRegistryState(printerRegistry.getState());
      
      // Load print manager status
      setPrintManagerStatus(printManager.getStatus());
      
      // Show connection status
      const connectionStatus = printManager.getConnectionStatus();
      if (Object.keys(connectionStatus).length > 0) {
        const connectedCount = Object.values(connectionStatus).filter(s => s.connected).length;
        const totalCount = Object.keys(connectionStatus).length;
        console.log(`📊 Connection Status: ${connectedCount}/${totalCount} printers connected`);
      }
    } catch (error) {
      console.error('Failed to load printer data:', error);
      Alert.alert('Error', 'Failed to load printer data');
    } finally {
      if (userInitiated) setIsRefreshing(false);
    }
  };

  // Start discovery
  const startDiscovery = async () => {
    try {
      await printerDiscovery.startDiscovery();
    } catch (error) {
      console.error('Discovery failed:', error);
      Alert.alert('Discovery Failed', String(error));
    }
  };

  // Add printer to app (pair within app, limit to 3)
  const addPrinterToApp = async (printer: PrinterDevice) => {
    try {
      if (savedPrinters.length >= 3) {
        Alert.alert('Limit Reached', 'You can add up to 3 printers.');
        return;
      }
      const name = printerDiscovery.getPrinterDisplayName(printer);
      // Try connecting once to complete pairing within the app
      await printManager.reconnectPrinter(printer.id);
      // Save to app persistence
      await printerPersistence.savePrinterConfig(printer.id, name, []);
      const saved = await printerPersistence.loadAllPrinterConfigs();
      setSavedPrinters(saved);
      Alert.alert('Added', `${name} added to My Printers`);
    } catch (error) {
      Alert.alert('Add Failed', String(error));
    }
  };

  // Toggle role assignment for a specific printer with exclusivity per role
  const toggleRoleForPrinter = async (printer: PrinterDevice, role: PrinterRole) => {
    try {
      const currentMapping = printerRegistry.getPrinterMapping(role);
      if (currentMapping && currentMapping.printerId === printer.id) {
        await printerRegistry.removePrinterMapping(role);
      } else {
        const validation = printerRegistry.validateMapping(role, printer);
        if (!validation.valid) {
          Alert.alert('Invalid Assignment', validation.message || 'Cannot assign this printer');
          return;
        }
        await printerRegistry.setPrinterMapping(role, printer, true);
      }
    } catch (error) {
      Alert.alert('Assignment Failed', String(error));
    }
  };

  const roleAvailableForPrinter = (printerId: string, role: PrinterRole) => {
    const mapping = registryState.mappings.get(role);
    if (!mapping) return true;
    return mapping.printerId === printerId; // Only available if unassigned or already assigned to this printer
  };

  // Test printer connection
  const testPrinter = async (printer: PrinterDevice) => {
    try {
      setTestingPrinter(printer.id);
      const result = await printManager.testPrinter(printer.id);
      
      Alert.alert(
        'Printer Test',
        result.message,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Test Failed', String(error));
    } finally {
      setTestingPrinter(null);
    }
  };

  // Assign printer to role
  const assignPrinterToRole = (printer: PrinterDevice, role: PrinterRole) => {
    Alert.alert(
      'Assign Printer',
      `Assign "${printerDiscovery.getPrinterDisplayName(printer)}" to ${role}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            try {
              // Validate mapping
              const validation = printerRegistry.validateMapping(role, printer);
              if (!validation.valid) {
                Alert.alert('Invalid Assignment', validation.message || 'Cannot assign this printer');
        return;
      }
      
              await printerRegistry.setPrinterMapping(role, printer, true);
              Alert.alert('Success', `Printer assigned to ${role}`);
    } catch (error) {
              Alert.alert('Assignment Failed', String(error));
            }
          },
        },
      ]
    );
  };

  // Remove printer assignment
  const removePrinterAssignment = (role: PrinterRole) => {
    Alert.alert(
      'Remove Assignment',
      `Remove printer assignment for ${role}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await printerRegistry.removePrinterMapping(role);
              Alert.alert('Success', `Assignment removed for ${role}`);
            } catch (error) {
              Alert.alert('Removal Failed', String(error));
            }
          },
        },
      ]
    );
  };

  // Toggle mapping enabled/disabled
  const toggleMappingEnabled = async (role: PrinterRole, enabled: boolean) => {
    try {
      await printerRegistry.setMappingEnabled(role, enabled);
    } catch (error) {
      Alert.alert('Toggle Failed', String(error));
    }
  };

  // Set friendly name
  const setFriendlyName = (printer: PrinterDevice) => {
    Alert.prompt(
      'Set Friendly Name',
      `Enter a friendly name for "${printer.name}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (name) => {
            if (name && name.trim()) {
              try {
                await printerDiscovery.setFriendlyName(printer.id, name.trim());
                Alert.alert('Success', 'Friendly name updated');
              } catch (error) {
                Alert.alert('Update Failed', String(error));
              }
            }
          },
        },
      ],
      'plain-text',
      printer.friendlyName || printer.name
    );
  };

  // Print sample ticket
  const printSampleTicket = async (role: PrinterRole) => {
    try {
      const sampleData = getSampleData(role);
      const jobId = await printManager.printRole(role, sampleData, 'high');
      Alert.alert('Sample Print', `Sample ${role} sent to printer (Job ID: ${jobId})`);
    } catch (error) {
      Alert.alert('Print Failed', String(error));
    }
  };


  // Get sample data for testing
  const getSampleData = (role: PrinterRole) => {
    const baseData = {
      restaurantName: 'Sample Restaurant',
      ticketId: `SAMPLE-${role}-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      table: 'Sample Table',
      items: [
        { name: 'Sample Item 1', quantity: 1, price: 10.00, orderType: role },
        { name: 'Sample Item 2', quantity: 2, price: 15.00, orderType: role },
      ],
      estimatedTime: '10-15 minutes',
      specialInstructions: 'This is a sample print for testing',
    };

    if (role === 'Receipt') {
      return {
        ...baseData,
        receiptId: `REC-${Date.now()}`,
        taxLabel: 'Tax',
        serviceLabel: 'Service',
        subtotal: 40.00,
        tax: 4.00,
        service: 4.00,
        total: 48.00,
        payment: { method: 'Cash', amountPaid: 50.00, change: 2.00 },
      };
    }

    return baseData;
  };

  // Render printer item (discovered)
  const renderPrinterItem = (printer: PrinterDevice) => {
    const isTesting = testingPrinter === printer.id;
    const displayName = printerDiscovery.getPrinterDisplayName(printer);
    const isConnected = printer.connected;
    const statusColor = isConnected ? '#4CAF50' : printer.status === 'error' ? '#F44336' : '#FF9800';

    return (
      <View key={printer.id} style={styles.printerItem}>
        <View style={styles.printerHeader}>
          <View style={styles.printerInfo}>
            <Text style={styles.printerName}>{displayName}</Text>
            <Text style={styles.printerAddress}>{printer.address}</Text>
            <View style={styles.printerDetails}>
              <Text style={[styles.printerStatus, { color: statusColor }]}>
                {isConnected ? 'Connected' : printer.status}
          </Text>
              <Text style={styles.printerType}>{printer.type.toUpperCase()}</Text>
        </View>
      </View>
          <View style={styles.printerActions}>
          <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setFriendlyName(printer)}
          >
              <Ionicons name="create-outline" size={20} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity
              style={[styles.actionButton, isTesting && styles.actionButtonDisabled]}
              onPress={() => testPrinter(printer)}
              disabled={isTesting}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color="#2196F3" />
              ) : (
                <Ionicons name="play-outline" size={20} color="#2196F3" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => addPrinterToApp(printer)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        </View>
        
        {printer.capabilities.length > 0 && (
          <View style={styles.capabilitiesContainer}>
            <Text style={styles.capabilitiesLabel}>Capabilities:</Text>
            <View style={styles.capabilitiesList}>
              {printer.capabilities.map((capability, index) => (
                <Text key={index} style={styles.capability}>
                  {capability.replace(/_/g, ' ')}
            </Text>
              ))}
            </View>
          </View>
        )}
    </View>
  );
  };

  // Render app-paired (saved) printer with role menu
  const renderSavedPrinterItem = (config: SavedPrinterConfig) => {
    const printer = printerDiscovery.getPrinter(config.printerId);
    const displayName = printer?.friendlyName || config.printerName;
    const rolesForThisPrinter = printerRegistry.getRolesForPrinter(config.printerId);
    const isMenuOpen = true; // always show role menu for consistency; removes need for arrow/ellipsis

    return (
      <View key={config.printerId} style={styles.savedPrinterItem}>
        <View style={styles.savedPrinterInfo}>
          <Text style={styles.savedPrinterName}>{displayName}</Text>
          <Text style={styles.savedPrinterRoles}>Roles: {rolesForThisPrinter.join(', ') || 'None'}</Text>
          <Text style={[styles.savedPrinterStatus, { color: printer?.connected ? '#4CAF50' : '#F44336' }]}>
            {printer?.connected ? '✅ Connected' : '❌ Disconnected'}
          </Text>
          {!!printer?.errorMessage && (
            <Text style={styles.savedPrinterError}>Error: {printer?.errorMessage}</Text>
          )}
          {isMenuOpen && (
            <View style={[styles.roleMenu, { borderColor: '#e0e0e0', backgroundColor: '#fff' }]}>
              {(() => {
                const availableRoles = (['KOT','BOT','Receipt'] as PrinterRole[])
                  .filter((role) => roleAvailableForPrinter(config.printerId, role));
                if (availableRoles.length === 0) {
                  return (
                    <View style={{ paddingVertical: 8, paddingHorizontal: 8 }}>
                      <Text style={{ color: '#666', fontSize: 12 }}>No roles available</Text>
                    </View>
                  );
                }
                return availableRoles.map((role) => {
                  const checked = rolesForThisPrinter.includes(role);
                  return (
                    <TouchableOpacity
                      key={role}
                      style={styles.roleMenuItem}
                      onPress={() => printer && toggleRoleForPrinter(printer, role)}
                    >
                      <Ionicons
                        name={checked ? 'checkbox-outline' : 'square-outline'}
                        size={18}
                        color={checked ? '#2196F3' : '#666'}
                      />
                      <Text style={styles.roleMenuText}>{role}</Text>
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>
          )}
        </View>
        <View>
          <TouchableOpacity
            style={styles.reconnectButton}
            onPress={() => printManager.reconnectPrinter(config.printerId)}
          >
            <Text style={styles.reconnectButtonText}>Reconnect</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render role mapping
  const renderRoleMapping = (role: PrinterRole) => {
    const mapping = registryState.mappings.get(role);
    const isAssigned = mapping && mapping.enabled;
    const assignedPrinter = mapping ? printers.find(p => p.id === mapping.printerId) : null;

    return (
      <View key={role} style={styles.roleMappingItem}>
        <View style={styles.roleHeader}>
          <Text style={styles.roleName}>{role}</Text>
          <Switch
            value={isAssigned}
            onValueChange={(enabled) => toggleMappingEnabled(role, enabled)}
            disabled={!mapping}
          />
      </View>
        
        {isAssigned && assignedPrinter ? (
          <View style={styles.assignedPrinter}>
            <Text style={styles.assignedPrinterName}>
              {printerDiscovery.getPrinterDisplayName(assignedPrinter)}
        </Text>
            <View style={styles.assignedPrinterActions}>
              <TouchableOpacity
                style={styles.sampleButton}
                onPress={() => printSampleTicket(role)}
              >
                <Ionicons name="print-outline" size={16} color="#4CAF50" />
                <Text style={styles.sampleButtonText}>Test Print</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePrinterAssignment(role)}
              >
                <Ionicons name="close-outline" size={16} color="#F44336" />
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
      </View>
      </View>
        ) : (
          <View style={styles.unassignedRole}>
            <Text style={styles.unassignedText}>No printer assigned</Text>
            <Text style={styles.unassignedSubtext}>Tap a printer below to assign</Text>
        </View>
      )}
    </View>
  );
  };

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
          onPress={() => navigation.goBack()}
          >
          <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        <Text style={styles.headerTitle}>Printer Setup</Text>
          <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => loadData(true)}
          disabled={isRefreshing}
          >
          <Ionicons name="refresh" size={24} color="#2196F3" />
          </TouchableOpacity>
        </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={loadData} />
        }
      >
        {/* Discovery Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discovery Status</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Bluetooth:</Text>
              <Text style={[styles.statusValue, { color: discoveryStatus.isEnabled ? '#4CAF50' : '#F44336' }]}>
                {discoveryStatus.isEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Scanning:</Text>
              <Text style={[styles.statusValue, { color: discoveryStatus.isScanning ? '#FF9800' : '#666' }]}>
                {discoveryStatus.isScanning ? 'Yes' : 'No'}
            </Text>
          </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Discovered:</Text>
              <Text style={styles.statusValue}>{discoveryStatus.discoveredCount}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Connected:</Text>
              <Text style={styles.statusValue}>{discoveryStatus.connectedCount}</Text>
            </View>
          </View>
          
          {!discoveryStatus.isEnabled && (
            <TouchableOpacity style={styles.enableButton} onPress={startDiscovery}>
              <Text style={styles.enableButtonText}>Enable Bluetooth & Start Discovery</Text>
            </TouchableOpacity>
          )}

          {discoveryStatus.isEnabled && !discoveryStatus.isScanning && (
            <TouchableOpacity style={styles.scanButton} onPress={startDiscovery}>
              <Text style={styles.scanButtonText}>Start Discovery</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* My Printers (App-Paired, max 3) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Printers ({savedPrinters.length}/3)</Text>
          {savedPrinters.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="print-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No printers added</Text>
              <Text style={styles.emptyStateSubtext}>Tap Quick Scan to find and add</Text>
            </View>
          ) : (
            savedPrinters.map(renderSavedPrinterItem)
          )}
        </View>

        {/* Role Mappings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Printer Assignments</Text>
          {(['BOT', 'KOT', 'Receipt'] as PrinterRole[]).map(renderRoleMapping)}
        </View>

        {/* Nearby Devices (only after scan) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Devices</Text>
          <TouchableOpacity style={styles.scanButton} onPress={startDiscovery} disabled={discoveryStatus.isScanning}>
            <Text style={styles.scanButtonText}>{discoveryStatus.isScanning ? 'Scanning…' : 'Quick Scan'}</Text>
          </TouchableOpacity>
          {printers.filter(p => !savedPrinters.some(s => s.printerId === p.id)).length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bluetooth-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No nearby printers</Text>
              <Text style={styles.emptyStateSubtext}>Tap Quick Scan to discover devices</Text>
            </View>
          ) : (
            printers
              .filter(p => !savedPrinters.some(s => s.printerId === p.id))
              .map(renderPrinterItem)
          )}
        </View>

        {/* Print Manager Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Print Manager Status</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Total Jobs:</Text>
              <Text style={styles.statusValue}>{printManagerStatus.totalJobs}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Pending:</Text>
              <Text style={styles.statusValue}>{printManagerStatus.pendingJobs}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Completed:</Text>
              <Text style={styles.statusValue}>{printManagerStatus.completedJobs}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Failed:</Text>
              <Text style={styles.statusValue}>{printManagerStatus.failedJobs}</Text>
          </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginVertical: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    minWidth: '45%',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  enableButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  scanButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  roleMappingItem: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  assignedPrinter: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
  },
  assignedPrinterName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  assignedPrinterActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  sampleButtonText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  removeButtonText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  unassignedRole: {
    padding: 12,
    alignItems: 'center',
  },
  unassignedText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  unassignedSubtext: {
    fontSize: 12,
    color: '#999',
  },
  printerItem: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  printerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  printerInfo: {
    flex: 1,
  },
  printerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  printerAddress: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  printerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  printerStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  printerType: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  printerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  capabilitiesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  capabilitiesLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  capabilitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  capability: {
    fontSize: 10,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  savedPrinterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  savedPrinterInfo: {
    flex: 1,
  },
  savedPrinterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  savedPrinterRoles: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  savedPrinterStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  savedPrinterError: {
    fontSize: 11,
    color: '#F44336',
    marginTop: 2,
  },
  reconnectButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  reconnectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  roleMenu: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingVertical: 4,
  },
  roleMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 8,
  },
  roleMenuText: {
    fontSize: 14,
    color: '#333',
  },
  moreButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  moreButtonActive: {
    backgroundColor: '#e0e0e0',
  },
});

export default PrinterSetupScreen;