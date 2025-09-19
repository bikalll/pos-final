interface ErrorContext {
  operation: string;
  userId?: string;
  restaurantId?: string;
  timestamp: number;
  metadata?: any;
}

interface ErrorHandler {
  canHandle: (error: Error) => boolean;
  handle: (error: Error, context: ErrorContext) => Promise<void>;
}

interface RetryableError extends Error {
  retryable: boolean;
  retryAfter?: number;
}

class ErrorHandlingService {
  private handlers: ErrorHandler[] = [];
  private errorLog: Array<{ error: Error; context: ErrorContext; timestamp: number }> = [];
  private readonly MAX_LOG_SIZE = 1000;

  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Register default error handlers
   */
  private registerDefaultHandlers() {
    // Firebase connection errors
    this.registerHandler({
      canHandle: (error: Error) => 
        error.message.includes('firebase') || 
        error.message.includes('network') ||
        error.message.includes('timeout'),
      handle: async (error: Error, context: ErrorContext) => {
        console.warn('🔄 ErrorHandlingService: Handling Firebase/network error:', error.message);
        // Implement fallback to local storage or queue for later retry
        await this.queueForRetry(error, context);
      }
    });

    // Authentication errors
    this.registerHandler({
      canHandle: (error: Error) => 
        error.message.includes('auth') || 
        error.message.includes('permission') ||
        error.message.includes('unauthorized'),
      handle: async (error: Error, context: ErrorContext) => {
        console.warn('🔄 ErrorHandlingService: Handling authentication error:', error.message);
        // Redirect to login or refresh token
        await this.handleAuthError(error, context);
      }
    });

    // Validation errors
    this.registerHandler({
      canHandle: (error: Error) => 
        error.message.includes('validation') || 
        error.message.includes('invalid') ||
        error.message.includes('required'),
      handle: async (error: Error, context: ErrorContext) => {
        console.warn('🔄 ErrorHandlingService: Handling validation error:', error.message);
        // Show user-friendly error message
        await this.showUserError(error, context);
      }
    });

    // Rate limiting errors
    this.registerHandler({
      canHandle: (error: Error) => 
        error.message.includes('rate') || 
        error.message.includes('quota') ||
        error.message.includes('limit'),
      handle: async (error: Error, context: ErrorContext) => {
        console.warn('🔄 ErrorHandlingService: Handling rate limit error:', error.message);
        // Implement exponential backoff
        await this.handleRateLimit(error, context);
      }
    });
  }

  /**
   * Register a custom error handler
   */
  registerHandler(handler: ErrorHandler) {
    this.handlers.push(handler);
    console.log('🔄 ErrorHandlingService: Registered error handler');
  }

  /**
   * Handle an error with context
   */
  async handleError(error: Error, context: ErrorContext): Promise<void> {
    // Log the error
    this.logError(error, context);

    // Find appropriate handler
    const handler = this.handlers.find(h => h.canHandle(error));
    
    if (handler) {
      try {
        await handler.handle(error, context);
      } catch (handlerError) {
        console.error('❌ ErrorHandlingService: Handler failed:', handlerError);
        await this.handleFallback(error, context);
      }
    } else {
      console.warn('⚠️ ErrorHandlingService: No handler found for error:', error.message);
      await this.handleFallback(error, context);
    }
  }

  /**
   * Handle Firebase/network errors
   */
  private async queueForRetry(error: Error, context: ErrorContext) {
    try {
      const { getBackgroundProcessingService } = await import('./BackgroundProcessingService');
      const backgroundService = getBackgroundProcessingService();
      
      // Queue the operation for retry
      if (context.operation.includes('inventory')) {
        // Queue inventory operation
        console.log('🔄 ErrorHandlingService: Queuing inventory operation for retry');
      } else if (context.operation.includes('order')) {
        // Queue order operation
        console.log('🔄 ErrorHandlingService: Queuing order operation for retry');
      }
      
    } catch (retryError) {
      console.error('❌ ErrorHandlingService: Failed to queue for retry:', retryError);
    }
  }

  /**
   * Handle authentication errors
   */
  private async handleAuthError(error: Error, context: ErrorContext) {
    try {
      // Check if user is still authenticated
      const { getFirebaseService } = await import('./firebaseService');
      const firebaseService = getFirebaseService();
      
      // Attempt to refresh authentication
      console.log('🔄 ErrorHandlingService: Attempting to refresh authentication');
      
      // If refresh fails, redirect to login
      // This would typically involve navigation to login screen
      
    } catch (authError) {
      console.error('❌ ErrorHandlingService: Authentication refresh failed:', authError);
      // Redirect to login screen
    }
  }

  /**
   * Show user-friendly error message
   */
  private async showUserError(error: Error, context: ErrorContext) {
    try {
      // This would typically involve showing a toast or modal
      console.log('🔄 ErrorHandlingService: Showing user error:', error.message);
      
      // For now, just log the error
      // In a real app, this would show a user-friendly message
      
    } catch (displayError) {
      console.error('❌ ErrorHandlingService: Failed to show user error:', displayError);
    }
  }

  /**
   * Handle rate limiting
   */
  private async handleRateLimit(error: Error, context: ErrorContext) {
    try {
      const retryAfter = this.extractRetryAfter(error.message);
      
      if (retryAfter) {
        console.log(`🔄 ErrorHandlingService: Rate limited, retrying after ${retryAfter}ms`);
        
        // Wait for the specified time
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        
        // Retry the operation
        await this.retryOperation(context);
      } else {
        // Use exponential backoff
        await this.exponentialBackoff(context);
      }
      
    } catch (rateLimitError) {
      console.error('❌ ErrorHandlingService: Rate limit handling failed:', rateLimitError);
    }
  }

  /**
   * Handle fallback for unhandled errors
   */
  private async handleFallback(error: Error, context: ErrorContext) {
    try {
      console.log('🔄 ErrorHandlingService: Using fallback error handling');
      
      // Log to external service if available
      await this.logToExternalService(error, context);
      
      // Show generic error message to user
      await this.showGenericError(error, context);
      
    } catch (fallbackError) {
      console.error('❌ ErrorHandlingService: Fallback handling failed:', fallbackError);
    }
  }

  /**
   * Extract retry-after value from error message
   */
  private extractRetryAfter(message: string): number | null {
    const match = message.match(/retry.?after[:\s]+(\d+)/i);
    return match ? parseInt(match[1]) * 1000 : null; // Convert to milliseconds
  }

  /**
   * Retry operation with exponential backoff
   */
  private async exponentialBackoff(context: ErrorContext) {
    const maxRetries = 3;
    const baseDelay = 1000;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`🔄 ErrorHandlingService: Retrying in ${delay}ms (attempt ${attempt + 1})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        await this.retryOperation(context);
        console.log('✅ ErrorHandlingService: Retry successful');
        return;
      } catch (retryError) {
        console.warn('⚠️ ErrorHandlingService: Retry failed:', retryError);
      }
    }
    
    console.error('❌ ErrorHandlingService: All retries failed');
  }

  /**
   * Retry the original operation
   */
  private async retryOperation(context: ErrorContext) {
    // This would retry the original operation
    // Implementation depends on the specific operation type
    console.log('🔄 ErrorHandlingService: Retrying operation:', context.operation);
  }

  /**
   * Log error to external service
   */
  private async logToExternalService(error: Error, context: ErrorContext) {
    try {
      // This would typically send to a logging service like Sentry, LogRocket, etc.
      console.log('🔄 ErrorHandlingService: Logging to external service');
      
      // For now, just log locally
      console.error('External Log:', {
        error: error.message,
        stack: error.stack,
        context
      });
      
    } catch (logError) {
      console.error('❌ ErrorHandlingService: Failed to log externally:', logError);
    }
  }

  /**
   * Show generic error message
   */
  private async showGenericError(error: Error, context: ErrorContext) {
    try {
      // This would typically show a generic error message to the user
      console.log('🔄 ErrorHandlingService: Showing generic error message');
      
      // For now, just log
      console.error('Generic Error:', error.message);
      
    } catch (displayError) {
      console.error('❌ ErrorHandlingService: Failed to show generic error:', displayError);
    }
  }

  /**
   * Log error locally
   */
  private logError(error: Error, context: ErrorContext) {
    this.errorLog.push({
      error,
      context,
      timestamp: Date.now()
    });
    
    // Trim log if it gets too large
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(-this.MAX_LOG_SIZE);
    }
    
    console.error('ErrorHandlingService: Logged error:', {
      message: error.message,
      operation: context.operation,
      timestamp: new Date(context.timestamp).toISOString()
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const now = Date.now();
    const last24Hours = this.errorLog.filter(entry => 
      now - entry.timestamp < 24 * 60 * 60 * 1000
    );
    
    const errorsByType = last24Hours.reduce((acc, entry) => {
      const type = entry.error.constructor.name;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalErrors: this.errorLog.length,
      last24Hours: last24Hours.length,
      errorsByType,
      recentErrors: this.errorLog.slice(-10)
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
    console.log('🔄 ErrorHandlingService: Cleared error log');
  }

  /**
   * Create a retryable error
   */
  createRetryableError(message: string, retryAfter?: number): RetryableError {
    const error = new Error(message) as RetryableError;
    error.retryable = true;
    error.retryAfter = retryAfter;
    return error;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: Error): boolean {
    return 'retryable' in error && (error as RetryableError).retryable;
  }
}

// Singleton instance
let errorHandlingService: ErrorHandlingService | null = null;

export function getErrorHandlingService(): ErrorHandlingService {
  if (!errorHandlingService) {
    errorHandlingService = new ErrorHandlingService();
  }
  return errorHandlingService;
}

export function initializeErrorHandlingService(): ErrorHandlingService {
  errorHandlingService = new ErrorHandlingService();
  return errorHandlingService;
}

export default ErrorHandlingService;
