import { getFunctions, httpsCallable } from 'firebase/functions';

// Cloud Functions for heavy processing
export class CloudFunctionsService {
  private functions = getFunctions();
  
  // Process inventory deduction
  async processInventoryDeduction(data: { restaurantId: string; orderIds: string[] }) {
    try {
      const processInventory = httpsCallable(this.functions, 'processInventoryDeduction');
      const result = await processInventory(data);
      return result.data;
    } catch (error) {
      console.error('❌ Cloud Function error:', error);
      throw error;
    }
  }
  
  // Process table status updates
  async processTableStatusUpdates(data: { restaurantId: string; updates: any[] }) {
    try {
      const processTables = httpsCallable(this.functions, 'processTableStatusUpdates');
      const result = await processTables(data);
      return result.data;
    } catch (error) {
      console.error('❌ Cloud Function error:', error);
      throw error;
    }
  }
  
  // Process order aggregation
  async processOrderAggregation(data: { restaurantId: string; dateRange: { start: Date; end: Date } }) {
    try {
      const processOrders = httpsCallable(this.functions, 'processOrderAggregation');
      const result = await processOrders(data);
      return result.data;
    } catch (error) {
      console.error('❌ Cloud Function error:', error);
      throw error;
    }
  }
  
  // Process customer analytics
  async processCustomerAnalytics(data: { restaurantId: string; customerId: string }) {
    try {
      const processAnalytics = httpsCallable(this.functions, 'processCustomerAnalytics');
      const result = await processAnalytics(data);
      return result.data;
    } catch (error) {
      console.error('❌ Cloud Function error:', error);
      throw error;
    }
  }
  
  // Process receipt generation
  async processReceiptGeneration(data: { orderId: string; restaurantId: string; template: string }) {
    try {
      const processReceipt = httpsCallable(this.functions, 'processReceiptGeneration');
      const result = await processReceipt(data);
      return result.data;
    } catch (error) {
      console.error('❌ Cloud Function error:', error);
      throw error;
    }
  }
}

// Singleton instance
const cloudFunctionsService = new CloudFunctionsService();

export default cloudFunctionsService;
