"use client"

import { usePathname } from "next/navigation"
import {
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline"
import { Avatar } from "@/components/ui/avatar"
import { Breadcrumbs, BreadcrumbsItem } from "@/components/ui/breadcrumbs"
import {
  Menu,
  MenuContent,
  MenuHeader,
  MenuItem,
  MenuLabel,
  MenuSection,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import { SidebarNav, SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AppSidebarNav() {
  const pathname = usePathname()
  
  const getBreadcrumbs = () => {
    if (pathname === "/history") {
      return (
        <>
          <BreadcrumbsItem href="/">Home</BreadcrumbsItem>
          <BreadcrumbsItem>History</BreadcrumbsItem>
        </>
      )
    }
    return (
      <>
        <BreadcrumbsItem href="/">Home</BreadcrumbsItem>
        <BreadcrumbsItem>Voice Chat</BreadcrumbsItem>
      </>
    )
  }

  return (
    <SidebarNav>
      <span className="flex items-center gap-x-4">
        <SidebarTrigger />
        <Breadcrumbs className="hidden md:flex">
          {getBreadcrumbs()}
        </Breadcrumbs>
      </span>
      <div className="flex items-center gap-2 ml-auto">
        <ThemeToggle />
        <UserMenu />
      </div>
    </SidebarNav>
  )
}

function UserMenu() {
  return (
    <Menu>
      <MenuTrigger className="ml-auto md:hidden" aria-label="Open Menu">
        <Avatar isSquare alt="user" src="https://intentui.com/images/avatar/cobain.jpg" />
      </MenuTrigger>
      <MenuContent popover={{ placement: "bottom end" }} className="min-w-64">
        <MenuSection>
          <MenuHeader separator>
            <span className="block">User</span>
            <span className="font-normal text-muted-fg">@user</span>
          </MenuHeader>
        </MenuSection>
        <MenuItem href="#dashboard">
          <Squares2X2Icon />
          <MenuLabel>Dashboard</MenuLabel>
        </MenuItem>
        <MenuItem href="#settings">
          <Cog6ToothIcon />
          <MenuLabel>Settings</MenuLabel>
        </MenuItem>
        <MenuSeparator />
        <MenuItem>
          <CommandLineIcon />
          <MenuLabel>Command Menu</MenuLabel>
        </MenuItem>
        <MenuSeparator />
        <MenuItem href="#contact-s">
          <MenuLabel>Contact Support</MenuLabel>
        </MenuItem>
        <MenuSeparator />
        <MenuItem href="#logout">
          <ArrowRightOnRectangleIcon />
          <MenuLabel>Log out</MenuLabel>
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}