"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SiteHeader } from "@/components/site-header";
import { AuthGuard } from "@/components/auth-guard";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TaskManager } from "@/components/task-manager/task-manager";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity";
import { DashboardOverviewChart } from "@/components/dashboard/dashboard-overview-chart";
import { useTaskRegistry } from "@/hooks/use-task-registry";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Page() {
  const taskRegistryId = process.env.NEXT_PUBLIC_TASKS_REGISTRY_ID;
  const { tasks, isLoading } = useTaskRegistry(taskRegistryId);

  return (
    <AuthGuard>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "18rem",
            "--header-height": "3rem",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:p-8 md:pt-6 overflow-x-hidden">
            <div className="flex items-center justify-between space-y-2">
              <h2 className="text-3xl font-bold tracking-tight font-display text-primary">Dashboard</h2>
            </div>
            
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="bg-background/50 border border-primary/20 backdrop-blur-md">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics" disabled>Analytics</TabsTrigger>
                <TabsTrigger value="reports" disabled>Reports</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <DashboardStats tasks={tasks} isLoading={isLoading} />
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                  <DashboardOverviewChart tasks={tasks} isLoading={isLoading} />
                  <DashboardRecentActivity tasks={tasks} isLoading={isLoading} />
                </div>

                <div className="mt-8">
                   <h3 className="text-xl font-bold tracking-tight font-display text-primary mb-4">Task Management</h3>
                   <TaskManager />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
