/**
 * Debug script to test content decryption with different keys
 */

import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { getWalrusBlob } from "../utils/walrus";

const TASK_ID = "0x3033e3eb16d41528ca83a8c91416e1461d0723e2d3c8cc497d0a355b31dccd4f";
const CREATOR = "0x70b56e23fff713cc617cc8e14f3c947e9ee9ced42547fcd952b69df4bee32f70";
const WALRUS_KEY_MESSAGE = "TaskOS Walrus encryption key";

async function testDecryption() {
    const client = new SuiClient({ url: getFullnodeUrl("testnet") });

    console.log("=".repeat(80));
    console.log("Testing Content Decryption");
    console.log("=".repeat(80));

    // 1. Get the task object
    const taskObj = await client.getObject({
        id: TASK_ID,
        options: {
            showContent: true,
        },
    });

    if (taskObj.data?.content?.dataType !== "moveObject") {
        console.error("Invalid task data");
        return;
    }

    const fields = taskObj.data.content.fields as Record<string, unknown>;
    const contentBlobId = fields.content_blob_id as string;

    if (!contentBlobId) {
        console.log("No content blob ID found");
        return;
    }

    console.log("\n📦 Task Info:");
    console.log("Task ID:", TASK_ID);
    console.log("Creator:", CREATOR);
    console.log("Content Blob ID:", contentBlobId);

    // 2. Fetch the encrypted content
    console.log("\n🔍 Fetching encrypted content from Walrus...");
    const encryptedBytes = await getWalrusBlob(contentBlobId);
    console.log("Encrypted size:", encryptedBytes.length, "bytes");
    console.log("First 50 bytes (hex):", Buffer.from(encryptedBytes.slice(0, 50)).toString('hex'));

    // 3. Check for encryption tag
    const ENCRYPTION_TAG = new TextEncoder().encode("TOS-ENC1");
    const hasTag = encryptedBytes.length > ENCRYPTION_TAG.length &&
        ENCRYPTION_TAG.every((byte, idx) => encryptedBytes[idx] === byte);
    
    console.log("\n🏷️  Encryption Format:");
    console.log("Has TOS-ENC1 tag:", hasTag);

    if (hasTag) {
        console.log("Format: Tagged (new format)");
        console.log("Structure: [TOS-ENC1 tag (8 bytes) | nonce (24 bytes) | ciphertext]");
    } else {
        console.log("Format: Untagged (legacy format or plaintext)");
        console.log("Possible structure: [nonce (24 bytes) | ciphertext] or plaintext");
    }

    // 4. Derive task-based key
    console.log("\n🔑 Deriving task-based encryption key...");
    const raw = `${WALRUS_KEY_MESSAGE}:${TASK_ID.toLowerCase()}:${CREATOR.toLowerCase()}`;
    console.log("Key derivation input:", raw);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const taskKey = new Uint8Array(digest);
    console.log("Task-based key (hex):", Buffer.from(taskKey).toString('hex'));

    // 5. Try to decrypt with task-based key
    console.log("\n🔓 Attempting decryption with task-based key...");
    try {
        const nacl = await import("tweetnacl");
        const NONCE_LENGTH = nacl.secretbox.nonceLength; // 24
        
        let nonce: Uint8Array;
        let ciphertext: Uint8Array;
        
        if (hasTag) {
            nonce = encryptedBytes.slice(ENCRYPTION_TAG.length, ENCRYPTION_TAG.length + NONCE_LENGTH);
            ciphertext = encryptedBytes.slice(ENCRYPTION_TAG.length + NONCE_LENGTH);
        } else {
            nonce = encryptedBytes.slice(0, NONCE_LENGTH);
            ciphertext = encryptedBytes.slice(NONCE_LENGTH);
        }
        
        console.log("Nonce (hex):", Buffer.from(nonce).toString('hex'));
        console.log("Ciphertext size:", ciphertext.length, "bytes");
        
        const decrypted = nacl.secretbox.open(ciphertext, nonce, taskKey);
        
        if (decrypted) {
            const content = new TextDecoder().decode(decrypted);
            console.log("✅ SUCCESS! Decrypted content:");
            console.log("─".repeat(80));
            console.log(content);
            console.log("─".repeat(80));
        } else {
            console.log("❌ FAILED: decryption returned null");
            console.log("This means the key is incorrect for this encrypted data");
        }
    } catch (err) {
        console.error("❌ FAILED with error:", err);
    }

    console.log("\n" + "=".repeat(80));
}

testDecryption().catch(console.error);
