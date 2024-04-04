import { chat } from "@prisma/client";
import { ChatRequest } from "../../api/request";
import { Response } from "../../api/response";
import { BaseCommandHandler, convState, messageTemplates } from "../base";
import { renderFile } from "ejs";
import { MessageStatus } from "../../model/message";
import { StudentNameFilter } from "./filters/student_name_filter";
import { MessageTypeFilter } from "./filters/message_type_filter";
import { MessageFilterConstructor } from "./filters/message_filter";

interface filters {
    [key: string]: {
        description: string;
        filterConstructor: MessageFilterConstructor;
    };
}

export class GetMessagesCommandHandler extends BaseCommandHandler {
    static command = "/getmessages";

    templatesFolder = "get_messages";
    templates: messageTemplates = {
        main: this.getTemplate("main"),
    };

    private WAITING_FOR_MESSAGE_STATUS = 1;
    private WAITING_FOR_FILTER_SELECTION = 2;
    private WAITING_FOR_FILTER_INFO = 3;

    convStates: convState = {
        [this.WAITING_FOR_FILTER_SELECTION]: {
            maxTransitions: 1,
        },
        [this.WAITING_FOR_FILTER_INFO]: {
            maxTransitions: 1,
        },
    };

    availableFilters: filters = {
        none: {
            description: "Nessun filtro",
            filterConstructor: null,
        },
        [StudentNameFilter.key]: {
            description: StudentNameFilter.description,
            filterConstructor: StudentNameFilter,
        },
        [MessageTypeFilter.key]: {
            description: MessageTypeFilter.description,
            filterConstructor: MessageTypeFilter,
        },
    };

    handle(req: ChatRequest): Promise<Response> {
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

        let res: Promise<Response>;
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

    protected requestMessageType(chat: chat): Promise<Response> {
        chat.command = GetMessagesCommandHandler.command;
        chat.command_state = this.WAITING_FOR_MESSAGE_STATUS;
        this.updateChatState(chat);

        return this.wrapResponseInPromise({
            success: true,
            text: "📥 Quali messaggi vuoi visualizzare?",
            options: [
                {
                    text: "Non ancora letti",
                    data: MessageStatus.sent.toString(),
                },
                {
                    text: "Già letti",
                    data: MessageStatus.read.toString(),
                },
            ],
        });
    }

    protected showAvailableFilters(req: ChatRequest): Promise<Response> {
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
                this.updateChatState(chat);
            } else {
                this.cleanChatState(chat);
            }

            return renderFile(this.templates.main, {
                countMessages: count,
                messagesType: parseInt(req.data),
            }).then((html) => {
                return {
                    success: true,
                    text: html,
                    options: count > 0 ? mappedFilters : null,
                };
            });
        });
    }

    protected handleFilter(req: ChatRequest): Promise<Response> {
        req.chat.command_state = this.WAITING_FOR_FILTER_INFO;
        req.chat.extra_info = {filterKey: req.data};
        this.updateChatState(req.chat);

        let filterHandler = new this.availableFilters[
            req.data
        ].filterConstructor();

        let res = filterHandler.getFilterCaption();

        return this.wrapResponseInPromise({
            success: true,
            ...res,
        });
    }

    protected showMessages(req: ChatRequest): Promise<Response> {
        return this.wrapResponseInPromise({
            success: true,
            text: "not",
        });
    }
}
