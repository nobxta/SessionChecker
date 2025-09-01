import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Heart, 
  User, 
  FileText, 
  Image, 
  Key, 
  Lock,
  Zap,
  FolderPlus,
} from 'lucide-react';

const Dashboard = () => {
  const features = [
    {
      name: 'Session Validator',
      description: 'Validate and check the authentication status of your Telegram sessions',
      icon: Shield,
      href: '/validate',
      color: 'bg-blue-500',
    },
    {
      name: 'Health Checker',
      description: 'Check session health using SpamBot to detect limitations and bans',
      icon: Heart,
      href: '/health',
      color: 'bg-green-500',
    },
    {
      name: 'Name Manager',
      description: 'Mass update display names across multiple Telegram accounts',
      icon: User,
      href: '/names',
      color: 'bg-purple-500',
    },
    {
      name: 'Bio Manager',
      description: 'Update bio text for multiple accounts simultaneously',
      icon: FileText,
      href: '/bios',
      color: 'bg-orange-500',
    },
    {
      name: 'Profile Pictures',
      description: 'Set profile pictures for multiple accounts at once',
      icon: Image,
      href: '/profile-pictures',
      color: 'bg-pink-500',
    },
    {
      name: 'Login Codes',
      description: 'Extract login codes from message history',
      icon: Key,
      href: '/login-codes',
      color: 'bg-yellow-500',
    },
    {
      name: 'Auth Codes',
      description: 'Extract authentication codes from my.telegram.org messages',
      icon: Lock,
      href: '/auth-codes',
      color: 'bg-red-500',
    },
    {
      name: 'Folder Joiner',
      description: 'Join multiple sessions to Telegram folders/chatlists',
      icon: FolderPlus,
      href: '/folder-joiner',
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome to Telegram Session Manager. Manage your sessions efficiently.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Zap className="h-8 w-8 text-telegram-500" />
          <span className="text-lg font-semibold text-telegram-600">Session Manager</span>
        </div>
      </div>

      {/* Features Grid - Now "Quick Actions" is the primary focus */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link
              key={feature.name}
              to={feature.href}
              className="card hover:shadow-md transition-shadow duration-200 group"
            >
              <div className="flex items-center space-x-4">
                <div className={`flex-shrink-0 p-3 rounded-lg ${feature.color} bg-opacity-10`}>
                  <feature.icon className={`h-6 w-6 ${feature.color.replace('bg-', 'text-')}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-telegram-600 transition-colors">
                    {feature.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Getting Started */}
      <div className="card bg-gradient-to-r from-telegram-50 to-blue-50 border-telegram-200">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <Zap className="h-8 w-8 text-telegram-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Getting Started</h3>
            <p className="text-sm text-gray-600 mt-1">
              Upload your Telegram session files (.session) to get started. You can validate sessions, 
              check their health, and perform various operations on multiple accounts simultaneously.
            </p>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                {/* Removed CheckCircle import as it's no longer used, unless you re-add it in the future */}
                {/* Using a simple bullet for now */}
                <span className="text-green-500">•</span>
                <span>Drag & drop session files or click to browse</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">•</span>
                <span>Validate sessions to check authentication status</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">•</span>
                <span>Use health checker to detect limitations and bans</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">•</span>
                <span>Perform bulk operations on multiple accounts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;