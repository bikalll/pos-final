import { Platform, PermissionsAndroid } from 'react-native';
import { blePrinter } from './blePrinter';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PrinterDevice {
  id: string;
  name: string;
  address: string;
  type: 'bluetooth_classic' | 'ble';
  paired: boolean;
  connected: boolean;
  rssi?: number;
  lastSeen: Date;
  capabilities: string[];
  friendlyName?: string;
  status: 'available' | 'connected' | 'offline' | 'error';
  errorMessage?: string;
}

export interface PrinterDiscoveryStatus {
  isScanning: boolean;
  isEnabled: boolean;
  error?: string;
  discoveredCount: number;
  connectedCount: number;
}

class PrinterDiscoveryService {
  private discoveredPrinters: Map<string, PrinterDevice> = new Map();
  private discoveryStatus: PrinterDiscoveryStatus = {
    isScanning: false,
    isEnabled: false,
    discoveredCount: 0,
    connectedCount: 0,
  };
  private scanTimeout: NodeJS.Timeout | null = null;
  private discoveryListeners: Set<(printers: PrinterDevice[], status: PrinterDiscoveryStatus) => void> = new Set();
  private static readonly NEARBY_FRESHNESS_WINDOW_MS = 15000; // 15 seconds freshness window

  // Get discovered printers (initially show only likely printers; pairing is app-level)
  getDiscoveredPrinters(): PrinterDevice[] {
    const cutoff = Date.now() - PrinterDiscoveryService.NEARBY_FRESHNESS_WINDOW_MS;
    return Array.from(this.discoveredPrinters.values())
      .filter(printer => (
        (printer.status === 'available' && printer.lastSeen.getTime() >= cutoff) ||
        printer.connected
      ));
  }

  // Get discovery status
  getDiscoveryStatus(): PrinterDiscoveryStatus {
    return { ...this.discoveryStatus };
  }

  // Add discovery listener
  addDiscoveryListener(listener: (printers: PrinterDevice[], status: PrinterDiscoveryStatus) => void): () => void {
    this.discoveryListeners.add(listener);
    return () => this.discoveryListeners.delete(listener);
  }

  // Notify listeners
  private notifyListeners(): void {
    const printers = this.getDiscoveredPrinters();
    this.discoveryListeners.forEach(listener => listener(printers, this.discoveryStatus));
  }

  // Check if Bluetooth is supported and enabled
  async checkBluetoothSupport(): Promise<boolean> {
    try {
      if (!blePrinter.isSupported()) {
        this.discoveryStatus.error = 'Bluetooth printing not supported on this device';
        this.discoveryStatus.isEnabled = false;
        this.notifyListeners();
        return false;
      }

      const isEnabled = await blePrinter.isEnabled();
      this.discoveryStatus.isEnabled = isEnabled;
      this.discoveryStatus.error = isEnabled ? undefined : 'Bluetooth is disabled';
      this.notifyListeners();
      return isEnabled;
    } catch (error) {
      console.error('Bluetooth support check failed:', error);
      this.discoveryStatus.error = `Bluetooth check failed: ${error}`;
      this.discoveryStatus.isEnabled = false;
      this.notifyListeners();
      return false;
    }
  }

  // Request necessary permissions
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN as any,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT as any,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ];

      const results = await PermissionsAndroid.requestMultiple(permissions);
      const allGranted = Object.values(results).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        this.discoveryStatus.error = 'Required permissions not granted';
        this.notifyListeners();
      }

      return allGranted;
    } catch (error) {
      console.error('Permission request failed:', error);
      this.discoveryStatus.error = `Permission request failed: ${error}`;
      this.notifyListeners();
      return false;
    }
  }

  // Enable Bluetooth
  async enableBluetooth(): Promise<boolean> {
    try {
      const success = await blePrinter.enableBluetooth();
      this.discoveryStatus.isEnabled = success;
      this.discoveryStatus.error = success ? undefined : 'Failed to enable Bluetooth';
      this.notifyListeners();
      return success;
    } catch (error) {
      console.error('Failed to enable Bluetooth:', error);
      this.discoveryStatus.error = `Failed to enable Bluetooth: ${error}`;
      this.discoveryStatus.isEnabled = false;
      this.notifyListeners();
      return false;
    }
  }

  // Start discovering printers
  async startDiscovery(): Promise<void> {
    try {
      // Check if Bluetooth is enabled
      const isEnabled = await this.checkBluetoothSupport();
      if (!isEnabled) {
        throw new Error('Bluetooth is not enabled');
      }

      // Request permissions
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Required permissions not granted');
      }

      this.discoveryStatus.isScanning = true;
      this.discoveryStatus.error = undefined;
      this.notifyListeners();

      // Start scanning for devices
      const result = await blePrinter.scanDevices();
      
      // Preserve currently connected devices across a new scan
      const previouslyConnected = Array.from(this.discoveredPrinters.values()).filter(p => p.connected);
      // Reset the discovered list to reflect only real-time results while keeping connected ones
      this.discoveredPrinters.clear();
      previouslyConnected.forEach(p => this.discoveredPrinters.set(p.id, p));

      // Helper: RSSI may be missing on some stacks; treat presence as best-effort
      const hasValidRssi = (v: any) => typeof v === 'number' && isFinite(v);

      // Include paired (Bluetooth Classic) devices from this scan as candidates (some stacks only report classic here)
      const pairedDevices = (result.paired || [])
        .map((device: any) => this.createPrinterDevice({
          address: device.address || device.Address,
          name: device.name || device.Name || 'Unknown Printer',
          paired: true,
          rssi: device.rssi || device.RSSI,
          type: 'bluetooth_classic'
        }));

      // Process found devices (BLE) - include all live-discovered devices
      const foundDevices = (result.found || [])
        .map((device: any) => this.createPrinterDevice({
          address: device.address || device.Address,
          name: device.name || device.Name || 'Unknown Device',
          paired: false,
          rssi: device.rssi || device.RSSI,
          type: 'ble'
        }));

      // Merge and update printer registry
      const allDevices = [...pairedDevices, ...foundDevices];
      allDevices.forEach(device => {
        this.discoveredPrinters.set(device.id, device);
      });

      // Update status
      this.discoveryStatus.discoveredCount = this.discoveredPrinters.size;
      this.discoveryStatus.connectedCount = Array.from(this.discoveredPrinters.values())
        .filter(printer => printer.connected).length;

      // Load saved friendly names
      await this.loadFriendlyNames();

      this.notifyListeners();
    } catch (error) {
      console.error('Printer discovery failed:', error);
      this.discoveryStatus.error = `Discovery failed: ${error}`;
      this.discoveryStatus.isScanning = false;
      this.notifyListeners();
      throw error;
    } finally {
      this.discoveryStatus.isScanning = false;
      this.notifyListeners();
    }
  }

  // Create printer device object
  private createPrinterDevice(data: {
    address: string;
    name: string;
    paired: boolean;
    rssi?: number;
    type: 'bluetooth_classic' | 'ble';
  }): PrinterDevice {
    const id = `${data.type}_${data.address}`;
    
    return {
      id,
      name: data.name,
      address: data.address,
      type: data.type,
      paired: data.paired,
      connected: false,
      rssi: data.rssi,
      lastSeen: new Date(),
      capabilities: this.detectCapabilities(data.name, data.type),
      status: 'available',
    };
  }

  // Check if a device is likely a printer based on its name
  private isLikelyPrinter(deviceName: string): boolean {
    if (!deviceName) return false;
    
    const lowerName = deviceName.toLowerCase();
    
    // Common printer keywords
    const printerKeywords = [
      'printer', 'print', 'thermal', 'pos', 'receipt', 'ticket',
      'zebra', 'epson', 'star', 'citizen', 'bixolon', 'samsung',
      'hp', 'canon', 'brother', 'lexmark', 'xerox', 'ricoh',
      'label', 'barcode', 'escpos', 'pos-', 'pos_', 'pos ',
      'receipt printer', 'thermal printer', 'pos printer',
      'bluetooth printer', 'bt printer', 'bt-', 'bt_', 'bt '
    ];
    
    // Check if device name contains printer keywords
    const hasPrinterKeyword = printerKeywords.some(keyword => lowerName.includes(keyword));
    
    // Exclude common non-printer devices
    const nonPrinterKeywords = [
      'phone', 'mobile', 'headphone', 'headset', 'speaker', 'mouse',
      'keyboard', 'tablet', 'laptop', 'computer', 'pc', 'mac',
      'watch', 'band', 'fitness', 'camera', 'tv', 'remote',
      'car', 'vehicle', 'bike', 'bicycle', 'scooter'
    ];
    
    const isNonPrinter = nonPrinterKeywords.some(keyword => lowerName.includes(keyword));
    
    // If it has printer keywords and is not a non-printer device, it's likely a printer
    return hasPrinterKeyword && !isNonPrinter;
  }

  // Detect printer capabilities based on name and type
  private detectCapabilities(name: string, type: 'bluetooth_classic' | 'ble'): string[] {
    const capabilities: string[] = [];
    const lowerName = name.toLowerCase();

    // Basic printing capabilities
    capabilities.push('text_printing');
    
    // Check for thermal printer indicators
    if (lowerName.includes('thermal') || lowerName.includes('pos') || lowerName.includes('receipt')) {
      capabilities.push('thermal_printing');
      capabilities.push('receipt_printing');
    }

    // Check for specific printer brands/models
    if (lowerName.includes('zebra') || lowerName.includes('epson') || lowerName.includes('star')) {
      capabilities.push('label_printing');
      capabilities.push('high_quality');
    }

    // BLE printers typically support more features
    if (type === 'ble') {
      capabilities.push('low_energy');
      capabilities.push('extended_range');
    }

    // Bluetooth Classic printers
    if (type === 'bluetooth_classic') {
      capabilities.push('high_speed');
      capabilities.push('reliable_connection');
    }

    return capabilities;
  }

  // Set friendly name for a printer
  async setFriendlyName(printerId: string, friendlyName: string): Promise<void> {
    const printer = this.discoveredPrinters.get(printerId);
    if (printer) {
      printer.friendlyName = friendlyName;
      this.discoveredPrinters.set(printerId, printer);
      
      // Save to storage
      await this.saveFriendlyNames();
      this.notifyListeners();
    }
  }

  // Load friendly names from storage
  private async loadFriendlyNames(): Promise<void> {
    try {
      const savedNames = await AsyncStorage.getItem('printer_friendly_names');
      if (savedNames) {
        const friendlyNames: Record<string, string> = JSON.parse(savedNames);
        
        this.discoveredPrinters.forEach((printer, id) => {
          if (friendlyNames[id]) {
            printer.friendlyName = friendlyNames[id];
            this.discoveredPrinters.set(id, printer);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load friendly names:', error);
    }
  }

  // Save friendly names to storage
  private async saveFriendlyNames(): Promise<void> {
    try {
      const friendlyNames: Record<string, string> = {};
      this.discoveredPrinters.forEach((printer, id) => {
        if (printer.friendlyName) {
          friendlyNames[id] = printer.friendlyName;
        }
      });
      
      await AsyncStorage.setItem('printer_friendly_names', JSON.stringify(friendlyNames));
    } catch (error) {
      console.error('Failed to save friendly names:', error);
    }
  }

  // Update printer status
  updatePrinterStatus(printerId: string, status: PrinterDevice['status'], errorMessage?: string): void {
    const printer = this.discoveredPrinters.get(printerId);
    if (printer) {
      printer.status = status;
      printer.connected = status === 'connected';
      printer.errorMessage = errorMessage;
      printer.lastSeen = new Date();
      
      this.discoveredPrinters.set(printerId, printer);
      
      // Update connected count
      this.discoveryStatus.connectedCount = Array.from(this.discoveredPrinters.values())
        .filter(p => p.connected).length;
      
      this.notifyListeners();
    }
  }

  // Get printer by ID
  getPrinter(printerId: string): PrinterDevice | undefined {
    return this.discoveredPrinters.get(printerId);
  }

  // Clear all discovered printers
  clearDiscoveredPrinters(): void {
    this.discoveredPrinters.clear();
    this.discoveryStatus.discoveredCount = 0;
    this.discoveryStatus.connectedCount = 0;
    this.notifyListeners();
  }

  // Stop discovery
  stopDiscovery(): void {
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
    this.discoveryStatus.isScanning = false;
    this.notifyListeners();
  }

  // Test printer connection
  async testPrinterConnection(printerId: string): Promise<{ success: boolean; message: string }> {
    const printer = this.discoveredPrinters.get(printerId);
    if (!printer) {
      return { success: false, message: 'Printer not found' };
    }

    try {
      // Try to connect to the printer
      await blePrinter.connect(printer.address);
      
      // Test print a simple text
      await blePrinter.printText('\nTest Print\n');
      
      // Update printer status
      this.updatePrinterStatus(printerId, 'connected');
      
      return { success: true, message: 'Connection test successful' };
    } catch (error) {
      console.error('Printer connection test failed:', error);
      this.updatePrinterStatus(printerId, 'error', String(error));
      
      return { success: false, message: `Connection test failed: ${error}` };
    }
  }

  // Get printer display name (friendly name or original name)
  getPrinterDisplayName(printer: PrinterDevice): string {
    return printer.friendlyName || printer.name;
  }

  // Check if printer supports specific capability
  supportsCapability(printer: PrinterDevice, capability: string): boolean {
    return printer.capabilities.includes(capability);
  }

  // Get printers by type
  getPrintersByType(type: 'bluetooth_classic' | 'ble'): PrinterDevice[] {
    return Array.from(this.discoveredPrinters.values())
      .filter(printer => printer.type === type);
  }

  // Get connected printers
  getConnectedPrinters(): PrinterDevice[] {
    return Array.from(this.discoveredPrinters.values())
      .filter(printer => printer.connected);
  }

  // Get available printers (not connected but available)
  getAvailablePrinters(): PrinterDevice[] {
    return Array.from(this.discoveredPrinters.values())
      .filter(printer => printer.status === 'available' && !printer.connected);
  }

  // Manually add a printer (for devices that weren't auto-detected)
  addPrinterManually(deviceName: string, address: string, type: 'bluetooth_classic' | 'ble' = 'bluetooth_classic'): PrinterDevice {
    const printer = this.createPrinterDevice({
      address,
      name: deviceName,
      paired: false,
      type,
    });

    this.discoveredPrinters.set(printer.id, printer);
    this.discoveryStatus.discoveredCount = this.discoveredPrinters.size;
    this.notifyListeners();

    console.log(`📱 Manually added printer: ${deviceName} (${address})`);
    return printer;
  }

  // Get all devices (including non-printers) for manual selection
  async getAllDevices(): Promise<Array<{ name: string; address: string; paired: boolean; type: string }>> {
    try {
      const result = await blePrinter.scanDevices();
      const allDevices: Array<{ name: string; address: string; paired: boolean; type: string }> = [];

      // Add paired devices
      (result.paired || []).forEach((device: any) => {
        allDevices.push({
          name: device.name || device.Name || 'Unknown Device',
          address: device.address || device.Address,
          paired: true,
          type: 'bluetooth_classic'
        });
      });

      // Add found devices
      (result.found || []).forEach((device: any) => {
        allDevices.push({
          name: device.name || device.Name || 'Unknown Device',
          address: device.address || device.Address,
          paired: false,
          type: 'ble'
        });
      });

      return allDevices;
    } catch (error) {
      console.error('Failed to get all devices:', error);
      return [];
    }
  }
}

// Export singleton instance
export const printerDiscovery = new PrinterDiscoveryService();

