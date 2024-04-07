import { ChatRequest, Request } from "../api/request";
import { Response } from "../api/response";
import { BaseCommandHandler, convState, messageTemplates } from "./base";
import { renderFile } from "ejs";
import { CommandDirectory } from "../api/command_directory";

/**
 * gestisce l'inizio della conversazione con il bot
 */
export class StartCommandHandler extends BaseCommandHandler {
    static command: string = "/start";
    
    convStates = null;
    templatesFolder = 'start';

    commandDirectory: CommandDirectory;

    templates: messageTemplates = {
        main: this.getTemplate("main")
    };

    constructor(){
        super();
        this.commandDirectory = new CommandDirectory();
    }

    handle(req: ChatRequest): Promise<Response> {
        const commands = this.commandDirectory.getCommandList(req.user);
        
        return renderFile(this.templates.main, {commands: commands})
        .then((html) => {
            return {
                success: true,
                text: html,
                parseMode: "HTML"
            }
        })
    }
}
