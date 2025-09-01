/**
 * Request Controller Utility
 * Handles request cancellation, abort functionality, and request management
 */

class RequestController {
  constructor() {
    this.abortControllers = new Map();
    this.activeRequests = new Map();
    this.requestTimeouts = new Map();
  }

  /**
   * Create a new abort controller for a request
   * @param {string} requestId - Unique identifier for the request
   * @returns {AbortController} - AbortController instance
   */
  createAbortController(requestId) {
    // Cancel existing request if any
    this.cancelRequest(requestId);
    
    // Create new abort controller
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);
    
    return controller;
  }

  /**
   * Get abort controller for a request
   * @param {string} requestId - Request identifier
   * @returns {AbortController|null} - AbortController instance or null
   */
  getAbortController(requestId) {
    return this.abortControllers.get(requestId) || null;
  }

  /**
   * Cancel a specific request
   * @param {string} requestId - Request identifier
   * @returns {boolean} - True if request was cancelled
   */
  cancelRequest(requestId) {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
      this.activeRequests.delete(requestId);
      this.clearRequestTimeout(requestId);
      return true;
    }
    return false;
  }

  /**
   * Cancel all active requests
   */
  cancelAllRequests() {
    this.abortControllers.forEach(controller => {
      controller.abort();
    });
    
    this.abortControllers.clear();
    this.activeRequests.clear();
    this.clearAllTimeouts();
  }

  /**
   * Set request timeout
   * @param {string} requestId - Request identifier
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {Function} onTimeout - Callback when timeout occurs
   */
  setRequestTimeout(requestId, timeoutMs, onTimeout) {
    this.clearRequestTimeout(requestId);
    
    const timeoutId = setTimeout(() => {
      this.cancelRequest(requestId);
      if (onTimeout) {
        onTimeout();
      }
    }, timeoutMs);
    
    this.requestTimeouts.set(requestId, timeoutId);
  }

  /**
   * Clear request timeout
   * @param {string} requestId - Request identifier
   */
  clearRequestTimeout(requestId) {
    const timeoutId = this.requestTimeouts.get(requestId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.requestTimeouts.delete(requestId);
    }
  }

  /**
   * Clear all request timeouts
   */
  clearAllTimeouts() {
    this.requestTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.requestTimeouts.clear();
  }

  /**
   * Mark request as active
   * @param {string} requestId - Request identifier
   * @param {Object} requestInfo - Additional request information
   */
  markRequestActive(requestId, requestInfo = {}) {
    this.activeRequests.set(requestId, {
      startTime: Date.now(),
      ...requestInfo
    });
  }

  /**
   * Mark request as completed
   * @param {string} requestId - Request identifier
   */
  markRequestCompleted(requestId) {
    this.activeRequests.delete(requestId);
    this.abortControllers.delete(requestId);
    this.clearRequestTimeout(requestId);
  }

  /**
   * Get active requests count
   * @returns {number} - Number of active requests
   */
  getActiveRequestsCount() {
    return this.activeRequests.size;
  }

  /**
   * Get active requests info
   * @returns {Array} - Array of active request information
   */
  getActiveRequests() {
    return Array.from(this.activeRequests.entries()).map(([id, info]) => ({
      id,
      ...info
    }));
  }

  /**
   * Check if request is active
   * @param {string} requestId - Request identifier
   * @returns {boolean} - True if request is active
   */
  isRequestActive(requestId) {
    return this.activeRequests.has(requestId);
  }

  /**
   * Create a cancellable API request
   * @param {string} requestId - Request identifier
   * @param {Function} apiCall - API call function
   * @param {Object} options - Request options
   * @returns {Promise} - Promise that resolves with API response
   */
  async createCancellableRequest(requestId, apiCall, options = {}) {
    const {
      timeout = 30000, // 30 seconds default
      onTimeout = null,
      onCancel = null
    } = options;

    // Create abort controller
    const controller = this.createAbortController(requestId);
    
    // Set timeout if specified
    if (timeout > 0) {
      this.setRequestTimeout(requestId, timeout, onTimeout);
    }

    try {
      // Mark request as active
      this.markRequestActive(requestId, {
        type: 'api_call',
        timestamp: new Date().toISOString()
      });

      // Execute API call with abort signal
      const result = await apiCall(controller.signal);
      
      // Mark request as completed
      this.markRequestCompleted(requestId);
      
      return result;
    } catch (error) {
      // Handle abort errors
      if (error.name === 'AbortError') {
        if (onCancel) {
          onCancel();
        }
        throw new Error('Request was cancelled');
      }
      
      // Mark request as completed (even on error)
      this.markRequestCompleted(requestId);
      
      throw error;
    }
  }

  /**
   * Create a cancellable long-running operation
   * @param {string} operationId - Operation identifier
   * @param {Function} operation - Operation function
   * @param {Object} options - Operation options
   * @returns {Promise} - Promise that resolves with operation result
   */
  async createCancellableOperation(operationId, operation, options = {}) {
    const {
      timeout = 300000, // 5 minutes default
      onProgress = null,
      onTimeout = null,
      onCancel = null
    } = options;

    // Create abort controller
    const controller = this.createAbortController(operationId);
    
    // Set timeout if specified
    if (timeout > 0) {
      this.setRequestTimeout(operationId, timeout, onTimeout);
    }

    try {
      // Mark operation as active
      this.markRequestActive(operationId, {
        type: 'long_operation',
        timestamp: new Date().toISOString()
      });

      // Execute operation with abort signal and progress callback
      const result = await operation(controller.signal, onProgress);
      
      // Mark operation as completed
      this.markRequestCompleted(operationId);
      
      return result;
    } catch (error) {
      // Handle abort errors
      if (error.name === 'AbortError') {
        if (onCancel) {
          onCancel();
        }
        throw new Error('Operation was cancelled');
      }
      
      // Mark operation as completed (even on error)
      this.markRequestCompleted(operationId);
      
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.cancelAllRequests();
    this.clearAllTimeouts();
  }
}

// Create singleton instance
const requestController = new RequestController();

export default requestController;

// Export individual methods for convenience
export const {
  createAbortController,
  getAbortController,
  cancelRequest,
  cancelAllRequests,
  setRequestTimeout,
  clearRequestTimeout,
  markRequestActive,
  markRequestCompleted,
  getActiveRequestsCount,
  getActiveRequests,
  isRequestActive,
  createCancellableRequest,
  createCancellableOperation,
  cleanup
} = requestController;
