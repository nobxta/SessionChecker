import React, { useState } from 'react';
import { Heart, CheckCircle, XCircle, AlertTriangle, Loader, Activity } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { sessionAPI } from '../services/api';
import toast from 'react-hot-toast';

const HealthChecker = () => {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFilesSelected = (selectedFiles) => {
    setFiles(selectedFiles);
    setResults([]);
  };

  const handleHealthCheck = async () => {
    if (files.length === 0) {
      toast.error('Please select session files to check');
      return;
    }

    setLoading(true);
    try {
      const response = await sessionAPI.healthCheckSessions(files);
      setResults(response.results);
      toast.success(`Health checked ${response.total_sessions} sessions`);
    } catch (error) {
      console.error('Health check error:', error);
      toast.error('Failed to check session health. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'limited':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'banned':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'unauthorized':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'status-success';
      case 'limited':
        return 'status-warning';
      case 'banned':
        return 'status-error';
      case 'error':
        return 'status-error';
      case 'unauthorized':
        return 'status-warning';
      default:
        return 'status-info';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'healthy':
        return 'Healthy - No limitations detected';
      case 'limited':
        return 'Limited - Account has restrictions';
      case 'banned':
        return 'Banned - Account is banned';
      case 'error':
        return 'Error - Failed to check health';
      case 'unauthorized':
        return 'Unauthorized - Session not valid';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Heart className="h-8 w-8 text-telegram-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Health Checker</h1>
          <p className="text-gray-600">Check session health using SpamBot to detect limitations and bans</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Activity className="h-6 w-6 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">How it works</h3>
            <p className="text-sm text-blue-700 mt-1">
              This tool sends a message to @SpamBot for each session to check if the account has any limitations, 
              restrictions, or bans. The response from SpamBot indicates the account's health status.
            </p>
          </div>
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

      {/* Health Check Button */}
      {files.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleHealthCheck}
            disabled={loading}
            className="btn-primary flex items-center space-x-2 px-8 py-3 text-lg"
          >
            {loading ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                <span>Checking Health...</span>
              </>
            ) : (
              <>
                <Heart className="h-5 w-5" />
                <span>Check Session Health</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Health Check Results ({results.length} sessions)
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
                        {getStatusText(result.status)}
                      </p>
                    </div>
                  </div>
                </div>

                {result.details && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-700">{result.details}</p>
                  </div>
                )}

                {result.spam_bot_response && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-600 mb-1">SpamBot Response:</p>
                    <p className="text-sm text-gray-700">{result.spam_bot_response}</p>
                  </div>
                )}

                {result.status === 'error' && result.error_type && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-900">
                      Error Type: {result.error_type}
                    </p>
                    {result.raw_error && (
                      <p className="text-xs text-gray-600 mt-1">
                        Details: {result.raw_error}
                      </p>
                    )}
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
                <span className="text-gray-600">Healthy:</span>
                <span className="ml-2 font-medium text-green-600">
                  {results.filter(r => r.status === 'healthy').length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Limited:</span>
                <span className="ml-2 font-medium text-yellow-600">
                  {results.filter(r => r.status === 'limited').length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Banned:</span>
                <span className="ml-2 font-medium text-red-600">
                  {results.filter(r => r.status === 'banned').length}
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

export default HealthChecker; 