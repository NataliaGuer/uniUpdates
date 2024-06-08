import { chat } from "@prisma/client";
import { ChatRequest } from "../api/request";
import { Response } from "../api/response";
import { BaseCommandHandler, convState } from "./base";
import { renderFile } from "ejs";
import { UnfollowCommandHandler } from "./unfollow";
import { ListFollowingCommandHandler } from "./list_following";

/**
 * this class is responsible of the management of the /follow command, through which the student
 * can receive notification whenever the professor teaching the specified course sends updates.
 */
export class FollowCommandHandler extends BaseCommandHandler {
  static command = "/follow";
  templatesFolder = "follow";
  templates = {
    follow: this.getTemplate("follow"),
  };

  private WAITING_FOR_COURSE_ID = 0;

  convStates: convState = {
    [this.WAITING_FOR_COURSE_ID]: {
      maxTransitions: 1,
    },
  };

  handle(req: ChatRequest): Promise<Response> {
    let res: Promise<Response>;
    switch (req.chat.command_state) {
      case this.INITIAL_STATE:
        res = this.requestCourseId(req);
        break;
      case this.WAITING_FOR_COURSE_ID:
        res = this.setFollowing(req);
        break;
      default:
        res = this.wrapResponseInPromise({
          success: false,
          text: "Qualcosa è andato storto, riprova",
        });
        break;
    }
    return res;
  }

  protected requestCourseId(req: ChatRequest): Promise<Response> {
    return this.prisma.attendance
      .findMany({
        where: {
          student: req.user.email,
        },
      })
      .then((res) => {
        const alreadyFollowing = res.map((att) => att.course);
        const extraInfo = this.getChatExtraInfo(req.chat);
        extraInfo["alreadyFollowing"] = alreadyFollowing;

        req.chat.extra_info = extraInfo;
        req.chat.command = FollowCommandHandler.command;
        req.chat.command_state = this.WAITING_FOR_COURSE_ID;

        this.updateChatState(req.chat);

        return {
          success: true,
          text: "OK! scrivimi l'id del corso che desideri seguire",
        };
      });
  }

  protected setFollowing(req: ChatRequest): Promise<Response> {
    const courseId = parseInt(req.text);

    if (!courseId) {
      this.cleanChatState(req.chat);

      return this.wrapResponseInPromise({
        success: false,
        text: "Id non valido",
      });
    }

    const extraInfo = this.getChatExtraInfo(req.chat);
    if (extraInfo["alreadyFollowing"].includes(courseId)) {
      this.cleanChatState(req.chat);

      return this.wrapResponseInPromise({
        success: false,
        text: "Stai già seguendo questo corso",
      });
    }

    //we create a record in the attendance table to link the student to the course
    return this.prisma.user
      .update({
        where: {
          chat_id: req.chat.id,
        },
        data: {
          attendance: {
            create: {
              course: courseId,
            },
          },
        },
      })
      .then((user) => {
        return renderFile(this.templates.follow, {
          unfollow: UnfollowCommandHandler.command,
          following: ListFollowingCommandHandler.command,
        }).then((html) => {
          return {
            success: true,
            text: html,
            parseMode: "HTML",
          };
        });
      })
      .catch((error) => {
        return {
          success: false,
          text: "Si è verificato un errore, controlla l'id del corso",
        };
      })
      .finally(() => {
        this.cleanChatState(req.chat);
      });
  }
}
