"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCommand = void 0;
const client_1 = require("@prisma/client");
class BaseCommand {
    constructor() {
        this.INITIAL_STATE = null;
        this.prisma = new client_1.PrismaClient();
    }
    updateChatState(newChat) {
        this.prisma.chat.update({
            where: {
                id: newChat.id,
            },
            data: newChat,
        });
    }
}
exports.BaseCommand = BaseCommand;
//# sourceMappingURL=baseCommand.js.map