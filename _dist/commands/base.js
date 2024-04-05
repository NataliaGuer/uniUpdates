"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCommandHandler = void 0;
const prismaWrapper_1 = require("../utils/db/prismaWrapper");
class BaseCommandHandler {
    constructor() {
        this.INITIAL_STATE = null;
        this.prisma = prismaWrapper_1.PrismaClientWrapper.getInstance();
    }
    updateChatState(newChat) {
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
            .then(res => { });
    }
    /**
     * il metodo permette di azzerare lo stato della chat, ad esempio
     * a seguito del verificarsi di un errore bloccante
     * @param chat
     */
    cleanChatState(chat) {
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
            .then(res => { });
    }
    wrapResponseInPromise(res) {
        return new Promise((resolve, reject) => {
            resolve(res);
        });
    }
}
exports.BaseCommandHandler = BaseCommandHandler;
//# sourceMappingURL=base.js.map