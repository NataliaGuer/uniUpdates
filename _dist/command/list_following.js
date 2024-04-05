"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListFollowingCommandHandler = void 0;
const ejs_1 = require("ejs");
const base_1 = require("./base");
const follow_1 = require("./follow");
const unfollow_1 = require("./unfollow");
class ListFollowingCommandHandler extends base_1.BaseCommandHandler {
    constructor() {
        super(...arguments);
        this.templatesFolder = "list_following";
        this.templates = {
            list: this.getTemplate("list"),
        };
    }
    handle(req) {
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
            return (0, ejs_1.renderFile)(this.templates.list, {
                courses: courses,
                follow: follow_1.FollowCommandHandler.command,
                unfollow: unfollow_1.UnfollowCommandHandler.command
            }).then((html) => {
                return {
                    success: true,
                    text: html,
                    parse_mode: "HTML",
                };
            });
        });
    }
}
exports.ListFollowingCommandHandler = ListFollowingCommandHandler;
ListFollowingCommandHandler.command = "/listfollowing";
//# sourceMappingURL=list_following.js.map