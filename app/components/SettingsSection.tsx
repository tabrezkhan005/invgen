'use client';

import { ReactNode } from 'react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  icon?: string;
}

export default function SettingsSection({
  title,
  description,
  children,
  icon
}: SettingsSectionProps) {
  return (
    <div className="card">
      <div className="flex items-start gap-3 mb-6">
        {icon && (
          <span className="text-2xl" role="img" aria-label={title}>
            {icon}
          </span>
        )}
        <div>
          <h3 className="text-heading-3 text-neutral-900">
            {title}
          </h3>
          {description && (
            <p className="text-body-sm text-neutral-600 mt-1">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}













