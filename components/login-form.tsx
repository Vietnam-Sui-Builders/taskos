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
import "@mysten/dapp-kit/dist/index.css";

import {
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider,
  useCurrentAccount,
  ConnectButton,
  useSuiClientContext,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import type { WalletAccount } from "@mysten/wallet-standard";
import { getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerEnokiWallets } from "@mysten/enoki";
import { useEffect, useState } from "react";
import {
  BrowserPasskeyProvider,
  BrowserPasswordProviderOptions,
  PasskeyKeypair,
} from "@mysten/sui/keypairs/passkey";
import { useWalletStorage } from "@/hooks/use-wallet-storage";

const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
});

const queryClient = new QueryClient();

function RegisterEnokiWallets() {
  const { client, network } = useSuiClientContext();

  useEffect(() => {
    if (!client || !network) return;

    const { unregister } = registerEnokiWallets({
      apiKey: "enoki_public_a56d0d2eae9d947356fa5bcb68febd2f",
      providers: {
        google: {
          clientId:
            "973280063155-rkuse0cisqcvvvnabpl56uov0pv3o2fj.apps.googleusercontent.com",
          redirectUrl: window.location.origin,
          extraParams: {
            prompt: "select_account",
          },
        },
      },
      client,
      network: network as "testnet" | "mainnet",
    });

    return unregister;
  }, [client, network]);

  return null;
}

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
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="text-green-800 flex items-center gap-2">
          <span className="text-green-600">✅</span>
          Wallet Connected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p className="font-medium text-gray-700">
            Wallet: {currentAccount.label || "Connected Wallet"}
          </p>
          <p className="text-gray-600 break-all mt-1">
            Address: {currentAccount.address}
          </p>
        </div>

        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="text-emerald-800 flex items-center">
              Send 1 SUI Transaction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-emerald-700 text-sm">
              Test transaction to transfer 1 SUI to:
            </p>
            <code className="block bg-gray-100 p-2 rounded text-xs break-all">
              {recipientAddress}
            </code>
            <Button
              onClick={onSignTransaction}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Sign and Execute Transaction
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
        "flex flex-col gap-6 min-h-screen items-center justify-center p-4"
      )}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Task manage</CardTitle>
          <CardDescription>Connect your wallet to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button variant="outline" className="w-full">
              <ConnectButton
                className="w-full"
                style={{
                  backgroundColor: "transparent",
                  color: "hsl(var(--primary-foreground))",
                }}
              />
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={connectWithPasskey}
              disabled={isPasskeyConnecting}
            >
              {isPasskeyConnecting ? "Connecting..." : "Connect with Passkey"}
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
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <span className="text-blue-600">🔐</span>
              Passkey Wallet Connected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <p className="font-medium text-gray-700">
                Wallet: {passkeyAccount.label}
              </p>
              <p className="text-gray-600 break-all mt-1">
                Address: {passkeyAccount.address}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigator.clipboard.writeText(passkeyAccount.address)
                }
                className="flex-1"
              >
                📋 Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearWalletStorage();
                  setPasskeyAccount(null);
                }}
                className="flex-1 text-red-600 hover:text-red-700"
              >
                Disconnect
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
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <RegisterEnokiWallets />
        <WalletProvider>
          <div className={cn("flex flex-col gap-6", className)} {...props}>
            <EnhancedLoginForm />
          </div>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
