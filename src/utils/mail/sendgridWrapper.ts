import { MailService } from "@sendgrid/mail";

export class MailServiceWrapper extends MailService{
    private static instance: MailServiceWrapper;
    
    private constructor(){
        super();
    }

    static getInstance(): MailServiceWrapper {
        if (!MailServiceWrapper.instance){
            MailServiceWrapper.instance = new MailServiceWrapper();
        }

        return MailServiceWrapper.instance;
    }

}