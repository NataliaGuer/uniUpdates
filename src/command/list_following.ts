import { renderFile } from "ejs";
import { ChatRequest } from "../api/request";
import { Response } from "../api/response";
import { BaseCommandHandler, convState, messageTemplates } from "./base";
import { FollowCommandHandler } from "./follow";
import { UnfollowCommandHandler } from "./unfollow";

export class ListFollowingCommandHandler extends BaseCommandHandler {
    static command = "/listfollowing";

    convStates: convState;
    templatesFolder = "list_following";

    templates: messageTemplates = {
        list: this.getTemplate("list"),
    };

    handle(req: ChatRequest): Promise<Response> {
        return this.prisma.user
            .findUnique({
                where: {
                    chat_id: req.chat.id,
                },
                include: {
                    attendance: {
                        include: {
                            course_attendance_courseTocourse: true,
                        },
                    },
                },
            })
            .then((user) => {
                const courses = user.attendance.map((attendance) => {
                    return {
                        name: attendance.course_attendance_courseTocourse.name,
                        id: attendance.course_attendance_courseTocourse.id,
                    };
                });

                console.log(courses);

                return renderFile(this.templates.list, {
                    courses: courses,
                    follow: FollowCommandHandler.command,
                    unfollow: UnfollowCommandHandler.command
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
