import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { WalrusUpload } from "@/components/walrus-upload";

export default function WalrusPage() {
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
              <div className="border-b border-primary/10 pb-6">
                <h1 className="text-3xl font-bold font-display tracking-wide text-primary glow-text">
                  WALRUS_STORAGE_GRID
                </h1>
                <p className="text-muted-foreground mt-2 font-mono text-sm max-w-3xl">
                  Upload files to Walrus decentralized storage network and
                  receive a blob ID for retrieval.
                </p>
              </div>

              <WalrusUpload />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
