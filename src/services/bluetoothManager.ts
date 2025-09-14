import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { blePrinter } from './blePrinter';

export interface BluetoothDevice {
  address: string;
  name: string;
  paired: boolean;
  connected?: boolean;
  rssi?: number;
}

export interface BluetoothStatus {
  enabled: boolean;
  scanning: boolean;
  connected: boolean;
  currentDevice?: BluetoothDevice;
  error?: string;
}

class BluetoothManager {
  private status: BluetoothStatus = {
    enabled: false,
    scanning: false,
    connected: false,
  };

  private devices: BluetoothDevice[] = [];
  private connectionTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  // Get current status
  getStatus(): BluetoothStatus {
    return { ...this.status };
  }

  // Get all discovered devices
  getDevices(): BluetoothDevice[] {
    return [...this.devices];
  }

  // Check if Bluetooth is supported and available
  async isSupported(): Promise<boolean> {
    try {
      return await blePrinter.isSupported();
    } catch (error) {
      console.error('Failed to check Bluetooth support:', error);
      return false;
    }
  }

  // Request all necessary permissions
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
        const deniedPermissions = Object.entries(results)
          .filter(([_, result]) => result !== PermissionsAndroid.RESULTS.GRANTED)
          .map(([permission]) => permission);
        
        console.warn('Some Bluetooth permissions were denied:', deniedPermissions);
        
        Alert.alert(
          'Permissions Required',
          'Bluetooth and Location permissions are required for printer functionality. Please grant all permissions in settings.',
          [{ text: 'OK' }]
        );
      }

      return allGranted;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  // Check if Bluetooth is enabled
  async checkBluetoothStatus(): Promise<boolean> {
    try {
      const enabled = await blePrinter.isEnabled();
      this.status.enabled = enabled;
      
      if (!enabled) {
        this.status.error = 'Bluetooth is disabled';
        this.status.connected = false; // Reset connection if Bluetooth is disabled
      } else {
        this.status.error = undefined;
      }
      
      return enabled;
    } catch (error) {
      console.error('Failed to check Bluetooth status:', error);
      this.status.enabled = false;
      this.status.error = 'Failed to check Bluetooth status';
      this.status.connected = false;
      return false;
    }
  }

  // Enable Bluetooth
  async enableBluetooth(): Promise<boolean> {
    try {
      const success = await blePrinter.enableBluetooth();
      if (success) {
        this.status.enabled = true;
        this.status.error = undefined;
      } else {
        this.status.error = 'Failed to enable Bluetooth';
      }
      return success;
    } catch (error) {
      console.error('Failed to enable Bluetooth:', error);
      this.status.error = 'Failed to enable Bluetooth';
      return false;
    }
  }

  // Scan for Bluetooth devices
  async scanDevices(): Promise<BluetoothDevice[]> {
    try {
      if (!this.status.enabled) {
        const enabled = await this.checkBluetoothStatus();
        if (!enabled) {
          throw new Error('Bluetooth is not enabled');
        }
      }

      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Required permissions not granted');
      }

      this.status.scanning = true;
      this.status.error = undefined;

      const result = await blePrinter.scanDevices();
      
      // Process paired devices
      const pairedDevices = (result.paired || []).map((device: any) => ({
        address: device.address || device.Address,
        name: device.name || device.Name || 'Unknown Device',
        paired: true,
        rssi: device.rssi || device.RSSI,
      }));

      // Process found devices
      const foundDevices = (result.found || []).map((device: any) => ({
        address: device.address || device.Address,
        name: device.name || device.Name || 'Unknown Device',
        paired: false,
        rssi: device.rssi || device.RSSI,
      }));

      // Merge and deduplicate devices
      const allDevices = [...pairedDevices, ...foundDevices];
      this.devices = allDevices.filter((device, index, self) => 
        index === self.findIndex(d => d.address === device.address)
      );

      return this.devices;
    } catch (error) {
      console.error('Device scan failed:', error);
      this.status.error = `Failed to scan for devices: ${error}`;
      throw error;
    } finally {
      this.status.scanning = false;
    }
  }

  // Connect to a Bluetooth device
  async connectToDevice(device: BluetoothDevice): Promise<boolean> {
    if (!this.status.enabled) {
      const enabled = await this.checkBluetoothStatus();
      if (!enabled) {
        throw new Error('Bluetooth is not enabled');
      }
    }

    try {
      this.status.error = undefined;
      
      // Disconnect from current device if connected
      if (this.status.connected && this.status.currentDevice) {
        await this.disconnect();
      }

      // Set connection timeout
      const connectionPromise = new Promise<boolean>((resolve, reject) => {
        this.connectionTimeout = setTimeout(() => {
          reject(new Error('Connection timeout - device may be out of range or turned off'));
        }, 15000); // 15 second timeout

        blePrinter.connect(device.address)
          .then(() => {
            if (this.connectionTimeout) {
              clearTimeout(this.connectionTimeout);
              this.connectionTimeout = null;
            }
            resolve(true);
          })
          .catch(reject);
      });

      const connected = await connectionPromise;
      
      if (connected) {
        this.status.connected = true;
        this.status.currentDevice = { ...device, connected: true };
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        
        // Update device in list
        const deviceIndex = this.devices.findIndex(d => d.address === device.address);
        if (deviceIndex !== -1) {
          this.devices[deviceIndex].connected = true;
        }

        console.log(`Successfully connected to printer: ${device.name} (${device.address})`);
      }

      return connected;
    } catch (error) {
      console.error('Connection failed:', error);
      this.status.error = `Failed to connect: ${error}`;
      this.status.connected = false;
      this.status.currentDevice = undefined;
      
      // Increment reconnect attempts
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`Connection attempt ${this.reconnectAttempts} failed, will retry...`);
      }
      
      throw error;
    }
  }

  // Disconnect from current device
  async disconnect(): Promise<void> {
    try {
      if (this.status.connected) {
        await blePrinter.disconnect();
        console.log('Disconnected from printer');
      }
    } catch (error) {
      console.warn('Error during disconnect:', error);
    } finally {
      this.status.connected = false;
      this.status.currentDevice = undefined;
      
      // Update device in list
      this.devices.forEach(device => {
        device.connected = false;
      });

      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
    }
  }

  // Print text to connected device
  async printText(text: string): Promise<void> {
    if (!this.status.connected) {
      throw new Error('No device connected. Please connect a printer first.');
    }

    try {
      await blePrinter.printText(text);
      console.log('Text printed successfully');
    } catch (error) {
      console.error('Print failed:', error);
      this.status.error = `Print failed: ${error}`;
      
      // Check if connection is still valid
      if (error.toString().includes('connection') || error.toString().includes('device')) {
        console.warn('Connection may be lost, attempting to reconnect...');
        this.status.connected = false;
        this.status.currentDevice = undefined;
      }
      
      throw error;
    }
  }

  // Print receipt to connected device
  async printReceipt(receiptData: any): Promise<void> {
    if (!this.status.connected) {
      throw new Error('No device connected. Please connect a printer first.');
    }

    try {
      await blePrinter.printReceipt(receiptData);
      console.log('Receipt printed successfully');
    } catch (error) {
      console.error('Receipt print failed:', error);
      this.status.error = `Receipt print failed: ${error}`;
      
      // Check if connection is still valid
      if (error.toString().includes('connection') || error.toString().includes('device')) {
        console.warn('Connection may be lost, attempting to reconnect...');
        this.status.connected = false;
        this.status.currentDevice = undefined;
      }
      
      throw error;
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    if (!this.status.connected) {
      return false;
    }

    try {
      await blePrinter.printText('Test Print\n');
      console.log('Connection test successful');
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      this.status.error = `Connection test failed: ${error}`;
      
      // Mark as disconnected if test fails
      this.status.connected = false;
      this.status.currentDevice = undefined;
      
      return false;
    }
  }

  // Get module status
  getModuleStatus() {
    return blePrinter.getModuleStatus();
  }

  // Clear error
  clearError(): void {
    this.status.error = undefined;
  }

  // Reset manager state
  reset(): void {
    this.status = {
      enabled: false,
      scanning: false,
      connected: false,
    };
    this.devices = [];
    this.reconnectAttempts = 0;
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  // Get connection health status
  getConnectionHealth(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!this.status.enabled) {
      issues.push('Bluetooth is disabled');
    }
    
    if (!this.status.connected) {
      issues.push('No printer connected');
    }
    
    if (this.status.error) {
      issues.push(this.status.error);
    }
    
    if (this.reconnectAttempts > 0) {
      issues.push(`Connection attempts: ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  }
}

// Export singleton instance
export const bluetoothManager = new BluetoothManager();

