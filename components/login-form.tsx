"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// import "@mysten/dapp-kit/dist/index.css";

import {
  useCurrentAccount,
  ConnectButton,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import type { WalletAccount } from "@mysten/wallet-standard";
import { Transaction } from "@mysten/sui/transactions";
import { useEffect, useState } from "react";
import {
  BrowserPasskeyProvider,
  BrowserPasswordProviderOptions,
  PasskeyKeypair,
} from "@mysten/sui/keypairs/passkey";
import { useWalletStorage } from "@/hooks/use-wallet-storage";
import { useFaucet } from "@/hooks/use-faucet";
import { useRouter, useSearchParams } from "next/navigation";

interface WalletConnectedSectionProps {
  currentAccount: WalletAccount;
  onSignTransaction: () => void;
}

function WalletConnectedSection({
  currentAccount,
  onSignTransaction,
}: WalletConnectedSectionProps) {
  const recipientAddress =
    "0xbb8d2de83cf7f1d3aac09f7b514c95749ad73506306e352ddf3f2bcd8b80baa2";

  return (
    <Card className="border-primary/20 bg-primary/5 backdrop-blur-sm w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-primary flex items-center gap-2 font-display tracking-wide">
          <span className="text-primary animate-pulse">●</span>
          WALLET CONNECTED
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm space-y-1">
          <p className="font-medium text-foreground">
            ID: {currentAccount.label || "Unknown Unit"}
          </p>
          <p className="text-muted-foreground break-all font-mono text-xs opacity-70">
            {currentAccount.address}
          </p>
        </div>

        <Card className="border-secondary/20 bg-secondary/5">
          <CardHeader className="py-3">
            <CardTitle className="text-secondary flex items-center text-xs font-mono">
              {">"} EXECUTE_PROTOCOL_ALPHA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-4">
            <p className="text-muted-foreground text-xs">
              Initiate transfer sequence (1 SUI):
            </p>
            <code className="block bg-black/40 p-2 rounded text-xs break-all text-primary font-mono border border-primary/10">
              {recipientAddress}
            </code>
            <Button
              onClick={onSignTransaction}
              className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/50 hover:border-primary transition-all duration-300 font-mono text-xs tracking-wider"
            >
              [ INITIATE TRANSACTION ]
            </Button>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

function EnhancedLoginForm() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();
  const faucet = useFaucet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [passkeyAccount, setPasskeyAccount] = useState<WalletAccount | null>(
    null
  );
  const [isPasskeyConnecting, setIsPasskeyConnecting] = useState(false);

  // Use our custom wallet storage hook
  const { saveWalletToStorage, loadWalletFromStorage, clearWalletStorage } =
    useWalletStorage();

  // Load saved wallet on component mount
  useEffect(() => {
    const savedData = loadWalletFromStorage();
    if (savedData && savedData.walletType === "passkey") {
      setPasskeyAccount(savedData.account as WalletAccount);
    }
  }, [loadWalletFromStorage]);

  // Redirect to dashboard only when regular wallet is connected (not passkey)
  useEffect(() => {
    if (currentAccount) {
      const redirect = searchParams.get("redirect");
      router.push(redirect || "/dashboard");
    }
  }, [currentAccount, router, searchParams]);

  // Track Enoki wallet connection changes and save to localStorage
  useEffect(() => {
    if (currentAccount) {
      // Convert to WalletAccount format and save as Enoki wallet
      const enokiAccount: WalletAccount = {
        address: currentAccount.address,
        publicKey: currentAccount.publicKey,
        label: currentAccount.label || "Enoki Wallet",
        chains: currentAccount.chains,
        features: currentAccount.features,
      };
      saveWalletToStorage(enokiAccount, "enoki");
    }
  }, [currentAccount, saveWalletToStorage]);

  // Connect with existing passkey (recover from iCloud)
  async function connectWithPasskey() {
    try {
      setIsPasskeyConnecting(true);

      const provider = new BrowserPasskeyProvider("Task Manage", {
        rpName: "Task Manage",
        rpId: window.location.hostname,
        authenticatorSelection: {
          residentKey: "required",
          userVerification: "preferred",
        },
      } as BrowserPasswordProviderOptions);

      // Try to recover existing passkey first
      try {
        const testMessage = new TextEncoder().encode(
          "Task Manage authentication"
        );
        const possiblePks = await PasskeyKeypair.signAndRecover(
          provider,
          testMessage
        );

        if (possiblePks.length > 0) {
          // Found existing passkey - recover it
          const keypair = new PasskeyKeypair(
            possiblePks[0].toRawBytes(),
            provider
          );

          const recoveredAccount: WalletAccount = {
            address: keypair.getPublicKey().toSuiAddress(),
            publicKey: keypair.getPublicKey().toRawBytes(),
            label: "Passkey Wallet",
            chains: ["sui:mainnet", "sui:testnet"],
            features: [],
          };

          setPasskeyAccount(recoveredAccount);
          saveWalletToStorage(recoveredAccount, "passkey");
          console.log(
            "Passkey wallet recovered from iCloud:",
            recoveredAccount.address
          );
          return;
        }
      } catch {
        console.log("No existing passkey found, will create new one...");
      }

      // No existing passkey found - create new one
      const keypair = await PasskeyKeypair.getPasskeyInstance(provider);

      const newAccount: WalletAccount = {
        address: keypair.getPublicKey().toSuiAddress(),
        publicKey: keypair.getPublicKey().toRawBytes(),
        label: "Passkey Wallet",
        chains: ["sui:mainnet", "sui:testnet"],
        features: [],
      };

      setPasskeyAccount(newAccount);
      saveWalletToStorage(newAccount, "passkey");
      console.log("New passkey wallet created:", newAccount.address);
      faucet.mutate(newAccount.address);
    } catch (error) {
      console.error("Passkey connection error:", error);
      alert("Failed to connect with passkey: " + (error as Error).message);
    } finally {
      setIsPasskeyConnecting(false);
    }
  }

  async function handleSignTransaction() {
    try {
      const transaction = new Transaction();

      const [coin] = transaction.splitCoins(transaction.gas, [
        BigInt(1000000000) / BigInt(10),
      ]);

      transaction.transferObjects(
        [coin],
        "0xbb8d2de83cf7f1d3aac09f7b514c95749ad73506306e352ddf3f2bcd8b80baa2"
      );

      const { digest } = await signAndExecuteTransaction({
        transaction,
      });

      alert(`Transaction successful! Digest: ${digest}`);
    } catch (error) {
      console.error("Transaction error:", error);
      alert("Transaction failed: " + (error as Error).message);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-6 min-h-screen items-center justify-center p-4 relative overflow-hidden"
      )}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.05),transparent_70%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[100px] rounded-full opacity-50" />
      </div>

      <Card className="w-full max-w-md glass border-primary/20 shadow-2xl shadow-primary/5 relative z-10">
        <CardHeader className="text-center space-y-2 pb-8">
          <div className="mx-auto w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center border border-primary/20 mb-4 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
            <div className="w-8 h-8 bg-primary rounded-full animate-pulse shadow-[0_0_20px_rgba(var(--primary),0.5)]" />
          </div>
          <CardTitle className="text-3xl font-bold font-display tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary via-white to-accent">
            TASK_OS
          </CardTitle>
          <CardDescription className="text-muted-foreground font-mono text-[10px] tracking-[0.3em] uppercase opacity-70">
            Secure Access Terminal v2.0
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative">
                <ConnectButton
                  className="w-full !bg-background/80 !backdrop-blur-xl !border !border-primary/20 !text-primary hover:!bg-primary/10 hover:!border-primary/50 transition-all duration-300 !font-mono !h-12 !rounded-lg"
                />
              </div>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                <span className="bg-background px-2 text-muted-foreground/50">
                  Alternative Protocol
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full h-12 border-secondary/20 text-secondary hover:bg-secondary/10 hover:text-secondary hover:border-secondary/50 font-mono text-xs tracking-wider uppercase transition-all duration-300"
              onClick={connectWithPasskey}
              disabled={isPasskeyConnecting}
            >
              {isPasskeyConnecting ? "INITIALIZING UPLINK..." : "ACCESS VIA PASSKEY"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {currentAccount && (
        <WalletConnectedSection
          currentAccount={currentAccount}
          onSignTransaction={handleSignTransaction}
        />
      )}

      {passkeyAccount && (
        <Card className="border-accent/20 bg-accent/5 w-full max-w-md backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-accent flex items-center gap-2 font-display text-sm tracking-wide">
              <span className="text-accent animate-pulse">◈</span>
              PASSKEY LINK ESTABLISHED
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm space-y-1">
              <p className="font-medium text-foreground">
                ID: {passkeyAccount.label}
              </p>
              <p className="text-muted-foreground break-all font-mono text-xs opacity-70">
                {passkeyAccount.address}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigator.clipboard.writeText(passkeyAccount.address)
                }
                className="flex-1 border-accent/20 hover:bg-accent/10 hover:text-accent hover:border-accent/50 text-xs font-mono"
              >
                COPY_ID
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearWalletStorage();
                  setPasskeyAccount(null);
                }}
                className="flex-1 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 text-xs font-mono"
              >
                TERMINATE
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <EnhancedLoginForm />
    </div>
  );
}
