"use client"

import {
  ChevronUpDownIcon,
} from "@heroicons/react/24/outline"
import {
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightSolid,
  ClockIcon as ClockSolid,
  Cog6ToothIcon as Cog6ToothSolid,
  DocumentTextIcon as DocumentTextSolid,
  HomeIcon as HomeSolid,
  LifebuoyIcon as LifebuoySolid,
  ArchiveBoxIcon as ArchiveBoxSolid,
  QuestionMarkCircleIcon as QuestionMarkCircleSolid,
  ArrowLeftStartOnRectangleIcon as ArrowRightOnRectangleSolid,
} from "@heroicons/react/24/solid"
import { Avatar } from "@/components/ui/avatar"
import { Link } from "@/components/ui/link"
import {
  Menu,
  MenuContent,
  MenuHeader,
  MenuItem,
  MenuSection,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import {
  Sidebar,
  SidebarContent,
  SidebarDisclosure,
  SidebarDisclosureGroup,
  SidebarDisclosurePanel,
  SidebarDisclosureTrigger,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarLink,
  SidebarRail,
  SidebarSection,
  SidebarSectionGroup,
} from "@/components/ui/sidebar"

export default function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-x-2">
          <Avatar
            isSquare
            size="sm"
            className="outline-hidden"
            src="https://design.intentui.com/logo?color=155DFC"
          />
          <SidebarLabel className="font-medium">
            Voice <span className="text-muted-fg">Agent</span>
          </SidebarLabel>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarSectionGroup>
          <SidebarSection label="Main">
            <SidebarItem tooltip="Home" isCurrent href="#">
              <HomeSolid />
              <SidebarLabel>Home</SidebarLabel>
            </SidebarItem>

            <SidebarItem tooltip="Current Conversation" href="#">
              <ChatBubbleLeftRightSolid />
              <SidebarLabel>Conversation</SidebarLabel>
            </SidebarItem>
          </SidebarSection>

          <SidebarDisclosureGroup defaultExpandedKeys={[1]}>
            <SidebarDisclosure id={1}>
              <SidebarDisclosureTrigger>
                <ClockSolid />
                <SidebarLabel>History</SidebarLabel>
              </SidebarDisclosureTrigger>
              <SidebarDisclosurePanel>
                <SidebarItem href="#" tooltip="Recent">
                  <ClockSolid />
                  <SidebarLabel>Recent</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="#" tooltip="Archived">
                  <ArchiveBoxSolid />
                  <SidebarLabel>Archived</SidebarLabel>
                </SidebarItem>
              </SidebarDisclosurePanel>
            </SidebarDisclosure>
            <SidebarDisclosure id={2}>
              <SidebarDisclosureTrigger>
                <DocumentTextSolid />
                <SidebarLabel>Documentation</SidebarLabel>
              </SidebarDisclosureTrigger>
              <SidebarDisclosurePanel>
                <SidebarItem href="#" tooltip="API Reference">
                  <SidebarLabel>API Reference</SidebarLabel>
                </SidebarItem>
                <SidebarItem href="#" tooltip="FAQ">
                  <QuestionMarkCircleSolid />
                  <SidebarLabel>FAQ</SidebarLabel>
                </SidebarItem>
              </SidebarDisclosurePanel>
            </SidebarDisclosure>
          </SidebarDisclosureGroup>
        </SidebarSectionGroup>
      </SidebarContent>

      <SidebarFooter className="flex flex-row justify-between gap-4 group-data-[state=collapsed]:flex-col">
        <Menu>
          <MenuTrigger className="flex w-full items-center justify-between" aria-label="Profile">
            <div className="flex items-center gap-x-2">
              <Avatar
                className="size-8 *:size-8 group-data-[state=collapsed]:size-6 group-data-[state=collapsed]:*:size-6"
                isSquare
                src="https://intentui.com/images/avatar/cobain.jpg"
              />

              <div className="in-data-[collapsible=dock]:hidden text-sm">
                <SidebarLabel>User</SidebarLabel>
                <span className="-mt-0.5 block text-muted-fg">user@domain.com</span>
              </div>
            </div>
            <ChevronUpDownIcon data-slot="chevron" />
          </MenuTrigger>
          <MenuContent
            className="in-data-[sidebar-collapsible=collapsed]:min-w-56 min-w-(--trigger-width)"
            placement="bottom right"
          >
            <MenuSection>
              <MenuHeader separator>
                <span className="block">User</span>
                <span className="font-normal text-muted-fg">@user</span>
              </MenuHeader>
            </MenuSection>

            <MenuItem href="#dashboard">
              <HomeSolid />
              Dashboard
            </MenuItem>
            <MenuItem href="#settings">
              <Cog6ToothSolid />
              Settings
            </MenuItem>
            <MenuSeparator />

            <MenuItem href="#contact">
              <LifebuoySolid />
              Support
            </MenuItem>
            <MenuSeparator />
            <MenuItem href="#logout">
              <ArrowRightOnRectangleSolid />
              Log out
            </MenuItem>
          </MenuContent>
        </Menu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}