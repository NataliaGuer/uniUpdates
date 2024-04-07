export interface Response {
    success: boolean;
    text?: string;
    options?: ResponseOption[];
    parseMode?: string;
    toChat?: number;
    replayToMessage?: number;
}

export interface ResponseOption {
    text: string;
    data: string;
}