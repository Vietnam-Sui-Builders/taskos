"use client";

import { IconCirclePlusFilled, IconMail, type Icon } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CreateTask } from "./task-manager/create-task";
import { useRouter } from "next/navigation";

export function NavMain({
    items,
}: {
    items: {
        title: string;
        url: string;
        icon?: Icon;
    }[];
}) {
    const router = useRouter();

    return (
        <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                tooltip={item.title}
                                onClick={() => router.push(item.url)}
                                className="cursor-pointer group hover:bg-primary/10 hover:text-primary data-[active=true]:bg-primary/20 data-[active=true]:text-primary transition-all duration-200 border border-transparent hover:border-primary/20"
                            >
                                {item.icon && <item.icon className="text-muted-foreground group-hover:text-primary transition-colors" />}
                                <span className="font-mono text-sm tracking-wide group-hover:tracking-wider transition-all">{item.title}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
