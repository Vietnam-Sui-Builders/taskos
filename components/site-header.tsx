"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { Loader2 } from "lucide-react";

export function SiteHeader() {
  const account = useCurrentAccount();
  
  const { data: balanceData, isLoading: isBalanceLoading } = useSuiClientQuery(
    "getBalance",
    {
      owner: account?.address || "",
    },
    {
      enabled: !!account,
      refetchInterval: 10000,
    }
  );

  const formatBalance = (balance?: string) => {
    if (!balance) return "0";
    const val = parseInt(balance) / 1_000_000_000;
    return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-primary/10 bg-background/50 backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 text-primary hover:bg-primary/10" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4 bg-primary/20"
        />
        <h1 className="text-base font-bold font-display tracking-wider text-primary">TASK_OS</h1>
        <div className="ml-auto flex items-center gap-2">
          {account && (
            <div className="hidden items-center gap-2 rounded-full border border-primary/20 bg-background/50 px-3 py-1.5 backdrop-blur-sm md:flex">
              <span className="text-xs font-medium text-muted-foreground">BAL:</span>
              {isBalanceLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : (
                <span className="font-mono text-sm font-bold text-primary">
                  {formatBalance(balanceData?.totalBalance)} SUI
                </span>
              )}
            </div>
          )}
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
