"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from "lucide-react";
import { TaskCard } from "./task-card";
import { CreateTask } from "./create-task";
import { SharedTaskItem, TaskItem } from "@/types";
import { SharedTaskCard } from "./shared-task-card";
import { TasksList } from "./tasks-list";
import { useState } from "react";
import { SelectedTask } from "./selected-task";

const initialTasks: TaskItem[] = [
    {
        id: "1",
        title: "Design new landing page",
        description:
            "Create a modern and responsive design for the new landing page.",
        creator: "0x1234...5678",
        is_completed: false,
        created_at: "2025-11-08T10:00:00Z",
        due_date: "2025-11-15T23:59:59Z",
        priority: "3",
    },
    {
        id: "2",
        title: "Develop API for user authentication",
        description: "Implement JWT-based authentication for the API.",
        creator: "0xABCD...EFGH",
        is_completed: false,
        created_at: "2025-11-08T11:30:00Z",
        due_date: "2025-11-20T23:59:59Z",
        priority: "4",
    },
    {
        id: "3",
        title: "Write documentation for the new feature",
        description: "Document the API endpoints and usage examples.",
        creator: "0x5678...1234",
        is_completed: true,
        created_at: "2025-11-07T15:00:00Z",
        due_date: "2025-11-10T23:59:59Z",
        priority: "2",
    },
];

const mockSharedTasks: SharedTaskItem[] = [
    {
        id: "0x5",
        title: "Review Q3 Financial Report",
        description:
            "Review the quarterly financial report and provide feedback.",
        creator: "0xabcde...fgh",
        is_completed: false,
        due_date: String(Math.floor(Date.now() / 1000) + 86400 * 5), // in 5 days
        priority: "4",
    },
    {
        id: "0x6",
        title: "Team Brainstorming Session",
        description:
            "Prepare agenda for the upcoming team brainstorming session.",
        creator: "0x12345...678",
        is_completed: true,
        due_date: "0",
        priority: "2",
    },
];

export const TaskManager = () => {
    const [selectedTask, setSelectedTask] = useState<string>();

    return (
        <Tabs defaultValue="my-tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="my-tasks" className="cursor-pointer">
                    My Tasks
                </TabsTrigger>
                <TabsTrigger value="shared-tasks" className="cursor-pointer">
                    Shared Tasks
                </TabsTrigger>
            </TabsList>

            <TabsContent value="my-tasks" className="space-y-4">
                {initialTasks.length === 0 ? (
                    <div className="text-center py-12 glass-card rounded-lg animate-fade-in">
                        <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">
                            No tasks yet
                        </h3>
                        <p className="text-muted-foreground">
                            Create your first task to get started
                        </p>
                    </div>
                ) : (
                    <TasksList>
                        {initialTasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onSelect={setSelectedTask}
                            />
                        ))}
                    </TasksList>
                )}
            </TabsContent>

            <TabsContent value="shared-tasks" className="space-y-4">
                {mockSharedTasks.length === 0 ? (
                    <div className="text-center py-12 glass-card rounded-lg animate-fade-in">
                        <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">
                            No tasks yet
                        </h3>
                        <p className="text-muted-foreground">
                            No tasks have been shared with you yet.
                        </p>
                    </div>
                ) : (
                    <TasksList>
                        {mockSharedTasks.map((task) => (
                            <SharedTaskCard
                                key={task.id}
                                task={task}
                                onSelect={setSelectedTask}
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
