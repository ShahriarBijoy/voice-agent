import { VoiceChat } from '@/components/VoiceChat';
import AppSidebar from '@/components/app-sidebar';
import AppSidebarNav from '@/components/app-sidebar-nav';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default function Home() {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar collapsible="dock" intent="inset" />
      <SidebarInset className="flex h-[98vh] flex-col overflow-hidden">
        <AppSidebarNav />
        <div className="min-h-0 flex-1 overflow-hidden p-4 lg:p-6">
          <VoiceChat />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
