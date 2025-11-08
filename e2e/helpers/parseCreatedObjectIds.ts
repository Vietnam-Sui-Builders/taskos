import { SuiObjectChange, SuiObjectChangeCreated } from "@mysten/sui/client";
import { ENV } from "../env";

interface Args {
    objectChanges: SuiObjectChange[];
}

interface Response {
    tasksIds: string[];
}

/**
 * Parses the provided SuiObjectChange[].
 * Extracts the IDs of the created Task, filtering by objectType.
 */
export const parseCreatedObjectsIds = ({ objectChanges }: Args): Response => {
    const createdObjects = objectChanges.filter(
        ({ type }) => type === "created"
    ) as SuiObjectChangeCreated[];

    const createdTasks = createdObjects.filter(
        ({ objectType }) =>
            objectType === `${ENV.PACKAGE_ID}::task_manage::Task`
    );

    return {
        tasksIds: createdTasks.map(({ objectId }) => objectId),
    };
};
