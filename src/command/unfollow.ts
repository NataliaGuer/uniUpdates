import { chat } from "@prisma/client";
import { ChatRequest } from "../api/request";
import { Response } from "../api/response";
import { BaseCommandHandler, convState } from "./base";

export class UnfollowCommandHandler extends BaseCommandHandler {
    static command = "/unfollow";
    templatesFolder: string;

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
                res = this.requestCourseId(req.chat);
                break;
            case this.WAITING_FOR_COURSE_ID:
                res = this.removeFollow(req);
                break;
            default:
                break;
        }

        return res;
    }

    protected requestCourseId(chat: chat): Promise<Response> {
        chat.command = UnfollowCommandHandler.command;
        chat.command_state = this.WAITING_FOR_COURSE_ID;
        this.updateChatState(chat);

        return this.wrapResponseInPromise({
            success: true,
            text: "OK! scrivimi l'id del corso che vuoi smettere di seguire",
        });
    }

    protected removeFollow(req: ChatRequest): Promise<Response> {
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
            return {
                success: true,
                text: "Hai smesso di seguire il corso",
            }
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
