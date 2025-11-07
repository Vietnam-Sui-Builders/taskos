import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Share2, FileText } from "lucide-react";
import { format } from "date-fns";
import { TaskItem } from "@/types";

interface TaskCardProps {
    task: TaskItem;
    onSelect: (id: string) => void;
}

export const TaskCard = ({ task, onSelect }: TaskCardProps) => {
    return (
        <Card
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] animate-fade-in glass-card"
            onClick={() => onSelect(task.id)}
        >
            <CardHeader>
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    <Badge variant={"default"}>{task.priority}</Badge>
                </div>
                <CardDescription className="line-clamp-2">
                    {task.description}
                </CardDescription>
            </CardHeader>
            <CardContent>
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
        </Card>
    );
};
