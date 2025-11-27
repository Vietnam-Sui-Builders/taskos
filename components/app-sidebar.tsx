"use client";

import * as React from "react";
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";

import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { CustomBtn } from "./connect-button";
import { CreateTask } from "./task-manager/create-task";

import { ConnectButton } from "@mysten/dapp-kit";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "My Tasks",
      url: "/task/list",
      icon: IconListDetails,
    },
  ],
  navMarketplace: [
    {
      title: "Marketplace",
      url: "/marketplace",
      icon: IconSearch,
    },
    {
      title: "My Purchases",
      url: "/purchases",
      icon: IconReport,
    },
  ],
  navExperiences: [
    {
      title: "My Experiences",
      url: "/experience/my-experiences",
      icon: IconFolder,
    },
    {
      title: "Experience List",
      url: "/experience/list",
      icon: IconListDetails,
    },
    {
      title: "Create SEAL Policy",
      url: "/experience/create-seal-policy",
      icon: IconFileAi,
    },
  ],
  navSeller: [
    {
      title: "Manage Allowlist",
      url: "/seller/allowlist",
      icon: IconUsers,
    },
    {
      title: "View Policies",
      url: "/seller/policies",
      icon: IconFileDescription,
    },
  ],
  navStorage: [
    {
      title: "Walrus Storage",
      url: "/walrus",
      icon: IconDatabase,
    },
    {
      title: "SEAL Encryption",
      url: "/seal",
      icon: IconFileAi,
    },
    {
      title: "SEAL Policies",
      url: "/seal/policies",
      icon: IconFileDescription,
    },
  ],
  // navClouds: [
  //   {
  //     title: "Capture",
  //     icon: IconCamera,
  //     isActive: true,
  //     url: "#",
  //     items: [
  //       {
  //         title: "Active Proposals",
  //         url: "#",
  //       },
  //       {
  //         title: "Archived",
  //         url: "#",
  //       },
  //     ],
  //   },
  //   {
  //     title: "Proposal",
  //     icon: IconFileDescription,
  //     url: "#",
  //     items: [
  //       {
  //         title: "Active Proposals",
  //         url: "#",
  //       },
  //       {
  //         title: "Archived",
  //         url: "#",
  //       },
  //     ],
  //   },
  //   {
  //     title: "Prompts",
  //     icon: IconFileAi,
  //     url: "#",
  //     items: [
  //       {
  //         title: "Active Proposals",
  //         url: "#",
  //       },
  //       {
  //         title: "Archived",
  //         url: "#",
  //       },
  //     ],
  //   },
  // ],
  // navSecondary: [
  //   {
  //     title: "Settings",
  //     url: "#",
  //     icon: IconSettings,
  //   },
  //   {
  //     title: "Get Help",
  //     url: "#",
  //     icon: IconHelp,
  //   },
  //   {
  //     title: "Search",
  //     url: "#",
  //     icon: IconSearch,
  //   },
  // ],
  // documents: [
  //   {
  //     name: "Data Library",
  //     url: "#",
  //     icon: IconDatabase,
  //   },
  //   {
  //     name: "Reports",
  //     url: "#",
  //     icon: IconReport,
  //   },
  //   {
  //     name: "Word Assistant",
  //     url: "#",
  //     icon: IconFileWord,
  //   },
  // ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props} className="border-r border-primary/20 bg-sidebar/80 backdrop-blur-xl">
      <SidebarHeader className="border-b border-primary/10 pb-4 pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5! hover:bg-primary/10 hover:text-primary transition-colors duration-300 group"
            >
              <a href="#">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:shadow-[0_0_10px_rgba(var(--primary),0.3)] transition-all duration-300">
                  <IconInnerShadowTop className="size-5" />
                </div>
                <span className="text-lg font-bold font-display tracking-widest text-foreground group-hover:text-primary transition-colors">TASK_OS</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4 space-y-6">
        <div className="px-2 w-full">
          <CreateTask />
        </div>
        
        {/* Main Navigation */}
        <div className="space-y-1">
          <div className="px-3 py-1.5">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Main</p>
          </div>
          <NavMain items={data.navMain} />
        </div>

        {/* Marketplace */}
        <div className="space-y-1">
          <div className="px-3 py-1.5">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Marketplace</p>
          </div>
          <NavMain items={data.navMarketplace} />
        </div>

        {/* Experiences */}
        <div className="space-y-1">
          <div className="px-3 py-1.5">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Experiences</p>
          </div>
          <NavMain items={data.navExperiences} />
        </div>

        {/* Seller Tools */}
        <div className="space-y-1">
          <div className="px-3 py-1.5">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Seller</p>
          </div>
          <NavMain items={data.navSeller} />
        </div>

        {/* Storage & Security */}
        <div className="space-y-1">
          <div className="px-3 py-1.5">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Storage</p>
          </div>
          <NavMain items={data.navStorage} />
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t border-primary/10 pt-4 pb-4 bg-sidebar/50">
        <CustomBtn />
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
