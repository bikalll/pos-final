import { printManager } from '../services/printManager';
import { printerDiscovery } from '../services/printerDiscovery';
import { printerRegistry } from '../services/printerRegistry';

/**
 * Simple test to verify actual printing functionality
 */
export class PrinterTest {
  
  // Test actual printing with a real printer
  static async testActualPrinting(): Promise<{
    success: boolean;
    message: string;
    details: any;
  }> {
    try {
      console.log('🧪 Testing actual printing functionality...');
      
      // Check if we have any assigned printers
      const registryState = printerRegistry.getState();
      const assignedRoles = Array.from(registryState.mappings.keys());
      
      if (assignedRoles.length === 0) {
        return {
          success: false,
          message: 'No printers assigned to any roles. Please assign a printer first.',
          details: { assignedRoles: 0 }
        };
      }
      
      // Use the first assigned role for testing
      const testRole = assignedRoles[0] as 'BOT' | 'KOT' | 'Receipt';
      const mapping = registryState.mappings.get(testRole);
      
      if (!mapping) {
        return {
          success: false,
          message: `No mapping found for role: ${testRole}`,
          details: { testRole }
        };
      }
      
      // Get the printer
      const printer = printerDiscovery.getPrinter(mapping.printerId);
      if (!printer) {
        return {
          success: false,
          message: `Printer not found: ${mapping.printerId}`,
          details: { printerId: mapping.printerId }
        };
      }
      
      console.log(`🖨️ Testing print with printer: ${printer.name} for role: ${testRole}`);
      
      // Create test data based on role
      const testData = this.getTestData(testRole);
      
      // Attempt to print
      const jobId = await printManager.printRole(testRole, testData, 'high');
      
      console.log(`✅ Print job created: ${jobId}`);
      
      return {
        success: true,
        message: `Print job created successfully for ${testRole}`,
        details: {
          jobId,
          printerName: printer.name,
          role: testRole,
          printerId: printer.id
        }
      };
      
    } catch (error) {
      console.error('❌ Print test failed:', error);
      return {
        success: false,
        message: `Print test failed: ${error}`,
        details: { error: String(error) }
      };
    }
  }
  
  // Get test data based on role
  private static getTestData(role: 'BOT' | 'KOT' | 'Receipt'): any {
    const baseData = {
      restaurantName: 'Test Restaurant',
      ticketId: `TEST-${role}-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      table: 'Test Table',
      items: [
        { name: 'Test Item 1', quantity: 1, price: 10.00, orderType: role },
        { name: 'Test Item 2', quantity: 2, price: 15.00, orderType: role },
      ],
      estimatedTime: '10-15 minutes',
      specialInstructions: 'This is a test print to verify printing functionality',
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
  }
  
  // Test printer connection
  static async testPrinterConnection(printerId: string): Promise<{
    success: boolean;
    message: string;
    details: any;
  }> {
    try {
      console.log(`🔗 Testing connection to printer: ${printerId}`);
      
      const result = await printManager.testPrinter(printerId);
      
      return {
        success: result.success,
        message: result.message,
        details: { printerId, result }
      };
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return {
        success: false,
        message: `Connection test failed: ${error}`,
        details: { printerId, error: String(error) }
      };
    }
  }
  
  // Test complete workflow
  static async testCompleteWorkflow(): Promise<{
    success: boolean;
    message: string;
    steps: Array<{ step: string; success: boolean; message: string }>;
  }> {
    const steps: Array<{ step: string; success: boolean; message: string }> = [];
    
    try {
      console.log('🧪 Testing complete printer workflow...');
      
      // Step 1: Check if print manager is initialized
      const status = printManager.getStatus();
      steps.push({
        step: 'Print Manager Initialized',
        success: status.isInitialized,
        message: status.isInitialized ? 'Print manager is initialized' : 'Print manager not initialized'
      });
      
      // Step 2: Check for assigned printers
      const registryState = printerRegistry.getState();
      const assignedRoles = Array.from(registryState.mappings.keys());
      steps.push({
        step: 'Printer Assignments',
        success: assignedRoles.length > 0,
        message: `Found ${assignedRoles.length} assigned roles: ${assignedRoles.join(', ')}`
      });
      
      // Step 3: Check discovered printers
      const printers = printerDiscovery.getDiscoveredPrinters();
      steps.push({
        step: 'Discovered Printers',
        success: printers.length > 0,
        message: `Found ${printers.length} discovered printers`
      });
      
      // Step 4: Test actual printing
      const printTest = await this.testActualPrinting();
      steps.push({
        step: 'Actual Printing',
        success: printTest.success,
        message: printTest.message
      });
      
      const allStepsPassed = steps.every(step => step.success);
      
      return {
        success: allStepsPassed,
        message: allStepsPassed ? 'All workflow steps passed' : 'Some workflow steps failed',
        steps
      };
      
    } catch (error) {
      steps.push({
        step: 'Workflow Test',
        success: false,
        message: `Workflow test failed: ${error}`
      });
      
      return {
        success: false,
        message: `Workflow test failed: ${error}`,
        steps
      };
    }
  }
}

// Export test functions
export const printerTest = PrinterTest;



