"use client";

import { useMemo, useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { handleTransactionError } from "@/lib/errorHandling";

type LicenseOption = "personal" | "commercial" | "exclusive" | "subscription" | "view_only";
type PolicyOption = "private" | "allowlist" | "subscription";

const LICENSE_TO_U8: Record<LicenseOption, number> = {
  personal: 0,
  commercial: 1,
  exclusive: 2,
  subscription: 3,
  view_only: 4,
};

const POLICY_TO_U8: Record<PolicyOption, number> = {
  private: 0,
  allowlist: 1,
  subscription: 2,
};

interface TaskExperienceProps {
  taskId: string;
}

export function TaskExperience({ taskId }: TaskExperienceProps) {
  const [skill, setSkill] = useState("New Experience");
  const [domain, setDomain] = useState("General");
  const [difficulty, setDifficulty] = useState(3);
  const [timeSpent, setTimeSpent] = useState(3600);
  const [qualityScore, setQualityScore] = useState(80);
  const [sealPolicyId, setSealPolicyId] = useState("");
  const [policyType, setPolicyType] = useState<PolicyOption>("private");
  const [licenseType, setLicenseType] = useState<LicenseOption>("personal");
  const [copyLimit, setCopyLimit] = useState(10);
  const [royaltyBps, setRoyaltyBps] = useState(500);
  const [priceSui, setPriceSui] = useState("1");
  const [listPriceSui, setListPriceSui] = useState("1");
  const [listCopies, setListCopies] = useState(10);
  const [experienceId, setExperienceId] = useState<string>("");
  const [isMinting, setIsMinting] = useState(false);
  const [isListing, setIsListing] = useState(false);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [policyInput, setPolicyInput] = useState("");
  const [savedPolicies, setSavedPolicies] = useState<string[]>([]);

  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const queryClient = useQueryClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const { data: taskData } = useSuiClientQuery(
    "getObject",
    {
      id: taskId,
      options: { showContent: true },
    },
    { enabled: !!taskId }
  );

  const fields =
    taskData?.data?.content && taskData.data.content.dataType === "moveObject"
      ? (taskData.data.content.fields as Record<string, any>)
      : null;

  const taskStatus = fields ? (fields.status as number) : 0;
  const parseOptionString = (value: unknown): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value[0] || "";
    if (typeof value === "object" && "vec" in (value as any)) {
      const vecVal = (value as any).vec;
      if (Array.isArray(vecVal)) return vecVal[0] || "";
    }
    return "";
  };

  const contentBlob = parseOptionString(fields?.content_blob_id);
  const resultBlob = parseOptionString(fields?.result_blob_id);
  const hasBlobForPolicy = !!(resultBlob || contentBlob);

  // Load saved policy IDs from localStorage (auto-select the last used)
  useMemo(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("seal_policies");
    if (saved) {
      const parsed = JSON.parse(saved) as string[];
      setSavedPolicies(parsed);
      if (!sealPolicyId && parsed.length > 0) {
        setSealPolicyId(parsed[0]);
      }
    }
  }, []);

  const persistPolicies = (policies: string[]) => {
    setSavedPolicies(policies);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("seal_policies", JSON.stringify(policies));
    }
  };

  const applySimpleDefaults = () => {
    setSkill("Experience from approved task");
    setDomain("General");
    setDifficulty(3);
    setTimeSpent(3600);
    setQualityScore(80);
    setPolicyType("private");
    setLicenseType("personal");
    setCopyLimit(5);
    setRoyaltyBps(500);
    setPriceSui("1");
    setListPriceSui("1");
    setListCopies(5);
    toast.info("Applied quick defaults", {
      description: "Edit any field before minting if needed.",
    });
  };

  const handleSavePolicy = () => {
    const trimmed = policyInput.trim();
    if (!trimmed) {
      toast.error("Enter a SEAL policy ID");
      return;
    }
    setSealPolicyId(trimmed);
    const updated = [trimmed, ...savedPolicies.filter((p) => p !== trimmed)];
    persistPolicies(updated);
    setIsPolicyDialogOpen(false);
    toast.success("SEAL policy selected", { description: trimmed });
  };

  const handleSelectPolicy = (policy: string) => {
    setSealPolicyId(policy);
    setIsPolicyDialogOpen(false);
    toast.success("SEAL policy selected", { description: policy });
  };

  const taskStatusLabel = useMemo(() => {
    switch (taskStatus) {
      case 0:
        return "To Do";
      case 1:
        return "In Progress";
      case 2:
        return "Completed";
      case 3:
        return "Approved";
      default:
        return "Unknown";
    }
  }, [taskStatus]);

  const generatePolicyId = () => {
    try {
      return `seal-${crypto.randomUUID()}`;
    } catch {
      return `seal-${Date.now()}`;
    }
  };

  const createSealPolicyForExperience = async (
    experienceObjectId: string,
    policyIdString: string,
    walrusBlobId: string
  ) => {
    const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
    if (!packageId) {
      toast.error("Package ID missing", { description: "Set NEXT_PUBLIC_PACKAGE_ID" });
      return;
    }
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::seal_integration::create_seal_policy`,
        arguments: [
          tx.object(experienceObjectId),
          tx.pure.u8(POLICY_TO_U8[policyType]),
          tx.pure.string(walrusBlobId),
          tx.pure.string(policyIdString),
        ],
      });
      const resp = await signAndExecuteTransaction({ transaction: tx });
      await suiClient.waitForTransaction({ digest: resp.digest });
      toast.success("SEAL policy created", { description: policyIdString });
      setSealPolicyId(policyIdString);
      setSavedPolicies((prev) => {
        const updated = [policyIdString, ...prev.filter((p) => p !== policyIdString)];
        persistPolicies(updated);
        return updated;
      });
    } catch (error) {
      console.error("Failed to create SEAL policy", error);
      handleTransactionError(error, "Failed to create SEAL policy");
    }
  };

  const mintExperience = async () => {
    if (!account) {
      toast.error("Connect your wallet first");
      return;
    }

    if (taskStatus !== 3) {
      toast.error("Task must be approved before minting an experience");
      return;
    }

    const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
    const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;

    if (!packageId || !versionObjectId) {
      toast.error("Configuration error");
      return;
    }

    const walrusBlobForPolicy = resultBlob || contentBlob;
    if (!walrusBlobForPolicy) {
      toast.error("Missing Walrus blob ID", {
        description: "Submit work or upload encrypted content so a Walrus blob can back the SEAL policy.",
      });
      return;
    }

    const policyIdString = sealPolicyId.trim() || generatePolicyId();

    const priceInMist = Math.round(parseFloat(priceSui || "0") * 1_000_000_000);
    if (isNaN(priceInMist) || priceInMist <= 0) {
      toast.error("Price must be greater than 0");
      return;
    }
    const copiesToMint = licenseType === "exclusive" ? 1 : copyLimit;

    setIsMinting(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::task_manage::mint_experience_from_task`,
        arguments: [
          tx.object(versionObjectId),
          tx.object(taskId),
          tx.pure.string(skill),
          tx.pure.string(domain),
          tx.pure.u8(difficulty),
          tx.pure.u64(timeSpent),
          tx.pure.u8(qualityScore),
          tx.pure.string(policyIdString),
          tx.pure.u8(LICENSE_TO_U8[licenseType]),
          tx.pure.u64(copiesToMint),
          tx.pure.u64(royaltyBps),
          tx.pure.u64(priceInMist),
          tx.object("0x6"), // clock
        ],
      });

      const resp = await signAndExecuteTransaction({ transaction: tx });
      await suiClient.waitForTransaction({ digest: resp.digest });
      await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

      const createdExperience = resp.objectChanges?.find(
        (change: any) =>
          change.type === "created" &&
          typeof change.objectType === "string" &&
          change.objectType.includes("::experience::ExperienceNFT")
      );

      if (createdExperience?.objectId) {
        setExperienceId(createdExperience.objectId);
        await createSealPolicyForExperience(createdExperience.objectId, policyIdString, walrusBlobForPolicy);
      }

      toast.success("Experience NFT minted!");
    } catch (error) {
      console.error("Error minting experience:", error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("MoveAbort") && message.includes(" 21)")) {
        toast.error("Experience already minted for this task", {
          description: "Use the existing Experience ID shown in the task header.",
        });
      } else if (message.includes("MoveAbort") && message.includes(" 9)")) {
        toast.error("Only the task owner can mint", {
          description: "Switch to the task owner wallet and retry.",
        });
      } else {
        toast.error("Failed to mint experience", {
          description: message || "Unknown error",
        });
      }
    } finally {
      setIsMinting(false);
    }
  };

  const listExperience = async () => {
    if (!account) {
      toast.error("Connect your wallet first");
      return;
    }
    const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
    if (!packageId) {
      toast.error("Configuration error");
      return;
    }
    const experienceToList = experienceId.trim();
    if (!experienceToList) {
      toast.error("Mint (or paste) an experience ID first");
      return;
    }
    const priceInMist = Math.round(parseFloat(listPriceSui || "0") * 1_000_000_000);
    if (isNaN(priceInMist) || priceInMist <= 0) {
      toast.error("Listing price must be greater than 0");
      return;
    }
    const copiesToList = licenseType === "exclusive" ? 1 : listCopies;
    if (copiesToList <= 0) {
      toast.error("Copies must be greater than 0");
      return;
    }

    setIsListing(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${packageId}::marketplace::list_experience`,
        arguments: [
          tx.object(experienceToList),
          tx.pure.u64(priceInMist),
          tx.pure.u8(LICENSE_TO_U8[licenseType]),
          tx.pure.u64(copiesToList),
        ],
      });

      const resp = await signAndExecuteTransaction({ transaction: tx });
      await suiClient.waitForTransaction({ digest: resp.digest });
      toast.success("Experience listed for sale", { description: `Experience ID: ${experienceToList}` });
    } catch (error) {
      console.error("Error listing experience:", error);
      toast.error("Failed to list experience", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsListing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Mint Experience NFT</CardTitle>
          <CardDescription>
            Approved tasks can be turned into Experience NFTs with Walrus/SEAL references.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Button size="sm" variant="secondary" onClick={applySimpleDefaults}>
              Use quick defaults
            </Button>
            <span>Keep defaults and change only what you need.</span>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">Status: {taskStatusLabel}</Badge>
            {contentBlob && <Badge variant="outline">Content Walrus: {contentBlob.slice(0, 8)}...</Badge>}
            {resultBlob && <Badge variant="outline">Result Walrus: {resultBlob.slice(0, 8)}...</Badge>}
          </div>
          {!hasBlobForPolicy && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Submit work or upload content first so a Walrus blob is available for the SEAL policy.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Skill</Label>
              <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="e.g. Fullstack Delivery" />
            </div>
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. Marketplace / AI / DeFi" />
            </div>
            <div className="space-y-2">
              <Label>Difficulty (1-5)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Time Spent (seconds)</Label>
              <Input
                type="number"
                min={0}
                value={timeSpent}
                onChange={(e) => setTimeSpent(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Quality Score (0-100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={qualityScore}
                onChange={(e) => setQualityScore(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>SEAL Policy ID</span>
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-md border px-2 py-1 text-xs"
                    value={policyType}
                    onChange={(e) => setPolicyType(e.target.value as PolicyOption)}
                  >
                    <option value="private">Private</option>
                    <option value="allowlist">Allowlist</option>
                    <option value="subscription">Subscription</option>
                  </select>
                  <Button variant="secondary" size="sm" onClick={() => setIsPolicyDialogOpen(true)}>
                    Select / Create
                  </Button>
                </div>
              </Label>
              <Input
                value={sealPolicyId}
                onChange={(e) => setSealPolicyId(e.target.value)}
                placeholder="seal_policy::id (leave blank to auto-generate)"
              />
              <p className="text-xs text-muted-foreground">
                Choose policy type; leave blank to auto-generate an ID. A SEAL policy will be created after mint using the result/content blob.
              </p>
            </div>
            <div className="space-y-2">
              <Label>License Type</Label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={licenseType}
                onChange={(e) => setLicenseType(e.target.value as LicenseOption)}
              >
                <option value="personal">Personal (default)</option>
                <option value="commercial">Commercial</option>
                <option value="exclusive">Exclusive (1 copy)</option>
                <option value="subscription">Subscription</option>
                <option value="view_only">View Only</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Copy Limit</Label>
              <Input
                type="number"
                min={1}
                value={licenseType === "exclusive" ? 1 : copyLimit}
                onChange={(e) => setCopyLimit(Number(e.target.value))}
                disabled={licenseType === "exclusive"}
              />
            </div>
            <div className="space-y-2">
              <Label>Royalty (bps)</Label>
              <Input
                type="number"
                min={0}
                max={10_000}
                value={royaltyBps}
                onChange={(e) => setRoyaltyBps(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Mint Price (SUI)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={priceSui}
                onChange={(e) => setPriceSui(e.target.value)}
                placeholder="1.0"
              />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={mintExperience}
            disabled={isMinting || taskStatus !== 3 || !hasBlobForPolicy}
          >
            {isMinting ? "Minting..." : "Mint Experience NFT"}
          </Button>
          {experienceId && (
            <div className="text-sm text-muted-foreground">
              Latest minted Experience ID: <span className="font-mono">{experienceId}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>List Experience for Sale</CardTitle>
          <CardDescription>
            Set price, license, and copies for marketplace listing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Experience ID</Label>
            <Input
              value={experienceId}
              onChange={(e) => setExperienceId(e.target.value)}
              placeholder="Paste experience object ID"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Listing Price (SUI)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={listPriceSui}
                onChange={(e) => setListPriceSui(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>License Type</Label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={licenseType}
                onChange={(e) => setLicenseType(e.target.value as LicenseOption)}
              >
                <option value="personal">Personal</option>
                <option value="commercial">Commercial</option>
                <option value="exclusive">Exclusive</option>
                <option value="subscription">Subscription</option>
                <option value="view_only">View Only</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Available Copies</Label>
              <Input
                type="number"
                min={1}
                value={licenseType === "exclusive" ? 1 : listCopies}
                onChange={(e) => setListCopies(Number(e.target.value))}
                disabled={licenseType === "exclusive"}
              />
            </div>
          </div>
          <Button className="w-full" onClick={listExperience} disabled={isListing || !experienceId}>
            {isListing ? "Listing..." : "List Experience"}
          </Button>
        </CardContent>
      </Card>

      {/* SEAL policy selector dialog */}
      <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select or add a SEAL policy</DialogTitle>
            <DialogDescription>
              Paste a SEAL policy ID or pick one you have used before.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Policy ID</Label>
              <Input
                value={policyInput}
                onChange={(e) => setPolicyInput(e.target.value)}
                placeholder="seal_policy::id"
              />
            </div>
            {savedPolicies.length > 0 && (
              <div className="space-y-1">
                <Label>Saved policies</Label>
                <ScrollArea className="h-28 border rounded-md p-2">
                  <div className="space-y-1">
                    {savedPolicies.map((policy) => (
                      <Button
                        key={policy}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start font-mono"
                        onClick={() => handleSelectPolicy(policy)}
                      >
                        {policy}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setIsPolicyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePolicy}>Use Policy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
