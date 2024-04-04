"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dispatcher = void 0;
const command_1 = require("../command");
const prismaWrapper_1 = require("../utils/db/prismaWrapper");
const command_directory_1 = require("./command_directory");
class Dispatcher {
    constructor() {
        this.prisma = prismaWrapper_1.PrismaClientWrapper.getInstance();
        this.commandDirectory = new command_directory_1.CommandDirectory();
    }
    dispatch(req) {
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
            }
            else {
                return chat;
            }
        });
        return chatPromise.then((chat) => {
            const chatReq = Object.assign(Object.assign({}, req), { chat: chat });
            let command = this.getCommandInstance(chatReq);
            /*
            nel caso l'utente non sia autneticato il comando che
            ha richiesto viene sostituito da quello per l'autenticazione
            altrimenti viene letto l'utente e inserito nella richiesta
            */
            if (!this.isAuthenticated(chatReq)) {
                command = new command_1.AuthenticateCommandHandler();
                return command.handle(chatReq);
            }
            else if (command) {
                return this.prisma.user
                    .findUnique({
                    where: {
                        chat_id: chat.id,
                    },
                })
                    .then((user) => {
                    return command.handle(Object.assign(Object.assign({}, chatReq), { user: user }));
                });
            }
            return Promise.resolve({
                success: false,
                text: "Comando non riconosciuto",
            });
        });
    }
    isCommandRequest(req) {
        return !!req.text && req.text.startsWith("/");
    }
    getCommandInstance(chatReq) {
        //commandString è null quando il testo non è un comando e non era precedentemente in esecuzione un comando
        let commandString = this.isCommandRequest(chatReq)
            ? chatReq.text
            : chatReq.chat.command;
        const constructor = this.commandDirectory.getConstructor(commandString);
        if (constructor) {
            return new constructor();
        }
        return null;
    }
    isAuthenticated(chatReq) {
        return !!chatReq.chat.token;
    }
}
exports.Dispatcher = Dispatcher;
//# sourceMappingURL=dispatcher.js.map