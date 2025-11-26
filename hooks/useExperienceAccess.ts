// File: frontend/src/hooks/useExperienceAccess.ts
// Purpose: React hook to manage experience data access flow

import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { getSEALPolicy, checkAccess, requestDecryptionKey, decryptionKeyCache } from '../services/sealService';
import { downloadAndDecryptBlob, parseExperienceData } from '../services/walrusService';

interface ExperienceAccessState {
  loading: boolean;
  error: string | null;
  canAccess: boolean;
  accessReason: string;
  data: any | null;
  decryptedContent: string | null;
  expiresAt: Date | null;
  loadingStep: string | null;
  progress: number;
}

export function useExperienceAccess(
  experienceId: string,
  taskosPackageId: string
) {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const [state, setState] = useState<ExperienceAccessState>({
    loading: true,
    error: null,
    canAccess: false,
    accessReason: '',
    data: null,
    decryptedContent: null,
    expiresAt: null,
    loadingStep: null,
    progress: 0,
  });

  const checkExperienceAccess = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null, loadingStep: 'Initializing...', progress: 0 }));

      // 1. Fetch SEAL policy
      setState((prev) => ({ ...prev, loadingStep: 'Fetching SEAL policy...', progress: 20 }));
      const policy = await getSEALPolicy(experienceId, taskosPackageId);

      // 2. Check if user has access
      setState((prev) => ({ ...prev, loadingStep: 'Verifying access permissions...', progress: 30 }));
      const accessCheck = await checkAccess(policy, currentAccount!.address);

      if (!accessCheck.canAccess) {
        setState((prev) => ({
          ...prev,
          loading: false,
          canAccess: false,
          accessReason: accessCheck.reason,
          loadingStep: null,
          progress: 0,
        }));
        return;
      }

      // 3. User has access - request decryption key
      const cachedKey = decryptionKeyCache.get(policy.seal_policy_id);
      let decryptionKey = cachedKey;

      if (!decryptionKey) {
        setState((prev) => ({ ...prev, loadingStep: 'Requesting decryption key...', progress: 40 }));
        // No cached key - request from SEAL (requires wallet approval)
        decryptionKey = await requestDecryptionKey(
          policy.seal_policy_id,
          currentAccount!.address,
          {
            signPersonalMessage: (msg: { message: Uint8Array }) =>
              signPersonalMessage({ message: msg.message }),
          }
        );

        // Cache the key
        decryptionKeyCache.set(policy.seal_policy_id, decryptionKey);
      } else {
        setState((prev) => ({ ...prev, loadingStep: 'Using cached key...', progress: 50 }));
      }

      // 4. Download and decrypt blob
      setState((prev) => ({ ...prev, loadingStep: 'Downloading encrypted data...', progress: 60 }));
      const decryptedText = await downloadAndDecryptBlob(
        policy.walrus_blob_id,
        decryptionKey.key,
        decryptionKey.nonce
      );

      // 5. Parse as JSON
      setState((prev) => ({ ...prev, loadingStep: 'Parsing data...', progress: 90 }));
      const data = await parseExperienceData(decryptedText);

      // 6. Calculate expiration
      const expiresAt = decryptionKey.expiresAt
        ? new Date(decryptionKey.expiresAt * 1000)
        : null;

      setState((prev) => ({
        ...prev,
        loading: false,
        canAccess: true,
        accessReason: 'Access granted',
        data,
        decryptedContent: decryptedText,
        expiresAt,
        loadingStep: 'Complete!',
        progress: 100,
      }));
    } catch (error) {
      console.error('Access check failed:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Access denied',
        canAccess: false,
        loadingStep: null,
        progress: 0,
      }));
    }
  }, [experienceId, taskosPackageId, currentAccount, signPersonalMessage]);

  useEffect(() => {
    if (!currentAccount || !experienceId) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Wallet not connected',
      }));
      return;
    }

    checkExperienceAccess();
  }, [currentAccount, experienceId, checkExperienceAccess]);

  const refetchData = useCallback(async () => {
    decryptionKeyCache.clear();
    await checkExperienceAccess();
  }, [checkExperienceAccess]);

  return {
    ...state,
    refetch: refetchData,
  };
}
