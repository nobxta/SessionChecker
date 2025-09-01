import React, { useState, useMemo } from 'react';
import { Image, CheckCircle, XCircle, AlertTriangle, Loader, User, ChevronRight, ChevronLeft } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { sessionAPI } from '../services/api';
import toast from 'react-hot-toast';

const ProfilePictureManager = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [sessionFiles, setSessionFiles] = useState([]);
  const [profilePicture, setProfilePicture] = useState(null);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingIndex, setProcessingIndex] = useState(-1);

  const totalSteps = 4;

  // Use useMemo to calculate if we can proceed to next step
  const canProceedToNextStep = useMemo(() => {
    let result = false;
    
    switch (currentStep) {
      case 1:
        result = sessionFiles.length > 0;
        break;
      case 2:
        result = profilePicture !== null && profilePicture !== undefined;
        break;
      case 3:
        result = selectedSessions.length > 0;
        break;
      default:
        result = true;
        break;
    }
    
    return result;
  }, [currentStep, sessionFiles.length, profilePicture, selectedSessions.length]);

  const handleSessionFilesSelected = (selectedFiles) => {
    setSessionFiles(selectedFiles);
    // Auto-select all sessions by default
    setSelectedSessions(selectedFiles.map(file => file.name));
    setResults([]);
  };

  const handleProfilePictureSelected = (selectedFiles) => {
    if (selectedFiles.length > 0) {
      setProfilePicture(selectedFiles[0]);
      setResults([]);
    }
  };

  const handleSessionSelectionChange = (filename, isSelected) => {
    if (isSelected) {
      setSelectedSessions(prev => [...prev, filename]);
    } else {
      setSelectedSessions(prev => prev.filter(name => name !== filename));
    }
  };

  const handleSelectAllSessions = () => {
    setSelectedSessions(sessionFiles.map(file => file.name));
  };

  const handleDeselectAllSessions = () => {
    setSelectedSessions([]);
  };

  const getSelectedSessionFiles = () => {
    return sessionFiles.filter(file => selectedSessions.includes(file.name));
  };

  const handleUpdateProfilePictures = async () => {
    const selectedFiles = getSelectedSessionFiles();
    
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one session to process');
      return;
    }

    if (!profilePicture) {
      toast.error('Please select a profile picture');
      return;
    }

    setLoading(true);
    setResults([]);
    
    try {
      // Process only selected sessions
      const response = await sessionAPI.updateProfilePictures(selectedFiles, profilePicture);
      console.log('Update profile pictures response:', response);
      
      if (response && response.results) {
        setResults(response.results);
        
        const successCount = response.results.filter(r => r.status === 'success').length;
        if (successCount > 0) {
          toast.success(`Successfully updated ${successCount} of ${response.results.length} profile pictures`);
        } else {
          toast.error('Failed to update any profile pictures. Please check the errors below.');
        }
      } else {
        toast.error('Received unexpected response format from server');
        console.error('Unexpected response format:', response);
      }
    } catch (error) {
      console.error('Profile picture update error:', error);
      toast.error('Failed to update profile pictures: ' + (error.message || 'Unknown error'));
      
      // Create error results for UI feedback
      const errorResults = selectedFiles.map(file => ({
        session: file.name,
        status: 'error',
        error: 'Request failed: ' + (error.message || 'Unknown error'),
        error_type: 'request_failed',
        user_id: null
      }));
      
      setResults(errorResults);
    } finally {
      setLoading(false);
      setProcessingIndex(-1);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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
      case 'processing':
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'unauthorized':
        return 'bg-yellow-50 border-yellow-200';
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-center space-x-4">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div key={index} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              index + 1 < currentStep 
                ? 'bg-green-500 border-green-500 text-white' 
                : index + 1 === currentStep 
                ? 'bg-blue-500 border-blue-500 text-white' 
                : 'bg-gray-200 border-gray-300 text-gray-500'
            }`}>
              {index + 1 < currentStep ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <span className="font-semibold">{index + 1}</span>
              )}
            </div>
            {index < totalSteps - 1 && (
              <div className={`w-16 h-0.5 mx-2 ${
                index + 1 < currentStep ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>
      <div className="text-center mt-4">
        <p className="text-lg font-semibold text-gray-700">
          {currentStep === 1 && 'Step 1: Upload Session Files'}
          {currentStep === 2 && 'Step 2: Upload Profile Picture'}
          {currentStep === 3 && 'Step 3: Select Sessions to Process'}
          {currentStep === 4 && 'Step 4: Process and View Results'}
        </p>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Session Files</h2>
      <FileUpload
        onFilesSelected={handleSessionFilesSelected}
        acceptedFileTypes={['.session', '.zip']}
        title="Upload Session Files or ZIP"
        description="Drag & drop session files or ZIP files here, or click to select files"
      />
      
      {sessionFiles.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Selected Files:</h3>
          <div className="text-sm text-gray-600">
            <p>{sessionFiles.length} session file(s) ready</p>
            <ul className="mt-2 list-disc list-inside">
              {sessionFiles.slice(0, 5).map((file, index) => (
                <li key={index} className="truncate">{file.name}</li>
              ))}
              {sessionFiles.length > 5 && (
                <li>...and {sessionFiles.length - 5} more</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Profile Picture</h2>
      
      {/* Image Requirements Info */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">📋 Image Requirements:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Recommended Format:</strong> JPG/JPEG (most reliable for Telegram)</li>
          <li>• <strong>Also Supported:</strong> PNG, GIF, BMP, WebP</li>
          <li>• <strong>Max Size:</strong> 10MB (will be automatically compressed if needed)</li>
          <li>• <strong>Dimensions:</strong> Recommended 640x640 or larger (will be cropped to square)</li>
          <li>• <strong>Note:</strong> If you get format errors, try converting your image to JPG format</li>
        </ul>
      </div>
      
      <FileUpload
        onFilesSelected={handleProfilePictureSelected}
        acceptedFileTypes={['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']}
        multiple={false}
        maxFiles={1}
        title="Upload Profile Picture"
        description="Drag & drop an image file here, or click to select"
      />
      
      {profilePicture && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-white border-2 border-blue-300 flex items-center justify-center">
              <img
                src={URL.createObjectURL(profilePicture)}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Profile Picture Selected</h3>
              <p className="text-sm text-gray-600">{profilePicture.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                Size: {(profilePicture.size / 1024).toFixed(1)} KB
              </p>
              <p className="text-xs text-green-600 mt-1">
                ✓ Ready for processing
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Sessions to Process</h2>
      <p className="text-gray-600 mb-4">
        Choose which sessions you want to update with the profile picture. 
        You can select all, deselect all, or pick individual sessions.
      </p>
      
      <div className="mb-4 flex space-x-3">
        <button
          onClick={handleSelectAllSessions}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
        >
          Select All ({sessionFiles.length})
        </button>
        <button
          onClick={handleDeselectAllSessions}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
        >
          Deselect All
        </button>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sessionFiles.map((file, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
            <input
              type="checkbox"
              id={`session-${index}`}
              checked={selectedSessions.includes(file.name)}
              onChange={(e) => handleSessionSelectionChange(file.name, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={`session-${index}`} className="flex-1 cursor-pointer">
              <span className="font-medium text-gray-900">{file.name}</span>
              <span className="text-sm text-gray-500 ml-2">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </label>
          </div>
        ))}
      </div>
      
      {selectedSessions.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            {selectedSessions.length} session(s) selected for processing
          </p>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="card bg-blue-50 border-2 border-blue-500">
        <h2 className="text-xl font-bold text-center text-blue-800 mb-4">READY TO UPDATE PROFILE PICTURES</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{selectedSessions.length}</p>
            <p className="text-sm text-blue-700">Sessions Selected</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{profilePicture?.name}</p>
            <p className="text-sm text-blue-700">Profile Picture</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">Ready</p>
            <p className="text-sm text-blue-700">Status</p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleUpdateProfilePictures}
            disabled={loading}
            className="btn-primary bg-green-600 hover:bg-green-700 flex items-center space-x-2 px-10 py-4 text-xl rounded-lg shadow-md"
          >
            {loading ? (
              <>
                <Loader className="h-6 w-6 animate-spin" />
                <span>UPDATING PROFILE PICTURES...</span>
              </>
            ) : (
              <>
                <User className="h-6 w-6" />
                <span>START UPDATE</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {(results.length > 0 || loading) && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {loading ? 'Live Processing Status' : 'Update Results'} ({results.length} sessions)
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
                        {result.status === 'processing' && ' - Setting profile picture...'}
                      </p>
                    </div>
                  </div>
                  
                  {result.status === 'success' && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        User ID: {result.user_id}
                      </p>
                      <p className="text-sm text-gray-600">
                        Profile Picture: {result.profile_picture}
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
                    {result.error_type === 'photo_error' && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        <p className="font-medium">💡 Image Processing Tips:</p>
                        <ul className="mt-1 space-y-1">
                          <li>• <strong>Convert to JPG:</strong> PNG files sometimes cause format errors</li>
                          <li>• <strong>Check file size:</strong> Ensure image is under 10MB</li>
                          <li>• <strong>Use square images:</strong> 1:1 ratio works best</li>
                          <li>• <strong>Try different format:</strong> JPG is most reliable for Telegram</li>
                        </ul>
                        <p className="mt-2 font-medium">🔄 Quick Fix: Convert your image to JPG format and try again!</p>
                      </div>
                    )}
                    {result.raw_error && (
                      <p className="text-xs text-gray-500 mt-1">
                        Technical details: {result.raw_error}
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
          {results.length > 0 && (
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
          )}
        </div>
      )}
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Image className="h-8 w-8 text-telegram-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile Picture Manager</h1>
          <p className="text-gray-600">Set profile pictures for multiple accounts step by step</p>
        </div>
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Current Step Content */}
      {renderCurrentStep()}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-6">
        
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            currentStep === 1
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gray-500 text-white hover:bg-gray-600'
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        <div className="text-sm text-gray-600">
          Step {currentStep} of {totalSteps}
        </div>

        <button
          onClick={nextStep}
          disabled={!canProceedToNextStep || currentStep === totalSteps}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            !canProceedToNextStep || currentStep === totalSteps
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ProfilePictureManager;