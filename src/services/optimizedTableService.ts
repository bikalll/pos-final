import { createFirestoreService } from './firestoreService';
import { Table } from '../types/Table';

interface OptimizedTableService {
  loadTablesOptimized: (restaurantId: string) => Promise<Table[]>;
  loadCriticalTables: (restaurantId: string) => Promise<Table[]>;
  loadStandardTables: (restaurantId: string) => Promise<Table[]>;
  updateTableStatus: (tableId: string, status: Partial<Table>) => Promise<void>;
  batchUpdateTables: (updates: Array<{ tableId: string; status: Partial<Table> }>) => Promise<void>;
}

class OptimizedTableServiceClass implements OptimizedTableService {
  private cache = new Map<string, { data: Table[]; timestamp: number }>();
  private readonly cacheTimeout = 30000; // 30 seconds
  private readonly maxCacheSize = 100;
  
  async loadTablesOptimized(restaurantId: string): Promise<Table[]> {
    const cacheKey = `tables_${restaurantId}`;
    const cached = this.cache.get(cacheKey);
    
    // Check cache first
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('📦 Using cached tables data');
      return cached.data;
    }
    
    try {
      // Load critical tables first (occupied/reserved)
      const [critical, standard] = await Promise.all([
        this.loadCriticalTables(restaurantId),
        this.loadStandardTables(restaurantId)
      ]);
      
      const allTables = this.mergeTableData(critical, standard);
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: allTables,
        timestamp: Date.now()
      });
      
      // Cleanup old cache entries
      this.cleanupCache();
      
      return allTables;
    } catch (error) {
      console.error('❌ Error loading optimized tables:', error);
      throw error;
    }
  }
  
  async loadCriticalTables(restaurantId: string): Promise<Table[]> {
    const service = createFirestoreService(restaurantId);
    
    try {
      // Use optimized query for critical tables
      const criticalData = await service.getTablesByStatus({
        isOccupied: true,
        isReserved: true
      });
      
      return this.processTableData(criticalData);
    } catch (error) {
      console.warn('⚠️ Critical tables load failed, using fallback:', error);
      return [];
    }
  }
  
  async loadStandardTables(restaurantId: string): Promise<Table[]> {
    const service = createFirestoreService(restaurantId);
    
    try {
      // Use optimized query for standard tables
      const standardData = await service.getTablesByStatus({
        isOccupied: false,
        isReserved: false
      });
      
      return this.processTableData(standardData);
    } catch (error) {
      console.warn('⚠️ Standard tables load failed, using fallback:', error);
      return [];
    }
  }
  
  private processTableData(rawData: Record<string, any>): Table[] {
    return Object.values(rawData).map((table: any) => ({
      id: table.id,
      name: table.name,
      seats: table.seats,
      description: table.description || '',
      isActive: table.isActive !== false,
      createdAt: table.createdAt,
      restaurantId: table.restaurantId,
      isOccupied: !!table.isOccupied,
      isReserved: table.isReserved || false,
      reservedAt: table.reservedAt,
      reservedUntil: table.reservedUntil,
      reservedBy: table.reservedBy,
      reservedNote: table.reservedNote,
      totalSeats: table.totalSeats,
    }));
  }
  
  private mergeTableData(critical: Table[], standard: Table[]): Table[] {
    const allTables = [...critical, ...standard];
    
    // Remove duplicates based on ID
    const uniqueTables = allTables.reduce((acc, table) => {
      if (!acc.find(t => t.id === table.id)) {
        acc.push(table);
      }
      return acc;
    }, [] as Table[]);
    
    // Sort by creation time
    return uniqueTables.sort((a, b) => {
      const aTime = this.getTimestamp(a.createdAt);
      const bTime = this.getTimestamp(b.createdAt);
      return aTime - bTime;
    });
  }
  
  private getTimestamp(createdAt: any): number {
    if (typeof createdAt === 'number') return createdAt;
    if (createdAt?.seconds) return createdAt.seconds * 1000;
    if (createdAt?.toDate) return createdAt.toDate().getTime();
    if (createdAt instanceof Date) return createdAt.getTime();
    return 0;
  }
  
  async updateTableStatus(tableId: string, status: Partial<Table>): Promise<void> {
    try {
      const service = createFirestoreService(status.restaurantId || '');
      await service.updateTable(tableId, status);
      
      // Invalidate cache
      this.invalidateCache(status.restaurantId || '');
    } catch (error) {
      console.error('❌ Error updating table status:', error);
      throw error;
    }
  }
  
  async batchUpdateTables(updates: Array<{ tableId: string; status: Partial<Table> }>): Promise<void> {
    try {
      // Group by restaurant
      const groupedUpdates = updates.reduce((acc, update) => {
        const restaurantId = update.status.restaurantId || '';
        if (!acc[restaurantId]) acc[restaurantId] = [];
        acc[restaurantId].push(update);
        return acc;
      }, {} as Record<string, typeof updates>);
      
      // Process each restaurant's updates
      const promises = Object.entries(groupedUpdates).map(([restaurantId, restaurantUpdates]) => {
        const service = createFirestoreService(restaurantId);
        return service.batchUpdateTables(restaurantUpdates);
      });
      
      await Promise.all(promises);
      
      // Invalidate caches
      Object.keys(groupedUpdates).forEach(restaurantId => {
        this.invalidateCache(restaurantId);
      });
      
    } catch (error) {
      console.error('❌ Error batch updating tables:', error);
      throw error;
    }
  }
  
  private invalidateCache(restaurantId: string) {
    const cacheKey = `tables_${restaurantId}`;
    this.cache.delete(cacheKey);
  }
  
  private cleanupCache() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Remove expired entries
    entries.forEach(([key, value]) => {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    });
    
    // Limit cache size
    if (this.cache.size > this.maxCacheSize) {
      const sortedEntries = entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, this.cache.size - this.maxCacheSize);
      
      sortedEntries.forEach(([key]) => {
        this.cache.delete(key);
      });
    }
  }
  
  getCacheMetrics() {
    return {
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      cacheTimeout: this.cacheTimeout
    };
  }
}

// Singleton instance
const optimizedTableService = new OptimizedTableServiceClass();

export default optimizedTableService;
