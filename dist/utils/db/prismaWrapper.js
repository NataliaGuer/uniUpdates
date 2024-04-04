"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaClientWrapper = void 0;
const client_1 = require("@prisma/client");
class PrismaClientWrapper extends client_1.PrismaClient {
    constructor() {
        super();
    }
    static getInstance() {
        if (!PrismaClientWrapper.instance) {
            PrismaClientWrapper.instance = new PrismaClientWrapper();
        }
        return PrismaClientWrapper.instance;
    }
}
exports.PrismaClientWrapper = PrismaClientWrapper;
//# sourceMappingURL=prismaWrapper.js.map