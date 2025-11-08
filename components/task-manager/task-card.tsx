import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Share2 } from "lucide-react";
import { format } from "date-fns";
import { TaskItem } from "@/types";

interface TaskCardProps {
    task: TaskItem;
    onSelect: (id: string) => void;
}

export const TaskCard = ({ task, onSelect }: TaskCardProps) => {
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
                            <Badge variant="default">{task.priority}</Badge>
                        </div>
                        <CardDescription className="line-clamp-2 mb-3">
                            {task.description}
                        </CardDescription>
                    </CardHeader>
                </div>

                {/* --- Footer (always bottom) --- */}
                <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(task.due_date), "MMM dd, yyyy")}
                        </div>
                        <div className="flex items-center gap-1">
                            <Share2 className="h-4 w-4" />
                            {task.creator}
                        </div>
                    </div>
                </CardContent>
            </div>
        </Card>
    );
};
