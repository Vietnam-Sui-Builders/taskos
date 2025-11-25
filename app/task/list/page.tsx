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
            const dfType = typeof df.name === "string" ? df.name : (df.name as Record<string, unknown>)?.type || "";
            
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
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2 px-4 lg:px-6">
              <div className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between md:gap-4 md:py-6">
                <div>
                  <p className="text-sm text-muted-foreground">Task Management</p>
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

                {!isLoading && !isError && (
                  <Tabs defaultValue="created" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="created" className="gap-2">
                        <Briefcase className="h-4 w-4" />
                        Created by Me
                        <Badge variant="secondary" className="ml-2">
                          {walletTasks.length}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="assigned" className="gap-2">
                        <User className="h-4 w-4" />
                        Assigned to Me
                        <Badge variant="secondary" className="ml-2">
                          {isLoadingAssignees ? "..." : assignedTasks.length}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="all" className="gap-2">
                        <Database className="h-4 w-4" />
                        All Tasks
                        <Badge variant="secondary" className="ml-2">
                          {allTasks.length}
                        </Badge>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="created">
                      {walletTasks.length === 0 ? (
                        <div className="text-center py-16 glass-card rounded-lg animate-fade-in">
                          <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="text-lg font-medium mb-2">No tasks created</h3>
                          <p className="text-muted-foreground max-w-md mx-auto">
                            Tasks created by your connected wallet will appear here.
                          </p>
                          <div className="mt-6 flex justify-center">
                            <Button onClick={() => router.push("/dashboard")}>
                              Create a task
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

                    <TabsContent value="assigned">
                      {isLoadingAssignees ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                          Loading assignee information...
                        </div>
                      ) : assignedTasks.length === 0 ? (
                        <div className="text-center py-16 glass-card rounded-lg animate-fade-in">
                          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="text-lg font-medium mb-2">No tasks assigned</h3>
                          <p className="text-muted-foreground max-w-md mx-auto">
                            Tasks assigned to your wallet address will appear here.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                              <strong>{assignedTasks.length}</strong> task{assignedTasks.length !== 1 ? 's' : ''} assigned to your address
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

                    <TabsContent value="all">
                      {allTasks.length === 0 ? (
                        <div className="text-center py-16 glass-card rounded-lg animate-fade-in">
                          <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="text-lg font-medium mb-2">No tasks found</h3>
                          <p className="text-muted-foreground max-w-md mx-auto">
                            No tasks available in the registry.
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
