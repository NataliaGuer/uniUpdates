import { chat } from "@prisma/client";
import { AuthenticationRequest } from "../api/request";
import { Response } from "../api/response";
import { BaseCommandHandler, convState } from "./base";
import { MailServiceWrapper } from "../utils/mail/sendgridWrapper";

/**
 * This class handles the authentication process, the steps are:
 * 1. the user interact with the bot for the fitst time (the chat he/she is using isn't associated to any user)
 *      or selects the /auth command
 * 2. the bot asks for the user's email address
 * 3. the user submits his/her email address
 * 4. the bot checks if there is a match between the provided mail and a user in the DB
 * 5. the bot asks for confirmation
 * 6. the user confirms
 * 7. the bot creates and sends a token
 * 8. the user checks his/her email address and sends the token to the bot
 * 9. the bot checks if there is a match between the provided token and the one it saved during step 7
 * 10. the bot associates the user to the chat
 * now the user is authenticated and authorized, he/she can use the set of commands related to his/her role
 *
 */
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
    },
  };

  handle(req: AuthenticationRequest): Promise<Response> {
    let res: Promise<Response>;
    switch (req.chat.command_state) {
      case this.INITIAL_STATE:
        res = this.requestMail(req.chat);
        break;
      case this.WAITING_FOR_MAIL:
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
    if (chat.command_state_ordinal === this.convStates[this.WAITING_FOR_MAIL].maxTransitions) {
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

  protected requestMailConfirmation(chat: chat, email: string): Promise<Response> {
    if (chat.command_state_ordinal > this.convStates[this.WAITING_FOR_MAIL_CONFIRMATION].maxTransitions) {
      this.cleanChatState(chat);

      return this.wrapResponseInPromise({
        success: false,
        text: "Troppi tentativi",
      });
    }

    //check that the provided mail is associated to a user in the DB
    return this.prisma.user
      .findUnique({
        where: {
          email: email,
        },
      })
      .then((user) => {
        if (!user) {
          this.cleanChatState(chat);

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
              text: "Sì",
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

  protected checkEmailConfirmation(req: AuthenticationRequest): Promise<Response> {
    if (req.data) {
      if (req.data === "1") {
        const extrainfo = JSON.parse(req.chat.extra_info.toString());
        const token = this.sendToken(extrainfo.emailToConfirm);

        //the generated and sent token is saved for future check
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

    //we check the correctness of the submitted token
    if (extraInfo.token && req.text === extraInfo.token) {
      //user update, now we have a link between the user and the chat she/he is using
      //to talk with the bot
      this.prisma.user
        .update({
          where: {
            email: extraInfo.emailToConfirm,
          },
          data: {
            chat_id: req.chat.id,
          },
        })
        .then((res) => {});

      req.chat.token = extraInfo.token;
      req.chat.command = null;
      req.chat.command_state = this.INITIAL_STATE;
      req.chat.command_state_ordinal = 0;
      req.chat.extra_info = {};

      this.updateChatState(req.chat);

      return this.wrapResponseInPromise({
        success: true,
        text: "Autenticazione effettuata con successo! Ora puoi utilizzare tutti gli altri comandi.",
      });
    }

    //if the token isn't valid, the auth process is interrupted
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
