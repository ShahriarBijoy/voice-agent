"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AppSidebarNav() {
  const pathname = usePathname()
  
  const getBreadcrumbs = () => {
    if (pathname === "/history") {
      return (
        <>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Conversation</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>History</BreadcrumbPage>
          </BreadcrumbItem>
        </>
      )
    }
    if (pathname === "/calendar") {
      return (
        <>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Conversation</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Calendar</BreadcrumbPage>
          </BreadcrumbItem>
        </>
      )
    }
    if (pathname?.startsWith("/agents")) {
      return (
        <>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Conversation</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Agent Builder</BreadcrumbPage>
          </BreadcrumbItem>
        </>
      )
    }
    return (
      <>
        <BreadcrumbItem>
          <BreadcrumbPage>Conversation</BreadcrumbPage>
        </BreadcrumbItem>
      </>
    )
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {getBreadcrumbs()}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="ml-auto px-4">
        <ThemeToggle />
      </div>
    </header>
  )
}