/**
 * WebSocket Manager for real-time updates from backend processes
 * Handles connection, reconnection, and message routing
 */

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageHandlers = new Map();
    this.connectionStatus = 'disconnected';
    this.taskId = null;
    this.onStatusChange = null;
  }

  /**
   * Initialize WebSocket connection
   * @param {string} taskId - Unique task identifier
   * @param {Function} onStatusChange - Callback for connection status changes
   */
  connect(taskId, onStatusChange = null) {
    this.taskId = taskId;
    this.onStatusChange = onStatusChange;
    
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws/stream';
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
      this.updateStatus('connecting');
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.updateStatus('error');
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.updateStatus('connected');
      
      // Send initial message with task ID
      if (this.taskId) {
        this.send({ task_id: this.taskId });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.updateStatus('disconnected');
      
      // Attempt reconnection if not manually closed
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateStatus('error');
    };
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.connectionStatus === 'disconnected') {
        this.connect(this.taskId, this.onStatusChange);
      }
    }, delay);
  }

  /**
   * Update connection status and notify listeners
   */
  updateStatus(status) {
    this.connectionStatus = status;
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  /**
   * Send message through WebSocket
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected, cannot send message');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    const { type, task_id, payload, progress, status, message } = data;
    
    // Route message to appropriate handler
    if (type && this.messageHandlers.has(type)) {
      this.messageHandlers.get(type)(data);
    } else {
      // Default message handling
      this.handleDefaultMessage(data);
    }
  }

  /**
   * Handle default message types
   */
  handleDefaultMessage(data) {
    const { type, payload, progress, status, message } = data;
    
    switch (type) {
      case 'progress':
        this.handleProgressUpdate(payload);
        break;
      case 'status':
        this.handleStatusUpdate(payload);
        break;
      case 'result':
        this.handleResultUpdate(payload);
        break;
      case 'error':
        this.handleErrorUpdate(payload);
        break;
      case 'complete':
        this.handleCompleteUpdate(payload);
        break;
      default:
        console.log('Unhandled WebSocket message:', data);
    }
  }

  /**
   * Handle progress updates
   */
  handleProgressUpdate(payload) {
    const { current, total, percentage, operation, session } = payload;
    
    // Emit progress event
    this.emit('progress', {
      current,
      total,
      percentage,
      operation,
      session
    });
  }

  /**
   * Handle status updates
   */
  handleStatusUpdate(payload) {
    const { status, message, session, details } = payload;
    
    // Emit status event
    this.emit('status', {
      status,
      message,
      session,
      details
    });
  }

  /**
   * Handle result updates
   */
  handleResultUpdate(payload) {
    const { session, result, success, message } = payload;
    
    // Emit result event
    this.emit('result', {
      session,
      result,
      success,
      message
    });
  }

  /**
   * Handle error updates
   */
  handleErrorUpdate(payload) {
    const { session, error, errorType, details } = payload;
    
    // Emit error event
    this.emit('error', {
      session,
      error,
      errorType,
      details
    });
  }

  /**
   * Handle completion updates
   */
  handleCompleteUpdate(payload) {
    const { summary, totalProcessed, totalSuccess, totalErrors } = payload;
    
    // Emit complete event
    this.emit('complete', {
      summary,
      totalProcessed,
      totalSuccess,
      totalErrors
    });
  }

  /**
   * Register message handler for specific message type
   */
  on(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Remove message handler
   */
  off(type) {
    this.messageHandlers.delete(type);
  }

  /**
   * Emit custom event
   */
  emit(event, data) {
    // Create and dispatch custom event
    const customEvent = new CustomEvent(`websocket:${event}`, {
      detail: data
    });
    window.dispatchEvent(customEvent);
  }

  /**
   * Listen for custom events
   */
  addEventListener(event, handler) {
    window.addEventListener(`websocket:${event}`, (e) => handler(e.detail));
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, handler) {
    window.removeEventListener(`websocket:${event}`, handler);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.updateStatus('disconnected');
    this.messageHandlers.clear();
  }

  /**
   * Get current connection status
   */
  getStatus() {
    return this.connectionStatus;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected() {
    return this.connectionStatus === 'connected';
  }
}

// Create singleton instance
const websocketManager = new WebSocketManager();

export default websocketManager;

// Export individual methods for convenience
export const {
  connect,
  disconnect,
  send,
  on,
  off,
  addEventListener,
  removeEventListener,
  getStatus,
  isConnected
} = websocketManager;
