import { sent_messages } from "@prisma/client";
import { FilterCaption, MessageFilter, MessageWithFromUser } from "./message_filter";
import { PrismaClientWrapper } from "../../../utils/db/prismaWrapper";
import { ChatRequest } from "../../../api/request";

export class StudentNameFilter implements MessageFilter{
    static key = "student_name";
    static description = "Nome studente";
    
    getFilterCaption(): FilterCaption {
        return {
            text: "Inserisci il nome dello studente o una sua parte",
        };
    }
    handleValue(req: ChatRequest): Promise<MessageWithFromUser[]> {
        const prisma = PrismaClientWrapper.getInstance();
        return prisma.sent_messages.findMany({
            where: {
                from: {
                    contains: req.text
                }
            },
            orderBy: {
                sent_date: "desc"
            },
            include: {
                fromUser: true
            }
        })
    }

}