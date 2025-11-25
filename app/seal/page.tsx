import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SealKeySharePanel } from "@/components/seal/key-share-panel";

export default function SealPage() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col bg-background/50">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <div className="space-y-2 border-b border-primary/10 pb-6">
                <h1 className="text-3xl font-bold font-display tracking-wide text-primary glow-text">SEAL_ACCESS_PROTOCOL</h1>
                <p className="text-muted-foreground font-mono text-sm max-w-3xl">
                  Create a Seal session key from your wallet, encrypt data for another address,
                  and prove read-access through <code className="px-1 bg-primary/10 border border-primary/20 rounded text-primary">seal_approve</code>.
                </p>
              </div>
              <SealKeySharePanel />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
