'use client';

import { useState, useEffect, useRef } from 'react';

interface PinLoginProps {
  onAuthenticate: (pin: string) => Promise<boolean>;
  onAuthenticated: () => void;
}

export default function PinLogin({ onAuthenticate, onAuthenticated }: PinLoginProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeLeft, setLockTimeLeft] = useState(0);
  const [showKeypad, setShowKeypad] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxAttempts = 3;
  const lockDuration = 30000;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLocked && lockTimeLeft > 0) {
      timer = setInterval(() => {
        setLockTimeLeft(prev => {
          if (prev <= 1000) {
            setIsLocked(false);
            setAttempts(0);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLocked, lockTimeLeft]);

  useEffect(() => {
    if (inputRef.current && !isLocked) {
      inputRef.current.focus();
    }
  }, [isLocked]);

  useEffect(() => {
    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      if (isLocked || loading) return;

      try {
        if (e.key >= '0' && e.key <= '9' && pin.length < 4) {
          e.preventDefault();
          setPin(prev => prev + e.key);
          setError('');
        } else if (e.key === 'Backspace' && pin.length > 0) {
          e.preventDefault();
          setPin(prev => prev.slice(0, -1));
        } else if (e.key === 'Enter' && pin.length === 4) {
          e.preventDefault();
          await handleSubmit({ preventDefault: () => {} } as React.FormEvent);
        }
      } catch (error) {
        console.error('Error in keyboard handler:', error);
        setError('An error occurred while processing input');
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isLocked, loading, pin.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked || loading) return;
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isLocked || loading) return;
    if (e.key === 'Enter' && pin.length === 4) {
      handleSubmit(e as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) return;
    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await onAuthenticate(pin);

      if (success) {
        setError('');
        setAttempts(0);
        onAuthenticated();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= maxAttempts) {
          setIsLocked(true);
          setLockTimeLeft(lockDuration);
          setError(`Too many failed attempts. Try again in ${lockDuration / 1000} seconds.`);
        } else {
          setError(`Invalid PIN. ${maxAttempts - newAttempts} attempts remaining.`);
        }
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }

    setPin('');
  };

  const handleKeyPress = (key: string) => {
    if (isLocked || loading) return;

    setError('');

    if (key === 'clear') {
      setPin('');
    } else if (key === 'backspace') {
      setPin(prev => prev.slice(0, -1));
    } else if (/^\d$/.test(key) && pin.length < 4) {
      setPin(prev => prev + key);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return seconds;
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white border-2 border-neutral-200 rounded-xl mb-6">
            <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-neutral-900 mb-2 tracking-tight">Invoice Manager</h1>
          <p className="text-neutral-500 font-normal">Enter your secure PIN to access the system</p>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-8">

          {/* PIN Input Area */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-neutral-700 mb-4">
              4-Digit PIN Code
            </label>

            <div className="relative">
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowKeypad(false)}
                className="w-full h-16 px-6 text-center text-3xl font-mono tracking-[1em] bg-neutral-50 border-2 border-neutral-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white disabled:bg-neutral-100 disabled:cursor-not-allowed"
                disabled={isLocked || loading}
                autoComplete="off"
                autoFocus
                placeholder="••••"
              />

              {/* PIN Dots Indicator */}
              <div className="flex justify-center gap-3 mt-4">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full ${
                      pin.length > index
                        ? 'bg-emerald-600'
                        : 'bg-neutral-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="mb-6">
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}

          {isLocked && (
            <div className="mb-6">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-sm text-amber-800 font-medium">Account locked. Please wait {formatTime(lockTimeLeft)} seconds.</p>
              </div>
            </div>
          )}

          {/* Keypad Toggle */}
          <button
            onClick={() => setShowKeypad(!showKeypad)}
            className="w-full mb-4 py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium rounded-lg flex items-center justify-center gap-2"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            {showKeypad ? 'Hide Keypad' : 'Show Keypad'}
          </button>

          {/* Collapsible Number Pad */}
          {showKeypad && (
            <div className="mb-6 border-t border-neutral-200 pt-6">
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleKeyPress(num.toString())}
                    disabled={isLocked || loading || pin.length >= 4}
                    className="h-14 bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 disabled:bg-neutral-50 disabled:cursor-not-allowed border border-neutral-200 rounded-lg text-neutral-900 disabled:text-neutral-400 font-semibold text-lg"
                    type="button"
                  >
                    {num}
                  </button>
                ))}

                <button
                  onClick={() => handleKeyPress('clear')}
                  disabled={isLocked || loading || pin.length === 0}
                  className="h-14 bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 disabled:bg-neutral-50 disabled:cursor-not-allowed border border-neutral-200 rounded-lg text-neutral-700 disabled:text-neutral-400 font-medium text-sm"
                  type="button"
                >
                  Clear
                </button>

                <button
                  onClick={() => handleKeyPress('0')}
                  disabled={isLocked || loading || pin.length >= 4}
                  className="h-14 bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 disabled:bg-neutral-50 disabled:cursor-not-allowed border border-neutral-200 rounded-lg text-neutral-900 disabled:text-neutral-400 font-semibold text-lg"
                  type="button"
                >
                  0
                </button>

                <button
                  onClick={() => handleKeyPress('backspace')}
                  disabled={isLocked || loading || pin.length === 0}
                  className="h-14 bg-neutral-50 hover:bg-neutral-100 active:bg-neutral-200 disabled:bg-neutral-50 disabled:cursor-not-allowed border border-neutral-200 rounded-lg text-neutral-700 disabled:text-neutral-400 flex items-center justify-center"
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isLocked || loading || pin.length !== 4}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white disabled:text-neutral-500 font-semibold rounded-xl flex items-center justify-center gap-2"
            type="button"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Authenticate</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="flex items-center justify-center gap-2 text-neutral-500 mb-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-sm">Secured with 256-bit encryption</span>
          </div>
          <p className="text-xs text-neutral-400">
            Use your keyboard or on-screen keypad to enter your PIN
          </p>
        </div>
      </div>
    </div>
  );
}
