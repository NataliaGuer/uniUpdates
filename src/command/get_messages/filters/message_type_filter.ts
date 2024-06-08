import { ChatRequest } from "../../../api/request";
import { MessageType } from "../../../model/message";
import { PrismaClientWrapper } from "../../../utils/db/prismaWrapper";
import { FilterCaption, MessageFilter, MessageWithFromUser } from "./message_filter";

export class MessageTypeFilter implements MessageFilter {
  static description = "Tipo di messaggio";
  static key = "message_type";

  getFilterCaption(): FilterCaption {
    let options: { text: string; data: string }[] = [];

    for (const [key, value] of Object.entries(MessageType)) {
      options.push({
        text: value.description,
        data: value.id.toString(),
      });
    }

    return {
      text: "Seleziona il tipo di messaggio",
      options: options,
    };
  }

  handleValue(req: ChatRequest, status: number): Promise<MessageWithFromUser[]> {
    const prisma = PrismaClientWrapper.getInstance();

    return prisma.sent_messages.findMany({
      where: {
        type: parseInt(req.data),
        status: status,
      },
      orderBy: {
        sent_date: "desc",
      },
      include: {
        fromUser: true,
      },
    });
  }
}
