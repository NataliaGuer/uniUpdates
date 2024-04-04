import { MessageType } from "../../../model/message";
import { FilterCaption, MessageFilter } from "./message_filter";

export class MessageTypeFilter implements MessageFilter{
    static description = "Tipo di messaggio";
    static key = "message_type";

    getFilterCaption(): FilterCaption {
        let options: [{ text: string; data: string }];

        for (const [key, value] of Object.entries(MessageType)) {
            options.push({
                text: value.description,
                data: value.id.toString(),
            });
        }

        return {
            text: "Seleziona il tipo di messaggio",
            options: options,
        };
    }

    handleValue(value: string): Promise<[]> {
        throw new Error("Method not implemented.");
    }
}
