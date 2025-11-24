"use client";

import { useMemo, useState } from "react";
import { useCurrentAccount, useSignPersonalMessage, useSuiClient } from "@mysten/dapp-kit";
import type { SessionKey } from "@mysten/seal";
import { toB64 } from "@mysten/sui/utils";
import { ShieldCheck, Share2, KeyRound, Loader2, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  createSealClient,
  parseKeyServerList,
  createSessionKeyWithWallet,
  buildSealApproveTxBytes,
  decodeEncryptedPayload,
  DEFAULT_SERVER_CONFIGS,
} from "@/utils/seal";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

const defaultPackageId = process.env.NEXT_PUBLIC_PACKAGE_ID ?? "";
const defaultKeyServerValue = DEFAULT_SERVER_CONFIGS.map(
  (server) => `${server.objectId}@${server.weight}`,
).join(",");
const defaultKeyServerPlaceholder =
  defaultKeyServerValue || "0x<key_server_object_id>@1,0x<another_key_server>@1";

export function SealKeySharePanel() {
  const suiClient = useSuiClient();
  const account = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  const [packageId, setPackageId] = useState(defaultPackageId);
  const [taskId, setTaskId] = useState("");
  const [keyServersInput, setKeyServersInput] = useState(defaultKeyServerValue);
  const [threshold, setThreshold] = useState(2);
  const [sessionTtl, setSessionTtl] = useState(15);
  const [recipient, setRecipient] = useState("");
  const [plaintext, setPlaintext] = useState("");
  const [ciphertext, setCiphertext] = useState("");
  const [sharePayload, setSharePayload] = useState("");
  const [decryptedText, setDecryptedText] = useState("");
  const [sessionKey, setSessionKey] = useState<SessionKey | null>(null);
  const [sessionKeyStatus, setSessionKeyStatus] = useState<
    "idle" | "creating" | "ready"
  >("idle");
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const serverConfigs = useMemo(() => parseKeyServerList(keyServersInput), [keyServersInput]);

  const sealClient = useMemo(() => {
    if (!serverConfigs.length) return null;
    try {
      return createSealClient(suiClient, serverConfigs);
    } catch (error) {
      console.warn("[Seal] Failed to init client", error);
      return null;
    }
  }, [serverConfigs, suiClient]);

  const ensureSessionKey = async () => {
    if (!account) {
      toast.error("Connect a wallet to create a session key");
      throw new Error("No account");
    }
    if (sessionKey && sessionKey.isExpired()) {
      setSessionKey(null);
      setSessionKeyStatus("idle");
    }
    if (sessionKey && !sessionKey.isExpired()) {
      setSessionKeyStatus("ready");
      return sessionKey;
    }
    if (sessionKeyStatus === "creating") {
      throw new Error("Session key is already being created");
    }

    try {
      setSessionKeyStatus("creating");
      const ttl = sessionTtl > 0 ? Math.min(sessionTtl, 30) : 15;
      const sessionKey = await createSessionKeyWithWallet({
        address: account.address,
        packageId,
        ttlMinutes: ttl,
        suiClient,
        signPersonalMessage,
        account,
      });
      setSessionKey(sessionKey);
      setSessionKeyStatus("ready");
      toast.success("Session key ready", {
        description: `TTL ${ttl} minutes`,
      });
      return sessionKey;
    } catch (error) {
      setSessionKeyStatus("idle");
      throw error;
    }
  };

  const handleEncrypt = async () => {
    if (!sealClient) {
      toast.error("Configure key servers before encrypting");
      return;
    }
    if (!recipient.trim()) {
      toast.error("Add a recipient wallet address");
      return;
    }
    if (!packageId) {
      toast.error("Package ID is required");
      return;
    }
    if (!Number.isFinite(threshold) || threshold < 1) {
      toast.error("Threshold must be at least 1");
      return;
    }

    setIsEncrypting(true);
    try {
      const data = new TextEncoder().encode(plaintext || " ");
      const { encryptedObject } = await sealClient.encrypt({
        packageId,
        id: recipient.trim(),
        data,
        threshold,
      });
      const encoded = toB64(encryptedObject);
      setCiphertext(encoded);
      setSharePayload(
        JSON.stringify(
          {
            packageId,
            taskId,
            threshold,
            keyServers: keyServersInput,
            ciphertext: encoded,
          },
          null,
          2,
        ),
      );
      toast.success("Encrypted with Seal", {
        description: "Share the ciphertext with the recipient wallet",
      });
    } catch (error) {
      toast.error("Encryption failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsEncrypting(false);
    }
  };

  const handleDecrypt = async () => {
    if (!sealClient) {
      toast.error("Configure key servers before decrypting");
      return;
    }
    if (!ciphertext.trim()) {
      toast.error("Paste a ciphertext to decrypt");
      return;
    }
    if (!taskId.trim()) {
      toast.error("Task object ID is required for the seal_approve call");
      return;
    }

    setIsDecrypting(true);
    try {
      const sessionKey = await ensureSessionKey();
      const { bytes, parsed } = decodeEncryptedPayload(ciphertext);

      const txBytes = await buildSealApproveTxBytes({
        packageId,
        taskId,
        identity: parsed.id,
        suiClient,
        sender: account!.address,
      });

      const plaintextBytes = await sealClient.decrypt({
        data: bytes,
        sessionKey,
        txBytes,
      });

      const decoded = new TextDecoder().decode(plaintextBytes);
      setDecryptedText(decoded);
      toast.success("Decrypted successfully");
    } catch (error) {
      toast.error("Decryption failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsDecrypting(false);
    }
  };

  const copySharePayload = () => {
    if (!sharePayload.trim()) return;
    navigator.clipboard.writeText(sharePayload);
    toast.success("Share payload copied");
  };

  const copyCiphertext = () => {
    if (!ciphertext.trim()) return;
    navigator.clipboard.writeText(ciphertext);
    toast.success("Ciphertext copied");
  };

  const sessionStatusLabel =
    sessionKeyStatus === "creating"
      ? "Generating session key..."
      : sessionKeyStatus === "ready"
        ? "Session key ready"
        : "Session key not created";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Seal setup
          </CardTitle>
          <CardDescription>
            Configure the Seal key servers and package used for the namespace check in
            <code className="ml-2 rounded bg-muted px-2 py-0.5 text-sm">
              seal_approve
            </code>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Package ID</Label>
            <Input
              value={packageId}
              placeholder="0x<package>"
              onChange={(e) => setPackageId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Key servers (comma-separated)</Label>
            <Input
              value={keyServersInput}
              onChange={(e) => setKeyServersInput(e.target.value)}
              placeholder={defaultKeyServerPlaceholder}
            />
            <p className="text-xs text-muted-foreground">
              Format: <code>objectId@weight</code>, e.g.{" "}
              <code>0x123...@1,0xabc...@1</code>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Threshold</Label>
              <Input
                type="number"
                min={1}
                value={threshold}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setThreshold(Number.isFinite(value) ? value : 1);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Session TTL (mins)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={sessionTtl}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setSessionTtl(Number.isFinite(value) ? value : 15);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Task object</Label>
              <Input
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="0x<task_id>"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded border bg-muted/30 px-3 py-2 text-sm">
            <div className="flex flex-col">
              <span className="font-medium">{sessionStatusLabel}</span>
              <span className="text-muted-foreground">
                Wallet: {account?.address ?? "not connected"}
              </span>
            </div>
            <Button
              variant="outline"
              onClick={() => ensureSessionKey().catch((error) =>
                toast.error("Failed to create session key", {
                  description: error instanceof Error ? error.message : "Unknown error",
                }),
              )}
              disabled={sessionKeyStatus === "creating" || !account}
            >
              {sessionKeyStatus === "creating" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {sessionKeyStatus === "ready" ? "Refresh key" : "Create session key"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Encrypt for another wallet
          </CardTitle>
          <CardDescription>
            Encrypt plaintext with Seal so only the chosen wallet can request the
            decryption share.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Recipient wallet</Label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x<recipient_address>"
            />
          </div>
          <div className="space-y-2">
            <Label>Plaintext</Label>
            <Textarea
              rows={5}
              value={plaintext}
              onChange={(e) => setPlaintext(e.target.value)}
              placeholder="Notes, task content, or a symmetric key to store in Walrus"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleEncrypt} disabled={isEncrypting}>
              {isEncrypting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Encrypt with Seal
            </Button>
            {ciphertext && (
              <Button variant="outline" size="icon" onClick={copyCiphertext}>
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy ciphertext</span>
              </Button>
            )}
          </div>
          {ciphertext && (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="h-4 w-4" />
                Ciphertext (base64)
              </Label>
              <Textarea readOnly rows={4} value={ciphertext} className="font-mono text-xs" />
            </div>
          )}
          {sharePayload && (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <Share2 className="h-4 w-4" />
                Share payload
              </Label>
              <Textarea readOnly rows={5} value={sharePayload} className="font-mono text-xs" />
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={copySharePayload}>
                  Copy payload
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Decrypt as the recipient
          </CardTitle>
          <CardDescription>
            Use your wallet session key to request decryption shares via{" "}
            <code className="rounded bg-muted px-2 py-0.5 text-sm">seal_approve</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Ciphertext</Label>
            <Textarea
              rows={4}
              value={ciphertext}
              onChange={(e) => setCiphertext(e.target.value)}
              placeholder="Paste the ciphertext you received"
              className="font-mono text-xs"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleDecrypt}
              disabled={isDecrypting || sessionKeyStatus === "creating"}
            >
              {isDecrypting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Request keys & decrypt
            </Button>
            <p className="text-sm text-muted-foreground">
              You must be shared on the task to pass the on-chain access check.
            </p>
          </div>
          {decryptedText && (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
              <Label className="text-sm font-semibold">Decrypted plaintext</Label>
              <Textarea readOnly rows={4} value={decryptedText} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
