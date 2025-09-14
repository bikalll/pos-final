import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { blePrinter } from './blePrinter';
import { bluetoothManager } from './bluetoothManager';

export interface DebugInfo {
  moduleSupported: boolean;
  moduleError?: string;
  bluetoothEnabled: boolean;
  permissionsGranted: boolean;
  deviceConnected: boolean;
  currentDevice?: any;
  connectionStatus: any;
  lastError?: string;
  deviceList: any[];
}

class BluetoothDebugger {
  private debugLog: string[] = [];

  // Add debug message
  private log(message: string) {
    const timestamp = new Date().toISOString();
    this.debugLog.push(`[${timestamp}] ${message}`);
    console.log(`[BluetoothDebug] ${message}`);
  }

  // Get all debug logs
  getDebugLog(): string[] {
    return [...this.debugLog];
  }

  // Clear debug logs
  clearDebugLog(): void {
    this.debugLog = [];
  }

  // Comprehensive diagnostic check
  async runDiagnostics(): Promise<DebugInfo> {
    this.log('Starting Bluetooth diagnostics...');
    
    const debugInfo: DebugInfo = {
      moduleSupported: false,
      bluetoothEnabled: false,
      permissionsGranted: false,
      deviceConnected: false,
      deviceList: [],
      connectionStatus: {}
    };

    try {
      // 1. Check module support
      this.log('Checking module support...');
      const moduleStatus = blePrinter.getModuleStatus();
      debugInfo.moduleSupported = moduleStatus.supported;
      debugInfo.moduleError = moduleStatus.error;
      
      if (!moduleStatus.supported) {
        this.log(`Module not supported: ${moduleStatus.error}`);
        return debugInfo;
      }
      this.log('Module is supported');

      // 2. Check Bluetooth enabled
      this.log('Checking Bluetooth status...');
      debugInfo.bluetoothEnabled = await blePrinter.isEnabled();
      this.log(`Bluetooth enabled: ${debugInfo.bluetoothEnabled}`);

      // 3. Check permissions
      this.log('Checking permissions...');
      debugInfo.permissionsGranted = await this.checkPermissions();
      this.log(`Permissions granted: ${debugInfo.permissionsGranted}`);

      // 4. Get current connection status
      this.log('Getting connection status...');
      const status = bluetoothManager.getStatus();
      debugInfo.deviceConnected = status.connected;
      debugInfo.currentDevice = status.currentDevice;
      debugInfo.lastError = status.error;
      this.log(`Device connected: ${status.connected}`);
      if (status.error) {
        this.log(`Last error: ${status.error}`);
      }

      // 5. Get device list
      this.log('Getting device list...');
      debugInfo.deviceList = bluetoothManager.getDevices();
      this.log(`Found ${debugInfo.deviceList.length} devices`);

      // 6. Test connection if connected
      if (status.connected) {
        this.log('Testing connection...');
        try {
          const testResult = await bluetoothManager.testConnection();
          this.log(`Connection test result: ${testResult}`);
          debugInfo.connectionStatus = { testResult };
        } catch (error) {
          this.log(`Connection test failed: ${error}`);
          debugInfo.connectionStatus = { testResult: false, error: String(error) };
        }
      }

    } catch (error) {
      this.log(`Diagnostic error: ${error}`);
      debugInfo.lastError = String(error);
    }

    this.log('Diagnostics completed');
    return debugInfo;
  }

  // Check all required permissions
  private async checkPermissions(): Promise<boolean> {
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

      this.log(`Permission results: ${JSON.stringify(results)}`);
      return allGranted;
    } catch (error) {
      this.log(`Permission check error: ${error}`);
      return false;
    }
  }

  // Enhanced test print with detailed error reporting
  async testPrintWithDebug(): Promise<{ success: boolean; error?: string; details: any }> {
    this.log('Starting enhanced test print...');
    
    const result = {
      success: false,
      error: undefined as string | undefined,
      details: {}
    };

    try {
      // Check module support
      if (!blePrinter.isSupported()) {
        const error = 'Bluetooth module not supported';
        this.log(error);
        result.error = error;
        return result;
      }

      // Check connection
      const status = bluetoothManager.getStatus();
      if (!status.connected) {
        const error = 'No device connected';
        this.log(error);
        result.error = error;
        return result;
      }

      // Try to print with detailed error catching
      this.log('Attempting to print test text...');
      
      // Step 1: Initialize printer
      this.log('Step 1: Initializing printer...');
      await blePrinter.printText('Test Print\n');
      this.log('Test print completed successfully');

      result.success = true;
      this.log('Test print completed successfully');
      
    } catch (error) {
      const errorMessage = String(error);
      this.log(`Test print failed: ${errorMessage}`);
      result.error = errorMessage;
      result.details = {
        moduleSupported: blePrinter.isSupported(),
        connected: bluetoothManager.getStatus().connected,
        currentDevice: bluetoothManager.getStatus().currentDevice
      };
    }

    return result;
  }

  // Get detailed connection info
  async getConnectionDetails(): Promise<any> {
    this.log('Getting connection details...');
    
    const status = bluetoothManager.getStatus();
    const moduleStatus = blePrinter.getModuleStatus();
    
    return {
      module: {
        supported: moduleStatus.supported,
        error: moduleStatus.error
      },
      bluetooth: {
        enabled: await blePrinter.isEnabled(),
        connected: status.connected,
        currentDevice: status.currentDevice,
        error: status.error
      },
      permissions: await this.checkPermissions(),
      devices: bluetoothManager.getDevices()
    };
  }

  // Force reconnect to device
  async forceReconnect(deviceAddress: string): Promise<{ success: boolean; error?: string }> {
    this.log(`Force reconnecting to device: ${deviceAddress}`);
    
    try {
      // Disconnect first
      await bluetoothManager.disconnect();
      this.log('Disconnected from current device');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Find device
      const devices = bluetoothManager.getDevices();
      const device = devices.find(d => d.address === deviceAddress);
      
      if (!device) {
        const error = 'Device not found in device list';
        this.log(error);
        return { success: false, error };
      }
      
      // Connect
      await bluetoothManager.connectToDevice(device);
      this.log('Reconnected successfully');
      
      return { success: true };
    } catch (error) {
      const errorMessage = String(error);
      this.log(`Force reconnect failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }
}

export const bluetoothDebugger = new BluetoothDebugger();
