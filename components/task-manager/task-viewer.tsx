"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog";
import { Task } from "@/types";
import { useState } from "react";
import { formatDueDate, getPriorityLabel, isOverdue } from "@/helpers";

const mockTask: Task = {
    id: "1",
    creator: "0x...somebodyelse",
    title: "Mock Task Title",
    description: "This is a mock task description for TaskViewer.",
    content_blob_id: "mock_content_blob_id",
    file_blob_ids: ["mock_file_blob_id_1", "mock_file_blob_id_2"],
    shared_with: [""],
    is_completed: false,
    created_at: String(Math.floor(Date.now() / 1000) - 86400 * 3),
    updated_at: String(Math.floor(Date.now() / 1000) - 86400),
    due_date: String(Math.floor(Date.now() / 1000) + 86400 * 4),
    priority: 3,
};

interface TaskViewerProps {
    taskId: string;
}

export function TaskViewer({ taskId }: TaskViewerProps) {
    const [task, setTask] = useState<Task>(mockTask);
    const [decryptedContent, setDecryptedContent] = useState<string>("");
    const [decryptedFiles, setDecryptedFiles] = useState<
        Array<{ name: string; url: string; type: string }>
    >([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const priorityInfo = getPriorityLabel(task.priority);
    const overdueStatus = isOverdue(task.due_date, task.is_completed);

    return (
        <Card
            className={`p-4 ${
                overdueStatus ? "border-2 border-red-500 bg-red-50" : ""
            }`}
        >
            <CardContent className="flex flex-col gap-4 p-0">
                {/* --- Task Info --- */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <strong className="text-lg font-semibold">
                            {task.title}
                        </strong>

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

                    <p className="text-sm text-muted-foreground">
                        {task.description}
                    </p>

                    <p className="text-sm text-gray-500">
                        Created by: {task.creator ? "You" : task.creator}
                    </p>

                    <p className="text-sm text-gray-500">
                        Due date: {formatDueDate(task.due_date)}
                    </p>

                    <p className="text-sm text-gray-500">
                        Shared with: {task.shared_with.length} users
                    </p>

                    <p className="text-sm text-gray-500">
                        Status:{" "}
                        {task.is_completed ? "Completed" : "In Progress"}
                    </p>

                    {task.content_blob_id && (
                        <p className="text-sm text-blue-600">
                            Has encrypted content
                        </p>
                    )}
                    {task.file_blob_ids.length > 0 && (
                        <p className="text-sm text-blue-600">
                            Has {task.file_blob_ids.length} encrypted file(s)
                        </p>
                    )}
                </div>

                {/* --- Decrypt Button --- */}
                <Button
                    // onClick={decryptTaskContent}
                    disabled={
                        isLoading ||
                        // !currentAccount ||
                        (!task.content_blob_id &&
                            task.file_blob_ids.length === 0)
                    }
                >
                    {isLoading
                        ? "Decrypting content..."
                        : "View Content & Download Files"}
                </Button>

                {/* --- Error Box --- */}
                {error && (
                    <div className="p-3 bg-red-100 rounded-md">
                        <p className="text-sm text-red-600 whitespace-pre-line">
                            {error}
                        </p>
                    </div>
                )}

                {/* --- Dialog --- */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogTitle>Decrypted Task Content</DialogTitle>
                        <DialogDescription>
                            {decryptedContent || decryptedFiles.length > 0 ? (
                                <div className="flex flex-col gap-4">
                                    {/* --- Decrypted Text --- */}
                                    {decryptedContent && (
                                        <div>
                                            <strong>Content:</strong>
                                            <div className="p-3 bg-gray-50 rounded-md mt-2">
                                                <p className="whitespace-pre-wrap">
                                                    {decryptedContent}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* --- Decrypted Files --- */}
                                    {decryptedFiles.length > 0 && (
                                        <div>
                                            <strong>
                                                Files ({decryptedFiles.length}):
                                            </strong>
                                            <div className="flex flex-col gap-2 mt-2">
                                                {decryptedFiles.map(
                                                    (file, index) => (
                                                        <div
                                                            key={index}
                                                            className="flex justify-between items-center p-2 bg-gray-50 rounded-md"
                                                        >
                                                            <p>{file.name}</p>
                                                            <div className="flex gap-2">
                                                                {file.type.startsWith(
                                                                    "image/"
                                                                ) && (
                                                                    <Button
                                                                        variant="secondary"
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            window.open(
                                                                                file.url,
                                                                                "_blank"
                                                                            )
                                                                        }
                                                                    >
                                                                        View
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    asChild
                                                                >
                                                                    <a
                                                                        href={
                                                                            file.url
                                                                        }
                                                                        download={
                                                                            file.name
                                                                        }
                                                                    >
                                                                        Download
                                                                    </a>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p>No content found to decrypt.</p>
                            )}
                        </DialogDescription>

                        <div className="flex justify-end gap-3 mt-4">
                            <DialogClose asChild>
                                <Button variant="secondary">Close</Button>
                            </DialogClose>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
