'use client';

import { useState, useCallback } from 'react';
import NotificationToast from './NotificationToast';

interface Toast {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastManagerProps {
  children: React.ReactNode;
}

export default function ToastManager({ children }: ToastManagerProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    type: Toast['type'],
    title: string,
    message: string,
    options?: {
      duration?: number;
      action?: Toast['action'];
    }
  ) => {
    const id = Date.now().toString();
    const toast: Toast = {
      id,
      type,
      title,
      message,
      duration: options?.duration ?? 5000,
      action: options?.action
    };

    setToasts(prev => [...prev, toast]);

    // Auto remove after duration
    if (!options?.action) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((title: string, message: string, options?: { duration?: number; action?: Toast['action'] }) => {
    showToast('success', title, message, options);
  }, [showToast]);

  const warning = useCallback((title: string, message: string, options?: { duration?: number; action?: Toast['action'] }) => {
    showToast('warning', title, message, options);
  }, [showToast]);

  const error = useCallback((title: string, message: string, options?: { duration?: number; action?: Toast['action'] }) => {
    showToast('error', title, message, options);
  }, [showToast]);

  const info = useCallback((title: string, message: string, options?: { duration?: number; action?: Toast['action'] }) => {
    showToast('info', title, message, options);
  }, [showToast]);

  return (
    <>
      {/* Toast Context Provider */}
      <ToastContext.Provider value={{ success, warning, error, info }}>
        {children}
      </ToastContext.Provider>

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className="transform transition-transform duration-300"
            style={{
              transform: `translateY(${index * 8}px)`,
              zIndex: 50 - index
            }}
          >
            <NotificationToast
              isVisible={true}
              type={toast.type}
              title={toast.title}
              message={toast.message}
              duration={toast.duration}
              onClose={() => removeToast(toast.id)}
              action={toast.action}
            />
          </div>
        ))}
      </div>
    </>
  );
}

// Toast Context for easy access
import { createContext, useContext } from 'react';

interface ToastContextType {
  success: (title: string, message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) => void;
  warning: (title: string, message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) => void;
  error: (title: string, message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) => void;
  info: (title: string, message: string, options?: { duration?: number; action?: { label: string; onClick: () => void } }) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastManager');
  }
  return context;
};













