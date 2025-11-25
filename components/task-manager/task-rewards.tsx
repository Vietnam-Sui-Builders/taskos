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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, User, CheckCircle } from "lucide-react";

interface TaskRewardsProps {
    taskId: string;
}

export function TaskRewards({ taskId }: TaskRewardsProps) {
    const [depositAmount, setDepositAmount] = useState("");
    const [assigneeAddress, setAssigneeAddress] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

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

    const showConfigError = (missing: string[]) => {
        toast.error("Configuration error", {
            description: `Missing env: ${missing.join(", ")}`,
        });
    };

    const depositReward = async () => {
        if (!taskId || !account || !depositAmount) return;

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;
        const taskRegistryId = process.env.NEXT_PUBLIC_TASKS_REGISTRY_ID;
        const hasRegistry = !!taskRegistryId;

        if (!packageId || !versionObjectId) {
            const missing = [];
            if (!packageId) missing.push("NEXT_PUBLIC_PACKAGE_ID");
            if (!versionObjectId) missing.push("NEXT_PUBLIC_VERSION_ID");
            showConfigError(missing);
            return;
        }

        const amountInMist = parseFloat(depositAmount) * 1_000_000_000; // Convert SUI to MIST
        if (isNaN(amountInMist) || amountInMist <= 0) {
            toast.error("Invalid amount", {
                description: "Enter a positive SUI amount to deposit.",
            });
            return;
        }

        setIsProcessing(true);

        try {
            const tx = new Transaction();
            
            // Split coins for payment
            const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
            
            tx.moveCall({
                target: `${packageId}::task_manage::deposit_reward`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    coin,
                    tx.object("0x6"), // clock
                ],
            });

            const resp = await signAndExecuteTransaction({ transaction: tx });
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success(`Deposited ${depositAmount} SUI as reward!`);
            setDepositAmount("");
        } catch (error) {
            console.error("Error depositing reward:", error);
            handleTransactionError(error, "Failed to deposit reward");
        } finally {
            setIsProcessing(false);
        }
    };

    const setAssignee = async () => {
        if (!taskId || !account || !assigneeAddress.trim()) return;

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;

        if (!packageId || !versionObjectId) {
            const missing = [];
            if (!packageId) missing.push("NEXT_PUBLIC_PACKAGE_ID");
            if (!versionObjectId) missing.push("NEXT_PUBLIC_VERSION_ID");
            showConfigError(missing);
            return;
        }

        setIsProcessing(true);

        try {
            const tx = new Transaction();
            
            tx.moveCall({
                target: `${packageId}::task_manage::set_assignee`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.pure.address(assigneeAddress),
                    tx.object("0x6"),
                ],
            });

            const resp = await signAndExecuteTransaction({ transaction: tx });
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success("Assignee set successfully!");
            setAssigneeAddress("");
        } catch (error) {
            console.error("Error setting assignee:", error);
            handleTransactionError(error, "Failed to set assignee");
        } finally {
            setIsProcessing(false);
        }
    };

    const approveCompletion = async () => {
        if (!taskId || !account) return;

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;
        const taskRegistryId = process.env.NEXT_PUBLIC_TASKS_REGISTRY_ID;
        const hasRegistry = !!taskRegistryId;

        if (!packageId || !versionObjectId) {
            const missing = [];
            if (!packageId) missing.push("NEXT_PUBLIC_PACKAGE_ID");
            if (!versionObjectId) missing.push("NEXT_PUBLIC_VERSION_ID");
            showConfigError(missing);
            return;
        }

        if (taskStatus !== 2) { // STATUS_COMPLETED = 2
            toast.error("Task must be completed before approving", {
                description: "Submit completion first, then retry approval.",
            });
            return;
        }

        setIsProcessing(true);

        try {
            const tx = new Transaction();
            
            tx.moveCall({
                target: `${packageId}::task_manage::approve_completion`,
                arguments: hasRegistry
                    ? [tx.object(versionObjectId), tx.object(taskId), tx.object(taskRegistryId!)]
                    : [tx.object(versionObjectId), tx.object(taskId)],
            });

            const resp = await signAndExecuteTransaction({ transaction: tx });
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success("Completion approved! Reward transferred to assignee.");
        } catch (error) {
            console.error("Error approving completion:", error);
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes("MoveAbort") && message.includes(" 9)")) {
                toast.error("Only the task owner can approve", {
                    description: "Switch to the owner wallet and retry approval.",
                });
            } else {
                handleTransactionError(error, "Failed to approve completion");
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const cancelTask = async () => {
        if (!taskId || !account) return;

        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;

        if (!packageId || !versionObjectId) {
            const missing = [];
            if (!packageId) missing.push("NEXT_PUBLIC_PACKAGE_ID");
            if (!versionObjectId) missing.push("NEXT_PUBLIC_VERSION_ID");
            showConfigError(missing);
            return;
        }

        setIsProcessing(true);

        try {
            const tx = new Transaction();
            
            tx.moveCall({
                target: `${packageId}::task_manage::cancel_task`,
                arguments: [
                    tx.object(versionObjectId),
                    tx.object(taskId),
                    tx.object("0x6"),
                ],
            });

            const resp = await signAndExecuteTransaction({ transaction: tx });
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({ queryKey: ["testnet", "getObject"] });

            toast.success("Task cancelled and all deposits refunded!");
        } catch (error) {
            console.error("Error cancelling task:", error);
            handleTransactionError(error, "Failed to cancel task");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Deposit Reward */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5" />
                        Deposit Reward
                    </CardTitle>
                    <CardDescription>
                        Add SUI tokens as a reward for task completion
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Amount (SUI)</Label>
                        <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            placeholder="0.0"
                            disabled={isProcessing}
                        />
                    </div>
                    <Button 
                        onClick={depositReward} 
                        disabled={isProcessing || !depositAmount || taskStatus >= 2}
                        className="w-full"
                    >
                        {isProcessing ? "Depositing..." : "Deposit Reward"}
                    </Button>
                    {taskStatus >= 2 && (
                        <Badge variant="secondary" className="w-full justify-center">
                            Cannot deposit to completed/approved task
                        </Badge>
                    )}
                </CardContent>
            </Card>

            {/* Set Assignee */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Set Assignee
                    </CardTitle>
                    <CardDescription>
                        Assign this task to a specific user
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Assignee Address</Label>
                        <Input
                            value={assigneeAddress}
                            onChange={(e) => setAssigneeAddress(e.target.value)}
                            placeholder="0x..."
                            disabled={isProcessing}
                        />
                    </div>
                    <Button 
                        onClick={setAssignee} 
                        disabled={isProcessing || !assigneeAddress.trim()}
                        className="w-full"
                    >
                        {isProcessing ? "Setting..." : "Set Assignee"}
                    </Button>
                </CardContent>
            </Card>

            {/* Approve Completion */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Approve Completion
                    </CardTitle>
                    <CardDescription>
                        Approve the task completion and transfer reward to assignee
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {taskStatus === 3 && (
                        <Badge variant="outline" className="w-full justify-center">
                            Task already approved
                        </Badge>
                    )}
                    {taskStatus !== 2 && taskStatus !== 3 && (
                        <Badge variant="secondary" className="w-full justify-center">
                            Task must be completed first
                        </Badge>
                    )}
                    {taskStatus === 2 && (
                        <Button 
                            onClick={approveCompletion} 
                            disabled={isProcessing}
                            className="w-full"
                            variant="default"
                        >
                            {isProcessing ? "Approving..." : "Approve & Transfer Reward"}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Cancel Task */}
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">Cancel Task</CardTitle>
                    <CardDescription>
                        Cancel the task and refund all deposits
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button 
                        onClick={cancelTask} 
                        disabled={isProcessing}
                        variant="destructive"
                        className="w-full"
                    >
                        {isProcessing ? "Cancelling..." : "Cancel Task & Refund"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
