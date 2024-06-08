import { chat } from "@prisma/client";
import { ChatRequest } from "../api/request";
import { Response } from "../api/response";
import { MessageStatus, MessageType } from "../model/message";
import { BaseCommandHandler, convState, messageTemplates } from "./base";
import { renderFile } from "ejs";
import { UserRole } from "../model/user";

/**
 * the class manages the sendind of a message from a student to a professor
 * 
    the flow works as follows:
    1. the user uses the /toprof command to send a message
    2. the bot asks for the professor’s email after checking the number of attempts
            check that the professor exists
            if it exists it continues
            if it does not exist you go back to step 2 and increase the number of attempts
    3. the bot asks for the type of message the user wants to send
        (send answer with multiple choice)
    4. the bot asks for the message the user wants to send
    5. the bot asks for confirmation of all the operation: you confirm me that you want to send the message "..." to the
    Professor "..." with the motivation "..."?
    6. if the user confirms the message is saved otherwise the flow is interrupted and the command is deleted
 */
export class ToProfCommandHandler extends BaseCommandHandler {
  static command = "/toprof";

  WAITING_FOR_PROF_MAIL = 0;
  WAITING_FOR_MESSAGE_TYPE = 1;
  WAITING_FOR_MESSAGE = 2;
  WAITING_FOR_CONFIRMATION = 3;

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
        sets the chat status to WAITING_FOR_PROF_MAIL
        checks the number of attempts before requesting the professor's email
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
        checks the existence of a prof with the specified email address
        sets the state of the conversation to WAITING_FOR_MESSAGE_TYPE
        returns a response with the options for the message type
        */
    return this.prisma.user
      .findUnique({
        where: {
          email: req.text,
          role: UserRole.professor,
        },
      })
      .then((user) => {
        if (!user) {
          return this.handleProfNotFound(req.chat);
        }
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

    let extraInfo = this.getChatExtraInfo(chat);
    extraInfo["to"] = profMail;
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
        sets the conversation status to WAITING_FOR_MESSAGE
        handles the response, containing the desired type of message
        saves the type of message in the extra data
        requests the text of the message to be sent
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

    let extraInfo = this.getChatExtraInfo(req.chat);
    extraInfo["type"] = parseInt(req.data);
    req.chat.extra_info = extraInfo;
    this.updateChatState(req.chat);

    return this.wrapResponseInPromise({
      success: true,
      text: "Scrivimi il messaggio da inviare",
    });
  }

  protected requestConfirmation(req: ChatRequest): Promise<Response> {
    /*
        sets the conversation status to WAITING_FOR_CONFIRMATION
        saves the text of the message to be sent
        returns a response with the options for the confirmation
        */
    req.chat.command_state = this.WAITING_FOR_CONFIRMATION;
    req.chat.command_state_ordinal = 1;

    let extraInfo = this.getChatExtraInfo(req.chat);
    extraInfo["messageText"] = req.text;
    //we save the id of the message to which the professor will replay
    extraInfo["messageId"] = req.message_id;

    req.chat.extra_info = extraInfo;
    this.updateChatState(req.chat);

    return renderFile(this.templates.confirm, {
      message: req.text,
      profMail: extraInfo["to"],
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
        handles the confirmation of the message sending
        creates a new record in the message table
        returns a confirmation message
        */
    const res = parseInt(req.data);
    if (res === 1) {
      let extraInfo = this.getChatExtraInfo(req.chat);
      return this.prisma.sent_messages
        .create({
          data: {
            from: req.user.email,
            to: extraInfo["to"],
            type: extraInfo["type"],
            text: extraInfo["messageText"],
            status: MessageStatus.sent,
            message_id: extraInfo["messageId"],
          },
        })
        .then((message) => {
          this.cleanChatState(req.chat);
          return this.wrapResponseInPromise({
            success: true,
            text: "Messaggio inviato",
          });
        });
    }

    this.cleanChatState(req.chat);
    return this.wrapResponseInPromise({
      success: true,
      text: "Messaggio eliminato",
    });
  }
}
