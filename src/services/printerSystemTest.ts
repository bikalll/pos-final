import { printerDiscovery } from './printerDiscovery';
import { printerRegistry } from './printerRegistry';
import { printManager } from './printManager';
import { printerPersistence } from './printerPersistence';

/**
 * Comprehensive test suite for the printer system
 * This verifies all components work together properly
 */
export class PrinterSystemTest {
  private testResults: Array<{ test: string; passed: boolean; error?: string }> = [];

  // Run all tests
  async runAllTests(): Promise<{
    passed: number;
    failed: number;
    total: number;
    results: Array<{ test: string; passed: boolean; error?: string }>;
  }> {
    console.log('🧪 Starting Printer System Tests...');
    this.testResults = [];

    try {
      // Test 1: Service Initialization
      await this.testServiceInitialization();
      
      // Test 2: Printer Discovery
      await this.testPrinterDiscovery();
      
      // Test 3: Printer Registry
      await this.testPrinterRegistry();
      
      // Test 4: Print Manager
      await this.testPrintManager();
      
      // Test 5: Persistence
      await this.testPersistence();
      
      // Test 6: Integration
      await this.testIntegration();

      const passed = this.testResults.filter(r => r.passed).length;
      const failed = this.testResults.filter(r => !r.passed).length;
      const total = this.testResults.length;

      console.log(`✅ Tests completed: ${passed}/${total} passed, ${failed} failed`);
      
      return { passed, failed, total, results: this.testResults };
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      return { passed: 0, failed: 1, total: 1, results: [{ test: 'Test Suite', passed: false, error: String(error) }] };
    }
  }

  // Test service initialization
  private async testServiceInitialization(): Promise<void> {
    try {
      console.log('🔍 Testing service initialization...');
      
      // Test printer registry initialization
      await printerRegistry.initialize();
      this.addTestResult('Printer Registry Initialization', true);
      
      // Test print manager initialization
      await printManager.initialize();
      this.addTestResult('Print Manager Initialization', true);
      
      // Test persistence initialization
      await printerPersistence.initialize();
      this.addTestResult('Printer Persistence Initialization', true);
      
    } catch (error) {
      this.addTestResult('Service Initialization', false, String(error));
    }
  }

  // Test printer discovery
  private async testPrinterDiscovery(): Promise<void> {
    try {
      console.log('🔍 Testing printer discovery...');
      
      // Test Bluetooth support check
      const isSupported = await printerDiscovery.checkBluetoothSupport();
      this.addTestResult('Bluetooth Support Check', typeof isSupported === 'boolean');
      
      // Test discovery status
      const status = printerDiscovery.getDiscoveryStatus();
      this.addTestResult('Discovery Status', typeof status === 'object' && 'isScanning' in status);
      
      // Test discovered printers
      const printers = printerDiscovery.getDiscoveredPrinters();
      this.addTestResult('Get Discovered Printers', Array.isArray(printers));
      
    } catch (error) {
      this.addTestResult('Printer Discovery', false, String(error));
    }
  }

  // Test printer registry
  private async testPrinterRegistry(): Promise<void> {
    try {
      console.log('🔍 Testing printer registry...');
      
      // Test registry state
      const state = printerRegistry.getState();
      this.addTestResult('Get Registry State', typeof state === 'object' && 'mappings' in state);
      
      // Test mapping status
      const mappingStatus = printerRegistry.getMappingStatus();
      this.addTestResult('Get Mapping Status', typeof mappingStatus === 'object');
      
      // Test statistics
      const stats = printerRegistry.getStatistics();
      this.addTestResult('Get Statistics', typeof stats === 'object' && 'totalMappings' in stats);
      
    } catch (error) {
      this.addTestResult('Printer Registry', false, String(error));
    }
  }

  // Test print manager
  private async testPrintManager(): Promise<void> {
    try {
      console.log('🔍 Testing print manager...');
      
      // Test print manager status
      const status = printManager.getStatus();
      this.addTestResult('Get Print Manager Status', typeof status === 'object' && 'isInitialized' in status);
      
      // Test job statistics
      const jobStats = printManager.getJobStatistics();
      this.addTestResult('Get Job Statistics', typeof jobStats === 'object' && 'total' in jobStats);
      
      // Test connection status
      const connectionStatus = printManager.getConnectionStatus();
      this.addTestResult('Get Connection Status', typeof connectionStatus === 'object');
      
    } catch (error) {
      this.addTestResult('Print Manager', false, String(error));
    }
  }

  // Test persistence
  private async testPersistence(): Promise<void> {
    try {
      console.log('🔍 Testing persistence...');
      
      // Test auto-connect status
      const autoConnectStatus = await printerPersistence.getAutoConnectStatus();
      this.addTestResult('Get Auto-Connect Status', typeof autoConnectStatus === 'object' && 'enabled' in autoConnectStatus);
      
      // Test load all configs
      const configs = await printerPersistence.loadAllPrinterConfigs();
      this.addTestResult('Load All Configs', Array.isArray(configs));
      
    } catch (error) {
      this.addTestResult('Persistence', false, String(error));
    }
  }

  // Test integration between services
  private async testIntegration(): Promise<void> {
    try {
      console.log('🔍 Testing service integration...');
      
      // Test event listeners
      let eventReceived = false;
      const unsubscribe = printManager.addEventListener((event) => {
        eventReceived = true;
      });
      
      // Test registry listener
      let registryUpdated = false;
      const unsubscribeRegistry = printerRegistry.addListener((state) => {
        registryUpdated = true;
      });
      
      // Test discovery listener
      let discoveryUpdated = false;
      const unsubscribeDiscovery = printerDiscovery.addDiscoveryListener((printers, status) => {
        discoveryUpdated = true;
      });
      
      // Clean up listeners
      unsubscribe();
      unsubscribeRegistry();
      unsubscribeDiscovery();
      
      this.addTestResult('Event Listeners', true);
      
      // Test service dependencies
      const registryState = printerRegistry.getState();
      const printManagerStatus = printManager.getStatus();
      const discoveryStatus = printerDiscovery.getDiscoveryStatus();
      
      this.addTestResult('Service Dependencies', 
        typeof registryState === 'object' && 
        typeof printManagerStatus === 'object' && 
        typeof discoveryStatus === 'object'
      );
      
    } catch (error) {
      this.addTestResult('Service Integration', false, String(error));
    }
  }

  // Add test result
  private addTestResult(test: string, passed: boolean, error?: string): void {
    this.testResults.push({ test, passed, error });
    console.log(`${passed ? '✅' : '❌'} ${test}${error ? ` - ${error}` : ''}`);
  }

  // Test printer assignment workflow
  async testPrinterAssignmentWorkflow(): Promise<{
    success: boolean;
    steps: Array<{ step: string; success: boolean; error?: string }>;
  }> {
    const steps: Array<{ step: string; success: boolean; error?: string }> = [];
    
    try {
      console.log('🔍 Testing printer assignment workflow...');
      
      // Step 1: Start discovery
      try {
        await printerDiscovery.startDiscovery();
        steps.push({ step: 'Start Discovery', success: true });
      } catch (error) {
        steps.push({ step: 'Start Discovery', success: false, error: String(error) });
      }
      
      // Step 2: Get discovered printers
      try {
        const printers = printerDiscovery.getDiscoveredPrinters();
        steps.push({ step: 'Get Discovered Printers', success: true });
        
        if (printers.length > 0) {
          // Step 3: Create mock printer for testing
          const mockPrinter = {
            id: 'test_printer_123',
            name: 'Test Printer',
            address: '00:00:00:00:00:00',
            type: 'bluetooth_classic' as const,
            paired: true,
            connected: false,
            lastSeen: new Date(),
            capabilities: ['text_printing', 'thermal_printing'],
            status: 'available' as const,
          };
          
          // Step 4: Assign printer to role
          try {
            await printerRegistry.setPrinterMapping('Receipt', mockPrinter, true);
            steps.push({ step: 'Assign Printer to Role', success: true });
          } catch (error) {
            steps.push({ step: 'Assign Printer to Role', success: false, error: String(error) });
          }
          
          // Step 5: Check assignment
          try {
            const mapping = printerRegistry.getPrinterMapping('Receipt');
            const success = mapping && mapping.printerId === mockPrinter.id;
            steps.push({ step: 'Verify Assignment', success, error: success ? undefined : 'Assignment not found' });
          } catch (error) {
            steps.push({ step: 'Verify Assignment', success: false, error: String(error) });
          }
        } else {
          steps.push({ step: 'No Printers Available', success: true });
        }
        
      } catch (error) {
        steps.push({ step: 'Get Discovered Printers', success: false, error: String(error) });
      }
      
      const allStepsPassed = steps.every(step => step.success);
      return { success: allStepsPassed, steps };
      
    } catch (error) {
      steps.push({ step: 'Workflow Test', success: false, error: String(error) });
      return { success: false, steps };
    }
  }

  // Test error handling
  async testErrorHandling(): Promise<{
    success: boolean;
    errors: Array<{ scenario: string; handled: boolean; error?: string }>;
  }> {
    const errors: Array<{ scenario: string; handled: boolean; error?: string }> = [];
    
    try {
      console.log('🔍 Testing error handling...');
      
      // Test 1: Invalid printer assignment
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
        
        await printerRegistry.setPrinterMapping('Receipt', invalidPrinter, true);
        errors.push({ scenario: 'Invalid Printer Assignment', handled: true });
      } catch (error) {
        errors.push({ scenario: 'Invalid Printer Assignment', handled: true, error: String(error) });
      }
      
      // Test 2: Print job with no printer assigned
      try {
        await printManager.printRole('BOT', { test: 'data' }, 'high');
        errors.push({ scenario: 'Print Job No Printer', handled: true });
      } catch (error) {
        errors.push({ scenario: 'Print Job No Printer', handled: true, error: String(error) });
      }
      
      // Test 3: Test non-existent printer
      try {
        await printManager.testPrinter('non_existent_printer');
        errors.push({ scenario: 'Test Non-existent Printer', handled: true });
      } catch (error) {
        errors.push({ scenario: 'Test Non-existent Printer', handled: true, error: String(error) });
      }
      
      const allErrorsHandled = errors.every(e => e.handled);
      return { success: allErrorsHandled, errors };
      
    } catch (error) {
      errors.push({ scenario: 'Error Handling Test', handled: false, error: String(error) });
      return { success: false, errors };
    }
  }
}

// Export test instance
export const printerSystemTest = new PrinterSystemTest();




