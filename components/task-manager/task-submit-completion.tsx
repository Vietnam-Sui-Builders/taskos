"use client";

import { useState } from "react";
import { useSignAndExecuteTransaction, useSuiClient, useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { uploadToWalrus } from "@/utils/walrus";

interface TaskSubmitCompletionProps {
    taskId: string;
}

export function TaskSubmitCompletion({ taskId }: TaskSubmitCompletionProps) {
    const [completionNotes, setCompletionNotes] = useState("");
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

    const handleSubmitCompletion = async () => {
        if (!completionNotes.trim()) {
            toast.error("Please add completion notes");
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
            toast.info("Uploading completion notes to Walrus...");
            
            // Helper to sign transactions for Walrus upload
            const signTransactionForWalrus = async (tx: unknown) => {
                const result = await signAndExecuteTransaction({ transaction: tx as Transaction });
                return { digest: result.digest };
            };
            
            const blobId = await uploadToWalrus(
                completionNotes,
                signTransactionForWalrus,
                account.address
            );
            setUploadedBlobId(blobId);
            toast.success("Content uploaded to Walrus!", {
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
            setCompletionNotes("");
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
                        Upload your completion notes and submit the task for approval
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="completion-notes">Completion Notes</Label>
                        <Textarea
                            id="completion-notes"
                            value={completionNotes}
                            onChange={(e) => setCompletionNotes(e.target.value)}
                            placeholder="Describe what you've completed, any important notes, links to deliverables, etc."
                            rows={6}
                            disabled={!canSubmit || isSubmitting || hasSubmittedWork}
                        />
                        <p className="text-xs text-muted-foreground">
                            Content will be automatically uploaded to Walrus and submitted on-chain
                        </p>
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
                        disabled={!canSubmit || !completionNotes.trim() || isSubmitting || hasSubmittedWork}
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
                            <span>Write your completion notes describing the work done</span>
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
