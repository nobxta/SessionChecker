import React, { useState } from 'react';
import { FileText, CheckCircle, XCircle, AlertTriangle, Loader, Edit3 } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { sessionAPI } from '../services/api';
import toast from 'react-hot-toast';

const BioManager = () => {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bioText, setBioText] = useState('');

  const handleFilesSelected = (selectedFiles) => {
    setFiles(selectedFiles);
    setResults([]);
  };

  const handleUpdateBios = async () => {
    if (files.length === 0) {
      toast.error('Please select session files');
      return;
    }

    if (!bioText.trim()) {
      toast.error('Please enter bio text');
      return;
    }

    setLoading(true);
    try {
      const response = await sessionAPI.updateBios(files, bioText);
      setResults(response.results);
      toast.success(`Updated bios for ${response.total_sessions} sessions`);
    } catch (error) {
      console.error('Bio update error:', error);
      toast.error('Failed to update bios. Please try again.');
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
        <FileText className="h-8 w-8 text-telegram-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bio Manager</h1>
          <p className="text-gray-600">Update bio text for multiple accounts simultaneously</p>
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

      {/* Bio Text Input */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bio Text</h2>
        <div>
          <label htmlFor="bioText" className="block text-sm font-medium text-gray-700 mb-2">
            Bio Text to Set
          </label>
          <textarea
            id="bioText"
            value={bioText}
            onChange={(e) => setBioText(e.target.value)}
            placeholder="Enter bio text to set for all accounts..."
            rows={4}
            className="input-field"
            maxLength={70}
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">
              Maximum 70 characters. Current: {bioText.length}/70
            </p>
            <div className="flex items-center space-x-2">
              <Edit3 className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">Bio Editor</span>
            </div>
          </div>
        </div>
      </div>

      {/* Update Button */}
      {files.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleUpdateBios}
            disabled={loading || !bioText.trim()}
            className="btn-primary flex items-center space-x-2 px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span>Updating Bios...</span>
              </>
            ) : (
              <>
                <FileText className="h-5 w-5" />
                <span>Update Bios</span>
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
                        Old Bio: {result.old_bio || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        New Bio: {result.new_bio}
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

export default BioManager; 