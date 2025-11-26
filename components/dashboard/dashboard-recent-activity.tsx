"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskItem } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface DashboardRecentActivityProps {
  tasks: TaskItem[];
  isLoading: boolean;
}

export function DashboardRecentActivity({ tasks, isLoading }: DashboardRecentActivityProps) {
  // Sort tasks by creation date (newest first) and take top 5
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card className="col-span-3 glass border-primary/10">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
             {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center animate-pulse">
                  <div className="h-9 w-9 rounded-full bg-primary/10" />
                  <div className="ml-4 space-y-1">
                    <div className="h-4 w-[200px] bg-primary/10 rounded" />
                    <div className="h-3 w-[150px] bg-primary/5 rounded" />
                  </div>
                </div>
             ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-3 glass border-primary/10">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Latest tasks created on the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {recentTasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">No recent activity.</div>
          ) : (
            recentTasks.map((task) => (
              <div key={task.id} className="flex items-center group">
                <Avatar className="h-9 w-9 border border-primary/20">
                  <AvatarImage src={`https://avatar.vercel.sh/${task.creator}`} alt="Avatar" />
                  <AvatarFallback>OM</AvatarFallback>
                </Avatar>
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
                    {task.title}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    Created by {task.creator.slice(0, 6)}...{task.creator.slice(-4)}
                  </p>
                </div>
                <div className="ml-auto font-medium text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
