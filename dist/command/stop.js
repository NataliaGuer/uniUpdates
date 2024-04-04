"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StopCommandHandler = void 0;
const base_1 = require("./base");
/**
 * interrompe il comando in esecuzione
 */
class StopCommandHandler extends base_1.BaseCommandHandler {
    constructor() {
        super(...arguments);
        this.convStates = null;
    }
    handle(req) {
        throw new Error("not yet implemented");
    }
}
exports.StopCommandHandler = StopCommandHandler;
StopCommandHandler.command = "/stop";
//# sourceMappingURL=stop.js.map