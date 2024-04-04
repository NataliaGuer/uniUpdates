import { PrismaClient } from "@prisma/client";

export class PrismaClientWrapper extends PrismaClient {
    private static instance: PrismaClientWrapper;

    private constructor() {
        super();
    }

    static getInstance(): PrismaClientWrapper {
        if (!PrismaClientWrapper.instance) {
            PrismaClientWrapper.instance = new PrismaClientWrapper();
        }

        return PrismaClientWrapper.instance;
    }
}
