"use client";

import type { CSSProperties } from "react";
import { use, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, ArrowLeft } from "lucide-react";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { AuthGuard } from "@/components/auth-guard";
import { TaskActionTabs } from "@/components/task-manager/task-action-tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TaskDetailPageProps {
  params: Promise<{
    taskId: string;
  }>;
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  const router = useRouter();
  const { taskId } = use(params);

  const { data, isLoading, isError, error } = useSuiClientQuery(
    "getObject",
    {
      id: taskId,
      options: { showContent: true, showOwner: true },
    },
    { enabled: !!taskId },
  );

  const taskMeta = useMemo(() => {
    if (!data?.data?.content || data.data.content.dataType !== "moveObject") {
      return null;
    }
    const fields = data.data.content.fields as Record<string, unknown>;
    return {
      title: String(fields.title || ""),
      description: String(fields.description || ""),
      creator: String(fields.creator || ""),
    };
  }, [data]);

  useEffect(() => {
    if (data) {
      console.log("[TaskDetail] useSuiClientQuery data", data);
    }
    if (error) {
      console.error("[TaskDetail] useSuiClientQuery error", error);
    }
  }, [data, error]);

  return (
    <AuthGuard>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2 px-4 lg:px-6">
              <div className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between md:gap-4 md:py-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Task details & actions</p>
                  <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold break-all">
                      {taskMeta?.title || taskId}
                    </h1>
                    {taskMeta?.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {taskMeta.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {taskMeta?.creator && (
                        <Badge variant="secondary">
                          Creator: <span className="font-mono ml-1">{taskMeta.creator}</span>
                        </Badge>
                      )}
                      <Badge variant="outline" className="flex items-center gap-1">
                        <span className="font-semibold">ID</span>
                        <span className="font-mono break-all">{taskId}</span>
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button variant="outline" asChild>
                    <a
                      href={`https://suiscan.xyz/testnet/object/${taskId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gap-2 inline-flex items-center"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Suiscan
                    </a>
                  </Button>
                </div>
              </div>

              <div className="flex flex-1 flex-col pb-10">
                <div className="glass-card rounded-xl p-2 md:p-4 h-full">
                  {isLoading && (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      Loading task...
                    </div>
                  )}
                  {isError && (
                    <div className="flex h-full items-center justify-center text-red-500">
                      Failed to load task: {error instanceof Error ? error.message : "Unknown error"}
                    </div>
                  )}
                  {!isLoading && !isError && data?.data?.content ? (
                    <TaskActionTabs taskId={taskId} />
                  ) : null}
                  {!isLoading && !isError && !data?.data?.content && (
                    <div className="flex h-full items-center justify-center text-muted-foreground flex-col gap-2">
                      <div>No task content returned. Confirm the object exists on testnet and your wallet is on the same network.</div>
                      <pre className="w-full max-w-3xl overflow-x-auto rounded bg-muted p-3 text-[11px] leading-tight">
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
