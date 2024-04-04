"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfinfoCommandHandler = void 0;
const base_1 = require("./base");
const ejs_1 = require("ejs");
class ProfinfoCommandHandler extends base_1.BaseCommandHandler {
    constructor() {
        super(...arguments);
        this.templatesFolder = "prof_info";
        this.templates = {
            base: this.getTemplate("base"),
        };
        this.WAITING_FOR_PROF_NAME = 0;
        this.convStates = {
            [this.WAITING_FOR_PROF_NAME]: {
                maxTransitions: 1,
            }
        };
    }
    handle(req) {
        let res;
        switch (req.chat.command_state) {
            case this.INITIAL_STATE:
                res = this.requestProfName(req.chat);
                break;
            case this.WAITING_FOR_PROF_NAME:
                res = this.getProfInfo(req);
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
    requestProfName(chat) {
        chat.command = ProfinfoCommandHandler.command;
        chat.command_state = this.WAITING_FOR_PROF_NAME;
        chat.command_state_ordinal = 0;
        this.updateChatState(chat);
        return this.wrapResponseInPromise({
            success: true,
            text: "Scrivimi il nome del professore",
        });
    }
    getProfInfo(req) {
        this.cleanChatState(req.chat);
        return this.prisma.user.findMany({
            where: {
                name: {
                    contains: req.text
                }
            },
            select: {
                email: true,
                name: true,
                teaching: {
                    include: {
                        course_teaching_courseTocourse: true
                    }
                }
            }
        }).then((users) => {
            if (!users) {
                return {
                    success: false,
                    text: "Non ho trovato nessun professore con questo nome"
                };
            }
            const data = users.map((user) => {
                const courses = user.teaching.map((teacher) => {
                    return {
                        name: teacher.course_teaching_courseTocourse.name,
                        id: teacher.course_teaching_courseTocourse.id
                    };
                });
                return {
                    name: user.name,
                    email: user.email,
                    courses: courses
                };
            });
            return (0, ejs_1.renderFile)(this.templates.base, { profs: data })
                .then((html) => {
                return {
                    success: true,
                    text: html,
                    parse_mode: "HTML"
                };
            });
        });
    }
}
exports.ProfinfoCommandHandler = ProfinfoCommandHandler;
ProfinfoCommandHandler.command = "/profinfo";
//# sourceMappingURL=prof_info.js.map