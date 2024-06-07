import { chat } from "@prisma/client";
import { ChatRequest } from "../api/request";
import { Response } from "../api/response";
import { BaseCommandHandler, convState } from "./base";
import { renderFile } from "ejs";
import { ListFollowingCommandHandler } from "./list_following";

export class UnfollowCommandHandler extends BaseCommandHandler {
    static command = "/unfollow";
    templatesFolder = "unfollow";
    templates = {
        unfollow: this.getTemplate("unfollow"),
    };

    private WAITING_FOR_COURSE_ID = 0;

    convStates: convState = {
        [this.WAITING_FOR_COURSE_ID]: {
            maxTransitions: 1,
        },
    };

    handle(req: ChatRequest): Promise<Response> {
        let res: Promise<Response>;
        switch (req.chat.command_state) {
            case this.INITIAL_STATE:
                res = this.requestCourseId(req);
                break;
            case this.WAITING_FOR_COURSE_ID:
                res = this.removeFollow(req);
                break;
            default:
                break;
        }

        return res;
    }

    protected requestCourseId(req: ChatRequest): Promise<Response> {
        this.prisma.attendance.findMany({
            where: {
                student: req.user.email
            },
        })
        .then((res) => {
            if (res) {
                let coursesId = res.map((att) => att.course);
                let extraInfo = this.parseChatExtraInfo(req.chat);
                extraInfo.selectable = coursesId;
                req.chat.extra_info = extraInfo;
            }
            req.chat.command = UnfollowCommandHandler.command;
            req.chat.command_state = this.WAITING_FOR_COURSE_ID;
    
            this.updateChatState(req.chat);
        })

        return this.wrapResponseInPromise({
            success: true,
            text: "OK! scrivimi l'id del corso che vuoi smettere di seguire",
        });
    }

    protected removeFollow(req: ChatRequest): Promise<Response> {

        const selectedCourse = parseInt(req.text);
        const extraInfo = this.parseChatExtraInfo(req.chat);

        if (!extraInfo.selectable.includes(selectedCourse)) {
            return this.wrapResponseInPromise({
                success: false,
                text: "Sembra che tu non stia seguendo il corso selezionato, prova a controllare l'id.",
            });
        }
        
        return this.prisma.user.update({
            where: {
                chat_id: req.chat.id
            },
            data: {
                attendance: {
                    deleteMany: {
                        course: parseInt(req.text)
                    }
                }
            }
        })
        .then((user) => {
            return renderFile(
                this.templates.unfollow, 
                {
                    following: ListFollowingCommandHandler.command
                }
            )
            .then((html) => {
                return {
                    success: true,
                    text: html,
                    parseMode: "HTML"
                }
            })
        })
        .catch((error) => {
            return {
                success: false,
                text: "Si è verificato un errore, controlla l'id del corso",
            }
        })
        .finally(() => {
            this.cleanChatState(req.chat);
        })
    }
}
