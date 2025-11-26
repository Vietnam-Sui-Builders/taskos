"use client";

import { useState, useEffect, useMemo } from "react";
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
import { handleTransactionError } from "@/lib/errorHandling";
import { Loader2 } from "lucide-react";

type PolicyType = 0 | 1 | 2;

interface CreateSealPolicyFormProps {
  onSuccess?: () => void;
}

interface ExperienceItem {
  id: string;
  skill: string;
  domain: string;
}

export function CreateSealPolicyForm({ onSuccess }: CreateSealPolicyFormProps) {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [isCreating, setIsCreating] = useState(false);
  const [newExperienceId, setNewExperienceId] = useState("");
  const [newPolicyType, setNewPolicyType] = useState<PolicyType>(0);
  const [newWalrusBlobId, setNewWalrusBlobId] = useState("");
  const [newSealPolicyId, setNewSealPolicyId] = useState("");
  const [experiences, setExperiences] = useState<ExperienceItem[]>([]);
  const [isLoadingExperiences, setIsLoadingExperiences] = useState(false);

  const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;

  const experienceStruct = useMemo(() => {
    if (!packageId) return "";
    return `${packageId}::experience::Experience`;
  }, [packageId]);

  // Fetch experiences owned by the wallet
  useEffect(() => {
    const fetchExperiences = async () => {
      if (!account?.address || !packageId) {
        setExperiences([]);
        return;
      }

      setIsLoadingExperiences(true);
      try {
        // Query for ExperienceMinted events created by this wallet
        const events = await client.queryEvents({
          query: {
            MoveEventType: `${packageId}::experience::ExperienceMinted`,
          },
          limit: 100,
          order: "descending",
        });

        // Filter events by creator
        const userEvents = events.data.filter((event) => {
          const parsed = event.parsedJson as { creator?: string };
          return parsed?.creator?.toLowerCase() === account.address.toLowerCase();
        });

        const items: ExperienceItem[] = [];
        
        // Fetch each experience object
        for (const event of userEvents) {
          try {
            const eventData = event.parsedJson as {
              experience_id?: string;
            };

            const experienceId = eventData.experience_id;
            if (!experienceId) continue;

            // Fetch the experience object
            const expObj = await client.getObject({
              id: experienceId,
              options: { showContent: true },
            });

            const content: any = expObj.data?.content;
            if (content?.dataType !== "moveObject") continue;
            const fields = content.fields as Record<string, any>;

            items.push({
              id: experienceId,
              skill: String(fields.skill || "Unknown"),
              domain: String(fields.domain || "General"),
            });
          } catch (err) {
            console.warn("Failed to fetch experience:", err);
          }
        }

        setExperiences(items);
      } catch (error) {
        console.error("Failed to load experiences", error);
        toast.error("Failed to load experiences from wallet");
      } finally {
        setIsLoadingExperiences(false);
      }
    };

    fetchExperiences();
  }, [account?.address, client, packageId]);

  const handleCreate = async () => {
    if (!account) {
      toast.error("Connect wallet to create policy");
      return;
    }
    if (!packageId) {
      toast.error("Package ID missing", { description: "Set NEXT_PUBLIC_PACKAGE_ID" });
      return;
    }
    if (!newExperienceId.trim() || !newWalrusBlobId.trim() || !newSealPolicyId.trim()) {
      toast.error("All fields are required", {
        description: "Experience ID, Walrus blob ID, and SEAL policy ID are mandatory",
      });
      return;
    }

    setIsCreating(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::seal_integration::create_seal_policy`,
        arguments: [
          tx.object(newExperienceId.trim()),
          tx.pure.u8(newPolicyType),
          tx.pure.string(newWalrusBlobId.trim()),
          tx.pure.string(newSealPolicyId.trim()),
        ],
      });

      const resp = await signAndExecuteTransaction({ transaction: tx });
      await client.waitForTransaction({ digest: resp.digest });
      toast.success("SEAL policy created", { description: newSealPolicyId });
      setNewExperienceId("");
      setNewWalrusBlobId("");
      setNewSealPolicyId("");
      setNewPolicyType(0);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Create policy failed", error);
      handleTransactionError(error, "Failed to create SEAL policy");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create SEAL Policy</CardTitle>
        <CardDescription>
          Mint a policy and register it with your Walrus blob and SEAL policy ID. Supports Private, Allowlist, and Subscription patterns.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Experience ID</Label>
          {isLoadingExperiences ? (
            <div className="flex items-center gap-2 w-full rounded-md border px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading experiences...</span>
            </div>
          ) : experiences.length === 0 ? (
            <div className="w-full rounded-md border px-3 py-2 text-sm text-muted-foreground">
              No experiences found in wallet
            </div>
          ) : (
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={newExperienceId}
              onChange={(e) => setNewExperienceId(e.target.value)}
            >
              <option value="">Select an experience...</option>
              {experiences.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.skill} ({exp.domain}) - {exp.id.slice(0, 8)}...
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="space-y-2">
          <Label>Policy Type</Label>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={newPolicyType}
            onChange={(e) => setNewPolicyType(Number(e.target.value) as PolicyType)}
          >
            <option value={0}>Private</option>
            <option value={1}>Allowlist</option>
            <option value={2}>Subscription</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Walrus Blob ID</Label>
          <Input value={newWalrusBlobId} onChange={(e) => setNewWalrusBlobId(e.target.value)} placeholder="blob_id" />
        </div>
        <div className="space-y-2">
          <Label>SEAL Policy ID</Label>
          <Input value={newSealPolicyId} onChange={(e) => setNewSealPolicyId(e.target.value)} placeholder="seal_policy_id" />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button onClick={handleCreate} disabled={isCreating} className="w-full md:w-auto">
            {isCreating ? "Creating..." : "Create Policy"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
