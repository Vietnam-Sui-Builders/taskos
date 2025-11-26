"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TaskItem } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface DashboardOverviewChartProps {
  tasks: TaskItem[];
  isLoading: boolean;
}

const chartConfig = {
  tasks: {
    label: "Tasks Created",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function DashboardOverviewChart({ tasks, isLoading }: DashboardOverviewChartProps) {
  const chartData = React.useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    // 1. Get last 30 days dates
    const days = 30;
    const data = new Map<string, number>();
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      data.set(dateStr, 0);
    }

    // 2. Aggregate tasks
    tasks.forEach(task => {
      try {
        const dateStr = new Date(task.created_at).toISOString().split('T')[0];
        if (data.has(dateStr)) {
          data.set(dateStr, (data.get(dateStr) || 0) + 1);
        }
      } catch (e) {
        console.warn("Invalid date for task", task.id);
      }
    });

    // 3. Convert to array
    return Array.from(data.entries()).map(([date, count]) => ({
      date,
      tasks: count,
    }));
  }, [tasks]);

  if (isLoading) {
    return (
      <Card className="col-span-4 glass border-primary/10 h-[400px] flex items-center justify-center">
        <div className="animate-pulse text-primary/50">Loading Chart Data...</div>
      </Card>
    );
  }

  return (
    <Card className="col-span-4 glass border-primary/10">
      <CardHeader>
        <CardTitle>Task Creation Activity</CardTitle>
        <CardDescription>
          New tasks created over the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="fillTasks" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-tasks)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-tasks)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDecimals={false}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    });
                  }}
                />
              }
            />
            <Area
              dataKey="tasks"
              type="monotone"
              fill="url(#fillTasks)"
              stroke="var(--color-tasks)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
