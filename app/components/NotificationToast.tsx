'use client';

import { useState, useEffect } from 'react';

interface NotificationToastProps {
  isVisible: boolean;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function NotificationToast({
  isVisible,
  type,
  title,
  message,
  duration = 5000,
  onClose,
  action
}: NotificationToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isVisible) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, ((duration - elapsed) / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onClose?.();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: '✅',
          iconColor: 'text-green-600',
          titleColor: 'text-green-900',
          textColor: 'text-green-700',
          progressBg: 'bg-green-500'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: '⚠️',
          iconColor: 'text-yellow-600',
          titleColor: 'text-yellow-900',
          textColor: 'text-yellow-700',
          progressBg: 'bg-yellow-500'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: '❌',
          iconColor: 'text-red-600',
          titleColor: 'text-red-900',
          textColor: 'text-red-700',
          progressBg: 'bg-red-500'
        };
      case 'info':
      default:
        return {
          bg: 'bg-primary/5',
          border: 'border-primary/20',
          icon: 'ℹ️',
          iconColor: 'text-primary',
          titleColor: 'text-primary',
          textColor: 'text-primary/80',
          progressBg: 'bg-primary'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className={`${styles.bg} border ${styles.border} rounded-lg shadow-lg overflow-hidden transition-all duration-300`}>
        {/* Progress Bar */}
        <div className="h-1 bg-neutral-200">
          <div
            className={`h-full ${styles.progressBg} transition-all duration-50`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={`text-xl ${styles.iconColor}`}>
              {styles.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-semibold text-sm ${styles.titleColor}`}>
                {title}
              </h4>
              <p className={`text-sm mt-1 ${styles.textColor}`}>
                {message}
              </p>
              {action && (
                <button
                  onClick={action.onClick}
                  className={`mt-2 text-sm font-medium ${styles.titleColor} hover:underline focus:outline-none focus:underline`}
                >
                  {action.label}
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 p-1 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}













