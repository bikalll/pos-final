# Enhanced Bluetooth Printer System

This document describes the comprehensive Bluetooth printer system implemented for the React Native POS app, supporting both Bluetooth Classic and BLE printers with role-based printing assignments.

## 🚀 Features

### Core Capabilities
- **Dual Protocol Support**: Bluetooth Classic and BLE printer discovery
- **Role-Based Printing**: Assign printers to specific roles (BOT, KOT, Receipt)
- **Printer Management**: Friendly names, status monitoring, and capability detection
- **Queue Management**: Per-printer job queues with priority handling
- **Auto-Reconnection**: Automatic reconnection when printers go offline
- **Retry Logic**: Configurable retry attempts for failed print jobs
- **Event System**: Real-time events for print job status and printer connectivity

### Printer Roles
- **BOT (Bar Order Ticket)**: For bar/drink orders
- **KOT (Kitchen Order Ticket)**: For kitchen/food orders  
- **Receipt**: For customer receipts and invoices

## 📁 Architecture

### Services

#### 1. Printer Discovery Service (`printerDiscovery.ts`)
Handles Bluetooth device discovery and management.

```typescript
import { printerDiscovery } from './services/printerDiscovery';

// Start discovering printers
await printerDiscovery.startDiscovery();

// Get discovered printers
const printers = printerDiscovery.getDiscoveredPrinters();

// Set friendly name
await printerDiscovery.setFriendlyName(printerId, 'Kitchen Printer');

// Test printer connection
const result = await printerDiscovery.testPrinterConnection(printerId);
```

#### 2. Printer Registry Service (`printerRegistry.ts`)
Manages printer-to-role mappings and preferences.

```typescript
import { printerRegistry } from './services/printerRegistry';

// Assign printer to role
await printerRegistry.setPrinterMapping('KOT', printer, true);

// Get printer for role
const printerId = printerRegistry.getPrinterIdForRole('KOT');

// Check if role has printer assigned
const hasPrinter = printerRegistry.hasPrinterAssigned('Receipt');
```

#### 3. Print Manager Service (`printManager.ts`)
Handles print job queuing, processing, and execution.

```typescript
import { printManager } from './services/printManager';

// Initialize the print manager
await printManager.initialize();

// Print for specific role
const jobId = await printManager.printRole('Receipt', receiptData, 'high');

// Print for multiple roles (order processing)
const jobIds = await printManager.printForOrder([
  { role: 'KOT', payload: orderData, priority: 'high' },
  { role: 'BOT', payload: orderData, priority: 'normal' },
]);

// Test printer
const result = await printManager.testPrinter(printerId);
```

### UI Components

#### Printer Setup Screen (`PrinterSetupScreen.tsx`)
Complete UI for printer discovery, assignment, and testing.

**Features:**
- Real-time printer discovery with status indicators
- Drag-and-drop role assignment interface
- Printer testing with sample tickets
- Friendly name management
- Connection health monitoring

## 🔧 Usage Examples

### Basic Setup

```typescript
import { printManager, printerDiscovery, printerRegistry } from './services';

// Initialize the system
await printManager.initialize();

// Discover printers
await printerDiscovery.startDiscovery();

// Assign printers to roles
const printers = printerDiscovery.getDiscoveredPrinters();
const kitchenPrinter = printers.find(p => p.name.includes('Kitchen'));
const barPrinter = printers.find(p => p.name.includes('Bar'));
const receiptPrinter = printers.find(p => p.name.includes('Receipt'));

if (kitchenPrinter) {
  await printerRegistry.setPrinterMapping('KOT', kitchenPrinter, true);
}
if (barPrinter) {
  await printerRegistry.setPrinterMapping('BOT', barPrinter, true);
}
if (receiptPrinter) {
  await printerRegistry.setPrinterMapping('Receipt', receiptPrinter, true);
}
```

### Printing Receipts

```typescript
// Print a customer receipt
const receiptData = {
  restaurantName: 'My Restaurant',
  receiptId: 'REC-001',
  date: new Date().toLocaleDateString(),
  time: new Date().toLocaleTimeString(),
  table: 'Table 5',
  items: [
    { name: 'Pizza Margherita', quantity: 1, price: 15.00 },
    { name: 'Coca Cola', quantity: 2, price: 3.00 },
  ],
  taxLabel: 'Tax',
  serviceLabel: 'Service',
  subtotal: 21.00,
  tax: 2.10,
  service: 2.10,
  total: 25.20,
  payment: { method: 'Cash', amountPaid: 30.00, change: 4.80 },
};

const jobId = await printManager.printRole('Receipt', receiptData, 'high');
```

### Printing Order Tickets

```typescript
// Print kitchen and bar tickets for an order
const orderData = {
  restaurantName: 'My Restaurant',
  ticketId: 'ORD-001',
  date: new Date().toLocaleDateString(),
  time: new Date().toLocaleTimeString(),
  table: 'Table 3',
  items: [
    { name: 'Burger', quantity: 1, price: 12.00, orderType: 'KOT' },
    { name: 'Beer', quantity: 2, price: 5.00, orderType: 'BOT' },
  ],
  estimatedTime: '15-20 minutes',
};

const jobIds = await printManager.printForOrder([
  { role: 'KOT', payload: orderData, priority: 'high' },
  { role: 'BOT', payload: orderData, priority: 'normal' },
]);
```

### Event Handling

```typescript
// Listen for print events
const unsubscribe = printManager.addEventListener((event) => {
  switch (event.type) {
    case 'job_started':
      console.log(`Job ${event.jobId} started printing`);
      break;
    case 'job_completed':
      console.log(`Job ${event.jobId} completed successfully`);
      break;
    case 'job_failed':
      console.log(`Job ${event.jobId} failed: ${event.message}`);
      break;
    case 'printer_connected':
      console.log(`Printer ${event.printerId} connected`);
      break;
    case 'printer_disconnected':
      console.log(`Printer ${event.printerId} disconnected`);
      break;
  }
});

// Clean up listener
unsubscribe();
```

## 🎯 Key Features Explained

### Printer Discovery
- **Automatic Discovery**: Scans for both Bluetooth Classic and BLE printers
- **Capability Detection**: Automatically detects printer capabilities based on device name
- **Status Monitoring**: Real-time connection status and health monitoring
- **Friendly Names**: Custom names for easier identification

### Role-Based Assignment
- **Flexible Mapping**: Assign any printer to any role (BOT, KOT, Receipt)
- **Multiple Roles**: Same printer can handle multiple roles if needed
- **Validation**: Ensures printer supports required capabilities for each role
- **Persistence**: All assignments saved locally and restored on app restart

### Print Queue Management
- **Priority Queues**: High, normal, and low priority job handling
- **Per-Printer Queues**: Each printer has its own job queue
- **Retry Logic**: Automatic retry for failed jobs with configurable limits
- **Job Tracking**: Complete job lifecycle tracking with timestamps

### Connection Management
- **Auto-Reconnection**: Automatically reconnects to printers when they come back online
- **Health Monitoring**: Continuous monitoring of printer connection health
- **Error Handling**: Graceful handling of connection failures and timeouts
- **Status Events**: Real-time events for connection status changes

## 🔧 Configuration

### Printer Capabilities
The system automatically detects printer capabilities based on device names:

- **text_printing**: Basic text printing support
- **thermal_printing**: Thermal printer support
- **receipt_printing**: Receipt-specific formatting
- **label_printing**: Label printing support (Zebra, Epson, Star)
- **high_quality**: High-quality printing support
- **low_energy**: BLE low energy support
- **extended_range**: Extended range support
- **high_speed**: High-speed printing (Bluetooth Classic)
- **reliable_connection**: Reliable connection support

### Job Priorities
- **high**: Critical jobs (receipts, urgent orders)
- **normal**: Standard jobs (regular orders)
- **low**: Background jobs (reports, maintenance)

### Retry Configuration
- **Max Retries**: Configurable per job (default: 3)
- **Retry Delay**: Automatic delay between retry attempts
- **Exponential Backoff**: Increasing delay for subsequent retries

## 🚨 Error Handling

The system provides comprehensive error handling:

### Connection Errors
- Printer not found
- Bluetooth disabled
- Permission denied
- Connection timeout
- Device out of range

### Print Errors
- Invalid print data
- Printer not connected
- Print job failed
- Queue overflow
- Invalid role assignment

### Recovery Actions
- Automatic reconnection attempts
- Job retry with exponential backoff
- Fallback to alternative printers
- User notification of critical errors

## 📱 UI Integration

### Navigation
The printer setup is integrated into the main settings screen:
- **Settings** → **Printer Setup**
- **Drawer** → **Printer** (direct access)

### Screen Features
- **Real-time Discovery**: Live updates of discovered printers
- **Visual Status Indicators**: Color-coded connection status
- **Drag-and-Drop Assignment**: Easy role assignment interface
- **Test Printing**: Sample ticket printing for each role
- **Health Monitoring**: Real-time printer health status

## 🔍 Troubleshooting

### Common Issues

1. **No Printers Discovered**
   - Ensure Bluetooth is enabled
   - Check printer is in pairing mode
   - Verify app has location permissions

2. **Connection Failures**
   - Check printer is within range
   - Ensure printer is powered on
   - Try reconnecting manually

3. **Print Jobs Not Processing**
   - Check printer assignment for role
   - Verify printer is connected
   - Check print queue status

4. **Permission Errors**
   - Grant Bluetooth and location permissions
   - Restart app after granting permissions
   - Check device Bluetooth settings

### Debug Information
The system provides comprehensive debug logging:
- Discovery process details
- Connection attempt logs
- Print job processing steps
- Error details with stack traces

## 🚀 Future Enhancements

### Planned Features
- **Network Printers**: Support for WiFi/network printers
- **Cloud Printing**: Integration with cloud printing services
- **Print Templates**: Customizable print templates
- **Batch Printing**: Bulk print job processing
- **Print Analytics**: Usage statistics and reporting
- **Multi-Language**: Internationalization support

### Performance Optimizations
- **Connection Pooling**: Reuse connections for multiple jobs
- **Job Batching**: Combine multiple jobs for efficiency
- **Caching**: Cache printer capabilities and settings
- **Background Processing**: Process jobs in background threads

## 📄 API Reference

### PrinterDevice Interface
```typescript
interface PrinterDevice {
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
```

### PrintJob Interface
```typescript
interface PrintJob {
  id: string;
  role: PrinterRole;
  printerId: string;
  payload: any;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
  error?: string;
  metadata?: Record<string, any>;
}
```

### PrintEvent Interface
```typescript
interface PrintEvent {
  type: 'job_started' | 'job_completed' | 'job_failed' | 'printer_connected' | 'printer_disconnected' | 'queue_updated';
  jobId?: string;
  printerId?: string;
  role?: PrinterRole;
  message: string;
  timestamp: Date;
  data?: any;
}
```

This comprehensive printer system provides a robust, scalable solution for managing Bluetooth printers in a React Native POS application, with full support for role-based printing, queue management, and real-time monitoring.


