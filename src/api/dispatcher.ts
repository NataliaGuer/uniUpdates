import { user } from "@prisma/client";
import { AuthenticateCommandHandler, BaseCommandHandler } from "../command";
import { PrismaClientWrapper } from "../utils/db/prismaWrapper";
import { CommandDirectory } from "./command_directory";
import { ChatRequest, Request } from "./request";
import { Response } from "./response";

export class Dispatcher {
    prisma: PrismaClientWrapper;
    commandDirectory: CommandDirectory;

    constructor() {
        this.prisma = PrismaClientWrapper.getInstance();
        this.commandDirectory = new CommandDirectory();
    }

    dispatch(req: Request): Promise<Response | Response[]> {
        //we retieve or create a chat instance
        let chatPromise = this.prisma.chat
            .findUnique({
                where: {
                    id: req.chatId.toString(),
                },
            })
            .then((chat) => {
                if (!chat) {
                    return this.prisma.chat.create({
                        data: {
                            id: req.chatId.toString(),
                            extra_info: "",
                        },
                    });
                } else {
                    return chat;
                }
            });

        return chatPromise.then((chat) => {
            const chatReq = { ...req, chat: chat };

            let command = this.getCommandInstance(chatReq);

            if (!this.isAuthenticated(chatReq)) {
                command = new AuthenticateCommandHandler();
                try {
                    return command.handle(chatReq);
                } catch (error) {
                    console.log(error);

                    return {
                        success: false,
                        text: "Errore interno",
                    };
                }
            } else if (command) {
                if (this.isCommandRequest(chatReq) && chatReq.chat.command !== null) {
                    this.prisma.chat.update({
                        where: {
                            id: chat.id,
                        },
                        data: {
                            command: null,
                            command_state: null,
                            command_state_ordinal: 0,
                            extra_info: {},
                        },
                    })
                    .then((res) => {
                    })
                    
                    chatReq.chat.command = null;
                    chatReq.chat.command_state = null;
                    chatReq.chat.extra_info = "";
                }

                return this.dispatchCommand(command, chat.id, chatReq);
            }

            return Promise.resolve({
                success: false,
                text: "Comando non riconosciuto",
            });
        });
    }

    private dispatchCommand(command: BaseCommandHandler, chatId: string, req: ChatRequest): Promise<Response|Response[]> {
        return this.prisma.user
            .findUnique({
                where: {
                    chat_id: chatId,
                },
            })
            .then((user) => {
                return command.handle({ ...req, user: user });
            });
    }

    private isCommandRequest(req: Request): boolean {
        return !!req.text && req.text.startsWith("/");
    }

    private getCommandInstance(chatReq: ChatRequest): BaseCommandHandler | null {
        //commadString is null when the text isn't a command and there wasn't any commad running previously
        let commandString: string | null = this.isCommandRequest(chatReq) ? chatReq.text : chatReq.chat.command;

        const constructor = this.commandDirectory.getConstructor(commandString);

        if (constructor) {
            return new constructor();
        }

        return null;
    }

    private isAuthenticated(chatReq: ChatRequest): boolean {
        return !!chatReq.chat.token;
    }
}
