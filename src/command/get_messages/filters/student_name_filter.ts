import { sent_messages } from "@prisma/client";
import { FilterCaption, MessageFilter } from "./message_filter";
import { PrismaClientWrapper } from "../../../utils/db/prismaWrapper";

export class StudentNameFilter implements MessageFilter{
    static key = "student_name";
    static description = "Nome studente";
    
    getFilterCaption(): FilterCaption {
        return {
            text: "Inserisci il nome dello studente o una sua parte",
        };
    }
    handleValue(value: string): Promise<sent_messages[]> {
        const prisma = PrismaClientWrapper.getInstance();
        return prisma.sent_messages.findMany({
            where: {
                from: {
                    contains: value
                }
            }
        })
    }

}