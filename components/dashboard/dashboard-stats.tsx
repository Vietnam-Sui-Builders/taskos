"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskItem } from "@/types";
import { CheckCircle2, Circle, Clock, ListTodo } from "lucide-react";

interface DashboardStatsProps {
  tasks: TaskItem[];
  isLoading: boolean;
}

export function DashboardStats({ tasks, isLoading }: DashboardStatsProps) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.is_completed).length;
  const inProgressTasks = tasks.filter((t) => !t.is_completed && t.assignee).length; // Assuming assigned but not completed is in progress
  const pendingTasks = tasks.filter((t) => !t.is_completed && !t.assignee).length; // Unassigned

  const stats = [
    {
      title: "Total Tasks",
      value: totalTasks,
      icon: ListTodo,
      description: "All tasks in registry",
      color: "text-primary",
    },
    {
      title: "Completed",
      value: completedTasks,
      icon: CheckCircle2,
      description: "Successfully finished",
      color: "text-green-500",
    },
    {
      title: "In Progress",
      value: inProgressTasks,
      icon: Clock,
      description: "Currently being worked on",
      color: "text-blue-500",
    },
    {
      title: "Pending",
      value: pendingTasks,
      icon: Circle,
      description: "Waiting for assignment",
      color: "text-orange-500",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="glass border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
