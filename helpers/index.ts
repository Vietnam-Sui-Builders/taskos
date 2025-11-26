// Helper function to format priority
export const getPriorityLabel = (priority: number) => {
    switch (priority) {
        case 1:
            return { label: "Low", color: "green" };
        case 2:
            return { label: "Medium", color: "blue" };
        case 3:
            return { label: "High", color: "orange" };
        case 4:
            return { label: "Critical", color: "red" };
        default:
            return { label: "Unknown", color: "gray" };
    }
};

// Helper function to format due date
export const formatDueDate = (due_date: string) => {
    if (!due_date || due_date === "0") return "No due date";
    const parsedDate = parseDate(due_date);
    return parsedDate ? parsedDate.toLocaleDateString() : "No due date";
};

// Helper function to check if task is overdue
export const isOverdue = (due_date: string, is_completed: boolean) => {
    if (!due_date || due_date === "0" || is_completed) return false;
    const parsedDate = parseDate(due_date);
    if (!parsedDate) return false;
    return Date.now() > parsedDate.getTime();
};

const parseDate = (due_date: string) => {
    const numeric = Number(due_date);
    if (!Number.isNaN(numeric) && numeric > 0) return new Date(numeric);
    const fallback = new Date(due_date);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
};

// Helper function to get status label
export const getStatusLabel = (status: number) => {
    switch (status) {
        case 0: return { label: "To Do", color: "bg-gray-500" };
        case 1: return { label: "In Progress", color: "bg-blue-500" };
        case 2: return { label: "Completed", color: "bg-green-500" };
        case 3: return { label: "Archived", color: "bg-orange-500" };
        default: return { label: "Unknown", color: "bg-gray-500" };
    }
};

// Helper function to get role label
export const getRoleLabel = (role: number) => {
    switch (role) {
        case 1: return "Viewer";
        case 2: return "Editor";
        case 3: return "Owner";
        default: return "Unknown";
    }
};
