import { sent_messages } from "@prisma/client";

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
     * returns an array of sent_messages
     */
    handleValue(value: string): Promise<sent_messages[]>;
}

export interface FilterCaption {
    text: string;
    options?: [
        {
            text: string;
            data: string;
        }
    ]
}

export interface MessageFilterConstructor {
    new (): MessageFilter;
}