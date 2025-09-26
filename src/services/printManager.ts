import { blePrinter } from './blePrinter';
import { printerDiscovery, PrinterDevice } from './printerDiscovery';
import { printerRegistry, PrinterRole } from './printerRegistry';

export interface PrintJob {
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

export interface PrintQueue {
  printerId: string;
  jobs: PrintJob[];
  isProcessing: boolean;
  lastProcessed?: Date;
}

export interface PrintManagerStatus {
  isInitialized: boolean;
  totalJobs: number;
  pendingJobs: number;
  completedJobs: number;
  failedJobs: number;
  activeQueues: number;
  connectedPrinters: number;
  error?: string;
}

export interface PrintEvent {
  type: 'job_started' | 'job_completed' | 'job_failed' | 'printer_connected' | 'printer_disconnected' | 'queue_updated';
  jobId?: string;
  printerId?: string;
  role?: PrinterRole;
  message: string;
  timestamp: Date;
  data?: any;
}

class PrintManagerService {
  private queues: Map<string, PrintQueue> = new Map();
  private status: PrintManagerStatus = {
    isInitialized: false,
    totalJobs: 0,
    pendingJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    activeQueues: 0,
    connectedPrinters: 0,
  };
  private eventListeners: Set<(event: PrintEvent) => void> = new Set();
  private processingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isProcessing = false;
  // Global mutex to serialize Bluetooth printing
  private jobLock: Promise<void> = Promise.resolve();
  private jobLockResolver: (() => void) | null = null;
  // Auto-reconnect monitoring
  private connectionMonitor: NodeJS.Timeout | null = null;
  private reconnectBackoffMs = 2000;
  private readonly reconnectBackoffMaxMs = 30000;

  private async runExclusively<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.jobLock;
    let release: () => void;
    this.jobLock = new Promise<void>((resolve) => { release = resolve; });
    this.jobLockResolver = release!;
    await previous.catch(() => {});
    try {
      return await fn();
    } finally {
      if (this.jobLockResolver) {
        this.jobLockResolver();
        this.jobLockResolver = null;
      }
    }
  }

  // Initialize the print manager
  async initialize(): Promise<void> {
    try {
      console.log('🖨️ Initializing Print Manager...');
      
      // Initialize printer registry
      await printerRegistry.initialize();
      
      // Initialize printer persistence
      const { printerPersistence } = await import('./printerPersistence');
      await printerPersistence.initialize();
      
      // Set up printer discovery listeners
      printerDiscovery.addDiscoveryListener((printers, discoveryStatus) => {
        this.updateStatus();
        this.emitEvent({
          type: 'queue_updated',
          message: `Discovered ${printers.length} printers`,
          timestamp: new Date(),
        });
      });

      // Seed saved printers into discovery and attempt immediate reconnect without scanning
      await this.seedAndReconnectSavedPrinters();

      this.status.isInitialized = true;
      this.updateStatus();
      
      console.log('✅ Print Manager initialized successfully');

      // Start auto-reconnect monitoring
      this.startConnectionMonitor();
    } catch (error) {
      console.error('❌ Failed to initialize Print Manager:', error);
      this.status.error = `Initialization failed: ${error}`;
      throw error;
    }
  }

  // Periodically ensure assigned printers stay connected; backoff on failures
  private startConnectionMonitor(): void {
    if (this.connectionMonitor) return;
    this.connectionMonitor = setInterval(async () => {
      try {
        const registryState = printerRegistry.getState();
        // Build set of assigned printerIds
        const assigned = new Set<string>();
        registryState.mappings.forEach((m) => { if (m.enabled) assigned.add(m.printerId); });
        if (assigned.size === 0) return;

        const printers = (await import('./printerDiscovery')).printerDiscovery.getDiscoveredPrinters();
        // Check each assigned printer
        for (const printerId of Array.from(assigned)) {
          const printer = printers.find(p => p.id === printerId);
          if (!printer) {
            // Not discovered recently, try a soft reconnect using saved ID
            const ok = await this.reconnectPrinter(printerId).catch(() => false);
            if (!ok) {
              // Slow down interval via backoff if repeated failures
              this.reconnectBackoffMs = Math.min(this.reconnectBackoffMs * 2, this.reconnectBackoffMaxMs);
            } else {
              this.reconnectBackoffMs = 2000;
            }
            continue;
          }
          // If connected, skip
          if (printer.connected) continue;
          // If we have RSSI and it's very low, treat as possibly out of range; skip aggressive attempts
          if (typeof printer.rssi === 'number' && printer.rssi < -90) {
            continue;
          }
          // Attempt reconnect
          const ok = await this.reconnectPrinter(printerId).catch(() => false);
          if (!ok) {
            this.reconnectBackoffMs = Math.min(this.reconnectBackoffMs * 2, this.reconnectBackoffMaxMs);
          } else {
            this.reconnectBackoffMs = 2000;
          }
        }
      } catch (e) {
        // On unexpected error, don't crash the monitor
        // Slightly increase backoff to reduce churn
        this.reconnectBackoffMs = Math.min(this.reconnectBackoffMs * 2, this.reconnectBackoffMaxMs);
      } finally {
        // If backoff changed, recreate interval with new delay
        if (this.connectionMonitor) {
          clearInterval(this.connectionMonitor);
          this.connectionMonitor = null;
          this.connectionMonitor = setInterval(() => this.startConnectionMonitorTick(), this.reconnectBackoffMs) as any;
        }
      }
    }, this.reconnectBackoffMs) as any;
  }

  // Separate tick function to allow resetting interval after backoff changes
  private async startConnectionMonitorTick(): Promise<void> {
    // Clear and restart monitor to apply current backoff
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
      this.connectionMonitor = null;
    }
    this.startConnectionMonitor();
  }

  // Attempt to reconnect to saved printers on startup without requiring a scan
  private async seedAndReconnectSavedPrinters(): Promise<void> {
    try {
      const { printerPersistence } = await import('./printerPersistence');
      const saved = await printerPersistence.loadAllPrinterConfigs();
      if (!saved || saved.length === 0) return;

      for (const cfg of saved) {
        // Ensure printer exists in discovery map
        let printer = printerDiscovery.getPrinter(cfg.printerId);
        if (!printer) {
          const { type, address } = this.parsePrinterId(cfg.printerId);
          // Add a placeholder device so we can connect without scanning
          printer = printerDiscovery.addPrinterManually(cfg.printerName, address, type);
        }

        // Try reconnect
        await this.reconnectPrinter(cfg.printerId);
      }
    } catch (error) {
      console.warn('⚠️ Seed-and-reconnect of saved printers failed:', error);
    }
  }

  private parsePrinterId(printerId: string): { type: 'bluetooth_classic' | 'ble'; address: string } {
    const underscoreIndex = printerId.indexOf('_');
    if (underscoreIndex === -1) {
      return { type: 'bluetooth_classic', address: printerId } as any;
    }
    const typeStr = printerId.substring(0, underscoreIndex) as 'bluetooth_classic' | 'ble';
    const address = printerId.substring(underscoreIndex + 1);
    const type: any = (typeStr === 'ble' || typeStr === 'bluetooth_classic') ? typeStr : 'bluetooth_classic';
    return { type, address };
  }

  // Add event listener
  addEventListener(listener: (event: PrintEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  // Emit event to listeners
  private emitEvent(event: PrintEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  // Update status
  private updateStatus(): void {
    const printers = printerDiscovery.getDiscoveredPrinters();
    const connectedPrinters = printers.filter(p => p.connected);
    
    this.status.connectedPrinters = connectedPrinters.length;
    this.status.activeQueues = this.queues.size;
    
    // Count jobs by status
    let totalJobs = 0;
    let pendingJobs = 0;
    let completedJobs = 0;
    let failedJobs = 0;
    
    this.queues.forEach(queue => {
      totalJobs += queue.jobs.length;
      pendingJobs += queue.jobs.filter(job => job.status === 'pending').length;
      completedJobs += queue.jobs.filter(job => job.status === 'completed').length;
      failedJobs += queue.jobs.filter(job => job.status === 'failed').length;
    });
    
    this.status.totalJobs = totalJobs;
    this.status.pendingJobs = pendingJobs;
    this.status.completedJobs = completedJobs;
    this.status.failedJobs = failedJobs;
  }

  // Get current status
  getStatus(): PrintManagerStatus {
    return { ...this.status };
  }

  // Print for a specific role
  async printRole(role: PrinterRole, payload: any, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<string> {
    try {
      // Get printer mapping for role
      let mapping = printerRegistry.getPrinterMapping(role);
      // Strict routing: require an enabled mapping for this role
      if (!mapping || !mapping.enabled) {
        throw new Error(`No enabled printer mapping for role: ${role}. Assign a printer in Printer Setup.`);
      }

      const targetPrinter = printerDiscovery.getPrinter(mapping.printerId);
      if (!targetPrinter) {
        throw new Error(`Assigned printer not found for role: ${role}. Check Printer Setup.`);
      }

      console.log(`🎯 Routing print for role ${role} -> ${targetPrinter.name} (${targetPrinter.address})`);

      // Create print job
      const job: PrintJob = {
        id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role,
        printerId: targetPrinter.id,
        payload,
        priority,
        status: 'pending',
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
        metadata: {
          role,
          printerName: targetPrinter.name,
        },
      };

      // Add job to queue
      await this.addJobToQueue(job);

      // Update last used time
      await printerRegistry.updateLastUsed(role);

      console.log(`📋 Print job created for ${role}: ${job.id}`);
      return job.id;
    } catch (error) {
      console.error(`❌ Failed to create print job for ${role}:`, error);
      throw error;
    }
  }

  // Print for multiple roles (order processing)
  async printForOrder(jobs: Array<{ role: PrinterRole; payload: any; priority?: 'high' | 'normal' | 'low' }>): Promise<string[]> {
    try {
      const jobIds: string[] = [];
      
      // Create jobs for each role
      for (const jobData of jobs) {
        const jobId = await this.printRole(
          jobData.role,
          jobData.payload,
          jobData.priority || 'normal'
        );
        jobIds.push(jobId);
      }

      console.log(`📋 Created ${jobIds.length} print jobs for order`);
      return jobIds;
    } catch (error) {
      console.error('❌ Failed to create print jobs for order:', error);
      throw error;
    }
  }

  // Add job to queue
  private async addJobToQueue(job: PrintJob): Promise<void> {
    const queue = this.queues.get(job.printerId) || {
      printerId: job.printerId,
      jobs: [],
      isProcessing: false,
    };

    // Add job to queue (sorted by priority)
    queue.jobs.push(job);
    queue.jobs.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    this.queues.set(job.printerId, queue);
    this.updateStatus();

    // Start processing if not already processing
    if (!this.isProcessing) {
      this.startProcessing();
    }

    // Ensure this specific queue begins processing, even if the manager is already running
    // This prevents newly added jobs from waiting indefinitely until a global restart
    this.processQueue(job.printerId);

    this.emitEvent({
      type: 'queue_updated',
      jobId: job.id,
      printerId: job.printerId,
      role: job.role,
      message: `Job added to queue`,
      timestamp: new Date(),
    });
  }

  // Start processing queues
  private startProcessing(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('🔄 Starting print queue processing...');

    // Process each queue
    this.queues.forEach((queue, printerId) => {
      this.processQueue(printerId);
    });
  }

  // Process a specific queue
  private async processQueue(printerId: string): Promise<void> {
    const queue = this.queues.get(printerId);
    if (!queue || queue.isProcessing) return;

    queue.isProcessing = true;
    this.queues.set(printerId, queue);

    try {
      while (queue.jobs.length > 0) {
        const job = queue.jobs[0];
        
        // Do not pre-skip jobs based on connection; processJob will handle reconnects

        // Process the job
        await this.processJob(job);
        
        // Remove completed job from queue
        queue.jobs.shift();
        queue.lastProcessed = new Date();
      }
    } catch (error) {
      console.error(`❌ Error processing queue for printer ${printerId}:`, error);
    } finally {
      queue.isProcessing = false;
      this.queues.set(printerId, queue);
      this.updateStatus();
    }
  }

  // Process a single job
  private async processJob(job: PrintJob): Promise<void> {
    try {
      console.log(`🖨️ Processing job ${job.id} for ${job.role}`);

      await this.runExclusively(async () => {
        job.status = 'printing';
        job.startedAt = new Date();
        this.updateStatus();

        this.emitEvent({
          type: 'job_started',
          jobId: job.id,
          printerId: job.printerId,
          role: job.role,
          message: `Job started printing`,
          timestamp: new Date(),
        });

        // Get printer and ensure connection (force switch)
        const printer = printerDiscovery.getPrinter(job.printerId);
        if (!printer) {
          throw new Error(`Printer not found: ${job.printerId}`);
        }

        // Disconnect current, then connect to target with delays/retries
        try {
          console.log('🔌 Forcing disconnect from any current Bluetooth printer');
          try { await blePrinter.disconnect(); } catch {}
          await new Promise(resolve => setTimeout(resolve, 400));

          console.log(`🔗 Connecting to mapped printer: ${printer.name} (${printer.address})`);
          try {
            await blePrinter.connect(printer.address);
          } catch (firstErr) {
            console.warn('First connect attempt failed, retrying once...', firstErr);
            await new Promise(resolve => setTimeout(resolve, 600));
            try {
              await blePrinter.connect(printer.address);
            } catch (secondErr) {
              console.warn('Second connect attempt failed, trying manager-assisted reconnect...', secondErr);
              try {
                await this.reconnectPrinter(job.printerId);
              } catch (mgrErr) {
                throw secondErr;
              }
            }
          }

          try { printerDiscovery.updatePrinterStatus(job.printerId, 'connected'); } catch {}
          console.log(`✅ Connected to printer: ${printer.name}`);
        } catch (switchErr) {
          console.warn('Bluetooth forced reconnect failed (continuing):', switchErr);
        }

        // Print based on role
        await this.printJobContent(job);

        // Mark job as completed
        job.status = 'completed';
        job.completedAt = new Date();

        // Reset retry count on success
        printerRegistry.resetRetryAttempts();

        this.emitEvent({
          type: 'job_completed',
          jobId: job.id,
          printerId: job.printerId,
          role: job.role,
          message: `Job completed successfully`,
          timestamp: new Date(),
        });

        console.log(`✅ Job ${job.id} completed successfully`);
      });
    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);
      
      job.status = 'failed';
      job.error = String(error);
      job.completedAt = new Date();
      job.retryCount++;

      // Check if we should retry
      if (job.retryCount < job.maxRetries) {
        console.log(`🔄 Retrying job ${job.id} (attempt ${job.retryCount + 1}/${job.maxRetries})`);
        
        // Add job back to queue for retry
        job.status = 'pending';
        job.createdAt = new Date();
        await this.addJobToQueue(job);
        
        // Increment retry attempts in registry
        printerRegistry.incrementRetryAttempts();
      } else {
        console.error(`❌ Job ${job.id} failed after ${job.maxRetries} attempts`);
        printerRegistry.incrementRetryAttempts();
      }

      this.emitEvent({
        type: 'job_failed',
        jobId: job.id,
        printerId: job.printerId,
        role: job.role,
        message: `Job failed: ${error}`,
        timestamp: new Date(),
        data: { error: String(error), retryCount: job.retryCount },
      });
    }
  }

  // Print job content based on role
  private async printJobContent(job: PrintJob): Promise<void> {
    const { role, payload } = job;

    switch (role) {
      case 'BOT':
        await blePrinter.printBOT(payload);
        break;
      case 'KOT':
        await blePrinter.printKOT(payload);
        break;
      case 'Receipt':
        await blePrinter.printReceipt(payload);
        break;
      default:
        throw new Error(`Unknown print role: ${role}`);
    }
  }

  // Get queue for a printer
  getQueue(printerId: string): PrintQueue | undefined {
    return this.queues.get(printerId);
  }

  // Get all queues
  getAllQueues(): Map<string, PrintQueue> {
    return new Map(this.queues);
  }

  // Get job by ID
  getJob(jobId: string): PrintJob | undefined {
    for (const queue of this.queues.values()) {
      const job = queue.jobs.find(j => j.id === jobId);
      if (job) return job;
    }
    return undefined;
  }

  // Cancel a job
  async cancelJob(jobId: string): Promise<boolean> {
    for (const [printerId, queue] of this.queues.entries()) {
      const jobIndex = queue.jobs.findIndex(j => j.id === jobId);
      if (jobIndex !== -1) {
        const job = queue.jobs[jobIndex];
        job.status = 'cancelled';
        job.completedAt = new Date();
        queue.jobs.splice(jobIndex, 1);
        
        this.queues.set(printerId, queue);
        this.updateStatus();
        
        this.emitEvent({
          type: 'queue_updated',
          jobId: job.id,
          printerId: job.printerId,
          role: job.role,
          message: `Job cancelled`,
          timestamp: new Date(),
        });
        
        return true;
      }
    }
    return false;
  }

  // Clear completed jobs
  clearCompletedJobs(): void {
    this.queues.forEach((queue, printerId) => {
      queue.jobs = queue.jobs.filter(job => job.status !== 'completed');
      this.queues.set(printerId, queue);
    });
    this.updateStatus();
  }

  // Clear failed jobs
  clearFailedJobs(): void {
    this.queues.forEach((queue, printerId) => {
      queue.jobs = queue.jobs.filter(job => job.status !== 'failed');
      this.queues.set(printerId, queue);
    });
    this.updateStatus();
  }

  // Clear all jobs
  clearAllJobs(): void {
    this.queues.forEach((queue, printerId) => {
      queue.jobs = [];
      this.queues.set(printerId, queue);
    });
    this.updateStatus();
  }

  // Get job statistics
  getJobStatistics(): {
    total: number;
    pending: number;
    printing: number;
    completed: number;
    failed: number;
    cancelled: number;
    byRole: Record<PrinterRole, number>;
    byPriority: Record<string, number>;
  } {
    const stats = {
      total: 0,
      pending: 0,
      printing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      byRole: { BOT: 0, KOT: 0, Receipt: 0 },
      byPriority: { high: 0, normal: 0, low: 0 },
    };

    this.queues.forEach(queue => {
      queue.jobs.forEach(job => {
        stats.total++;
        stats[job.status]++;
        stats.byRole[job.role]++;
        stats.byPriority[job.priority]++;
      });
    });

    return stats;
  }

  // Test printer connection
  async testPrinter(printerId: string): Promise<{ success: boolean; message: string }> {
    try {
      const printer = printerDiscovery.getPrinter(printerId);
      if (!printer) {
        return { success: false, message: 'Printer not found' };
      }

      // Test connection
      const result = await printerDiscovery.testPrinterConnection(printerId);
      
      if (result.success) {
        this.emitEvent({
          type: 'printer_connected',
          printerId,
          message: 'Printer connection test successful',
          timestamp: new Date(),
        });
      }

      return result;
    } catch (error) {
      console.error(`❌ Printer test failed for ${printerId}:`, error);
      return { success: false, message: `Test failed: ${error}` };
    }
  }

  // Reconnect to a printer
  async reconnectPrinter(printerId: string): Promise<boolean> {
    try {
      const printer = printerDiscovery.getPrinter(printerId);
      if (!printer) {
        return false;
      }

      await blePrinter.connect(printer.address);
      printerDiscovery.updatePrinterStatus(printerId, 'connected');
      
      this.emitEvent({
        type: 'printer_connected',
        printerId,
        message: 'Printer reconnected successfully',
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      console.error(`❌ Failed to reconnect printer ${printerId}:`, error);
      printerDiscovery.updatePrinterStatus(printerId, 'error', String(error));
      return false;
    }
  }

  // Get printer health status
  getPrinterHealth(printerId: string): {
    connected: boolean;
    queueSize: number;
    lastProcessed?: Date;
    isProcessing: boolean;
    error?: string;
  } {
    const printer = printerDiscovery.getPrinter(printerId);
    const queue = this.queues.get(printerId);

    return {
      connected: printer?.connected || false,
      queueSize: queue?.jobs.length || 0,
      lastProcessed: queue?.lastProcessed,
      isProcessing: queue?.isProcessing || false,
      error: printer?.errorMessage,
    };
  }

  // Stop processing
  stopProcessing(): void {
    this.isProcessing = false;
    this.processingIntervals.forEach(interval => clearInterval(interval));
    this.processingIntervals.clear();
    console.log('🛑 Print queue processing stopped');
  }

  // Auto-connect to saved printers
  private async autoConnectToSavedPrinters(): Promise<void> {
    try {
      console.log('🔄 Auto-connecting to saved printers...');
      
      const registryState = printerRegistry.getState();
      const assignedPrinterIds = new Set<string>();
      
      // Get all assigned printer IDs
      registryState.mappings.forEach((mapping) => {
        if (mapping.enabled) {
          assignedPrinterIds.add(mapping.printerId);
        }
      });
      
      if (assignedPrinterIds.size === 0) {
        console.log('ℹ️ No saved printer assignments found');
        return;
      }
      
      // Start discovery to find printers
      await printerDiscovery.startDiscovery();
      
      // Try to connect to each assigned printer
      for (const printerId of assignedPrinterIds) {
        try {
          const printer = printerDiscovery.getPrinter(printerId);
          if (printer) {
            console.log(`🔄 Attempting to connect to ${printer.name}...`);
            const result = await this.reconnectPrinter(printerId);
            if (result) {
              console.log(`✅ Auto-connected to ${printer.name}`);
            } else {
              console.log(`⚠️ Failed to auto-connect to ${printer.name}`);
            }
          } else {
            console.log(`⚠️ Printer ${printerId} not found in discovery`);
          }
        } catch (error) {
          console.warn(`⚠️ Auto-connect failed for printer ${printerId}:`, error);
        }
      }
      
      console.log('✅ Auto-connect process completed');
    } catch (error) {
      console.error('❌ Auto-connect failed:', error);
    }
  }

  // Save printer connection preferences
  async saveConnectionPreferences(): Promise<void> {
    try {
      const registryState = printerRegistry.getState();
      const preferences = {
        autoConnect: registryState.autoConnect,
        assignedPrinters: Array.from(registryState.mappings.values()).map(mapping => ({
          role: mapping.role,
          printerId: mapping.printerId,
          enabled: mapping.enabled,
        })),
        lastConnected: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem('printer_connection_preferences', JSON.stringify(preferences));
      console.log('💾 Printer connection preferences saved');
    } catch (error) {
      console.error('❌ Failed to save connection preferences:', error);
    }
  }

  // Load printer connection preferences
  async loadConnectionPreferences(): Promise<{
    autoConnect: boolean;
    assignedPrinters: Array<{ role: string; printerId: string; enabled: boolean }>;
    lastConnected?: string;
  } | null> {
    try {
      const saved = await AsyncStorage.getItem('printer_connection_preferences');
      if (saved) {
        return JSON.parse(saved);
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to load connection preferences:', error);
      return null;
    }
  }

  // Get connection status for all assigned printers
  getConnectionStatus(): Record<string, {
    connected: boolean;
    lastSeen?: Date;
    error?: string;
    roles: string[];
  }> {
    const status: Record<string, any> = {};
    const registryState = printerRegistry.getState();
    
    registryState.mappings.forEach((mapping) => {
      if (mapping.enabled) {
        const printer = printerDiscovery.getPrinter(mapping.printerId);
        if (printer) {
          if (!status[mapping.printerId]) {
            status[mapping.printerId] = {
              connected: printer.connected,
              lastSeen: printer.lastSeen,
              error: printer.errorMessage,
              roles: [],
            };
          }
          status[mapping.printerId].roles.push(mapping.role);
        }
      }
    });
    
    return status;
  }

  // Reset the print manager
  async reset(): Promise<void> {
    this.stopProcessing();
    this.queues.clear();
    this.status = {
      isInitialized: false,
      totalJobs: 0,
      pendingJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      activeQueues: 0,
      connectedPrinters: 0,
    };
    console.log('🔄 Print Manager reset');
  }

  // Print daily summary via the Receipt role's assigned/default/connected printer
  async printDailySummary(data: any): Promise<void> {
    // Strict routing: require an enabled Receipt mapping
    const mapping = printerRegistry.getPrinterMapping('Receipt');
    if (!mapping || !mapping.enabled) {
      throw new Error('No enabled printer mapping for Receipt role. Assign a printer in Printer Setup.');
    }

    const targetPrinter = printerDiscovery.getPrinter(mapping.printerId);
    if (!targetPrinter) {
      throw new Error('Assigned printer not found for Receipt role. Check Printer Setup.');
    }

    // Ensure connection
    if (!targetPrinter.connected) {
      await blePrinter.connect(targetPrinter.address);
      printerDiscovery.updatePrinterStatus(targetPrinter.id, 'connected');
    }

    // Print summary
    await blePrinter.printDailySummary(data);
  }
}

// Export singleton instance
export const printManager = new PrintManagerService();
