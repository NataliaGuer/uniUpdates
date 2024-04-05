import express from "express";
import bodyParser from "body-parser";
import path from "path";
import axios from "axios";
import { connect as ngrokConnect } from "ngrok";
import { config } from "dotenv";
import { Dispatcher } from "./api/dispatcher";
import { Request, Response, NextFunction } from "express";

config({
    path: [
        path.join(__dirname, "..", "config", "env", "bot.env"),
        path.join(__dirname, "..", "config", "env", "app.env"),
    ]
});

//queste costanti devono stare esattamente qua
const { TG_TOKEN, APP_HOST } = process.env;
const APP_PORT = parseInt(process.env.APP_PORT);
const telegram_api = `https://api.telegram.org/bot${TG_TOKEN}`;
const uri = `/webhook/${TG_TOKEN}`;

const app = express();
app.use(bodyParser.json());
app.set("views", path.join(__dirname, "view"));

const init = async () => {
    const host_url = await ngrokConnect({
        addr: `${APP_HOST}:${APP_PORT}`,
        proto: "http",
        inspect: false,
    });
    const webhook_url = host_url + uri;
    
    axios.get(
        `${telegram_api}/setWebhook?url=${webhook_url}`
    ).catch((err) => {console.log("errore get");});

    console.log(host_url);
};

app.post(uri, async (req: Request, res: Response, next: NextFunction) => {

    const dispatcher = new Dispatcher();

    let messageBody;
    let chat;

    if (req.body.hasOwnProperty("message")) {
        messageBody = req.body.message;
        chat = req.body.message.chat;
    } else if (req.body.hasOwnProperty("callback_query")){
        messageBody = req.body.callback_query;
        chat = req.body.callback_query.message.chat;
    } else {
        return res.send();
    }

    dispatcher
        .dispatch({
            chatId: chat.id,
            text: messageBody?.text,
            data: messageBody?.data,
        })
        .then((response) => {
            let message: { [name: string]: any } = {
                chat_id: chat.id,
                text: response.text,
                parse_mode: response.parse_mode
            };

            if (response.options) {
                let keyboardOptions = response.options.map((option) => {
                    return [{
                        text: option.text,
                        callback_data: option.data,
                    }];
                });

                message.reply_markup = JSON.stringify({
                    inline_keyboard: keyboardOptions,
                });
            }

            axios.post(`${telegram_api}/sendMessage`, message, {timeout: 5000})
            .then(() => {
                return res.send();
            })
            .catch((err) => {
                console.log("errore");
            })
        });
});

app.use((_req, res, next) => {
    res.status(404).send("Not found");
});

app.listen(APP_PORT, APP_HOST, async () => {
    init();
});