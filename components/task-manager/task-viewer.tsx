"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { formatDueDate, getPriorityLabel, isOverdue } from "@/helpers";
import { useSuiClientQuery, useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Hash, Copy, ExternalLink, Eye, FileText, Loader2, User, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getWalrusBlob } from "@/utils/walrus";
import { useSuiClient } from "@mysten/dapp-kit";
import { ROLE_OWNER, ROLE_EDITOR, ROLE_VIEWER, STATUS_COMPLETED, STATUS_APPROVED } from "@/types";
import { Transaction } from "@mysten/sui/transactions";
import { useQueryClient } from "@tanstack/react-query";

interface TaskViewerProps {
    taskId: string;
}

export function TaskViewer({ taskId }: TaskViewerProps) {
    const [decryptedContent, setDecryptedContent] = useState<string>("");
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [sharedRoles, setSharedRoles] = useState<Array<{ address: string; role: number }>>([]);
    const [isLoadingRoles, setIsLoadingRoles] = useState(false);
    const [assignee, setAssignee] = useState<string | null>(null);
    const [isApproving, setIsApproving] = useState(false);
    const [experienceIdDf, setExperienceIdDf] = useState<string>("");
    const client = useSuiClient();
    const account = useCurrentAccount();
    const queryClient = useQueryClient();
    const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

    // Fetch task from blockchain
    const { data: taskData, isLoading: isLoadingTask, isError } = useSuiClientQuery(
        "getObject",
        {
            id: taskId,
            options: {
                showContent: true,
                showOwner: true,
            },
        },
        {
            enabled: !!taskId,
        }
    );

    // Fetch assignee and shared roles from dynamic fields - must be before any conditional returns
    useEffect(() => {
        if (!taskId) return;
        
        let cancelled = false;
        const fetchRoles = async () => {
            try {
                setIsLoadingRoles(true);
                setSharedRoles([]);
                setAssignee(null);
                
                // Find AccessControl and Assignee dynamic fields on the task
                const dynamicFields = await client.getDynamicFields({ parentId: taskId });
                let rolesTableId: string | null = null;

                const hasAccessControlKey = (dfName: unknown) => {
                    const candidate = typeof dfName === "string" ? dfName : (dfName as Record<string, unknown>)?.type || "";
                    return typeof candidate === "string" && candidate.includes("AccessControlKey");
                };

                const hasAssigneeKey = (dfName: unknown) => {
                    const candidate = typeof dfName === "string" ? dfName : (dfName as Record<string, unknown>)?.type || "";
                    return typeof candidate === "string" && candidate.includes("AssigneeKey");
                };

                for (const df of dynamicFields.data) {
                    // Check for assignee
                    if (hasAssigneeKey(df.name)) {
                        try {
                            const dfObj = await client.getDynamicFieldObject({
                                parentId: taskId,
                                name: df.name,
                            });
                            const content = dfObj.data?.content;
                            if (content && content.dataType === "moveObject" && "fields" in content) {
                                const fields = content.fields as Record<string, unknown>;
                                const assigneeAddr = fields.value as string;
                                if (assigneeAddr && !cancelled) {
                                    setAssignee(assigneeAddr);
                                }
                            }
                        } catch (err) {
                            console.error("Error fetching assignee:", err);
                        }
                    }
                    
                    if (!hasAccessControlKey(df.name)) continue;
                    
                    try {
                        const dfObj = await client.getDynamicFieldObject({
                            parentId: taskId,
                            name: df.name,
                        });
                        
                        const content = dfObj.data?.content;
                        if (content && content.dataType === "moveObject" && "fields" in content) {
                            const fields = content.fields as Record<string, unknown>;
                            
                            // The AccessControl is nested: fields.value.fields.roles.fields.id.id
                            const valueFields = (fields?.value as Record<string, unknown>)?.fields as Record<string, unknown>;
                            const rolesField = valueFields?.roles as Record<string, unknown>;
                            
                            // Extract table ID from the nested structure
                            const idObj = (rolesField?.fields as Record<string, unknown>)?.id as Record<string, unknown>;
                            rolesTableId = idObj?.id as string;
                            
                            if (rolesTableId) break;
                        }
                    } catch (dfErr) {
                        console.warn("[TaskViewer] Failed to inspect dynamic field", dfErr);
                    }
                }

                if (!rolesTableId) {
                    return;
                }

                const roleEntries: Array<{ address: string; role: number }> = [];
                const roleDynamicFields = await client.getDynamicFields({ parentId: rolesTableId });
                
                for (const df of roleDynamicFields.data) {
                    try {
                        const entryObj = await client.getDynamicFieldObject({
                            parentId: rolesTableId,
                            name: df.name,
                        });
                        
                        const entryContent = entryObj.data?.content;
                        if (
                            entryContent &&
                            entryContent.dataType === "moveObject" &&
                            "fields" in entryContent
                        ) {
                            const f = entryContent.fields as Record<string, unknown>;
                            
                            // For table entries, the address is in the 'name' field
                            // and the role is in the 'value' field
                            const address = String(f.name || "");
                            const role = Number(f.value ?? 0);
                            
                            if (address && address.startsWith("0x")) {
                                roleEntries.push({ address, role });
                            }
                        }
                    } catch (entryErr) {
                        console.warn("[TaskViewer] Failed to read role entry", entryErr);
                    }
                }

                if (!cancelled) {
                    setSharedRoles(roleEntries);
                }
            } catch (error) {
                if (!cancelled) {
                    console.warn("[TaskViewer] Failed to fetch shared roles", error);
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingRoles(false);
                }
            }
        };

        fetchRoles();
        return () => {
            cancelled = true;
        };
    }, [client, taskId]);

    if (isLoadingTask) {
        return (
            <Card className="p-4">
                <CardContent className="flex items-center justify-center p-8">
                    <p className="text-muted-foreground">Loading task details...</p>
                </CardContent>
            </Card>
        );
    }

    if (isError || !taskData?.data?.content) {
        return (
            <Card className="p-4">
                <CardContent className="flex items-center justify-center p-8">
                    <p className="text-red-500">Failed to load task details</p>
                </CardContent>
            </Card>
        );
    }

    if (taskData.data.content.dataType !== "moveObject") {
        return (
            <Card className="p-4">
                <CardContent className="flex items-center justify-center p-8">
                    <p className="text-red-500">Invalid task data</p>
                </CardContent>
            </Card>
        );
    }

    const fields = taskData.data.content.fields as Record<string, unknown>;

    const parseOptionString = (value: unknown): string => {
        if (!value) return "";
        if (typeof value === "string") return value;
        if (Array.isArray(value)) return value[0] || "";
        if (typeof value === "object" && "vec" in (value as any)) {
            const vecVal = (value as any).vec;
            if (Array.isArray(vecVal)) return vecVal[0] || "";
        }
        return "";
    };

    const dueDate = fields.due_date as { vec: string[] } | undefined;
    const contentBlobId = parseOptionString(fields.content_blob_id);
    const resultBlobId = parseOptionString(fields.result_blob_id);
    const fileBlobIds = (fields.file_blob_ids as string[]) || [];
    const experienceId = parseOptionString((fields as any).experience_id);
    const status = fields.status as number;
    const createdAt = fields.created_at as string;
    const updatedAt = fields.updated_at as string;
    const category = fields.category as string;
    const tags = (fields.tags as string[]) || [];

    const task = {
        id: taskData.data.objectId,
        title: String(fields.title || ""),
        description: String(fields.description || ""),
        creator: String(fields.creator || ""),
        priority: Number(fields.priority || 1),
        status,
        is_completed: status === 2 || status === 3, // completed or approved
        created_at: createdAt,
        updated_at: updatedAt,
        due_date: dueDate?.vec?.[0] || "0",
        content_blob_id: contentBlobId,
        result_blob_id: resultBlobId,
        file_blob_ids: fileBlobIds,
        category,
        tags,
        experience_id: experienceId || experienceIdDf,
    };

    const priorityInfo = getPriorityLabel(task.priority);
    const overdueStatus = isOverdue(task.due_date, task.is_completed);

    const getStatusLabel = (status: number) => {
        switch (status) {
            case 0: return { label: "To Do", color: "bg-gray-500" };
            case 1: return { label: "In Progress", color: "bg-blue-500" };
            case 2: return { label: "Completed", color: "bg-green-500" };
            case 3: return { label: "Approved", color: "bg-emerald-600" };
            case 4: return { label: "Archived", color: "bg-orange-500" };
            default: return { label: "Unknown", color: "bg-gray-500" };
        }
    };

    const statusInfo = getStatusLabel(task.status);
    const canApprove = task.status === STATUS_COMPLETED;
    const hasContentBlob = !!task.content_blob_id;
    const hasResultBlob = !!task.result_blob_id;
    const mintReady = task.status === STATUS_APPROVED && (hasResultBlob || hasContentBlob);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Copied to clipboard!");
        } catch (err) {
            console.error("Failed to copy:", err);
            toast.error("Failed to copy");
        }
    };

    // Map numeric role to label
    const getRoleLabel = (role: number) => {
        switch (role) {
            case ROLE_OWNER:
                return "Owner";
            case ROLE_EDITOR:
                return "Editor";
            case ROLE_VIEWER:
                return "Viewer";
            default:
                return `Role ${role}`;
        }
    };

    // Fetch shared roles from dynamic field table
    const handleViewContent = async () => {
        if (!task.content_blob_id) return;
        
        setIsLoadingContent(true);
        setDecryptedContent("");
        
        try {
            console.log("[TaskViewer] Fetching content blob:", task.content_blob_id);
            const contentBytes = await getWalrusBlob(task.content_blob_id);
            const textDecoder = new TextDecoder();
            const contentText = textDecoder.decode(contentBytes);
            setDecryptedContent(contentText);
            setIsDialogOpen(true);
            console.log("[TaskViewer] Content loaded successfully");
        } catch (err) {
            console.error("Error fetching content:", err);
            toast.error("Failed to load content", {
                description: err instanceof Error ? err.message : "Unknown error"
            });
        } finally {
            setIsLoadingContent(false);
        }
    };

    // Fetch Experience ID stored as dynamic field (ExperienceMintKey)
    useEffect(() => {
        const fetchExperienceDf = async () => {
            if (!taskId) return;
            try {
                const dfList = await client.getDynamicFields({ parentId: taskId });
                const expField = dfList.data.find(
                    (f) =>
                        typeof f.name === "object" &&
                        (f.name as any).type &&
                        String((f.name as any).type).includes("ExperienceMintKey")
                );
                if (expField) {
                    const dfObject = await client.getDynamicFieldObject({
                        parentId: taskId,
                        name: expField.name as any,
                    });
                    const value =
                        dfObject.data?.content?.dataType === "moveObject"
                            ? ((dfObject.data.content.fields as any).value as string)
                            : undefined;
                    if (value) {
                        setExperienceIdDf(value);
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch experience ID dynamic field", err);
            }
        };
        fetchExperienceDf();
    }, [client, taskId]);

    const handleApproveStatus = async () => {
        if (!taskId || !account) {
            toast.error("Connect your wallet to approve");
            return;
        }
        if (!canApprove) {
            toast.error("Task must be completed before approval");
            return;
        }

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;
        const taskRegistryId = process.env.NEXT_PUBLIC_TASKS_REGISTRY_ID;
        const hasRegistry = !!taskRegistryId;

        if (!packageId || !versionObjectId) {
            toast.error("Configuration error");
            return;
        }

        setIsApproving(true);
        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${packageId}::task_manage::approve_completion`,
                arguments: hasRegistry
                    ? [tx.object(versionObjectId), tx.object(taskId), tx.object(taskRegistryId!)]
                    : [tx.object(versionObjectId), tx.object(taskId)],
            });

            const resp = await signAndExecuteTransaction({ transaction: tx });
            await client.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success("Task marked as APPROVED and payout sent");
        } catch (error) {
            console.error("Failed to approve task", error);
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes("MoveAbort") && message.includes(" 9)")) {
                toast.error("Only the task owner can approve", {
                    description: "Switch to the owner wallet and retry approval.",
                });
            } else {
                toast.error("Failed to approve task", {
                    description: error instanceof Error ? error.message : "Unknown error",
                });
            }
        } finally {
            setIsApproving(false);
        }
    };

    return (
        <>
        <Card
            className={`p-4 ${
                overdueStatus ? "border-2 border-red-500 bg-red-50" : ""
            }`}
        >
            <CardContent className="flex flex-col gap-4 p-0">
                {/* --- Task Info --- */}
                <div className="flex flex-col gap-3">
                    {/* Title and Priority */}
                    <div className="flex items-start gap-2 flex-wrap">
                        <div className="flex-1 min-w-0 space-y-1">
                            <strong className="text-lg font-semibold block truncate">
                                {task.title}
                            </strong>
                            {task.experience_id && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">Experience ID:</span>
                                    <code className="font-mono break-all">{task.experience_id}</code>
                                </div>
                            )}
                        </div>

                        <Badge
                            className={`${priorityInfo.color} text-white`}
                        >
                            {priorityInfo.label}
                        </Badge>

                        <Badge className={`${statusInfo.color} text-white`}>
                            {statusInfo.label}
                        </Badge>

                        {canApprove && (
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleApproveStatus}
                                disabled={isApproving}
                            >
                                {isApproving ? "Approving..." : "Mark Approved"}
                            </Button>
                        )}

                        {overdueStatus && (
                            <Badge className="bg-red-600 text-white">
                                OVERDUE
                            </Badge>
                        )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground">
                        {task.description}
                    </p>

                    {/* Guided Workflow */}
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                        <div className="font-semibold mb-1">Workflow checklist</div>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Upload encrypted content in <strong>Content</strong> tab (optional but helps SEAL).</li>
                            <li>Submit work with result blob in <strong>Submit</strong> tab.</li>
                            <li>Owner clicks <strong>Approve</strong> when completed.</li>
                            <li>Mint Experience NFT in <strong>Experience</strong> tab (needs content or result blob).</li>
                            <li>List for sale with license/copy limits.</li>
                        </ol>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {!hasResultBlob && (
                                <Badge variant="outline">Pending: Submit result blob</Badge>
                            )}
                            {hasResultBlob && <Badge variant="secondary">Result blob ready</Badge>}
                            {hasContentBlob && <Badge variant="secondary">Content blob ready</Badge>}
                            {task.status === STATUS_COMPLETED && <Badge variant="secondary">Ready to approve</Badge>}
                            {task.status === STATUS_APPROVED && (hasContentBlob || hasResultBlob) && (
                                <Badge variant="default">Mint-ready</Badge>
                            )}
                        </div>
                    </div>

                    {/* Object ID Section - Enhanced */}
                    <div className="border rounded-lg p-3 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Hash className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                                    Object ID
                                </span>
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyToClipboard(task.id)}
                                    className="h-7 px-2 text-xs"
                                    title="Copy Object ID"
                                >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    asChild
                                    className="h-7 px-2 text-xs"
                                    title="View on Suiscan"
                                >
                                    <a
                                        href={`https://suiscan.xyz/testnet/object/${task.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        View
                                    </a>
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-gray-700">
                            <code className="text-xs font-mono flex-1 break-all text-gray-800 dark:text-gray-200">
                                {task.id}
                            </code>
                        </div>
                    </div>

                    {/* Creator Section - Enhanced */}
                    <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
                                    Created by:
                                </span>
                                <code className="text-sm font-mono text-blue-600 dark:text-blue-400 truncate">
                                    {task.creator}
                                </code>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(task.creator)}
                                className="h-7 px-2 shrink-0"
                                title="Copy creator address"
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>

                    {/* Assignee Section */}
                    {assignee && (
                        <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <User className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
                                        Assignee:
                                    </span>
                                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400 truncate">
                                        {assignee}
                                    </code>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyToClipboard(assignee)}
                                    className="h-7 px-2 shrink-0"
                                    title="Copy assignee address"
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Result/Completed Work Section */}
                    {task.result_blob_id && (
                        <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-950">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                    Submitted Work
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="text-xs font-mono flex-1 break-all text-gray-800 dark:text-gray-200 bg-white dark:bg-slate-800 p-2 rounded border">
                                    {task.result_blob_id}
                                </code>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyToClipboard(task.result_blob_id)}
                                    className="h-7 px-2 shrink-0"
                                    title="Copy result blob ID"
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Shared Access */}
                    <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-900">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                    Shared Access
                                </span>
                            </div>
                            <Badge variant="secondary">
                                {isLoadingRoles ? "Loading..." : `Total: ${sharedRoles.length}`}
                            </Badge>
                        </div>
                        {isLoadingRoles ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Fetching access list…</span>
                            </div>
                        ) : sharedRoles.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No additional addresses have been shared.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {sharedRoles.map((entry) => (
                                    <div
                                        key={entry.address}
                                        className="flex items-center justify-between rounded border px-3 py-2 bg-white dark:bg-slate-800"
                                    >
                                        <code className="text-xs font-mono break-all text-gray-800 dark:text-gray-200 flex-1">
                                            {entry.address}
                                        </code>
                                        <Badge className="ml-3">
                                            {getRoleLabel(entry.role)}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Dates */}
                    <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-900">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                                    Created
                                </span>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {new Date(parseInt(task.created_at)).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                                    Updated
                                </span>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {new Date(parseInt(task.updated_at)).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                                    Due Date
                                </span>
                                <p className={`text-sm font-medium ${overdueStatus ? 'text-red-600 font-bold' : 'text-gray-800 dark:text-gray-200'}`}>
                                    {formatDueDate(task.due_date)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Category and Tags */}
                    {(task.category || (task.tags && task.tags.length > 0)) && (
                        <div className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-900">
                            {task.category && (
                                <div className="mb-3">
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">
                                        Category
                                    </span>
                                    <Badge variant="outline" className="text-sm">
                                        {task.category}
                                    </Badge>
                                </div>
                            )}

                            {task.tags && task.tags.length > 0 && (
                                <div>
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">
                                        Tags
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {task.tags.map((tag, index) => (
                                            <Badge 
                                                key={index} 
                                                variant="secondary" 
                                                className="text-xs px-2 py-0.5"
                                            >
                                                #{tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Content Blob ID with View Button */}
                    {task.content_blob_id && (
                        <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                                        Content Blob ID
                                    </span>
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
                                            View Content
                                        </>
                                    )}
                                </Button>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded border">
                                <code className="text-xs font-mono text-gray-800 dark:text-gray-200 flex-1 break-all">
                                    {task.content_blob_id}
                                </code>
                                <div className="flex gap-1 shrink-0">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyToClipboard(task.content_blob_id)}
                                        className="h-7 px-2"
                                        title="Copy Blob ID"
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        asChild
                                        className="h-7 px-2"
                                        title="View on Walruscan"
                                    >
                                        <a
                                            href={`https://walruscan.com/testnet/blob/${task.content_blob_id}`}
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
                </div>
            </CardContent>
        </Card>

        {/* Content View Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Content Preview
                </DialogTitle>
                <DialogDescription asChild>
                    <div className="space-y-4 mt-4">
                        {decryptedContent ? (
                            <div className="space-y-3">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 max-h-96 overflow-y-auto">
                                    <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono">
                                        {decryptedContent}
                                    </pre>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {decryptedContent.length} characters • {new Blob([decryptedContent]).size} bytes
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>No content to display</p>
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
        </>
    );
}
