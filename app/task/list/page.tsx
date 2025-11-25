"use client";

import { useMemo, useState, useEffect, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { formatAddress } from "@mysten/sui/utils";
import { Database, ArrowLeft, User, Briefcase } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { AuthGuard } from "@/components/auth-guard";
import { TasksList } from "@/components/task-manager/tasks-list";
import { TaskCard } from "@/components/task-manager/task-card";
import { useTaskRegistry } from "@/hooks/use-task-registry";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function TaskListPage() {
  const router = useRouter();
  const account = useCurrentAccount();
  const client = useSuiClient();
  const taskRegistryId = process.env.NEXT_PUBLIC_TASKS_REGISTRY_ID;

  const { tasks, isLoading, isError } = useTaskRegistry(taskRegistryId);
  const [assigneesByTask, setAssigneesByTask] = useState<Record<string, string>>({});
  const [isLoadingAssignees, setIsLoadingAssignees] = useState(false);

  // Fetch assignees for all tasks
  useEffect(() => {
    const fetchAssignees = async () => {
      if (tasks.length === 0) return;
      
      setIsLoadingAssignees(true);
      const assignees: Record<string, string> = {};

      for (const task of tasks) {
        try {
          const dynamicFields = await client.getDynamicFields({ parentId: task.id });
          
          for (const df of dynamicFields.data) {
            const dfType = typeof df.name === "string" ? df.name : ((df.name as unknown) as Record<string, unknown>)?.type || "";
            
            if (typeof dfType === "string" && dfType.includes("AssigneeKey")) {
              try {
                const dfObj = await client.getDynamicFieldObject({
                  parentId: task.id,
                  name: df.name,
                });
                
                const content = dfObj.data?.content;
                if (content && content.dataType === "moveObject" && "fields" in content) {
                  const dfFields = content.fields as Record<string, unknown>;
                  const assigneeAddress = dfFields.value as string;
                  if (assigneeAddress) {
                    assignees[task.id] = assigneeAddress;
                  }
                }
              } catch (err) {
                console.warn("Error fetching assignee for task", task.id, err);
              }
            }
          }
        } catch (err) {
          console.warn("Error fetching dynamic fields for task", task.id, err);
        }
      }

      setAssigneesByTask(assignees);
      setIsLoadingAssignees(false);
    };

    fetchAssignees();
  }, [tasks, client]);

  const walletTasks = useMemo(() => {
    if (!account?.address) return [];
    return tasks.filter((task) => task.creator === account.address);
  }, [account?.address, tasks]);

  const assignedTasks = useMemo(() => {
    if (!account?.address) return [];
    return tasks.filter((task) => assigneesByTask[task.id] === account.address);
  }, [account?.address, tasks, assigneesByTask]);

  const allTasks = useMemo(() => tasks, [tasks]);

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
          <div className="flex flex-1 flex-col bg-background/50">
            <div className="@container/main flex flex-1 flex-col gap-2 px-4 lg:px-6">
              <div className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between md:gap-4 md:py-6 border-b border-primary/10 mb-6">
                <div>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">TASK_MANAGEMENT_PROTOCOL</p>
                  <h1 className="text-2xl font-bold font-display tracking-wide text-primary glow-text">
                    {account?.address ? formatAddress(account.address) : "NO_WALLET_CONNECTED"}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="gap-2 hover:bg-primary/10 hover:text-primary transition-colors font-mono text-xs uppercase tracking-wider"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    RETURN
                  </Button>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-6 pb-8">
                {isLoading && (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_20px_rgba(var(--primary),0.3)]" />
                    <p className="font-mono text-primary/80 animate-pulse tracking-widest">LOADING_REGISTRY...</p>
                  </div>
                )}

                {isError && (
                  <div className="bg-destructive/10 border border-destructive/50 text-destructive p-6 rounded-lg text-center backdrop-blur-md">
                    <p className="font-mono font-bold">⚠️ SYSTEM_ERROR: REGISTRY_LOAD_FAILED</p>
                    <p className="text-xs mt-2 opacity-80">VERIFY_REGISTRY_ID</p>
                  </div>
                )}

                {!isLoading && !isError && (
                  <Tabs defaultValue="created" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-8 bg-background/50 border border-primary/20 backdrop-blur-md p-1 rounded-lg h-12">
                      <TabsTrigger value="created" className="gap-2 cursor-pointer data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-mono uppercase tracking-wider transition-all duration-300 h-full rounded-md border border-transparent data-[state=active]:border-primary/50 text-xs md:text-sm">
                        <Briefcase className="h-4 w-4" />
                        <span className="hidden md:inline">CREATED_BY_ME</span>
                        <span className="md:hidden">CREATED</span>
                        <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary border-primary/50">
                          {walletTasks.length}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="assigned" className="gap-2 cursor-pointer data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-mono uppercase tracking-wider transition-all duration-300 h-full rounded-md border border-transparent data-[state=active]:border-primary/50 text-xs md:text-sm">
                        <User className="h-4 w-4" />
                        <span className="hidden md:inline">ASSIGNED_TO_ME</span>
                        <span className="md:hidden">ASSIGNED</span>
                        <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary border-primary/50">
                          {isLoadingAssignees ? "..." : assignedTasks.length}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="all" className="gap-2 cursor-pointer data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-mono uppercase tracking-wider transition-all duration-300 h-full rounded-md border border-transparent data-[state=active]:border-primary/50 text-xs md:text-sm">
                        <Database className="h-4 w-4" />
                        <span className="hidden md:inline">ALL_TASKS</span>
                        <span className="md:hidden">ALL</span>
                        <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary border-primary/50">
                          {allTasks.length}
                        </Badge>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="created" className="animate-fade-in">
                      {walletTasks.length === 0 ? (
                        <div className="text-center py-16 glass border border-primary/10 rounded-lg bg-background/30 backdrop-blur-sm">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                            <Briefcase className="h-8 w-8 text-primary/50" />
                          </div>
                          <h3 className="text-lg font-bold font-display tracking-wide text-primary mb-2">NO_TASKS_INITIATED</h3>
                          <p className="text-muted-foreground font-mono text-xs max-w-md mx-auto mb-6">
                            INITIATE FIRST TASK SEQUENCE TO BEGIN
                          </p>
                          <div className="flex justify-center">
                            <Button 
                                onClick={() => router.push("/dashboard")}
                                className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/50 transition-all font-mono uppercase tracking-wider"
                            >
                              CREATE_TASK
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <TasksList>
                          {walletTasks.map((task) => (
                            <TaskCard key={task.id} task={task} onSelect={handleSelect} />
                          ))}
                        </TasksList>
                      )}
                    </TabsContent>

                    <TabsContent value="assigned" className="animate-fade-in">
                      {isLoadingAssignees ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-2">
                            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            <p className="font-mono text-xs text-muted-foreground">SCANNING_ASSIGNMENTS...</p>
                        </div>
                      ) : assignedTasks.length === 0 ? (
                        <div className="text-center py-16 glass border border-primary/10 rounded-lg bg-background/30 backdrop-blur-sm">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                            <User className="h-8 w-8 text-primary/50" />
                          </div>
                          <h3 className="text-lg font-bold font-display tracking-wide text-primary mb-2">NO_ASSIGNMENTS_DETECTED</h3>
                          <p className="text-muted-foreground font-mono text-xs max-w-md mx-auto">
                            AWAITING_TASK_ASSIGNMENT
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="mb-6 p-4 bg-primary/5 border border-primary/10 rounded-lg flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <p className="text-sm font-mono text-primary">
                              <strong>{assignedTasks.length}</strong> ACTIVE_ASSIGNMENTS_DETECTED
                            </p>
                          </div>
                          <TasksList>
                            {assignedTasks.map((task) => (
                              <TaskCard 
                                key={task.id} 
                                task={task} 
                                onSelect={handleSelect}
                              />
                            ))}
                          </TasksList>
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="all" className="animate-fade-in">
                      {allTasks.length === 0 ? (
                        <div className="text-center py-16 glass border border-primary/10 rounded-lg bg-background/30 backdrop-blur-sm">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                            <Database className="h-8 w-8 text-primary/50" />
                          </div>
                          <h3 className="text-lg font-bold font-display tracking-wide text-primary mb-2">REGISTRY_EMPTY</h3>
                          <p className="text-muted-foreground font-mono text-xs max-w-md mx-auto">
                            NO_DATA_FOUND_IN_REGISTRY
                          </p>
                        </div>
                      ) : (
                        <TasksList>
                          {allTasks.map((task) => (
                            <TaskCard key={task.id} task={task} onSelect={handleSelect} />
                          ))}
                        </TasksList>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
