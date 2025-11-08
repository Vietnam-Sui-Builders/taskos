import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { ENV } from "../env";
import { getAddress } from "./getAddress";
import { suiClient } from "../suiClient";
import { getSigner } from "./getSigner";
import { bcs } from "@mysten/sui/bcs";

export const createAndAddComment =
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
                tx.object("0x6"),
                tx.object(ENV.TASKS_REGISTRY_ID),
            ],
            typeArguments: [],
        });

        tx.moveCall({
            target: `${ENV.PACKAGE_ID}::task_manage::add_comment`,
            arguments: [
                tx.object(ENV.VERSION_ID),
                task,
                tx.pure.string("Let's do it"),
                tx.object.clock,
            ],
        });

        tx.moveCall({
            target: `${ENV.PACKAGE_ID}::task_manage::add_comment`,
            arguments: [
                tx.object(ENV.VERSION_ID),
                task,
                tx.pure.string("We did it"),
                tx.object.clock,
            ],
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
