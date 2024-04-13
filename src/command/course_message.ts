import { chat } from "@prisma/client";
import { ChatRequest } from "../api/request";
import { Response } from "../api/response";
import { BaseCommandHandler, convState } from "./base";
import { renderFile } from "ejs";

/**
 * permits to send messages to all the student that are following a specific course
 */
export class CourseMessageCommandHandler extends BaseCommandHandler {
    private WAITING_FOR_COURSE_ID = 1;
    private WAITING_FOR_MESSAGE_BODY = 2;
    private WAITING_FOR_CONFIRM = 3;

    static command = "/coursemessage";

    convStates = {
        [this.WAITING_FOR_COURSE_ID]: {
            maxTransitions: 1,
        },
        [this.WAITING_FOR_MESSAGE_BODY]: {
            maxTransitions: 1,
        },
        [this.WAITING_FOR_CONFIRM]: {
            maxTransitions: 1,
        },
    };

    /**
     * the states of the conversation are:
     * 1. the professor selects the command
     * 2. the bot asks to chose the course from the list of the courses teached by the professor (not finished)
     * 2.1 the professor choses one course
     * 3. the bot asks for the message body
     * 3.1 the professor sends the body
     * 4. the bot asks to confirm the send
     * (n messages are sent, one for each student following the specified course and one to the professor to confirm the sent)
     */

    templatesFolder = "course_message";
    templates = {
        confirm: this.getTemplate("confirm"),
    };

    handle(req: ChatRequest): Promise<Response | Response[]> {
        let res: Promise<Response | Response[]>;
        switch (req.chat.command_state) {
            case this.INITIAL_STATE:
                res = this.requestCourseId(req);
                break;
            case this.WAITING_FOR_COURSE_ID:
                res = this.requestMessageBody(req);
                break;
            case this.WAITING_FOR_MESSAGE_BODY:
                res = this.requestConfirm(req);
                break;
            case this.WAITING_FOR_CONFIRM:
                res = this.getMessages(req);
                break;
        }
        return res;
    }

    protected requestCourseId(req: ChatRequest): Promise<Response> {
        //select all the courses teached by the professor
        req.chat.command = CourseMessageCommandHandler.command;
        req.chat.command_state = this.WAITING_FOR_COURSE_ID;
        req.chat.command_state_ordinal = 0;
        this.updateChatState(req.chat);

        return this.prisma.teaching
            .findMany({
                where: {
                    teacher_id: req.user.email,
                    teaching_course: {
                        end_date: {
                            gt: new Date(),
                        },
                    },
                },
                include: {
                    teaching_course: true,
                },
            })
            .then((courses) => {
                if (!courses) {
                    this.cleanChatState(req.chat);
                    return {
                        success: false,
                        text: "Non ho trovato nessun corso, comando interrotto",
                    };
                }

                return {
                    success: true,
                    text: "Seleziona il corso",
                    options: courses.map((course) => {
                        return {
                            text: course.teaching_course.name,
                            data: course.teaching_course.id.toString(),
                        };
                    }),
                };
            });
    }

    protected requestMessageBody(req: ChatRequest): Promise<Response> {
        const courseId = parseInt(req.data);

        return this.prisma.course.findUnique({
            where: {
                id: courseId,
            }
        })
        .then((course) => {
            let extraInfo = {
                courseId: courseId,
                courseName: course.name,
            };
            
            req.chat.command_state = this.WAITING_FOR_MESSAGE_BODY;
            req.chat.extra_info = extraInfo;
            this.updateChatState(req.chat);
    
            return {
                success: true,
                text: "Inserisci il testo del messaggio",
            };
        })

    }

    protected requestConfirm(req: ChatRequest): Promise<Response> {
        //il testo del messaggio è contenuto il req.text
        let extraInfo = JSON.parse(req.chat.extra_info.toString());
        extraInfo.messageBody = req.text;

        req.chat.command_state = this.WAITING_FOR_CONFIRM;
        req.chat.extra_info = extraInfo;
        this.updateChatState(req.chat);

        return renderFile(
            this.templates.confirm,
            { body: req.text },
            { rmWhitespace: true }
        ).then((html) => {
            return {
                success: true,
                text: html,
                parseMode: "HTML",
                options: [
                    {
                        text: "Si",
                        data: "1",
                    },
                    {
                        text: "No",
                        data: "0",
                    },
                ],
            };
        });
    }

    protected getMessages(req: ChatRequest): Promise<Response|Response[]> {
        const confirm = parseInt(req.data);
        const extraInfo = JSON.parse(req.chat.extra_info.toString());
        if (!confirm) {
            this.cleanChatState(req.chat);
            return this.wrapResponseInPromise({
                success: true,
                text: "Invio del messaggio annullato",
            });
        }

        return this.prisma.attendance
            .findMany({
                where: {
                    course: extraInfo.courseId,
                },
                include: {
                    attendace_student: true,
                },
            })
            .then((attendaces) => {
                if (!attendaces) {
                    this.cleanChatState(req.chat);
                    return {
                        success: true,
                        text: "Non ci sono studenti iscritti a questo corso, comando interrotto",
                    };
                }

                let responses = attendaces.map((attendance) => {
                    let res: Response = {
                        success: true,
                        text: `📙Nuovo messaggio dal corso <b>${extraInfo.courseName}</b>:\n<i>${extraInfo.messageBody}</i>`,
                        parseMode: 'HTML',
                        toChat: parseInt(attendance.attendace_student.chat_id),
                    };
                    return res;
                });

                responses.push({
                    success: true,
                    text: "Messaggio inviato con successo",
                });

                this.cleanChatState(req.chat);
                return responses;
            });
    }
}
