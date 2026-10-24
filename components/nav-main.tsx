"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    badge?: number
  }[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup className="px-2 py-1">
      <SidebarMenu className="gap-1">
        {items.map((item) => {
          const active =
            item.url === "/"
              ? pathname === "/"
              : pathname === item.url || pathname.startsWith(`${item.url}/`)

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={active}
                tooltip={item.title}
                className={cn(
                  "h-10 rounded-lg px-3 text-[13px] font-medium transition-colors",
                  active
                    ? "!bg-[var(--sidebar-primary)] !text-white hover:!bg-[var(--sidebar-primary)]"
                    : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
                )}
              >
                <Link href={item.url} className="flex w-full items-center gap-2">
                  {item.icon && <item.icon className="size-4 shrink-0" />}
                  <span className="flex-1 truncate">{item.title}</span>
                  {item.badge != null && item.badge > 0 ? (
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white group-data-[collapsible=icon]:hidden">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
