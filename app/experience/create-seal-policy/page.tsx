"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { CreateSealPolicyForm } from "@/components/seal/create-seal-policy-form";
import { useRouter } from "next/navigation";

export default function CreateSealPolicyPage() {
  const router = useRouter();

  const handleSuccess = () => {
    // Redirect to policies list or experience page
    router.push("/seller/policies");
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "18rem",
          "--header-height": "3rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col bg-background selection:bg-primary/20 selection:text-primary overflow-x-hidden relative">
          <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background opacity-70" />
            <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-primary/5 to-transparent" />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>

          <main className="flex-1 relative z-10 p-4 md:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto w-full">
            <header className="space-y-2 mb-8">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                Experience Management
              </p>
              <h1 className="text-3xl md:text-4xl font-bold font-display tracking-wider text-primary glow-text">
                Create SEAL Policy
              </h1>
              <p className="text-sm text-muted-foreground">
                Define access control for your experience data using SEAL.
              </p>
            </header>

            <CreateSealPolicyForm onSuccess={handleSuccess} />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
