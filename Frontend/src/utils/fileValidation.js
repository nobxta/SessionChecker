/**
 * File Validation Utility
 * Provides consistent file validation across all components
 */

// File type constants
export const FILE_TYPES = {
  SESSION: '.session',
  ZIP: '.zip',
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
  ALL_IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
  ALL_SESSION_FILES: ['.session', '.zip']
};

// File size constants (in bytes)
export const FILE_SIZES = {
  MAX_SESSION_FILE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGE_FILE: 10 * 1024 * 1024,  // 10MB
  MAX_ZIP_FILE: 50 * 1024 * 1024,    // 50MB
  MIN_IMAGE_FILE: 1024,               // 1KB
};

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {Array} allowedTypes - Array of allowed file extensions
 * @returns {Object} - Validation result
 */
export const validateFileType = (file, allowedTypes) => {
  if (!file || !file.name) {
    return {
      isValid: false,
      error: 'Invalid file object'
    };
  }

  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!allowedTypes.includes(fileExtension)) {
    return {
      isValid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  return {
    isValid: true,
    fileExtension
  };
};

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSize - Maximum file size in bytes
 * @param {number} minSize - Minimum file size in bytes (optional)
 * @returns {Object} - Validation result
 */
export const validateFileSize = (file, maxSize, minSize = 0) => {
  if (!file) {
    return {
      isValid: false,
      error: 'Invalid file object'
    };
  }

  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`
    };
  }

  if (minSize > 0 && file.size < minSize) {
    const minSizeKB = (minSize / 1024).toFixed(1);
    return {
      isValid: false,
      error: `File too small. Minimum size: ${minSizeKB}KB`
    };
  }

  return {
    isValid: true,
    fileSize: file.size
  };
};

/**
 * Validate session file
 * @param {File} file - File to validate
 * @returns {Object} - Validation result
 */
export const validateSessionFile = (file) => {
  // Validate file type
  const typeValidation = validateFileType(file, FILE_TYPES.ALL_SESSION_FILES);
  if (!typeValidation.isValid) {
    return typeValidation;
  }

  // Validate file size
  const sizeValidation = validateFileSize(file, FILE_SIZES.MAX_SESSION_FILE);
  if (!sizeValidation.isValid) {
    return sizeValidation;
  }

  return {
    isValid: true,
    fileType: typeValidation.fileExtension,
    fileSize: sizeValidation.fileSize
  };
};

/**
 * Validate image file
 * @param {File} file - File to validate
 * @returns {Object} - Validation result
 */
export const validateImageFile = (file) => {
  // Validate file type
  const typeValidation = validateFileType(file, FILE_TYPES.ALL_IMAGES);
  if (!typeValidation.isValid) {
    return typeValidation;
  }

  // Validate file size
  const sizeValidation = validateFileSize(
    file, 
    FILE_SIZES.MAX_IMAGE_FILE, 
    FILE_SIZES.MIN_IMAGE_FILE
  );
  if (!sizeValidation.isValid) {
    return sizeValidation;
  }

  return {
    isValid: true,
    fileType: typeValidation.fileExtension,
    fileSize: sizeValidation.fileSize
  };
};

/**
 * Validate multiple files
 * @param {Array} files - Array of files to validate
 * @param {Function} validator - Validation function to use
 * @returns {Object} - Validation result
 */
export const validateMultipleFiles = (files, validator) => {
  if (!Array.isArray(files) || files.length === 0) {
    return {
      isValid: false,
      error: 'No files provided'
    };
  }

  const results = [];
  const errors = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const validation = validator(file);
    
    if (validation.isValid) {
      results.push({
        file,
        index: i,
        ...validation
      });
    } else {
      errors.push({
        file,
        index: i,
        error: validation.error
      });
    }
  }

  return {
    isValid: errors.length === 0,
    validFiles: results,
    invalidFiles: errors,
    totalFiles: files.length,
    validCount: results.length,
    invalidCount: errors.length
  };
};

/**
 * Validate file upload for specific use case
 * @param {Array} files - Files to validate
 * @param {string} useCase - Use case for validation
 * @returns {Object} - Validation result
 */
export const validateFileUpload = (files, useCase) => {
  const validators = {
    'session': validateSessionFile,
    'image': validateImageFile,
    'zip': (file) => validateFileType(file, [FILE_TYPES.ZIP]) && validateFileSize(file, FILE_SIZES.MAX_ZIP_FILE),
    'mixed': (file) => {
      if (file.name.endsWith(FILE_TYPES.SESSION)) {
        return validateSessionFile(file);
      } else if (file.name.endsWith(FILE_TYPES.ZIP)) {
        return validateFileType(file, [FILE_TYPES.ZIP]) && validateFileSize(file, FILE_SIZES.MAX_ZIP_FILE);
      }
      return { isValid: false, error: 'Invalid file type' };
    }
  };

  const validator = validators[useCase];
  if (!validator) {
    return {
      isValid: false,
      error: `Unknown use case: ${useCase}`
    };
  }

  return validateMultipleFiles(files, validator);
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file icon based on file type
 * @param {string} fileName - File name
 * @returns {string} - Icon name for the file type
 */
export const getFileIcon = (fileName) => {
  if (!fileName) return 'file';
  
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  if (extension === FILE_TYPES.SESSION) return 'session';
  if (extension === FILE_TYPES.ZIP) return 'archive';
  if (FILE_TYPES.IMAGE.includes(extension)) return 'image';
  
  return 'file';
};

/**
 * Check if file is an image
 * @param {File} file - File to check
 * @returns {boolean} - True if file is an image
 */
export const isImageFile = (file) => {
  if (!file || !file.name) return false;
  
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  return FILE_TYPES.IMAGE.includes(extension);
};

/**
 * Check if file is a session file
 * @param {File} file - File to check
 * @returns {boolean} - True if file is a session file
 */
export const isSessionFile = (file) => {
  if (!file || !file.name) return false;
  
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  return extension === FILE_TYPES.SESSION;
};

/**
 * Check if file is a ZIP file
 * @param {File} file - File to check
 * @returns {boolean} - True if file is a ZIP file
 */
export const isZipFile = (file) => {
  if (!file || !file.name) return false;
  
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  return extension === FILE_TYPES.ZIP;
};

export default {
  FILE_TYPES,
  FILE_SIZES,
  validateFileType,
  validateFileSize,
  validateSessionFile,
  validateImageFile,
  validateMultipleFiles,
  validateFileUpload,
  formatFileSize,
  getFileIcon,
  isImageFile,
  isSessionFile,
  isZipFile
};
