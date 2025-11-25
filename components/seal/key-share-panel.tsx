"use client";

import { useMemo, useState } from "react";
import { useCurrentAccount, useSignPersonalMessage, useSuiClient } from "@mysten/dapp-kit";
import type { WalletAccount } from "@mysten/wallet-standard";
import type { SessionKey } from "@mysten/seal";
import { toB64, fromB64 } from "@mysten/sui/utils";
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
      
      // Create a wrapper function that adapts the dapp-kit signature to the seal utility signature
      const signPersonalMessageAdapter = async (args: {
        message: Uint8Array;
        account?: WalletAccount | null;
        chain?: string;
      }) => {
        const result = await signPersonalMessage({
          message: args.message,
          account: args.account ?? undefined,
        });
        // Convert bytes from base64 string to number array to match expected type
        const bytesArray: number[] = Array.from(fromB64(result.bytes));
        return {
          bytes: bytesArray,
          signature: result.signature,
        };
      };
      
      const sessionKey = await createSessionKeyWithWallet({
        address: account.address,
        packageId,
        ttlMinutes: ttl,
        suiClient,
        signPersonalMessage: signPersonalMessageAdapter,
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
      <Card className="glass border-primary/20 bg-card/40 backdrop-blur-md shadow-[0_0_30px_rgba(var(--primary),0.05)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold font-display tracking-wide text-primary">
            <ShieldCheck className="h-5 w-5" />
            SEAL_SETUP_PROTOCOL
          </CardTitle>
          <CardDescription className="font-mono text-xs text-muted-foreground">
            CONFIGURE_KEY_SERVERS_AND_PACKAGE_FOR_NAMESPACE_CHECK
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">PACKAGE_ID</Label>
            <Input
              value={packageId}
              placeholder="0x<package>"
              onChange={(e) => setPackageId(e.target.value)}
              className="font-mono text-sm bg-background/50 border-primary/20 focus:border-primary/50 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">KEY_SERVERS_CONFIG</Label>
            <Input
              value={keyServersInput}
              onChange={(e) => setKeyServersInput(e.target.value)}
              placeholder={defaultKeyServerPlaceholder}
              className="font-mono text-sm bg-background/50 border-primary/20 focus:border-primary/50 focus:ring-primary/20"
            />
            <p className="text-[10px] font-mono text-muted-foreground opacity-70">
              FORMAT: <code>objectId@weight</code> (COMMA_SEPARATED)
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">THRESHOLD</Label>
              <Input
                type="number"
                min={1}
                value={threshold}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setThreshold(Number.isFinite(value) ? value : 1);
                }}
                className="font-mono text-sm bg-background/50 border-primary/20 focus:border-primary/50 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">TTL_MINS</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={sessionTtl}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setSessionTtl(Number.isFinite(value) ? value : 15);
                }}
                className="font-mono text-sm bg-background/50 border-primary/20 focus:border-primary/50 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">TASK_OBJECT</Label>
              <Input
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="0x<task_id>"
                className="font-mono text-sm bg-background/50 border-primary/20 focus:border-primary/50 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-primary/5 px-4 py-3 text-sm">
            <div className="flex flex-col gap-1">
              <span className="font-bold font-mono text-primary text-xs uppercase tracking-wider">{sessionStatusLabel}</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                WALLET: {account?.address ? `${account.address.substring(0, 6)}...${account.address.substring(account.address.length - 4)}` : "NOT_CONNECTED"}
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
              className="border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors font-mono text-xs uppercase tracking-wider"
            >
              {sessionKeyStatus === "creating" && (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              )}
              {sessionKeyStatus === "ready" ? "REFRESH_KEY" : "CREATE_KEY"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-primary/20 bg-card/40 backdrop-blur-md shadow-[0_0_30px_rgba(var(--primary),0.05)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold font-display tracking-wide text-primary">
            <Share2 className="h-5 w-5" />
            ENCRYPTION_PROTOCOL
          </CardTitle>
          <CardDescription className="font-mono text-xs text-muted-foreground">
            ENCRYPT_PLAINTEXT_FOR_TARGET_WALLET
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">RECIPIENT_WALLET</Label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x<recipient_address>"
              className="font-mono text-sm bg-background/50 border-primary/20 focus:border-primary/50 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">PLAINTEXT_DATA</Label>
            <Textarea
              rows={5}
              value={plaintext}
              onChange={(e) => setPlaintext(e.target.value)}
              placeholder="ENTER_NOTES_OR_KEYS..."
              className="font-mono text-sm bg-background/50 border-primary/20 focus:border-primary/50 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleEncrypt} disabled={isEncrypting} className="flex-1 bg-primary text-primary-foreground font-bold font-display tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(var(--primary),0.2)] hover:shadow-[0_0_25px_rgba(var(--primary),0.4)]">
              {isEncrypting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ENCRYPT_WITH_SEAL
            </Button>
            {ciphertext && (
              <Button variant="outline" size="icon" onClick={copyCiphertext} className="border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors">
                <Copy className="h-4 w-4" />
                <span className="sr-only">COPY_CIPHERTEXT</span>
              </Button>
            )}
          </div>
          {ciphertext && (
            <div className="space-y-2 rounded-lg border border-primary/10 bg-black/50 p-3 shadow-inner">
              <Label className="flex items-center gap-2 text-xs font-bold font-mono text-primary uppercase tracking-wider">
                <KeyRound className="h-3 w-3" />
                CIPHERTEXT_BASE64
              </Label>
              <Textarea readOnly rows={4} value={ciphertext} className="font-mono text-[10px] bg-transparent border-none resize-none text-muted-foreground focus:ring-0" />
            </div>
          )}
          {sharePayload && (
            <div className="space-y-2 rounded-lg border border-primary/10 bg-black/50 p-3 shadow-inner">
              <Label className="flex items-center gap-2 text-xs font-bold font-mono text-primary uppercase tracking-wider">
                <Share2 className="h-3 w-3" />
                SHARE_PAYLOAD
              </Label>
              <Textarea readOnly rows={5} value={sharePayload} className="font-mono text-[10px] bg-transparent border-none resize-none text-muted-foreground focus:ring-0" />
              <div className="flex justify-end pt-2 border-t border-white/5">
                <Button variant="outline" size="sm" onClick={copySharePayload} className="h-7 text-[10px] font-mono uppercase border-primary/20 hover:bg-primary/10 hover:text-primary">
                  COPY_PAYLOAD
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 glass border-primary/20 bg-card/40 backdrop-blur-md shadow-[0_0_30px_rgba(var(--primary),0.05)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-bold font-display tracking-wide text-primary">
            <RefreshCw className="h-5 w-5" />
            DECRYPTION_PROTOCOL
          </CardTitle>
          <CardDescription className="font-mono text-xs text-muted-foreground">
            REQUEST_DECRYPTION_SHARES_VIA_SEAL_APPROVE
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">CIPHERTEXT_INPUT</Label>
            <Textarea
              rows={4}
              value={ciphertext}
              onChange={(e) => setCiphertext(e.target.value)}
              placeholder="PASTE_CIPHERTEXT_HERE..."
              className="font-mono text-xs bg-background/50 border-primary/20 focus:border-primary/50 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleDecrypt}
              disabled={isDecrypting || sessionKeyStatus === "creating"}
              className="bg-primary text-primary-foreground font-bold font-display tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(var(--primary),0.2)] hover:shadow-[0_0_25px_rgba(var(--primary),0.4)]"
            >
              {isDecrypting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              REQUEST_KEYS_&_DECRYPT
            </Button>
            <p className="text-xs font-mono text-muted-foreground italic">
              * REQUIRES_ON_CHAIN_ACCESS_VERIFICATION
            </p>
          </div>
          {decryptedText && (
            <div className="space-y-2 rounded-lg border border-green-500/20 bg-green-500/5 p-4 mt-4">
              <Label className="text-xs font-bold font-mono text-green-500 uppercase tracking-wider flex items-center gap-2">
                <span>🔓</span> DECRYPTED_PLAINTEXT
              </Label>
              <Textarea readOnly rows={4} value={decryptedText} className="font-mono text-sm bg-transparent border-none resize-none text-foreground focus:ring-0" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
