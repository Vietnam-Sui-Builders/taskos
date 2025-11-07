import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

// Walrus testnet gateway base URL
const WALRUS_TESTNET_GATEWAY = "https://gateway.walrus-testnet.walrus.space";

// Create Sui client for testnet
export const suiClient = new SuiClient({
  url: getFullnodeUrl("testnet"),
});

// Lazy initialize Walrus client only on client-side to avoid SSR issues
let _walrusClient: any = null;

export const getWalrusClient = async () => {
  if (typeof window === "undefined") {
    throw new Error("Walrus client can only be initialized on the client side");
  }
  if (!_walrusClient) {
    // Dynamic import to avoid SSR
    const { WalrusClient } = await import("@mysten/walrus");
    _walrusClient = new WalrusClient({
      network: "testnet",
      suiClient,
      uploadRelay: {
        timeout: 600_000,
        host: "https://upload-relay.testnet.walrus.space",
        sendTip: {
          max: 1_000,
        },
      },
    });
  }
  return _walrusClient;
};

/**
 * Result of uploading a file to Walrus
 */
export interface UploadWalrusFileResult {
  /** The blob ID that can be used to retrieve the file */
  blobId: string;
  /** The size of the uploaded file in bytes */
  size: number;
}

/**
 * Upload file to Walrus using the WriteFilesFlow (requires transaction signing)
 * NOTE: This function requires wallet integration and only works client-side
 */
export async function uploadWalrusFileWithFlow(
  bytes: Uint8Array,
  signTransaction: (tx: any) => Promise<{ digest: string }>,
  ownerAddress: string,
  options?: { epochs?: number; deletable?: boolean }
): Promise<UploadWalrusFileResult> {
  const epochs = options?.epochs || 5;
  const deletable = options?.deletable !== false;

  try {
    console.log("[Walrus] Initializing upload flow", {
      size: bytes.length,
      epochs,
      deletable,
    });
    // Get Walrus client (client-side only)
    const walrusClient = await getWalrusClient();
    console.log("[Walrus] WalrusClient ready", {
      network: "testnet",
    });

    // Dynamic import of WalrusFile
    const { WalrusFile } = await import("@mysten/walrus");

    // Create WalrusFile
    const files = [
      WalrusFile.from({
        contents: bytes,
        identifier: "vault-data",
      }),
    ];

    // Create WriteFilesFlow
    const flow = walrusClient.writeFilesFlow({ files });

    // Step 1: Encode file (compute metadata)
    console.log("[Walrus] Encoding file");
    await flow.encode();

    // Step 2: Register blob on-chain
    const registerTx = flow.register({
      epochs,
      deletable,
      owner: ownerAddress,
    });
    console.log("[Walrus] Awaiting register signature");

    const { digest: registerDigest } = await signTransaction(registerTx);
    console.log("[Walrus] Register transaction signed", { registerDigest });

    // Step 3: Upload data to storage nodes via relay
    console.log("[Walrus] Uploading data via relay");
    await flow.upload({ digest: registerDigest });
    console.log("[Walrus] Upload completed");

    // Step 4: Certify blob on-chain
    const certifyTx = flow.certify();
    console.log("[Walrus] Awaiting certify signature");
    await signTransaction(certifyTx);
    console.log("[Walrus] Certify transaction signed");

    // Get the uploaded files info
    const uploadedFiles = await flow.listFiles();
    const blobId = uploadedFiles[0]?.blobId;

    if (!blobId) {
      throw new Error("Failed to get blob ID from upload result");
    }

    return {
      blobId,
      size: bytes.length,
    };
  } catch (error) {
    console.error("[Walrus] Upload flow failed", error);
    if (error instanceof Error) {
      throw new Error(`Walrus upload flow failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Download file from Walrus using WalrusClient
 * Since we upload using WriteFilesFlow, the blob is a quilt containing files
 * We need to get the blob, then extract the file from it
 */
async function getWalrusBlobViaClient(blobId: string): Promise<Uint8Array> {
  const cleanBlobId = blobId.trim();
  if (!cleanBlobId || cleanBlobId.length === 0) {
    throw new Error("Empty blob ID provided");
  }

  try {
    const walrusClient = await getWalrusClient();

    // Try getBlob + files() for quilts (WriteFilesFlow creates quilts)
    try {
      const blob = await walrusClient.getBlob({ blobId: cleanBlobId });
      const files = await blob.files();
      if (files.length === 0) {
        throw new Error("No files found in blob");
      }
      // Use the first file
      const file = files[0];

      // Read the file contents using bytes() method
      const data = await (file as any).bytes();
      return new Uint8Array(data);
    } catch (quiltError) {
      // Fallback to readBlob for simple blobs
      const data = await walrusClient.readBlob({ blobId: cleanBlobId });
      return data;
    }
  } catch (error) {
    // Check if it's a retryable error
    const { RetryableWalrusClientError } = await import("@mysten/walrus");
    if (error instanceof RetryableWalrusClientError) {
      const walrusClient = await getWalrusClient();
      walrusClient.reset();
      // Retry with getBlob method
      try {
        const blob = await walrusClient.getBlob({ blobId: cleanBlobId });
        const files = await blob.files();
        const file = files[0];
        const data = await (file as any).bytes();
        return new Uint8Array(data);
      } catch (retryError) {
        // Fallback to readBlob on retry
        const data = await walrusClient.readBlob({ blobId: cleanBlobId });
        return data;
      }
    }
    throw error;
  }
}

/**
 * Download file from Walrus via aggregator (HTTP fallback)
 */
async function getWalrusBlobViaAggregator(blobId: string): Promise<Uint8Array> {
  const cleanBlobId = blobId.trim();
  const aggregatorUrl = `https://aggregator.walrus-testnet.walrus.space/v1/${cleanBlobId}`;

  const response = await fetch(aggregatorUrl);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Aggregator download failed: ${response.status} - ${errorText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Download file from Walrus via gateway URL (fallback)
 */
async function getWalrusBlobViaGateway(blobId: string): Promise<Uint8Array> {
  const cleanBlobId = blobId.trim();
  const gatewayUrl = `${WALRUS_TESTNET_GATEWAY}/v1/${cleanBlobId}`;

  const response = await fetch(gatewayUrl);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gateway download failed: ${response.status} - ${errorText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Retrieves a file from Walrus testnet by blob ID
 *
 * @param blobId - The blob ID returned from uploadWalrusFile
 * @returns Promise resolving to file data as Uint8Array
 */
export async function getWalrusBlob(blobId: string): Promise<Uint8Array> {
  if (!blobId || typeof blobId !== "string") {
    throw new Error("Invalid blob ID: not a string");
  }

  const cleanBlobId = blobId.trim();
  if (cleanBlobId.length === 0) {
    throw new Error("Invalid blob ID: empty string");
  }

  // Try SDK first (recommended), then fallback to HTTP endpoints
  try {
    return await getWalrusBlobViaClient(cleanBlobId);
  } catch (sdkError) {
    try {
      return await getWalrusBlobViaAggregator(cleanBlobId);
    } catch (aggregatorError) {
      try {
        return await getWalrusBlobViaGateway(cleanBlobId);
      } catch (gatewayError) {
        throw new Error(
          `Failed to retrieve file from Walrus after trying all methods: ${
            gatewayError instanceof Error
              ? gatewayError.message
              : "Unknown error"
          }`
        );
      }
    }
  }
}

/**
 * Get the blobObjectId (Sui object ID) for a blob given its blobId
 * This queries the Sui blockchain to find the blob metadata object
 */
export async function getBlobObjectId(
  blobId: string,
  ownerAddress: string
): Promise<string | null> {
  try {
    // Query Sui for blob objects owned by the address
    // Walrus blobs are stored as blob metadata objects
    const objects = await suiClient.getOwnedObjects({
      owner: ownerAddress,
      options: {
        showContent: true,
      },
    });

    // Find the object that matches our blobId
    for (const obj of objects.data || []) {
      if (obj.data?.content && obj.data.content.dataType === "moveObject") {
        const fields = (obj.data.content as any).fields;
        // The blobId is stored in the id field
        if (fields?.id === blobId) {
          return obj.data.objectId;
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Delete a blob from Walrus
 * This reclaims storage for the remaining period and burns the blob metadata NFT
 * @param blobId - The blob ID to delete
 * @param ownerAddress - The owner address (must match the blob owner)
 * @param signAndExecute - Function to sign and execute transactions
 */
export async function deleteWalrusBlob(
  blobId: string,
  ownerAddress: string,
  signAndExecute: (params: { transaction: any }) => Promise<{ digest: string }>
): Promise<void> {
  try {
    const walrusClient = await getWalrusClient();

    // Get the blobObjectId first
    const blobObjectId = await getBlobObjectId(blobId, ownerAddress);

    if (!blobObjectId) {
      // Blob object not found, might have been already deleted
      return;
    }

    // Use deleteBlobTransaction to create a transaction that deletes the blob
    // This will burn the blob metadata NFT and reclaim storage
    const deleteTx = await walrusClient.deleteBlobTransaction({
      blobObjectId,
      owner: ownerAddress,
    });

    // Sign and execute the delete transaction
    const result = await signAndExecute({ transaction: deleteTx });

    // Wait for the transaction to complete
    await suiClient.waitForTransaction({ digest: result.digest });
  } catch (error) {
    // Don't throw - we don't want to fail the whole operation if deletion fails
    // The blob will expire naturally anyway
  }
}

/**
 * Gets the gateway URL for a Walrus blob
 * This URL can be used to access the blob directly via HTTP
 *
 * @param blobId - The blob ID
 * @returns The full gateway URL for the blob
 */
export function getWalrusGatewayUrl(blobId: string): string {
  if (!blobId || typeof blobId !== "string") {
    throw new Error("Invalid blob ID");
  }
  return `${WALRUS_TESTNET_GATEWAY}/blob/${blobId}`;
}

/**
 * Gets the blob URL for viewing/downloading
 * @param blobId - The blob ID
 * @returns The aggregator URL for the blob
 */
export function getBlobUrl(blobId: string): string {
  return `https://aggregator.walrus-testnet.walrus.space/v1/${blobId}`;
}

/**
 * Format file size to human readable format
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
