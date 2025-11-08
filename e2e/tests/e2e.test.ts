import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { parseCreatedObjectsIds } from "../helpers/parseCreatedObjectIds";
import { suiClient } from "../suiClient";
import { createAndUpdateTask } from "../helpers/createAndUpdateTask";
import { getTaskInfo } from "../helpers/getTaskInfo";
import { getTasksRegistry } from "../helpers/getTasksRegistry";

describe("Create a Task, update Task", () => {
    let txResponse: SuiTransactionBlockResponse;
    let taskId: string | undefined;
    let tasksIds: string[] = [];

    beforeAll(async () => {
        txResponse = await createAndUpdateTask();
        await suiClient.waitForTransaction({
            digest: txResponse.digest,
            timeout: 5_000,
        });
        console.log("Executed transaction with txDigest:", txResponse.digest);
    });

    test("Transaction Status", () => {
        expect(txResponse.effects).toBeDefined();
        expect(txResponse.effects!.status.status).toBe("success");
    });

    test("Created Task", async () => {
        expect(txResponse.objectChanges).toBeDefined();
        const { tasksIds } = parseCreatedObjectsIds({
            objectChanges: txResponse.objectChanges!,
        });
        expect(tasksIds.length).toBe(1);
        taskId = tasksIds[0];
    });

    test("Task is updated", async () => {
        const task = await getTaskInfo(taskId!);
        expect(task).toBeDefined();
    });

    test("Tasks registry", async () => {
        const { status, ids } = await getTasksRegistry(1);
        console.log("Registry with status: ", status);
        tasksIds = ids;
        expect(ids.length).toBeGreaterThan(0);
        expect(ids).toContain(taskId);
        expect(ids.length).toBeGreaterThan(0);
    });
});
