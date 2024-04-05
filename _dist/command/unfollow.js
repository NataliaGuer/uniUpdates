"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnfollowCommandHandler = void 0;
const base_1 = require("./base");
class UnfollowCommandHandler extends base_1.BaseCommandHandler {
    constructor() {
        super(...arguments);
        this.WAITING_FOR_COURSE_ID = 0;
        this.convStates = {
            [this.WAITING_FOR_COURSE_ID]: {
                maxTransitions: 1,
            },
        };
    }
    handle(req) {
        let res;
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
    requestCourseId(chat) {
        chat.command = UnfollowCommandHandler.command;
        chat.command_state = this.WAITING_FOR_COURSE_ID;
        this.updateChatState(chat);
        return this.wrapResponseInPromise({
            success: true,
            text: "OK! scrivimi l'id del corso che vuoi smettere di seguire",
        });
    }
    removeFollow(req) {
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
            };
        })
            .catch((error) => {
            return {
                success: false,
                text: "Si è verificato un errore, controlla l'id del corso",
            };
        })
            .finally(() => {
            this.cleanChatState(req.chat);
        });
    }
}
exports.UnfollowCommandHandler = UnfollowCommandHandler;
UnfollowCommandHandler.command = "/unfollow";
//# sourceMappingURL=unfollow.js.map