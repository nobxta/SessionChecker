import React, { useState, useMemo, useEffect } from 'react';
import { sessionAPI } from '../services/api';
import { handleError, handleCancellation } from '../utils/errorHandler';
import { createCancellableRequest } from '../utils/requestController';
import FileUpload from '../components/FileUpload';
import { X, Play, Square, CheckCircle, AlertCircle, Info } from 'lucide-react';

const FolderJoiner = () => {
  const [sessions, setSessions] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [folderLink, setFolderLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState(null);

  const handleSessionFilesSelected = (files) => {
    setSessions(files);
    // Auto-select all sessions
    setSelectedSessions(files);
  };

  const handleSessionSelectionChange = (session, isSelected) => {
    if (isSelected) {
      setSelectedSessions(prev => [...prev, session]);
    } else {
      setSelectedSessions(prev => prev.filter(s => s !== session));
    }
  };

  const handleJoinFolder = async () => {
    if (!folderLink.trim()) {
      setError('Please enter a folder link');
      return;
    }

    if (selectedSessions.length === 0) {
      setError('Please select at least one session');
      return;
    }

    setIsLoading(true);
    setError('');
    setResults(null);

    // Generate unique request ID
    const newRequestId = `folder_join_${Date.now()}`;
    setRequestId(newRequestId);

    try {
      const response = await createCancellableRequest(
        newRequestId,
        async (signal) => {
          return await sessionAPI.joinFolder(selectedSessions, folderLink, signal);
        },
        {
          timeout: 300000, // 5 minutes
          onTimeout: () => {
            setError('Request timed out. Please try again.');
            setIsLoading(false);
          },
          onCancel: () => {
            handleCancellation('Folder join operation');
            setIsLoading(false);
          }
        }
      );
      
      setResults(response);
    } catch (err) {
      if (err.message === 'Request was cancelled') {
        // Already handled by onCancel
        return;
      }
      
      const errorDetails = handleError(err, 'Failed to join folder', { returnDetails: true });
      setError(errorDetails.message);
    } finally {
      setIsLoading(false);
      setRequestId(null);
    }
  };

  const handleCancel = () => {
    if (requestId) {
      createCancellableRequest.cancelRequest(requestId);
      setRequestId(null);
    }
  };

  const canProceed = useMemo(() => {
    return sessions.length > 0 && folderLink.trim() !== '' && selectedSessions.length > 0;
  }, [sessions.length, folderLink, selectedSessions.length]);

  const renderSessionList = () => {
    if (sessions.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">No sessions uploaded yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {sessions.map((session, index) => (
          <label key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={selectedSessions.includes(session)}
              onChange={(e) => handleSessionSelectionChange(session, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-900 truncate">{session.name}</span>
          </label>
        ))}
      </div>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    const { summary, results: sessionResults, folder_info } = results;

    return (
      <div className="mt-6 p-4 sm:p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Join Results</h3>
        
        {/* Folder Info */}
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Folder:</strong> {folder_info.slug}
          </p>
          <p className="text-sm text-blue-800">
            <strong>Link:</strong> {folder_info.link}
          </p>
        </div>

        {/* Summary */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Sessions:</span> {summary.total_sessions}
            </div>
            <div>
              <span className="font-medium text-green-600">Successfully Joined:</span> {summary.successfully_joined}
            </div>
            <div>
              <span className="font-medium text-blue-600">Already in Folder:</span> {summary.already_in_folder}
            </div>
            <div>
              <span className="font-medium text-red-600">Errors:</span> {summary.errors}
            </div>
            <div>
              <span className="font-medium text-yellow-600">Unauthorized:</span> {summary.unauthorized}
            </div>
            {summary.flood_wait > 0 && (
              <div>
                <span className="font-medium text-orange-600">Flood Wait:</span> {summary.flood_wait}
              </div>
            )}
            {summary.twofa_required > 0 && (
              <div>
                <span className="font-medium text-purple-600">2FA Required:</span> {summary.twofa_required}
              </div>
            )}
          </div>
        </div>

        {/* Session Results */}
        <div className="space-y-2">
          {sessionResults.map((result, index) => (
            <div key={index} className={`p-3 rounded-lg ${
              result.status === 'success' ? 'bg-green-50 border border-green-200' :
              result.status === 'info' ? 'bg-blue-50 border border-blue-200' :
              result.status === 'error' ? 'bg-red-50 border border-red-200' :
              'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{result.session}</p>
                  <p className={`text-sm ${
                    result.status === 'success' ? 'text-green-700' :
                    result.status === 'info' ? 'text-blue-700' :
                    result.status === 'error' ? 'text-red-700' :
                    'text-gray-700'
                  }`}>
                    {result.status === 'success' ? result.message : 
                     result.status === 'info' ? result.message : result.error}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${
                  result.status === 'success' ? 'bg-green-100 text-green-800' :
                  result.status === 'info' ? 'bg-blue-100 text-blue-800' :
                  result.status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {result.status === 'success' ? 'Success' : 
                   result.status === 'info' ? 'Already in Folder' : 'Error'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Folder Joiner</h1>
        <p className="text-gray-600">
          Select sessions and join them to a Telegram folder/chatlist
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        {/* Step 1: Upload Sessions */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 1: Upload Sessions</h2>
          <FileUpload
            onFilesSelected={handleSessionFilesSelected}
            acceptedFileTypes={['.session']}
            maxFiles={50}
            placeholder="Drop session files here or click to browse"
          />
          {sessions.length > 0 && (
            <p className="mt-2 text-sm text-gray-600">
              {sessions.length} session(s) uploaded
            </p>
          )}
        </div>

        {/* Step 2: Enter Folder Link */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 2: Enter Folder Link</h2>
          <div className="space-y-2">
            <label htmlFor="folderLink" className="block text-sm font-medium text-gray-700">
              Folder Link
            </label>
            <input
              type="text"
              id="folderLink"
              value={folderLink}
              onChange={(e) => setFolderLink(e.target.value)}
              placeholder="https://t.me/addlist/abc123 or just abc123"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500">
              Enter the folder link from Telegram (e.g., https://t.me/addlist/abc123) or just the slug
            </p>
          </div>
        </div>

        {/* Step 3: Select Sessions */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Step 3: Select Sessions ({selectedSessions.length} selected)
          </h2>
          {renderSessionList()}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isLoading ? (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 transition-colors"
              >
                <Square className="h-5 w-5 mr-2" />
                Cancel Operation
              </button>
              <div className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Joining Folder...
              </div>
            </>
          ) : (
            <button
              onClick={handleJoinFolder}
              disabled={!canProceed}
              className={`px-6 py-3 rounded-lg font-medium text-white flex items-center justify-center ${
                canProceed
                  ? 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
                  : 'bg-gray-400 cursor-not-allowed'
              } transition-colors`}
            >
              <Play className="h-5 w-5 mr-2" />
              {`Join Folder (${selectedSessions.length} sessions)`}
            </button>
          )}
        </div>

        {/* Results */}
        {renderResults()}
      </div>
    </div>
  );
};

export default FolderJoiner;
