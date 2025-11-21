"use client";

import { useMemo, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { formatAddress } from "@mysten/sui/utils";
import { Database, ArrowLeft } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { AuthGuard } from "@/components/auth-guard";
import { TasksList } from "@/components/task-manager/tasks-list";
import { TaskCard } from "@/components/task-manager/task-card";
import { useTaskRegistry } from "@/hooks/use-task-registry";
import { Button } from "@/components/ui/button";

export default function TaskListPage() {
  const router = useRouter();
  const account = useCurrentAccount();
  const taskRegistryId = process.env.NEXT_PUBLIC_TASKS_REGISTRY_ID;

  const { tasks, isLoading, isError } = useTaskRegistry(taskRegistryId);

  const walletTasks = useMemo(() => {
    if (!account?.address) return [];
    return tasks.filter((task) => task.creator === account.address);
  }, [account?.address, tasks]);

  const handleSelect = (taskId: string) => {
    router.push(`/task/${taskId}`);
  };

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
                <div>
                  <p className="text-sm text-muted-foreground">Your wallet tasks</p>
                  <h1 className="text-2xl font-semibold">
                    {account?.address ? formatAddress(account.address) : "No wallet connected"}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-6 pb-8">
                {isLoading && (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    Loading tasks...
                  </div>
                )}

                {isError && (
                  <div className="text-red-500 bg-red-50 border border-red-200 rounded-lg p-4">
                    Could not load task registry. Please verify the registry ID.
                  </div>
                )}

                {!isLoading && !isError && walletTasks.length === 0 && (
                  <div className="text-center py-16 glass-card rounded-lg animate-fade-in">
                    <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No tasks for this wallet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Tasks created by your connected wallet will appear here. Create a task from the dashboard to get started.
                    </p>
                    <div className="mt-6 flex justify-center">
                      <Button onClick={() => router.push("/dashboard")}>
                        Go to dashboard
                      </Button>
                    </div>
                  </div>
                )}

                {!isLoading && !isError && walletTasks.length > 0 && (
                  <TasksList>
                    {walletTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onSelect={handleSelect} />
                    ))}
                  </TasksList>
                )}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
