"use client";

import { useState } from "react";
import { useSignAndExecuteTransaction, useSuiClient, useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, AlertCircle, Loader2, File, X } from "lucide-react";
import { uploadWalrusFileWithFlow, formatFileSize } from "@/utils/walrus";

interface TaskSubmitCompletionProps {
    taskId: string;
}

export function TaskSubmitCompletion({ taskId }: TaskSubmitCompletionProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadedBlobId, setUploadedBlobId] = useState<string | null>(null);

    const account = useCurrentAccount();
    const suiClient = useSuiClient();
    const queryClient = useQueryClient();
    const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

    // Fetch task data
    const { data: taskData } = useSuiClientQuery(
        "getObject",
        {
            id: taskId,
            options: {
                showContent: true,
            },
        },
        {
            enabled: !!taskId,
        }
    );

    const fields = taskData?.data?.content && taskData.data.content.dataType === "moveObject" 
        ? taskData.data.content.fields as Record<string, unknown>
        : null;

    const taskStatus = fields ? fields.status as number : 0;
    const resultBlobId = fields?.result_blob_id as { vec: string[] } | undefined;
    const hasSubmittedWork = resultBlobId && resultBlobId.vec && resultBlobId.vec.length > 0;

    // Check if current user is the assignee
    const [assignee, setAssignee] = useState<string | null>(null);
    const [isLoadingAssignee, setIsLoadingAssignee] = useState(true);

    // Fetch assignee
    useState(() => {
        const fetchAssignee = async () => {
            if (!taskId) return;
            
            try {
                setIsLoadingAssignee(true);
                const dynamicFields = await suiClient.getDynamicFields({ parentId: taskId });
                
                for (const df of dynamicFields.data) {
                    const dfType = typeof df.name === "string" ? df.name : (df.name as unknown as Record<string, unknown>)?.type || "";
                    
                    if (typeof dfType === "string" && dfType.includes("AssigneeKey")) {
                        try {
                            const dfObj = await suiClient.getDynamicFieldObject({
                                parentId: taskId,
                                name: df.name,
                            });
                            
                            const content = dfObj.data?.content;
                            if (content && content.dataType === "moveObject" && "fields" in content) {
                                const dfFields = content.fields as Record<string, unknown>;
                                const assigneeAddr = dfFields.value as string;
                                if (assigneeAddr) {
                                    setAssignee(assigneeAddr);
                                }
                            }
                        } catch (err) {
                            console.error("Error fetching assignee:", err);
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching dynamic fields:", err);
            } finally {
                setIsLoadingAssignee(false);
            }
        };

        fetchAssignee();
    });

    const isAssignee = account?.address && assignee && account.address.toLowerCase() === assignee.toLowerCase();
    const canSubmit = isAssignee && taskStatus === 1; // STATUS_IN_PROGRESS = 1

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleRemoveFile = () => {
        setFile(null);
        // Reset input value
        const fileInput = document.getElementById('completion-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    const handleSubmitCompletion = async () => {
        if (!file) {
            toast.error("Please select a file to upload");
            return;
        }

        if (!taskId || !account) {
            toast.error("Missing task or account information");
            return;
        }

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;
        const registryId = process.env.NEXT_PUBLIC_TASKS_REGISTRY_ID;

        if (!packageId || !versionObjectId || !registryId) {
            toast.error("Configuration error");
            return;
        }

        setIsSubmitting(true);

        try {
            // Step 1: Upload to Walrus with wallet signing
            toast.info("Uploading file to Walrus...");
            
            // Convert file to bytes
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);

            // Helper to sign transactions for Walrus upload
            const signTransactionForWalrus = async (tx: unknown) => {
                const result = await signAndExecuteTransaction({ transaction: tx as Transaction });
                return { digest: result.digest };
            };
            
            const result = await uploadWalrusFileWithFlow(
                bytes,
                signTransactionForWalrus,
                account.address
            );
            
            const blobId = result.blobId;
            setUploadedBlobId(blobId);
            toast.success("File uploaded to Walrus!", {
                description: `Blob ID: ${blobId.substring(0, 16)}...`,
            });

            // Step 2: Submit to blockchain
            toast.info("Submitting task completion to blockchain...");
            const tx = new Transaction();
            
            tx.moveCall({
                target: `${packageId}::task_manage::complete_task_with_result`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.string(blobId),
                    tx.object("0x6"), // clock
                    tx.object(registryId),
                ],
            });

            const resp = await signAndExecuteTransaction({ transaction: tx });
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success("Task completion submitted successfully!", {
                description: "Task status updated to Completed. Waiting for owner approval.",
            });
            
            // Reset form
            setFile(null);
            setUploadedBlobId(blobId); // Keep blob ID visible for reference
        } catch (error) {
            console.error("Error submitting completion:", error);
            toast.error("Failed to submit completion", {
                description: error instanceof Error ? error.message : "An unexpected error occurred",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingAssignee) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Status Badge */}
            {hasSubmittedWork && (
                <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                            <CheckCircle className="h-5 w-5" />
                            <div>
                                <p className="font-semibold">Work Already Submitted</p>
                                <p className="text-sm">Result Blob ID: {resultBlobId?.vec[0]}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Permission Check */}
            {!isAssignee && (
                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                            <AlertCircle className="h-5 w-5" />
                            <div>
                                <p className="font-semibold">Not Assigned</p>
                                <p className="text-sm">Only the assigned user can submit completion for this task.</p>
                                {assignee && (
                                    <p className="text-xs mt-1 font-mono">Assignee: {assignee}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Status Check */}
            {isAssignee && taskStatus !== 1 && (
                <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                            <AlertCircle className="h-5 w-5" />
                            <div>
                                <p className="font-semibold">Invalid Status</p>
                                <p className="text-sm">Task must be in &quot;In Progress&quot; status to submit completion.</p>
                                <p className="text-xs mt-1">Current status: {getStatusLabel(taskStatus)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Submit Completion Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Submit Completed Work
                    </CardTitle>
                    <CardDescription>
                        Upload your work file (zip, pdf, image, etc.) to submit for approval
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="completion-file">Work File</Label>
                        {!file ? (
                            <div className="flex items-center justify-center w-full">
                                <label htmlFor="completion-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Any file type (max 10MB recommended)</p>
                                    </div>
                                    <Input 
                                        id="completion-file" 
                                        type="file" 
                                        className="hidden" 
                                        onChange={handleFileChange}
                                        disabled={!canSubmit || isSubmitting || hasSubmittedWork}
                                    />
                                </label>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded border">
                                        <File className="h-6 w-6 text-blue-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRemoveFile}
                                    disabled={isSubmitting}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {uploadedBlobId && (
                        <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded border">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Walrus Blob ID:</p>
                            <code className="text-xs break-all">{uploadedBlobId}</code>
                        </div>
                    )}

                    {/* Single Submit Button - Auto Upload & Submit */}
                    <Button 
                        onClick={handleSubmitCompletion}
                        disabled={!canSubmit || !file || isSubmitting || hasSubmittedWork}
                        className="w-full"
                        size="lg"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading & Submitting...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload to Walrus & Submit Completion
                            </>
                        )}
                    </Button>

                    {!canSubmit && !hasSubmittedWork && (
                        <p className="text-xs text-muted-foreground text-center">
                            You must be the assignee and task must be &quot;In Progress&quot; to submit
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Workflow Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Submission Workflow</CardTitle>
                </CardHeader>
                <CardContent>
                    <ol className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <Badge variant="outline" className="mt-0.5">1</Badge>
                            <span>Upload your work file (zip, pdf, etc.)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Badge variant="outline" className="mt-0.5">2</Badge>
                            <span>Click submit - automatically uploads to Walrus and updates task status to &quot;Completed&quot;</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Badge variant="outline" className="mt-0.5">3</Badge>
                            <span>Wait for task owner to review and approve your work</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Badge variant="outline" className="mt-0.5">4</Badge>
                            <span>Upon approval, task reward will be transferred to you</span>
                        </li>
                    </ol>
                </CardContent>
            </Card>
        </div>
    );
}

function getStatusLabel(status: number): string {
    const labels = {
        0: "To Do",
        1: "In Progress",
        2: "Completed",
        3: "Approved",
        4: "Archived",
    };
    return labels[status as keyof typeof labels] || "Unknown";
}
