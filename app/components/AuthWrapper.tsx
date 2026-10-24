'use client';

import { useState, useEffect } from 'react';
import PinLogin from './PinLogin';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only check authentication on client-side mount to prevent hydration mismatch
    const authStatus = sessionStorage.getItem('authenticated');
    setIsAuthenticated(authStatus === 'true');
    setIsLoading(false);

    // Check if electronAPI is available
    const checkElectronAPI = () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        console.log('ElectronAPI is available');
        console.log('Available methods:', Object.keys(window.electronAPI));
      } else {
        console.log('ElectronAPI not available yet, retrying...');
        setTimeout(checkElectronAPI, 100);
        return;
      }
    };

    // Check electronAPI availability
    checkElectronAPI();

    // Test basic API connection
    // API is available if window.electronAPI exists
    const testAPI = async () => {
      try {
        if (window.electronAPI) {
          console.log('Electron API is available');
        }
      } catch (error) {
        console.error('API test failed:', error);
      }
    };

    // Test API after a short delay
    setTimeout(testAPI, 1000);
  }, []);

  const handleAuthenticate = async (pin: string): Promise<boolean> => {
    try {
      console.log('ElectronAPI available:', !!window.electronAPI);
      console.log('verifyAdminPin method available:', !!(window.electronAPI && window.electronAPI.verifyAdminPin));

      if (!window.electronAPI || !window.electronAPI.verifyAdminPin) {
        console.error('ElectronAPI not available');
        console.log('window object:', typeof window);
        console.log('window.electronAPI:', window.electronAPI);
        return false;
      }

      // Verify PIN against stored admin PIN
      const result = await window.electronAPI.verifyAdminPin(pin);
      console.log('PIN verification result:', result);

      if (result && result.success) {
        sessionStorage.setItem('authenticated', 'true');
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('PIN verification failed:', error);
      return false;
    }
  };

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  // Show loading state during hydration to prevent mismatch
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PinLogin onAuthenticate={handleAuthenticate} onAuthenticated={handleAuthenticated} />;
  }

  return <>{children}</>;
}
