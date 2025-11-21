import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TaskActionTabs } from "./task-action-tabs";

interface SelectedTaskProps {
    selectedTask: string | undefined;
    setSelectedTask: (task: string | undefined) => void;
}

export function SelectedTask({
    selectedTask,
    setSelectedTask,
}: SelectedTaskProps) {
    return (
        <Dialog
            open={!!selectedTask}
            onOpenChange={() => setSelectedTask(undefined)}
        >
            <DialogContent className="max-w-2xl h-[95vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        Managing Task: {selectedTask?.slice(0, 8)}...
                    </DialogTitle>
                    <DialogDescription>
                        View, edit, upload files, manage comments, rewards, or share this task.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto mt-4">
                    <TaskActionTabs taskId={selectedTask!} />
                </div>

                {/* --- Footer / Close Button --- */}
                <div className="flex justify-end mt-4">
                    <Button
                        variant="secondary"
                        onClick={() => setSelectedTask(undefined)}
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
