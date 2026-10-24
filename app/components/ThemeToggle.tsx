'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="h-9 w-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-sm font-medium text-muted-foreground">
        Appearance
      </span>

      <div className="flex items-center bg-muted rounded-lg p-1 border">
        <button
          onClick={() => setTheme('light')}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            theme === 'light'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sun className="h-4 w-4" />
          Light
        </button>

        <button
          onClick={() => setTheme('system')}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            theme === 'system'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Monitor className="h-4 w-4" />
          System
        </button>

        <button
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            theme === 'dark'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Moon className="h-4 w-4" />
          Dark
        </button>
      </div>
    </div>
  );
}

