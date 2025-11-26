"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const SELLER_ADDRESS = "0x34113ecfcf1c0547879eb474818f2433292221926f3776597354124150ab7989";
const DEFAULT_BUYER = "0x70b56e23fff713cc617cc8e14f3c947e9ee9ced42547fcd952b69df4bee32f70";

type PolicyType = 0 | 1 | 2;

interface PolicyItem {
  id: string;
  sealPolicyId: string;
  walrusBlobId: string;
  experienceId: string;
  allowlist: string[];
  policyType: PolicyType;
  experienceName?: string;
}

const POLICY_LABELS: Record<PolicyType, string> = {
  0: "Private",
  1: "Allowlist",
  2: "Subscription",
};

export default function SellerAllowlistPage() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buyerInput, setBuyerInput] = useState<Record<string, string>>({});
  const [statusByPolicy, setStatusByPolicy] = useState<Record<string, string>>({});

  const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
  const policyStruct = useMemo(() => {
    if (!packageId) return "";
    return `${packageId}::seal_integration::SEALPolicy`;
  }, [packageId]);

  const loadPolicies = async () => {
    if (!policyStruct) {
      setError("Set NEXT_PUBLIC_PACKAGE_ID to load policies");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const resp = await client.getOwnedObjects({
        owner: SELLER_ADDRESS,
        filter: { StructType: policyStruct },
        options: { showContent: true },
      });

      const baseItems: PolicyItem[] = [];
      resp.data.forEach((obj) => {
        const content: any = obj.data?.content;
        if (content?.dataType !== "moveObject") return;
        const fields = content.fields as Record<string, any>;
        baseItems.push({
          id: obj.data!.objectId,
          sealPolicyId: fields.seal_policy_id as string,
          walrusBlobId: fields.walrus_blob_id as string,
          experienceId: fields.experience_id as string,
          allowlist: (fields.allowlist as string[]) || [],
          policyType: fields.policy_type as PolicyType,
        });
      });

      // Fetch experience display name (if any)
      const withNames = await Promise.all(
        baseItems.map(async (item) => {
          try {
            const exp = await client.getObject({
              id: item.experienceId,
              options: { showDisplay: true },
            });
            const display = exp.data?.display?.data || {};
            const name =
              (display as any).name ||
              (display as any)["name#string"] ||
              (display as any).title ||
              (display as any)["title#string"] ||
              "";
            return { ...item, experienceName: name || undefined };
          } catch (e) {
            console.warn("Failed to fetch experience display", e);
            return item;
          }
        })
      );

      // Prefill buyer input with default buyer for convenience
      const defaults: Record<string, string> = {};
      withNames.forEach((p) => {
        defaults[p.id] = defaults[p.id] || DEFAULT_BUYER;
      });
      setBuyerInput((prev) => ({ ...defaults, ...prev }));
      setPolicies(withNames);
    } catch (err) {
      console.error("Failed to load policies", err);
      setError("Failed to load SEAL policies for seller");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyStruct]);

  const addToAllowlist = async (policyId: string, overrideAddress?: string) => {
    const buyer = (overrideAddress || buyerInput[policyId] || "").trim();
    if (!buyer) {
      setStatusByPolicy((prev) => ({ ...prev, [policyId]: "Enter buyer wallet" }));
      return;
    }
    if (!packageId || !policyStruct) {
      setStatusByPolicy((prev) => ({ ...prev, [policyId]: "Package ID missing" }));
      return;
    }
    if (!account?.address) {
      setStatusByPolicy((prev) => ({ ...prev, [policyId]: "Connect seller wallet" }));
      return;
    }
    if (account.address.toLowerCase() !== SELLER_ADDRESS.toLowerCase()) {
      setStatusByPolicy((prev) => ({ ...prev, [policyId]: "Wrong wallet (must be seller)" }));
      return;
    }

    try {
      setStatusByPolicy((prev) => ({ ...prev, [policyId]: "Submitting..." }));
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::seal_integration::add_to_allowlist`,
        arguments: [tx.object(policyId), tx.pure.address(buyer)],
      });
      const resp = await signAndExecuteTransaction({ transaction: tx });
      await client.waitForTransaction({ digest: resp.digest });
      setStatusByPolicy((prev) => ({ ...prev, [policyId]: "Buyer added" }));
      setBuyerInput((prev) => ({ ...prev, [policyId]: overrideAddress ? prev[policyId] : "" }));
      loadPolicies();
    } catch (err) {
      console.error("Allowlist update failed", err);
      setStatusByPolicy((prev) => ({ ...prev, [policyId]: "Failed to add" }));
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
                Seller Allowlist Panel
              </p>
              <h1 className="text-3xl md:text-4xl font-bold font-display tracking-wider text-primary glow-text">
                ADD BUYER TO SEAL ALLOWLIST
              </h1>
              <p className="text-sm text-muted-foreground font-mono">
                Seller wallet: <span className="text-foreground">{SELLER_ADDRESS}</span>
                {account?.address && account.address.toLowerCase() === SELLER_ADDRESS.toLowerCase()
                  ? " (connected)"
                  : " (connect this wallet to add buyers)"}
              </p>
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
                  LOADING_SEAL_POLICIES...
                </p>
              </div>
            )}

            {!isLoading && !error && policies.length === 0 && (
              <div className="bg-muted/30 border border-primary/10 p-10 rounded-lg text-center backdrop-blur-md">
                <p className="text-xl font-display text-primary mb-2">
                  NO_POLICIES_FOUND
                </p>
                <p className="text-sm font-mono text-muted-foreground">
                  Ensure the seller wallet owns SEALPolicy objects for your experiences.
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
                        {POLICY_LABELS[p.policyType]}
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
                    <div className="text-muted-foreground">Experience</div>
                    <div className="break-all">
                      {p.experienceName ? `${p.experienceName} (${p.experienceId})` : p.experienceId}
                    </div>
                    <div className="text-muted-foreground pt-2">Walrus Blob</div>
                    <div className="break-all">{p.walrusBlobId}</div>
                  </div>

                  {p.policyType === 1 ? (
                    <div className="space-y-2">
                      <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                        Allowlist
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(p.allowlist || []).length === 0 && (
                          <span className="text-[11px] text-muted-foreground">No addresses yet.</span>
                        )}
                        {(p.allowlist || []).map((addr) => (
                          <span
                            key={addr}
                            className="text-[11px] font-mono bg-primary/10 text-primary px-2 py-1 rounded"
                          >
                            {addr}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-col gap-2">
                        <input
                          className="w-full rounded-md border border-primary/20 bg-background/80 px-3 py-2 text-sm font-mono"
                          placeholder="Buyer wallet 0x..."
                          value={buyerInput[p.id] || ""}
                          onChange={(e) =>
                            setBuyerInput((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                        />
                        <button
                          className="px-3 py-2 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-mono text-xs uppercase tracking-wider"
                          onClick={() => addToAllowlist(p.id)}
                          disabled={statusByPolicy[p.id] === "Submitting..."}
                        >
                          {statusByPolicy[p.id] === "Submitting..." ? "SUBMITTING..." : "ADD_TO_ALLOWLIST"}
                        </button>
                        <button
                          className="px-3 py-2 rounded-md border border-primary/20 text-primary hover:bg-primary/10 transition-colors font-mono text-[11px] uppercase tracking-wider"
                          onClick={() => addToAllowlist(p.id, DEFAULT_BUYER)}
                          disabled={statusByPolicy[p.id] === "Submitting..."}
                        >
                          QUICK_ADD_DEFAULT_BUYER
                        </button>
                        {statusByPolicy[p.id] && (
                          <p className="text-[11px] font-mono text-muted-foreground">
                            {statusByPolicy[p.id]}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs font-mono text-muted-foreground">
                      This policy is not allowlist-based. Only allowlist policies can add buyers.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
