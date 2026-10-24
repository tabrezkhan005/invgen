'use client';

import { ReactNode } from 'react';

interface AppHeaderProps {
  title: string;
  actionButton?: ReactNode;
  subtitle?: string;
}

export default function AppHeader({ title, actionButton, subtitle }: AppHeaderProps) {
  return (
    <header className="bg-white border-b border-neutral-200 px-8 py-6">
      <div className="flex-between">
        <div>
          <h1 className="text-heading-1 text-neutral-900 mb-1">
            {title}
          </h1>
          {subtitle && (
            <p className="text-body text-neutral-600">
              {subtitle}
            </p>
          )}
        </div>

        {actionButton && (
          <div className="flex items-center gap-3">
            {actionButton}
          </div>
        )}
      </div>
    </header>
  );
}













