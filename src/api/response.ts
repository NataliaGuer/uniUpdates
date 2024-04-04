export interface Response {
    success: boolean;
    text?: string;
    options?: ResponseOption[];
    parse_mode?: string;
}

export interface ResponseOption {
    text: string;
    data: string;
}