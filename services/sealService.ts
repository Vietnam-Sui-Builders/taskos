
// File: frontend/src/services/sealService.ts
// Purpose: Query SEAL policies, request decryption keys, manage access

import { SuiClient, getFullnodeUrl, type SuiEvent } from "@mysten/sui/client";

interface SEALPolicy {
  id: string;
  experience_id: string;
  policy_type: 0 | 1 | 2; // 0=private, 1=allowlist, 2=subscription
  owner: string;
  walrus_blob_id: string;
  seal_policy_id: string;
  allowlist?: string[];
  subscription_product_id?: string;
  created_at: number;
}

interface DecryptionKeyResponse {
  key: string; // hex-encoded symmetric key
  nonce: string; // hex-encoded nonce
  sessionId?: string; // for subscription, TTL-based session
  expiresAt?: number; // timestamp when key expires
}

interface AccessCheckResult {
  canAccess: boolean;
  reason: string;
  policyType: 0 | 1 | 2;
}

// Initialize Sui client
const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

// SEAL key server configuration
const SEAL_KEY_SERVER = process.env.REACT_APP_SEAL_KEY_SERVER || 'https://seal.walrus.space';

/**
 * Fetch SEAL policy from Sui for an experience asset
 */
export async function getSEALPolicy(
  experienceId: string,
  taskosPackageId: string
): Promise<SEALPolicy> {
  try {
    // Query Sui RPC for SEALPolicy object
    const response = await suiClient.queryEvents({
      query: {
        // Filter for the SEALPolicyCreated move event in the provided package
        MoveEventType: `${taskosPackageId}::seal_integration::SEALPolicyCreated`,
      },
      limit: 100,
    });

    // Find matching policy event
    const policyEvent = response.data.find((event: SuiEvent) => {
      const parsed = event.parsedJson as { experience_id?: string } | undefined;
      return parsed?.experience_id === experienceId;
    });

    if (!policyEvent) {
      throw new Error(`No SEAL policy found for experience ${experienceId}`);
    }

    const policyJson = policyEvent.parsedJson as {
      policy_id: string;
      experience_id: string;
      policy_type: 0 | 1 | 2;
      owner: string;
      walrus_blob_id: string;
      seal_policy_id: string;
      created_at: number;
      allowlist?: string[];
      subscription_product_id?: string;
    };

    return {
      id: policyJson.policy_id,
      experience_id: policyJson.experience_id,
      policy_type: policyJson.policy_type,
      owner: policyJson.owner,
      walrus_blob_id: policyJson.walrus_blob_id,
      seal_policy_id: policyJson.seal_policy_id,
      created_at: policyJson.created_at,
    };
  } catch (error) {
    console.error('Failed to fetch SEAL policy:', error);
    throw error;
  }
}

/**
 * Check if user has access to experience data based on SEAL policy
 */
export async function checkAccess(
  policy: SEALPolicy,
  userAddress: string
): Promise<AccessCheckResult> {
  const policyType = policy.policy_type;

  // Private (0): Only owner
  if (policyType === 0) {
    const canAccess = userAddress.toLowerCase() === policy.owner.toLowerCase();
    return {
      canAccess,
      reason: canAccess ? 'You are the owner' : 'Only owner can access',
      policyType: 0,
    };
  }

  // Allowlist (1): Check if user in allowlist
  if (policyType === 1) {
    // Fetch allowlist from on-chain event or cache
    const allowlist = policy.allowlist || [];
    const canAccess = allowlist.some(
      (addr) => addr.toLowerCase() === userAddress.toLowerCase()
    );
    return {
      canAccess,
      reason: canAccess
        ? 'You are in the allowlist'
        : 'You are not authorized for this data',
      policyType: 1,
    };
  }

  // Subscription (2): Check subscription status on-chain
  if (policyType === 2) {
    const hasSubscription = await checkSubscriptionStatus(
      policy.subscription_product_id,
      userAddress
    );
    return {
      canAccess: hasSubscription,
      reason: hasSubscription
        ? 'Your subscription is active'
        : 'Subscription required or expired',
      policyType: 2,
    };
  }

  return {
    canAccess: false,
    reason: 'Unknown policy type',
    policyType: 0,
  };
}

/**
 * Request decryption key from SEAL key server
 * User must approve in wallet (session key flow)
 */
export async function requestDecryptionKey(
  sealPolicyId: string,
  userAddress: string,
  wallet: any // Sui wallet object
): Promise<DecryptionKeyResponse> {
  try {
    // 1. Prepare request message
    const requestMessage = {
      policy_id: sealPolicyId,
      user: userAddress,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(7),
    };

    // 2. User signs message with wallet
    const signedMessage = await wallet.signPersonalMessage({
      message: new TextEncoder().encode(JSON.stringify(requestMessage)),
    });

    console.log('User approved decryption key request');

    // 3. Send signed request to SEAL key server
    const response = await fetch(`${SEAL_KEY_SERVER}/v1/decrypt_key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        policy_id: sealPolicyId,
        user_address: userAddress,
        signed_message: signedMessage,
        request: requestMessage,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`SEAL key server error: ${error.message}`);
    }

    const keyResponse = await response.json();

    console.log('✓ Decryption key received from SEAL');

    return {
      key: keyResponse.key, // hex-encoded
      nonce: keyResponse.nonce, // hex-encoded
      sessionId: keyResponse.session_id,
      expiresAt: keyResponse.expires_at,
    };
  } catch (error) {
    console.error('Failed to request decryption key:', error);
    throw error;
  }
}

/**
 * Check if user has active subscription (for subscription-type policies)
 */
export async function checkSubscriptionStatus(
  subscriptionProductId: string | undefined,
  userAddress: string
): Promise<boolean> {
  if (!subscriptionProductId) {
    return false;
  }

  try {
    // Query Sui for user's subscription NFT or contract state
    const response = await suiClient.getOwnedObjects({
      owner: userAddress,
      filter: {
        MatchAny: [
          {
            StructType: subscriptionProductId,
          },
        ],
      },
      limit: 1,
    });

    return response.data.length > 0;
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return false;
  }
}

/**
 * Update allowlist (add user - called by backend after purchase)
 * Note: In production, this would be called by backend via event listener
 */
export async function updateAllowlist(
  policyId: string,
  action: 'add' | 'remove',
  addressToUpdate: string,
  adminWallet: any
): Promise<void> {
  try {
    // This is an admin-only operation
    // Called by backend or DAO after purchase event
    const method =
      action === 'add'
        ? 'seal_integration::add_to_allowlist'
        : 'seal_integration::remove_from_allowlist';

    console.log(
      `[Backend] Updating allowlist: ${action} ${addressToUpdate} to policy ${policyId}`
    );

    // Would be executed as a transaction via admin wallet
    // For now, this is a placeholder for backend implementation
  } catch (error) {
    console.error(`Failed to ${action} address to allowlist:`, error);
    throw error;
  }
}

/**
 * Get policy type display name
 */
export function getPolicyTypeLabel(policyType: 0 | 1 | 2): string {
  const labels = {
    0: 'Private (Owner only)',
    1: 'Allowlist (Team/Approved)',
    2: 'Subscription (Pay-per-view)',
  };
  return labels[policyType];
}

/**
 * Revoke access to user (subscription expiry or removal from allowlist)
 * Note: In production, called by backend
 */
export async function revokeAccess(
  policyId: string,
  userAddress: string
): Promise<void> {
  console.log(`[Backend] Revoking access for ${userAddress} from policy ${policyId}`);
  // Backend updates SEAL policy, removing user from allowlist or subscription
}

/**
 * Get remaining time for subscription access
 */
export async function getAccessExpiration(
  decryptionKey: DecryptionKeyResponse
): Promise<{ expiresAt: Date | null; remainingMs: number }> {
  if (!decryptionKey.expiresAt) {
    return { expiresAt: null, remainingMs: Infinity };
  }

  const expiresAt = new Date(decryptionKey.expiresAt * 1000);
  const remainingMs = decryptionKey.expiresAt * 1000 - Date.now();

  return { expiresAt, remainingMs };
}

/**
 * Session management - cache decryption keys temporarily
 */
class DecryptionKeyCache {
  private cache = new Map<string, DecryptionKeyResponse & { expiresAt: number }>();

  set(policyId: string, key: DecryptionKeyResponse): void {
    const expiresAt = key.expiresAt || Date.now() + 3600000; // 1 hour default TTL
    this.cache.set(policyId, { ...key, expiresAt });
  }

  get(policyId: string): DecryptionKeyResponse | null {
    const cached = this.cache.get(policyId);

    // Check if expired
    if (cached && cached.expiresAt < Date.now()) {
      this.cache.delete(policyId);
      return null;
    }

    return cached || null;
  }

  clear(policyId?: string): void {
    if (policyId) {
      this.cache.delete(policyId);
    } else {
      this.cache.clear();
    }
  }
}

export const decryptionKeyCache = new DecryptionKeyCache();
