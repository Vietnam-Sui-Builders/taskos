"use client";
"use client";

import { useState } from "react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { isValidSuiAddress } from "@mysten/sui/utils";

import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ShareTaskProps {
    taskId: string | undefined;
    onShared?: () => void;
}

export function ShareTask({ taskId, onShared }: ShareTaskProps) {
    const [shareWith, setShareWith] = useState("");
    const [isSharing, setIsSharing] = useState(false);

    const suiClient = useSuiClient();

    const { mutate: signAndExecute } = useSignAndExecuteTransaction({
        execute: async ({ bytes, signature }) =>
            await suiClient.executeTransactionBlock({
                transactionBlock: bytes,
                signature,
                options: {
                    showRawEffects: true,
                    showEffects: true,
                },
            }),
    });

    // const shareTask = () => {
    //     const addresses = shareWith
    //         .split(",")
    //         .map((addr) => addr.trim())
    //         .filter((addr) => addr.length > 0);

    //     if (addresses.length === 0) {
    //         alert("Please enter at least one valid address");
    //         return;
    //     }

    //     for (const addr of addresses) {
    //         if (!isValidSuiAddress(addr)) {
    //             alert(`Invalid Sui address: ${addr}`);
    //             return;
    //         }
    //     }

    //     setIsSharing(true);

    //     const tx = new Transaction();
    //     tx.moveCall({
    //         target: `${packageId}::task_manager::share_task`,
    //         arguments: [
    //             tx.object(taskId),
    //             tx.pure.vector("address", addresses),
    //         ],
    //     });
    //     tx.setGasBudget(10_000_000);

    //     signAndExecute(
    //         { transaction: tx },
    //         {
    //             onSuccess: () => {
    //                 alert("Task shared successfully!");
    //                 setShareWith("");
    //                 onShared?.();
    //                 setIsSharing(false);
    //             },
    //             onError: (error) => {
    //                 console.error("Error sharing task:", error);
    //                 alert("Failed to share task");
    //                 setIsSharing(false);
    //             },
    //         }
    //     );
    // };

    if (!taskId) return;

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>Share Task</CardTitle>
            </CardHeader>

            <ScrollArea className="flex-1 px-6">
                <CardContent className="space-y-4 pb-6">
                    <div className="space-y-2">
                        <Label htmlFor="shareWith">
                            Share with users (comma-separated)
                        </Label>
                        <Input
                            id="shareWith"
                            value={shareWith}
                            onChange={(e) => setShareWith(e.target.value)}
                            placeholder="0x123..., 0x456..."
                            disabled={isSharing}
                        />
                        <p className="text-sm text-muted-foreground">
                            Enter Sui wallet addresses separated by commas.
                            Shared users will be able to decrypt and view the
                            task content and files.
                        </p>
                    </div>
                </CardContent>
            </ScrollArea>

            <CardFooter className="border-t px-6 py-4">
                <Button
                    // onClick={shareTask}
                    disabled={!shareWith.trim() || isSharing}
                    className="w-full"
                >
                    {isSharing ? "Sharing..." : "Share Task"}
                </Button>
            </CardFooter>
        </Card>
    );
}
