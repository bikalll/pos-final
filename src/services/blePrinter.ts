import { Alert, PermissionsAndroid, Platform } from 'react-native';

let BluetoothManager: any = null;
let BluetoothEscposPrinter: any = null;
let moduleLoadError: string | null = null;

// Enable Bluetooth printing - set to false to enable Bluetooth printing
const TEMPORARILY_DISABLE_BLUETOOTH = false;

// Fallback alignment constants in case the module doesn't provide them
const FALLBACK_ALIGN = {
  LEFT: 0,
  CENTER: 1,
  RIGHT: 2
};

// Try to load the Bluetooth module
function loadBluetoothModule() {
  try {
    // @ts-ignore
    const mod = require('tp-react-native-bluetooth-printer');
    
    BluetoothManager = mod.BluetoothManager;
    BluetoothEscposPrinter = mod.BluetoothEscposPrinter;
    
    if (!BluetoothManager || !BluetoothEscposPrinter) {
      moduleLoadError = 'Bluetooth module loaded but required components are missing';
      console.error('Bluetooth module components missing:', { 
        BluetoothManager: !!BluetoothManager, 
        BluetoothEscposPrinter: !!BluetoothEscposPrinter,
        availableExports: Object.keys(mod)
      });
    } else {
      moduleLoadError = null;
    }
  } catch (e: any) {
    moduleLoadError = `Failed to load Bluetooth module: ${e}`;
    console.error('Bluetooth module load error:', e);
  }
}

// Load the module on import
loadBluetoothModule();

// Helper function to get alignment constant with fallback
function getAlignment(alignType: 'LEFT' | 'CENTER' | 'RIGHT'): number {
  if (BluetoothEscposPrinter && BluetoothEscposPrinter.ALIGN && BluetoothEscposPrinter.ALIGN[alignType] !== undefined) {
    return BluetoothEscposPrinter.ALIGN[alignType];
  }
  // Use fallback values if module constants are undefined
  return FALLBACK_ALIGN[alignType];
}

// Check if required methods are available
function checkRequiredMethods(): { available: boolean; missing: string[] } {
  const requiredMethods = [
    'printerInit',
    'printerAlign', 
    'printText',
    'printAndFeed'
  ];
  
  const missing: string[] = [];
  
  for (const method of requiredMethods) {
    if (!BluetoothEscposPrinter || typeof BluetoothEscposPrinter[method] !== 'function') {
      missing.push(method);
    }
  }
  
  return {
    available: missing.length === 0,
    missing
  };
}

export const blePrinter = {
	isSupported(): boolean {
		// Check if Bluetooth is supported
		if (TEMPORARILY_DISABLE_BLUETOOTH) {
			console.warn('Bluetooth printing temporarily disabled');
			return false;
		}
		
		// Check if modules are loaded
		if (!BluetoothManager || !BluetoothEscposPrinter) {
			console.warn('❌ Bluetooth modules not loaded:', { 
				BluetoothManager: !!BluetoothManager, 
				BluetoothEscposPrinter: !!BluetoothEscposPrinter,
				error: moduleLoadError 
			});
			return false;
		}
		
		// Check if required methods are available
		const methodCheck = checkRequiredMethods();
		if (!methodCheck.available) {
			console.warn('❌ Required Bluetooth methods missing:', methodCheck.missing);
			return false;
		}
		
		console.log('✅ Bluetooth printing is supported');
		return true;
	},
	
	// Retry loading the Bluetooth module
	retryLoadModule(): boolean {
		console.log('🔄 Retrying Bluetooth module load...');
		loadBluetoothModule();
		return this.isSupported();
	},
	
	getModuleStatus(): { supported: boolean; error?: string } {
		if (TEMPORARILY_DISABLE_BLUETOOTH) {
			return {
				supported: false,
				error: 'Bluetooth printing temporarily disabled - no printer available'
			};
		}
		return {
			supported: this.isSupported(),
			error: moduleLoadError || undefined
		};
	},

	// Debug function to check module status
	debugModuleStatus(): { 
		BluetoothManager: any; 
		BluetoothEscposPrinter: any; 
		moduleLoadError: string | null;
		alignConstants: any;
		requiredMethods: any;
		methodCheck: { available: boolean; missing: string[] };
		moduleLoaded: boolean;
	} {
		const methodCheck = checkRequiredMethods();
		return {
			BluetoothManager: BluetoothManager,
			BluetoothEscposPrinter: BluetoothEscposPrinter,
			moduleLoadError,
			alignConstants: BluetoothEscposPrinter?.ALIGN || 'ALIGN constants not available',
			requiredMethods: {
				printerInit: typeof BluetoothEscposPrinter?.printerInit,
				printerAlign: typeof BluetoothEscposPrinter?.printerAlign,
				printText: typeof BluetoothEscposPrinter?.printText,
				printAndFeed: typeof BluetoothEscposPrinter?.printAndFeed
			},
			methodCheck,
			moduleLoaded: Boolean(BluetoothManager && BluetoothEscposPrinter)
		};
	},

	async requestPermissions(): Promise<boolean> {
		if (Platform.OS !== 'android') return true;
		
		try {
			const permissions = [
				PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN as any,
				PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT as any,
				PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
				PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
			];

			const result = await PermissionsAndroid.requestMultiple(permissions);
			const allGranted = Object.values(result).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
			
			if (!allGranted) {
				console.warn('Some Bluetooth permissions were denied:', result);
			}
			
			return allGranted;
		} catch (error) {
			console.error('Permission request failed:', error);
			return false;
		}
	},

	async isEnabled(): Promise<boolean> {
		if (!this.isSupported()) return false;
		
		try {
			const enabled = await BluetoothManager.isBluetoothEnabled();
			return !!enabled;
		} catch (error) {
			console.error('Failed to check Bluetooth status:', error);
			return false;
		}
	},

	async enableBluetooth(): Promise<boolean> {
		if (!this.isSupported()) return false;
		
		try {
			await BluetoothManager.enableBluetooth();
			return true;
		} catch (error) {
			console.error('Failed to enable Bluetooth:', error);
			Alert.alert('Bluetooth Error', 'Unable to enable Bluetooth. Please enable it manually in settings.');
			return false;
		}
	},

	async scanDevices(): Promise<{ paired: Array<any>; found: Array<any> }> {
		if (!this.isSupported()) {
			throw new Error('Bluetooth printing module not available');
		}
		
		try {
			const hasPerm = await this.requestPermissions();
			if (!hasPerm) {
				throw new Error('Bluetooth and Location permissions are required to scan for printers.');
			}
			
			const res = await BluetoothManager.scanDevices();
			const parsed = typeof res === 'string' ? JSON.parse(res) : res;
			
			return {
				paired: parsed?.paired || [],
				found: parsed?.found || [],
			};
		} catch (error) {
			console.error('Device scan failed:', error);
			throw error;
		}
	},

	async connect(address: string): Promise<void> {
		if (!this.isSupported()) {
			throw new Error('Bluetooth printing module not available');
		}
		
		try {
			await BluetoothManager.connect(address);
		} catch (error) {
			console.error('Connection failed:', error);
			throw new Error(`Failed to connect to printer: ${error}`);
		}
	},

	async disconnect(): Promise<void> {
		if (!this.isSupported()) return;
		
		try { 
			await BluetoothManager.disconnect(); 
		} catch (error) {
			console.warn('Disconnect error:', error);
		}
	},

	// Fallback printing when Bluetooth is not available
	async printToFile(content: string, filename: string): Promise<string> {
		try {
			console.log('📄 Saving print content to file:', filename);
			
			// Use Expo FileSystem instead of react-native-fs
			const FileSystem = await import('expo-file-system');
			const path = FileSystem.default.documentDirectory + filename;
			
			await FileSystem.default.writeAsStringAsync(path, content, {
				encoding: FileSystem.default.EncodingType.UTF8
			});
			console.log('✅ File saved successfully:', path);
			
			return path;
		} catch (error) {
			console.error('❌ Failed to save file:', error);
			throw new Error(`Failed to save file: ${error}`);
		}
	},

	// Simple fallback printing using Expo Print
	async printWithExpoPrint(content: string, title: string = 'Print'): Promise<string> {
		try {
			console.log('📄 Using Expo Print fallback...');
			
			// Import Expo Print
			const Print = await import('expo-print');
			const Sharing = await import('expo-sharing');
			
			// Create simple HTML content
			const html = `
				<html>
					<head>
						<style>
							body { font-family: monospace; font-size: 12px; line-height: 1.4; }
							.header { text-align: center; font-weight: bold; margin-bottom: 20px; }
							.content { white-space: pre-wrap; }
						</style>
					</head>
					<body>
						<div class="header">${title}</div>
						<div class="content">${content}</div>
					</body>
				</html>
			`;
			
			// Print to file
			const { uri } = await Print.default.printToFileAsync({ 
				html,
				base64: false
			});
			
			// Share the file
			if (await Sharing.default.isAvailableAsync()) {
				await Sharing.default.shareAsync(uri, {
					mimeType: 'application/pdf',
					dialogTitle: title,
				});
			}
			
			console.log('✅ Expo Print fallback completed:', uri);
			return uri;
		} catch (error) {
			console.error('❌ Expo Print fallback failed:', error);
			throw new Error(`Expo Print fallback failed: ${error}`);
		}
	},

	// Enhanced print text with multiple fallbacks
	async printText(text: string): Promise<void> {
		if (!this.isSupported()) {
			if (TEMPORARILY_DISABLE_BLUETOOTH) {
				throw new Error('No printer available. Please connect a Bluetooth thermal printer to enable printing.');
			}
			
			// Try Expo Print fallback first
			try {
				await this.printWithExpoPrint(text, 'Print Output');
				return;
			} catch (expoError) {
				console.warn('Expo Print fallback failed, trying file save:', expoError);
			}
			
			// Fallback to file
			try {
				const filename = `print_${Date.now()}.txt`;
				const filePath = await this.printToFile(text, filename);
				throw new Error(`Bluetooth printing not available. Content saved to: ${filePath}`);
			} catch (fileError) {
				throw new Error(`All printing methods failed. Bluetooth: Not available, File: ${fileError}`);
			}
		}
		
		try {
			// Check if required methods exist
			if (!BluetoothEscposPrinter.printerInit || !BluetoothEscposPrinter.printerAlign || !BluetoothEscposPrinter.printText || !BluetoothEscposPrinter.printAndFeed) {
				throw new Error('Bluetooth printer module methods are not available');
			}
			
			await BluetoothEscposPrinter.printerInit();
			await BluetoothEscposPrinter.printerAlign(getAlignment('LEFT'));
			await BluetoothEscposPrinter.printText(text + '\n', { encoding: 'GBK' });
			await BluetoothEscposPrinter.printAndFeed(2);
		} catch (error) {
			console.error('Print text failed:', error);
			throw new Error(`Print failed: ${error}`);
		}
	},

	// Fallback print method for receipts using simple text formatting
	async printSimpleReceipt(data: {
		restaurantName: string;
		receiptId: string;
		date: string;
		time: string;
		table: string;
		items: Array<{ name: string; quantity: number; price: number }>;
		taxLabel: string;
		serviceLabel: string;
		subtotal: number;
		tax: number;
		service: number;
		discount?: number;
		total: number;
		payment?: { method: string; amountPaid: number; change: number } | null;
		processedBy?: { role: string; username: string };
		role?: string;
		steward?: string;
	}): Promise<void> {
		if (!this.isSupported()) {
			if (TEMPORARILY_DISABLE_BLUETOOTH) {
				throw new Error('No printer available. Please connect a Bluetooth thermal printer to enable printing.');
			}
			throw new Error('Bluetooth printing module not available');
		}
		
		try {
			console.log('🖨️ Using fallback simple receipt print...');
			
			// Check if required methods exist
			if (!BluetoothEscposPrinter.printerInit || !BluetoothEscposPrinter.printText || !BluetoothEscposPrinter.printAndFeed) {
				throw new Error('Bluetooth printer module methods are not available');
			}
			
			await BluetoothEscposPrinter.printerInit();
			
			// Print using simple text format
			let printContent = '';
			printContent += `${data.restaurantName}\n`;
			printContent += `Receipt #${data.receiptId}\n`;
			printContent += `${data.date}  ${data.time}\n`;
			printContent += `Table ${data.table}\n`;
			printContent += '==============================\n';
			printContent += 'ITEMS:\n';
			
			for (const item of data.items) {
				printContent += `${item.name}\n`;
				printContent += `  ${item.quantity} x Rs. ${item.price.toFixed(2)}  =  Rs. ${(item.price * item.quantity).toFixed(2)}\n`;
			}
			
			printContent += '------------------------------\n';
			printContent += `Sub Total: Rs. ${data.subtotal.toFixed(2)}\n`;
			printContent += `Discount: Rs. ${(data.discount ?? 0).toFixed(2)}\n`;
			printContent += '==============================\n';
			printContent += `Grand Total: Rs. ${data.total.toFixed(2)}\n`;
			
			if (data.payment) {
				printContent += '\nPAYMENT:\n';
				printContent += `Method: ${data.payment.method}\n`;
				printContent += `Paid: Rs. ${data.payment.amountPaid.toFixed(2)}\n`;
				printContent += `Change: Rs. ${data.payment.change.toFixed(2)}\n`;
			}
			
			printContent += '\nThank you!\n';
			
			await BluetoothEscposPrinter.printText(printContent, { encoding: 'GBK' });
			await BluetoothEscposPrinter.printAndFeed(3);
			
			console.log('✅ Simple receipt print completed successfully');
		} catch (error) {
			console.error('❌ Simple receipt print failed:', error);
			throw new Error(`Simple receipt print failed: ${error}`);
		}
	},

	async printReceipt(data: {
		restaurantName: string;
		receiptId: string;
		date: string;
		time: string;
		table: string;
		items: Array<{ name: string; quantity: number; price: number }>;
		taxLabel: string;
		serviceLabel: string;
		subtotal: number;
		tax: number;
		service: number;
		discount?: number;
		total: number;
		payment?: { method: string; amountPaid: number; change: number } | null;
		// Optional split lines
		splitPayments?: Array<{ method: string; amount: number }>;
		isPreReceipt?: boolean;
		address?: string;
		panVat?: string;
		processedBy?: { role: string; username: string };
		role?: string;
		steward?: string;
	}): Promise<void> {
		if (!this.isSupported()) {
			if (TEMPORARILY_DISABLE_BLUETOOTH) {
				throw new Error('No printer available. Please connect a Bluetooth thermal printer to enable printing.');
			}
			
			// Try Expo Print fallback first
			try {
				let printContent = '';
				
				// Add pre-receipt header if applicable
				if (data.isPreReceipt) {
					printContent += 'CUSTOMER COPY\n';
					printContent += 'PRE-RECEIPT\n';
				}
				
				// Header
				printContent += `${data.restaurantName}\n`;
				if (data.address) printContent += `${data.address}\n`;
				if (data.panVat) printContent += `PAN: ${data.panVat}\n`;
				printContent += `${data.date} ${data.time}\n`;
				printContent += `Table ${data.table}\n`;
				printContent += '------------------------------\n';
				// Columns: name(16) qty(3) total(9)
				printContent += 'Item               Qty      Total\n';
				printContent += '------------------------------\n';
				
				for (const item of data.items) {
					const nameCol = item.name.slice(0, 16).padEnd(16);
					const qtyCol = item.quantity.toString().padStart(3);
					const totalStr = (item.price * item.quantity).toFixed(1);
					const totalCol = totalStr.padStart(9);
					printContent += `${nameCol}${qtyCol}${totalCol}\n`;
				}
				
				printContent += '------------------------------\n';
				printContent += `Sub Total: ${data.subtotal.toFixed(1)}\n`;
				if ((data.discount ?? 0) > 0) printContent += `Discount: ${(data.discount ?? 0).toFixed(1)}\n`;
				printContent += `TOTAL: ${data.total.toFixed(1)}\n`;
				
				if (data.payment) {
					printContent += `${data.payment.method}: ${data.payment.amountPaid.toFixed(1)}\n`;
				} else if (data.isPreReceipt) {
					printContent += 'Payment: Pending\n';
					printContent += `Amount Due: Rs. ${data.total.toFixed(1)}\n`;
				}
				
				const totalItems = data.items.length;
				const totalUnits = data.items.reduce((sum, item) => sum + item.quantity, 0);
				printContent += `Total Items: ${totalItems} Total Units: ${totalUnits}\n`;
				
				if (data.isPreReceipt) {
					printContent += '\nPlease settle payment at counter\n';
					printContent += 'Thank you for your order!\n';
				} else {
					printContent += '\nThank you\n';
				}
				printContent += 'Powered by ARBI POS\n';
				
				printContent += `Ref Number: ${data.receiptId}\n`;
				
				const title = data.isPreReceipt ? 'Pre-Receipt (Customer Copy)' : 'Receipt';
				await this.printWithExpoPrint(printContent, title);
				return;
			} catch (expoError) {
				console.warn('Expo Print fallback failed, trying file save:', expoError);
			}
			
			// Fallback to file
			try {
				const filename = `receipt_${Date.now()}.txt`;
				const filePath = await this.printToFile(JSON.stringify(data, null, 2), filename);
				throw new Error(`Bluetooth printing not available. Receipt saved to: ${filePath}`);
			} catch (fileError) {
				throw new Error(`All printing methods failed. Bluetooth: Not available, File: ${fileError}`);
			}
		}
		
		try {
			// Check if required methods exist
			if (!BluetoothEscposPrinter.printerInit || !BluetoothEscposPrinter.printerAlign || !BluetoothEscposPrinter.printText || !BluetoothEscposPrinter.printAndFeed) {
				throw new Error('Bluetooth printer module methods are not available');
			}
			
			await BluetoothEscposPrinter.printerInit();
			await BluetoothEscposPrinter.printerAlign(getAlignment('CENTER'));
			
			// Print header with logo-style formatting
			// Print header based on receipt type
			if (data.isPreReceipt) {
				await BluetoothEscposPrinter.printText('CUSTOMER COPY\n', {
					encoding: 'GBK',
					fonttype: 1,
					widthtimes: 1,
					heighttimes: 1,
				});
				await BluetoothEscposPrinter.printText('PRE-RECEIPT\n', {
					encoding: 'GBK',
					fonttype: 1,
					widthtimes: 1,
					heighttimes: 1,
				});
			}
			
			await BluetoothEscposPrinter.printText(`${data.restaurantName}\n`, { encoding: 'GBK', fonttype: 1, widthtimes: 1, heighttimes: 1 });
			if (data.address) await BluetoothEscposPrinter.printText(`${data.address}\n`, {});
			if (data.panVat) await BluetoothEscposPrinter.printText(`PAN: ${data.panVat}\n`, {});
			await BluetoothEscposPrinter.printText(`${data.date} ${data.time}\n`, {});
			await BluetoothEscposPrinter.printText(`Table ${data.table}\n`, {});
			if (data.processedBy) {
				if (typeof data.processedBy === 'object' && data.processedBy.role && data.processedBy.username) {
					// New format: {role: "Staff", username: "John"}
					await BluetoothEscposPrinter.printText(`${data.processedBy.role} - ${data.processedBy.username}\n`, {});
				} else if (typeof data.processedBy === 'string') {
					// Old format: just username string, check for separate role field
					const role = data.role || 'Staff';
					await BluetoothEscposPrinter.printText(`${role} - ${data.processedBy}\n`, {});
				} else if (data.processedBy.role) {
					// Partial format: {role: "Staff"}
					await BluetoothEscposPrinter.printText(`${data.processedBy.role} - Unknown\n`, {});
				}
			} else if (data.steward) {
				await BluetoothEscposPrinter.printText(`Steward: ${data.steward}\n`, {});
			}
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			
			// Print items in table format
			await BluetoothEscposPrinter.printerAlign(getAlignment('LEFT'));
			// Merge quantity next to item name for tighter spacing
			await BluetoothEscposPrinter.printText('Item                         Total\n', {});
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			
			for (const item of data.items) {
				const nameWithQty = `${item.name} x${item.quantity}`;
				const nameCol = nameWithQty.slice(0, 22).padEnd(22);
				const totalCol = (item.price * item.quantity).toFixed(1).padStart(8);
				await BluetoothEscposPrinter.printText(`${nameCol}${totalCol}\n`, {});
			}
			
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			await BluetoothEscposPrinter.printText(`Sub Total: ${data.subtotal.toFixed(1)}\n`, {});
			if ((data.discount ?? 0) > 0) await BluetoothEscposPrinter.printText(`Discount: ${(data.discount ?? 0).toFixed(1)}\n`, {});
			await BluetoothEscposPrinter.printText(`TOTAL: ${data.total.toFixed(1)}\n`, { widthtimes: 1, heighttimes: 1 });
			
			// Enhanced payment display for split payments with credit
			if (data.payment && data.payment.method === 'Split' && Array.isArray(data.splitPayments) && data.splitPayments.length > 0) {
				// Calculate credit amount
				const creditAmount = data.splitPayments
					.filter((sp: any) => sp.method === 'Credit')
					.reduce((sum: number, sp: any) => sum + (Number(sp.amount) || 0), 0);
				
				const cashAmount = data.splitPayments
					.filter((sp: any) => sp.method !== 'Credit')
					.reduce((sum: number, sp: any) => sum + (Number(sp.amount) || 0), 0);
				
				await BluetoothEscposPrinter.printText(`Order Total: ${data.total.toFixed(1)}\n`, {});
				await BluetoothEscposPrinter.printText(`Amount Paid: ${cashAmount.toFixed(1)}\n`, {});
				if (creditAmount > 0) {
					await BluetoothEscposPrinter.printText(`Credit Amount: ${creditAmount.toFixed(1)}\n`, {});
				}
				
				// Print split breakdown
				await BluetoothEscposPrinter.printText('Split Breakdown:\n', {});
				for (const sp of data.splitPayments) {
					await BluetoothEscposPrinter.printText(`${sp.method}: ${sp.amount.toFixed(1)}\n`, {});
				}
			} else if (data.payment) {
				await BluetoothEscposPrinter.printText(`${data.payment.method}: ${data.payment.amountPaid.toFixed(1)}\n`, {});
			}
			// Print split breakdown if present (legacy support)
			if (Array.isArray(data.splitPayments) && data.splitPayments.length > 0 && (!data.payment || data.payment.method !== 'Split')) {
				for (const sp of data.splitPayments) {
					await BluetoothEscposPrinter.printText(`${sp.method}: ${sp.amount.toFixed(1)}\n`, {});
				}
			} else if (data.isPreReceipt) {
				await BluetoothEscposPrinter.printText('Payment: Pending\n', {});
				await BluetoothEscposPrinter.printText('Amount Due: Rs. ' + data.total.toFixed(1) + '\n', {});
			}
			
			// Print summary
			const totalItems = data.items.length;
			const totalUnits = data.items.reduce((sum, item) => sum + item.quantity, 0);
			await BluetoothEscposPrinter.printText(`Total Items: ${totalItems} Total Units: ${totalUnits}\n`, {});
			
			if (data.isPreReceipt) {
				await BluetoothEscposPrinter.printText('\nPlease settle payment at counter\n', {});
				await BluetoothEscposPrinter.printText('Thank you for your order!\n', { widthtimes: 1, heighttimes: 1 });
			} else {
				await BluetoothEscposPrinter.printText('\n', {});
				await BluetoothEscposPrinter.printText('Thank you\n', { widthtimes: 1, heighttimes: 1 });
			}
			await BluetoothEscposPrinter.printText('Powered by ARBI POS\n', {});
			await BluetoothEscposPrinter.printText(`Ref Number: ${data.receiptId}\n`, {});
			await BluetoothEscposPrinter.printAndFeed(3);
		} catch (error) {
			console.error('Print receipt failed:', error);
			// Try fallback methods if Bluetooth fails
			try {
				await this.printSimpleReceipt(data);
				console.log('✅ Receipt printed successfully with fallback method');
			} catch (fallbackError) {
				throw new Error(`Receipt print failed: ${error}. Fallback also failed: ${fallbackError}`);
			}
		}
	},

	async printKOT(data: {
		restaurantName: string;
		ticketId: string;
		date: string;
		time: string;
		table: string;
		items: Array<{ name: string; quantity: number; price: number; orderType: string }>;
		estimatedTime: string;
		specialInstructions?: string;
		stewardName?: string;
		processedBy?: { role: string; username: string };
		role?: string;
	}): Promise<void> {
		if (!this.isSupported()) {
			if (TEMPORARILY_DISABLE_BLUETOOTH) {
				throw new Error('No printer available. Please connect a Bluetooth thermal printer to enable printing.');
			}
			
			// Try Expo Print fallback first
			try {
				const kitchenItems = data.items.filter(item => item.orderType === 'KOT');
				let printContent = '';
				printContent += 'KOT\n';
				printContent += `${data.ticketId}\n`;
				printContent += `${data.date} ${data.time}\n`;
				printContent += `Table ${data.table}\n`;
				if (data.processedBy) {
					if (typeof data.processedBy === 'object' && data.processedBy.role && data.processedBy.username) {
						// New format: {role: "Staff", username: "John"}
						printContent += `${data.processedBy.role} - ${data.processedBy.username}\n`;
					} else if (typeof data.processedBy === 'string') {
						// Old format: just username string, check for separate role field
						const role = data.role || 'Staff';
						printContent += `${role} - ${data.processedBy}\n`;
					} else if (data.processedBy.role) {
						// Partial format: {role: "Staff"}
						printContent += `${data.processedBy.role} - Unknown\n`;
					}
				} else if (data.stewardName) {
					printContent += `Steward: ${data.stewardName}\n`;
				}
				if (data.specialInstructions) printContent += `Notes: ${data.specialInstructions}\n`;
				printContent += '------------------------------\n';
				printContent += 'Item               Qty\n';
				printContent += '------------------------------\n';
				
				for (const item of kitchenItems) {
					const itemName = item.name.padEnd(20);
					const qty = item.quantity.toString().padStart(3);
					printContent += `${itemName}${qty}\n`;
				}
				
				printContent += '------------------------------\n';
				
				await this.printWithExpoPrint(printContent, 'Kitchen Order Ticket (KOT)');
				return;
			} catch (expoError) {
				console.warn('Expo Print fallback failed, trying file save:', expoError);
			}
			
			// Fallback to file
			try {
				const filename = `kot_${Date.now()}.txt`;
				const filePath = await this.printToFile(JSON.stringify(data, null, 2), filename);
				throw new Error(`Bluetooth printing not available. KOT saved to: ${filePath}`);
			} catch (fileError) {
				throw new Error(`All printing methods failed. Bluetooth: Not available, File: ${fileError}`);
			}
		}
		
		try {
			console.log('🖨️ Starting KOT print with data:', {
				ticketId: data.ticketId,
				table: data.table,
				itemsCount: data.items.length,
				kitchenItems: data.items.filter(item => item.orderType === 'KOT').length
			});

			// Check if required methods exist
			if (!BluetoothEscposPrinter.printerInit || !BluetoothEscposPrinter.printerAlign || !BluetoothEscposPrinter.printText || !BluetoothEscposPrinter.printAndFeed) {
				throw new Error('Bluetooth printer module methods are not available');
			}
			
			// Initialize printer
			console.log('🖨️ Initializing printer...');
			await BluetoothEscposPrinter.printerInit();
			
			// Set alignment to center for header
			console.log('🖨️ Setting alignment to center...');
			await BluetoothEscposPrinter.printerAlign(getAlignment('CENTER'));
			
			// Print header
			console.log('🖨️ Printing header...');
			await BluetoothEscposPrinter.printText('KOT\n', {
				encoding: 'GBK',
				fonttype: 1,
				widthtimes: 1,
				heighttimes: 1,
			});
			await BluetoothEscposPrinter.printText(`${data.ticketId}\n`, {});
			await BluetoothEscposPrinter.printText(`${data.date} ${data.time}\n`, {});
			await BluetoothEscposPrinter.printText(`Table ${data.table}\n`, {});
			if (data.processedBy) {
				if (typeof data.processedBy === 'object' && data.processedBy.role && data.processedBy.username) {
					// New format: {role: "Staff", username: "John"}
					await BluetoothEscposPrinter.printText(`${data.processedBy.role} - ${data.processedBy.username}\n`, {});
				} else if (typeof data.processedBy === 'string') {
					// Old format: just username string, check for separate role field
					const role = data.role || 'Staff';
					await BluetoothEscposPrinter.printText(`${role} - ${data.processedBy}\n`, {});
				} else if (data.processedBy.role) {
					// Partial format: {role: "Staff"}
					await BluetoothEscposPrinter.printText(`${data.processedBy.role} - Unknown\n`, {});
				}
			} else if (data.stewardName) {
				await BluetoothEscposPrinter.printText(`Steward: ${data.stewardName}\n`, {});
			}
			if (data.specialInstructions) { await BluetoothEscposPrinter.printText(`Notes: ${data.specialInstructions}\n`, {}); }
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			
			// Set alignment to left for items
			console.log('🖨️ Setting alignment to left for items...');
			await BluetoothEscposPrinter.printerAlign(getAlignment('LEFT'));
			await BluetoothEscposPrinter.printText('Item               Qty\n', {});
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			
			// Print kitchen items only
			const kitchenItems = data.items.filter(item => item.orderType === 'KOT');
			console.log('🖨️ Printing kitchen items:', kitchenItems.length);
			
			for (const item of kitchenItems) {
				const itemName = item.name.padEnd(20);
				const qty = item.quantity.toString().padStart(3);
				await BluetoothEscposPrinter.printText(`${itemName}${qty}\n`, {});
			}
			
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			
			// Feed paper
			console.log('🖨️ Feeding paper...');
			await BluetoothEscposPrinter.printAndFeed(3);
			
			console.log('✅ KOT print completed successfully');
		} catch (error) {
			console.error('❌ Print KOT failed:', error);
			// Try fallback methods if Bluetooth fails
			try {
				await this.printSimpleKOT(data);
				console.log('✅ KOT printed successfully with fallback method');
			} catch (fallbackError) {
				throw new Error(`KOT print failed: ${error}. Fallback also failed: ${fallbackError}`);
			}
		}
	},

	// Print customer history report
	async printCustomerHistory(data: {
		customerName: string;
		customerPhone?: string;
		periodLabel: string;
		entries: Array<{ date: string; time?: string; ref: string; method: string; amount: number }>;
		totalCount: number;
		totalAmount: number;
	}): Promise<void> {
		if (!this.isSupported()) {
			throw new Error('Bluetooth printing not available');
		}
		try {
			await BluetoothEscposPrinter.printerInit();
			await BluetoothEscposPrinter.printerAlign(getAlignment('CENTER'));
			await BluetoothEscposPrinter.printText('CUSTOMER HISTORY\n', { widthtimes: 1, heighttimes: 1 });
			await BluetoothEscposPrinter.printerAlign(getAlignment('LEFT'));
			await BluetoothEscposPrinter.printText(`Customer: ${data.customerName}${data.customerPhone ? ' (' + data.customerPhone + ')' : ''}\n`, {});
			await BluetoothEscposPrinter.printText(`Period: ${data.periodLabel}\n`, {});
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			await BluetoothEscposPrinter.printText('Date        Ref    Method  Amt\n', {});
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			for (const e of data.entries) {
				const d = (e.date || '').padEnd(10);
				const r = (e.ref || '').padEnd(6);
				const m = (e.method || '').slice(0,7).padEnd(7);
				const a = e.amount.toFixed(2).padStart(6);
				await BluetoothEscposPrinter.printText(`${d} ${r} ${m} ${a}\n`, {});
			}
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			await BluetoothEscposPrinter.printText(`Total Entries: ${data.totalCount}\n`, {});
			await BluetoothEscposPrinter.printText(`Total Amount: ${data.totalAmount.toFixed(2)}\n`, { widthtimes: 1, heighttimes: 1 });
			await BluetoothEscposPrinter.printAndFeed(3);
		} catch (e) {
			throw new Error(`Customer history print failed: ${e}`);
		}
	},

	// Print credit statement report
	async printCreditStatement(data: {
		customerName: string;
		customerPhone?: string;
		entries: Array<{ date: string; ref: string; amount: number }>;
		totalAmount: number;
	}): Promise<void> {
		if (!this.isSupported()) {
			throw new Error('Bluetooth printing not available');
		}
		try {
			await BluetoothEscposPrinter.printerInit();
			await BluetoothEscposPrinter.printerAlign(getAlignment('CENTER'));
			await BluetoothEscposPrinter.printText('CREDIT STATEMENT\n', { widthtimes: 1, heighttimes: 1 });
			await BluetoothEscposPrinter.printerAlign(getAlignment('LEFT'));
			await BluetoothEscposPrinter.printText(`Customer: ${data.customerName}${data.customerPhone ? ' (' + data.customerPhone + ')' : ''}\n`, {});
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			await BluetoothEscposPrinter.printText('Date        Ref        Amount\n', {});
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			for (const e of data.entries) {
				const d = (e.date || '').padEnd(10);
				const r = (e.ref || '').padEnd(10);
				const a = e.amount.toFixed(2).padStart(8);
				await BluetoothEscposPrinter.printText(`${d} ${r} ${a}\n`, {});
			}
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			await BluetoothEscposPrinter.printText(`TOTAL DUE: ${data.totalAmount.toFixed(2)}\n`, { widthtimes: 1, heighttimes: 1 });
			await BluetoothEscposPrinter.printAndFeed(3);
		} catch (e) {
			throw new Error(`Credit statement print failed: ${e}`);
		}
	},

	// Print a daily summary report in thermal format
	async printDailySummary(data: {
		printTime: string;
		date: string;
		branch?: string;
		grossSales: number;
		serviceCharge: number;
		discounts: number;
		complementary?: number;
		netSales: number;
		salesByType: Array<{ type: string; count: number; amount: number }>;
		paymentsNet: Array<{ type: string; amount: number }>;
		audit?: { preReceiptCount?: number; receiptReprintCount?: number; voidReceiptCount?: number; totalVoidItemCount?: number };
		firstReceipt?: { reference: string; sequence?: string; time: string; netAmount: number };
		lastReceipt?: { reference: string; sequence?: string; time: string; netAmount: number };
	}): Promise<void> {
		if (!this.isSupported()) {
			// Build a simple text and use Expo Print fallback
			const lines: string[] = [];
			lines.push(`Print time: ${data.printTime}`);
			lines.push(`Date: ${data.date}`);
			if (data.branch) lines.push(`Branch: ${data.branch}`);
			lines.push('');
			lines.push('Day Summary');
			lines.push('');
			lines.push('--- Sales Summary ---');
			lines.push(`Gross Sales        ${data.grossSales.toFixed(1)}`);
			lines.push(`Service Charge     ${data.serviceCharge.toFixed(1)}`);
			lines.push(`Discounts          ${data.discounts.toFixed(1)}`);
			lines.push(`Complementary      ${(data.complementary || 0).toFixed(1)}`);
			lines.push(`Net Sales          ${data.netSales.toFixed(1)}`);
			lines.push('');
			lines.push('--- Sales ---');
			lines.push('Type          Count   Amount');
			data.salesByType.forEach(s => {
				const type = (s.type || '').toUpperCase().padEnd(12);
				const count = String(s.count).padStart(5);
				const amt = s.amount.toFixed(1).padStart(9);
				lines.push(`${type}${count} ${amt}`);
			});
			lines.push('');
			lines.push('Total Payments Received (Net)');
			lines.push('Type               Amount');
			data.paymentsNet.forEach(p => {
				const t = (p.type || '').toUpperCase().padEnd(14);
				const a = p.amount.toFixed(1).padStart(9);
				lines.push(`${t}${a}`);
			});
			lines.push('');
			lines.push('--- Audit ---');
			const audit = data.audit || {};
			lines.push(`Pre Receipt Print Count  ${String(audit.preReceiptCount || 0)}`);
			lines.push(`Receipt Re-print Count   ${String(audit.receiptReprintCount || 0)}`);
			lines.push(`Void Receipt Count       ${String(audit.voidReceiptCount || 0)}`);
			lines.push(`Total Void Item Count    ${String(audit.totalVoidItemCount || 0)}`);
			lines.push('');
			if (data.firstReceipt) {
				lines.push('--- First Receipt ---');
				lines.push(`Reference       ${data.firstReceipt.reference}`);
				if (data.firstReceipt.sequence) lines.push(`Sequence Number ${data.firstReceipt.sequence}`);
				lines.push(`Time            ${data.firstReceipt.time}`);
				lines.push(`Net Amount      ${data.firstReceipt.netAmount.toFixed(1)}`);
				lines.push('');
			}
			if (data.lastReceipt) {
				lines.push('--- Last Receipt ---');
				lines.push(`Reference       ${data.lastReceipt.reference}`);
				if (data.lastReceipt.sequence) lines.push(`Sequence Number ${data.lastReceipt.sequence}`);
				lines.push(`Time            ${data.lastReceipt.time}`);
				lines.push(`Net Amount      ${data.lastReceipt.netAmount.toFixed(1)}`);
				lines.push('');
			}
			lines.push('-- End --');
			await this.printWithExpoPrint(lines.join('\n'), 'Day Summary');
			return;
		}

		try {
			await BluetoothEscposPrinter.printerInit();
			await BluetoothEscposPrinter.printerAlign(getAlignment('LEFT'));
			await BluetoothEscposPrinter.printText(`Print time: ${data.printTime}\n`, {});
			await BluetoothEscposPrinter.printText(`Date: ${data.date}\n`, {});
			if (data.branch) await BluetoothEscposPrinter.printText(`Branch: ${data.branch}\n`, {});
			await BluetoothEscposPrinter.printerAlign(getAlignment('CENTER'));
			await BluetoothEscposPrinter.printText('Day Summary\n', { widthtimes: 1, heighttimes: 1 });
			await BluetoothEscposPrinter.printerAlign(getAlignment('LEFT'));
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			await BluetoothEscposPrinter.printText('Sales Summary\n', {});
			await BluetoothEscposPrinter.printText(`Gross Sales           ${data.grossSales.toFixed(1)}\n`, {});
			await BluetoothEscposPrinter.printText(`Service Charge        ${data.serviceCharge.toFixed(1)}\n`, {});
			await BluetoothEscposPrinter.printText(`Discounts             ${data.discounts.toFixed(1)}\n`, {});
			await BluetoothEscposPrinter.printText(`Complementary         ${(data.complementary || 0).toFixed(1)}\n`, {});
			await BluetoothEscposPrinter.printText(`Net Sales             ${data.netSales.toFixed(1)}\n`, {});
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			await BluetoothEscposPrinter.printText('Sales\n', {});
			await BluetoothEscposPrinter.printText('Type          Count   Amount\n', {});
			for (const s of data.salesByType) {
				const type = (s.type || '').toUpperCase().padEnd(12);
				const count = String(s.count).padStart(5);
				const amt = s.amount.toFixed(1).padStart(9);
				await BluetoothEscposPrinter.printText(`${type}${count} ${amt}\n`, {});
			}
			await BluetoothEscposPrinter.printText('Total Payments Received (Net)\n', {});
			await BluetoothEscposPrinter.printText('Type               Amount\n', {});
			for (const p of data.paymentsNet) {
				const t = (p.type || '').toUpperCase().padEnd(14);
				const a = p.amount.toFixed(1).padStart(9);
				await BluetoothEscposPrinter.printText(`${t}${a}\n`, {});
			}
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			await BluetoothEscposPrinter.printText('Audit\n', {});
			const audit = data.audit || {};
			await BluetoothEscposPrinter.printText(`Pre Receipt Print Count  ${String(audit.preReceiptCount || 0)}\n`, {});
			await BluetoothEscposPrinter.printText(`Receipt Re-print Count   ${String(audit.receiptReprintCount || 0)}\n`, {});
			await BluetoothEscposPrinter.printText(`Void Receipt Count       ${String(audit.voidReceiptCount || 0)}\n`, {});
			await BluetoothEscposPrinter.printText(`Total Void Item Count    ${String(audit.totalVoidItemCount || 0)}\n`, {});
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			if (data.firstReceipt) {
				await BluetoothEscposPrinter.printText('First Receipt\n', {});
				await BluetoothEscposPrinter.printText(`Reference        ${data.firstReceipt.reference}\n`, {});
				if (data.firstReceipt.sequence) await BluetoothEscposPrinter.printText(`Sequence Number  ${data.firstReceipt.sequence}\n`, {});
				await BluetoothEscposPrinter.printText(`Time             ${data.firstReceipt.time}\n`, {});
				await BluetoothEscposPrinter.printText(`Net Amount       ${data.firstReceipt.netAmount.toFixed(1)}\n`, {});
			}
			if (data.lastReceipt) {
				await BluetoothEscposPrinter.printText('Last Receipt\n', {});
				await BluetoothEscposPrinter.printText(`Reference        ${data.lastReceipt.reference}\n`, {});
				if (data.lastReceipt.sequence) await BluetoothEscposPrinter.printText(`Sequence Number  ${data.lastReceipt.sequence}\n`, {});
				await BluetoothEscposPrinter.printText(`Time             ${data.lastReceipt.time}\n`, {});
				await BluetoothEscposPrinter.printText(`Net Amount       ${data.lastReceipt.netAmount.toFixed(1)}\n`, {});
			}
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			await BluetoothEscposPrinter.printText('-- End --\n', {});
			await BluetoothEscposPrinter.printAndFeed(3);
		} catch (error) {
			console.error('Daily summary print failed:', error);
			throw new Error(`Daily summary print failed: ${error}`);
		}
	},

	async printBOT(data: {
		restaurantName: string;
		ticketId: string;
		date: string;
		time: string;
		table: string;
		items: Array<{ name: string; quantity: number; price: number; orderType: string }>;
		estimatedTime: string;
		specialInstructions?: string;
		processedBy?: { role: string; username: string };
		role?: string;
	}): Promise<void> {
		if (!this.isSupported()) {
			if (TEMPORARILY_DISABLE_BLUETOOTH) {
				throw new Error('No printer available. Please connect a Bluetooth thermal printer to enable printing.');
			}
			
			// Try Expo Print fallback first
			try {
				const barItems = data.items.filter(item => item.orderType === 'BOT');
				let printContent = '';
				printContent += 'BOT\n';
				printContent += `${data.ticketId}\n`;
				printContent += `${data.date} ${data.time}\n`;
				printContent += `Table ${data.table}\n`;
				if (data.processedBy) {
					if (typeof data.processedBy === 'object' && data.processedBy.role && data.processedBy.username) {
						// New format: {role: "Staff", username: "John"}
						printContent += `${data.processedBy.role} - ${data.processedBy.username}\n`;
					} else if (typeof data.processedBy === 'string') {
						// Old format: just username string, check for separate role field
						const role = data.role || 'Staff';
						printContent += `${role} - ${data.processedBy}\n`;
					} else if (data.processedBy.role) {
						// Partial format: {role: "Staff"}
						printContent += `${data.processedBy.role} - Unknown\n`;
					}
				} else {
					printContent += 'Processed By: Staff\n';
				}
				printContent += '------------------------------\n';
				printContent += 'Item                    Qty\n';
				printContent += '------------------------------\n';
				
				for (const item of barItems) {
					const itemName = item.name.padEnd(20);
					const qty = item.quantity.toString().padStart(3);
					printContent += `${itemName}${qty}\n`;
				}
				
				printContent += '------------------------------\n';
				
				await this.printWithExpoPrint(printContent, 'Bar Order Ticket (BOT)');
				return;
			} catch (expoError) {
				console.warn('Expo Print fallback failed, trying file save:', expoError);
			}
			
			// Fallback to file
			try {
				const filename = `bot_${Date.now()}.txt`;
				const filePath = await this.printToFile(JSON.stringify(data, null, 2), filename);
				throw new Error(`Bluetooth printing not available. BOT saved to: ${filePath}`);
			} catch (fileError) {
				throw new Error(`All printing methods failed. Bluetooth: Not available, File: ${fileError}`);
			}
		}
		
		try {
			console.log('🖨️ Starting BOT print with data:', {
				ticketId: data.ticketId,
				table: data.table,
				itemsCount: data.items.length,
				barItems: data.items.filter(item => item.orderType === 'BOT').length
			});

			// Check if required methods exist
			if (!BluetoothEscposPrinter.printerInit || !BluetoothEscposPrinter.printerAlign || !BluetoothEscposPrinter.printText || !BluetoothEscposPrinter.printAndFeed) {
				throw new Error('Bluetooth printer module methods are not available');
			}
			
			// Initialize printer
			console.log('🖨️ Initializing printer...');
			await BluetoothEscposPrinter.printerInit();
			
			// Set alignment to center for header
			console.log('🖨️ Setting alignment to center...');
			await BluetoothEscposPrinter.printerAlign(getAlignment('CENTER'));
			
			// Print header
			console.log('🖨️ Printing header...');
			await BluetoothEscposPrinter.printText('BOT\n', {
				encoding: 'GBK',
				fonttype: 1,
				widthtimes: 1,
				heighttimes: 1,
			});
			await BluetoothEscposPrinter.printText(`${data.ticketId}\n`, {});
			await BluetoothEscposPrinter.printText(`${data.date} ${data.time}\n`, {});
			await BluetoothEscposPrinter.printText(`Table ${data.table}\n`, {});
			if (data.processedBy) {
				if (typeof data.processedBy === 'object' && data.processedBy.role && data.processedBy.username) {
					// New format: {role: "Staff", username: "John"}
					await BluetoothEscposPrinter.printText(`${data.processedBy.role} - ${data.processedBy.username}\n`, {});
				} else if (typeof data.processedBy === 'string') {
					// Old format: just username string, check for separate role field
					const role = data.role || 'Staff';
					await BluetoothEscposPrinter.printText(`${role} - ${data.processedBy}\n`, {});
				} else if (data.processedBy.role) {
					// Partial format: {role: "Staff"}
					await BluetoothEscposPrinter.printText(`${data.processedBy.role} - Unknown\n`, {});
				}
			} else {
				await BluetoothEscposPrinter.printText('Processed By: Staff\n', {});
			}
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			
			// Set alignment to left for items
			console.log('🖨️ Setting alignment to left for items...');
			await BluetoothEscposPrinter.printerAlign(getAlignment('LEFT'));
			await BluetoothEscposPrinter.printText('Item                    Qty\n', {});
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			
			// Print bar items only
			const barItems = data.items.filter(item => item.orderType === 'BOT');
			console.log('🖨️ Printing bar items:', barItems.length);
			
			for (const item of barItems) {
				const itemName = item.name.padEnd(20);
				const qty = item.quantity.toString().padStart(3);
				await BluetoothEscposPrinter.printText(`${itemName}${qty}\n`, {});
			}
			
			await BluetoothEscposPrinter.printText('------------------------------\n', {});
			
			// Feed paper
			console.log('🖨️ Feeding paper...');
			await BluetoothEscposPrinter.printAndFeed(3);
			
			console.log('✅ BOT print completed successfully');
		} catch (error) {
			console.error('❌ Print BOT failed:', error);
			// Try fallback methods if Bluetooth fails
			try {
				await this.printSimpleBOT(data);
				console.log('✅ BOT printed successfully with fallback method');
			} catch (fallbackError) {
				throw new Error(`BOT print failed: ${error}. Fallback also failed: ${fallbackError}`);
			}
		}
	},

	// Fallback print method using simple text formatting
	async printSimpleKOT(data: {
		restaurantName: string;
		ticketId: string;
		date: string;
		time: string;
		table: string;
		items: Array<{ name: string; quantity: number; price: number; orderType: string }>;
		estimatedTime: string;
		specialInstructions?: string;
		processedBy?: { role: string; username: string };
		role?: string;
	}): Promise<void> {
		if (!this.isSupported()) {
			throw new Error('Bluetooth printing module not available');
		}
		
		try {
			console.log('🖨️ Using fallback simple KOT print...');
			
			// Check if required methods exist
			if (!BluetoothEscposPrinter.printerInit || !BluetoothEscposPrinter.printText || !BluetoothEscposPrinter.printAndFeed) {
				throw new Error('Bluetooth printer module methods are not available');
			}
			
			await BluetoothEscposPrinter.printerInit();
			
			// Print using simple text format
			const kitchenItems = data.items.filter(item => item.orderType === 'KOT');
			
			let printContent = '';
			printContent += 'KITCHEN ORDER TICKET\n';
			printContent += `${data.restaurantName}\n`;
			printContent += '==============================\n';
			printContent += `Ticket #${data.ticketId}\n`;
			printContent += `${data.date}  ${data.time}\n`;
			printContent += `Table ${data.table}\n`;
			printContent += `Est. Time: ${data.estimatedTime}\n`;
			
			if (data.specialInstructions) {
				printContent += `Special: ${data.specialInstructions}\n`;
			}
			
			printContent += '==============================\n';
			printContent += 'KITCHEN ITEMS:\n';
			
			for (const item of kitchenItems) {
				printContent += `${item.name}\n`;
				printContent += `  ${item.quantity} x Rs. ${item.price.toFixed(2)}\n`;
			}
			
			printContent += '==============================\n';
			printContent += 'PLEASE PREPARE WITH CARE\n';
			printContent += `${new Date().toLocaleTimeString()}\n`;
			
			await BluetoothEscposPrinter.printText(printContent, { encoding: 'GBK' });
			await BluetoothEscposPrinter.printAndFeed(3);
			
			console.log('✅ Simple KOT print completed successfully');
		} catch (error) {
			console.error('❌ Simple KOT print failed:', error);
			throw new Error(`Simple KOT print failed: ${error}`);
		}
	},

	async printSimpleBOT(data: {
		restaurantName: string;
		ticketId: string;
		date: string;
		time: string;
		table: string;
		items: Array<{ name: string; quantity: number; price: number; orderType: string }>;
		estimatedTime: string;
		specialInstructions?: string;
		processedBy?: { role: string; username: string };
		role?: string;
	}): Promise<void> {
		if (!this.isSupported()) {
			throw new Error('Bluetooth printing module not available');
		}
		
		try {
			console.log('🖨️ Using fallback simple BOT print...');
			
			// Check if required methods exist
			if (!BluetoothEscposPrinter.printerInit || !BluetoothEscposPrinter.printText || !BluetoothEscposPrinter.printAndFeed) {
				throw new Error('Bluetooth printer module methods are not available');
			}
			
			await BluetoothEscposPrinter.printerInit();
			
			// Print using simple text format
			const barItems = data.items.filter(item => item.orderType === 'BOT');
			
			let printContent = '';
			printContent += 'BAR ORDER TICKET\n';
			printContent += `${data.restaurantName}\n`;
			printContent += '==============================\n';
			printContent += `Ticket #${data.ticketId}\n`;
			printContent += `${data.date}  ${data.time}\n`;
			printContent += `Table ${data.table}\n`;
			printContent += `Est. Time: ${data.estimatedTime}\n`;
			
			if (data.specialInstructions) {
				printContent += `Special: ${data.specialInstructions}\n`;
			}
			
			printContent += '==============================\n';
			printContent += 'BAR ITEMS:\n';
			
			for (const item of barItems) {
				printContent += `${item.name}\n`;
				printContent += `  ${item.quantity} x Rs. ${item.price.toFixed(2)}\n`;
			}
			
			printContent += '==============================\n';
			printContent += 'PLEASE PREPARE WITH CARE\n';
			printContent += `${new Date().toLocaleTimeString()}\n`;
			
			await BluetoothEscposPrinter.printText(printContent, { encoding: 'GBK' });
			await BluetoothEscposPrinter.printAndFeed(3);
			
			console.log('✅ Simple BOT print completed successfully');
		} catch (error) {
			console.error('❌ Simple BOT print failed:', error);
			throw new Error(`Simple BOT print failed: ${error}`);
		}
	},

	async printCombinedTickets(data: {
		restaurantName: string;
		ticketId: string;
		date: string;
		time: string;
		table: string;
		items: Array<{ name: string; quantity: number; price: number; orderType: string }>;
		estimatedTime: string;
		specialInstructions?: string;
		processedBy?: { role: string; username: string };
		role?: string;
	}): Promise<void> {
		try {
			console.log('🖨️ Starting combined tickets print:', {
				totalItems: data.items.length,
				kitchenItems: data.items.filter(item => item.orderType === 'KOT').length,
				barItems: data.items.filter(item => item.orderType === 'BOT').length
			});

			// Print KOT if kitchen items exist
			const hasKitchenItems = data.items.some(item => item.orderType === 'KOT');
			if (hasKitchenItems) {
				console.log('🖨️ Printing KOT...');
				try {
					await this.printKOT(data);
					console.log('✅ KOT printed successfully');
				} catch (kotError) {
					console.warn('⚠️ KOT print failed, trying fallback method:', kotError);
					try {
						await this.printSimpleKOT(data);
						console.log('✅ KOT printed successfully with fallback method');
					} catch (fallbackError) {
						console.error('❌ KOT fallback also failed:', fallbackError);
						throw new Error(`KOT print failed: ${kotError}. Fallback also failed: ${fallbackError}`);
					}
				}
			}

			// Print BOT if bar items exist
			const hasBarItems = data.items.some(item => item.orderType === 'BOT');
			if (hasBarItems) {
				console.log('🖨️ Printing BOT...');
				try {
					await this.printBOT(data);
					console.log('✅ BOT printed successfully');
				} catch (botError) {
					console.warn('⚠️ BOT print failed, trying fallback method:', botError);
					try {
						await this.printSimpleBOT(data);
						console.log('✅ BOT printed successfully with fallback method');
					} catch (fallbackError) {
						console.error('❌ BOT fallback also failed:', fallbackError);
						throw new Error(`BOT print failed: ${botError}. Fallback also failed: ${fallbackError}`);
					}
				}
			}

			console.log('✅ Combined tickets print completed');
		} catch (error) {
			console.error('❌ Print combined tickets failed:', error);
			throw new Error(`Combined tickets print failed: ${error}`);
		}
	},

	// Comprehensive test function for all printing methods
	async testAllPrintMethods(): Promise<{ success: boolean; results: any; errors: any }> {
		const results = {
			simpleText: false,
			receipt: false,
			kot: false,
			bot: false,
			combined: false
		};
		
		const errors: any = {};
		
		try {
			console.log('🧪 Starting comprehensive print tests...');
			
			// Test 1: Simple text print
			try {
				await this.printText('Test Print - Simple Text\n');
				results.simpleText = true;
				console.log('✅ Simple text print test passed');
			} catch (error) {
				errors.simpleText = error;
				console.error('❌ Simple text print test failed:', error);
			}
			
			// Test 2: Receipt print
			try {
				await this.printReceipt({
					restaurantName: 'ARBI POS',
					receiptId: 'TEST-001',
					date: new Date().toLocaleDateString(),
					time: new Date().toLocaleTimeString(),
					table: 'Test Table',
					items: [
						{ name: 'Test Item 1', quantity: 2, price: 10.00 },
						{ name: 'Test Item 2', quantity: 1, price: 15.00 }
					],
					taxLabel: 'Tax',
					serviceLabel: 'Service',
					subtotal: 35.00,
					tax: 3.50,
					service: 3.50,
					total: 42.00,
					payment: { method: 'Cash', amountPaid: 50.00, change: 8.00 }
				});
				results.receipt = true;
				console.log('✅ Receipt print test passed');
			} catch (error) {
				errors.receipt = error;
				console.error('❌ Receipt print test failed:', error);
			}
			
			// Test 3: KOT print
			try {
				await this.printKOT({
					restaurantName: 'ARBI POS',
					ticketId: 'KOT-TEST-001',
					date: new Date().toLocaleDateString(),
					time: new Date().toLocaleTimeString(),
					table: 'Test Table',
					items: [
						{ name: 'Test Kitchen Item', quantity: 1, price: 20.00, orderType: 'KOT' }
					],
					estimatedTime: '15-20 minutes'
				});
				results.kot = true;
				console.log('✅ KOT print test passed');
			} catch (error) {
				errors.kot = error;
				console.error('❌ KOT print test failed:', error);
			}
			
			// Test 4: BOT print
			try {
				await this.printBOT({
					restaurantName: 'ARBI POS',
					ticketId: 'BOT-TEST-001',
					date: new Date().toLocaleDateString(),
					time: new Date().toLocaleTimeString(),
					table: 'Test Table',
					items: [
						{ name: 'Test Bar Item', quantity: 1, price: 25.00, orderType: 'BOT' }
					],
					estimatedTime: '5-10 minutes'
				});
				results.bot = true;
				console.log('✅ BOT print test passed');
			} catch (error) {
				errors.bot = error;
				console.error('❌ BOT print test failed:', error);
			}
			
			// Test 5: Combined tickets print
			try {
				await this.printCombinedTickets({
					restaurantName: 'ARBI POS',
					ticketId: 'COMBO-TEST-001',
					date: new Date().toLocaleDateString(),
					time: new Date().toLocaleTimeString(),
					table: 'Test Table',
					items: [
						{ name: 'Test Kitchen Item', quantity: 1, price: 20.00, orderType: 'KOT' },
						{ name: 'Test Bar Item', quantity: 1, price: 25.00, orderType: 'BOT' }
					],
					estimatedTime: '15-20 minutes'
				});
				results.combined = true;
				console.log('✅ Combined tickets print test passed');
			} catch (error) {
				errors.combined = error;
				console.error('❌ Combined tickets print test failed:', error);
			}
			
			const success = Object.values(results).some(result => result === true);
			
			return {
				success,
				results,
				errors
			};
			
		} catch (error) {
			console.error('❌ Comprehensive print test failed:', error);
			return {
				success: false,
				results,
				errors: { general: error }
			};
		}
	},

	// Fallback print method using simple text formatting
};



