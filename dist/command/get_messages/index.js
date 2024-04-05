"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetMessagesCommandHandler = void 0;
const base_1 = require("../base");
const ejs_1 = require("ejs");
const message_1 = require("../../model/message");
const student_name_filter_1 = require("./filters/student_name_filter");
const message_type_filter_1 = require("./filters/message_type_filter");
class GetMessagesCommandHandler extends base_1.BaseCommandHandler {
    constructor() {
        super(...arguments);
        this.templatesFolder = "get_messages";
        this.templates = {
            main: this.getTemplate("main"),
            messagesList: this.getTemplate("messages_list"),
        };
        this.WAITING_FOR_MESSAGE_STATUS = 1;
        this.WAITING_FOR_FILTER_SELECTION = 2;
        this.WAITING_FOR_FILTER_INFO = 3;
        this.convStates = {
            [this.WAITING_FOR_FILTER_SELECTION]: {
                maxTransitions: 1,
            },
            [this.WAITING_FOR_FILTER_INFO]: {
                maxTransitions: 1,
            },
        };
        this.availableFilters = {
            none: {
                description: "Nessun filtro",
                filterConstructor: null,
            },
            [student_name_filter_1.StudentNameFilter.key]: {
                description: student_name_filter_1.StudentNameFilter.description,
                filterConstructor: student_name_filter_1.StudentNameFilter,
            },
            [message_type_filter_1.MessageTypeFilter.key]: {
                description: message_type_filter_1.MessageTypeFilter.description,
                filterConstructor: message_type_filter_1.MessageTypeFilter,
            },
        };
    }
    handle(req) {
        /*
        gli stati della conversazione sono
        1. l'utente seleziona il comando
        1.1 il bot chiede se si vogliono visualizzare i messaggi nuovi o vecchi
        1.2 l'utente sceglie un tipo di messaggio
        2. il bot mostra in numero di messaggi e i filtri
        2.1 attesa della selezione dei filtri
        3. gestione del filtro
        (una volta che l'utente ha selezionato un determinato filtro deve essere
        invocato il metodo che si occupa di gestire quel determinato filtro)
        4. ottenimento dei risultati filtrati
        5. i risultati visualizzati vengono messi in stato read
        */
        let res;
        switch (req.chat.command_state) {
            case this.INITIAL_STATE:
                res = this.requestMessageType(req.chat);
                break;
            case this.WAITING_FOR_MESSAGE_STATUS:
                res = this.showAvailableFilters(req);
                break;
            case this.WAITING_FOR_FILTER_SELECTION:
                res = this.handleFilter(req);
                break;
            case this.WAITING_FOR_FILTER_INFO:
                res = this.showMessages(req);
                break;
        }
        return res;
    }
    requestMessageType(chat) {
        chat.command = GetMessagesCommandHandler.command;
        chat.command_state = this.WAITING_FOR_MESSAGE_STATUS;
        this.updateChatState(chat);
        return this.wrapResponseInPromise({
            success: true,
            text: "📥 Quali messaggi vuoi visualizzare?",
            options: [
                {
                    text: "Non ancora letti",
                    data: message_1.MessageStatus.sent.toString(),
                },
                {
                    text: "Già letti",
                    data: message_1.MessageStatus.read.toString(),
                },
            ],
        });
    }
    showAvailableFilters(req) {
        if (!req.data) {
            this.cleanChatState(req.chat);
            return this.wrapResponseInPromise({
                success: false,
                text: "Comando interrotto",
            });
        }
        const { chat, user } = req;
        const messageCount = this.prisma.sent_messages.count({
            where: {
                to: user.email,
                status: parseInt(req.data),
            },
        });
        //l'attributo di classe che contiene i filtri disponibili viene mappato in un array
        //formattato in modo che possa essere utilizzato nel template
        let mappedFilters = [];
        for (const [key, value] of Object.entries(this.availableFilters)) {
            mappedFilters.push({
                text: value.description,
                data: key,
            });
        }
        return messageCount.then((count) => {
            if (count > 0) {
                chat.command_state = this.WAITING_FOR_FILTER_SELECTION;
                chat.extra_info = { selectedStatus: req.data };
                this.updateChatState(chat);
            }
            else {
                this.cleanChatState(chat);
            }
            return (0, ejs_1.renderFile)(this.templates.main, {
                countMessages: count,
                messagesType: parseInt(req.data),
            }, { rmWhitespace: true }).then((html) => {
                return {
                    success: true,
                    text: html,
                    options: count > 0 ? mappedFilters : null,
                };
            });
        });
    }
    handleFilter(req) {
        const chatExtraInfo = JSON.parse(req.chat.extra_info.toString());
        chatExtraInfo.filterApplied = req.data;
        req.chat.command_state = this.WAITING_FOR_FILTER_INFO;
        req.chat.extra_info = chatExtraInfo;
        this.updateChatState(req.chat);
        const filterHandler = this.getFilterHandler(req.data);
        if (filterHandler) {
            let filterHandler = new this.availableFilters[req.data].filterConstructor();
            let res = filterHandler.getFilterCaption();
            return this.wrapResponseInPromise(Object.assign({ success: true }, res));
        }
        //the user selected "no filter option" so we return all the messages
        const allMessages = this.prisma.sent_messages.findMany({
            where: {
                status: parseInt(chatExtraInfo.selectedStatus),
            },
            include: {
                fromUser: true,
            },
            orderBy: {
                sent_date: "desc",
            },
        });
        this.cleanChatState(req.chat);
        return allMessages.then((all) => this.createMessagesResponse(all));
    }
    showMessages(req) {
        //the user selected the filter and replied with an option or text
        //the filter take all the request and, depending on what it presented previously to the
        //user, extracts the desired data from it
        //the filter key is in chat.extradata
        let chatExtraData = JSON.parse(req.chat.extra_info.toString());
        const filterHandler = this.getFilterHandler(chatExtraData.filterApplied);
        let res;
        if (filterHandler) {
            res = filterHandler.handleValue(req)
                .then((messages) => this.createMessagesResponse(messages));
        }
        else {
            res = this.wrapResponseInPromise({
                success: false,
                text: "Il filtro selezionato non è valido",
            });
        }
        this.cleanChatState(req.chat);
        return res;
    }
    createMessagesResponse(messages) {
        const mappedMessages = messages.map((message) => {
            return {
                id: message.id,
                date: this.formatMessagedate(message.sent_date),
                hour: this.formatMessageHour(message.sent_date),
                student: message.fromUser.name,
                text: message.text,
                typeDescription: message_1.MessageTypeMapping[message.type].description,
            };
        });
        return (0, ejs_1.renderFile)(this.templates.messagesList, {
            messages: mappedMessages,
        }, { rmWhitespace: true }).then((html) => {
            return {
                success: true,
                parse_mode: "HTML",
                text: html,
            };
        });
    }
    formatMessagedate(date) {
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }
    formatMessageHour(date) {
        return `${date.getHours()}:${date.getMinutes()}`;
    }
    getFilterHandler(key) {
        var _a;
        const constructor = (_a = this.availableFilters[key]) === null || _a === void 0 ? void 0 : _a.filterConstructor;
        if (constructor) {
            return new this.availableFilters[key].filterConstructor();
        }
        return null;
    }
}
exports.GetMessagesCommandHandler = GetMessagesCommandHandler;
GetMessagesCommandHandler.command = "/getmessages";
//# sourceMappingURL=index.js.map