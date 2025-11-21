"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { TaskViewer } from "./task-viewer";
import { TaskContentUpload } from "./task-content-upload";
import { ShareTask } from "./share-task";
import { TaskUpdate } from "./task-update";
import { TaskComments } from "./task-comments";
import { TaskRewards } from "./task-rewards";

interface TaskActionTabsProps {
    taskId: string;
    className?: string;
}

/**
 * Shared action tabs used in both the modal view and standalone task detail page.
 */
export function TaskActionTabs({ taskId, className }: TaskActionTabsProps) {
    return (
        <Tabs defaultValue="view" className={cn("h-full flex flex-col", className)}>
            <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="view" className="cursor-pointer">
                    View
                </TabsTrigger>
                <TabsTrigger value="update" className="cursor-pointer">
                    Update
                </TabsTrigger>
                <TabsTrigger value="upload" className="cursor-pointer">
                    Content
                </TabsTrigger>
                <TabsTrigger value="comments" className="cursor-pointer">
                    Comments
                </TabsTrigger>
                <TabsTrigger value="rewards" className="cursor-pointer">
                    Rewards
                </TabsTrigger>
                <TabsTrigger value="share" className="cursor-pointer">
                    Share
                </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 px-1">
                <TabsContent value="view" className="h-full">
                    <TaskViewer taskId={taskId} />
                </TabsContent>

                <TabsContent value="update" className="h-full">
                    <TaskUpdate taskId={taskId} />
                </TabsContent>

                <TabsContent value="upload" className="h-full">
                    <TaskContentUpload taskId={taskId} />
                </TabsContent>

                <TabsContent value="comments" className="h-full">
                    <TaskComments taskId={taskId} />
                </TabsContent>

                <TabsContent value="rewards" className="h-full">
                    <TaskRewards taskId={taskId} />
                </TabsContent>

                <TabsContent value="share" className="h-full">
                    <ShareTask taskId={taskId} />
                </TabsContent>
            </div>
        </Tabs>
    );
}
