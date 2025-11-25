"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from "lucide-react";
import { TaskCard } from "./task-card";
import { TasksList } from "./tasks-list";
import { useState, useMemo } from "react";
import { SelectedTask } from "./selected-task";
import { useTaskRegistry } from "@/hooks/use-task-registry";
import { useCurrentAccount } from "@mysten/dapp-kit";

export const TaskManager = () => {
  const [selectedTask, setSelectedTask] = useState<string>();
  const taskRegistryId = process.env.NEXT_PUBLIC_TASKS_REGISTRY_ID;
  const account = useCurrentAccount();
  
  // Use custom hook to fetch tasks from registry
  const { tasks, rolesByTask, isLoading, isError } = useTaskRegistry(taskRegistryId);

  // Filter tasks based on wallet address
  const myTasks = useMemo(() => {
    if (!account?.address) return [];
    // Tasks created by the current wallet
    return tasks.filter(task => task.creator === account.address);
  }, [tasks, account]);

  // Open tasks - show all tasks
  const openTasks = useMemo(() => {
    return tasks;
  }, [tasks]);

  // Shared tasks - tasks where wallet has access but is not the creator
  // For now, using mock data until we implement dynamic field querying for access control
  const sharedTasks = useMemo(() => {
    if (!account?.address) return [];
    return tasks.filter(task => {
      if (task.creator === account.address) return false;
      const roles = rolesByTask[task.id] || [];
      return roles.some((r) => r.address === account.address);
    });
  }, [tasks, rolesByTask, account]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Loading tasks...</div>;
  }

  if (isError) {
    return <div className="flex items-center justify-center py-12 text-red-500">
      Could not load task registry. Please check your configuration.
    </div>;
  }

  return (
    <Tabs defaultValue="my-tasks" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-8 bg-background/50 border border-primary/20 backdrop-blur-md p-1 rounded-lg h-12">
        <TabsTrigger value="open-tasks" className="cursor-pointer data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-mono uppercase tracking-wider transition-all duration-300 h-full rounded-md border border-transparent data-[state=active]:border-primary/50">
          OPEN_TASKS
        </TabsTrigger>
        <TabsTrigger value="my-tasks" className="cursor-pointer data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-mono uppercase tracking-wider transition-all duration-300 h-full rounded-md border border-transparent data-[state=active]:border-primary/50">
          MY_TASKS
        </TabsTrigger>
        <TabsTrigger value="shared-tasks" className="cursor-pointer data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-mono uppercase tracking-wider transition-all duration-300 h-full rounded-md border border-transparent data-[state=active]:border-primary/50">
          SHARED_TASKS
        </TabsTrigger>
      </TabsList>

      <TabsContent value="open-tasks" className="space-y-4">
        {openTasks.length === 0 ? (
          <div className="text-center py-12 glass border border-primary/10 rounded-lg animate-fade-in bg-background/30 backdrop-blur-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                <Database className="h-8 w-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-bold font-display tracking-wide text-primary">NO_TASKS_DETECTED</h3>
            <p className="text-muted-foreground font-mono text-xs mt-2">
              INITIATE FIRST TASK SEQUENCE
            </p>
          </div>
        ) : (
          <TasksList>
            {openTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onSelect={setSelectedTask}
                sharedRoles={rolesByTask[task.id]}
              />
            ))}
          </TasksList>
        )}
      </TabsContent>

      <TabsContent value="my-tasks" className="space-y-4">
        {myTasks.length === 0 ? (
          <div className="text-center py-12 glass border border-primary/10 rounded-lg animate-fade-in bg-background/30 backdrop-blur-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                <Database className="h-8 w-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-bold font-display tracking-wide text-primary">NO_CREATED_TASKS</h3>
            <p className="text-muted-foreground font-mono text-xs mt-2">
              YOU HAVE NOT INITIATED ANY TASKS
            </p>
          </div>
        ) : (
          <TasksList>
            {myTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onSelect={setSelectedTask}
                sharedRoles={rolesByTask[task.id]}
              />
            ))}
          </TasksList>
        )}
      </TabsContent>

      <TabsContent value="shared-tasks" className="space-y-4">
        {sharedTasks.length === 0 ? (
          <div className="text-center py-12 glass border border-primary/10 rounded-lg animate-fade-in bg-background/30 backdrop-blur-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                <Database className="h-8 w-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-bold font-display tracking-wide text-primary">NO_SHARED_TASKS</h3>
            <p className="text-muted-foreground font-mono text-xs mt-2">
              NO EXTERNAL PROTOCOLS SHARED
            </p>
          </div>
        ) : (
          <TasksList>
            {sharedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onSelect={setSelectedTask}
                sharedRoles={rolesByTask[task.id]}
              />
            ))}
          </TasksList>
        )}
      </TabsContent>

      <TabsContent value="create"></TabsContent>

      {selectedTask && (
        <SelectedTask
          selectedTask={selectedTask}
          setSelectedTask={setSelectedTask}
        />
      )}
    </Tabs>
  );
};
