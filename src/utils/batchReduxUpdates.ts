import { batch } from 'react-redux';
import { AppDispatch } from '../redux/storeFirebase';

interface BatchUpdate {
  action: any;
  priority: number;
  timestamp: number;
}

class BatchUpdateManager {
  private updateQueue: BatchUpdate[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly batchSize = 10;
  private readonly batchTimeout = 100; // ms
  private readonly maxQueueSize = 50;
  
  addUpdate(action: any, priority: number = 0) {
    // Remove duplicate actions
    this.updateQueue = this.updateQueue.filter(
      update => update.action.type !== action.type || 
                update.action.payload?.id !== action.payload?.id
    );
    
    // Add new update
    this.updateQueue.push({
      action,
      priority,
      timestamp: Date.now()
    });
    
    // Sort by priority (higher first)
    this.updateQueue.sort((a, b) => b.priority - a.priority);
    
    // Limit queue size
    if (this.updateQueue.length > this.maxQueueSize) {
      this.updateQueue = this.updateQueue.slice(0, this.maxQueueSize);
    }
    
    this.scheduleBatch();
  }
  
  private scheduleBatch() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.batchTimeout);
  }
  
  private processBatch() {
    if (this.updateQueue.length === 0) return;
    
    const updates = this.updateQueue.splice(0, this.batchSize);
    const actions = updates.map(update => update.action);
    
    // Process batch updates
    if (actions.length > 0) {
      console.log(`🔄 Processing batch of ${actions.length} updates`);
      this.executeBatch(actions);
    }
    
    // Continue processing if more updates in queue
    if (this.updateQueue.length > 0) {
      this.scheduleBatch();
    }
  }
  
  private executeBatch(actions: any[]) {
    // Group actions by type for better performance
    const groupedActions = actions.reduce((acc, action) => {
      const type = action.type.split('/')[0];
      if (!acc[type]) acc[type] = [];
      acc[type].push(action);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Execute grouped actions
    Object.values(groupedActions).forEach(actionGroup => {
      if (actionGroup.length === 1) {
        // Single action, execute directly
        this.dispatchAction(actionGroup[0]);
      } else {
        // Multiple actions, use batch
        batch(() => {
          actionGroup.forEach(action => this.dispatchAction(action));
        });
      }
    });
  }
  
  private dispatchAction(action: any) {
    // This will be set by the hook
    if (this.dispatch) {
      this.dispatch(action);
    }
  }
  
  private dispatch: AppDispatch | null = null;
  
  setDispatch(dispatch: AppDispatch) {
    this.dispatch = dispatch;
  }
  
  clear() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.updateQueue = [];
  }
  
  getQueueSize() {
    return this.updateQueue.length;
  }
  
  getMetrics() {
    return {
      queueSize: this.updateQueue.length,
      hasTimer: !!this.batchTimer,
      oldestUpdate: this.updateQueue[0]?.timestamp || 0
    };
  }
}

// Singleton instance
const batchManager = new BatchUpdateManager();

export const useBatchReduxUpdates = (dispatch: AppDispatch) => {
  // Set dispatch on manager
  batchManager.setDispatch(dispatch);
  
  const addBatchUpdate = (action: any, priority: number = 0) => {
    batchManager.addUpdate(action, priority);
  };
  
  const clearBatchQueue = () => {
    batchManager.clear();
  };
  
  const getBatchMetrics = () => {
    return batchManager.getMetrics();
  };
  
  return {
    addBatchUpdate,
    clearBatchQueue,
    getBatchMetrics
  };
};

// High-priority update function
export const addHighPriorityUpdate = (action: any) => {
  batchManager.addUpdate(action, 10);
};

// Low-priority update function
export const addLowPriorityUpdate = (action: any) => {
  batchManager.addUpdate(action, 0);
};

// Critical update function (immediate)
export const addCriticalUpdate = (action: any) => {
  batchManager.addUpdate(action, 100);
};

export default batchManager;
