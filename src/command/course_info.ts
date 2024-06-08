import { chat } from "@prisma/client";
import { ChatRequest } from "../api/request";
import { Response } from "../api/response";
import { BaseCommandHandler } from "./base";
import { renderFile } from "ejs";
import { FollowCommandHandler } from "./follow";

/**
 * This class handles the request of informations about a specific course (given its id)
 */
export class CourseInfoCommandHandler extends BaseCommandHandler {
  static command = "/courseinfo";
  templatesFolder = "course_info";

  templates = {
    course_info: this.getTemplate("courseInfo"),
  };

  private WAITING_FOR_COURSE_ID = 0;

  convStates = {
    [this.WAITING_FOR_COURSE_ID]: {
      maxTransitions: 1,
    },
  };

  private weekMap = {
    1: "Lun",
    2: "Mar",
    3: "Mer",
    4: "Gio",
    5: "Ven",
  };

  handle(req: ChatRequest): Promise<Response> {
    let res: Promise<Response>;
    switch (req.chat.command_state) {
      case this.INITIAL_STATE:
        res = this.requestCourseId(req.chat);
        break;
      case this.WAITING_FOR_COURSE_ID:
        res = this.getCourseInfo(req);
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

  protected requestCourseId(chat: chat): Promise<Response> {
    chat.command = CourseInfoCommandHandler.command;
    chat.command_state = this.WAITING_FOR_COURSE_ID;
    chat.command_state_ordinal = 0;
    this.updateChatState(chat);

    return this.wrapResponseInPromise({
      success: true,
      text: "Scrivimi l'ID del corso",
    });
  }

  protected getCourseInfo(req: ChatRequest): Promise<Response> {
    const courseId = parseInt(req.text);

    if (!courseId) {
      return this.wrapResponseInPromise({
        success: false,
        text: "Id non valido",
      });
    }

    return this.prisma.course
      .findUnique({
        where: {
          id: parseInt(req.text),
        },
        include: {
          teaching: {
            include: {
              user: true,
            },
          },
          lessons: true,
        },
      })
      .then((course) => {
        if (!course) {
          return {
            success: false,
            text: "Non ho trovato nessun corso con questo id",
          };
        }

        const info = {
          course: {
            name: course.name,
            id: course.id,
          },
          teachers: course.teaching.map((teacher) => {
            return {
              name: teacher.user.name,
            };
          }),
          start: course.start_date.toLocaleDateString("it-IT"),
          end: course.end_date.toLocaleDateString("it-IT"),
          lessons: course.lessons.map((lesson) => {
            return {
              day: this.weekMap[lesson.weekdate],
              start: lesson.start_time,
              end: lesson.end_time,
              room: lesson.room,
            };
          }),
          follow: FollowCommandHandler.command,
        };

        return renderFile(this.templates.course_info, info).then((html) => {
          return {
            success: true,
            text: html,
            parseMode: "HTML",
          };
        });
      })
      .finally(() => {
        this.cleanChatState(req.chat);
      });
  }
}
