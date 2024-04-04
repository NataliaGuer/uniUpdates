"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartCommandHandler = void 0;
const base_1 = require("./base");
/**
 * gestisce l'inizio della conversazione con il bot
 */
class StartCommandHandler extends base_1.BaseCommandHandler {
    constructor() {
        super(...arguments);
        this.convStates = null;
    }
    handle(req) {
        return this.prisma.user.findMany().then(allUsers => {
            return {
                success: true,
                text: JSON.stringify(allUsers),
            };
        });
    }
}
exports.StartCommandHandler = StartCommandHandler;
//# sourceMappingURL=start.js.map