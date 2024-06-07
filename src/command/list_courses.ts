import { ChatRequest } from "../api/request";
import { Response } from "../api/response";
import { BaseCommandHandler, convState, messageTemplates } from "./base";
import { renderFile } from "ejs";
import { CourseInfoCommandHandler } from "./course_info";

export class ListCoursesCommandHandler extends BaseCommandHandler {
  static command = "/listcourses";

  convStates: convState;
  templatesFolder: string = "list_courses";

  templates: messageTemplates = {
    list: this.getTemplate("list"),
  };

  handle(req: ChatRequest): Promise<Response> {
    return this.prisma.course
      .findMany({
        where: {
          end_date: {
            gt: new Date(),
          },
        },
      })
      .then((courses) => {
        return renderFile(this.templates.list, {
          courses: courses,
          moreInfo: CourseInfoCommandHandler.command,
        }).then((html) => {
          return {
            success: true,
            text: html,
            parseMode: "HTML",
          };
        });
      });
  }
}
