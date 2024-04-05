import { sent_messages, user } from "@prisma/client";
import { ChatRequest } from "../../../api/request";

export interface MessageFilter {
    /**
     * returns the message that indicates to the user which value to insert
     * once the filter is selected.
     */
    getFilterCaption(): FilterCaption;

    /**
     * performs the query to obtain the messages,
     * filtering with the value selected by the user
     *
     * returns an array of sent_messages each with the info of the user who sent the message
     */
    handleValue(req: ChatRequest): Promise<MessageWithFromUser[]>;
}

export interface FilterCaption {
    text: string;
    options?: {
        text: string;
        data: string;
    }[];
}

export interface MessageFilterConstructor {
    new (): MessageFilter;
}

export type MessageWithFromUser = { fromUser: user } & sent_messages;