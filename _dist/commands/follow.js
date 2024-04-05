"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowCommandHandler = void 0;
const base_1 = require("./base");
class FollowCommandHandler extends base_1.BaseCommandHandler {
    constructor() {
        super(...arguments);
        this.command = "/follow";
        this.WAITING_FOR_COURSE_ID = 0;
        this.convStates = {
            [this.WAITING_FOR_COURSE_ID]: {
                maxTransitions: 1,
            }
        };
    }
    handle(req) {
        let res;
        switch (req.chat.command_state) {
            case this.INITIAL_STATE:
                res = this.requestCourseId(req.chat);
                break;
            case this.WAITING_FOR_COURSE_ID:
                res = this.setFollowing(req);
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
        this.updateChatState(chat);
        return this.wrapResponseInPromise({
            success: true,
            text: "OK! scrivimi l'id del corso che desideri seguire.",
        });
    }
    setFollowing(req) {
        return this.prisma.user.update({
            where: {
                chat_id: req.chat.id
            },
            data: {
                attendance: {
                    create: {
                        course: parseInt(req.text)
                    }
                }
            }
        })
            .then((user) => {
            return {
                success: true,
                text: `Ora riceverai tutti gli aggiornamenti del corso`
            };
        })
            .catch((error) => {
            console.log(error);
            return {
                success: false,
                text: "Qualcosa è andato storto, riprova",
            };
        })
            .finally(() => {
            this.cleanChatState(req.chat);
        });
    }
}
exports.FollowCommandHandler = FollowCommandHandler;
//# sourceMappingURL=follow.js.map