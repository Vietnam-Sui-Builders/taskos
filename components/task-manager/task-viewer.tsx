"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { formatDueDate, getPriorityLabel, isOverdue } from "@/helpers";
import { useSuiClientQuery, useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Hash, Copy, ExternalLink, Eye, FileText, Loader2, User, CheckCircle, Pencil, Check, X, Calendar, Tag, Folder, Plus, Clock, AlertTriangle, Shield, Layers, FileCode, Info, Play } from "lucide-react";
import { toast } from "sonner";
import { getWalrusBlob } from "@/utils/walrus";
import { useSuiClient } from "@mysten/dapp-kit";
import { ROLE_OWNER, ROLE_EDITOR, ROLE_VIEWER, STATUS_COMPLETED, STATUS_APPROVED, STATUS_TODO, STATUS_IN_PROGRESS, STATUS_ARCHIVED } from "@/types";
import { Transaction } from "@mysten/sui/transactions";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

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
    const [isStarting, setIsStarting] = useState(false);
    const [experienceIdDf, setExperienceIdDf] = useState<string>("");
    
    // Inline Edit States
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState("");
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [tempDesc, setTempDesc] = useState("");
    const [isEditingCategory, setIsEditingCategory] = useState(false);
    const [tempCategory, setTempCategory] = useState("");
    const [isEditingDueDate, setIsEditingDueDate] = useState(false);
    const [tempDueDate, setTempDueDate] = useState("");
    const [newTag, setNewTag] = useState("");
    const [isAddingTag, setIsAddingTag] = useState(false);

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

    if (isLoadingTask) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isError || !taskData?.data?.content) {
        return (
            <div className="flex items-center justify-center p-12 text-destructive">
                <AlertTriangle className="h-6 w-6 mr-2" />
                <p>Failed to load task details</p>
            </div>
        );
    }

    if (taskData.data.content.dataType !== "moveObject") {
        return (
            <div className="flex items-center justify-center p-12 text-destructive">
                <AlertTriangle className="h-6 w-6 mr-2" />
                <p>Invalid task data</p>
            </div>
        );
    }

    const fields = taskData.data.content.fields as Record<string, unknown>;

    const extractOptionValue = (value: unknown): string | undefined => {
        if (!value || typeof value !== "object") return undefined;
        const vecVal = (value as any).vec ?? (value as any).fields?.vec;
        if (Array.isArray(vecVal) && vecVal.length > 0 && vecVal[0] != null) {
            return String(vecVal[0]);
        }
        return undefined;
    };

    const parseOptionString = (value: unknown): string => {
        if (!value) return "";
        if (typeof value === "string") return value;
        if (Array.isArray(value)) return value[0] || "";
        const extracted = extractOptionValue(value);
        if (extracted !== undefined) return extracted;
        return "";
    };

    const dueDate = extractOptionValue(fields.due_date);
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
        due_date: dueDate || "0",
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
            case 0: return { label: "To Do", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" };
            case 1: return { label: "In Progress", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
            case 2: return { label: "Completed", color: "bg-green-500/10 text-green-500 border-green-500/20" };
            case 3: return { label: "Approved", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
            case 4: return { label: "Archived", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" };
            default: return { label: "Unknown", color: "bg-gray-500/10 text-gray-500 border-gray-500/20" };
        }
    };

    const statusInfo = getStatusLabel(task.status);
    const canApprove = task.status === STATUS_COMPLETED;
    const isAssignee = account?.address && assignee && account.address.toLowerCase() === assignee.toLowerCase();
    const canStart = isAssignee && task.status === STATUS_TODO;
    const hasContentBlob = !!task.content_blob_id;
    const hasResultBlob = !!task.result_blob_id;

    // Map numeric role to label
    const getRoleLabel = (role: number) => {
        switch (role) {
            case ROLE_OWNER: return "Owner";
            case ROLE_EDITOR: return "Editor";
            case ROLE_VIEWER: return "Viewer";
            default: return `Role ${role}`;
        }
    };
    
    // --- MUTATION HANDLERS ---

    const handleUpdateTitle = async () => {
        if (!tempTitle.trim() || tempTitle === task.title) {
            setIsEditingTitle(false);
            return;
        }
        await updateTaskInfo(tempTitle, task.description);
        setIsEditingTitle(false);
    };

    const handleUpdateDescription = async () => {
        if (!tempDesc.trim() || tempDesc === task.description) {
            setIsEditingDesc(false);
            return;
        }
        await updateTaskInfo(task.title, tempDesc);
        setIsEditingDesc(false);
    };

    const updateTaskInfo = async (newTitle: string, newDesc: string) => {
        if (!taskId || !account) return;
        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;
        if (!packageId || !versionObjectId) return;

        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${packageId}::task_manage::update_task_info`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.string(newTitle),
                    tx.pure.string(newDesc),
                    tx.object("0x6"),
                ],
            });
            const resp = await signAndExecuteTransaction({ transaction: tx });
            await client.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });
            toast.success("Task updated");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update task");
        }
    };

    const handleUpdatePriority = async (newPriority: string) => {
        if (!taskId || !account) return;
        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;
        if (!packageId || !versionObjectId) return;

        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${packageId}::task_manage::update_priority`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.u8(Number(newPriority)),
                    tx.object("0x6"),
                ],
            });
            const resp = await signAndExecuteTransaction({ transaction: tx });
            await client.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });
            toast.success("Priority updated");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update priority");
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        if (!taskId || !account) return;
        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;
        const taskRegistryId = process.env.NEXT_PUBLIC_TASKS_REGISTRY_ID;
        if (!packageId || !versionObjectId || !taskRegistryId) return;

        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${packageId}::task_manage::update_status`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.u8(Number(newStatus)),
                    tx.object("0x6"),
                    tx.object(taskRegistryId),
                ],
            });
            const resp = await signAndExecuteTransaction({ transaction: tx });
            await client.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });
            toast.success("Status updated");
        } catch (error) {
            console.error(error);
            toast.error("Failed to update status");
        }
    };

    const handleUpdateCategory = async () => {
        if (!tempCategory.trim() || tempCategory === task.category) {
            setIsEditingCategory(false);
            return;
        }
        if (!taskId || !account) return;
        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;
        if (!packageId || !versionObjectId) return;

        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${packageId}::task_manage::update_category`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.string(tempCategory),
                    tx.object("0x6"),
                ],
            });
            const resp = await signAndExecuteTransaction({ transaction: tx });
            await client.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });
            toast.success("Category updated");
            setIsEditingCategory(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update category");
        }
    };

    const handleUpdateDueDate = async () => {
        if (!tempDueDate) {
            setIsEditingDueDate(false);
            return;
        }
        if (!taskId || !account) return;
        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;
        if (!packageId || !versionObjectId) return;

        try {
            const tx = new Transaction();
            const dueDateTimestamp = Math.floor(new Date(tempDueDate).getTime());
            tx.moveCall({
                target: `${packageId}::task_manage::update_due_date`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.option("u64", dueDateTimestamp),
                    tx.object("0x6"),
                ],
            });
            const resp = await signAndExecuteTransaction({ transaction: tx });
            await client.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });
            toast.success("Due date updated");
            setIsEditingDueDate(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update due date");
        }
    };

    const handleAddTag = async () => {
        if (!newTag.trim()) return;
        if (!taskId || !account) return;
        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;
        if (!packageId || !versionObjectId) return;

        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${packageId}::task_manage::add_tag`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.string(newTag),
                    tx.object("0x6"),
                ],
            });
            const resp = await signAndExecuteTransaction({ transaction: tx });
            await client.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });
            toast.success("Tag added");
            setNewTag("");
            setIsAddingTag(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to add tag");
        }
    };

    const handleRemoveTag = async (tagIndex: number) => {
        if (!taskId || !account) return;
        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;
        if (!packageId || !versionObjectId) return;

        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${packageId}::task_manage::remove_tag`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.u64(tagIndex),
                    tx.object("0x6"),
                ],
            });
            const resp = await signAndExecuteTransaction({ transaction: tx });
            await client.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });
            toast.success("Tag removed");
        } catch (error) {
            console.error(error);
            toast.error("Failed to remove tag");
        }
    };

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

    const handleStartTask = async () => {
        if (!taskId || !account) {
            toast.error("Connect your wallet to start task");
            return;
        }
        if (!canStart) {
            toast.error("Only the assignee can start the task");
            return;
        }

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;
        const taskRegistryId = process.env.NEXT_PUBLIC_TASKS_REGISTRY_ID;

        if (!packageId || !versionObjectId || !taskRegistryId) {
            toast.error("Configuration error");
            return;
        }

        setIsStarting(true);
        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${packageId}::task_manage::update_status`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.u8(STATUS_IN_PROGRESS),
                    tx.object("0x6"),
                    tx.object(taskRegistryId),
                ],
            });

            const resp = await signAndExecuteTransaction({ transaction: tx });
            await client.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success("Task started! Status updated to In Progress.");
        } catch (error) {
            console.error("Failed to start task", error);
            toast.error("Failed to start task", {
                description: error instanceof Error ? error.message : "Unknown error",
            });
        } finally {
            setIsStarting(false);
        }
    };

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
            const contentBytes = await getWalrusBlob(task.content_blob_id);
            const textDecoder = new TextDecoder();
            const contentText = textDecoder.decode(contentBytes);
            setDecryptedContent(contentText);
            setIsDialogOpen(true);
        } catch (err) {
            console.error("Error fetching content:", err);
            toast.error("Failed to load content");
        } finally {
            setIsLoadingContent(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className={cn(
                "glass border border-primary/10 bg-background/40 backdrop-blur-md rounded-xl overflow-hidden shadow-sm transition-all duration-300",
                overdueStatus && "border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
            )}>
                <div className="p-6 md:p-8 space-y-8">
                    {/* --- Header Section --- */}
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            {/* Title & Experience ID */}
                            <div className="flex-1 space-y-3">
                                {isEditingTitle ? (
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            value={tempTitle}
                                            onChange={(e) => setTempTitle(e.target.value)}
                                            className="text-2xl md:text-3xl font-bold font-display h-12 bg-background/50"
                                            autoFocus
                                        />
                                        <Button size="icon" variant="ghost" onClick={handleUpdateTitle} className="h-10 w-10 text-green-500 hover:text-green-600 hover:bg-green-500/10">
                                            <Check className="h-5 w-5" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(false)} className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-500/10">
                                            <X className="h-5 w-5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="group flex items-start gap-3">
                                        <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground/90 group-hover:text-primary transition-colors">
                                            {task.title}
                                        </h1>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 -mt-1"
                                            onClick={() => {
                                                setTempTitle(task.title);
                                                setIsEditingTitle(true);
                                            }}
                                        >
                                            <Pencil className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                )}
                                
                                {task.experience_id && (
                                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded w-fit">
                                        <Hash className="h-3 w-3" />
                                        <span className="truncate max-w-[200px]">{task.experience_id}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-4 w-4 hover:bg-transparent hover:text-primary"
                                            onClick={() => copyToClipboard(task.experience_id)}
                                        >
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Status & Priority Badges */}
                            <div className="flex flex-wrap items-center gap-3">
                            {/* Priority Selector */}
                            <div className="flex flex-col gap-1">
                                <Label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono">Priority</Label>
                                <Select 
                                        value={String(task.priority)} 
                                        onValueChange={handleUpdatePriority}
                                    >
                                        <SelectTrigger className={cn(
                                            "h-9 border-0 font-medium text-xs uppercase tracking-wider px-3 min-w-[100px] transition-all hover:scale-105",
                                            priorityInfo.color === "bg-red-500" && "bg-red-500/10 text-red-500 hover:bg-red-500/20",
                                            priorityInfo.color === "bg-orange-500" && "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
                                            priorityInfo.color === "bg-blue-500" && "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
                                            priorityInfo.color === "bg-green-500" && "bg-green-500/10 text-green-500 hover:bg-green-500/20",
                                            priorityInfo.color === "bg-gray-500" && "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20"
                                        )}>
                                            <SelectValue>{priorityInfo.label}</SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">Low</SelectItem>
                                            <SelectItem value="2">Medium</SelectItem>
                                            <SelectItem value="3">High</SelectItem>
                                            <SelectItem value="4">Critical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Status Selector */}
                                <div className="flex flex-col gap-1">
                                    <Label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono">Status</Label>
                                    <Select 
                                        value={String(task.status)} 
                                        onValueChange={handleUpdateStatus}
                                        disabled={task.status === STATUS_COMPLETED || task.status === STATUS_APPROVED}
                                    >
                                        <SelectTrigger className={cn(
                                            "h-9 border-0 font-medium text-xs uppercase tracking-wider px-3 min-w-[120px] transition-all hover:scale-105",
                                            statusInfo.color
                                        )}>
                                            <SelectValue>{statusInfo.label}</SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={String(STATUS_TODO)}>To Do</SelectItem>
                                            <SelectItem value={String(STATUS_IN_PROGRESS)}>In Progress</SelectItem>
                                            <SelectItem value={String(STATUS_COMPLETED)}>Completed</SelectItem>
                                            <SelectItem value={String(STATUS_APPROVED)} disabled>Approved</SelectItem>
                                            <SelectItem value={String(STATUS_ARCHIVED)}>Archived</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {canApprove && (
                                    <Button
                                        size="sm"
                                        onClick={handleApproveStatus}
                                        disabled={isApproving}
                                        className="h-9 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20 border-0"
                                    >
                                        {isApproving ? (
                                            <>
                                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                                Approving...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle className="h-3 w-3 mr-2" />
                                                Approve
                                            </>
                                        )}
                                    </Button>
                                )}

                                {overdueStatus && (
                                    <Badge variant="destructive" className="h-9 px-3 uppercase tracking-wider animate-pulse">
                                        Overdue
                                    </Badge>
                                )}

                                {canStart && (
                                    <Button
                                        size="sm"
                                        onClick={handleStartTask}
                                        disabled={isStarting}
                                        className="h-9 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/20 border-0"
                                    >
                                        {isStarting ? (
                                            <>
                                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                                Starting...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="h-3 w-3 mr-2 fill-current" />
                                                Start Task
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- Minted Experience NFT Section --- */}
                    {task.experience_id && (
                        <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-6 shadow-lg shadow-emerald-500/10">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                        <Layers className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold font-display text-emerald-500 flex items-center gap-2">
                                            Experience NFT Minted
                                            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-[10px]">
                                                LIVE
                                            </Badge>
                                        </h3>
                                        <p className="text-xs text-muted-foreground font-mono">
                                            This task has been converted to a tradeable Experience NFT
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 bg-background/50 rounded-lg p-3 border border-emerald-500/20">
                                    <Hash className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                    <code className="text-xs font-mono text-foreground flex-1 break-all">
                                        {task.experience_id}
                                    </code>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 hover:bg-emerald-500/10 hover:text-emerald-500"
                                            onClick={() => copyToClipboard(task.experience_id)}
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 hover:bg-emerald-500/10 hover:text-emerald-500"
                                            asChild
                                        >
                                            <a
                                                href={`https://suiscan.xyz/testnet/object/${task.experience_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 pt-2">
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                        <FileCode className="h-3 w-3 mr-1" />
                                        Blockchain Verified
                                    </Badge>
                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                                        <Shield className="h-3 w-3 mr-1" />
                                        SEAL Protected
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- Workflow Checklist --- */}
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-700 dark:text-blue-300">
                        <div className="flex items-center gap-2 font-semibold mb-2">
                            <Info className="h-4 w-4" />
                            Workflow Checklist
                        </div>
                        <ol className="list-decimal list-inside space-y-1 ml-1 opacity-90">
                            <li>Upload encrypted content in <strong>Actions &gt; Upload</strong> (optional).</li>
                            <li>Submit work with result blob in <strong>Actions &gt; Submit</strong>.</li>
                            <li>Owner clicks <strong>Approve</strong> when completed.</li>
                            <li>Mint Experience NFT in <strong>Actions &gt; Mint NFT</strong>.</li>
                        </ol>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {!hasResultBlob && <Badge variant="outline" className="bg-background/50">Pending: Submit work</Badge>}
                            {hasResultBlob && <Badge variant="secondary" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">Work Submitted</Badge>}
                            {hasContentBlob && <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20">Content Uploaded</Badge>}
                            {task.status === STATUS_COMPLETED && <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/20">Ready for Approval</Badge>}
                            {task.status === STATUS_APPROVED && (hasContentBlob || hasResultBlob) && !task.experience_id && (
                                <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500 border-0">Mint Ready</Badge>
                            )}
                            {task.experience_id && (
                                <Badge variant="default" className="bg-gradient-to-r from-emerald-500 to-teal-500 border-0">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Experience Minted
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* --- Description Section --- */}
                    <div className="group relative rounded-lg border border-transparent hover:border-primary/10 hover:bg-primary/5 transition-all duration-200 p-4 -mx-4">
                        <div className="flex items-center justify-between mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Description</span>
                            {!isEditingDesc && (
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 w-6 p-0"
                                    onClick={() => {
                                        setTempDesc(task.description);
                                        setIsEditingDesc(true);
                                    }}
                                >
                                    <Pencil className="h-3 w-3 text-muted-foreground" />
                                </Button>
                            )}
                        </div>
                        
                        {isEditingDesc ? (
                            <div className="space-y-3">
                                <Textarea 
                                    value={tempDesc}
                                    onChange={(e) => setTempDesc(e.target.value)}
                                    className="min-h-[120px] bg-background/80 text-base leading-relaxed resize-none focus-visible:ring-primary/20"
                                    autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditingDesc(false)} className="h-8 text-muted-foreground hover:text-foreground">
                                        Cancel
                                    </Button>
                                    <Button size="sm" onClick={handleUpdateDescription} className="h-8 bg-primary/10 text-primary hover:bg-primary/20 border-0">
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div 
                                className="prose prose-sm dark:prose-invert max-w-none cursor-text"
                                onClick={() => {
                                    setTempDesc(task.description);
                                    setIsEditingDesc(true);
                                }}
                            >
                                {task.description ? (
                                    <p className="text-base leading-relaxed text-foreground/80 whitespace-pre-wrap">
                                        {task.description}
                                    </p>
                                ) : (
                                    <p className="text-base italic text-muted-foreground/50">
                                        No description provided. Click to add details about this task.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* --- Metadata Grid --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-primary/5">
                        {/* Due Date */}
                        <div className="space-y-2">
                            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="h-3 w-3" /> Due Date
                            </span>
                            {isEditingDueDate ? (
                                <div className="flex items-center gap-2">
                                    <Input 
                                        type="date"
                                        value={tempDueDate}
                                        onChange={(e) => setTempDueDate(e.target.value)}
                                        className="h-9 bg-background/50"
                                        autoFocus
                                    />
                                    <Button size="icon" variant="ghost" onClick={handleUpdateDueDate} className="h-9 w-9 text-green-500 hover:bg-green-500/10">
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => setIsEditingDueDate(false)} className="h-9 w-9 text-red-500 hover:bg-red-500/10">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div 
                                    className="flex items-center gap-2 group cursor-pointer"
                                    onClick={() => {
                                        // Convert timestamp to YYYY-MM-DD for input
                                        const date = new Date(Number(task.due_date));
                                        const formatted = date.toISOString().split('T')[0];
                                        setTempDueDate(formatted);
                                        setIsEditingDueDate(true);
                                    }}
                                >
                                    <div className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all",
                                        overdueStatus 
                                            ? "bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400" 
                                            : "bg-background/50 border-border text-foreground/80 hover:border-primary/30"
                                    )}>
                                        <Clock className="h-4 w-4 opacity-70" />
                                        <span className="font-medium">
                                            {Number(task.due_date) > 0 ? formatDueDate(task.due_date) : "No due date"}
                                        </span>
                                    </div>
                                    <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Folder className="h-3 w-3" /> Category
                            </span>
                            {isEditingCategory ? (
                                <div className="flex items-center gap-2">
                                    <Input 
                                        value={tempCategory}
                                        onChange={(e) => setTempCategory(e.target.value)}
                                        className="h-9 bg-background/50"
                                        autoFocus
                                        placeholder="Enter category..."
                                    />
                                    <Button size="icon" variant="ghost" onClick={handleUpdateCategory} className="h-9 w-9 text-green-500 hover:bg-green-500/10">
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => setIsEditingCategory(false)} className="h-9 w-9 text-red-500 hover:bg-red-500/10">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div 
                                    className="flex items-center gap-2 group cursor-pointer"
                                    onClick={() => {
                                        setTempCategory(task.category);
                                        setIsEditingCategory(true);
                                    }}
                                >
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background/50 border-border text-foreground/80 hover:border-primary/30 transition-all">
                                        <span className="font-medium">
                                            {task.category || "Uncategorized"}
                                        </span>
                                    </div>
                                    <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}
                        </div>

                        {/* Assignee */}
                        <div className="space-y-2">
                            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <User className="h-3 w-3" /> Assignee
                            </span>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background/50 border-border text-foreground/80">
                                {assignee ? (
                                    <span className="font-mono text-xs truncate max-w-[150px]">{assignee}</span>
                                ) : (
                                    <span className="text-sm text-muted-foreground italic">Unassigned</span>
                                )}
                                {assignee && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 ml-auto"
                                        onClick={() => copyToClipboard(assignee)}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- Tags Section --- */}
                    <div className="space-y-3 pt-4 border-t border-primary/5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Tag className="h-3 w-3" /> Tags
                            </span>
                            {!isAddingTag && (
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 text-xs hover:bg-primary/5 hover:text-primary"
                                    onClick={() => setIsAddingTag(true)}
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Add Tag
                                </Button>
                            )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            {task.tags.map((tag, index) => (
                                <Badge 
                                    key={index} 
                                    variant="secondary" 
                                    className="h-7 pl-2.5 pr-1.5 gap-1 bg-secondary/50 hover:bg-secondary border border-secondary transition-colors group"
                                >
                                    #{tag}
                                    <button
                                        onClick={() => handleRemoveTag(index)}
                                        className="h-4 w-4 rounded-full hover:bg-background/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                                    >
                                        <X className="h-2.5 w-2.5" />
                                    </button>
                                </Badge>
                            ))}
                            
                            {isAddingTag && (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                                    <Input 
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        className="h-7 w-32 text-xs bg-background/50"
                                        placeholder="New tag..."
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddTag();
                                            if (e.key === 'Escape') setIsAddingTag(false);
                                        }}
                                    />
                                    <Button size="icon" variant="ghost" onClick={handleAddTag} className="h-7 w-7 text-green-500 hover:bg-green-500/10">
                                        <Check className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => setIsAddingTag(false)} className="h-7 w-7 text-red-500 hover:bg-red-500/10">
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                            
                            {task.tags.length === 0 && !isAddingTag && (
                                <span className="text-sm text-muted-foreground italic">No tags added</span>
                            )}
                        </div>
                    </div>

                    {/* --- Resources & Deliverables --- */}
                    {(hasContentBlob || hasResultBlob) && (
                        <div className="space-y-4 pt-6 border-t border-primary/5">
                            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Layers className="h-3 w-3" /> Resources & Deliverables
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {hasContentBlob && (
                                    <div className="rounded-lg border bg-background/50 p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="text-sm font-medium">Task Content</div>
                                                <div className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                                                    {task.content_blob_id?.slice(0, 8)}...
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="outline" onClick={handleViewContent} className="h-8 text-xs">
                                                {isLoadingContent ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3 mr-1" />}
                                                View
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                                                <a href={`https://walruscan.com/testnet/blob/${task.content_blob_id}`} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                
                                {hasResultBlob && (
                                    <div className="rounded-lg border bg-background/50 p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                                <CheckCircle className="h-4 w-4" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="text-sm font-medium">Submitted Work</div>
                                                <div className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                                                    {task.result_blob_id?.slice(0, 8)}...
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(task.result_blob_id)}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                                                <a href={`https://walruscan.com/testnet/blob/${task.result_blob_id}`} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* --- Access Control --- */}
                    <div className="space-y-4 pt-6 border-t border-primary/5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Shield className="h-3 w-3" /> Access Control
                            </span>
                            <Badge variant="outline" className="text-[10px] h-5">
                                {isLoadingRoles ? "Loading..." : `${sharedRoles.length} Shared`}
                            </Badge>
                        </div>
                        
                        {sharedRoles.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {sharedRoles.map((entry) => (
                                    <div key={entry.address} className="flex items-center justify-between rounded-md border bg-background/30 px-3 py-2 text-sm">
                                        <code className="text-xs font-mono text-muted-foreground truncate max-w-[180px]">
                                            {entry.address}
                                        </code>
                                        <Badge variant="secondary" className="text-[10px] h-5">
                                            {getRoleLabel(entry.role)}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">No additional roles assigned.</p>
                        )}
                    </div>

                    {/* --- Technical Details --- */}
                    <div className="space-y-4 pt-6 border-t border-primary/5">
                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <FileCode className="h-3 w-3" /> Technical Details
                        </span>
                        
                        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                            {/* Object ID */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Object ID</span>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs font-mono bg-background px-2 py-1 rounded border truncate max-w-[200px] md:max-w-[300px]">
                                        {task.id}
                                    </code>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(task.id)}>
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" asChild>
                                        <a href={`https://suiscan.xyz/testnet/object/${task.id}`} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </Button>
                                </div>
                            </div>

                            {/* Creator */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Creator</span>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs font-mono bg-background px-2 py-1 rounded border truncate max-w-[200px] md:max-w-[300px]">
                                        {task.creator}
                                    </code>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(task.creator)}>
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>

                            {/* Timestamps */}
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                                <div>
                                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">Created At</span>
                                    <div className="text-xs font-medium mt-0.5">
                                        {new Date(Number(task.created_at)).toLocaleString()}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">Last Updated</span>
                                    <div className="text-xs font-medium mt-0.5">
                                        {new Date(Number(task.updated_at)).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Content Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogTitle>Task Content</DialogTitle>
                    <DialogDescription>
                        Decrypted content for this task.
                    </DialogDescription>
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-md overflow-auto max-h-[60vh]">
                        <pre className="whitespace-pre-wrap font-mono text-sm">{decryptedContent}</pre>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
