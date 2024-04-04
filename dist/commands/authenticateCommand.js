"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticateCommand = void 0;
const baseCommand_1 = require("./baseCommand");
const mail_1 = require("@sendgrid/mail");
const jsonwebtoken_1 = require("jsonwebtoken");
class AuthenticateCommand extends baseCommand_1.BaseCommand {
    constructor() {
        super(...arguments);
        this.command = "/auth";
        this.WAITING_FOR_MAIL = 0;
        this.WAITING_FOR_MAIL_CONFIRMATION = 1;
        this.WAITING_FOR_TOKEN = 2;
        this.COMMAND_CANCELLED = 3;
        this.convStates = {
            [this.WAITING_FOR_MAIL]: {
                maxTransitions: 3
            },
            [this.WAITING_FOR_MAIL_CONFIRMATION]: {
                maxTransitions: 3
            },
            [this.WAITING_FOR_TOKEN]: {
                maxTransitions: 1
            },
            [this.COMMAND_CANCELLED]: {
                maxTransitions: 1
            }
        };
    }
    //gli step dell'autenticazione sono:
    //- l'utente seleziona il comando /authenticate
    //- il bot chiede la mail
    //- l'utente fornisce la mail
    //- il bot chiede conferma della mail
    //- invio un codice alla mail indicata
    //- salvo il codice in una apposita tabella
    //- il bot chiede il codice
    //- l'utente fornisce il codice
    //- verifico che il codice sia quello atteso
    //- imposto lo stato della chat come autenticata
    handle(req) {
        //legge lo stato della chat
        let res = null;
        switch (req.chat.command_state) {
            case this.INITIAL_STATE:
                res = this.requestMail(req.chat);
                break;
            case this.WAITING_FOR_MAIL:
                //l'utente invia la mail e causa il cambiamento di stato
                res = this.requestMailConfirmation(req.chat, req.text);
                break;
            default:
                res = {
                    success: false,
                    text: "Stato inconsistente",
                };
                break;
        }
        return res;
        // this.updateChatState(req.chatId, 0);
        // this.sendEmail("nataliaguerrini1@gmail.com");
        // return {
        //     success: true,
        //     text: "ok",
        // };
    }
    requestMail(chat) {
        chat.command = this.command;
        chat.command_state = this.WAITING_FOR_MAIL;
        chat.command_state_ordinal = 1;
        this.updateChatState(chat);
        return {
            success: true,
            text: "Inserisci la tua email"
        };
    }
    requestMailConfirmation(chat, email) {
        let res = {
            success: false,
            text: "Ops! si è verificato un errore, riprova più tardi"
        };
        if (chat.command_state_ordinal === this.convStates[this.WAITING_FOR_MAIL_CONFIRMATION].maxTransitions) {
            chat.command = null;
            chat.command_state = this.INITIAL_STATE;
            chat.command_state_ordinal = null;
            this.updateChatState(chat);
            return {
                success: false,
                text: "Il numero di tentativi è stato superato"
            };
        }
        //controllo se esiste un utente con la mail fornita
        const user = this.prisma.user.findUnique({
            where: {
                email: email
            }
        });
        if (!user) {
            //chiedo un altra email
            chat.command_state = this.WAITING_FOR_MAIL;
            chat.command_state_ordinal = 1;
            this.updateChatState(chat);
            return {
                success: false,
                text: "Email non trovata"
            };
        }
        chat.command_state = this.WAITING_FOR_MAIL_CONFIRMATION;
        chat.command_state_ordinal = 1;
        chat.extra_info = { "emailToConfirm": email };
    }
    sendEmail(email) {
        const sgMail = new mail_1.MailService();
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        const msg = {
            to: email,
            from: process.env.BOT_MAIL,
            subject: "Test autenticazione",
            text: `You're verification token is: ${this.getToken(email)}.
            It will expire in 30min.`,
        };
        sgMail.send(msg);
    }
    getToken(email) {
        const payload = {
            email: email,
        };
        const options = {
            expiresIn: "30m",
        };
        return (0, jsonwebtoken_1.sign)(payload, process.env.JWT_SECRET, options);
    }
}
exports.AuthenticateCommand = AuthenticateCommand;
//# sourceMappingURL=authenticateCommand.js.map