"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { handleTransactionError } from "@/lib/errorHandling";
import { CreateSealPolicyForm } from "./create-seal-policy-form";

type PolicyType = 0 | 1 | 2;

interface PolicyItem {
  id: string;
  policyType: PolicyType;
  walrusBlobId: string;
  sealPolicyId: string;
  allowlist: string[];
  experienceId: string;
}

const POLICY_LABELS: Record<PolicyType, string> = {
  0: "Private",
  1: "Allowlist",
  2: "Subscription",
};

export function SealPolicyManager() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [allowlistInput, setAllowlistInput] = useState<Record<string, string>>({});
  const [subscriptionInput, setSubscriptionInput] = useState<Record<string, string>>({});

  const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;

  const policyStruct = useMemo(() => {
    if (!packageId) return "";
    return `${packageId}::seal_integration::SEALPolicy`;
  }, [packageId]);

  const loadPolicies = async () => {
    if (!account?.address || !policyStruct) return;
    setIsLoading(true);
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
          policyType: fields.policy_type as PolicyType,
          walrusBlobId: fields.walrus_blob_id as string,
          sealPolicyId: fields.seal_policy_id as string,
          allowlist: (fields.allowlist as string[]) || [],
          experienceId: fields.experience_id as string,
        });
      });

      setPolicies(items);
    } catch (error) {
      console.error("Failed to load policies", error);
      handleTransactionError(error, "Failed to load SEAL policies");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address, policyStruct]);



  const handleAddAllowlist = async (policyId: string) => {
    const addr = allowlistInput[policyId]?.trim();
    if (!addr) {
      toast.error("Address required", { description: "Enter a wallet to add to allowlist" });
      return;
    }
    if (!packageId) {
      toast.error("Package ID missing", { description: "Set NEXT_PUBLIC_PACKAGE_ID" });
      return;
    }
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::seal_integration::add_to_allowlist`,
        arguments: [tx.object(policyId), tx.pure.address(addr)],
      });
      const resp = await signAndExecuteTransaction({ transaction: tx });
      await client.waitForTransaction({ digest: resp.digest });
      toast.success("Allowlist updated", { description: addr });
      loadPolicies();
    } catch (error) {
      console.error("Failed to add allowlist", error);
      handleTransactionError(error, "Failed to update allowlist");
    }
  };

  const handleRemoveAllowlist = async (policyId: string, addressToRemove: string) => {
    if (!packageId) {
      toast.error("Package ID missing", { description: "Set NEXT_PUBLIC_PACKAGE_ID" });
      return;
    }
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::seal_integration::remove_from_allowlist`,
        arguments: [tx.object(policyId), tx.pure.address(addressToRemove)],
      });
      const resp = await signAndExecuteTransaction({ transaction: tx });
      await client.waitForTransaction({ digest: resp.digest });
      toast.success("Removed from allowlist", { description: addressToRemove });
      loadPolicies();
    } catch (error) {
      console.error("Failed to remove allowlist", error);
      handleTransactionError(error, "Failed to update allowlist");
    }
  };

  const handleSetSubscription = async (policyId: string) => {
    const subId = subscriptionInput[policyId]?.trim();
    if (!subId) {
      toast.error("Subscription object ID required");
      return;
    }
    if (!packageId) {
      toast.error("Package ID missing", { description: "Set NEXT_PUBLIC_PACKAGE_ID" });
      return;
    }
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::seal_integration::set_subscription_product`,
        arguments: [tx.object(policyId), tx.object(subId)],
      });
      const resp = await signAndExecuteTransaction({ transaction: tx });
      await client.waitForTransaction({ digest: resp.digest });
      toast.success("Subscription product set", { description: subId });
      loadPolicies();
    } catch (error) {
      console.error("Failed to set subscription", error);
      handleTransactionError(error, "Failed to set subscription product");
    }
  };

  const handleDelete = () => {
    toast.error("Delete not supported", {
      description: "SEALPolicy objects are shared; on-chain delete is not available yet.",
    });
  };

  return (
    <div className="space-y-6">
      <CreateSealPolicyForm onSuccess={loadPolicies} />

      <Card>
        <CardHeader>
          <CardTitle>SEAL Policies</CardTitle>
          <CardDescription>List and manage your SEALPolicy objects.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading policies...</p>
          ) : policies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No SEAL policies found for this wallet.</p>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-4">
                {policies.map((p) => (
                  <div key={p.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{POLICY_LABELS[p.policyType]}</Badge>
                      <code className="text-xs font-mono break-all flex-1">{p.id}</code>
                      <Button size="sm" variant="outline" onClick={handleDelete}>Delete</Button>
                    </div>
                    <Separator className="my-2" />
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <span className="font-semibold">Experience:</span>
                        <div className="font-mono text-xs break-all">{p.experienceId}</div>
                      </div>
                      <div>
                        <span className="font-semibold">SEAL Policy ID:</span>
                        <div className="font-mono text-xs break-all">{p.sealPolicyId}</div>
                      </div>
                      <div>
                        <span className="font-semibold">Walrus Blob:</span>
                        <div className="font-mono text-xs break-all">{p.walrusBlobId}</div>
                      </div>
                    </div>

                    {p.policyType === 1 && (
                      <div className="mt-3 space-y-2">
                        <Label>Allowlist</Label>
                        <div className="flex flex-wrap gap-2">
                          {(p.allowlist || []).length === 0 && (
                            <span className="text-xs text-muted-foreground">No addresses yet.</span>
                          )}
                          {(p.allowlist || []).map((addr) => (
                            <Badge key={addr} variant="outline" className="flex items-center gap-2">
                              <span className="font-mono text-[11px]">{addr}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveAllowlist(p.id, addr)}
                              >
                                Remove
                              </Button>
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            placeholder="0x..."
                            value={allowlistInput[p.id] || ""}
                            onChange={(e) => setAllowlistInput({ ...allowlistInput, [p.id]: e.target.value })}
                          />
                          <Button onClick={() => handleAddAllowlist(p.id)}>Add to Allowlist</Button>
                        </div>
                      </div>
                    )}

                    {p.policyType === 2 && (
                      <div className="mt-3 space-y-2">
                        <Label>Subscription Product ID</Label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            placeholder="subscription object id"
                            value={subscriptionInput[p.id] || ""}
                            onChange={(e) => setSubscriptionInput({ ...subscriptionInput, [p.id]: e.target.value })}
                          />
                          <Button onClick={() => handleSetSubscription(p.id)}>Set subscription</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

