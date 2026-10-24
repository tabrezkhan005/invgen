'use client';

import { ReactNode } from 'react';

interface SettingFieldProps {
  label: string;
  helpText?: string;
  required?: boolean;
  pinProtected?: boolean;
  children: ReactNode;
  error?: string;
}

export default function SettingField({
  label,
  helpText,
  required = false,
  pinProtected = false,
  children,
  error
}: SettingFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="block text-body-sm font-semibold text-neutral-800">
          {label}
          {required && <span className="text-danger-600 ml-1">*</span>}
        </label>
        {pinProtected && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium bg-warning-100 text-warning-800">
            🔒 PIN Required
          </span>
        )}
      </div>

      <div className="space-y-1">
        {children}
        {helpText && (
          <p className="text-caption text-neutral-500">
            {helpText}
          </p>
        )}
        {error && (
          <p className="text-caption text-danger-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}













