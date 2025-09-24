import AsyncStorage from '@react-native-async-storage/async-storage';
import { PrinterDevice } from './printerDiscovery';

export type PrinterRole = 'BOT' | 'KOT' | 'Receipt';

export interface PrinterMapping {
  role: PrinterRole;
  printerId: string;
  printerName: string;
  enabled: boolean;
  lastUsed?: Date;
}

export interface PrinterRegistryState {
  mappings: Map<PrinterRole, PrinterMapping>;
  defaultPrinter?: string;
  autoConnect: boolean;
  retryAttempts: number;
  maxRetryAttempts: number;
}

class PrinterRegistryService {
  private state: PrinterRegistryState = {
    mappings: new Map(),
    autoConnect: true,
    retryAttempts: 0,
    maxRetryAttempts: 3,
  };

  private listeners: Set<(state: PrinterRegistryState) => void> = new Set();

  // Initialize registry from storage
  async initialize(): Promise<void> {
    try {
      const savedState = await AsyncStorage.getItem('printer_registry');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        
        // Restore mappings
        this.state.mappings = new Map();
        if (parsed.mappings) {
          Object.entries(parsed.mappings).forEach(([role, mapping]: [string, any]) => {
            this.state.mappings.set(role as PrinterRole, {
              ...mapping,
              lastUsed: mapping.lastUsed ? new Date(mapping.lastUsed) : undefined,
            });
          });
        }
        
        this.state.defaultPrinter = parsed.defaultPrinter;
        this.state.autoConnect = parsed.autoConnect ?? true;
        this.state.retryAttempts = parsed.retryAttempts ?? 0;
        this.state.maxRetryAttempts = parsed.maxRetryAttempts ?? 3;
      }
      
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to initialize printer registry:', error);
    }
  }

  // Add listener for registry changes
  addListener(listener: (state: PrinterRegistryState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Save state to storage
  private async saveState(): Promise<void> {
    try {
      const stateToSave = {
        mappings: Object.fromEntries(this.state.mappings),
        defaultPrinter: this.state.defaultPrinter,
        autoConnect: this.state.autoConnect,
        retryAttempts: this.state.retryAttempts,
        maxRetryAttempts: this.state.maxRetryAttempts,
      };
      
      await AsyncStorage.setItem('printer_registry', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save printer registry:', error);
    }
  }

  // Get current state
  getState(): PrinterRegistryState {
    return { ...this.state };
  }

  // Set printer mapping for a role
  async setPrinterMapping(role: PrinterRole, printer: PrinterDevice, enabled: boolean = true): Promise<void> {
    const mapping: PrinterMapping = {
      role,
      printerId: printer.id,
      printerName: printer.friendlyName || printer.name,
      enabled,
      lastUsed: new Date(),
    };

    this.state.mappings.set(role, mapping);
    this.notifyListeners();
    await this.saveState();
    
    // Save printer configuration for persistence (avoid circular import)
    try {
      const { printerPersistence } = await import('./printerPersistence');
      const allRoles = Array.from(this.state.mappings.values())
        .filter(m => m.printerId === printer.id && m.enabled)
        .map(m => m.role);
      
      await printerPersistence.savePrinterConfig(printer.id, printer.friendlyName || printer.name, allRoles);
    } catch (error) {
      console.warn('Failed to save printer persistence config:', error);
    }
    
    // Also save connection preferences (avoid circular import)
    try {
      const { printManager } = await import('./printManager');
      await printManager.saveConnectionPreferences();
    } catch (error) {
      console.warn('Failed to save connection preferences:', error);
    }
  }

  // Remove printer mapping for a role
  async removePrinterMapping(role: PrinterRole): Promise<void> {
    this.state.mappings.delete(role);
    this.notifyListeners();
    await this.saveState();
  }

  // Get printer mapping for a role
  getPrinterMapping(role: PrinterRole): PrinterMapping | undefined {
    return this.state.mappings.get(role);
  }

  // Get all printer mappings
  getAllMappings(): PrinterMapping[] {
    return Array.from(this.state.mappings.values());
  }

  // Check if a role has a printer assigned
  hasPrinterAssigned(role: PrinterRole): boolean {
    const mapping = this.state.mappings.get(role);
    return mapping ? mapping.enabled : false;
  }

  // Get printer ID for a role
  getPrinterIdForRole(role: PrinterRole): string | undefined {
    const mapping = this.state.mappings.get(role);
    return mapping?.enabled ? mapping.printerId : undefined;
  }

  // Enable/disable printer mapping
  async setMappingEnabled(role: PrinterRole, enabled: boolean): Promise<void> {
    const mapping = this.state.mappings.get(role);
    if (mapping) {
      mapping.enabled = enabled;
      this.state.mappings.set(role, mapping);
      this.notifyListeners();
      await this.saveState();
    }
  }

  // Set default printer
  async setDefaultPrinter(printerId: string): Promise<void> {
    this.state.defaultPrinter = printerId;
    this.notifyListeners();
    await this.saveState();
  }

  // Get default printer
  getDefaultPrinter(): string | undefined {
    return this.state.defaultPrinter;
  }

  // Set auto-connect setting
  async setAutoConnect(enabled: boolean): Promise<void> {
    this.state.autoConnect = enabled;
    this.notifyListeners();
    await this.saveState();
  }

  // Get auto-connect setting
  getAutoConnect(): boolean {
    return this.state.autoConnect;
  }

  // Update last used time for a role
  async updateLastUsed(role: PrinterRole): Promise<void> {
    const mapping = this.state.mappings.get(role);
    if (mapping) {
      mapping.lastUsed = new Date();
      this.state.mappings.set(role, mapping);
      this.notifyListeners();
      await this.saveState();
    }
  }

  // Get roles that use a specific printer
  getRolesForPrinter(printerId: string): PrinterRole[] {
    const roles: PrinterRole[] = [];
    this.state.mappings.forEach((mapping, role) => {
      if (mapping.printerId === printerId && mapping.enabled) {
        roles.push(role);
      }
    });
    return roles;
  }

  // Check if printer is used by any role
  isPrinterInUse(printerId: string): boolean {
    return this.getRolesForPrinter(printerId).length > 0;
  }

  // Get printer usage summary
  getPrinterUsageSummary(): Record<string, { roles: PrinterRole[]; lastUsed?: Date }> {
    const summary: Record<string, { roles: PrinterRole[]; lastUsed?: Date }> = {};
    
    this.state.mappings.forEach((mapping, role) => {
      if (mapping.enabled) {
        if (!summary[mapping.printerId]) {
          summary[mapping.printerId] = { roles: [], lastUsed: mapping.lastUsed };
        }
        summary[mapping.printerId].roles.push(role);
        
        // Update last used to the most recent
        if (mapping.lastUsed && (!summary[mapping.printerId].lastUsed || mapping.lastUsed > summary[mapping.printerId].lastUsed!)) {
          summary[mapping.printerId].lastUsed = mapping.lastUsed;
        }
      }
    });
    
    return summary;
  }

  // Increment retry attempts
  incrementRetryAttempts(): void {
    this.state.retryAttempts++;
    this.notifyListeners();
  }

  // Reset retry attempts
  resetRetryAttempts(): void {
    this.state.retryAttempts = 0;
    this.notifyListeners();
  }

  // Check if max retry attempts reached
  hasReachedMaxRetries(): boolean {
    return this.state.retryAttempts >= this.state.maxRetryAttempts;
  }

  // Set max retry attempts
  async setMaxRetryAttempts(maxAttempts: number): Promise<void> {
    this.state.maxRetryAttempts = maxAttempts;
    this.notifyListeners();
    await this.saveState();
  }

  // Get printer mapping status for all roles
  getMappingStatus(): Record<PrinterRole, { assigned: boolean; printerName?: string; enabled: boolean }> {
    const status: Record<PrinterRole, { assigned: boolean; printerName?: string; enabled: boolean }> = {
      BOT: { assigned: false, enabled: false },
      KOT: { assigned: false, enabled: false },
      Receipt: { assigned: false, enabled: false },
    };

    this.state.mappings.forEach((mapping, role) => {
      status[role] = {
        assigned: true,
        printerName: mapping.printerName,
        enabled: mapping.enabled,
      };
    });

    return status;
  }

  // Clear all mappings
  async clearAllMappings(): Promise<void> {
    this.state.mappings.clear();
    this.state.defaultPrinter = undefined;
    this.state.retryAttempts = 0;
    this.notifyListeners();
    await this.saveState();
  }

  // Get available roles (roles without printer assignments)
  getAvailableRoles(): PrinterRole[] {
    const allRoles: PrinterRole[] = ['BOT', 'KOT', 'Receipt'];
    return allRoles.filter(role => !this.hasPrinterAssigned(role));
  }

  // Get assigned roles (roles with printer assignments)
  getAssignedRoles(): PrinterRole[] {
    return Array.from(this.state.mappings.keys());
  }

  // Validate printer mapping
  validateMapping(role: PrinterRole, printer: PrinterDevice): { valid: boolean; message?: string } {
    // Check if printer supports required capabilities
    const requiredCapabilities = this.getRequiredCapabilities(role);
    const missingCapabilities = requiredCapabilities.filter(
      capability => !printer.capabilities.includes(capability)
    );

    if (missingCapabilities.length > 0) {
      return {
        valid: false,
        message: `Printer does not support required capabilities: ${missingCapabilities.join(', ')}`,
      };
    }

    // Allow the same printer to be assigned to multiple roles.
    // Exclusivity (a role only assigned to one printer) is naturally enforced by setPrinterMapping per role.

    return { valid: true };
  }

  // Get required capabilities for a role
  private getRequiredCapabilities(role: PrinterRole): string[] {
    // Relax requirements so unknown/printer-generic devices can still be assigned.
    // All roles require at least basic text printing; thermal/receipt features are handled at print time.
    const capabilities: Record<PrinterRole, string[]> = {
      BOT: ['text_printing'],
      KOT: ['text_printing'],
      Receipt: ['text_printing'],
    };

    return capabilities[role] || [];
  }

  // Get printer statistics
  getStatistics(): {
    totalMappings: number;
    enabledMappings: number;
    disabledMappings: number;
    uniquePrinters: number;
    mostUsedRole?: PrinterRole;
  } {
    const mappings = Array.from(this.state.mappings.values());
    const enabledMappings = mappings.filter(m => m.enabled);
    const uniquePrinters = new Set(mappings.map(m => m.printerId)).size;
    
    // Find most used role
    let mostUsedRole: PrinterRole | undefined;
    let maxUsage = 0;
    
    this.state.mappings.forEach((mapping, role) => {
      if (mapping.lastUsed) {
        const daysSinceLastUsed = (Date.now() - mapping.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastUsed < 7) { // Used within last week
          const usage = 7 - daysSinceLastUsed;
          if (usage > maxUsage) {
            maxUsage = usage;
            mostUsedRole = role;
          }
        }
      }
    });

    return {
      totalMappings: mappings.length,
      enabledMappings: enabledMappings.length,
      disabledMappings: mappings.length - enabledMappings.length,
      uniquePrinters,
      mostUsedRole,
    };
  }
}

// Export singleton instance
export const printerRegistry = new PrinterRegistryService();
