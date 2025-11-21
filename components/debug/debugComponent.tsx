"use client";

import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Minimal debug footer that surfaces the current wallet and owned objects from Sui.
 * Renders only in non-production environments to avoid shipping debug UI.
 */
export function DebugComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const account = useCurrentAccount();

  const { data, isPending, isError, error, refetch } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address ?? "",
      options: { showType: true, showContent: true },
    },
    { enabled: !!account?.address },
  );

  const ownedObjects = useMemo(() => {
    const maybeData = (data as any)?.data ?? data;
    return Array.isArray(maybeData?.data) ? maybeData.data : [];
  }, [data]);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 text-sm">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          className="shadow-md bg-background/80 backdrop-blur"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          Debug {isOpen ? "▼" : "▲"}
        </Button>
      </div>

      {isOpen && (
        <div className="mt-2 w-[360px] rounded-lg border bg-background shadow-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Sui Debug</div>
            <Button size="sm" variant="secondary" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>

          <div className="space-y-2 rounded-md border bg-muted/30 p-2">
            <div className="text-xs text-muted-foreground">Wallet</div>
            {account?.address ? (
              <code className="text-xs break-all">{account.address}</code>
            ) : (
              <div className="text-xs text-muted-foreground">
                Connect a wallet to load owned objects.
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-md border bg-muted/30 p-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Owned objects</div>
              <Badge variant="secondary">{ownedObjects.length}</Badge>
            </div>

            {isPending && <div className="text-xs text-muted-foreground">Loading...</div>}
            {isError && (
              <div className="text-xs text-red-500">
                Error: {error instanceof Error ? error.message : "Unknown error"}
              </div>
            )}

            {!isPending && !isError && ownedObjects.length === 0 && (
              <div className="text-xs text-muted-foreground">No objects returned.</div>
            )}

            {!isPending && !isError && ownedObjects.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded border bg-background p-2">
                <pre className="text-[11px] leading-tight whitespace-pre-wrap break-all">
                  {JSON.stringify(ownedObjects, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DebugComponent;
