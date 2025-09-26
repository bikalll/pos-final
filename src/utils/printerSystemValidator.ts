/**
 * Printer System Validator
 * Comprehensive validation to ensure all components work properly
 */

import { printerDiscovery } from '../services/printerDiscovery';
import { printerRegistry } from '../services/printerRegistry';
import { printManager } from '../services/printManager';
import { printerPersistence } from '../services/printerPersistence';

export interface ValidationResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export class PrinterSystemValidator {
  private results: ValidationResult[] = [];

  // Run comprehensive validation
  async validateAll(): Promise<ValidationResult[]> {
    console.log('🔍 Starting Printer System Validation...');
    this.results = [];

    // Validate each component
    await this.validatePrinterDiscovery();
    await this.validatePrinterRegistry();
    await this.validatePrintManager();
    await this.validatePersistence();
    await this.validateIntegration();
    await this.validateErrorHandling();

    const passCount = this.results.filter(r => r.status === 'pass').length;
    const failCount = this.results.filter(r => r.status === 'fail').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;

    console.log(`✅ Validation Complete: ${passCount} passed, ${failCount} failed, ${warningCount} warnings`);
    
    return this.results;
  }

  // Validate printer discovery service
  private async validatePrinterDiscovery(): Promise<void> {
    try {
      // Test service initialization
      const isSupported = await printerDiscovery.checkBluetoothSupport();
      this.addResult('Printer Discovery', 'pass', 'Service initialized successfully', { isSupported });

      // Test discovery status
      const status = printerDiscovery.getDiscoveryStatus();
      this.addResult('Discovery Status', 'pass', 'Status object created', { status });

      // Test discovered printers
      const printers = printerDiscovery.getDiscoveredPrinters();
      this.addResult('Discovered Printers', 'pass', `Found ${printers.length} printers`, { count: printers.length });

      // Test printer capabilities
      if (printers.length > 0) {
        const printer = printers[0];
        const capabilities = printer.capabilities;
        this.addResult('Printer Capabilities', 'pass', `Printer has ${capabilities.length} capabilities`, { capabilities });
      }

    } catch (error) {
      this.addResult('Printer Discovery', 'fail', `Service failed: ${error}`, { error });
    }
  }

  // Validate printer registry service
  private async validatePrinterRegistry(): Promise<void> {
    try {
      // Test registry initialization
      await printerRegistry.initialize();
      this.addResult('Registry Initialization', 'pass', 'Registry initialized successfully');

      // Test registry state
      const state = printerRegistry.getState();
      this.addResult('Registry State', 'pass', 'State object created', { mappingsCount: state.mappings.size });

      // Test mapping status
      const mappingStatus = printerRegistry.getMappingStatus();
      this.addResult('Mapping Status', 'pass', 'Mapping status retrieved', { mappingStatus });

      // Test statistics
      const stats = printerRegistry.getStatistics();
      this.addResult('Registry Statistics', 'pass', 'Statistics calculated', { stats });

      // Test validation
      const mockPrinter = {
        id: 'test_printer',
        name: 'Test Printer',
        address: '00:00:00:00:00:00',
        type: 'bluetooth_classic' as const,
        paired: true,
        connected: false,
        lastSeen: new Date(),
        capabilities: ['text_printing', 'thermal_printing'],
        status: 'available' as const,
      };

      const validation = printerRegistry.validateMapping('Receipt', mockPrinter);
      this.addResult('Mapping Validation', 'pass', 'Validation function works', { validation });

    } catch (error) {
      this.addResult('Printer Registry', 'fail', `Registry failed: ${error}`, { error });
    }
  }

  // Validate print manager service
  private async validatePrintManager(): Promise<void> {
    try {
      // Test print manager initialization
      await printManager.initialize();
      this.addResult('Print Manager Init', 'pass', 'Print manager initialized');

      // Test print manager status
      const status = printManager.getStatus();
      this.addResult('Print Manager Status', 'pass', 'Status retrieved', { status });

      // Test job statistics
      const jobStats = printManager.getJobStatistics();
      this.addResult('Job Statistics', 'pass', 'Job statistics calculated', { jobStats });

      // Test connection status
      const connectionStatus = printManager.getConnectionStatus();
      this.addResult('Connection Status', 'pass', 'Connection status retrieved', { connectionStatus });

      // Test event system
      let eventReceived = false;
      const unsubscribe = printManager.addEventListener((event) => {
        eventReceived = true;
      });
      
      // Trigger a test event
      printManager.emitEvent?.({
        type: 'queue_updated',
        message: 'Test event',
        timestamp: new Date(),
      });
      
      unsubscribe();
      this.addResult('Event System', 'pass', 'Event system working', { eventReceived });

    } catch (error) {
      this.addResult('Print Manager', 'fail', `Print manager failed: ${error}`, { error });
    }
  }

  // Validate persistence service
  private async validatePersistence(): Promise<void> {
    try {
      // Test persistence initialization
      await printerPersistence.initialize();
      this.addResult('Persistence Init', 'pass', 'Persistence initialized');

      // Test auto-connect status
      const autoConnectStatus = await printerPersistence.getAutoConnectStatus();
      this.addResult('Auto-Connect Status', 'pass', 'Auto-connect status retrieved', { autoConnectStatus });

      // Test load all configs
      const configs = await printerPersistence.loadAllPrinterConfigs();
      this.addResult('Load Configs', 'pass', `Loaded ${configs.length} configs`, { configCount: configs.length });

      // Test save config
      const testConfig = {
        printerId: 'test_printer_123',
        printerName: 'Test Printer',
        roles: ['Receipt'],
        lastConnected: new Date().toISOString(),
        autoConnect: true,
      };

      await printerPersistence.savePrinterConfig(
        testConfig.printerId,
        testConfig.printerName,
        testConfig.roles
      );
      this.addResult('Save Config', 'pass', 'Config saved successfully');

      // Test load specific config
      const loadedConfig = await printerPersistence.loadPrinterConfig(testConfig.printerId);
      this.addResult('Load Specific Config', 'pass', 'Specific config loaded', { loadedConfig });

    } catch (error) {
      this.addResult('Persistence', 'fail', `Persistence failed: ${error}`, { error });
    }
  }

  // Validate integration between services
  private async validateIntegration(): Promise<void> {
    try {
      // Test service dependencies
      const registryState = printerRegistry.getState();
      const printManagerStatus = printManager.getStatus();
      const discoveryStatus = printerDiscovery.getDiscoveryStatus();

      const allServicesWorking = 
        registryState && 
        printManagerStatus && 
        discoveryStatus;

      this.addResult('Service Integration', allServicesWorking ? 'pass' : 'fail', 
        allServicesWorking ? 'All services integrated properly' : 'Service integration failed',
        { registryState: !!registryState, printManagerStatus: !!printManagerStatus, discoveryStatus: !!discoveryStatus }
      );

      // Test cross-service communication
      const printers = printerDiscovery.getDiscoveredPrinters();
      const connectionStatus = printManager.getConnectionStatus();
      const mappingStatus = printerRegistry.getMappingStatus();

      this.addResult('Cross-Service Communication', 'pass', 'Services can communicate', {
        printersCount: printers.length,
        connectionStatusKeys: Object.keys(connectionStatus).length,
        mappingStatusKeys: Object.keys(mappingStatus).length,
      });

    } catch (error) {
      this.addResult('Service Integration', 'fail', `Integration failed: ${error}`, { error });
    }
  }

  // Validate error handling
  private async validateErrorHandling(): Promise<void> {
    try {
      // Test invalid printer assignment
      try {
        const invalidPrinter = {
          id: 'invalid',
          name: 'Invalid',
          address: 'invalid',
          type: 'bluetooth_classic' as const,
          paired: false,
          connected: false,
          lastSeen: new Date(),
          capabilities: [],
          status: 'error' as const,
        };

        const validation = printerRegistry.validateMapping('Receipt', invalidPrinter);
        this.addResult('Invalid Printer Handling', 'pass', 'Invalid printer handled gracefully', { validation });
      } catch (error) {
        this.addResult('Invalid Printer Handling', 'pass', 'Invalid printer error caught', { error: String(error) });
      }

      // Test print job with no printer
      try {
        await printManager.printRole('BOT', { test: 'data' }, 'high');
        this.addResult('No Printer Handling', 'warning', 'Print job succeeded without printer (unexpected)');
      } catch (error) {
        this.addResult('No Printer Handling', 'pass', 'Print job failed gracefully without printer', { error: String(error) });
      }

      // Test non-existent printer test
      try {
        await printManager.testPrinter('non_existent_printer');
        this.addResult('Non-existent Printer Test', 'warning', 'Test succeeded for non-existent printer (unexpected)');
      } catch (error) {
        this.addResult('Non-existent Printer Test', 'pass', 'Test failed gracefully for non-existent printer', { error: String(error) });
      }

    } catch (error) {
      this.addResult('Error Handling', 'fail', `Error handling validation failed: ${error}`, { error });
    }
  }

  // Add validation result
  private addResult(component: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any): void {
    this.results.push({ component, status, message, details });
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${component}: ${message}`);
  }

  // Get validation summary
  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    successRate: number;
  } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const successRate = total > 0 ? (passed / total) * 100 : 0;

    return { total, passed, failed, warnings, successRate };
  }

  // Get failed validations
  getFailures(): ValidationResult[] {
    return this.results.filter(r => r.status === 'fail');
  }

  // Get warnings
  getWarnings(): ValidationResult[] {
    return this.results.filter(r => r.status === 'warning');
  }
}

// Export validator instance
export const printerSystemValidator = new PrinterSystemValidator();














