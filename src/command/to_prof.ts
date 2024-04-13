import { chat } from "@prisma/client";
import { ChatRequest } from "../api/request";
import { Response } from "../api/response";
import { MessageStatus, MessageType } from "../model/message";
import { BaseCommandHandler, convState, messageTemplates } from "./base";
import { renderFile } from "ejs";
import { UserRole } from "../model/user";

export class ToProfCommandHandler extends BaseCommandHandler {
    static command = "/toprof";

    WAITING_FOR_PROF_MAIL = 0;
    WAITING_FOR_MESSAGE_TYPE = 1;
    WAITING_FOR_MESSAGE = 2;
    WAITING_FOR_CONFIRMATION = 3;

    /*
    il flusso funziona come segue:
    1. l'utente utilizza il comando /toprof per inviare un messaggio
    2. il bot chiede la mail del professore dopo aver controllato il numero di tentativi
            controlla che il professore esista
            se esiste si continua
            se non esiste si torna al punto 2 e si incremente il numero di tentativi
    3. il bot chiede il tipo di messaggio che l'utente vuole inviare
        (inviare risposta con scelta multipla)
    4. il bot chiede il messaggio che l'utente vuole inviare
    5. il bot chiede conferma di tutta l'operazione: mi confermi che vuoi inviare il messaggio "..." al
    professore "..." con la motivazione "..."?
    6. se l'utente conferma il messaggio viene salvato altrimenti il flusso viene interrotto e
    il comando viene cancellato
    */

    convStates: convState = {
        [this.WAITING_FOR_PROF_MAIL]: {
            maxTransitions: 3,
        },
        [this.WAITING_FOR_MESSAGE_TYPE]: {
            maxTransitions: 1,
        },
        [this.WAITING_FOR_MESSAGE]: {
            maxTransitions: 1,
        },
        [this.WAITING_FOR_CONFIRMATION]: {
            maxTransitions: 1,
        },
    };

    templatesFolder: string = "to_prof";
    templates: messageTemplates = {
        confirm: this.getTemplate("confirm"),
    };

    handle(req: ChatRequest): Promise<Response> {
        let res: Promise<Response>;
        switch (req.chat.command_state) {
            case this.INITIAL_STATE:
                res = this.requestProfMail(req);
                break;
            case this.WAITING_FOR_PROF_MAIL:
                res = this.requestMessageType(req);
                break;
                case this.WAITING_FOR_MESSAGE_TYPE:
                res = this.requestMessage(req);
                break;
            case this.WAITING_FOR_MESSAGE:
                res = this.requestConfirmation(req);
                break;
            case this.WAITING_FOR_CONFIRMATION:
                res = this.handleConfirmation(req);
                break;
            default:
                res = this.wrapResponseInPromise({
                    success: false,
                    text: "Qualcosa è andato storto, riprova.",
                });
                break;
        }
        return res;
    }

    protected requestProfMail(req: ChatRequest): Promise<Response> {
        /*
        imposta lo stato della conversazione a WAITING_FOR_PROF_MAIL
        controlla il numero di tentativi prima di richiedere la mail del professore
        */

        req.chat.command = ToProfCommandHandler.command;
        req.chat.command_state = this.WAITING_FOR_PROF_MAIL;
        req.chat.command_state_ordinal++;
        this.updateChatState(req.chat);

        return this.wrapResponseInPromise({
            success: true,
            text: "Inserisci la mail del professore",
        });
    }

    protected requestMessageType(req: ChatRequest): Promise<Response> {
        /*
        controlla che esista un professore con la mail indicata
        imposta lo stato della conversazione a WAITING_FOR_MESSAGE_TYPE
        restituisce una risposta con le opzioni per il tipo di messaggio
        */
        return this.prisma.user
            .findUnique({
                where: {
                    email: req.text,
                    role: UserRole.professor
                },
            })
            .then((user) => {
                if (!user) {
                    return this.handleProfNotFound(req.chat);
                }
                //ho trovato il professore
                return this.handleProfFound(req.chat, req.text);
            });
    }

    protected handleProfNotFound(chat: chat): Response {
        if (chat.command_state_ordinal > this.convStates[this.WAITING_FOR_PROF_MAIL].maxTransitions) {
            this.cleanChatState(chat);
            return {
                success: false,
                text: "Troppi tentatitivi, procedura interrotta.",
            };
        }

        chat.command_state_ordinal++;
        this.updateChatState(chat);

        return {
            success: false,
            text: "Non ho trovato nessun professore con questa mail, riprova",
        };
    }

    protected handleProfFound(chat: chat, profMail: string): Response {
        chat.command_state = this.WAITING_FOR_MESSAGE_TYPE;
        chat.command_state_ordinal = 1;
        
        let extraInfo = JSON.parse(chat.extra_info.toString());
        extraInfo.to = profMail;
        chat.extra_info = extraInfo;
        this.updateChatState(chat);

        let options: { text: string; data: string }[] = [];
        for (let key in MessageType) {
            options.push({
                text: MessageType[key].description,
                data: MessageType[key].id.toString(),
            });
        }

        return {
            success: true,
            text: "Scrivimi il tipo di messaggio da inviare",
            options: options,
        };
    }

    protected requestMessage(req: ChatRequest): Promise<Response> {
        /*
        imposta lo stato della conversazione a WAITING_FOR_MESSAGE
        gestisce la risposta contenente il tipo di messaggio desiderato
        salva il tipo di messaggio negli extra data
        richiede il testo del messaggio da inviare
        */
        const messageTypes: number[] = [];
        for (let key in MessageType) {
            messageTypes.push(MessageType[key].id);
        }

        if (!messageTypes.includes(parseInt(req.data))) {
            this.cleanChatState(req.chat);
            return this.wrapResponseInPromise({
                success: false,
                text: "Tipo di messaggio non valido, procedura interrotta.",
            });
        }

        req.chat.command_state = this.WAITING_FOR_MESSAGE;
        req.chat.command_state_ordinal++;
        
        let extraInfo = JSON.parse(req.chat.extra_info.toString());
        extraInfo.type = parseInt(req.data);
        req.chat.extra_info = extraInfo;
        this.updateChatState(req.chat);

        return this.wrapResponseInPromise({
            success: true,
            text: "Scrivimi il messaggio da inviare",
        });
    }

    protected requestConfirmation(req: ChatRequest): Promise<Response> {
        /*
        imposta lo stato della conversazione a WAITING_FOR_CONFIRMATION
        salva il testo del messaggio da inviare
        restituisce una risposta con le opzioni per confermare l'invio
        ricapitolando il professore che riceverà il messaggio e il messaggio stesso
        */
        req.chat.command_state = this.WAITING_FOR_CONFIRMATION;
        req.chat.command_state_ordinal = 1;
        
        let extraInfo = JSON.parse(req.chat.extra_info.toString());
        extraInfo.messageText = req.text;
        //we save the id of the message to which the professor will replay
        extraInfo.messageId = req.message_id;
        
        req.chat.extra_info = extraInfo;
        this.updateChatState(req.chat);

        //utilizzo di un template per la richiesta della conferma
        return renderFile(this.templates.confirm, {
            message: req.text,
            profMail: req.chat.extra_info["to"],
        }).then((html) => {
            return {
                success: true,
                text: html,
                parseMode: "HTML",
                options: [
                    {
                        text: "Si",
                        data: "1",
                    },
                    {
                        text: "No",
                        data: "0",
                    },
                ],
            };
        });
    }

    protected handleConfirmation(req: ChatRequest): Promise<Response> {
        /*
        gestisce la selezione della conferma dell'invio del messaggio
        crea un nuovo record nella tabella message
        restituisce un messaggio di conferma dell'invio
        */
        const res = parseInt(req.data);
        if (res === 1) {
            
            let extraInfo = JSON.parse(req.chat.extra_info.toString());
            return this.prisma.sent_messages.create({
                data: {
                    from: req.user.email,
                    to: extraInfo.to,
                    type: extraInfo.type,
                    text: extraInfo.messageText,
                    status: MessageStatus.sent,
                    message_id: extraInfo.messageId
                },
            })
            .then((message) => {
                this.cleanChatState(req.chat);
                return this.wrapResponseInPromise({
                    success: true,
                    text: "Messaggio inviato",
                });
            })
        }
        
        this.cleanChatState(req.chat);
        return this.wrapResponseInPromise({
            success: true,
            text: "Messaggio eliminato",
        });
    }
}
