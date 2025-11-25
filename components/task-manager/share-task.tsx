"use client";

import { useState } from "react";
import { useSignAndExecuteTransaction, useSuiClient, useCurrentAccount, useSuiClientQuery, useSignPersonalMessage } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { isValidSuiAddress } from "@mysten/sui/utils";
import { fromB64 } from "@mysten/sui/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as nacl from "tweetnacl";

import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ROLE_VIEWER, ROLE_EDITOR, ROLE_OWNER } from "@/types";
import { getWalrusBlob, uploadWalrusFileWithFlow } from "@/utils/walrus";
import { Loader2 } from "lucide-react";

const WALRUS_KEY_MESSAGE = "TaskOS Walrus encryption key";
const ENCRYPTION_TAG = new TextEncoder().encode("TOS-ENC1");
const NONCE_LENGTH = nacl.secretbox.nonceLength;

interface ShareTaskProps {
    taskId: string | undefined;
    onShared?: () => void;
}

export function ShareTask({ taskId, onShared }: ShareTaskProps) {
    const [userAddress, setUserAddress] = useState("");
    const [selectedRole, setSelectedRole] = useState(String(ROLE_VIEWER));
    const [isSharing, setIsSharing] = useState(false);

    const account = useCurrentAccount();
    const suiClient = useSuiClient();
    const queryClient = useQueryClient();
    const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
    const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

    // Fetch task from blockchain
    const { data: taskData } = useSuiClientQuery(
        "getObject",
        {
            id: taskId || "",
            options: {
                showContent: true,
            },
        },
        {
            enabled: !!taskId,
        }
    );

    // Extract task data
    const fields = taskData?.data?.content?.dataType === "moveObject" 
        ? (taskData.data.content.fields as Record<string, unknown>)
        : null;
    
    const existingContentBlobId = (fields?.content_blob_id as string) || "";
    const existingFileBlobIds = (fields?.file_blob_ids as string[]) || [];
    const hasExistingContent = !!(existingContentBlobId || existingFileBlobIds.length > 0);

    // Derive task-based shared encryption key
    const deriveSharedKey = async () => {
        if (!taskId || !fields?.creator) {
            throw new Error("Missing task ID or creator");
        }
        const creatorAddr = String(fields.creator);
        const raw = `${WALRUS_KEY_MESSAGE}:${taskId.toLowerCase()}:${creatorAddr.toLowerCase()}`;
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
        return new Uint8Array(digest);
    };

    // Derive legacy wallet-based key
    const deriveLegacyKey = async () => {
        if (!account) {
            throw new Error("No account connected");
        }
        const message = new TextEncoder().encode(`${WALRUS_KEY_MESSAGE}:${account.address.toLowerCase()}`);
        const { signature } = await signPersonalMessage({ message });
        const signatureBytes = fromB64(signature);
        const digest = await crypto.subtle.digest("SHA-256", signatureBytes);
        return new Uint8Array(digest);
    };

    // Encrypt with new shared format
    const encryptBytes = (bytes: Uint8Array, key: Uint8Array): Uint8Array => {
        const nonce = nacl.randomBytes(NONCE_LENGTH);
        const cipher = nacl.secretbox(bytes, nonce, key);
        if (!cipher) {
            throw new Error("Encryption failed");
        }
        const payload = new Uint8Array(ENCRYPTION_TAG.length + nonce.length + cipher.length);
        payload.set(ENCRYPTION_TAG, 0);
        payload.set(nonce, ENCRYPTION_TAG.length);
        payload.set(cipher, ENCRYPTION_TAG.length + nonce.length);
        return payload;
    };

    // Decrypt with multiple key attempts
    const decryptBytes = (payload: Uint8Array, keys: Uint8Array[]): Uint8Array | null => {
        const hasTag = payload.length > ENCRYPTION_TAG.length + NONCE_LENGTH &&
            ENCRYPTION_TAG.every((byte, idx) => payload[idx] === byte);

        for (const key of keys) {
            const offset = hasTag ? ENCRYPTION_TAG.length : 0;
            if (payload.length <= offset + NONCE_LENGTH) continue;
            
            const nonce = payload.slice(offset, offset + NONCE_LENGTH);
            const cipher = payload.slice(offset + NONCE_LENGTH);
            const plaintext = nacl.secretbox.open(cipher, nonce, key);
            
            if (plaintext) {
                return new Uint8Array(plaintext);
            }
        }
        return null;
    };

    // Re-encrypt existing content with shared key
    const reEncryptContent = async (): Promise<{
        newContentBlobId?: string;
        newFileBlobIds?: string[];
    }> => {
        if (!hasExistingContent) {
            return {};
        }

        console.log("[ShareTask] Re-encrypting content with shared key...");
        
        const sharedKey = await deriveSharedKey();
        const legacyKey = await deriveLegacyKey();
        const keys = [sharedKey, legacyKey];

        let newContentBlobId: string | undefined;
        const newFileBlobIds: string[] = [];

        const signTransactionWithWallet = async (txToSign: Transaction) => {
            const result = await signAndExecuteTransaction({ transaction: txToSign });
            return { digest: result.digest };
        };

        // Re-encrypt content blob
        if (existingContentBlobId) {
            try {
                console.log("[ShareTask] Decrypting content blob:", existingContentBlobId);
                const encryptedBytes = await getWalrusBlob(existingContentBlobId);
                const decryptedBytes = decryptBytes(encryptedBytes, keys);
                
                if (!decryptedBytes) {
                    throw new Error("Failed to decrypt existing content");
                }

                console.log("[ShareTask] Re-encrypting with shared key...");
                const reEncryptedBytes = encryptBytes(decryptedBytes, sharedKey);

                console.log("[ShareTask] Uploading re-encrypted content...");
                const result = await uploadWalrusFileWithFlow(
                    reEncryptedBytes,
                    signTransactionWithWallet,
                    account!.address,
                    { epochs: 5, deletable: true }
                );

                newContentBlobId = result.blobId;
                console.log("[ShareTask] Content re-uploaded:", newContentBlobId);
            } catch (err) {
                console.error("[ShareTask] Failed to re-encrypt content:", err);
                throw new Error("Failed to re-encrypt content. Make sure you're using the creator wallet.");
            }
        }

        // Re-encrypt file blobs
        if (existingFileBlobIds.length > 0) {
            for (let i = 0; i < existingFileBlobIds.length; i++) {
                const blobId = existingFileBlobIds[i];
                try {
                    console.log(`[ShareTask] Decrypting file ${i + 1}/${existingFileBlobIds.length}:`, blobId);
                    const encryptedBytes = await getWalrusBlob(blobId);
                    const decryptedBytes = decryptBytes(encryptedBytes, keys);
                    
                    if (!decryptedBytes) {
                        throw new Error(`Failed to decrypt file ${i + 1}`);
                    }

                    console.log(`[ShareTask] Re-encrypting file ${i + 1}...`);
                    const reEncryptedBytes = encryptBytes(decryptedBytes, sharedKey);

                    console.log(`[ShareTask] Uploading re-encrypted file ${i + 1}...`);
                    const result = await uploadWalrusFileWithFlow(
                        reEncryptedBytes,
                        signTransactionWithWallet,
                        account!.address,
                        { epochs: 5, deletable: true }
                    );

                    newFileBlobIds.push(result.blobId);
                    console.log(`[ShareTask] File ${i + 1} re-uploaded:`, result.blobId);
                } catch (err) {
                    console.error(`[ShareTask] Failed to re-encrypt file ${i + 1}:`, err);
                    throw new Error(`Failed to re-encrypt file ${i + 1}`);
                }
            }
        }

        return { newContentBlobId, newFileBlobIds };
    };

    const shareTask = async () => {
        if (!taskId || !account) return;

        const address = userAddress.trim();

        if (!address) {
            toast.error("Please enter a valid address");
            return;
        }

        if (!isValidSuiAddress(address)) {
            toast.error(`Invalid Sui address: ${address}`);
            return;
        }

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;

        if (!packageId || !versionObjectId) {
            toast.error("Configuration error: Missing package or version ID");
            return;
        }

        setIsSharing(true);

        try {
            const tx = new Transaction();
            
            // Step 1: Re-encrypt existing content if present
            let reEncryptedData: { newContentBlobId?: string; newFileBlobIds?: string[] } = {};
            
            if (hasExistingContent) {
                toast.info("Re-encrypting content for shared access...", {
                    description: "This may take a moment"
                });
                
                try {
                    reEncryptedData = await reEncryptContent();
                    
                    // Update content blob ID if re-encrypted
                    if (reEncryptedData.newContentBlobId) {
                        tx.moveCall({
                            target: `${packageId}::task_manage::add_content`,
                            arguments: [
                                tx.object(versionObjectId),
                                tx.object(taskId),
                                tx.pure.option("string", reEncryptedData.newContentBlobId),
                                tx.object("0x6"),
                            ],
                        });
                    }
                    
                    // Update file blob IDs if re-encrypted
                    if (reEncryptedData.newFileBlobIds && reEncryptedData.newFileBlobIds.length > 0) {
                        tx.moveCall({
                            target: `${packageId}::task_manage::add_files`,
                            arguments: [
                                tx.object(versionObjectId),
                                tx.object(taskId),
                                tx.pure.vector("string", reEncryptedData.newFileBlobIds),
                                tx.object("0x6"),
                            ],
                        });
                    }
                    
                    toast.success("Content re-encrypted successfully!");
                } catch (reEncryptErr) {
                    console.error("[ShareTask] Re-encryption failed:", reEncryptErr);
                    toast.error("Failed to re-encrypt content", {
                        description: reEncryptErr instanceof Error ? reEncryptErr.message : "Unknown error"
                    });
                    setIsSharing(false);
                    return;
                }
            }
            
            // Step 2: Grant access to the user
            tx.moveCall({
                target: `${packageId}::task_manage::add_user_with_role`,
                arguments: [
                    tx.object(versionObjectId), // version: &Version
                    tx.object(taskId), // task: &mut Task
                    tx.pure.address(address), // user: address
                    tx.pure.u8(Number(selectedRole)), // role: u8
                    tx.object("0x6"), // clock: &Clock
                ],
            });

            const resp = await signAndExecuteTransaction({
                transaction: tx,
            });
            
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({
                queryKey: ["testnet", "getObject"],
            });

            const successMessage = hasExistingContent
                ? `Task shared with re-encrypted content! ${getRoleLabel(Number(selectedRole))} access granted to ${address.slice(0, 8)}...`
                : `Task shared successfully! ${getRoleLabel(Number(selectedRole))} access granted to ${address.slice(0, 8)}...`;

            toast.success("Access Granted!", {
                description: successMessage,
            });

            setUserAddress("");
            setSelectedRole(String(ROLE_VIEWER));
            onShared?.();
        } catch (error) {
            console.error("Error sharing task:", error);
            toast.error("Failed to share task", {
                description: error instanceof Error ? error.message : "An unexpected error occurred",
            });
        } finally {
            setIsSharing(false);
        }
    };

    const getRoleLabel = (role: number) => {
        switch (role) {
            case ROLE_VIEWER: return "Viewer";
            case ROLE_EDITOR: return "Editor";
            case ROLE_OWNER: return "Owner";
            default: return "Unknown";
        }
    };

    if (!taskId) return null;

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>Share Task</CardTitle>
            </CardHeader>

            <ScrollArea className="flex-1 px-6">
                <CardContent className="space-y-4 pb-6">
                    {hasExistingContent && (
                        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
                            <div className="flex items-start gap-2">
                                <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-1 mt-0.5">
                                    <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-1">
                                        Auto Re-encryption Enabled
                                    </p>
                                    <p className="text-xs text-blue-800 dark:text-blue-200">
                                        This task has existing content. When you share it, the content will automatically be re-encrypted with a shared key format that allows the new user to decrypt it.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="userAddress">
                            User Address
                        </Label>
                        <Input
                            id="userAddress"
                            value={userAddress}
                            onChange={(e) => setUserAddress(e.target.value)}
                            placeholder="0x123..."
                            disabled={isSharing}
                        />
                        <p className="text-sm text-muted-foreground">
                            Enter the Sui wallet address of the user you want to share with.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Access Role</Label>
                        <Select
                            value={selectedRole}
                            onValueChange={setSelectedRole}
                            disabled={isSharing}
                        >
                            <SelectTrigger id="role">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={String(ROLE_VIEWER)}>
                                    Viewer - Can view task details
                                </SelectItem>
                                <SelectItem value={String(ROLE_EDITOR)}>
                                    Editor - Can edit task and add comments
                                </SelectItem>
                                <SelectItem value={String(ROLE_OWNER)}>
                                    Owner - Full control including sharing
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            Select the level of access for this user.
                        </p>
                    </div>
                </CardContent>
            </ScrollArea>

            <CardFooter className="border-t px-6 py-4">
                <Button
                    onClick={shareTask}
                    disabled={!userAddress.trim() || isSharing}
                    className="w-full"
                >
                    {isSharing ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {hasExistingContent ? "Re-encrypting & Sharing..." : "Sharing..."}
                        </>
                    ) : (
                        hasExistingContent ? "Re-encrypt & Grant Access" : "Grant Access"
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
