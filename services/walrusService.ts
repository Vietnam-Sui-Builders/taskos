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

// Walrus aggregator configuration
const WALRUS_AGGREGATOR = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR;
const WALRUS_PUBLISHER = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER;

let walrusClientPromise: Promise<WalrusClient> | null = null;

async function getWalrusClient(): Promise<WalrusClient> {
  if (typeof window === "undefined") {
    throw new Error("Walrus client is only available in the browser");
  }

  if (!walrusClientPromise) {
    walrusClientPromise = import("@mysten/walrus").then(
      ({ WalrusClient }) => {
        const config: any = {
          network: "testnet",
          suiClient,
        };

        // Use custom aggregator if configured
        if (WALRUS_AGGREGATOR) {
          config.aggregator = WALRUS_AGGREGATOR;
        }

        if (WALRUS_PUBLISHER) {
          config.publisher = WALRUS_PUBLISHER;
        }

        return new WalrusClient(config);
      }
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
  // Validate inputs
  if (!encryptedData || encryptedData.length === 0) {
    throw new Error('Decryption failed: encrypted data is empty');
  }
  
  if (!key || key.length !== 32) {
    throw new Error(`Decryption failed: invalid key length (expected 32, got ${key?.length || 0})`);
  }
  
  if (!nonce || nonce.length !== 24) {
    throw new Error(`Decryption failed: invalid nonce length (expected 24, got ${nonce?.length || 0})`);
  }

  console.log(`🔓 Decrypting ${encryptedData.length} bytes...`);
  console.log(`   Key length: ${key.length}, Nonce length: ${nonce.length}`);

  const decrypted = crypto.secretbox.open(encryptedData, nonce, key);

  if (!decrypted) {
    console.error('❌ Decryption failed - possible causes:');
    console.error('   1. Key/nonce mismatch (data encrypted with different keys)');
    console.error('   2. Mock mode enabled but trying to decrypt real data');
    console.error('   3. Corrupted encrypted data');
    console.error('   4. Wrong SEAL policy or blob ID');
    
    throw new Error(
      'Decryption failed - key or nonce invalid. ' +
      'This usually means the data was encrypted with different keys than provided. ' +
      'If using mock mode (NEXT_PUBLIC_ENABLE_MOCK_SEAL=true), you cannot decrypt real encrypted data. ' +
      'Set NEXT_PUBLIC_ENABLE_MOCK_SEAL=false and configure NEXT_PUBLIC_SEAL_KEY_SERVER to use real SEAL.'
    );
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

  // Pre-decode encryption metadata (do this once, not in retry loop)
  const encryptionKey = new Uint8Array(Buffer.from(encryptionKeyHex, 'hex'));
  const nonce = new Uint8Array(Buffer.from(nonceHex, 'hex'));

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📥 Downloading blob ${blobId.substring(0, 8)}... (attempt ${attempt}/${retries})`);
      const startTime = Date.now();

      // 1. Download encrypted blob from Walrus
      const client = await getWalrusClient();
      const encryptedData = await client.readBlob({ blobId });
      
      const downloadTime = Date.now() - startTime;
      console.log(`✓ Downloaded in ${downloadTime}ms (${encryptedData.length} bytes)`);

      // 2. Decrypt on client (fast, local operation)
      const decryptStartTime = Date.now();
      const decryptedText = await decryptDataClient(encryptedData, nonce, encryptionKey);
      
      const decryptTime = Date.now() - decryptStartTime;
      console.log(`✓ Decrypted in ${decryptTime}ms`);
      console.log(`✅ Total time: ${downloadTime + decryptTime}ms`);
      
      return decryptedText;
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message || String(error);
      
      // Check for SSL certificate errors
      if (errorMessage.includes('ERR_CERT_AUTHORITY_INVALID') || 
          errorMessage.includes('certificate') ||
          errorMessage.includes('SSL')) {
        console.error('❌ SSL Certificate Error: Walrus aggregator has invalid certificate');
        throw new Error(
          'Walrus storage is using a development server with an invalid SSL certificate. ' +
          'This is a known issue with testnet. Please configure NEXT_PUBLIC_WALRUS_AGGREGATOR ' +
          'with a valid aggregator URL, or contact the administrator.'
        );
      }
      
      console.warn(`❌ Attempt ${attempt} failed: ${errorMessage}`);

      if (attempt < retries) {
        // Exponential backoff: 500ms, 1s, 2s
        const delay = Math.min(500 * Math.pow(2, attempt - 1), 2000);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Provide helpful error message
  let errorMsg = `Failed to download and decrypt blob after ${retries} attempts`;
  if (lastError?.message) {
    errorMsg += `: ${lastError.message}`;
    
    // Add helpful hints for common errors
    if (lastError.message.includes('404') || lastError.message.includes('not found')) {
      errorMsg += '\n\nThe blob may not exist or has expired. Please verify the blob ID.';
    } else if (lastError.message.includes('network') || lastError.message.includes('fetch')) {
      errorMsg += '\n\nNetwork error. Please check your internet connection and try again.';
    }
  }

  throw new Error(errorMsg);
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
