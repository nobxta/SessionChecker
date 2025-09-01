import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, AlertCircle, Archive, Check, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { sessionAPI } from '../services/api';
import { validateFileUpload, formatFileSize } from '../utils/fileValidation';

const FileUpload = ({ 
  onFilesSelected, 
  acceptedFileTypes = ['.session', '.zip'], 
  multiple = true, 
  maxFiles = 10,
  title = "Upload Session Files or ZIP",
  description = "Drag & drop session files or ZIP files here, or click to select files"
}) => {
  const [files, setFiles] = useState([]);
  const [extractedSessions, setExtractedSessions] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [isProcessingZip, setIsProcessingZip] = useState(false);

  // For profile pictures, automatically call onFilesSelected when files change
  useEffect(() => {
    const isProfilePictureUpload = acceptedFileTypes.some(type => 
      type.includes('.jpg') || type.includes('.jpeg') || type.includes('.png') || 
      type.includes('.gif') || type.includes('.bmp') || type.includes('.webp')
    );
    
    if (isProfilePictureUpload && files.length > 0) {
      onFilesSelected(files);
    }
  }, [files, acceptedFileTypes, onFilesSelected]);

  const processZipFile = async (zipFile) => {
    setIsProcessingZip(true);
    try {
      const response = await sessionAPI.previewZip(zipFile);
      const sessionFiles = response.session_files || [];
      
      // Extract the actual session files from ZIP
      const extractedResponse = await sessionAPI.extractSessionFiles(zipFile);
      const extractedFiles = extractedResponse.files || [];
      
      console.log('Backend extracted files response:', extractedResponse);
      console.log('Extracted files array:', extractedFiles);
      
      // Create File objects from the extracted session files
      const sessionFileObjects = extractedFiles.map(session => {
        try {
          console.log(`Processing session file: ${session.filename}, size: ${session.size}`);
          
          // Decode base64 content back to binary
          const binaryContent = atob(session.content);
          const bytes = new Uint8Array(binaryContent.length);
          for (let i = 0; i < binaryContent.length; i++) {
            bytes[i] = binaryContent.charCodeAt(i);
          }
          
          const blob = new Blob([bytes], { type: 'application/octet-stream' });
          const file = new File([blob], session.filename || 'unknown.session', {
            type: 'application/octet-stream',
            lastModified: Date.now()
          });
          
          // Ensure all properties are set correctly
          if (!file.name && session.filename) {
            Object.defineProperty(file, 'name', {
              value: session.filename,
              writable: false,
              configurable: true
            });
          }
          
          // Ensure size is set
          if (!file.size) {
            Object.defineProperty(file, 'size', {
              value: bytes.length,
              writable: false,
              configurable: true
            });
          }
          
          // Ensure type is set
          if (!file.type) {
            Object.defineProperty(file, 'type', {
              value: 'application/octet-stream',
              writable: false,
              configurable: true
            });
          }
          
          console.log(`Successfully created File object for ${session.filename}, size: ${file.size}`);
          console.log(`File object properties: name=${file.name}, type=${file.type}, size=${file.size}`);
          return file;
        } catch (error) {
          console.error(`Error decoding session file ${session.filename}:`, error);
          console.error('Session content length:', session.content?.length);
          console.error('Session content preview:', session.content?.substring(0, 100));
          toast.error(`Failed to decode session file ${session.filename}`);
          return null;
        }
      }).filter(Boolean); // Remove any null entries from failed decodings
      
      setExtractedSessions(sessionFileObjects);
      setSelectedSessions(sessionFileObjects);
      
      // Call the callback with extracted session files
      if (onFilesSelected) {
        onFilesSelected(sessionFileObjects);
      }
      
      toast.success(`Successfully extracted ${sessionFileObjects.length} session files from ZIP`);
      
    } catch (error) {
      console.error('Error processing ZIP file:', error);
      toast.error('Failed to process ZIP file. Please check the file and try again.');
    } finally {
      setIsProcessingZip(false);
    }
  };

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Validate files before processing
    const validationResult = validateFileUpload(acceptedFiles, 'mixed');
    
    if (!validationResult.isValid) {
      // Show errors for invalid files
      validationResult.invalidFiles.forEach(invalidFile => {
        toast.error(`${invalidFile.file.name}: ${invalidFile.error}`);
      });
      
      // Only process valid files
      acceptedFiles = validationResult.validFiles.map(vf => vf.file);
    }

    if (acceptedFiles.length === 0) {
      return;
    }

    // Check if we have ZIP files
    const zipFiles = acceptedFiles.filter(file => file.name.toLowerCase().endsWith('.zip'));
    const sessionFiles = acceptedFiles.filter(file => file.name.toLowerCase().endsWith('.session'));

    if (zipFiles.length > 0) {
      // Process ZIP files
      zipFiles.forEach(zipFile => {
        processZipFile(zipFile);
      });
    }

    if (sessionFiles.length > 0) {
      // Add session files directly
      setFiles(prev => [...prev, ...sessionFiles]);
      
      // Call the callback with session files
      if (onFilesSelected) {
        onFilesSelected(sessionFiles);
      }
    }

    // Show success message
    if (validationResult.validCount > 0) {
      toast.success(`Successfully uploaded ${validationResult.validCount} file(s)`);
    }
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {}),
    multiple,
    maxFiles
  });

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    
    // Call the callback with updated files
    if (onFilesSelected) {
      onFilesSelected(newFiles);
    }
  };

  const removeExtractedSession = (index) => {
    const newSessions = extractedSessions.filter((_, i) => i !== index);
    setExtractedSessions(newSessions);
    setSelectedSessions(newSessions);
    
    // Call the callback with updated sessions
    if (onFilesSelected) {
      onFilesSelected(newSessions);
    }
  };

  const toggleSessionSelection = (index) => {
    const session = extractedSessions[index];
    const isSelected = selectedSessions.includes(session);
    
    if (isSelected) {
      const newSelected = selectedSessions.filter(s => s !== session);
      setSelectedSessions(newSelected);
      if (onFilesSelected) {
        onFilesSelected(newSelected);
      }
    } else {
      const newSelected = [...selectedSessions, session];
      setSelectedSessions(newSelected);
      if (onFilesSelected) {
        onFilesSelected(newSelected);
      }
    }
  };

  const selectAllSessions = () => {
    setSelectedSessions(extractedSessions);
    if (onFilesSelected) {
      onFilesSelected(extractedSessions);
    }
  };

  const deselectAllSessions = () => {
    setSelectedSessions([]);
    if (onFilesSelected) {
      onFilesSelected([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-telegram-500 bg-telegram-50'
            : 'border-gray-300 hover:border-telegram-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <p className="text-sm text-gray-500">
          Accepted types: {acceptedFileTypes.join(', ')} • Max files: {maxFiles}
        </p>
      </div>

      {/* Processing ZIP Indicator */}
      {isProcessingZip && (
        <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-blue-800">Processing ZIP file...</span>
        </div>
      )}

      {/* Uploaded Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Uploaded Files</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Sessions from ZIP */}
      {extractedSessions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Extracted Sessions ({extractedSessions.length})
            </h4>
            <div className="flex space-x-2">
              <button
                onClick={selectAllSessions}
                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
              >
                Select All
              </button>
              <button
                onClick={deselectAllSessions}
                className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
              >
                Deselect All
              </button>
            </div>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {extractedSessions.map((session, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedSessions.includes(session)}
                    onChange={() => toggleSessionSelection(index)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                  />
                  <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{session.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(session.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeExtractedSession(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          
          <div className="text-sm text-gray-600">
            {selectedSessions.length} of {extractedSessions.length} sessions selected
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;