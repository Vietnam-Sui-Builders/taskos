export interface Task {
    id: string;
    creator: string;
    title: string;
    description: string;
    content_blob_id: string;
    file_blob_ids: string[];
    shared_with: string[];
    is_completed: boolean;
    created_at: string;
    updated_at: string;
    due_date: string;
    priority: number;
}

export interface TaskItem {
    id: string;
    title: string;
    description: string;
    creator: string;
    is_completed: boolean;
    created_at: string;
    due_date: string;
    priority: string;
}

export interface SharedTaskItem {
    id: string;
    title: string;
    description: string;
    creator: string;
    is_completed: boolean;
    due_date: string;
    priority: string;
}
