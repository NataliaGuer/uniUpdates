declare namespace NodeJS {
    interface ProcessEnv {
        APP_HOST: string;
        SENDGRID_API_KEY: string;
        APP_PORT: string;
        TG_TOKEN: string;
        JWT_SECRET: string;
        BOT_MAIL: string;
    }
}