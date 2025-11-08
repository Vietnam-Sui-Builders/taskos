"use client";

import {
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider,
  useSuiClientContext,
} from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { registerEnokiWallets } from "@mysten/enoki";
import { useEffect } from "react";

// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl("localnet") },
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

interface ProviderProps {
  children: React.ReactNode;
}

const Provider = ({ children }: ProviderProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          <RegisterEnokiWallets />
          {children}
          <Toaster position="bottom-right" richColors />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
};

export default Provider;
