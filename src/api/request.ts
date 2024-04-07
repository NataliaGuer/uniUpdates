import { chat, user } from "@prisma/client";

export interface Request {
    chatId: number;
    chat?: chat;
    text: string;
    data?: string;
    message_id: number;
}

export interface ChatRequest extends Request {
    chat: chat;
    user?: user;
}

export interface AuthenticationRequest extends ChatRequest {
    email: string;
}
