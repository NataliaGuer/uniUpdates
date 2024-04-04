"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseInfoCommandHandler = void 0;
const base_1 = require("./base");
const ejs_1 = require("ejs");
class CourseInfoCommandHandler extends base_1.BaseCommandHandler {
    constructor() {
        super(...arguments);
        this.templatesFolder = "get_course_info";
        this.templates = {
            course_info: this.getTemplate("courseInfo"),
        };
        this.WAITING_FOR_COURSE_ID = 0;
        this.convStates = {
            [this.WAITING_FOR_COURSE_ID]: {
                maxTransitions: 1,
            },
        };
        this.weekMap = {
            1: "Lun",
            2: "Mar",
            3: "Mer",
            4: "Gio",
            5: "Ven",
        };
    }
    handle(req) {
        let res;
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
    requestCourseId(chat) {
        chat.command = CourseInfoCommandHandler.command;
        chat.command_state = this.WAITING_FOR_COURSE_ID;
        chat.command_state_ordinal = 0;
        this.updateChatState(chat);
        return this.wrapResponseInPromise({
            success: true,
            text: "Scrivimi l'ID del corso",
        });
    }
    getCourseInfo(req) {
        this.cleanChatState(req.chat);
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
            };
            return (0, ejs_1.renderFile)(this.templates.course_info, info).then((html) => {
                return {
                    success: true,
                    text: html,
                    parse_mode: "HTML",
                };
            });
        });
    }
}
exports.CourseInfoCommandHandler = CourseInfoCommandHandler;
CourseInfoCommandHandler.command = "/courseinfo";
//# sourceMappingURL=get_course_info.js.map