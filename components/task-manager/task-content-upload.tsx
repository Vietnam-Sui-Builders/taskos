"use client";

import { useState, useEffect, useMemo } from "react";
import { useSignAndExecuteTransaction, useSuiClient, useCurrentAccount, useSuiClientQuery, useSignPersonalMessage } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { fromB64 } from "@mysten/sui/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SerializedEditorState } from "lexical";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { Editor } from "@/components/blocks/editor-md/editor";
import { Loader2, Upload, File, FileText, Paperclip, Copy, ExternalLink, Download, Eye } from "lucide-react";
import { uploadWalrusFileWithFlow, formatFileSize, getWalrusBlob } from "@/utils/walrus";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog";
import * as nacl from "tweetnacl";

interface TaskContentUploadProps {
    taskId?: string;
}

const WALRUS_KEY_MESSAGE = "TaskOS Walrus encryption key";
const ENCRYPTION_TAG = new TextEncoder().encode("TOS-ENC1");
const NONCE_LENGTH = nacl.secretbox.nonceLength;

export const TaskContentUpload = ({ taskId }: TaskContentUploadProps) => {
    const [content, setContent] = useState("");
    const [editorState, setEditorState] = useState<SerializedEditorState>({
        root: {
            children: [
                {
                    children: [],
                    direction: "ltr",
                    format: "",
                    indent: 0,
                    type: "paragraph",
                    version: 1,
                },
            ],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "root",
            version: 1,
        },
    } as unknown as SerializedEditorState);
    const [files, setFiles] = useState<FileList | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [decryptedContent, setDecryptedContent] = useState<string>("");
    const [decryptedFiles, setDecryptedFiles] = useState<
        Array<{ name: string; url: string; type: string; blobId: string }>
    >([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

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
    const visibility = typeof fields?.visibility === "number"
        ? (fields.visibility as number)
        : Number(fields?.visibility ?? 0);
    const isPublicTask = visibility === 2;
    
    // Extract blob IDs - content_blob_id comes as string directly when populated
    const existingContentBlobId = (fields?.content_blob_id as string) || "";
    const existingFileBlobIds = (fields?.file_blob_ids as string[]) || [];

    // Shared symmetric key derived from taskId + creator (allows any shared viewer of the task to decrypt)
    const deriveWalrusKey = useMemo(() => {
        return async () => {
            if (!taskId) {
                throw new Error("Task ID missing for encryption key derivation");
            }
            const creatorAddr = typeof fields?.creator === "string" ? String(fields.creator) : "";
            if (!creatorAddr) {
                throw new Error("Task creator missing for encryption key derivation");
            }
            const raw = `${WALRUS_KEY_MESSAGE}:${taskId.toLowerCase()}:${creatorAddr.toLowerCase()}`;
            const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
            return new Uint8Array(digest);
        };
    }, [fields?.creator, taskId]);

    // Legacy wallet-bound key (fallback for already-uploaded blobs)
    const deriveLegacyWalrusKey = useMemo(() => {
        return async () => {
            if (!account) {
                throw new Error("Connect a wallet to derive the encryption key");
            }
            const message = new TextEncoder().encode(`${WALRUS_KEY_MESSAGE}:${account.address.toLowerCase()}`);
            const { signature } = await signPersonalMessage({ message });
            const signatureBytes = fromB64(signature);
            const digest = await crypto.subtle.digest("SHA-256", signatureBytes);
            return new Uint8Array(digest);
        };
    }, [account, signPersonalMessage]);

    // Encrypt bytes with wallet-derived key and prepend tag + nonce for transport
    const encryptBytes = (bytes: Uint8Array, key?: Uint8Array): Uint8Array => {
        if (!key) return bytes;
        const nonce = nacl.randomBytes(NONCE_LENGTH);
        const cipher = nacl.secretbox(bytes, nonce, key);
        if (!cipher) {
            throw new Error("Failed to encrypt data");
        }
        const payload = new Uint8Array(ENCRYPTION_TAG.length + nonce.length + cipher.length);
        payload.set(ENCRYPTION_TAG, 0);
        payload.set(nonce, ENCRYPTION_TAG.length);
        payload.set(cipher, ENCRYPTION_TAG.length + nonce.length);
        return payload;
    };

    // Decrypt bytes that contain [tag? || nonce || ciphertext]
    // expectEncrypted=true ensures non-tagged payloads (legacy format nonce||cipher) also require the creator wallet
    const decryptBytes = (
        payload: Uint8Array,
        keys: Array<Uint8Array | undefined>,
        options: { expectEncrypted: boolean; softFail?: boolean }
    ): Uint8Array | null => {
        const { expectEncrypted, softFail } = options;
        const hasTag =
            payload.length > ENCRYPTION_TAG.length + NONCE_LENGTH &&
            ENCRYPTION_TAG.every((byte, idx) => payload[idx] === byte);

        const tryDecrypt = (offset: number, key?: Uint8Array): Uint8Array | null => {
            if (payload.length <= offset + NONCE_LENGTH) {
                return null;
            }
            const nonce = payload.slice(offset, offset + NONCE_LENGTH);
            const cipher = payload.slice(offset + NONCE_LENGTH);
            const plaintext = key ? nacl.secretbox.open(cipher, nonce, key) : null;
            return plaintext ? new Uint8Array(plaintext) : null;
        };

        const candidateKeys = keys.length ? keys : [undefined];

        for (const key of candidateKeys) {
            // Public/plaintext path
            if (!key) {
                if (!expectEncrypted || !hasTag) {
                    return payload;
                }
                continue;
            }

            // Tagged payload (new format)
            if (hasTag) {
                const decrypted = tryDecrypt(ENCRYPTION_TAG.length, key);
                if (decrypted) return decrypted;
                continue;
            }

            // Legacy encrypted payload assumed as [nonce || cipher]
            if (expectEncrypted) {
                const decrypted = tryDecrypt(0, key);
                if (decrypted) return decrypted;
            }
        }

        if (softFail) return null;
        if (!expectEncrypted) return payload;
        if (!candidateKeys.filter(Boolean).length) {
            throw new Error("This blob is encrypted and requires the owner wallet to view.");
        }
        throw new Error("Unable to decrypt data with this wallet");
    };

    // Cleanup blob URLs
    useEffect(() => {
        return () => {
            decryptedFiles.forEach(file => {
                if (file.url.startsWith('blob:')) {
                    URL.revokeObjectURL(file.url);
                }
            });
        };
    }, [decryptedFiles]);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Copied to clipboard!");
        } catch (err) {
            console.error("Failed to copy:", err);
            toast.error("Failed to copy");
        }
    };

    // Helper to extract text from editor state
    const extractTextFromEditorState = (state: SerializedEditorState): string => {
        try {
            const root = state.root;
            let text = "";
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const extractText = (node: any): void => {
                if (node.type === "text") {
                    text += node.text;
                } else if (node.children) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    node.children.forEach((child: any) => extractText(child));
                    // Add newline after paragraphs
                    if (node.type === "paragraph" || node.type === "heading") {
                        text += "\n";
                    }
                }
            };
            
            if (root.children) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                root.children.forEach((child: any) => extractText(child));
            }
            
            return text.trim();
        } catch (err) {
            console.error("Error extracting text from editor state:", err);
            return "";
        }
    };

    // Update content when editor state changes
    useEffect(() => {
        const text = extractTextFromEditorState(editorState);
        setContent(text);
    }, [editorState]);

    const handleDialogClose = (open: boolean) => {
        if (!open) {
            decryptedFiles.forEach(file => {
                if (file.url.startsWith('blob:')) {
                    URL.revokeObjectURL(file.url);
                }
            });
            setDecryptedFiles([]);
            setDecryptedContent("");
        }
        setIsDialogOpen(open);
    };

    const handleViewContent = async () => {
        setIsLoadingContent(true);
        setDecryptedContent("");
        setDecryptedFiles([]);
        
        try {
            console.log("[TaskContentUpload] Starting content view", {
                taskId,
                isPublicTask,
                hasAccount: !!account,
                creator: fields?.creator,
            });

            const candidateKeys: Array<Uint8Array | undefined> = [];
            if (isPublicTask) {
                console.log("[TaskContentUpload] Public task - no encryption");
                candidateKeys.push(undefined);
            } else {
                // Try task-based deterministic key first (works for all shared users)
                try {
                    const taskKey = await deriveWalrusKey();
                    candidateKeys.push(taskKey);
                    console.log("[TaskContentUpload] Successfully derived task-based key", {
                        keyPreview: Array.from(taskKey.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(''),
                    });
                } catch (e) {
                    console.error("[TaskContentUpload] Task-based key derivation failed:", e);
                }
                
                // Try legacy wallet-based key (for backward compatibility)
                if (account) {
                    try {
                        const legacyKey = await deriveLegacyWalrusKey();
                        candidateKeys.push(legacyKey);
                        console.log("[TaskContentUpload] Successfully derived legacy wallet key");
                    } catch (e) {
                        console.warn("[TaskContentUpload] Legacy key derivation failed:", e);
                    }
                }
            }

            console.log("[TaskContentUpload] Have", candidateKeys.length, "candidate keys for decryption");
            let localContent = "";
            let localFiles: Array<{ name: string; url: string; type: string; blobId: string }> = [];
            let hadDecryptFailure = false;

            // Fetch content blob if available
            if (existingContentBlobId) {
                try {
                    console.log("[TaskContentUpload] Fetching content blob:", existingContentBlobId);
                    const encryptedBytes = await getWalrusBlob(existingContentBlobId);
                    const decryptedBytes = decryptBytes(encryptedBytes, candidateKeys, {
                        expectEncrypted: !isPublicTask,
                        softFail: true,
                    });
                    if (!decryptedBytes) {
                        hadDecryptFailure = true;
                        console.error("[TaskContentUpload] Failed to decrypt content with available keys");
                        
                        // Check if user is not the creator
                        const isCreator = account?.address === fields?.creator;
                        
                        if (!isCreator) {
                            toast.error("Cannot decrypt content", {
                                description: "This content was encrypted with the creator's wallet. Only the creator can view it, or they need to re-upload using the new shared encryption format."
                            });
                        } else {
                            toast.error("Unable to decrypt content", {
                                description: "Failed to decrypt with available keys. The content may be corrupted."
                            });
                        }
                    } else {
                        const textDecoder = new TextDecoder();
                        localContent = textDecoder.decode(decryptedBytes);
                        console.log("[TaskContentUpload] Successfully decrypted content");
                    }
                } catch (err) {
                    console.error("Error fetching content:", err);
                    const message =
                        err instanceof Error ? err.message : "Unknown error";
                    if (
                        message.includes("requires the owner wallet") ||
                        message.includes("Unable to decrypt")
                    ) {
                        const isCreator = account?.address === fields?.creator;
                        
                        if (!isCreator) {
                            toast.error("Cannot decrypt content", {
                                description: "This content was encrypted with the creator's wallet. Ask the creator to re-upload it using the new shared encryption format."
                            });
                        } else {
                            toast.error("Unable to decrypt content", {
                                description: message
                            });
                        }
                        hadDecryptFailure = true;
                    } else {
                        toast.error("Failed to load content", {
                            description: message,
                        });
                    }
                }
            }

            // Fetch files if available
            if (existingFileBlobIds.length > 0) {
                for (let i = 0; i < existingFileBlobIds.length; i++) {
                    const blobId = existingFileBlobIds[i];
                    try {
                        const encryptedFileBytes = await getWalrusBlob(blobId);
                        const fileBytes = decryptBytes(encryptedFileBytes, candidateKeys, {
                            expectEncrypted: !isPublicTask,
                            softFail: true,
                        });
                        if (!fileBytes) {
                            hadDecryptFailure = true;
                            console.error("[TaskContentUpload] Failed to decrypt file with available keys", blobId);
                            
                            // Check if user is not the creator
                            const isCreator = account?.address === fields?.creator;
                            
                            if (!isCreator) {
                                toast.error("Cannot decrypt files", {
                                    description: "These files were encrypted with the creator's wallet. Only the creator can view them, or they need to re-upload using the new shared encryption format."
                                });
                            } else {
                                toast.error("Unable to decrypt file", {
                                    description: "Failed to decrypt with available keys. The file may be corrupted."
                                });
                            }
                            break;
                        }
                        
                        let mimeType = "application/octet-stream";
                        let fileName = `File ${i + 1}`;
                        
                        if (fileBytes.length > 0) {
                            if (fileBytes[0] === 0x89 && fileBytes[1] === 0x50 && fileBytes[2] === 0x4E && fileBytes[3] === 0x47) {
                                mimeType = "image/png";
                                fileName = `image-${i + 1}.png`;
                            } else if (fileBytes[0] === 0xFF && fileBytes[1] === 0xD8 && fileBytes[2] === 0xFF) {
                                mimeType = "image/jpeg";
                                fileName = `image-${i + 1}.jpg`;
                            } else if (fileBytes[0] === 0x25 && fileBytes[1] === 0x50 && fileBytes[2] === 0x44 && fileBytes[3] === 0x46) {
                                mimeType = "application/pdf";
                                fileName = `document-${i + 1}.pdf`;
                            } else {
                                try {
                                    const decoder = new TextDecoder('utf-8', { fatal: true });
                                    decoder.decode(fileBytes.slice(0, Math.min(100, fileBytes.length)));
                                    mimeType = "text/plain";
                                    fileName = `file-${i + 1}.txt`;
                                } catch {
                                    fileName = `file-${i + 1}.bin`;
                                }
                            }
                        }
                        
                        const blob = new Blob([new Uint8Array(fileBytes)], { type: mimeType });
                        const url = URL.createObjectURL(blob);
                        
                        localFiles.push({ name: fileName, url, type: mimeType, blobId });
                    } catch (err) {
                        console.error(`Error processing file ${i + 1}:`, err);
                        const message =
                            err instanceof Error ? err.message : "Unknown error";
                        if (
                            message.includes("requires the owner wallet") ||
                            message.includes("Unable to decrypt")
                        ) {
                            const isCreator = account?.address === fields?.creator;
                            
                            if (!isCreator) {
                                toast.error("Cannot decrypt files", {
                                    description: "These files were encrypted with the creator's wallet. Ask the creator to re-upload them using the new shared encryption format."
                                });
                            } else {
                                toast.error("Unable to decrypt file", {
                                    description: message
                                });
                            }
                            hadDecryptFailure = true;
                            // Stop trying further files; they will also fail
                            break;
                        } else {
                            toast.error(`Failed to load file ${i + 1}`, {
                                description: message,
                            });
                        }
                    }
                }
                
                setDecryptedFiles(localFiles);
            }

            setDecryptedContent(localContent);

            // Only open dialog if we have something to show or no decrypt errors
            if (!hadDecryptFailure || localContent || localFiles.length > 0) {
                setIsDialogOpen(true);
            }
        } catch (err) {
            console.error("Error viewing content:", err);
            toast.error("Failed to load content");
        } finally {
            setIsLoadingContent(false);
        }
    };

    const handleUpload = async () => {
        if (!taskId || (!account && !isPublicTask)) {
            toast.error("Task ID or account not available");
            return;
        }

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;

        if (!packageId || !versionObjectId) {
            toast.error("Configuration error: Missing package or version ID");
            return;
        }

        setIsUploading(true);

        try {
            const tx = new Transaction();
            let contentBlobId: string | null = null;
            const fileBlobIds: string[] = [];
            const shouldEncrypt = !isPublicTask;
            const encryptionKey = shouldEncrypt ? await deriveWalrusKey() : undefined;

            // Helper to sign & execute transactions using connected wallet
            const signTransactionWithWallet = async (txToSign: Transaction) => {
                const result = await signAndExecuteTransaction({ transaction: txToSign });
                return { digest: result.digest };
            };

            // Upload content to Walrus if provided
            if (content.trim()) {
                try {
                    // Convert text to Uint8Array
                    const contentBlob = new Blob([content], { type: 'text/plain' });
                    const arrayBuffer = await contentBlob.arrayBuffer();
                    const bytes = new Uint8Array(arrayBuffer);
                    const encryptedBytes = encryptBytes(bytes, encryptionKey);

                    console.log("[TaskContentUpload] Uploading content to Walrus", {
                        size: encryptedBytes.length,
                    });

                    // Upload using Walrus SDK flow
                    const result = await uploadWalrusFileWithFlow(
                        encryptedBytes,
                        signTransactionWithWallet,
                        account?.address ?? "",
                        {
                            epochs: 5,
                            deletable: true,
                        }
                    );

                    contentBlobId = result.blobId;
                    console.log("[TaskContentUpload] Content uploaded", { blobId: contentBlobId });
                    toast.success("Content uploaded to Walrus");
                } catch (error) {
                    console.error("Error uploading content:", error);
                    toast.error("Failed to upload content to Walrus", {
                        description: error instanceof Error ? error.message : "Unknown error",
                    });
                    setIsUploading(false);
                    return;
                }
            }

            // Upload files to Walrus if provided
            if (files && files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    try {
                        // Convert File to Uint8Array
                        const arrayBuffer = await file.arrayBuffer();
                        const bytes = new Uint8Array(arrayBuffer);
                        const encryptedBytes = encryptBytes(bytes, encryptionKey);

                        console.log("[TaskContentUpload] Uploading file to Walrus", {
                            fileName: file.name,
                            size: encryptedBytes.length,
                        });

                        // Upload using Walrus SDK flow
                        const result = await uploadWalrusFileWithFlow(
                            encryptedBytes,
                            signTransactionWithWallet,
                            account?.address ?? "",
                            {
                                epochs: 5,
                                deletable: true,
                            }
                        );

                        fileBlobIds.push(result.blobId);
                        console.log("[TaskContentUpload] File uploaded", { 
                            fileName: file.name,
                            blobId: result.blobId 
                        });
                        toast.success(`Uploaded: ${file.name}`);
                    } catch (error) {
                        console.error(`Error uploading file ${file.name}:`, error);
                        toast.error(`Failed to upload ${file.name}`, {
                            description: error instanceof Error ? error.message : "Unknown error",
                        });
                    }
                }
            }

            // Update task with content blob ID if available
            if (contentBlobId) {
                tx.moveCall({
                    target: `${packageId}::task_manage::add_content`,
                    arguments: [
                        tx.object(versionObjectId), // version: &Version
                        tx.object(taskId), // task: &mut Task
                        tx.pure.option("string", contentBlobId), // content_blob_id: Option<String>
                        tx.object("0x6"), // clock: &Clock
                    ],
                });
            }

            // Update task with file blob IDs if available
            if (fileBlobIds.length > 0) {
                tx.moveCall({
                    target: `${packageId}::task_manage::add_files`,
                    arguments: [
                        tx.object(versionObjectId), // version: &Version
                        tx.object(taskId), // task: &mut Task
                        tx.pure.vector("string", fileBlobIds), // file_blob_ids: vector<String>
                        tx.object("0x6"), // clock: &Clock
                    ],
                });
            }

            // Execute transaction if we have any updates
            if (contentBlobId || fileBlobIds.length > 0) {
                const resp = await signAndExecuteTransaction({
                    transaction: tx,
                });
                
                await suiClient.waitForTransaction({ digest: resp.digest });
                await queryClient.invalidateQueries({
                    queryKey: ["testnet", "getObject"],
                });

                toast.success("Task updated successfully!", {
                    description: `Added ${contentBlobId ? 'content' : ''} ${contentBlobId && fileBlobIds.length > 0 ? 'and' : ''} ${fileBlobIds.length > 0 ? `${fileBlobIds.length} file(s)` : ''}`,
                });

                // Reset form
                setContent("");
                setEditorState({
                    root: {
                        children: [
                            {
                                children: [],
                                direction: "ltr",
                                format: "",
                                indent: 0,
                                type: "paragraph",
                                version: 1,
                            },
                        ],
                        direction: "ltr",
                        format: "",
                        indent: 0,
                        type: "root",
                        version: 1,
                    },
                } as unknown as SerializedEditorState);
                setFiles(null);
                // Reset file input
                const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
            } else {
                toast.error("No content or files to upload");
            }
        } catch (error) {
            console.error("Error uploading:", error);
            toast.error("Failed to update task", {
                description: error instanceof Error ? error.message : "An unexpected error occurred",
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Migration Notice for Creator */}
            {account?.address === fields?.creator && (existingContentBlobId || existingFileBlobIds.length > 0) && (
                <Card className="p-4 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                    <CardContent className="p-0">
                        <div className="flex items-start gap-3">
                            <div className="rounded-full bg-yellow-100 dark:bg-yellow-900 p-2">
                                <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                                    Encryption Format Update
                                </h3>
                                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                                    Your existing content may be encrypted with an older format that prevents shared users from viewing it. 
                                    To enable shared access, please re-upload your content below. The new format allows anyone with task access to decrypt the content.
                                </p>
                                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                    💡 New uploads automatically use the shared encryption format.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Existing Walrus Storage Section */}
            {(existingContentBlobId || existingFileBlobIds.length > 0) && (
                <Card className="p-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                    <CardContent className="space-y-4 p-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <h2 className="text-lg font-bold text-blue-900 dark:text-blue-100">
                                    Walrus Storage
                                </h2>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleViewContent}
                                disabled={isLoadingContent}
                                className="border-blue-300 dark:border-blue-700"
                            >
                                {isLoadingContent ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View & Download
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Content Blob ID */}
                        {existingContentBlobId && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                    <Label className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                        Content Blob ID:
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded border">
                                    <code className="text-xs font-mono text-gray-800 dark:text-gray-200 flex-1 break-all">
                                        {existingContentBlobId}
                                    </code>
                                    <div className="flex gap-1 shrink-0">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => copyToClipboard(existingContentBlobId)}
                                            className="h-7 px-2"
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            asChild
                                            className="h-7 px-2"
                                        >
                                            <a
                                                href={`https://walruscan.com/testnet/blob/${existingContentBlobId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* File Blob IDs */}
                        {existingFileBlobIds.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Paperclip className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                    <Label className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                        File Blob IDs ({existingFileBlobIds.length}):
                                    </Label>
                                </div>
                                <div className="space-y-2">
                                    {existingFileBlobIds.map((blobId, index) => (
                                        <div key={index} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded border">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold shrink-0">
                                                #{index + 1}
                                            </span>
                                            <code className="text-xs font-mono text-gray-800 dark:text-gray-200 flex-1 break-all">
                                                {blobId}
                                            </code>
                                            <div className="flex gap-1 shrink-0">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => copyToClipboard(blobId)}
                                                    className="h-7 px-2"
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    asChild
                                                    className="h-7 px-2"
                                                >
                                                    <a
                                                        href={`https://walruscan.com/testnet/blob/${blobId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Upload New Content Section */}
            <Card className="p-6">
            <CardContent className="space-y-6 p-0">
                <h2 className="text-xl font-bold">Add Content and Files</h2>

                {/* --- Content --- */}
                <div className="space-y-2">
                    <Label className="text-base font-medium">Content</Label>
                    <Editor
                        editorSerializedState={editorState}
                        onSerializedChange={(value: SerializedEditorState) => setEditorState(value)}
                    />
                    {content.trim() && (
                        <p className="text-xs text-muted-foreground">
                            {content.length} characters • {formatFileSize(new Blob([content]).size)}
                        </p>
                    )}
                </div>

                {/* --- Files --- */}
                <div className="space-y-2">
                    <Label className="text-base font-medium">Files</Label>
                    <input
                        type="file"
                        multiple
                        onChange={(e) => setFiles(e.target.files)}
                        disabled={isUploading}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium hover:file:bg-muted/80"
                    />
                    <p className="text-sm text-muted-foreground">
                        Select multiple files to attach. Files will be encrypted
                        and stored on Walrus.
                    </p>
                    {files && files.length > 0 && (
                        <div className="mt-3 space-y-1">
                            {Array.from(files).map((file, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                    <File className="h-4 w-4 text-muted-foreground" />
                                    <span>{file.name}</span>
                                    <span className="text-muted-foreground">
                                        ({formatFileSize(file.size)})
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* --- Uploading indicator --- */}
                {isUploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Encrypting and uploading to Walrus...</span>
                    </div>
                )}

                {/* --- Upload button --- */}
                <Button
                    onClick={handleUpload}
                    disabled={
                        isUploading ||
                        !taskId ||
                        (!content.trim() && (!files || files.length === 0))
                    }
                    size="lg"
                    className="w-full"
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Upload className="h-4 w-4 mr-2" />
                            Encrypt & Upload to Walrus
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>

            {/* View Content Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Task Content & Files
                    </DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-6 mt-4">
                            {/* Decrypted Text Content */}
                            {decryptedContent && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-blue-600" />
                                        <strong className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            Text Content:
                                        </strong>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
                                            {decryptedContent}
                                        </pre>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const blob = new Blob([decryptedContent], { type: 'text/plain' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = 'task-content.txt';
                                            a.click();
                                            URL.revokeObjectURL(url);
                                            toast.success("Content downloaded");
                                        }}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Download as TXT
                                    </Button>
                                </div>
                            )}

                            {/* Decrypted Files */}
                            {decryptedFiles.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Paperclip className="h-4 w-4 text-blue-600" />
                                        <strong className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            Attached Files ({decryptedFiles.length}):
                                        </strong>
                                    </div>
                                    <div className="space-y-2">
                                        {decryptedFiles.map((file, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <Paperclip className="h-4 w-4 text-gray-500 shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {file.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                                                            {file.blobId.slice(0, 20)}...{file.blobId.slice(-8)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.startsWith('text/')) {
                                                                window.open(file.url, '_blank');
                                                            } else {
                                                                toast.info("Download the file to view it");
                                                            }
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        View
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            const a = document.createElement('a');
                                                            a.href = file.url;
                                                            a.download = file.name;
                                                            a.click();
                                                            toast.success(`Downloading ${file.name}`);
                                                        }}
                                                    >
                                                        <Download className="h-4 w-4 mr-1" />
                                                        Download
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* No content message */}
                            {!decryptedContent && decryptedFiles.length === 0 && (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>No content found to display.</p>
                                </div>
                            )}
                        </div>
                    </DialogDescription>

                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                        <DialogClose asChild>
                            <Button variant="secondary">Close</Button>
                        </DialogClose>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
