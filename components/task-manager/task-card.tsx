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

interface TaskCardProps {
    task: TaskItem;
    onSelect: (id: string) => void;
}

// Helper function to shorten address/object ID
const shortenAddress = (address: string, chars = 6): string => {
    if (!address) return "";
    if (address.length <= chars * 2) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

export const TaskCard = ({ task, onSelect }: TaskCardProps) => {
    const priorityInfo = getPriorityLabel(Number(task.priority));
    
    // Check for content and files - handle both array and object formats
    const hasContent = task.content_blob_id && task.content_blob_id.length > 0;
    const fileCount = Array.isArray(task.file_blob_ids) ? task.file_blob_ids.length : 0;
    
    return (
        <Card
            className="py-4 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] animate-fade-in glass-card h-full"
            onClick={() => onSelect(task.id)}
        >
            <div className="flex flex-col justify-between h-full">
                {/* --- Header & Content --- */}
                <div>
                    <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-lg">
                                {task.title}
                            </CardTitle>
                            <Badge 
                                variant="default"
                                className={`${
                                    priorityInfo.color === 'red' ? 'bg-red-500' :
                                    priorityInfo.color === 'orange' ? 'bg-orange-500' :
                                    priorityInfo.color === 'blue' ? 'bg-blue-500' :
                                    'bg-green-500'
                                } text-white hover:opacity-90`}
                            >
                                {priorityInfo.label}
                            </Badge>
                        </div>
                        <CardDescription className="line-clamp-2 mb-3">
                            {task.description}
                        </CardDescription>
                        {/* Object ID Badge */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Hash className="h-3 w-3" />
                            <span className="font-mono">{shortenAddress(task.id, 8)}</span>
                        </div>
                    </CardHeader>
                </div>

                {/* --- Footer (always bottom) --- */}
                <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(task.due_date), "MMM dd, yyyy")}
                        </div>
                        <div className="flex items-center gap-1">
                            <Share2 className="h-4 w-4" />
                            <span className="font-mono text-xs">{shortenAddress(task.creator, 4)}</span>
                        </div>
                    </div>
                    {/* Content and Files indicators */}
                    {(hasContent || fileCount > 0) && (
                        <div className="flex items-center gap-3 text-xs text-blue-600 dark:text-blue-400 border-t pt-2">
                            {hasContent && (
                                <div className="flex items-center gap-1">
                                    <FileText className="h-3.5 w-3.5" />
                                    <span>Content</span>
                                </div>
                            )}
                            {fileCount > 0 && (
                                <div className="flex items-center gap-1">
                                    <Paperclip className="h-3.5 w-3.5" />
                                    <span>{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </div>
        </Card>
    );
};
