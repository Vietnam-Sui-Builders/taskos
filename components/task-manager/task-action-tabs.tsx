"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Eye, Zap, Settings, MessageSquare, Upload, Send, Award, Coins, Share2 } from "lucide-react";
import { TaskViewer } from "./task-viewer";
import { TaskContentUpload } from "./task-content-upload";
import { ShareTask } from "./share-task";
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
    const [overviewView, setOverviewView] = useState("details");
    const [actionsView, setActionsView] = useState("upload");
    const [managementView, setManagementView] = useState("rewards");

    return (
        <Tabs defaultValue="overview" className={cn("h-full flex flex-col", className)}>
            {/* Primary Navigation - Pill Shaped */}
            <div className="flex justify-center mb-6">
                <TabsList className="h-12 p-1 bg-background/40 backdrop-blur-md border border-primary/10 rounded-full shadow-sm">
                    <TabsTrigger 
                        value="overview" 
                        className="rounded-full px-6 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300"
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger 
                        value="actions" 
                        className="rounded-full px-6 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300"
                    >
                        <Zap className="h-4 w-4 mr-2" />
                        Actions
                    </TabsTrigger>
                    <TabsTrigger 
                        value="management" 
                        className="rounded-full px-6 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300"
                    >
                        <Settings className="h-4 w-4 mr-2" />
                        Management
                    </TabsTrigger>
                </TabsList>
            </div>

            {/* Overview Tab Content */}
            <TabsContent value="overview" className="flex-1 overflow-hidden flex flex-col mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-center mb-6">
                    <div className="flex gap-1 p-1 bg-muted/30 rounded-lg border border-border/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOverviewView("details")}
                            className={cn(
                                "rounded-md px-4 text-xs font-medium transition-all",
                                overviewView === "details" 
                                    ? "bg-background shadow-sm text-foreground" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            <Eye className="h-3.5 w-3.5 mr-2" />
                            Details
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOverviewView("comments")}
                            className={cn(
                                "rounded-md px-4 text-xs font-medium transition-all",
                                overviewView === "comments" 
                                    ? "bg-background shadow-sm text-foreground" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            <MessageSquare className="h-3.5 w-3.5 mr-2" />
                            Comments
                        </Button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-1 pb-10">
                    {overviewView === "details" && <TaskViewer taskId={taskId} />}
                    {overviewView === "comments" && <TaskComments taskId={taskId} />}
                </div>
            </TabsContent>

            {/* Actions Tab Content */}
            <TabsContent value="actions" className="flex-1 overflow-hidden flex flex-col mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-center mb-6">
                    <div className="flex gap-1 p-1 bg-muted/30 rounded-lg border border-border/50 flex-wrap justify-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActionsView("upload")}
                            className={cn(
                                "rounded-md px-4 text-xs font-medium transition-all",
                                actionsView === "upload" 
                                    ? "bg-background shadow-sm text-foreground" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            <Upload className="h-3.5 w-3.5 mr-2" />
                            Upload Content
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActionsView("submit")}
                            className={cn(
                                "rounded-md px-4 text-xs font-medium transition-all",
                                actionsView === "submit" 
                                    ? "bg-background shadow-sm text-foreground" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            <Send className="h-3.5 w-3.5 mr-2" />
                            Submit Work
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActionsView("experience")}
                            className={cn(
                                "rounded-md px-4 text-xs font-medium transition-all",
                                actionsView === "experience" 
                                    ? "bg-background shadow-sm text-foreground" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            <Award className="h-3.5 w-3.5 mr-2" />
                            Mint NFT
                        </Button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-1 pb-10">
                    {actionsView === "upload" && <TaskContentUpload taskId={taskId} />}
                    {actionsView === "submit" && <TaskSubmitCompletion taskId={taskId} />}
                    {actionsView === "experience" && <TaskExperience taskId={taskId} />}
                </div>
            </TabsContent>

            {/* Management Tab Content */}
            <TabsContent value="management" className="flex-1 overflow-hidden flex flex-col mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-center mb-6">
                    <div className="flex gap-1 p-1 bg-muted/30 rounded-lg border border-border/50 flex-wrap justify-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setManagementView("rewards")}
                            className={cn(
                                "rounded-md px-4 text-xs font-medium transition-all",
                                managementView === "rewards" 
                                    ? "bg-background shadow-sm text-foreground" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            <Coins className="h-3.5 w-3.5 mr-2" />
                            Rewards
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setManagementView("share")}
                            className={cn(
                                "rounded-md px-4 text-xs font-medium transition-all",
                                managementView === "share" 
                                    ? "bg-background shadow-sm text-foreground" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            <Share2 className="h-3.5 w-3.5 mr-2" />
                            Share Access
                        </Button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-1 pb-10">
                    {managementView === "rewards" && <TaskRewards taskId={taskId} />}
                    {managementView === "share" && <ShareTask taskId={taskId} />}
                </div>
            </TabsContent>
        </Tabs>
    );
}
