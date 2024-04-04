"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageTypeFilter = void 0;
const message_1 = require("../../../model/message");
class MessageTypeFilter {
    getFilterCaption() {
        let options;
        for (const [key, value] of Object.entries(message_1.MessageType)) {
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
    handleValue(value) {
        throw new Error("Method not implemented.");
    }
}
exports.MessageTypeFilter = MessageTypeFilter;
MessageTypeFilter.description = "Tipo di messaggio";
MessageTypeFilter.key = "message_type";
//# sourceMappingURL=message_type_filter.js.map