import { chat } from "@prisma/client";
import { ChatRequest } from "../api/request";
import { Response } from "../api/response";
import { BaseCommandHandler, convState, messageTemplates } from "./base";

interface filters {
    [key: string]: {
        description: string,
        handler: string
    };
}

export class GetMessagesCommandHandler extends BaseCommandHandler {
    static command = "/getmessages";

    templatesFolder = "get_messages";
    templates: messageTemplates = {
        main: this.getTemplate("main"),
    };

    private WAITING_FOR_FILTER_SELECTION = 1;
    private WAITING_FOR_FILTER_INFO = 2;

    convStates: convState = {
        [this.WAITING_FOR_FILTER_SELECTION]: {
            maxTransitions: 1,
        },
        [this.WAITING_FOR_FILTER_INFO]: {
            maxTransitions: 1,
        },
    };

    availableFilters: filters = {
        studentName: {
            description: "Nome studente",
            handler: "test"
        }
    }

    handle(req: ChatRequest): Promise<Response> {
        /*
        gli stati della conversazione sono
        1. selezione del comando
        2. attesa della selezione dei filtri
        3. gestione del filtro
        (una volta che l'utente ha selezionato un determinato filtro deve essere
        invocato il metodo che si occupa di gestire quel determinato filtro)
        4. ottenimento dei risultati filtrati
        5. i risultati visualizzati vengono messi in stato read
        */

        let res: Promise<Response>;
        switch (req.chat.command_state) {
            case this.INITIAL_STATE:
                res = this.showAvailableFilters(req.chat);
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

    protected showAvailableFilters(chat: chat): Promise<Response> {
        chat.command == GetMessagesCommandHandler.command;
        chat.command_state = this.WAITING_FOR_FILTER_SELECTION;
        this.updateChatState(chat);

        //TODO 
        //mappare oggetto contenente i filtri in un array utilizzabile per valorizzazione ejs
        const filters = Array.from(this.availableFilters, ([key, value]) => {
            return {
                id: key,
                name: value.description,
            }
        })

    }
    protected handleFilter(req: ChatRequest): Promise<Response> {}
    protected showMessages(req: ChatRequest): Promise<Response> {}
}