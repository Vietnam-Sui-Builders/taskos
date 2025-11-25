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
      <div className="rounded-xl border border-primary/20 bg-card/40 backdrop-blur-md p-6 shadow-[0_0_30px_rgba(var(--primary),0.05)]">
        <h2 className="text-xl font-bold font-display tracking-wide text-primary mb-6 flex items-center gap-2">
            <span className="text-lg">📤</span> UPLOAD_INTERFACE
        </h2>

        {!currentAccount && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
            <IconWallet className="size-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm font-mono text-yellow-900 dark:text-yellow-100">
              CONNECT_WALLET_REQUIRED_FOR_UPLOAD
            </p>
          </div>
        )}

        {!uploadResult ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-background/50 border border-primary/20 backdrop-blur-md p-1 rounded-lg h-12">
              <TabsTrigger value="file" className="gap-2 cursor-pointer data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-mono uppercase tracking-wider transition-all duration-300 h-full rounded-md border border-transparent data-[state=active]:border-primary/50 text-xs md:text-sm">
                <IconFile className="size-4 mr-2" />
                FILE_UPLOAD
              </TabsTrigger>
              <TabsTrigger value="text" className="gap-2 cursor-pointer data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-mono uppercase tracking-wider transition-all duration-300 h-full rounded-md border border-transparent data-[state=active]:border-primary/50 text-xs md:text-sm">
                <IconFileText className="size-4 mr-2" />
                TEXT_CONTENT
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-4 animate-fade-in">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer group
                  ${
                    isDragging
                      ? "border-primary bg-primary/10 scale-[1.02] shadow-[0_0_20px_rgba(var(--primary),0.2)]"
                      : "border-primary/20 hover:border-primary/50 hover:bg-primary/5"
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
                    className={`rounded-full p-4 transition-colors duration-300 ${
                      isDragging ? "bg-primary/20" : "bg-primary/5 group-hover:bg-primary/10"
                    }`}
                  >
                    <IconUpload
                      className={`size-8 transition-colors duration-300 ${
                        isDragging ? "text-primary" : "text-primary/50 group-hover:text-primary"
                      }`}
                    />
                  </div>

                  <div>
                    <p className="text-lg font-bold font-display tracking-wide text-foreground group-hover:text-primary transition-colors">
                      {isDragging ? "RELEASE_TO_UPLOAD" : "DRAG_AND_DROP_FILE"}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground mt-2 uppercase tracking-wider">
                      OR_CLICK_TO_BROWSE
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected File Info */}
              {file && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-background/50 border border-primary/10">
                      <IconFile className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold font-mono text-sm text-foreground">{file.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {formatFileSize(file.size)} •{" "}
                        {file.type || "UNKNOWN_TYPE"}
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
                    className="hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <IconX className="size-4" />
                  </Button>
                </div>
              )}

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!file || isUploading || !currentAccount}
                className="w-full bg-primary text-primary-foreground font-bold font-display tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(var(--primary),0.2)] hover:shadow-[0_0_25px_rgba(var(--primary),0.4)] h-12"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    UPLOADING_TO_WALRUS...
                  </>
                ) : (
                  <>
                    <IconUpload className="size-4 mr-2" />
                    INITIATE_UPLOAD
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="text" className="space-y-4 animate-fade-in">
              {/* Text Content Input */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="text-content" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">CONTENT_DATA</Label>
                  <Textarea
                    id="text-content"
                    placeholder="ENTER_TEXT_CONTENT..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="min-h-[200px] font-mono text-sm bg-background/50 border-primary/20 focus:border-primary/50 focus:ring-primary/20"
                  />
                  <p className="text-xs font-mono text-muted-foreground text-right">
                    {textContent.length} CHARS •{" "}
                    {new Blob([textContent]).size} BYTES
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file-name" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">FILENAME_OPTIONAL</Label>
                  <Input
                    id="file-name"
                    type="text"
                    placeholder="content.txt"
                    value={textFileName}
                    onChange={(e) => setTextFileName(e.target.value)}
                    className="font-mono text-sm bg-background/50 border-primary/20 focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!textContent.trim() || isUploading || !currentAccount}
                className="w-full bg-primary text-primary-foreground font-bold font-display tracking-wider hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(var(--primary),0.2)] hover:shadow-[0_0_25px_rgba(var(--primary),0.4)] h-12"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    UPLOADING_TO_WALRUS...
                  </>
                ) : (
                  <>
                    <IconUpload className="size-4 mr-2" />
                    INITIATE_TEXT_UPLOAD
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        ) : (
          // Upload Success
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-4 p-6 rounded-xl bg-green-500/10 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
              <div className="p-3 rounded-full bg-green-500/20 border border-green-500/30">
                <IconCheck className="size-6 text-green-500" />
              </div>
              <div>
                <p className="font-bold font-display tracking-wide text-green-500 text-lg">
                  UPLOAD_SUCCESSFUL
                </p>
                <p className="text-xs font-mono text-green-500/80 uppercase tracking-wider">
                  FILE_STORED_ON_WALRUS_TESTNET
                </p>
              </div>
            </div>

            {/* Blob ID */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">BLOB_ID</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-lg bg-black/50 border border-primary/20 font-mono text-xs text-primary break-all shadow-inner">
                  {uploadResult.blobId}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopyBlobId(uploadResult.blobId)}
                  className="border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <IconCopy className="size-4" />
                </Button>
              </div>
            </div>

            {/* Retrieval URL */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">RETRIEVAL_URL</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-lg bg-black/50 border border-primary/20 font-mono text-xs text-muted-foreground break-all shadow-inner">
                  {getBlobUrl(uploadResult.blobId)}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopyUrl(uploadResult.blobId)}
                  className="border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <IconCopy className="size-4" />
                </Button>
              </div>
            </div>

            {/* Upload Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">SIZE</p>
                <p className="font-bold font-mono text-foreground">
                  {formatFileSize(uploadResult.size)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">STORAGE_DURATION</p>
                <p className="font-bold font-mono text-foreground">5 EPOCHS (~6 MONTHS)</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleReset} className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/50 transition-all font-mono uppercase tracking-wider">
                UPLOAD_ANOTHER
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  window.open(getBlobUrl(uploadResult.blobId), "_blank")
                }
                className="flex-1 border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors font-mono uppercase tracking-wider"
              >
                VIEW_FILE
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Upload History */}
      {uploadHistory.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-card/40 backdrop-blur-md p-6 shadow-[0_0_30px_rgba(var(--primary),0.05)]">
          <h3 className="text-lg font-bold font-display tracking-wide text-primary mb-4 flex items-center gap-2">
            <span className="text-base">📜</span> RECENT_UPLOADS
          </h3>
          <div className="space-y-2">
            {uploadHistory.map((item, index) => (
              <div
                key={`${item.blobId}-${index}`}
                className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-primary/10 hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold font-mono text-sm text-foreground truncate group-hover:text-primary transition-colors">{item.fileName}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate opacity-70">
                    {item.blobId}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyBlobId(item.blobId)}
                    className="h-8 px-2 text-xs font-mono uppercase hover:bg-primary/10 hover:text-primary"
                  >
                    <IconCopy className="size-3 mr-1" />
                    COPY
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      window.open(getBlobUrl(item.blobId), "_blank")
                    }
                    className="h-8 px-2 text-xs font-mono uppercase hover:bg-primary/10 hover:text-primary"
                  >
                    VIEW
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
