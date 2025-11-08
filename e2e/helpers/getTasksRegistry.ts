import { SuiParsedData } from "@mysten/sui/client";
import { ENV } from "../env";
import { suiClient } from "../suiClient";

interface TasksRegistry {
    status: number;
    ids: string[];
}

export const getTasksRegistry = async (
    status: number
): Promise<TasksRegistry> => {
    // TODO: Implement this function
    const registry = await suiClient.getObject({
        id: ENV.TASKS_REGISTRY_ID,
        options: {
            showContent: true,
        },
    });
    if (!registry.data) {
        return {
            status,
            ids: [],
        };
    }
    const content = registry.data.content as Extract<
        SuiParsedData,
        {
            dataType: "moveObject";
        }
    >;
    const fields = content.fields as {
        tasks_by_status: string;
    };

    const dynamicField = await suiClient.getDynamicFieldObject({
        parentId: fields.tasks_by_status,
        name: {
            type: "u8",
            value: status,
        },
    });

    if (!dynamicField.data)
        return {
            status,
            ids: [],
        };

    const dynamicContent = dynamicField.data.content as Extract<
        SuiParsedData,
        {
            dataType: "moveObject";
        }
    >;

    const dynamicContentFields = dynamicContent.fields as {
        value: string[];
    };
    let ids = dynamicContentFields.value;

    return {
        status,
        ids,
    };
};
