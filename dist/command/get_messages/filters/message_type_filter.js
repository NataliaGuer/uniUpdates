"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageTypeFilter = void 0;
const message_1 = require("../../../model/message");
const prismaWrapper_1 = require("../../../utils/db/prismaWrapper");
class MessageTypeFilter {
    getFilterCaption() {
        let options = [];
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
    handleValue(req) {
        const prisma = prismaWrapper_1.PrismaClientWrapper.getInstance();
        return prisma.sent_messages.findMany({
            where: {
                type: parseInt(req.data)
            },
            orderBy: {
                sent_date: "desc"
            },
            include: {
                fromUser: true
            }
        });
    }
}
exports.MessageTypeFilter = MessageTypeFilter;
MessageTypeFilter.description = "Tipo di messaggio";
MessageTypeFilter.key = "message_type";
//# sourceMappingURL=message_type_filter.js.map