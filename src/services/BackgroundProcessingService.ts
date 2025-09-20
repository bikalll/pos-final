import { InventoryItem } from '../utils/types';

interface InventoryCalculationTask {
  id: string;
  orderId: string;
  restaurantId: string;
  deltas: Array<{ name: string; requiredQty: number; unit?: string }>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface ProcessingQueue {
  inventory: InventoryCalculationTask[];
  orders: any[];
  receipts: any[];
}

class BackgroundProcessingService {
  private queue: ProcessingQueue = {
    inventory: [],
    orders: [],
    receipts: []
  };
  
  private processing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly PROCESSING_INTERVAL = 1000; // Process every 1 second
  private readonly MAX_CONCURRENT_TASKS = 3;
  private activeTasks = 0;

  constructor() {
    this.startProcessing();
  }

  /**
   * Start the background processing loop
   */
  private startProcessing() {
    if (this.processingInterval) return;
    
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, this.PROCESSING_INTERVAL);
    
    console.log('🔄 BackgroundProcessingService: Started background processing');
  }

  /**
   * Stop the background processing loop
   */
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log('🔄 BackgroundProcessingService: Stopped background processing');
  }

  /**
   * Add inventory calculation task to queue
   */
  addInventoryCalculationTask(
    orderId: string,
    restaurantId: string,
    deltas: Array<{ name: string; requiredQty: number; unit?: string }>
  ) {
    const taskId = `${orderId}-${Date.now()}`;
    const task: InventoryCalculationTask = {
      id: taskId,
      orderId,
      restaurantId,
      deltas,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3
    };

    // Remove any existing task for the same order
    this.queue.inventory = this.queue.inventory.filter(t => t.orderId !== orderId);
    this.queue.inventory.push(task);
    
    console.log('🔄 BackgroundProcessingService: Added inventory calculation task:', taskId);
  }

  /**
   * Add order processing task to queue
   */
  addOrderProcessingTask(order: any, restaurantId: string) {
    const task = {
      id: `${order.id}-${Date.now()}`,
      order,
      restaurantId,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3
    };

    // Remove any existing task for the same order
    this.queue.orders = this.queue.orders.filter(t => t.order.id !== order.id);
    this.queue.orders.push(task);
    
    console.log('🔄 BackgroundProcessingService: Added order processing task:', task.id);
  }

  /**
   * Add receipt processing task to queue
   */
  addReceiptProcessingTask(order: any, restaurantId: string) {
    const task = {
      id: `${order.id}-receipt-${Date.now()}`,
      order,
      restaurantId,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3
    };

    // Remove any existing task for the same order
    this.queue.receipts = this.queue.receipts.filter(t => t.order.id !== order.id);
    this.queue.receipts.push(task);
    
    console.log('🔄 BackgroundProcessingService: Added receipt processing task:', task.id);
  }

  /**
   * Process the queue
   */
  private async processQueue() {
    if (this.activeTasks >= this.MAX_CONCURRENT_TASKS) return;

    // Process inventory calculations first (highest priority)
    if (this.queue.inventory.length > 0 && this.activeTasks < this.MAX_CONCURRENT_TASKS) {
      const task = this.queue.inventory.shift();
      if (task) {
        this.activeTasks++;
        this.processInventoryTask(task).finally(() => {
          this.activeTasks--;
        });
      }
    }

    // Process orders
    if (this.queue.orders.length > 0 && this.activeTasks < this.MAX_CONCURRENT_TASKS) {
      const task = this.queue.orders.shift();
      if (task) {
        this.activeTasks++;
        this.processOrderTask(task).finally(() => {
          this.activeTasks--;
        });
      }
    }

    // Process receipts
    if (this.queue.receipts.length > 0 && this.activeTasks < this.MAX_CONCURRENT_TASKS) {
      const task = this.queue.receipts.shift();
      if (task) {
        this.activeTasks++;
        this.processReceiptTask(task).finally(() => {
          this.activeTasks--;
        });
      }
    }
  }

  /**
   * Process inventory calculation task
   */
  private async processInventoryTask(task: InventoryCalculationTask) {
    try {
      console.log('🔄 BackgroundProcessingService: Processing inventory task:', task.id);
      
      const { createFirestoreService } = await import('./firestoreService');
      const svc = createFirestoreService(task.restaurantId);
      
      // Get current inventory state
      const inventory = await svc.getInventoryItems();
      
      // Process inventory deductions with validation
      const updates: Array<{ id: string; stockQuantity: number; name: string }> = [];
      const warnings: Array<{ name: string; required: number; available: number }> = [];
      
      for (const delta of task.deltas) {
        const inventoryItem = Object.values(inventory).find((item: any) => 
          item.name?.toLowerCase().trim() === delta.name.toLowerCase().trim()
        ) as any;
        
        if (inventoryItem) {
          const currentStock = Number(inventoryItem.stockQuantity) || 0;
          const requiredQty = Number(delta.requiredQty) || 0;
          const newStock = Math.max(0, currentStock - requiredQty);
          
          // Check for insufficient stock
          if (currentStock < requiredQty) {
            warnings.push({
              name: delta.name,
              required: requiredQty,
              available: currentStock
            });
            console.warn(`⚠️ Insufficient stock for ${delta.name}: required ${requiredQty}, available ${currentStock}`);
          }
          
          updates.push({
            id: inventoryItem.id,
            stockQuantity: newStock,
            name: delta.name
          });
          
          console.log(`🔍 Inventory deduction planned: ${delta.name} (${currentStock} → ${newStock})`);
        } else {
          console.warn(`⚠️ Inventory item not found for deduction: ${delta.name}`);
        }
      }
      
      // Batch update inventory items
      if (updates.length > 0) {
        await this.batchUpdateInventory(svc, updates);
        console.log('✅ BackgroundProcessingService: Inventory task completed:', task.id);
        
        // Log warnings if any
        if (warnings.length > 0) {
          console.warn('⚠️ Inventory warnings:', warnings);
        }
      } else {
        console.log('ℹ️ BackgroundProcessingService: No inventory updates needed');
      }
      
    } catch (error) {
      console.error('❌ BackgroundProcessingService: Inventory task failed:', task.id, error);
      
      // Retry logic
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.timestamp = Date.now() + (task.retryCount * 5000); // Exponential backoff
        this.queue.inventory.push(task);
        console.log('🔄 BackgroundProcessingService: Retrying inventory task:', task.id, 'attempt:', task.retryCount);
      } else {
        console.error('❌ BackgroundProcessingService: Inventory task failed permanently:', task.id);
      }
    }
  }

  /**
   * Process order task
   */
  private async processOrderTask(task: any) {
    try {
      console.log('🔄 BackgroundProcessingService: Processing order task:', task.id);
      
      const { createFirestoreService } = await import('./firestoreService');
      const { cleanOrderData } = await import('../utils/orderUtils');
      
      const svc = createFirestoreService(task.restaurantId);
      const cleanOrder = cleanOrderData(task.order);
      
      await svc.saveOrder({ ...cleanOrder, restaurantId: task.restaurantId });
      console.log('✅ BackgroundProcessingService: Order task completed:', task.id);
      
    } catch (error) {
      console.error('❌ BackgroundProcessingService: Order task failed:', task.id, error);
      
      // Retry logic
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.timestamp = Date.now() + (task.retryCount * 5000);
        this.queue.orders.push(task);
        console.log('🔄 BackgroundProcessingService: Retrying order task:', task.id, 'attempt:', task.retryCount);
      }
    }
  }

  /**
   * Process receipt task
   */
  private async processReceiptTask(task: any) {
    try {
      console.log('🔄 BackgroundProcessingService: Processing receipt task:', task.id);
      
      const { getAutoReceiptService } = await import('./autoReceiptService');
      const autoReceiptService = getAutoReceiptService();
      
      if (autoReceiptService) {
        await autoReceiptService.saveReceiptForOrder(task.order);
        console.log('✅ BackgroundProcessingService: Receipt task completed:', task.id);
      }
      
    } catch (error) {
      console.error('❌ BackgroundProcessingService: Receipt task failed:', task.id, error);
      
      // Retry logic
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.timestamp = Date.now() + (task.retryCount * 5000);
        this.queue.receipts.push(task);
        console.log('🔄 BackgroundProcessingService: Retrying receipt task:', task.id, 'attempt:', task.retryCount);
      }
    }
  }

  /**
   * Batch update inventory items with retry logic
   */
  private async batchUpdateInventory(svc: any, updates: Array<{ id: string; stockQuantity: number; name?: string }>) {
    const batchSize = 5; // Process 5 items at a time
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      try {
        await Promise.all(
          batch.map(update => 
            this.updateInventoryWithRetry(svc, update.id, { stockQuantity: update.stockQuantity })
          )
        );
      } catch (error) {
        console.error('❌ BackgroundProcessingService: Batch inventory update failed:', error);
        // Continue with next batch
      }
    }
  }

  /**
   * Update inventory item with retry logic
   */
  private async updateInventoryWithRetry(svc: any, itemId: string, updates: any, maxRetries = 3) {
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        await svc.updateInventoryItem(itemId, updates);
        return;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Get queue status for monitoring
   */
  getQueueStatus() {
    return {
      inventory: this.queue.inventory.length,
      orders: this.queue.orders.length,
      receipts: this.queue.receipts.length,
      activeTasks: this.activeTasks,
      processing: this.processingInterval !== null
    };
  }

  /**
   * Clear all queues
   */
  clearQueues() {
    this.queue.inventory = [];
    this.queue.orders = [];
    this.queue.receipts = [];
    console.log('🔄 BackgroundProcessingService: Cleared all queues');
  }
}

// Singleton instance
let backgroundProcessingService: BackgroundProcessingService | null = null;

export function getBackgroundProcessingService(): BackgroundProcessingService {
  if (!backgroundProcessingService) {
    backgroundProcessingService = new BackgroundProcessingService();
  }
  return backgroundProcessingService;
}

export function initializeBackgroundProcessingService(): BackgroundProcessingService {
  if (backgroundProcessingService) {
    backgroundProcessingService.stopProcessing();
  }
  backgroundProcessingService = new BackgroundProcessingService();
  return backgroundProcessingService;
}

export default BackgroundProcessingService;
