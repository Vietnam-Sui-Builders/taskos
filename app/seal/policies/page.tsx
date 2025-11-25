import type React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SealPolicyManager } from "@/components/seal/policy-manager";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function SealPoliciesPage() {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">SEAL policies</h1>
                <p className="text-muted-foreground">
                  List, create, and manage SEAL policies (Private, Allowlist, Subscription) tied to Walrus blobs and experiences.
                </p>
              </div>
              <SealPolicyManager />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
