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
    if (due_date === "0") return "No due date";
    const date = new Date(parseInt(due_date) * 1000);
    return date.toLocaleDateString();
};

// Helper function to check if task is overdue
export const isOverdue = (due_date: string, is_completed: boolean) => {
    if (due_date === "0" || is_completed) return false;
    const dueTime = parseInt(due_date) * 1000;
    return Date.now() > dueTime;
};
