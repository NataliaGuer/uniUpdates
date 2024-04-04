import { chat } from "@prisma/client";
import { AuthenticationRequest } from "../api/request";
import { Response } from "../api/response";
import { BaseCommandHandler, convState } from "./base";
import { MailServiceWrapper } from "../utils/mail/sendgridWrapper";

export class AuthenticateCommandHandler extends BaseCommandHandler {
    static command = "/auth";
    templatesFolder: string;

    private WAITING_FOR_MAIL = 0;
    private WAITING_FOR_MAIL_CONFIRMATION = 1;
    private WAITING_FOR_TOKEN = 2;

    convStates: convState = {
        [this.WAITING_FOR_MAIL]: {
            maxTransitions: 3,
        },
        [this.WAITING_FOR_MAIL_CONFIRMATION]: {
            maxTransitions: 3,
        },
        [this.WAITING_FOR_TOKEN]: {
            maxTransitions: 1,
        }
    };

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

    handle(req: AuthenticationRequest): Promise<Response> {
        let res: Promise<Response>;
        switch (req.chat.command_state) {
            case this.INITIAL_STATE:
                res = this.requestMail(req.chat);
                break;
            case this.WAITING_FOR_MAIL:
                //l'utente invia la mail e causa il cambiamento di stato
                res = this.requestMailConfirmation(req.chat, req.text);
                break;
            case this.WAITING_FOR_MAIL_CONFIRMATION:
                res = this.checkEmailConfirmation(req);
                break;
            case this.WAITING_FOR_TOKEN:
                res = this.checkToken(req);
                break;
            default:
                res = this.wrapResponseInPromise({
                    success: false,
                    text: "nice try",
                });
                break;
        }

        return res;
    }

    protected requestMail(chat: chat): Promise<Response> {
        if (
            chat.command_state_ordinal ===
            this.convStates[this.WAITING_FOR_MAIL].maxTransitions
        ) {
            this.cleanChatState(chat);

            return this.wrapResponseInPromise({
                success: false,
                text: "Troppi tentativi",
            });
        }

        chat.command = AuthenticateCommandHandler.command;
        chat.command_state = this.WAITING_FOR_MAIL;
        chat.command_state_ordinal = chat.command_state_ordinal + 1;

        this.updateChatState(chat);

        return this.wrapResponseInPromise({
            success: true,
            text: "Inizio del processo di autenticazione, inviami la tua email",
        });
    }

    protected requestMailConfirmation(
        chat: chat,
        email: string
    ): Promise<Response> {
        if (
            chat.command_state_ordinal >
            this.convStates[this.WAITING_FOR_MAIL_CONFIRMATION].maxTransitions
        ) {
            this.cleanChatState(chat);

            return this.wrapResponseInPromise({
                success: false,
                text: "Troppi tentativi",
            });
        }

        //controllo se esiste un utente con la mail fornita
        return this.prisma.user
            .findUnique({
                where: {
                    email: email,
                },
            })
            .then((user) => {
                if (!user) {
                    //chiedo un altra email
                    chat.command_state = this.WAITING_FOR_MAIL;
                    chat.command_state_ordinal = 1;
                    this.updateChatState(chat);

                    return {
                        success: false,
                        text: "Non ho trovato nessun utente con questa mail, solo gli utenti registrati possono interagire con questo bot.",
                    };
                }

                chat.command_state = this.WAITING_FOR_MAIL_CONFIRMATION;
                chat.extra_info = { emailToConfirm: email };
                this.updateChatState(chat);

                return {
                    success: true,
                    text: `Mi confermi che la tua email è ${email}?`,
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

    protected checkEmailConfirmation(
        req: AuthenticationRequest
    ): Promise<Response> {
        //controllo che la richiesta contenga data
        if (req.data) {
            if (req.data === "1") {
                //ha confermato la mail, mando il token e imposto lo
                //stato della chat in attesa del token
                const extrainfo = JSON.parse(req.chat.extra_info.toString());
                const token = this.sendToken(extrainfo.emailToConfirm);

                extrainfo.token = token;
                req.chat.command_state = this.WAITING_FOR_TOKEN;
                req.chat.command_state_ordinal = 1;
                req.chat.extra_info = extrainfo;
                this.updateChatState(req.chat);

                return this.wrapResponseInPromise({
                    success: true,
                    text: "Ti ho inviato una mail contenente il token per completare l'autenticazione, inviamelo nel prossimo messaggio",
                });
            } else {
                return this.requestMail(req.chat);
            }
        }

        this.cleanChatState(req.chat);

        return this.wrapResponseInPromise({
            success: false,
            text: "Processo di autenticazione interrotto",
        });
    }

    protected checkToken(req: AuthenticationRequest): Promise<Response> {
        const extraInfo = JSON.parse(req.chat.extra_info.toString());
        
        //se il token è corretto lo inserisco nella chat
        if (extraInfo.token && req.text === extraInfo.token) {
            
            //modifica dell'utente, inserimento id chat
            this.prisma.user.update({
                where: {
                    email: extraInfo.emailToConfirm
                },
                data: {
                    chat_id: req.chat.id
                },
            })
            .then(res => {});

            req.chat.token = extraInfo.token;
            req.chat.command = null;
            req.chat.command_state = this.INITIAL_STATE;
            req.chat.command_state_ordinal = 0;
            req.chat.extra_info = {};
            
            this.updateChatState(req.chat);

            return this.wrapResponseInPromise({
                success: true,
                text: "Autenticazione effettuata con successo! Ora puoi utilizzare tutti gli altri comandi."
            });
        }

        //se il token non è valido interrompo il processo di autenticazione
        this.cleanChatState(req.chat);

        return this.wrapResponseInPromise({
            success: false,
            text: "Token non valido",
        });
    }

    protected sendToken(email: string): string {
        const sgMail = MailServiceWrapper.getInstance();
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        const token = this.getToken(32);

        const msg = {
            to: email,
            from: process.env.BOT_MAIL,
            subject: "Test autenticazione",
            templateId: "d-b413ccd0cb05460ebc249e57844de3c8",
            personalizations: [
                {
                    to: [
                        {
                            email: email,
                        },
                    ],
                    dynamic_template_data: {
                        token: token,
                    },
                },
            ],
        };

        sgMail.send(msg);
        return token;
    }

    protected getToken(lenght: number): string {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,><;_-";
        let token = "";
        for (let i = 0; i < lenght; i++) {
            token += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        }
        return token;
    }
}
