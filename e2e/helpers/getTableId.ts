import { SuiParsedData } from "@mysten/sui/client";
import { suiClient } from "../suiClient";

export const getTableIdOfTask = async (
    heroId: string
): Promise<string | undefined> => {
    // TODO: Implement this function
    const hero = await suiClient.getObject({
        id: heroId,
        options: {
            showContent: true,
        },
    });

    if (!hero.data) return undefined;

    const content = hero.data.content as Extract<
        SuiParsedData,
        {
            dataType: "moveObject";
        }
    >;

    const fields = content.fields as {
        weapon: {
            fields: {
                id: {
                    id: string;
                };
            };
        };
    };

    return fields.weapon.fields.id.id;
};
