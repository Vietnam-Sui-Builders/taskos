"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useWalletStorage } from "@/hooks/use-wallet-storage";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard component that checks if user has a connected wallet
 * Redirects to /login if no wallet is connected
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const currentAccount = useCurrentAccount();
  const { loadWalletFromStorage } = useWalletStorage();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      console.log("AuthGuard: Checking authentication...");
      console.log("AuthGuard: currentAccount:", currentAccount);
      // Check if wallet is connected via dApp kit
      if (currentAccount?.address) {
        console.log("✅ Wallet connected:", currentAccount.address);
        setIsAuthenticated(true);
        setIsChecking(false);
        return;
      }

      // Check if wallet is stored in localStorage (passkey)
      const savedWallet = loadWalletFromStorage();
      console.log("AuthGuard: savedWallet:", savedWallet);
      
      if (savedWallet?.account?.address) {
        console.log("✅ Wallet found in storage:", savedWallet.account.address);
        setIsAuthenticated(true);
        setIsChecking(false);
        return;
      }

      // No wallet found - redirect to login
      console.log("❌ No wallet found, redirecting to login");
      setIsAuthenticated(false);
      setIsChecking(false);
      router.push("/login");
    };

    checkAuth();
  }, [currentAccount, router, loadWalletFromStorage]);

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
          <p className="text-sm text-gray-500">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Only render children if authenticated
  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  // Render children only if authenticated
  return <>{children}</>;
}
