import { SharedTaskItem } from "@/types";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { formatDueDate, getPriorityLabel, isOverdue } from "@/helpers";

interface SharedTaskCardProps {
    task: SharedTaskItem;
    onSelect: (id: string) => void;
}

export const SharedTaskCard = ({ task, onSelect }: SharedTaskCardProps) => {
    const priorityInfo = getPriorityLabel(parseInt(task.priority));
    const overdueStatus = isOverdue(task.due_date, task.is_completed);
    return (
        <Card
            key={task.id}
            className={`p-4 ${
                overdueStatus ? "border-2 border-red-500 bg-red-50" : ""
            } cursor-pointer`}
            onClick={() => onSelect(task.id)}
        >
            <CardContent className="flex flex-col justify-between h-full p-0">
                <div className="flex flex-col gap-1 grow">
                    <div className="flex items-center justify-between">
                        <p className="text-lg font-medium">{task.title}</p>

                        <div className="flex gap-2">
                            <Badge
                                className={`bg-${priorityInfo.color}-100 text-${priorityInfo.color}-800`}
                            >
                                {priorityInfo.label}
                            </Badge>

                            {overdueStatus && (
                                <Badge className="bg-red-600 text-white">
                                    OVERDUE
                                </Badge>
                            )}
                        </div>
                    </div>

                    <p className="text-sm text-gray-600">{task.description}</p>
                    <p className="text-xs text-gray-500">
                        Created by: {task.creator.slice(0, 10)}...
                    </p>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                    <p>
                        Status:{" "}
                        {task.is_completed ? "Completed" : "In Progress"}
                    </p>
                    <p>Due: {formatDueDate(task.due_date)}</p>
                </div>
            </CardContent>
        </Card>
    );
};
