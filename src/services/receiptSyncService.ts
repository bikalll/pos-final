import { createFirestoreService } from './firestoreService';

export class ReceiptSyncService {
  private restaurantId: string;
  private firestoreService: any;

  constructor(restaurantId: string) {
    this.restaurantId = restaurantId;
    this.firestoreService = createFirestoreService(restaurantId);
  }

  // Save receipt to Firebase
  async saveReceipt(receipt: any): Promise<void> {
    try {
      // Filter out undefined values before saving to Firebase
      const cleanReceipt = Object.fromEntries(
        Object.entries(receipt).filter(([_, value]) => value !== undefined)
      );
      
      console.log('🧹 Cleaned receipt data:', cleanReceipt);
      
      // Use saveReceipt method from the new service
      await this.firestoreService.saveReceipt(cleanReceipt);
      console.log('✅ Receipt saved to Firebase:', receipt.id);
    } catch (error) {
      console.error('❌ Error saving receipt to Firebase:', error);
      throw error;
    }
  }

  // Get all receipts from Firebase
  async getReceipts(): Promise<Record<string, any>> {
    try {
      // Cursor-defined variable for the active account ID
      const currentAccountId = this.restaurantId;
      
      console.log('📍 ReceiptSyncService.getReceipts - Current Account ID:', currentAccountId);
      
      const receipts = await this.firestoreService.getReceipts();
      
      // Canary check to validate results
      const receiptsArray = Object.values(receipts);
      const otherAccountReceipts = receiptsArray.filter((receipt: any) => 
        receipt.restaurantId && receipt.restaurantId !== currentAccountId
      );
      
      if (otherAccountReceipts.length > 0) {
        console.error('🚨 SECURITY: ReceiptSyncService found receipts from other accounts', 
          otherAccountReceipts.map((r: any) => ({ id: r.id, accountId: r.restaurantId }))
        );
        throw new Error(`Security violation: ReceiptSyncService found ${otherAccountReceipts.length} receipts from other accounts`);
      }
      
      console.log('✅ ReceiptSyncService - All receipts belong to current account:', currentAccountId);
      return receipts;
    } catch (error) {
      console.error('❌ Error getting receipts from Firebase:', error);
      throw error;
    }
  }
}

// Global instance
let globalReceiptSyncService: ReceiptSyncService | null = null;

export const initializeReceiptSync = (restaurantId: string): ReceiptSyncService => {
  globalReceiptSyncService = new ReceiptSyncService(restaurantId);
  return globalReceiptSyncService;
};

export const getReceiptSyncService = (): ReceiptSyncService | null => {
  return globalReceiptSyncService;
};
