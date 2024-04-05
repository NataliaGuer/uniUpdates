"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetCourseInfoCommandHandler = void 0;
const base_1 = require("./base");
class GetCourseInfoCommandHandler extends base_1.BaseCommandHandler {
    constructor() {
        super(...arguments);
        this.command = "/getcourseinfo";
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
            5: "Ven"
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
        chat.command = this.command;
        chat.command_state = this.WAITING_FOR_COURSE_ID;
        chat.command_state_ordinal = 0;
        this.updateChatState(chat);
        return this.wrapResponseInPromise({
            success: true,
            text: "OK! scrivimi l'id del corso di cui vuoi ottenere le informazioni.",
        });
    }
    getCourseInfo(req) {
        this.cleanChatState(req.chat);
        return this.prisma.course.findUnique({
            where: {
                id: parseInt(req.text),
            },
            include: {
                teaching: {
                    include: {
                        user: true
                    }
                },
                lessons: true
            }
        }).then((course) => {
            if (!course) {
                return {
                    success: false,
                    text: "Non ho trovato nessun corso con questo id"
                };
            }
            const formattedLessons = course.lessons.map((lesson) => {
                return `\t\t${this.weekMap[lesson.weekdate]} dalle ${lesson.start_time} alle ${lesson.end_time}, aula ${lesson.room}`;
            }).join("\n");
            const formattedTeachings = course.teaching.map((teacher) => {
                return `\t\t${teacher.user.name}`;
            }).join("\n");
            const courseInfo = [
                `Informazioni sul corso ${course.name}:`,
                `- id: ${course.id}`,
                `- docenti:\n${formattedTeachings}`,
                `- inizio lezioni: ${course.start_date.toLocaleDateString('it-IT')}`,
                `- fine lezioni: ${course.end_date.toLocaleDateString('it-IT')}`,
                `- orari:\n${formattedLessons}`,
            ];
            return {
                success: true,
                text: courseInfo.join("\n")
            };
        });
    }
}
exports.GetCourseInfoCommandHandler = GetCourseInfoCommandHandler;
//# sourceMappingURL=get_course_info.js.map