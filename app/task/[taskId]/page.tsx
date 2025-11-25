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
            <div className="flex flex-1 flex-col bg-background/50">
            <div className="@container/main flex flex-1 flex-col gap-2 px-4 lg:px-6">
              {/* Enhanced Header Section */}
              <div className="py-4 md:py-6 border-b border-primary/10 mb-6">
                <div className="flex flex-col gap-4">
                  {/* Top Row: Label + Actions */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">TASK_PROTOCOL_DETAILS</p>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" className="gap-2 hover:bg-primary/10 hover:text-primary transition-colors font-mono text-xs uppercase tracking-wider" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">RETURN</span>
                      </Button>
                      <Button variant="outline" asChild className="border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors font-mono text-xs uppercase tracking-wider">
                        <a
                          href={`https://suiscan.xyz/testnet/object/${taskId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gap-2 inline-flex items-center"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="hidden sm:inline">SUISCAN</span>
                        </a>
                      </Button>
                    </div>
                  </div>

                  {/* Main Content Row */}
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Left: Title & Description */}
                    <div className="flex-1 space-y-3">
                      <h1 className="text-2xl md:text-3xl font-bold font-display tracking-wide text-primary glow-text break-words">
                        {taskMeta?.title || "Untitled Task"}
                      </h1>
                      {taskMeta?.description && (
                        <p className="text-sm text-muted-foreground font-mono max-w-3xl leading-relaxed">
                          {taskMeta.description}
                        </p>
                      )}
                    </div>

                    {/* Right: Status & Metadata Card */}
                    <div className="lg:min-w-[280px]">
                      <div className="glass border border-primary/20 bg-background/30 backdrop-blur-md rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-muted-foreground uppercase">Status</span>
                          {data?.data?.content && data.data.content.dataType === "moveObject" && (() => {
                            const fields = data.data.content.fields as Record<string, unknown>;
                            const status = fields.status as number;
                            const statusLabels = ["To Do", "In Progress", "Completed", "Approved"];
                            const statusColors = [
                              "bg-slate-500/20 text-slate-400 border-slate-500/30",
                              "bg-blue-500/20 text-blue-400 border-blue-500/30",
                              "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                              "bg-green-500/20 text-green-400 border-green-500/30"
                            ];
                            return (
                              <Badge className={`${statusColors[status] || statusColors[0]} font-mono text-xs uppercase tracking-wider`}>
                                {statusLabels[status] || "Unknown"}
                              </Badge>
                            );
                          })()}
                        </div>
                        
                        {data?.data?.content && data.data.content.dataType === "moveObject" && (() => {
                          const fields = data.data.content.fields as Record<string, unknown>;
                          const priority = fields.priority as number;
                          const priorityLabels = ["Low", "Medium", "High", "Critical"];
                          const priorityColors = [
                            "bg-green-500/20 text-green-400 border-green-500/30",
                            "bg-blue-500/20 text-blue-400 border-blue-500/30",
                            "bg-orange-500/20 text-orange-400 border-orange-500/30",
                            "bg-red-500/20 text-red-400 border-red-500/30"
                          ];
                          return (
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-muted-foreground uppercase">Priority</span>
                              <Badge className={`${priorityColors[priority] || priorityColors[1]} font-mono text-xs uppercase tracking-wider`}>
                                {priorityLabels[priority] || "Medium"}
                              </Badge>
                            </div>
                          );
                        })()}

                        <div className="pt-2 border-t border-primary/10 space-y-2">
                          {taskMeta?.creator && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono text-muted-foreground uppercase">Creator</span>
                              <span className="font-mono text-primary">
                                {taskMeta.creator.substring(0, 6)}...{taskMeta.creator.substring(taskMeta.creator.length - 4)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-muted-foreground uppercase">Task ID</span>
                            <span className="font-mono text-muted-foreground">
                              {taskId.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col pb-10">
                <div className="glass border border-primary/20 bg-background/30 backdrop-blur-md rounded-xl p-2 md:p-6 h-full shadow-[0_0_30px_rgba(var(--primary),0.05)]">
                  {isLoading && (
                    <div className="flex h-full flex-col items-center justify-center space-y-4">
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_20px_rgba(var(--primary),0.3)]" />
                        <p className="font-mono text-primary/80 animate-pulse tracking-widest">DECRYPTING_TASK_DATA...</p>
                    </div>
                  )}
                  {isError && (
                    <div className="flex h-full items-center justify-center">
                        <div className="bg-destructive/10 border border-destructive/50 text-destructive p-8 rounded-lg text-center backdrop-blur-md max-w-md">
                            <p className="font-mono font-bold text-lg mb-2">⚠️ DATA_RETRIEVAL_ERROR</p>
                            <p className="text-sm opacity-80">{error instanceof Error ? error.message : "UNKNOWN_SYSTEM_ERROR"}</p>
                        </div>
                    </div>
                  )}
                  {!isLoading && !isError && data?.data?.content ? (
                    <TaskActionTabs taskId={taskId} />
                  ) : null}
                  {!isLoading && !isError && !data?.data?.content && (
                    <div className="flex h-full items-center justify-center text-muted-foreground flex-col gap-4 p-8 text-center">
                      <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-lg max-w-2xl">
                        <h3 className="text-yellow-500 font-bold font-display mb-2">NO_CONTENT_DETECTED</h3>
                        <p className="font-mono text-sm mb-4">Confirm the object exists on testnet and your wallet is on the same network.</p>
                        <pre className="w-full overflow-x-auto rounded bg-black/50 p-4 text-[10px] leading-tight text-left font-mono text-primary/70 border border-primary/10">
                            {JSON.stringify(data, null, 2)}
                        </pre>
                      </div>
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
