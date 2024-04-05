"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartCommandHandler = void 0;
const base_1 = require("./base");
const ejs_1 = require("ejs");
const command_directory_1 = require("../api/command_directory");
/**
 * gestisce l'inizio della conversazione con il bot
 */
class StartCommandHandler extends base_1.BaseCommandHandler {
    constructor() {
        super();
        this.convStates = null;
        this.templatesFolder = 'start';
        this.templates = {
            main: this.getTemplate("main")
        };
        this.commandDirectory = new command_directory_1.CommandDirectory();
    }
    handle(req) {
        const commands = this.commandDirectory.getCommandList(req.user);
        return (0, ejs_1.renderFile)(this.templates.main, { commands: commands })
            .then((html) => {
            return {
                success: true,
                text: html,
                parse_mode: "HTML"
            };
        });
    }
}
exports.StartCommandHandler = StartCommandHandler;
StartCommandHandler.command = "/start";
//# sourceMappingURL=start.js.map