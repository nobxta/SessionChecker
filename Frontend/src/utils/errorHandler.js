import { toast } from 'react-hot-toast';

/**
 * Centralized error handler for consistent error display across the application
 */

/**
 * Handle API errors and display appropriate messages
 * @param {Error} error - The error object
 * @param {string} fallbackMessage - Fallback message if error details are not available
 * @param {Object} options - Additional options for error handling
 * @returns {Object} - Error details for component state
 */
export const handleError = (error, fallbackMessage = 'An error occurred', options = {}) => {
  const {
    showToast = true,
    logError = true,
    returnDetails = false
  } = options;

  // Extract error message
  let message = fallbackMessage;
  let errorType = 'general_error';
  let technicalError = '';

  if (error) {
    // Handle different error formats
    if (error.response?.data?.detail) {
      message = error.response.data.detail;
      errorType = error.response.data.error_type || 'api_error';
      technicalError = error.response.data.technical_error || '';
    } else if (error.response?.data?.message) {
      message = error.response.data.message;
      errorType = 'api_error';
    } else if (error.message) {
      message = error.message;
      errorType = 'client_error';
    } else if (typeof error === 'string') {
      message = error;
      errorType = 'string_error';
    }

    // Log error if enabled
    if (logError) {
      console.error('Error details:', {
        message,
        errorType,
        technicalError,
        originalError: error
      });
    }
  }

  // Show toast notification if enabled
  if (showToast) {
    toast.error(message, {
      duration: 5000,
      position: 'top-right',
      style: {
        background: '#FEE2E2',
        color: '#DC2626',
        border: '1px solid #FCA5A5'
      }
    });
  }

  // Return error details if requested
  if (returnDetails) {
    return {
      message,
      errorType,
      technicalError,
      hasError: true
    };
  }

  return { hasError: true };
};

/**
 * Handle specific error types with custom messages
 * @param {string} errorType - The type of error
 * @param {string} context - Context where the error occurred
 * @returns {string} - Human-readable error message
 */
export const getErrorMessage = (errorType, context = '') => {
  const errorMessages = {
    // Authentication errors
    'authentication': 'Authentication failed. Please log in again.',
    'session_expired': 'Your session has expired. Please log in again.',
    'unauthorized': 'You are not authorized to perform this action.',
    
    // Rate limiting
    'rate_limit': 'Too many requests. Please wait before trying again.',
    'flood_wait': 'Action blocked due to rate limiting. Please wait before trying again.',
    
    // Account status
    'account_banned': 'This account has been banned by Telegram.',
    'account_deleted': 'This account has been deleted.',
    'account_frozen': 'This account is frozen. Please contact Telegram support.',
    
    // File upload errors
    'file_upload': 'File upload failed. Please check your file and try again.',
    'file_too_large': 'File is too large. Please use a smaller file.',
    'invalid_file_type': 'Invalid file type. Please use a supported format.',
    
    // Network errors
    'network': 'Network connection failed. Please check your internet connection.',
    'timeout': 'Request timed out. Please try again.',
    'connection_failed': 'Connection failed. Please try again.',
    
    // Validation errors
    'validation': 'Invalid input. Please check your data and try again.',
    'required_field': 'Required field is missing. Please fill in all required fields.',
    
    // Permission errors
    'permission': 'You don\'t have permission to perform this action.',
    'admin_required': 'Admin privileges are required for this action.',
    
    // General errors
    'general_error': 'An unexpected error occurred. Please try again.',
    'unknown_error': 'An unknown error occurred. Please try again.',
    'server_error': 'Server error occurred. Please try again later.',
    'api_error': 'API request failed. Please try again.'
  };

  const baseMessage = errorMessages[errorType] || errorMessages.general_error;
  
  if (context) {
    return `${baseMessage} Context: ${context}`;
  }
  
  return baseMessage;
};

/**
 * Handle form validation errors
 * @param {Object} errors - Validation errors object
 * @param {string} context - Form context
 * @returns {Object} - Formatted validation errors
 */
export const handleValidationErrors = (errors, context = 'form') => {
  const formattedErrors = {};
  
  Object.keys(errors).forEach(field => {
    const error = errors[field];
    let message = '';
    
    if (typeof error === 'string') {
      message = error;
    } else if (error?.message) {
      message = error.message;
    } else if (error?.type) {
      message = getErrorMessage(error.type, `${context}.${field}`);
    } else {
      message = getErrorMessage('validation', `${context}.${field}`);
    }
    
    formattedErrors[field] = message;
    
    // Show toast for validation errors
    toast.error(`${field}: ${message}`, {
      duration: 4000,
      position: 'top-right'
    });
  });
  
  return formattedErrors;
};

/**
 * Handle network errors specifically
 * @param {Error} error - Network error
 * @returns {Object} - Network error details
 */
export const handleNetworkError = (error) => {
  let message = 'Network connection failed';
  let errorType = 'network';
  
  if (error.code === 'NETWORK_ERROR') {
    message = 'No internet connection. Please check your network.';
  } else if (error.code === 'TIMEOUT') {
    message = 'Request timed out. Please try again.';
    errorType = 'timeout';
  } else if (error.code === 'ABORTED') {
    message = 'Request was cancelled.';
    errorType = 'cancelled';
  }
  
  toast.error(message, {
    duration: 6000,
    position: 'top-right',
    style: {
      background: '#FEF3C7',
      color: '#D97706',
      border: '1px solid #FCD34D'
    }
  });
  
  return {
    message,
    errorType,
    hasError: true
  };
};

/**
 * Handle cancellation errors (when user cancels an operation)
 * @param {string} operation - The operation that was cancelled
 * @returns {Object} - Cancellation details
 */
export const handleCancellation = (operation = 'operation') => {
  const message = `${operation} was cancelled`;
  
  toast.info(message, {
    duration: 3000,
    position: 'top-right',
    style: {
      background: '#DBEAFE',
      color: '#2563EB',
      border: '1px solid #93C5FD'
    }
  });
  
  return {
    message,
    errorType: 'cancelled',
    hasError: false
  };
};

/**
 * Create a custom error handler for specific components
 * @param {string} componentName - Name of the component
 * @param {Object} options - Error handling options
 * @returns {Function} - Custom error handler function
 */
export const createComponentErrorHandler = (componentName, options = {}) => {
  return (error, context = '') => {
    const enhancedContext = context ? `${componentName}: ${context}` : componentName;
    return handleError(error, `Error in ${componentName}`, {
      ...options,
      logError: true,
      returnDetails: true
    });
  };
};

export default {
  handleError,
  getErrorMessage,
  handleValidationErrors,
  handleNetworkError,
  handleCancellation,
  createComponentErrorHandler
};
