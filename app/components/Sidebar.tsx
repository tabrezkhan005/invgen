'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navigationItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/billing', label: 'Billing', icon: '💰' },
  { href: '/products', label: 'Products', icon: '📦' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Reset focus when pathname changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [pathname]);

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % navigationItems.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + navigationItems.length) % navigationItems.length);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        // Navigation will happen via Link component
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(navigationItems.length - 1);
        break;
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-neutral-100 border-r border-neutral-200 flex flex-col">
      {/* Logo/Brand */}
      <div className="h-16 flex items-center px-6 border-b border-neutral-200">
        <h1 className="text-heading-2 text-neutral-800 font-semibold">
          INV Generate
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6" role="navigation" aria-label="Main navigation">
        <ul className="space-y-2" role="menubar">
          {navigationItems.map((item, index) => {
            const isActive = pathname === item.href;
            const isFocused = focusedIndex === index;

            return (
              <li key={item.href} role="none">
                <Link
                  href={item.href}
                  className={`
                    group flex items-center px-4 py-3 rounded-lg transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-100
                    ${isActive
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900'
                    }
                    ${isFocused ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-neutral-100' : ''}
                  `}
                  role="menuitem"
                  tabIndex={0}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span
                    className="text-lg mr-3 transition-transform group-hover:scale-110"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <span className="text-body font-medium">
                    {item.label}
                  </span>
                  {isActive && (
                    <span
                      className="ml-auto w-2 h-2 bg-white rounded-full"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-neutral-200">
        <div className="text-caption text-neutral-500 text-center">
          v1.0.0
        </div>
      </div>
    </aside>
  );
}
