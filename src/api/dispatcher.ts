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

    dispatch(req: Request): Promise<Response> {
        //ottenimento della chat o sua creazione
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

            /*
            nel caso l'utente non sia autneticato il comando che
            ha richiesto viene sostituito da quello per l'autenticazione
            altrimenti viene letto l'utente e inserito nella richiesta
            */
            if (!this.isAuthenticated(chatReq)) {
                command = new AuthenticateCommandHandler();
                return command.handle(chatReq);
            } else if (command) {
                return this.prisma.user
                    .findUnique({
                        where: {
                            chat_id: chat.id,
                        },
                    })
                    .then((user) => {
                        return command.handle({ ...chatReq, user: user });
                    });
            }

            return Promise.resolve({
                success: false,
                text: "Comando non riconosciuto",
            });
        });
    }

    private isCommandRequest(req: Request): boolean {
        return !!req.text && req.text.startsWith("/");
    }

    private getCommandInstance(
        chatReq: ChatRequest
    ): BaseCommandHandler | null {
        //commandString è null quando il testo non è un comando e non era precedentemente in esecuzione un comando
        let commandString: string | null = this.isCommandRequest(chatReq)
            ? chatReq.text
            : chatReq.chat.command;

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
