"use client";
import {
    ConnectModal,
    useCurrentAccount,
    useDisconnectWallet,
} from "@mysten/dapp-kit";
import { formatAddress } from "@mysten/sui/utils";
import { useCallback, useState } from "react";
import { Button } from "./ui/button";
import { Copy, LogOut, User, Wallet } from "lucide-react";
// import "@mysten/dapp-kit/dist/index.css";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "sonner";
import Link from "next/link";

interface CustomBtnProps {
    className?: string;
}

export function CustomBtn({ className }: CustomBtnProps) {
    const [open, setOpen] = useState(false);
    const currentAccount = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();

    const copyAddress = useCallback(async () => {
        if (!currentAccount) return;
        try {
            await navigator.clipboard.writeText(currentAccount.address);
            toast.success("Copied wallet address to clipboard.");
        } catch {
            toast.error("Failed to copy wallet address.");
        }
    }, [currentAccount]);

    if (currentAccount)
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full mt-2 md:mt-0 md:w-40 md:inline-flex gradient-bg text-white",
                            className
                        )}
                    >
                        <Wallet className="mr-2 h-4 w-4" />
                        {formatAddress(currentAccount.address)}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onSelect={copyAddress}
                        className="w-full md:w-35 gap-2"
                    >
                        <Copy className="h-4 w-4" /> Copy address
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link
                            href="/profile"
                            rel="noopener noreferrer"
                            className="flex gap-2"
                        >
                            <User className="h-4 w-4" /> Profile
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => disconnect()}
                        className="gap-2"
                    >
                        <LogOut className="h-4 w-4" /> Disconnect
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );

    return (
        <ConnectModal
            trigger={
                <Button
                    asChild
                    className={cn(
                        "w-full mt-2 md:mt-0 md:w-40 md:inline-flex gradient-bg",
                        className
                    )}
                >
                    <div>
                        <Wallet className="mr-2 h-4 w-4" />
                        Connect Wallet
                    </div>
                </Button>
            }
            open={open}
            onOpenChange={(isOpen) => setOpen(isOpen)}
        />
    );
}
