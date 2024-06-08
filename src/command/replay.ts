import { chat, sent_messages, user } from "@prisma/client";
import { ChatRequest } from "../api/request";
import { Response } from "../api/response";
import { BaseCommandHandler, convState } from "./base";
import { renderFile } from "ejs";

/**
 * this class handles the replay to a student procedure
 * the professor that received a message from a student can use this command to send a replay
 * 
 * the flow for this command is
    1.the user selects the /replay command
    1.1 the bot asks for the message id
    1.2 the user sends the message id
    (at this point a check on the message id is performed,
    if there isn't a message with the specified id we go back to step 1.1
    with an alert message warning the user that the message does not exists 
    )
    2. the bot asks for the replay text
    2.1 the user sends the replay text
    3. the bot asks to confirm
    3.1 the user confirms the replay

    if the user doesn't confirm the replay the message, the command is cancelled
 */
export class ReplayCommandHandler extends BaseCommandHandler {
  private WAITING_FOR_MESSAGE_ID = 1;
  private WAITING_FOR_MESSAGE_TEXT = 2;
  private WAITING_FOR_MESSAGE_CONFIRM = 3;

  static command = "/replay";

  convStates: convState = {
    [this.WAITING_FOR_MESSAGE_ID]: {
      maxTransitions: 3,
    },
    [this.WAITING_FOR_MESSAGE_TEXT]: {
      maxTransitions: 1,
    },
    [this.WAITING_FOR_MESSAGE_CONFIRM]: {
      maxTransitions: 1,
    },
  };

  templatesFolder = "replay";

  templates = {
    toStudent: this.getTemplate("to_student"),
  };

  handle(req: ChatRequest): Promise<Response | Response[]> {
    let res: Promise<Response | Response[]>;
    switch (req.chat.command_state) {
      case this.INITIAL_STATE:
        res = this.requestMessageId(req.chat);
        break;
      case this.WAITING_FOR_MESSAGE_ID:
        res = this.requestMessageText(req);
        break;
      case this.WAITING_FOR_MESSAGE_TEXT:
        res = this.requestMessageConfirm(req);
        break;
      case this.WAITING_FOR_MESSAGE_CONFIRM:
        res = this.replayMessage(req);
        break;
      default:
        res = this.wrapResponseInPromise({
          success: false,
          text: "Il comando non è valido",
        });
        break;
    }

    return res;
  }

  protected requestMessageId(chat: chat): Promise<Response> {
    chat.command = ReplayCommandHandler.command;
    chat.command_state = this.WAITING_FOR_MESSAGE_ID;
    chat.command_state_ordinal++;

    this.updateChatState(chat);

    return this.wrapResponseInPromise({
      success: true,
      text: "Inserisci l'ID del messaggio",
    });
  }

  protected requestMessageText(req: ChatRequest): Promise<Response> {
    const messageId = parseInt(req.text);
    if (!messageId) {
      this.cleanChatState(req.chat);
      return this.wrapResponseInPromise({
        success: false,
        text: "Id non valido, comando interrotto",
      });
    }

    return this.prisma.sent_messages
      .findUnique({
        where: {
          id: messageId,
        },
        include: {
          fromUser: true,
        },
      })
      .then((message) => {
        if (!message) {
          return this.handleMessageNotFound(req.chat);
        }

        return this.handleMessageFound(req.chat, message);
      });
  }

  protected handleMessageNotFound(chat: chat): Response {
    if (chat.command_state_ordinal === this.convStates[this.WAITING_FOR_MESSAGE_ID].maxTransitions) {
      this.cleanChatState(chat);
      return {
        success: false,
        text: "Troppi tentativi, comando interrotto.",
      };
    }

    chat.command_state_ordinal++;
    this.updateChatState(chat);

    return {
      success: true,
      text: "Nessun messaggio trovato con questo id, riprova",
    };
  }

  protected handleMessageFound(chat: chat, message: { fromUser: user } & sent_messages): Response {
    //we insert message.id in the chat extra info for later use

    if (!message.fromUser.chat_id) {
      return {
        success: false,
        text: "Non è stato possibile trovare la chat con questo utente",
      };
    }

    chat.extra_info = {
      message_id: message.id,
    };

    chat.command_state = this.WAITING_FOR_MESSAGE_TEXT;
    chat.command_state_ordinal = 0;

    this.updateChatState(chat);

    return {
      success: true,
      text: "Inserisci il testo del messaggio",
    };
  }

  protected requestMessageConfirm(req: ChatRequest): Promise<Response> {
    const extrainfo = this.getChatExtraInfo(req.chat);
    extrainfo["replay_body"] = req.text;

    req.chat.command_state = this.WAITING_FOR_MESSAGE_CONFIRM;
    req.chat.command_state_ordinal = 0;
    req.chat.extra_info = extrainfo;

    this.updateChatState(req.chat);

    return this.wrapResponseInPromise({
      success: true,
      text: "Confermi di voler inviare il messaggio?",
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
    });
  }

  protected replayMessage(req: ChatRequest): Promise<Response | Response[]> {
    //req.data is "1" or "0"
    const extraInfo = this.getChatExtraInfo(req.chat);

    if (req.data) {
      if (req.data === "0") {
        this.cleanChatState(req.chat);
        return this.wrapResponseInPromise({
          success: true,
          text: "Invio del messaggio annullato",
        });
      }

      //message data retrieval
      return this.prisma.sent_messages
        .findUnique({
          where: {
            id: parseInt(extraInfo["message_id"]),
          },
          include: {
            fromUser: true,
          },
        })
        .then((message) => {
          if (!message.fromUser.chat_id) {
            return {
              success: false,
              text: "Non è stato possibile trovare la chat con lo studente.",
            };
          }

          return renderFile(this.templates.toStudent, {
            from: req.user.name,
            replay_body: extraInfo["replay_body"],
          }).then((html) => {
            let toStudent: Response = {
              success: true,
              text: html,
              parseMode: "HTML",
              toChat: parseInt(message.fromUser.chat_id),
              replayToMessage: message.message_id,
            };

            let toProf: Response = {
              success: true,
              text: "Messaggio inviato con successo",
            };
            return [toStudent, toProf];
          });
        });
    }

    return this.wrapResponseInPromise({
      success: true,
      text: "Comando interrotto",
    });
  }
}
