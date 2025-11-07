import { useCallback } from "react";

// Storage keys for wallet management
export const WALLET_STORAGE_KEY = "task_manage_wallet";
export const WALLET_TYPE_KEY = "task_manage_wallet_type";

/**
 * Custom hook for wallet localStorage operations
 */
export function useWalletStorage() {
  /**
   * Save wallet data to localStorage
   */
  const saveWalletToStorage = useCallback(
    (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      account: any,
      walletType: "passkey" | "enoki"
    ) => {
      try {
        localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(account));
        localStorage.setItem(WALLET_TYPE_KEY, walletType);
      } catch (error) {
        console.error("Failed to save wallet to storage:", error);
      }
    },
    []
  );

  /**
   * Load wallet data from localStorage
   */
  const loadWalletFromStorage = useCallback(() => {
    try {
      const savedWallet = localStorage.getItem(WALLET_STORAGE_KEY);
      const walletType = localStorage.getItem(WALLET_TYPE_KEY);

      if (savedWallet && walletType) {
        const account = JSON.parse(savedWallet);
        return {
          account,
          walletType: walletType as "passkey" | "enoki",
        };
      }

      return null;
    } catch (error) {
      console.error("Failed to load wallet from storage:", error);
      return null;
    }
  }, []);

  /**
   * Clear all wallet data from localStorage
   */
  const clearWalletStorage = useCallback(() => {
    try {
      localStorage.removeItem(WALLET_STORAGE_KEY);
      localStorage.removeItem(WALLET_TYPE_KEY);
    } catch (error) {
      console.error("Failed to clear wallet storage:", error);
    }
  }, []);

  /**
   * Check if any wallet is stored in localStorage
   */
  const hasStoredWallet = useCallback(() => {
    return !!(
      localStorage.getItem(WALLET_STORAGE_KEY) &&
      localStorage.getItem(WALLET_TYPE_KEY)
    );
  }, []);

  /**
   * Get the stored wallet type without loading full data
   */
  const getStoredWalletType = useCallback(() => {
    return localStorage.getItem(WALLET_TYPE_KEY) as "passkey" | "enoki" | null;
  }, []);

  return {
    saveWalletToStorage,
    loadWalletFromStorage,
    clearWalletStorage,
    hasStoredWallet,
    getStoredWalletType,
  };
}
