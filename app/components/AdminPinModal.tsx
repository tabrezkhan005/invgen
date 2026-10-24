'use client';

import { useState, useEffect } from 'react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (pin: string) => Promise<{ success: boolean; message: string }>;
  onVerified?: () => void;
  title?: string;
  description?: string;
  action?: string;
}

export default function AdminPinModal({
  isOpen,
  onClose,
  onVerify,
  onVerified,
  title = "Admin PIN Required",
  description = "Enter your 4-6 digit admin PIN to continue",
  action = "proceed"
}: AdminPinModalProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setLoading(false);
      setAttempts(0);
    }
  }, [isOpen]);

  const handleNumberClick = (number: string) => {
    if (pin.length >= 6) return;
    setPin(prev => prev + number);
    setError('');
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await onVerify(pin);
      if (result.success) {
        onVerified?.();
        onClose();
      } else {
        setAttempts(prev => prev + 1);
        setError(result.message);
        if (attempts >= 2) {
          setError('Too many failed attempts. Please try again later.');
          setTimeout(() => onClose(), 2000);
        }
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                🔐
              </div>
              <div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-sm opacity-90">{description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white p-1"
              disabled={loading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* PIN Display */}
        <div className="px-6 py-6">
          <div className="text-center mb-6">
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-colors ${
                    i <= pin.length
                      ? 'bg-red-500 border-red-500'
                      : 'border-neutral-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-neutral-600">
              Enter {pin.length}/6 digits
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="text-danger-600">⚠️</div>
                <p className="text-danger-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
              <button
                key={number}
                onClick={() => handleNumberClick(number.toString())}
                disabled={loading || pin.length >= 6}
                className="h-12 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 rounded-lg font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {number}
              </button>
            ))}
            <button
              onClick={handleClear}
              disabled={loading || pin.length === 0}
              className="h-12 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
            <button
              onClick={() => handleNumberClick('0')}
              disabled={loading || pin.length >= 6}
              className="h-12 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 rounded-lg font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              disabled={loading || pin.length === 0}
              className="h-12 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⌫
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || pin.length < 4}
              className="flex-1 btn-primary"
            >
              {loading ? 'Verifying...' : `Verify & ${action}`}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-4 text-center">
            <p className="text-xs text-neutral-500">
              Use keyboard numbers or click buttons above
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Press Enter to verify • Esc to cancel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
