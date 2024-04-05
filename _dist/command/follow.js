"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowCommandHandler = void 0;
const base_1 = require("./base");
const ejs_1 = require("ejs");
const unfollow_1 = require("./unfollow");
class FollowCommandHandler extends base_1.BaseCommandHandler {
    constructor() {
        super(...arguments);
        this.templatesFolder = "follow";
        this.templates = {
            follow: this.getTemplate("follow"),
        };
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
        chat.command = FollowCommandHandler.command;
        chat.command_state = this.WAITING_FOR_COURSE_ID;
        this.updateChatState(chat);
        return this.wrapResponseInPromise({
            success: true,
            text: "OK! scrivimi l'id del corso che desideri seguire",
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
            return (0, ejs_1.renderFile)(this.templates.follow, { unfollow: unfollow_1.UnfollowCommandHandler.command })
                .then((html) => {
                return {
                    success: true,
                    text: html,
                    parse_mode: "HTML"
                };
            });
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
exports.FollowCommandHandler = FollowCommandHandler;
FollowCommandHandler.command = "/follow";
//# sourceMappingURL=follow.js.map