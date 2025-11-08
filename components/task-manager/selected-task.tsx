import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TaskViewer } from "./task-viewer";
import { TaskContentUpload } from "./task-content-upload";
import { ShareTask } from "./share-task";

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
            <DialogContent className="max-w-4xl h-[95vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        Managing Task: {selectedTask?.slice(0, 8)}...
                    </DialogTitle>
                    <DialogDescription>
                        View, upload files, or share this task.
                    </DialogDescription>
                </DialogHeader>

                {/* --- Scrollable Content Area --- */}
                <div className="flex-1 overflow-y-auto mt-4">
                    <Tabs defaultValue="view" className="h-full flex flex-col">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger
                                value="view"
                                className="cursor-pointer"
                            >
                                View Task
                            </TabsTrigger>
                            <TabsTrigger
                                value="upload"
                                className="cursor-pointer"
                            >
                                Add Content & Files
                            </TabsTrigger>
                            <TabsTrigger
                                value="share"
                                className="cursor-pointer"
                            >
                                Share Task
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-y-auto mt-4 px-1">
                            {/* --- Tab: View --- */}
                            <TabsContent value="view" className="h-full">
                                <TaskViewer taskId={selectedTask!} />
                            </TabsContent>

                            {/* --- Tab: Upload --- */}
                            <TabsContent value="upload" className="h-full">
                                <TaskContentUpload />
                            </TabsContent>

                            {/* --- Tab: Share --- */}
                            <TabsContent value="share" className="h-full">
                                <ShareTask taskId={selectedTask} />
                            </TabsContent>
                        </div>
                    </Tabs>
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
