import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { ENV } from "../env";
import { getAddress } from "./getAddress";
import { suiClient } from "../suiClient";
import { getSigner } from "./getSigner";
import { bcs } from "@mysten/sui/bcs";

export const createAndUpdateTask =
    async (): Promise<SuiTransactionBlockResponse> => {
        const tx = new Transaction();

        const randomNum = Math.random();

        // Create task
        const task = tx.moveCall({
            target: `${ENV.PACKAGE_ID}::task_manage::create_task`,
            arguments: [
                tx.object(ENV.VERSION_ID),
                tx.pure.string("Task #" + randomNum.toString().slice(2, 9)),
                tx.pure.string("Join SuiHub bootcamp"),
                tx.pure.string(
                    "https://static.vecteezy.com/system/resources/previews/025/638/355/large_2x/simple-task-icon-the-icon-can-be-used-for-websites-print-templates-presentation-templates-illustrations-etc-free-vector.jpg"
                ),
                tx.pure(bcs.option(bcs.u64()).serialize(null)),
                tx.pure.u8(2),
                tx.pure.string("Study"),
                tx.pure.vector("string", ["Sui"]),
                tx.object.clock,
                tx.object(ENV.TASKS_REGISTRY_ID),
            ],
            typeArguments: [],
        });

        // Update task
        tx.moveCall({
            target: `${ENV.PACKAGE_ID}::task_manage::update_task_info`,
            arguments: [
                tx.object(ENV.VERSION_ID),
                task,
                tx.pure.string(
                    "Updated Task #" + randomNum.toString().slice(2, 9)
                ),
                tx.pure.string("Join SuiHub bootcamp on 8th November 2025"),
                tx.object.clock,
            ],
            typeArguments: [],
        });

        tx.moveCall({
            target: `${ENV.PACKAGE_ID}::task_manage::update_priority`,
            arguments: [
                tx.object(ENV.VERSION_ID),
                task,
                tx.pure.u8(4),
                tx.object.clock,
            ],
            typeArguments: [],
        });

        tx.moveCall({
            target: `${ENV.PACKAGE_ID}::task_manage::update_due_date`,
            arguments: [
                tx.object(ENV.VERSION_ID),
                task,
                tx.pure(bcs.option(bcs.u64()).serialize("1762599600")),
                tx.object.clock,
            ],
            typeArguments: [],
        });

        tx.moveCall({
            target: `${ENV.PACKAGE_ID}::task_manage::update_status`,
            arguments: [
                tx.object(ENV.VERSION_ID),
                task,
                tx.pure.u8(1),
                tx.object.clock,
                tx.object(ENV.TASKS_REGISTRY_ID),
            ],
            typeArguments: [],
        });

        tx.moveCall({
            target: `${ENV.PACKAGE_ID}::task_manage::add_tag`,
            arguments: [
                tx.object(ENV.VERSION_ID),
                task,
                tx.pure.string("Technical"),
                tx.object.clock,
            ],
            typeArguments: [],
        });

        tx.moveCall({
            target: `${ENV.PACKAGE_ID}::task_manage::add_tag`,
            arguments: [
                tx.object(ENV.VERSION_ID),
                task,
                tx.pure.string("Blockchain"),
                tx.object.clock,
            ],
            typeArguments: [],
        });

        tx.moveCall({
            target: `${ENV.PACKAGE_ID}::task_manage::remove_tag`,
            arguments: [
                tx.object(ENV.VERSION_ID),
                task,
                tx.pure.u64(1),
                tx.object.clock,
            ],
            typeArguments: [],
        });

        const signer = getSigner({ secretKey: ENV.USER_SECRET_KEY });
        const address = getAddress({ secretKey: ENV.USER_SECRET_KEY });

        tx.transferObjects([task], address);

        return suiClient.signAndExecuteTransaction({
            transaction: tx,
            signer,
            options: {
                showEffects: true,
                showObjectChanges: true,
            },
        });
    };
