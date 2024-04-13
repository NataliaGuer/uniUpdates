import { chat } from "@prisma/client";
import { ChatRequest } from "../api/request";
import { Response } from "../api/response";
import { BaseCommandHandler, convState, messageTemplates } from "./base";
import { renderFile } from "ejs";

export class ProfinfoCommandHandler extends BaseCommandHandler {
    
    static command = "/profinfo";

    templatesFolder = "prof_info";
    templates: messageTemplates = {
        base: this.getTemplate("base"),
    };

    WAITING_FOR_PROF_NAME = 0;

    convStates: convState = {
        [this.WAITING_FOR_PROF_NAME]: {
            maxTransitions: 1,
        }
    }

    handle(req: ChatRequest): Promise<Response> {
        let res: Promise<Response>;

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

    protected requestProfName(chat: chat): Promise<Response> {
        chat.command = ProfinfoCommandHandler.command;
        chat.command_state = this.WAITING_FOR_PROF_NAME;
        chat.command_state_ordinal = 0;
        this.updateChatState(chat);

        return this.wrapResponseInPromise({
            success: true,
            text: "Scrivimi il nome del professore",
        });
    }

    protected getProfInfo(req: ChatRequest): Promise<Response> {
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
                        teaching_course: true
                    }
                }
            }
        }).then((users) => {
            if (!users) {
                return {
                    success: false,
                    text: "Non ho trovato nessun professore con questo nome"
                }
            }

            const data = users.map((user) => {
                const courses = user.teaching.map((teacher) => {
                    return {
                        name: teacher.teaching_course.name,
                        id: teacher.teaching_course.id
                    }
                })

                return {
                    name: user.name,
                    email: user.email,
                    courses: courses
                }
            })

            return renderFile(this.templates.base, {profs: data})
            .then((html) => {
                return {
                    success: true,
                    text: html,
                    parseMode: "HTML"
                }
            })
        })
    }

}
