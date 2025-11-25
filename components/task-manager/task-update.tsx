"use client";

import { useState } from "react";
import { useSignAndExecuteTransaction, useSuiClient, useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleTransactionError } from "@/lib/errorHandling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { STATUS_TODO, STATUS_IN_PROGRESS, STATUS_COMPLETED, STATUS_APPROVED, STATUS_ARCHIVED } from "@/types";

interface TaskUpdateProps {
    taskId: string;
}

export function TaskUpdate({ taskId }: TaskUpdateProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("");
    const [status, setStatus] = useState("");
    const [category, setCategory] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [newTag, setNewTag] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const account = useCurrentAccount();
    const suiClient = useSuiClient();
    const queryClient = useQueryClient();
    const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

    // Fetch current task data
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

    const currentTags = fields ? (fields.tags as string[]) || [] : [];
    const taskStatus = fields ? Number(fields.status ?? 0) : 0;

    const updateTaskInfo = async () => {
        if (!taskId || !account) return;

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;

        if (!packageId || !versionObjectId) {
            toast.error("Configuration error: Missing package or version ID");
            return;
        }

        if (!title.trim() || !description.trim()) {
            toast.error("Title and description are required");
            return;
        }

        setIsUpdating(true);

        try {
            const tx = new Transaction();
            
            tx.moveCall({
                target: `${packageId}::task_manage::update_task_info`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.string(title),
                    tx.pure.string(description),
                    tx.object("0x6"), // clock
                ],
            });

            const resp = await signAndExecuteTransaction({ transaction: tx });
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success("Task info updated successfully!");
            setTitle("");
            setDescription("");
        } catch (error) {
            handleTransactionError(error, "Failed to update task");
        } finally {
            setIsUpdating(false);
        }
    };

    const updatePriority = async () => {
        if (!taskId || !account || !priority) return;

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;

        if (!packageId || !versionObjectId) {
            toast.error("Configuration error");
            return;
        }

        setIsUpdating(true);

        try {
            const tx = new Transaction();
            
            tx.moveCall({
                target: `${packageId}::task_manage::update_priority`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.u8(Number(priority)),
                    tx.object("0x6"),
                ],
            });

            const resp = await signAndExecuteTransaction({ transaction: tx });
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success("Priority updated!");
            setPriority("");
        } catch (error) {
            handleTransactionError(error, "Failed to update priority");
        } finally {
            setIsUpdating(false);
        }
    };

    const updateStatus = async () => {
        if (!taskId || !account || !status) return;

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;
        const taskRegistryId = process.env.NEXT_PUBLIC_TASKS_REGISTRY_ID;

        if (!packageId || !versionObjectId || !taskRegistryId) {
            toast.error("Configuration error");
            return;
        }

        setIsUpdating(true);

        try {
            const tx = new Transaction();
            
            tx.moveCall({
                target: `${packageId}::task_manage::update_status`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.u8(Number(status)),
                    tx.object("0x6"),
                    tx.object(taskRegistryId),
                ],
            });

            const resp = await signAndExecuteTransaction({ transaction: tx });
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success("Status updated!");
            setStatus("");
        } catch (error) {
            handleTransactionError(error, "Failed to update status");
        } finally {
            setIsUpdating(false);
        }
    };

    const updateStatusToApproved = async () => {
        if (!taskId || !account) return;
        if (taskStatus !== STATUS_COMPLETED) {
            toast.error("Task must be completed before marking approved");
            return;
        }

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;
        const taskRegistryId = process.env.NEXT_PUBLIC_TASKS_REGISTRY_ID;

        if (!packageId || !versionObjectId || !taskRegistryId) {
            toast.error("Configuration error");
            return;
        }

        setIsUpdating(true);

        try {
            const tx = new Transaction();
            
            tx.moveCall({
                target: `${packageId}::task_manage::update_status`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.u8(STATUS_APPROVED),
                    tx.object("0x6"),
                    tx.object(taskRegistryId),
                ],
            });

            const resp = await signAndExecuteTransaction({ transaction: tx });
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success("Status set to APPROVED");
            setStatus("");
        } catch (error) {
            handleTransactionError(error, "Failed to approve task");
        } finally {
            setIsUpdating(false);
        }
    };

    const updateCategory = async () => {
        if (!taskId || !account || !category.trim()) return;

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;

        if (!packageId || !versionObjectId) {
            toast.error("Configuration error");
            return;
        }

        setIsUpdating(true);

        try {
            const tx = new Transaction();
            
            tx.moveCall({
                target: `${packageId}::task_manage::update_category`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.string(category),
                    tx.object("0x6"),
                ],
            });

            const resp = await signAndExecuteTransaction({ transaction: tx });
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success("Category updated!");
            setCategory("");
        } catch (error) {
            handleTransactionError(error, "Failed to update category");
        } finally {
            setIsUpdating(false);
        }
    };

    const updateDueDate = async () => {
        if (!taskId || !account || !dueDate) return;

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;

        if (!packageId || !versionObjectId) {
            toast.error("Configuration error");
            return;
        }

        setIsUpdating(true);

        try {
            const tx = new Transaction();
            const dueDateTimestamp = Math.floor(new Date(dueDate).getTime());
            
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
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success("Due date updated!");
            setDueDate("");
        } catch (error) {
            handleTransactionError(error, "Failed to update due date");
        } finally {
            setIsUpdating(false);
        }
    };

    const addTag = async () => {
        if (!taskId || !account || !newTag.trim()) return;

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;

        if (!packageId || !versionObjectId) {
            toast.error("Configuration error");
            return;
        }

        setIsUpdating(true);

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
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success("Tag added!");
            setNewTag("");
        } catch (error) {
            handleTransactionError(error, "Failed to add tag");
        } finally {
            setIsUpdating(false);
        }
    };

    const removeTag = async (tagIndex: number) => {
        if (!taskId || !account) return;

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;

        if (!packageId || !versionObjectId) {
            toast.error("Configuration error");
            return;
        }

        setIsUpdating(true);

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
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success("Tag removed!");
        } catch (error) {
            handleTransactionError(error, "Failed to remove tag");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Update Task</CardTitle>
            </CardHeader>
            <ScrollArea className="h-[500px]">
                <CardContent className="space-y-6">
                    {/* Update Title & Description */}
                    <div className="space-y-4 border-b pb-4">
                        <h3 className="font-semibold">Basic Information</h3>
                        <div className="space-y-2">
                            <Label>New Title</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter new title"
                                disabled={isUpdating || taskStatus >= STATUS_COMPLETED}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>New Description</Label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Enter new description"
                                disabled={isUpdating || taskStatus >= STATUS_COMPLETED}
                                rows={3}
                            />
                        </div>
                        <Button onClick={updateTaskInfo} disabled={isUpdating || !title.trim() || !description.trim() || taskStatus >= STATUS_COMPLETED}>
                            Update Info
                        </Button>
                    </div>

                    {/* Update Priority */}
                    <div className="space-y-4 border-b pb-4">
                        <h3 className="font-semibold">Priority</h3>
                        <div className="space-y-2">
                            <Select value={priority} onValueChange={setPriority} disabled={isUpdating}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Low</SelectItem>
                                    <SelectItem value="2">Medium</SelectItem>
                                    <SelectItem value="3">High</SelectItem>
                                    <SelectItem value="4">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={updatePriority} disabled={isUpdating || !priority}>
                            Update Priority
                        </Button>
                    </div>

                    {/* Update Status */}
                    <div className="space-y-4 border-b pb-4">
                        <h3 className="font-semibold">Status</h3>
                        <div className="space-y-2">
                            <Select value={status} onValueChange={setStatus} disabled={isUpdating}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={String(STATUS_TODO)}>To Do</SelectItem>
                                    <SelectItem value={String(STATUS_IN_PROGRESS)}>In Progress</SelectItem>
                                    <SelectItem value={String(STATUS_COMPLETED)}>Completed</SelectItem>
                                    <SelectItem value={String(STATUS_APPROVED)}>Approved</SelectItem>
                                    <SelectItem value={String(STATUS_ARCHIVED)}>Archived</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button onClick={updateStatus} disabled={isUpdating || !status} className="flex-1">
                                Update Status
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={updateStatusToApproved}
                                disabled={isUpdating || taskStatus !== STATUS_COMPLETED}
                                className="flex-1"
                            >
                                Mark Approved
                            </Button>
                        </div>
                        {taskStatus !== STATUS_COMPLETED && taskStatus !== STATUS_APPROVED && (
                            <p className="text-xs text-muted-foreground">
                                Complete the task first to unlock approval.
                            </p>
                        )}
                    </div>

                    {/* Update Category */}
                    <div className="space-y-4 border-b pb-4">
                        <h3 className="font-semibold">Category</h3>
                        <div className="space-y-2">
                            <Input
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="Enter category"
                                disabled={isUpdating}
                            />
                        </div>
                        <Button onClick={updateCategory} disabled={isUpdating || !category.trim()}>
                            Update Category
                        </Button>
                    </div>

                    {/* Update Due Date */}
                    <div className="space-y-4 border-b pb-4">
                        <h3 className="font-semibold">Due Date</h3>
                        <div className="space-y-2">
                            <Input
                                type="datetime-local"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                disabled={isUpdating}
                            />
                        </div>
                        <Button onClick={updateDueDate} disabled={isUpdating || !dueDate}>
                            Update Due Date
                        </Button>
                    </div>

                    {/* Manage Tags */}
                    <div className="space-y-4">
                        <h3 className="font-semibold">Tags</h3>
                        {currentTags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {currentTags.map((tag, index) => (
                                    <div key={index} className="flex items-center gap-1 px-3 py-1 bg-secondary rounded-md">
                                        <span className="text-sm">#{tag}</span>
                                        <button
                                            onClick={() => removeTag(index)}
                                            disabled={isUpdating}
                                            className="text-destructive hover:text-destructive/80"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <Input
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                placeholder="Enter new tag"
                                disabled={isUpdating}
                            />
                            <Button onClick={addTag} disabled={isUpdating || !newTag.trim()}>
                                Add Tag
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </ScrollArea>
        </Card>
    );
}
