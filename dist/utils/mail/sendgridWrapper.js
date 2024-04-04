"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailServiceWrapper = void 0;
const mail_1 = require("@sendgrid/mail");
class MailServiceWrapper extends mail_1.MailService {
    constructor() {
        super();
    }
    static getInstance() {
        if (!MailServiceWrapper.instance) {
            MailServiceWrapper.instance = new MailServiceWrapper();
        }
        return MailServiceWrapper.instance;
    }
}
exports.MailServiceWrapper = MailServiceWrapper;
//# sourceMappingURL=sendgridWrapper.js.map