"use client";

import * as React from "react";
import {
  IconUpload,
  IconFile,
  IconCheck,
  IconCopy,
  IconX,
  IconFileText,
  IconWallet,
} from "@tabler/icons-react";
import {
  uploadWalrusFileWithFlow,
  getBlobUrl,
  formatFileSize,
  type UploadWalrusFileResult,
} from "@/utils/walrus";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface UploadHistoryItem extends UploadWalrusFileResult {
  fileName: string;
  uploadDate: string;
}

export function WalrusUpload() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [isDragging, setIsDragging] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [textContent, setTextContent] = React.useState("");
  const [textFileName, setTextFileName] = React.useState("content.txt");
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadResult, setUploadResult] =
    React.useState<UploadWalrusFileResult | null>(null);
  const [uploadHistory, setUploadHistory] = React.useState<UploadHistoryItem[]>(
    []
  );
  const [activeTab, setActiveTab] = React.useState("file");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load upload history from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem("walrus-upload-history");
    if (stored) {
      try {
        setUploadHistory(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse upload history", e);
      }
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setFile(droppedFiles[0]);
      setUploadResult(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      setFile(selectedFiles[0]);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!currentAccount) {
      toast.error("Please connect your wallet first");
      return;
    }

    let fileToUpload: File | null = null;
    let fileName = "";

    // Determine what to upload based on active tab
    if (activeTab === "file") {
      if (!file) return;
      fileToUpload = file;
      fileName = file.name;
    } else {
      // Text upload
      if (!textContent.trim()) {
        toast.error("Please enter some text content");
        return;
      }
      // Convert text to File
      const blob = new Blob([textContent], { type: "text/plain" });
      fileToUpload = new File([blob], textFileName || "content.txt", {
        type: "text/plain",
      });
      fileName = textFileName || "content.txt";
    }

    setIsUploading(true);
    try {
      // Convert File to Uint8Array
      const arrayBuffer = await fileToUpload.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      console.log("[WalrusUpload] Preparing content", {
        mode: activeTab,
        fileName,
        size: bytes.length,
      });

      // Helper to sign & execute transactions using connected wallet
      const signTransactionWithWallet = async (tx: Transaction) => {
        const result = await signAndExecute({ transaction: tx });
        return { digest: result.digest };
      };

      // Upload using Walrus SDK flow (register -> upload -> certify)
      const result = await uploadWalrusFileWithFlow(
        bytes,
        signTransactionWithWallet,
        currentAccount.address,
        {
          epochs: 5,
          deletable: true,
        }
      );
      console.log("[WalrusUpload] Upload succeeded", result);

      setUploadResult(result);

      // Save to history
      const historyItem: UploadHistoryItem = {
        ...result,
        fileName: fileName,
        uploadDate: new Date().toISOString(),
      };
      const newHistory = [historyItem, ...uploadHistory].slice(0, 10); // Keep last 10
      setUploadHistory(newHistory);
      localStorage.setItem("walrus-upload-history", JSON.stringify(newHistory));

      toast.success("Content uploaded successfully!", {
        description: `Blob ID: ${result.blobId.slice(0, 16)}...`,
      });
    } catch (error) {
      console.error("[WalrusUpload] Upload failed", error);
      toast.error("Upload failed", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      console.log("[WalrusUpload] Upload finished");
      setIsUploading(false);
    }
  };

  const handleCopyBlobId = (blobId: string) => {
    navigator.clipboard.writeText(blobId);
    toast.success("Copied to clipboard!");
  };

  const handleCopyUrl = (blobId: string) => {
    const url = getBlobUrl(blobId);
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard!");
  };

  const handleReset = () => {
    setFile(null);
    setTextContent("");
    setTextFileName("content.txt");
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-2xl font-semibold mb-4">Upload to Walrus</h2>

        {!currentAccount && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
            <IconWallet className="size-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              Connect your Sui wallet to upload files to Walrus.
            </p>
          </div>
        )}

        {!uploadResult ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="file">
                <IconFile className="size-4 mr-2" />
                File Upload
              </TabsTrigger>
              <TabsTrigger value="text">
                <IconFileText className="size-4 mr-2" />
                Text Content
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-4">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer
                  ${
                    isDragging
                      ? "border-primary bg-primary/5 scale-[1.02]"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50"
                  }
                `}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-4">
                  <div
                    className={`rounded-full p-4 ${
                      isDragging ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    <IconUpload
                      className={`size-8 ${
                        isDragging ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </div>

                  <div>
                    <p className="text-lg font-medium">
                      {isDragging ? "Drop file here" : "Drag & drop file here"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      or click to browse
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected File Info */}
              {file && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-background">
                      <IconFile className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)} •{" "}
                        {file.type || "Unknown type"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                  >
                    <IconX className="size-4" />
                  </Button>
                </div>
              )}

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!file || isUploading || !currentAccount}
                className="w-full"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Uploading to Walrus...
                  </>
                ) : (
                  <>
                    <IconUpload className="size-4 mr-2" />
                    Upload to Walrus
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="text" className="space-y-4">
              {/* Text Content Input */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="text-content">Content</Label>
                  <Textarea
                    id="text-content"
                    placeholder="Enter your text content here..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="min-h-[200px] font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    {textContent.length} characters •{" "}
                    {new Blob([textContent]).size} bytes
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file-name">File Name (optional)</Label>
                  <Input
                    id="file-name"
                    type="text"
                    placeholder="content.txt"
                    value={textFileName}
                    onChange={(e) => setTextFileName(e.target.value)}
                  />
                </div>
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!textContent.trim() || isUploading || !currentAccount}
                className="w-full"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Uploading to Walrus...
                  </>
                ) : (
                  <>
                    <IconUpload className="size-4 mr-2" />
                    Upload Text to Walrus
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        ) : (
          // Upload Success
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="p-2 rounded-full bg-green-500/20">
                <IconCheck className="size-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">
                  Upload Successful!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your file has been stored on Walrus testnet
                </p>
              </div>
            </div>

            {/* Blob ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Blob ID</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-lg bg-muted font-mono text-sm break-all">
                  {uploadResult.blobId}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopyBlobId(uploadResult.blobId)}
                >
                  <IconCopy className="size-4" />
                </Button>
              </div>
            </div>

            {/* Retrieval URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Retrieval URL</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-lg bg-muted font-mono text-sm break-all">
                  {getBlobUrl(uploadResult.blobId)}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopyUrl(uploadResult.blobId)}
                >
                  <IconCopy className="size-4" />
                </Button>
              </div>
            </div>

            {/* Upload Info */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted">
              <div>
                <p className="text-xs text-muted-foreground">Size</p>
                <p className="font-medium">
                  {formatFileSize(uploadResult.size)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Storage</p>
                <p className="font-medium">5 Epochs (~6 months)</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleReset} className="flex-1">
                Upload Another File
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  window.open(getBlobUrl(uploadResult.blobId), "_blank")
                }
              >
                View File
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Upload History */}
      {uploadHistory.length > 0 && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-xl font-semibold mb-4">Recent Uploads</h3>
          <div className="space-y-2">
            {uploadHistory.map((item, index) => (
              <div
                key={`${item.blobId}-${index}`}
                className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/70 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.fileName}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {item.blobId}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyBlobId(item.blobId)}
                  >
                    <IconCopy className="size-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      window.open(getBlobUrl(item.blobId), "_blank")
                    }
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
