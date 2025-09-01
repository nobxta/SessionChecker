import React, { useState, useEffect, useRef } from 'react';
import { Lock, CheckCircle, XCircle, AlertTriangle, Loader, Search, Copy, StopCircle, Play, User, Phone, Hash } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { sessionAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthCodeExtractor = () => {
  const [files, setFiles] = useState([]);
  const [sessionCards, setSessionCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extractedCodes, setExtractedCodes] = useState([]);

  const handleFilesSelected = (selectedFiles) => {
    setFiles(selectedFiles);
    setSessionCards([]);
    setExtractedCodes([]);
    
    // Create session cards for each file
    const cards = selectedFiles.map(file => ({
      file: file,
      filename: file.name || file.filename,
      status: 'pending',
      accountInfo: null,
      authCode: null,
      error: null
    }));
    
    setSessionCards(cards);
  };

  const handleScanAccount = async (cardIndex) => {
    const card = sessionCards[cardIndex];
    if (card.status === 'scanning') return;

    // Update card status
    const updatedCards = [...sessionCards];
    updatedCards[cardIndex] = { ...card, status: 'scanning', error: null };
    setSessionCards(updatedCards);

    try {
      // Get login details from session file
      const loginDetails = await sessionAPI.getLoginDetails(card.file);
      console.log('Login details response:', loginDetails);
      
      // Create a completely new array to ensure React detects the change
      const newSessionCards = [...sessionCards];
      newSessionCards[cardIndex] = {
        ...card,
        status: 'scanned',
        accountInfo: loginDetails,
        error: null
      };
      
      console.log('Setting account info in state:', newSessionCards[cardIndex]);
      setSessionCards(newSessionCards);
      toast.success(`Account info extracted for ${card.filename}`);
      console.log('Updated card with account info:', newSessionCards[cardIndex]);
    } catch (error) {
      console.error('Scan error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to scan account';
      
      const newSessionCards = [...sessionCards];
      newSessionCards[cardIndex] = {
        ...card,
        status: 'error',
        error: errorMessage
      };
      setSessionCards(newSessionCards);
      toast.error(`Failed to scan ${card.filename}: ${errorMessage}`);
    }
  };

  const handleCheckCode = async (cardIndex) => {
    const card = sessionCards[cardIndex];
    if (!card.accountInfo || card.status === 'checking') {
      toast.error('Please scan the account first');
      return;
    }

    // Update card to show checking is starting
    const newSessionCards = [...sessionCards];
    newSessionCards[cardIndex] = { ...card, status: 'checking', error: null };
    setSessionCards(newSessionCards);

    try {
      // Get auth code from session file
      const authCodeResponse = await sessionAPI.getAuthCode(card.file);
      console.log('Auth code response:', authCodeResponse);
      
      if (authCodeResponse.login_code) {
        const newSessionCards = [...sessionCards];
        newSessionCards[cardIndex] = {
          ...card,
          status: 'success',
          authCode: authCodeResponse.login_code,
          error: null
        };
        setSessionCards(newSessionCards);
        toast.success(`Auth code found: ${authCodeResponse.login_code}`);
        
        // Add to extracted codes
        setExtractedCodes(prev => [...prev, {
          session: card.filename,
          code: authCodeResponse.login_code,
          accountInfo: card.accountInfo
        }]);
      } else {
        const newSessionCards = [...sessionCards];
        newSessionCards[cardIndex] = {
          ...card,
          status: 'error',
          error: 'No auth code found'
        };
        setSessionCards(newSessionCards);
        toast.error('No auth code found');
      }
    } catch (error) {
      console.error('Auth code check error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to check auth code';
      
      const newSessionCards = [...sessionCards];
      newSessionCards[cardIndex] = {
        ...card,
        status: 'error',
        error: errorMessage
      };
      setSessionCards(newSessionCards);
      toast.error(`Failed to check auth code: ${errorMessage}`);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Lock className="w-5 h-5 text-gray-400" />;
      case 'scanning':
      case 'checking':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'scanned':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 border-gray-300';
      case 'scanning':
      case 'checking':
        return 'bg-blue-50 border-blue-300';
      case 'scanned':
        return 'bg-green-50 border-green-300';
      case 'success':
        return 'bg-green-50 border-green-300';
      case 'error':
        return 'bg-red-50 border-red-300';
      default:
        return 'bg-yellow-50 border-yellow-300';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Auth Code Extractor</h1>
          <p className="text-gray-600">
            Upload session files to extract auth codes from Telegram accounts
          </p>
        </div>

        <FileUpload 
          onFilesSelected={handleFilesSelected} 
          acceptedFileTypes={['.session', '.zip']}
          title="Upload Session Files or ZIP"
          description="Drag & drop session files or ZIP files here, or click to select files"
        />

        {sessionCards.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Session Files</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessionCards.map((card, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${getStatusColor(card.status)} transition-all duration-200`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(card.status)}
                      <span className="font-medium text-sm truncate">{card.filename}</span>
                    </div>
                  </div>

                  {card.accountInfo && (
                    <div className="mb-3 space-y-1">
                      <div className="flex items-center space-x-2 text-sm">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{card.accountInfo.name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Hash className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">ID: {card.accountInfo.user_id || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{card.accountInfo.mob || 'N/A'}</span>
                      </div>
                    </div>
                  )}

                  {card.authCode && (
                    <div className="mb-3 p-2 bg-green-100 rounded border border-green-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-800">Auth Code:</span>
                        <button
                          onClick={() => copyToClipboard(card.authCode)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="font-mono text-lg font-bold text-green-900 mt-1">
                        {card.authCode}
                      </div>
                    </div>
                  )}

                  {card.error && (
                    <div className="mb-3 p-2 bg-red-100 rounded border border-red-200">
                      <span className="text-sm text-red-800">{card.error}</span>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    {card.status === 'pending' && (
                      <button
                        onClick={() => handleScanAccount(index)}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                      >
                        <Search className="w-4 h-4 mr-1" />
                        Scan Account
                      </button>
                    )}
                    
                    {card.status === 'scanned' && (
                      <button
                        onClick={() => handleCheckCode(index)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                      >
                        <Search className="w-4 h-4 mr-1" />
                        Check Code
                      </button>
                    )}
                    
                    {(card.status === 'scanning' || card.status === 'checking') && (
                      <button
                        disabled
                        className="flex-1 bg-gray-400 text-white px-3 py-2 rounded text-sm font-medium cursor-not-allowed"
                      >
                        <Loader className="w-4 h-4 mr-1 animate-spin" />
                        {card.status === 'scanning' ? 'Scanning...' : 'Checking...'}
                      </button>
                    )}
                    
                    {(card.status === 'success' || card.status === 'error') && (
                      <button
                        onClick={() => handleScanAccount(index)}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                      >
                        <Search className="w-4 h-4 mr-1" />
                        Rescan
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {extractedCodes.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Extracted Auth Codes</h2>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Session
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Auth Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {extractedCodes.map((code, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {code.session}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {code.accountInfo?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm font-bold text-green-600">
                              {code.code}
                            </span>
                            <button
                              onClick={() => copyToClipboard(code.code)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => copyToClipboard(code.code)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Copy Code
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCodeExtractor; 