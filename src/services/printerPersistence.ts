import AsyncStorage from '@react-native-async-storage/async-storage';
import { printerDiscovery } from './printerDiscovery';
import { printerRegistry } from './printerRegistry';
import { printManager } from './printManager';

export interface SavedPrinterConfig {
  printerId: string;
  printerName: string;
  roles: string[];
  lastConnected: string;
  autoConnect: boolean;
}

export interface PrinterPersistenceState {
  savedPrinters: SavedPrinterConfig[];
  lastAutoConnect: string;
  autoConnectEnabled: boolean;
}

class PrinterPersistenceService {
  private static readonly STORAGE_KEY = 'printer_persistence_config';
  private static readonly AUTO_CONNECT_INTERVAL = 30000; // 30 seconds
  private autoConnectInterval: NodeJS.Timeout | null = null;

  // Save printer configuration
  async savePrinterConfig(printerId: string, printerName: string, roles: string[]): Promise<void> {
    try {
      const saved = await this.loadPersistenceState();
      const existingIndex = saved.savedPrinters.findIndex(p => p.printerId === printerId);
      
      const config: SavedPrinterConfig = {
        printerId,
        printerName,
        roles,
        lastConnected: new Date().toISOString(),
        autoConnect: true,
      };

      if (existingIndex >= 0) {
        saved.savedPrinters[existingIndex] = config;
      } else {
        saved.savedPrinters.push(config);
      }

      await this.savePersistenceState(saved);
      console.log(`💾 Saved printer config for ${printerName}`);
    } catch (error) {
      console.error('❌ Failed to save printer config:', error);
    }
  }

  // Load printer configuration
  async loadPrinterConfig(printerId: string): Promise<SavedPrinterConfig | null> {
    try {
      const saved = await this.loadPersistenceState();
      return saved.savedPrinters.find(p => p.printerId === printerId) || null;
    } catch (error) {
      console.error('❌ Failed to load printer config:', error);
      return null;
    }
  }

  // Load all saved printer configurations
  async loadAllPrinterConfigs(): Promise<SavedPrinterConfig[]> {
    try {
      const saved = await this.loadPersistenceState();
      return saved.savedPrinters;
    } catch (error) {
      console.error('❌ Failed to load printer configs:', error);
      return [];
    }
  }

  // Remove printer configuration
  async removePrinterConfig(printerId: string): Promise<void> {
    try {
      const saved = await this.loadPersistenceState();
      saved.savedPrinters = saved.savedPrinters.filter(p => p.printerId !== printerId);
      await this.savePersistenceState(saved);
      console.log(`🗑️ Removed printer config for ${printerId}`);
    } catch (error) {
      console.error('❌ Failed to remove printer config:', error);
    }
  }

  // Enable/disable auto-connect
  async setAutoConnectEnabled(enabled: boolean): Promise<void> {
    try {
      const saved = await this.loadPersistenceState();
      saved.autoConnectEnabled = enabled;
      await this.savePersistenceState(saved);
      
      if (enabled) {
        this.startAutoConnect();
      } else {
        this.stopAutoConnect();
      }
      
      console.log(`🔄 Auto-connect ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('❌ Failed to set auto-connect:', error);
    }
  }

  // Start auto-connect process
  startAutoConnect(): void {
    if (this.autoConnectInterval) {
      clearInterval(this.autoConnectInterval);
    }

    this.autoConnectInterval = setInterval(async () => {
      await this.performAutoConnect();
    }, PrinterPersistenceService.AUTO_CONNECT_INTERVAL);

    console.log('🔄 Auto-connect started');
  }

  // Stop auto-connect process
  stopAutoConnect(): void {
    if (this.autoConnectInterval) {
      clearInterval(this.autoConnectInterval);
      this.autoConnectInterval = null;
    }
    console.log('🛑 Auto-connect stopped');
  }

  // Perform auto-connect for saved printers
  private async performAutoConnect(): Promise<void> {
    try {
      const saved = await this.loadPersistenceState();
      if (!saved.autoConnectEnabled) return;

      const savedPrinters = saved.savedPrinters.filter(p => p.autoConnect);
      if (savedPrinters.length === 0) return;

      // Check if any saved printers are disconnected
      const disconnectedPrinters = savedPrinters.filter(config => {
        const printer = printerDiscovery.getPrinter(config.printerId);
        return printer && !printer.connected;
      });

      if (disconnectedPrinters.length === 0) return;

      console.log(`🔄 Auto-connecting to ${disconnectedPrinters.length} disconnected printers...`);

      // Try to reconnect to disconnected printers
      for (const config of disconnectedPrinters) {
        try {
          const printer = printerDiscovery.getPrinter(config.printerId);
          if (printer) {
            await printManager.reconnectPrinter(config.printerId);
            console.log(`✅ Auto-reconnected to ${config.printerName}`);
          }
        } catch (error) {
          console.warn(`⚠️ Auto-reconnect failed for ${config.printerName}:`, error);
        }
      }

      // Update last auto-connect time
      saved.lastAutoConnect = new Date().toISOString();
      await this.savePersistenceState(saved);
    } catch (error) {
      console.error('❌ Auto-connect failed:', error);
    }
  }

  // Restore printer assignments from saved configuration
  async restorePrinterAssignments(): Promise<void> {
    try {
      console.log('🔄 Restoring printer assignments...');
      
      const saved = await this.loadPersistenceState();
      const savedPrinters = saved.savedPrinters;
      
      if (savedPrinters.length === 0) {
        console.log('ℹ️ No saved printer assignments to restore');
        return;
      }

      // Start discovery to find printers
      await printerDiscovery.startDiscovery();
      
      // Restore each saved printer assignment
      for (const config of savedPrinters) {
        try {
          const printer = printerDiscovery.getPrinter(config.printerId);
          if (printer) {
            // Assign printer to each role
            for (const role of config.roles) {
              await printerRegistry.setPrinterMapping(role as any, printer, true);
            }
            
            // Try to connect
            await printManager.reconnectPrinter(config.printerId);
            
            console.log(`✅ Restored ${config.printerName} for roles: ${config.roles.join(', ')}`);
          } else {
            console.warn(`⚠️ Printer ${config.printerName} not found during restore`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to restore ${config.printerName}:`, error);
        }
      }
      
      console.log('✅ Printer assignments restored');
    } catch (error) {
      console.error('❌ Failed to restore printer assignments:', error);
    }
  }

  // Get persistence state
  private async loadPersistenceState(): Promise<PrinterPersistenceState> {
    try {
      const saved = await AsyncStorage.getItem(PrinterPersistenceService.STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('❌ Failed to load persistence state:', error);
    }
    
    return {
      savedPrinters: [],
      lastAutoConnect: '',
      autoConnectEnabled: true,
    };
  }

  // Save persistence state
  private async savePersistenceState(state: PrinterPersistenceState): Promise<void> {
    try {
      await AsyncStorage.setItem(PrinterPersistenceService.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('❌ Failed to save persistence state:', error);
    }
  }

  // Get auto-connect status
  async getAutoConnectStatus(): Promise<{
    enabled: boolean;
    lastAutoConnect?: string;
    savedPrintersCount: number;
  }> {
    try {
      const saved = await this.loadPersistenceState();
      return {
        enabled: saved.autoConnectEnabled,
        lastAutoConnect: saved.lastAutoConnect || undefined,
        savedPrintersCount: saved.savedPrinters.length,
      };
    } catch (error) {
      console.error('❌ Failed to get auto-connect status:', error);
      return {
        enabled: false,
        savedPrintersCount: 0,
      };
    }
  }

  // Clear all saved configurations
  async clearAllConfigs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PrinterPersistenceService.STORAGE_KEY);
      this.stopAutoConnect();
      console.log('🗑️ All printer configurations cleared');
    } catch (error) {
      console.error('❌ Failed to clear configurations:', error);
    }
  }

  // Initialize the persistence service
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing printer persistence...');
      
      // Load auto-connect settings
      const status = await this.getAutoConnectStatus();
      
      if (status.enabled) {
        this.startAutoConnect();
      }
      
      // Restore printer assignments
      await this.restorePrinterAssignments();
      
      console.log('✅ Printer persistence initialized');
    } catch (error) {
      console.error('❌ Failed to initialize printer persistence:', error);
    }
  }
}

// Export singleton instance
export const printerPersistence = new PrinterPersistenceService();


