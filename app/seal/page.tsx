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
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Seal access sharing</h1>
                <p className="text-muted-foreground">
                  Create a Seal session key from your wallet, encrypt data for another address,
                  and prove read-access through <code className="px-1">seal_approve</code>.
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
