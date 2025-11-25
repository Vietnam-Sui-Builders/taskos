"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Eye, Zap, Settings, MessageSquare, Upload, Send, Award, Edit, Coins, Share2 } from "lucide-react";
import { TaskViewer } from "./task-viewer";
import { TaskContentUpload } from "./task-content-upload";
import { ShareTask } from "./share-task";
import { TaskUpdate } from "./task-update";
import { TaskComments } from "./task-comments";
import { TaskRewards } from "./task-rewards";
import { TaskSubmitCompletion } from "./task-submit-completion";
import { TaskExperience } from "./task-experience";
import { Button } from "@/components/ui/button";

interface TaskActionTabsProps {
    taskId: string;
    className?: string;
}

/**
 * Optimized action tabs with grouped navigation for better UX.
 * Primary tabs: Overview, Actions, Management
 */
export function TaskActionTabs({ taskId, className }: TaskActionTabsProps) {
    const [activeView, setActiveView] = useState("details");

    return (
        <Tabs defaultValue="overview" className={cn("h-full flex flex-col", className)}>
            {/* Primary Navigation */}
            <TabsList className="grid w-full grid-cols-3 h-12 bg-background/50 border border-primary/20 p-1">
                <TabsTrigger 
                    value="overview" 
                    className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-mono uppercase tracking-wider text-xs transition-all"
                >
                    <Eye className="h-4 w-4 mr-2" />
                    Overview
                </TabsTrigger>
                <TabsTrigger 
                    value="actions" 
                    className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-mono uppercase tracking-wider text-xs transition-all"
                >
                    <Zap className="h-4 w-4 mr-2" />
                    Actions
                </TabsTrigger>
                <TabsTrigger 
                    value="management" 
                    className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-mono uppercase tracking-wider text-xs transition-all"
                >
                    <Settings className="h-4 w-4 mr-2" />
                    Management
                </TabsTrigger>
            </TabsList>

            {/* Overview Tab Content */}
            <TabsContent value="overview" className="flex-1 overflow-hidden flex flex-col mt-4">
                <div className="flex gap-2 mb-4 border-b border-primary/10 pb-3">
                    <Button
                        variant={activeView === "details" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveView("details")}
                        className={cn(
                            "font-mono text-xs uppercase tracking-wider",
                            activeView === "details" && "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                        )}
                    >
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                    </Button>
                    <Button
                        variant={activeView === "comments" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveView("comments")}
                        className={cn(
                            "font-mono text-xs uppercase tracking-wider",
                            activeView === "comments" && "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                        )}
                    >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Comments
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto px-1">
                    {activeView === "details" && <TaskViewer taskId={taskId} />}
                    {activeView === "comments" && <TaskComments taskId={taskId} />}
                </div>
            </TabsContent>

            {/* Actions Tab Content */}
            <TabsContent value="actions" className="flex-1 overflow-hidden flex flex-col mt-4">
                <div className="flex gap-2 mb-4 border-b border-primary/10 pb-3 flex-wrap">
                    <Button
                        variant={activeView === "upload" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveView("upload")}
                        className={cn(
                            "font-mono text-xs uppercase tracking-wider",
                            activeView === "upload" && "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                        )}
                    >
                        <Upload className="h-3 w-3 mr-1" />
                        Upload Content
                    </Button>
                    <Button
                        variant={activeView === "submit" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveView("submit")}
                        className={cn(
                            "font-mono text-xs uppercase tracking-wider",
                            activeView === "submit" && "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                        )}
                    >
                        <Send className="h-3 w-3 mr-1" />
                        Submit Work
                    </Button>
                    <Button
                        variant={activeView === "experience" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveView("experience")}
                        className={cn(
                            "font-mono text-xs uppercase tracking-wider",
                            activeView === "experience" && "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                        )}
                    >
                        <Award className="h-3 w-3 mr-1" />
                        Mint NFT
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto px-1">
                    {activeView === "upload" && <TaskContentUpload taskId={taskId} />}
                    {activeView === "submit" && <TaskSubmitCompletion taskId={taskId} />}
                    {activeView === "experience" && <TaskExperience taskId={taskId} />}
                </div>
            </TabsContent>

            {/* Management Tab Content */}
            <TabsContent value="management" className="flex-1 overflow-hidden flex flex-col mt-4">
                <div className="flex gap-2 mb-4 border-b border-primary/10 pb-3 flex-wrap">
                    <Button
                        variant={activeView === "update" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveView("update")}
                        className={cn(
                            "font-mono text-xs uppercase tracking-wider",
                            activeView === "update" && "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                        )}
                    >
                        <Edit className="h-3 w-3 mr-1" />
                        Update Task
                    </Button>
                    <Button
                        variant={activeView === "rewards" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveView("rewards")}
                        className={cn(
                            "font-mono text-xs uppercase tracking-wider",
                            activeView === "rewards" && "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                        )}
                    >
                        <Coins className="h-3 w-3 mr-1" />
                        Rewards
                    </Button>
                    <Button
                        variant={activeView === "share" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveView("share")}
                        className={cn(
                            "font-mono text-xs uppercase tracking-wider",
                            activeView === "share" && "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                        )}
                    >
                        <Share2 className="h-3 w-3 mr-1" />
                        Share Access
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto px-1">
                    {activeView === "update" && <TaskUpdate taskId={taskId} />}
                    {activeView === "rewards" && <TaskRewards taskId={taskId} />}
                    {activeView === "share" && <ShareTask taskId={taskId} />}
                </div>
            </TabsContent>
        </Tabs>
    );
}
