import { SuiParsedData } from "@mysten/sui/client";
import { suiClient } from "../suiClient";

interface TaskInfo {
    title: string;
    description: string;
    due_date: string | null;
    priority: number;
    status: number;
    category: string;
    tags: string[];
}

export const getTaskInfo = async (
    taskId: string
): Promise<TaskInfo | undefined> => {
    const task = await suiClient.getObject({
        id: taskId,
        options: {
            showContent: true,
        },
    });

    if (!task.data) {
        return undefined;
    }

    const content = task.data.content as Extract<
        SuiParsedData,
        {
            dataType: "moveObject";
        }
    >;

    const fields = content.fields as {
        title: string;
        description: string;
        due_date: string | null;
        priority: number;
        status: number;
        category: string;
        tags: string[];
    };
    return fields;
};
