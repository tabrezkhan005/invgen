"use client"

import * as React from "react"
import Link from "next/link"
import {
  Receipt,
  FileText,
  Package,
  Warehouse,
  Settings2,
  BarChart3,
  PieChart,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"

const navMain = [
  { title: "Create Invoice", url: "/billing", icon: Receipt },
  { title: "Invoices", url: "/invoices", icon: FileText },
  { title: "Products", url: "/products", icon: Package },
  { title: "Inventory", url: "/inventory", icon: Warehouse },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Reports", url: "/reports", icon: PieChart },
  { title: "Settings", url: "/settings", icon: Settings2 },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-[var(--sidebar-border)] !bg-[var(--sidebar)] text-[var(--sidebar-foreground)]"
      {...props}
    >
      <SidebarHeader className="border-b border-[var(--sidebar-border)] px-4 py-5">
        <Link href="/billing" className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--sidebar-primary)] text-white shadow-sm">
            <Receipt className="size-4" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-[15px] font-bold tracking-tight text-white">
              AMGOLD
            </p>
            <p className="truncate text-[11px] text-[var(--sidebar-muted)]">
              Offline billing
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="pt-3">
        <NavMain items={navMain} />
      </SidebarContent>

      <SidebarFooter className="border-t border-[var(--sidebar-border)] p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-accent)] text-xs font-bold text-white">
            A
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold text-white">AMGOLD</p>
            <p className="truncate text-[11px] text-[var(--sidebar-muted)]">
              Administrator
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
