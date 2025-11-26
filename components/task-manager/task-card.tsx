import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Share2, Hash, FileText, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { TaskItem } from "@/types";
import { getPriorityLabel } from "@/helpers";
import { Badge as RoleBadge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface TaskCardProps {
    task: TaskItem;
    sharedRoles?: Array<{ address: string; role: number }>;
}

// Helper function to shorten address/object ID
const shortenAddress = (address: string, chars = 6): string => {
    if (!address) return "";
    if (address.length <= chars * 2) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

export const TaskCard = ({ task, sharedRoles }: TaskCardProps) => {
    const router = useRouter();
    const priorityInfo = getPriorityLabel(Number(task.priority));
    
    // Check for content and files - handle both array and object formats
    const hasContent = task.content_blob_id && task.content_blob_id.length > 0;
    const fileCount = Array.isArray(task.file_blob_ids) ? task.file_blob_ids.length : 0;
    const sharedCount = sharedRoles?.length ?? 0;
    
    return (
        <Card
            className="py-4 cursor-pointer hover:shadow-[0_0_20px_rgba(var(--primary),0.2)] transition-all hover:scale-[1.02] animate-fade-in glass border-primary/20 bg-card/40 backdrop-blur-md h-full group relative overflow-hidden"
            onClick={() => router.push(`/task/${task.id}`)}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex flex-col justify-between h-full relative z-10">
                {/* --- Header & Content --- */}
                <div>
                    <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-lg font-display tracking-wide text-foreground group-hover:text-primary transition-colors">
                                {task.title}
                            </CardTitle>
                            <Badge 
                                variant="outline"
                                className={`${
                                    priorityInfo.color === 'red' ? 'border-destructive text-destructive bg-destructive/10' :
                                    priorityInfo.color === 'orange' ? 'border-orange-500 text-orange-500 bg-orange-500/10' :
                                    priorityInfo.color === 'blue' ? 'border-blue-500 text-blue-500 bg-blue-500/10' :
                                    'border-green-500 text-green-500 bg-green-500/10'
                                } font-mono uppercase tracking-wider text-[10px]`}
                            >
                                {priorityInfo.label}
                            </Badge>
                        </div>
                        <CardDescription className="line-clamp-2 mb-3 text-muted-foreground/80 font-mono text-xs">
                            {task.description}
                        </CardDescription>
                        {/* Object ID Badge */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 font-mono opacity-60">
                            <Hash className="h-3 w-3" />
                            <span>{shortenAddress(task.id, 8)}</span>
                            {sharedCount > 0 && (
                                <RoleBadge variant="secondary" className="ml-2 bg-secondary/20 text-secondary border-secondary/50 text-[10px]">
                                    SHARED: {sharedCount}
                                </RoleBadge>
                            )}
                        </div>
                    </CardHeader>
                </div>

                {/* --- Footer (always bottom) --- */}
                <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2 font-mono text-xs">
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.due_date), "MMM dd, yyyy")}
                        </div>
                        <div className="flex items-center gap-1">
                            <Share2 className="h-3 w-3" />
                            <span>{shortenAddress(task.creator, 4)}</span>
                        </div>
                    </div>
                    {/* Content and Files indicators */}
                    {(hasContent || fileCount > 0) && (
                        <div className="flex items-center gap-3 text-xs text-primary/80 border-t border-primary/10 pt-2 font-mono">
                            {hasContent && (
                                <div className="flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    <span>CONTENT</span>
                                </div>
                            )}
                            {fileCount > 0 && (
                                <div className="flex items-center gap-1">
                                    <Paperclip className="h-3 w-3" />
                                    <span>{fileCount} FILE{fileCount !== 1 ? 'S' : ''}</span>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </div>
        </Card>
    );
};
