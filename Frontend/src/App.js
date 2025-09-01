import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SessionValidator from './pages/SessionValidator';
import HealthChecker from './pages/HealthChecker';
import NameManager from './pages/NameManager';
import BioManager from './pages/BioManager';
import ProfilePictureManager from './pages/ProfilePictureManager';
import CodeExtractor from './pages/CodeExtractor';
import AuthCodeExtractor from './pages/AuthCodeExtractor';
import FolderJoiner from './pages/FolderJoiner';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="validate" element={<SessionValidator />} />
            <Route path="health" element={<HealthChecker />} />
            <Route path="names" element={<NameManager />} />
            <Route path="bios" element={<BioManager />} />
            <Route path="profile-pictures" element={<ProfilePictureManager />} />
            <Route path="login-codes" element={<CodeExtractor />} />
            <Route path="auth-codes" element={<AuthCodeExtractor />} />
            <Route path="folder-joiner" element={<FolderJoiner />} />
          </Route>
        </Routes>
        
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 5000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 4000,
              style: {
                background: '#10B981',
              },
            },
            error: {
              duration: 6000,
              style: {
                background: '#EF4444',
              },
            },
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App; 