"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListCoursesCommandHandler = void 0;
const base_1 = require("./base");
const ejs_1 = require("ejs");
const course_info_1 = require("./course_info");
class ListCoursesCommandHandler extends base_1.BaseCommandHandler {
    constructor() {
        super(...arguments);
        this.templatesFolder = "list_courses";
        this.templates = {
            list: this.getTemplate("list"),
        };
    }
    handle(req) {
        return this.prisma.course
            .findMany({
            where: {
                end_date: {
                    gt: new Date(),
                },
            },
        })
            .then((courses) => {
            return (0, ejs_1.renderFile)(this.templates.list, {
                courses: courses,
                moreInfo: course_info_1.CourseInfoCommandHandler.command,
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
exports.ListCoursesCommandHandler = ListCoursesCommandHandler;
ListCoursesCommandHandler.command = "/listcourses";
//# sourceMappingURL=list_courses.js.map