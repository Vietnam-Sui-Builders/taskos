// File: frontend/src/hooks/useExperienceAccess.ts
// Purpose: React hook to manage experience data access flow

import { useState, useEffect } from 'react';
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
  });

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
  }, [currentAccount?.address, experienceId]);

  const checkExperienceAccess = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      // 1. Fetch SEAL policy
      const policy = await getSEALPolicy(experienceId, taskosPackageId);

      // 2. Check if user has access
      const accessCheck = await checkAccess(policy, currentAccount!.address);

      if (!accessCheck.canAccess) {
        setState((prev) => ({
          ...prev,
          loading: false,
          canAccess: false,
          accessReason: accessCheck.reason,
        }));
        return;
      }

      // 3. User has access - request decryption key
      const cachedKey = decryptionKeyCache.get(policy.seal_policy_id);
      let decryptionKey = cachedKey;

      if (!decryptionKey) {
        // No cached key - request from SEAL (requires wallet approval)
        decryptionKey = await requestDecryptionKey(
          policy.seal_policy_id,
          currentAccount!.address,
          {
            signPersonalMessage: (msg) =>
              signPersonalMessage({ message: msg.message }),
          }
        );

        // Cache the key
        decryptionKeyCache.set(policy.seal_policy_id, decryptionKey);
      }

      // 4. Download and decrypt blob
      const decryptedText = await downloadAndDecryptBlob(
        policy.walrus_blob_id,
        decryptionKey.key,
        decryptionKey.nonce
      );

      // 5. Parse as JSON
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
      }));
    } catch (error) {
      console.error('Access check failed:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Access denied',
        canAccess: false,
      }));
    }
  };

  const refetchData = async () => {
    decryptionKeyCache.clear();
    await checkExperienceAccess();
  };

  return {
    ...state,
    refetch: refetchData,
  };
}
