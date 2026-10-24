"use client"

import { type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    description?: string
    badge?: string | null
    isActive?: boolean
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={item.isActive}
                tooltip={`${item.title}${item.description ? ` - ${item.description}` : ''}`}
                className="group relative h-12"
              >
                <a href={item.url} className="flex items-center gap-3 w-full">
                  {item.icon && (
                    <item.icon className="size-5 text-sidebar-foreground/70 group-hover:text-sidebar-foreground transition-colors" />
                  )}
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="truncate text-sidebar-foreground font-medium">
                      {item.title}
                    </span>
                    {item.badge && (
                      <Badge
                        variant="secondary"
                        className="ml-2 h-5 px-1.5 text-xs bg-primary/10 text-primary border-primary/20"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
