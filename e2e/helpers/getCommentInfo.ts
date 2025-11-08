import { SuiParsedData } from "@mysten/sui/client";
import { suiClient } from "../suiClient";

interface CommentInfo {
    author: string;
    content: string;
    created_at: number;
    edited_at: number;
}

export const getCommentInfo = async (
    commentsId: string
): Promise<CommentInfo | undefined> => {
    const comment = await suiClient.getObject({
        id: commentsId,
        options: {
            showContent: true,
        },
    });

    if (!comment.data) {
        return undefined;
    }

    const content = comment.data.content as Extract<
        SuiParsedData,
        {
            dataType: "moveObject";
        }
    >;

    const fields = content.fields as {
        id: {
            id: string;
        };
        value: {
            type: string;
            fields: {
                author: string;
                content: string;
                created_at: number;
                edited_at: number;
            };
        }[];
    };
    const value = fields.value;
    const firstComment = value[0];

    return firstComment.fields;
};
