"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartCommand = void 0;
const client_1 = require("@prisma/client");
const baseCommand_1 = require("./baseCommand");
/**
 * gestisce l'inizio della conversazione con il bot
 */
class StartCommand extends baseCommand_1.BaseCommand {
    constructor() {
        super(...arguments);
        this.command = "/start";
        this.convStates = null;
    }
    handle(req) {
        const prisma = new client_1.PrismaClient();
        const allStudent = prisma.user.findMany();
        return {
            success: true,
            text: JSON.stringify(allStudent)
        };
    }
}
exports.StartCommand = StartCommand;
//# sourceMappingURL=startCommand.js.map