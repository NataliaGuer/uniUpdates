import {Response} from "../api/response";
import {ChatRequest} from "../api/request";
import { chat } from "@prisma/client";
import { PrismaClientWrapper } from "../utils/db/prismaWrapper";
import path from "path";

export abstract class BaseCommandHandler {
    prisma: PrismaClientWrapper;
    INITIAL_STATE = null;
    templates: messageTemplates;

    static command: string;
    abstract convStates: convState | null;
    abstract templatesFolder: string | null;
    abstract handle(req: ChatRequest): Promise<Response|Response[]>;

    constructor() {
        this.prisma = PrismaClientWrapper.getInstance();
    }

    protected updateChatState(newChat: chat): void {
        this.prisma.chat.update({
            where: {
                id: newChat.id,
            },
            data: {
                token: newChat.token,
                command: newChat.command,
                command_state: newChat.command_state,
                command_state_ordinal: newChat.command_state_ordinal,
                extra_info: JSON.stringify(newChat.extra_info),
            },
        })
        .then(res => {})
    }

    /**
     * il metodo permette di azzerare lo stato della chat, ad esempio 
     * a seguito del verificarsi di un errore bloccante
     * @param chat 
     */
    protected cleanChatState(chat: chat): void {
        this.prisma.chat.update({
            where: {
                id: chat.id,
            },
            data: {
                command: null,
                command_state: this.INITIAL_STATE,
                command_state_ordinal: 0,
                extra_info: {},
            },
        })
        .then(res => {})
    }

    protected wrapResponseInPromise(res: Response): Promise<Response> {
        return new Promise<Response>((resolve, reject) => {
            resolve(res);
        });
    }

    protected getTemplate(templateName: string): string {
        return path.join(
            __dirname,
            "..",
            "..",
            "view",
            this.templatesFolder,
            `${templateName}.ejs`
        );
    }
}

export interface convState {
    [key: number]: {
        maxTransitions: number;
    }
}

export interface messageTemplates {
    [key: string]: string;
}

export interface CommandHandlerConstructor {
    new(): BaseCommandHandler;
}