"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const SELLER_ADDRESS = "0x34113ecfcf1c0547879eb474818f2433292221926f3776597354124150ab7989";

interface PolicyItem {
  id: string;
  sealPolicyId: string;
  walrusBlobId: string;
  experienceId: string;
  policyType: number;
  owner: string;
}

export default function SellerPoliciesPage() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;

  const policyStruct = useMemo(() => {
    if (!packageId) return "";
    return `${packageId}::seal_integration::SEALPolicy`;
  }, [packageId]);

  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPolicies = async () => {
    if (!account?.address) {
      setError("Connect wallet to view SEAL policies.");
      setPolicies([]);
      return;
    }
    if (!policyStruct) {
      setError("Set NEXT_PUBLIC_PACKAGE_ID to query SEAL policies.");
      setPolicies([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const resp = await client.getOwnedObjects({
        owner: account.address,
        filter: { StructType: policyStruct },
        options: { showContent: true },
      });

      const items: PolicyItem[] = [];
      resp.data.forEach((obj) => {
        const content: any = obj.data?.content;
        if (content?.dataType !== "moveObject") return;
        const fields = content.fields as Record<string, any>;
        items.push({
          id: obj.data!.objectId,
          sealPolicyId: fields.seal_policy_id as string,
          walrusBlobId: fields.walrus_blob_id as string,
          experienceId: fields.experience_id as string,
          policyType: Number(fields.policy_type),
          owner: account.address,
        });
      });

      setPolicies(items);
    } catch (err) {
      console.error("Failed to load policies", err);
      setError("Failed to load SEAL policies");
      setPolicies([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address, policyStruct]);

  const walletMismatch =
    account?.address && account.address.toLowerCase() !== SELLER_ADDRESS.toLowerCase();

  const policyTypeLabel = (type: number) => {
    switch (type) {
      case 0:
        return "Private";
      case 1:
        return "Allowlist";
      case 2:
        return "Subscription";
      default:
        return `Unknown (${type})`;
    }
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

          <main className="flex-1 relative z-10 p-4 md:p-6 lg:p-8 space-y-6">
            <header className="space-y-2">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                Seller Policy Audit
              </p>
              <h1 className="text-3xl md:text-4xl font-bold font-display tracking-wider text-primary glow-text">
                SEAL POLICIES (STRUCT TYPE CHECK)
              </h1>
              <p className="text-sm font-mono text-muted-foreground">
                Expected StructType:{" "}
                {policyStruct ? (
                  <span className="text-foreground">{policyStruct}</span>
                ) : (
                  "Set NEXT_PUBLIC_PACKAGE_ID"
                )}
              </p>
              <p className="text-sm font-mono text-muted-foreground">
                Seller wallet: <span className="text-foreground">{SELLER_ADDRESS}</span>{" "}
                {walletMismatch
                  ? "(connected wallet does not match seller)"
                  : account?.address
                  ? "(connected)"
                  : "(not connected)"}
              </p>
              <div className="flex gap-2">
                <button
                  className="px-3 py-2 rounded-md border border-primary/20 text-primary hover:bg-primary/10 transition-colors font-mono text-xs uppercase tracking-wider"
                  onClick={loadPolicies}
                >
                  Refresh
                </button>
              </div>
            </header>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg font-mono text-sm">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="font-mono text-primary/80 tracking-widest">
                  LOADING_POLICIES...
                </p>
              </div>
            )}

            {!isLoading && !error && policies.length === 0 && (
              <div className="bg-muted/30 border border-primary/10 p-10 rounded-lg text-center backdrop-blur-md">
                <p className="text-xl font-display text-primary mb-2">
                  NO_POLICIES_FOUND
                </p>
                <p className="text-sm font-mono text-muted-foreground">
                  Ensure the connected wallet owns SEALPolicy objects for this package.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {policies.map((p) => (
                <div
                  key={p.id}
                  className="border border-primary/10 rounded-lg bg-card/60 backdrop-blur-md p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                        {policyTypeLabel(p.policyType)}
                      </p>
                      <h3 className="text-lg font-display font-bold text-foreground">
                        Policy #{p.sealPolicyId.slice(0, 6)}...
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                      {p.id.slice(0, 6)}...
                    </span>
                  </div>

                  <div className="text-xs font-mono space-y-1">
                    <div className="text-muted-foreground">Owner</div>
                    <div className="break-all">{p.owner}</div>
                    <div className="text-muted-foreground pt-2">Experience</div>
                    <div className="break-all">{p.experienceId}</div>
                    <div className="text-muted-foreground pt-2">Walrus Blob</div>
                    <div className="break-all">{p.walrusBlobId}</div>
                    <div className="text-muted-foreground pt-2">SEAL Policy ID</div>
                    <div className="break-all">{p.sealPolicyId}</div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
