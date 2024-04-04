"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StopCommand = void 0;
const baseCommand_1 = require("./baseCommand");
/**
 * interrompe il comando in esecuzione
 */
class StopCommand extends baseCommand_1.BaseCommand {
    constructor() {
        super(...arguments);
        this.command = "/stop";
        this.convStates = null;
    }
    handle(req) {
        throw new Error("not yet implemented");
    }
}
exports.StopCommand = StopCommand;
//# sourceMappingURL=stopCommand.js.map