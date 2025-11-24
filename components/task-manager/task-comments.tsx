"use client";

import { useState } from "react";
import { useSignAndExecuteTransaction, useSuiClient, useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleTransactionError } from "@/lib/errorHandling";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Comment } from "@/types";

interface TaskCommentsProps {
    taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
    const [newComment, setNewComment] = useState("");
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editContent, setEditContent] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const account = useCurrentAccount();
    const suiClient = useSuiClient();
    const queryClient = useQueryClient();
    const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

    // Fetch task data to get comments from dynamic field
    // Note: Comments are stored in a dynamic field, so we'd need to query dynamic fields
    // For now, we'll show a placeholder. In a real implementation, you'd need to:
    // 1. Get the task's UID
    // 2. Query dynamic fields with CommentsKey
    // 3. Parse the comments vector
    const comments: Comment[] = [];

    const addComment = async () => {
        if (!taskId || !account || !newComment.trim()) return;

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;

        if (!packageId || !versionObjectId) {
            toast.error("Configuration error");
            return;
        }

        setIsProcessing(true);

        try {
            const tx = new Transaction();
            
            tx.moveCall({
                target: `${packageId}::task_manage::add_comment`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.string(newComment),
                    tx.object("0x6"), // clock
                ],
            });

            const resp = await signAndExecuteTransaction({ transaction: tx });
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success("Comment added!");
            setNewComment("");
        } catch (error) {
            handleTransactionError(error, "Failed to add comment");
        } finally {
            setIsProcessing(false);
        }
    };

    const editComment = async (commentIndex: number) => {
        if (!taskId || !account || !editContent.trim()) return;

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;

        if (!packageId || !versionObjectId) {
            toast.error("Configuration error");
            return;
        }

        setIsProcessing(true);

        try {
            const tx = new Transaction();
            
            tx.moveCall({
                target: `${packageId}::task_manage::edit_comment`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.u64(commentIndex),
                    tx.pure.string(editContent),
                    tx.object("0x6"),
                ],
            });

            const resp = await signAndExecuteTransaction({ transaction: tx });
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success("Comment updated!");
            setEditingIndex(null);
            setEditContent("");
        } catch (error) {
            handleTransactionError(error, "Failed to edit comment");
        } finally {
            setIsProcessing(false);
        }
    };

    const deleteComment = async (commentIndex: number) => {
        if (!taskId || !account) return;

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;

        if (!packageId || !versionObjectId) {
            toast.error("Configuration error");
            return;
        }

        setIsProcessing(true);

        try {
            const tx = new Transaction();
            
            tx.moveCall({
                target: `${packageId}::task_manage::delete_comment`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.u64(commentIndex),
                ],
            });

            const resp = await signAndExecuteTransaction({ transaction: tx });
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success("Comment deleted!");
        } catch (error) {
            handleTransactionError(error, "Failed to delete comment");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Add New Comment */}
                <div className="space-y-2">
                    <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        disabled={isProcessing}
                        rows={3}
                        maxLength={1000}
                    />
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                            {newComment.length}/1000 characters
                        </span>
                        <Button 
                            onClick={addComment} 
                            disabled={isProcessing || !newComment.trim()}
                            size="sm"
                        >
                            {isProcessing ? "Adding..." : "Add Comment"}
                        </Button>
                    </div>
                </div>

                {/* Comments List */}
                <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                        {comments.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No comments yet</p>
                                <p className="text-sm">Be the first to add a comment!</p>
                            </div>
                        ) : (
                            comments.map((comment, index) => (
                                <div 
                                    key={index} 
                                    className="border rounded-lg p-4 space-y-2 bg-card"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <div className="bg-primary/10 w-full h-full flex items-center justify-center text-xs">
                                                    {comment.author.slice(2, 4).toUpperCase()}
                                                </div>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-mono text-muted-foreground">
                                                    {comment.author.slice(0, 8)}...
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(parseInt(comment.created_at)).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        {comment.created_at !== comment.edited_at && (
                                            <Badge variant="outline" className="text-xs">
                                                Edited
                                            </Badge>
                                        )}
                                    </div>

                                    {editingIndex === index ? (
                                        <div className="space-y-2">
                                            <Textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                disabled={isProcessing}
                                                rows={3}
                                                maxLength={1000}
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => editComment(index)}
                                                    disabled={isProcessing || !editContent.trim()}
                                                >
                                                    Save
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setEditingIndex(null);
                                                        setEditContent("");
                                                    }}
                                                    disabled={isProcessing}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sm whitespace-pre-wrap">
                                                {comment.content}
                                            </p>
                                            {account?.address === comment.author && (
                                                <div className="flex gap-2 pt-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setEditingIndex(index);
                                                            setEditContent(comment.content);
                                                        }}
                                                        disabled={isProcessing}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-destructive"
                                                        onClick={() => deleteComment(index)}
                                                        disabled={isProcessing}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
