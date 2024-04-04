import { Request } from "../api/request";
import { Response } from "../api/response";
import { BaseCommandHandler } from "./base";

/**
 * interrompe il comando in esecuzione
 */
export class StopCommandHandler extends BaseCommandHandler {
    static command = "/stop";
    
    convStates = null;
    templatesFolder: string;

    handle(req: Request): Promise<Response> {
        this.cleanChatState(req.chat);
        return this.wrapResponseInPromise({
            success: true,
            text: "Comando interrotto"
        });
    }
}