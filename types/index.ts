export interface Task {
    id: string;
    creator: string;
    title: string;
    description: string;
    image_url: string;
    content_blob_id: string;
    file_blob_ids: string[];
    created_at: string;
    updated_at: string;
    due_date: string;
    priority: number;
    status: number; // 0=TODO, 1=IN_PROGRESS, 2=COMPLETED, 3=ARCHIVED
    category: string;
    tags: string[];
    // Dynamic fields (may not always be present)
    assignee?: string;
    reward_balance?: number;
    comments?: Comment[];
}

export interface Comment {
    author: string;
    content: string;
    created_at: string;
    edited_at: string;
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
    status?: number;
    category?: string;
    tags?: string[];
    assignee?: string;
    content_blob_id?: string;
    file_blob_ids?: string[];
}

export interface SharedTaskItem {
    id: string;
    title: string;
    description: string;
    creator: string;
    is_completed: boolean;
    due_date: string;
    priority: string;
    status?: number;
    category?: string;
    tags?: string[];
}

// Role constants
export const ROLE_VIEWER = 1;
export const ROLE_EDITOR = 2;
export const ROLE_OWNER = 3;

// Status constants
export const STATUS_TODO = 0;
export const STATUS_IN_PROGRESS = 1;
export const STATUS_COMPLETED = 2;
export const STATUS_ARCHIVED = 3;

// Priority constants
export const PRIORITY_LOW = 1;
export const PRIORITY_MEDIUM = 2;
export const PRIORITY_HIGH = 3;
export const PRIORITY_CRITICAL = 4;
