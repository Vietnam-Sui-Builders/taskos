// File: frontend/src/services/walrusService.ts
// Purpose: Upload encrypted data to Walrus, retrieve and decrypt

import type { WalrusClient } from "@mysten/walrus";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import * as crypto from "tweetnacl";

interface WalrusUploadResult {
  blobId: string;
  blobSize: number;
  epochs: number;
}

interface WalrusDownloadResult {
  data: Uint8Array;
  decryptedData?: string;
}

// Initialize Walrus client (read-only by default)
const suiClient = new SuiClient({
  url: process.env.NEXT_PUBLIC_SUI_RPC_URL || getFullnodeUrl("testnet"),
});

let walrusClientPromise: Promise<WalrusClient> | null = null;

async function getWalrusClient(): Promise<WalrusClient> {
  if (typeof window === "undefined") {
    throw new Error("Walrus client is only available in the browser");
  }

  if (!walrusClientPromise) {
    walrusClientPromise = import("@mysten/walrus").then(
      ({ WalrusClient }) =>
        new WalrusClient({
          network: "testnet",
          suiClient,
        })
    );
  }

  return walrusClientPromise;
}

/**
 * Encrypt data on client-side using symmetric encryption (NaCl Secret Box)
 * Returns: { encryptedData, nonce, key }
 */
export async function encryptDataClient(
  plaintext: string | Buffer
): Promise<{
  encryptedData: Uint8Array;
  nonce: Uint8Array;
  key: Uint8Array;
}> {
  // Generate random key and nonce
  const key = crypto.randomBytes(32); // 256-bit key for SecretBox
  const nonce = crypto.randomBytes(24); // 24-byte nonce

  // Convert plaintext to buffer if string
  const plaintextBytes =
    typeof plaintext === 'string' ? new TextEncoder().encode(plaintext) : plaintext;

  // Encrypt using NaCl SecretBox
  const encryptedData = crypto.secretbox(plaintextBytes, nonce, key);

  if (!encryptedData) {
    throw new Error('Encryption failed');
  }

  return {
    encryptedData,
    nonce,
    key,
  };
}

/**
 * Decrypt data on client-side using symmetric encryption
 */
export async function decryptDataClient(
  encryptedData: Uint8Array,
  nonce: Uint8Array,
  key: Uint8Array
): Promise<string> {
  const decrypted = crypto.secretbox.open(encryptedData, nonce, key);

  if (!decrypted) {
    throw new Error('Decryption failed - key or nonce invalid');
  }

  return new TextDecoder().decode(decrypted);
}

/**
 * Store encrypted blob on Walrus
 * Client-side encryption ensures Walrus nodes never see plaintext
 */
export async function uploadEncryptedBlob(
  plaintext: string | Buffer,
  epochs: number = 3
): Promise<{
  blobId: string;
  encryptionKey: string; // hex-encoded key to store in SEAL
  nonce: string; // hex-encoded nonce to store in SEAL
}> {
  try {
    // 1. Encrypt on client
    const { encryptedData, nonce, key } = await encryptDataClient(plaintext);

    // 2. Upload encrypted blob to Walrus requires a signer; not wired in this frontend build.
    //    For now, surface a clear error so build succeeds without @hibernuts/walrus-sdk.
    throw new Error(
      "Walrus upload requires a signer; integrate @mysten/walrus writeBlob with a wallet signer or use a backend uploader."
    );

    // If you integrate a signer, use:
    // const { blobId } = await walrusClient.writeBlob({
    //   blob: Buffer.from(encryptedData),
    //   deletable: true,
    //   epochs,
    //   signer,
    // });
    // return { blobId, encryptionKey: Buffer.from(key).toString('hex'), nonce: Buffer.from(nonce).toString('hex') };
  } catch (error) {
    console.error("Walrus upload failed:", error);
    throw new Error(`Failed to upload blob: ${(error as Error).message}`);
  }
}

/**
 * Retrieve and decrypt blob from Walrus
 * Requires encryption key + nonce (obtained from SEAL after access check)
 */
export async function downloadAndDecryptBlob(
  blobId: string,
  encryptionKeyHex: string,
  nonceHex: string,
  retries: number = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempting to download blob ${blobId} (attempt ${attempt}/${retries})`);

      // 1. Download encrypted blob from Walrus
      const client = await getWalrusClient();
      const encryptedData = await client.readBlob({ blobId });

      // 2. Decode encryption metadata
      const encryptionKey = new Uint8Array(Buffer.from(encryptionKeyHex, 'hex'));
      const nonce = new Uint8Array(Buffer.from(nonceHex, 'hex'));

      // 3. Decrypt on client
      const decryptedText = await decryptDataClient(encryptedData, nonce, encryptionKey);

      console.log(`✓ Blob decrypted successfully`);
      return decryptedText;
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `Attempt ${attempt} failed: ${lastError.message}. Retrying in 2s...`
      );

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  throw new Error(
    `Failed to download and decrypt blob after ${retries} attempts: ${lastError?.message}`
  );
}

/**
 * Batch download multiple blobs
 */
export async function downloadMultipleBlobs(
  blobIds: Array<{ id: string; keyHex: string; nonceHex: string }>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const blob of blobIds) {
    try {
      const decrypted = await downloadAndDecryptBlob(
        blob.id,
        blob.keyHex,
        blob.nonceHex
      );
      results.set(blob.id, decrypted);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to fetch blob ${blob.id}:`, error);
      results.set(blob.id, `ERROR: ${message}`);
    }
  }

  return results;
}

/**
 * Estimate storage cost for blob
 */
export async function estimateStorageCost(
  dataSize: number,
  epochs: number = 3
): Promise<number> {
  // Rough estimate: ~0.1 WAL per MB per epoch
  // This is approximate and should be verified with actual Walrus pricing
  const costPerMBPerEpoch = 0.1;
  const sizeMB = dataSize / (1024 * 1024);
  const totalCost = sizeMB * epochs * costPerMBPerEpoch;
  return totalCost;
}

/**
 * Parse stored blob metadata JSON (after decryption)
 */
export async function parseExperienceData(
  decryptedJson: string
): Promise<any> {
  try {
    return JSON.parse(decryptedJson);
  } catch (error) {
    console.error('Failed to parse experience data JSON:', error);
    throw new Error('Invalid experience data format');
  }
}
