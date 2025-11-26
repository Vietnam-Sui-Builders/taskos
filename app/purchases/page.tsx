"use client";

import React, { useMemo, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AccessDataModal } from "@/components/marketplace";
import { Experience } from "@/components/marketplace/types";
import { usePurchasedExperiences } from "@/hooks/use-purchased-experiences";

const FALLBACK_WALLET = "0x70b56e23fff713cc617cc8e14f3c947e9ee9ced42547fcd952b69df4bee32f70";

export default function PurchasesPage() {
  const currentAccount = useCurrentAccount();
  const walletAddress = currentAccount?.address || FALLBACK_WALLET;
  const {
    purchases,
    isLoading,
    error,
    refetch,
  } = usePurchasedExperiences(walletAddress);

  const [selected, setSelected] = useState<Experience | null>(null);

  const licenseLabel = (licenseType: number) => {
    switch (licenseType) {
      case 0:
        return "personal";
      case 1:
        return "commercial";
      case 2:
        return "ai_training";
      default:
        return `license_${licenseType}`;
    }
  };

  const isUsingFallback = useMemo(
    () => !currentAccount?.address && walletAddress === FALLBACK_WALLET,
    [currentAccount?.address, walletAddress]
  );

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

          <main className="flex-1 relative z-10 p-4 md:p-6 lg:p-8 space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  Purchases
                </p>
                <h1 className="text-3xl md:text-4xl font-bold font-display tracking-wider text-primary glow-text">
                  MY_PURCHASED_EXPERIENCES
                </h1>
                <p className="text-sm text-muted-foreground font-mono">
                  Wallet: <span className="text-foreground">{walletAddress}</span>
                  {isUsingFallback && " (fallback while wallet is disconnected)"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-4 py-2 rounded-md border border-primary/20 text-primary hover:bg-primary/10 transition-colors font-mono text-xs uppercase tracking-wider"
                  onClick={refetch}
                >
                  ↻ Refresh
                </button>
              </div>
            </header>

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="font-mono text-primary/80 tracking-widest">
                  FETCHING_PURCHASES...
                </p>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg font-mono text-sm">
                {error}
              </div>
            )}

            {!isLoading && !error && purchases.length === 0 && (
              <div className="bg-muted/30 border border-primary/10 p-10 rounded-lg text-center backdrop-blur-md">
                <p className="text-xl font-display text-primary mb-2">
                  NO_PURCHASES_FOUND
                </p>
                <p className="text-sm font-mono text-muted-foreground">
                  Buy an experience on the marketplace to see it here.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {purchases.map((purchase) => (
                <div
                  key={purchase.purchaseId}
                  className="border border-primary/10 rounded-lg bg-card/60 backdrop-blur-md p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                        {licenseLabel(purchase.licenseType)}
                      </p>
                      <h3 className="text-xl font-display font-bold text-foreground">
                        {purchase.skill}
                      </h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        Domain: {purchase.domain} · Difficulty {purchase.difficulty}/5
                      </p>
                    </div>
                    <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                      #{purchase.purchaseId.slice(0, 6)}...
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm font-mono">
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase tracking-wider text-xs">
                        Price Paid
                      </p>
                      <p className="text-foreground">{(purchase.pricePaid / 1e9).toFixed(3)} SUI</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase tracking-wider text-xs">
                        Quality
                      </p>
                      <p className="text-primary">{purchase.quality_score}/100</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase tracking-wider text-xs">
                        Seller
                      </p>
                      <p className="truncate">{purchase.seller}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground uppercase tracking-wider text-xs">
                        Purchased
                      </p>
                      <p>Epoch #{purchase.purchasedAt}</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {purchase.description || "No description provided."}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono text-muted-foreground">
                      Rating: {purchase.rating.toFixed(1)} · Sold: {purchase.soldCount}
                    </div>
                    <button
                      className="px-3 py-2 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-mono text-xs uppercase tracking-wider"
                      onClick={() => setSelected(purchase)}
                    >
                      Access Data
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </SidebarInset>
      {selected && (
        <AccessDataModal
          experience={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </SidebarProvider>
  );
}
