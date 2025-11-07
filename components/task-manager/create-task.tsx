"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { IconCirclePlusFilled } from "@tabler/icons-react";
import { TaskItem } from "@/types";

interface CreateTaskProps {
    onAddTask: (task: TaskItem) => void;
}

export const CreateTask = ({ onAddTask }: CreateTaskProps) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [priority, setPriority] = useState("2"); // Default to Medium priority
    const [isCreating, setIsCreating] = useState(false);
    const [open, setOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim()) {
            onAddTask({
                id: new Date().toISOString(),
                title,
                description,
                priority,
                creator: "0xMOCK...CREATOR",
                created_at: new Date().toISOString(),
                due_date: new Date().toISOString(),
                is_completed: false,
            });
            setTitle("");
            setDescription("");
            setPriority("2");
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="lg" className="w-full h-full gap-2">
                    <IconCirclePlusFilled />
                    <span>Quick Create</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-2xl">
                        Create New Task
                    </DialogTitle>
                    <DialogDescription>
                        Add a new task to your board. Fill in the details below.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Task Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter task title..."
                            required
                            className="bg-background"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter task description..."
                            rows={3}
                            className="bg-background resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <Label htmlFor="due-date">
                                Due Date (Optional)
                            </Label>
                            <Input
                                id="due-date"
                                type="datetime-local"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                disabled={isCreating}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select
                                value={priority.toString()}
                                onValueChange={(value: string) =>
                                    setPriority(value)
                                }
                            >
                                <SelectTrigger
                                    id="priority"
                                    className="bg-background min-w-40"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Low</SelectItem>
                                    <SelectItem value="2">Medium</SelectItem>
                                    <SelectItem value="3">High</SelectItem>
                                    <SelectItem value="4">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                !title.trim() ||
                                !description.trim() ||
                                isCreating
                            }
                            variant="default"
                            className="flex-1"
                        >
                            {isCreating ? "Creating..." : "Create Task"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
