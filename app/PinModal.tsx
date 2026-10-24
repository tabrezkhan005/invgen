'use client';

import { useState, useEffect } from 'react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (pin: string) => Promise<{ success: boolean; message: string }>;
  onVerified?: () => void;
  title?: string;
  description?: string;
}

export default function PinModal({
  isOpen,
  onClose,
  onVerify,
  onVerified,
  title = "Admin PIN Required",
  description = "Please enter your admin PIN to continue"
}: PinModalProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pin.trim()) {
      setError('Please enter your PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await onVerify(pin.trim());
      if (result.success) {
        onVerified?.();
        onClose();
      } else {
        setError(result.message);
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-gray-600 mb-6">{description}</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                Admin PIN
              </label>
              <input
                type="password"
                id="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} // Only numbers, max 6 digits
                onKeyPress={handleKeyPress}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-center text-lg font-mono tracking-widest"
                placeholder="••••••"
                maxLength={6}
                autoFocus
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={loading}
              >
                Cancel
              </button>
                <button
                  type="submit"
                  disabled={loading || !pin.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {loading ? 'Verifying...' : 'Verify PIN'}
              </button>
            </div>
          </form>

          <div className="mt-4 text-xs text-gray-500 text-center">
            PIN session lasts for 5 minutes after verification
          </div>
        </div>
      </div>
    </div>
  );
}
