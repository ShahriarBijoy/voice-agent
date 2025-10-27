import AppSidebar from '@/components/app-sidebar';
import AppSidebarNav from '@/components/app-sidebar-nav';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar collapsible="dock" intent="inset" />
      <SidebarInset className="flex flex-col h-screen">
        <AppSidebarNav />
        <div className="flex-1 overflow-hidden p-6 lg:p-6 min-h-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
