import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth headers if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const sessionAPI = {
  // Validate sessions
  validateSessions: async (files, signal = null) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const response = await api.post('/validate/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: signal,
    });
    return response.data;
  },

  // Health check sessions
  healthCheckSessions: async (files, signal = null) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const response = await api.post('/health/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: signal,
    });
    return response.data;
  },

  // Update names
  updateNames: async (files, names, signal = null) => {
    console.log('updateNames called with files:', files);
    console.log('updateNames called with names:', names);
    
    const formData = new FormData();
    files.forEach((file, index) => {
      console.log(`Adding file ${index}:`, file);
      console.log(`File properties: name=${file.name}, type=${file.type}, size=${file.size}`);
      formData.append('files', file);
    });
    formData.append('names', JSON.stringify(names));
    
    console.log('FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    
    const response = await api.post('/name/set', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: signal,
    });
    return response.data;
  },

  // Update bios
  updateBios: async (files, bioText, signal = null) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('bio_text', bioText);
    
    const response = await api.post('/bio/set', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: signal,
    });
    return response.data;
  },

  // Update profile pictures
  updateProfilePictures: async (sessionFiles, profilePicture, signal = null) => {
    const formData = new FormData();
    sessionFiles.forEach(file => {
      formData.append('session_files', file);
    });
    formData.append('profile_picture', profilePicture);
    
    console.log('Sending profile picture update request with:', {
      sessionFiles: sessionFiles.length,
      profilePicture: profilePicture.name
    });
    
    const response = await api.post('/pfp/update_multiple_profile_pictures', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: signal,
    });
    
    console.log('Profile picture update response:', response.data);
    return response.data;
  },

  // Get login details from session file
  getLoginDetails: async (sessionFile, signal = null) => {
    const formData = new FormData();
    formData.append('session_file', sessionFile);
    
    const response = await api.post('/auth_code/login-details', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: signal,
    });
    return response.data;
  },

  // Get auth code from session file
  getAuthCode: async (sessionFile, signal = null) => {
    const formData = new FormData();
    formData.append('session_file', sessionFile);
    
    const response = await api.post('/auth_code/auth-code', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: signal,
    });
    return response.data;
  },

  // Get login details from session file (login_code router)
  getLoginDetailsFromLoginCode: async (sessionFile, signal = null) => {
    const formData = new FormData();
    formData.append('session_file', sessionFile);
    
    const response = await api.post('/login_code/login-details', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: signal,
    });
    return response.data;
  },

  // Get login code from session file (login_code router)
  getLoginCode: async (sessionFile, signal = null) => {
    const formData = new FormData();
    formData.append('session_file', sessionFile);
    
    const response = await api.post('/login_code/login-code', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: signal,
    });
    return response.data;
  },

  // Join folder with sessions
  joinFolder: async (sessionFiles, folderLink, signal = null) => {
    const formData = new FormData();
    sessionFiles.forEach(file => {
      formData.append('session_files', file);
    });
    formData.append('folder_link', folderLink);
    
    console.log('Sending folder join request with:', {
      sessionFiles: sessionFiles.length,
      folderLink: folderLink
    });
    
    const response = await api.post('/folder/join_folder', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: signal,
    });
    
    console.log('Folder join response:', response.data);
    return response.data;
  },

  // Legacy endpoints for backward compatibility
  extractLoginCodes: async (files, signal = null) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const response = await api.post('/login_code/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: signal,
    });
    return response.data;
  },

  extractAuthCodes: async (files, signal = null) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const response = await api.post('/auth_code/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: signal,
    });
    return response.data;
  },

  // Legacy scan functionality for backward compatibility
  scanLoginAccountInfo: async (files, signal = null) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const response = await api.post('/login_code/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: signal,
    });
    return response.data;
  },

  scanAuthAccountInfo: async (files, signal = null) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const response = await api.post('/auth_code/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: signal,
    });
    return response.data;
  },

  // Preview ZIP contents
  previewZip: async (zipFile, signal = null) => {
    const formData = new FormData();
    formData.append('file', zipFile);
    
    const response = await api.post('/zip/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: signal,
    });
    return response.data;
  },

  // Extract session files from ZIP
  extractSessionFiles: async (zipFile, filenames = [], signal = null) => {
    const formData = new FormData();
    formData.append('file', zipFile);
    if (filenames.length > 0) {
      formData.append('filenames', JSON.stringify(filenames));
    }
    
    const response = await api.post('/zip/extract', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      signal: signal,
    });
    return response.data;
  },

  // Download session file from ZIP
  downloadSessionFile: async (zipFile, filename, signal = null) => {
    const formData = new FormData();
    formData.append('file', zipFile);
    
    const response = await api.post(`/zip/download/${filename}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
      signal: signal,
    });
    return response.data;
  },
};

export default api;