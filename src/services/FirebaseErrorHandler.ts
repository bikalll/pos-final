// FirebaseErrorHandler.ts
// Global error handler for Firebase operations

import { ErrorHandler } from 'react-native';

class FirebaseErrorHandler {
  private static instance: FirebaseErrorHandler;
  private errorCount: Map<string, number> = new Map();
  private readonly MAX_ERRORS_PER_OPERATION = 5;

  private constructor() {
    this.setupGlobalErrorHandler();
  }

  public static getInstance(): FirebaseErrorHandler {
    if (!FirebaseErrorHandler.instance) {
      FirebaseErrorHandler.instance = new FirebaseErrorHandler();
    }
    return FirebaseErrorHandler.instance;
  }

  private setupGlobalErrorHandler(): void {
    // Handle unhandled promise rejections
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      if (this.isFirebaseError(error)) {
        console.error('🚨 Unhandled Firebase Error:', {
          message: error.message,
          stack: error.stack,
          isFatal,
          timestamp: new Date().toISOString()
        });
        
        // Track error frequency
        this.trackError(error.message);
        
        // If too many errors, suggest connection reset
        if (this.shouldSuggestReset(error.message)) {
          console.warn('🔄 Too many Firebase errors detected, suggesting connection reset');
          this.suggestConnectionReset();
        }
      }
      
      // Call original handler
      originalHandler(error, isFatal);
    });
  }

  private isFirebaseError(error: any): boolean {
    if (!error || !error.message) return false;
    
    const message = error.message.toLowerCase();
    return message.includes('firebase') || 
           message.includes('firestore') || 
           message.includes('timeout') ||
           message.includes('network') ||
           message.includes('connection');
  }

  private trackError(message: string): void {
    const key = this.getErrorKey(message);
    const count = this.errorCount.get(key) || 0;
    this.errorCount.set(key, count + 1);
    
    console.log(`📊 Error tracking: ${key} - ${count + 1} occurrences`);
  }

  private getErrorKey(message: string): string {
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('network')) return 'network';
    if (message.includes('connection')) return 'connection';
    if (message.includes('permission')) return 'permission';
    return 'other';
  }

  private shouldSuggestReset(message: string): boolean {
    const key = this.getErrorKey(message);
    const count = this.errorCount.get(key) || 0;
    return count >= this.MAX_ERRORS_PER_OPERATION;
  }

  private suggestConnectionReset(): void {
    console.log('🔄 Suggesting Firebase connection reset...');
    
    // Try to reset Firebase connections
    try {
      const { firebaseConnectionManager } = require('./FirebaseConnectionManager');
      firebaseConnectionManager.cleanupAll();
      console.log('✅ Firebase connections reset successfully');
    } catch (error) {
      console.warn('Failed to reset Firebase connections:', error);
    }
  }

  public handleError(error: Error, context: string = 'Unknown'): void {
    console.error(`🚨 Firebase Error in ${context}:`, {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
    
    this.trackError(error.message);
    
    if (this.shouldSuggestReset(error.message)) {
      this.suggestConnectionReset();
    }
  }

  public resetErrorCount(): void {
    this.errorCount.clear();
    console.log('📊 Error count reset');
  }

  public getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.errorCount.forEach((count, key) => {
      stats[key] = count;
    });
    return stats;
  }
}

export const firebaseErrorHandler = FirebaseErrorHandler.getInstance();
export default FirebaseErrorHandler;
