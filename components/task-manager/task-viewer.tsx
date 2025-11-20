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
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { Hash, Copy, ExternalLink, Eye, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getWalrusBlob } from "@/utils/walrus";

interface TaskViewerProps {
    taskId: string;
}

export function TaskViewer({ taskId }: TaskViewerProps) {
    const [decryptedContent, setDecryptedContent] = useState<string>("");
    const [isLoadingContent, setIsLoadingContent] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

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
    const dueDate = fields.due_date as { vec: string[] } | undefined;
    const contentBlobId = fields.content_blob_id as { vec: string[] } | undefined;
    const fileBlobIds = (fields.file_blob_ids as string[]) || [];
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
        is_completed: status === 2, // STATUS_COMPLETED = 2
        created_at: createdAt,
        updated_at: updatedAt,
        due_date: dueDate?.vec?.[0] || "0",
        content_blob_id: contentBlobId?.vec?.[0] || "",
        file_blob_ids: fileBlobIds,
        category,
        tags,
    };

    const priorityInfo = getPriorityLabel(task.priority);
    const overdueStatus = isOverdue(task.due_date, task.is_completed);

    const getStatusLabel = (status: number) => {
        switch (status) {
            case 0: return { label: "To Do", color: "bg-gray-500" };
            case 1: return { label: "In Progress", color: "bg-blue-500" };
            case 2: return { label: "Completed", color: "bg-green-500" };
            case 3: return { label: "Archived", color: "bg-orange-500" };
            default: return { label: "Unknown", color: "bg-gray-500" };
        }
    };

    const statusInfo = getStatusLabel(task.status);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Copied to clipboard!");
        } catch (err) {
            console.error("Failed to copy:", err);
            toast.error("Failed to copy");
        }
    };

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
                        <strong className="text-lg font-semibold flex-1">
                            {task.title}
                        </strong>

                        <Badge
                            className={`${priorityInfo.color} text-white`}
                        >
                            {priorityInfo.label}
                        </Badge>

                        <Badge className={`${statusInfo.color} text-white`}>
                            {statusInfo.label}
                        </Badge>

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
