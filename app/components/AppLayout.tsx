'use client';

import React, { ReactNode, useState } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Separator } from '@/components/ui/separator';
import { LowStockBell } from './low-stock-bell';


interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actionButton?: ReactNode;
  headerExtra?: ReactNode;
}

export default function AppLayout({
  children,
  title = 'Dashboard',
  subtitle,
  actionButton,
  headerExtra,
}: AppLayoutProps) {
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-[var(--background)]">
        <header className="sticky top-0 z-20 flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-white/90 px-3 py-2 backdrop-blur-md sm:gap-3 sm:px-4">
          <SidebarTrigger className="-ml-1 shrink-0 text-muted-foreground hover:text-foreground" />
          <Separator orientation="vertical" className="mr-1 hidden h-5 sm:block" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {subtitle ? (
              <p className="hidden truncate text-xs text-muted-foreground sm:block">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
            <LowStockBell />
            {headerExtra}
            {mounted && actionButton}
          </div>
        </header>
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-hidden p-3 sm:p-4 md:p-6">
          <div className="mx-auto w-full min-w-0 max-w-[1400px]">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
