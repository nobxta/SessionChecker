import React, { useState } from 'react';
import { User, CheckCircle, XCircle, AlertTriangle, Loader, Edit3 } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { sessionAPI } from '../services/api';
import toast from 'react-hot-toast';

const NameManager = () => {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nameMapping, setNameMapping] = useState({});
  const [defaultName, setDefaultName] = useState('');

  const handleFilesSelected = (selectedFiles) => {
    console.log('Files received by NameManager:', selectedFiles);
    setFiles(selectedFiles);
    setResults([]);
    
    // Auto-generate name mapping
    const mapping = {};
    selectedFiles.forEach(file => {
      console.log('Processing file in NameManager:', file);
      console.log('File properties:', { name: file.name, filename: file.filename, type: file.type, size: file.size });
      
      // Handle both regular files (.name) and extracted files (.filename)
      const fileName = file.name || file.filename;
      console.log('Resolved fileName:', fileName);
      
      if (fileName) {
        const sessionName = fileName.replace('.session', '');
        mapping[sessionName] = defaultName || sessionName;
        console.log('Added to mapping:', sessionName, '->', mapping[sessionName]);
      } else {
        console.error('No filename found for file:', file);
      }
    });
    console.log('Final mapping:', mapping);
    setNameMapping(mapping);
  };

  const handleNameChange = (sessionName, newName) => {
    setNameMapping(prev => ({
      ...prev,
      [sessionName]: newName
    }));
  };

  const handleUpdateNames = async () => {
    if (files.length === 0) {
      toast.error('Please select session files');
      return;
    }

    if (Object.keys(nameMapping).length === 0) {
      toast.error('Please set names for the sessions');
      return;
    }

    setLoading(true);
    try {
      console.log('Files being sent to API:', files);
      
      const response = await sessionAPI.updateNames(files, nameMapping);
      setResults(response.results);
      toast.success(`Updated names for ${response.total_sessions} sessions`);
    } catch (error) {
      console.error('Name update error:', error);
      toast.error('Failed to update names. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'unauthorized':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'status-success';
      case 'error':
        return 'status-error';
      case 'unauthorized':
        return 'status-warning';
      default:
        return 'status-info';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <User className="h-8 w-8 text-telegram-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Name Manager</h1>
          <p className="text-gray-600">Mass update display names across multiple Telegram accounts</p>
        </div>
      </div>

      {/* File Upload */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Session Files</h2>
        <FileUpload
          onFilesSelected={handleFilesSelected}
          acceptedFileTypes={['.session', '.zip']}
          title="Upload Session Files or ZIP"
          description="Drag & drop session files or ZIP files here, or click to select files"
        />
      </div>

      {/* Default Name Input */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Default Name</h2>
        <div className="max-w-md">
          <label htmlFor="defaultName" className="block text-sm font-medium text-gray-700 mb-2">
            Default Name for All Sessions
          </label>
          <input
            type="text"
            id="defaultName"
            value={defaultName}
            onChange={(e) => setDefaultName(e.target.value)}
            placeholder="Enter default name"
            className="input-field"
          />
          <p className="text-xs text-gray-500 mt-1">
            This name will be applied to all sessions. You can customize individual names below.
          </p>
        </div>
      </div>

      {/* Name Mapping */}
      {files.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Name Configuration</h2>
          <div className="space-y-3">
            {files.map((file, index) => {
              // Handle both regular files (.name) and extracted files (.filename)
              const fileName = file.name || file.filename;
              const sessionName = fileName ? fileName.replace('.session', '') : '';
              return (
                <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{fileName || 'Unknown file'}</p>
                    <p className="text-xs text-gray-500">Session: {sessionName}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Edit3 className="h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={nameMapping[sessionName] || ''}
                      onChange={(e) => handleNameChange(sessionName, e.target.value)}
                      placeholder="Enter display name"
                      className="input-field max-w-xs"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Update Button */}
      {files.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleUpdateNames}
            disabled={loading}
            className="btn-primary flex items-center space-x-2 px-8 py-3 text-lg"
          >
            {loading ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span>Updating Names...</span>
              </>
            ) : (
              <>
                <User className="h-5 w-5" />
                <span>Update Names</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Update Results ({results.length} sessions)
          </h2>
          
          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <h3 className="font-medium text-gray-900">{result.session}</h3>
                      <p className="text-sm text-gray-600">
                        Status: {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                      </p>
                    </div>
                  </div>
                  
                  {result.status === 'success' && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        User ID: {result.user_id}
                      </p>
                      <p className="text-sm text-gray-600">
                        Old Name: {result.old_name || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        New Name: {result.new_name}
                      </p>
                    </div>
                  )}
                </div>

                {result.status === 'error' && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-900">
                      Error: {result.error}
                    </p>
                    {result.error_type && (
                      <p className="text-xs text-gray-600 mt-1">
                        Type: {result.error_type}
                      </p>
                    )}
                  </div>
                )}

                {result.status === 'unauthorized' && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600">
                      This session is not authorized. Please check if the session file is valid.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Sessions:</span>
                <span className="ml-2 font-medium">{results.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Successfully Updated:</span>
                <span className="ml-2 font-medium text-green-600">
                  {results.filter(r => r.status === 'success').length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Errors:</span>
                <span className="ml-2 font-medium text-red-600">
                  {results.filter(r => r.status === 'error').length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Unauthorized:</span>
                <span className="ml-2 font-medium text-yellow-600">
                  {results.filter(r => r.status === 'unauthorized').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NameManager; 