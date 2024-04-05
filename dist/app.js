"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const ngrok_1 = require("ngrok");
const dotenv_1 = require("dotenv");
const dispatcher_1 = require("./api/dispatcher");
(0, dotenv_1.config)({
    path: [
        path_1.default.join(__dirname, "..", "config", "env", "bot.env"),
        path_1.default.join(__dirname, "..", "config", "env", "app.env"),
    ]
});
//queste costanti devono stare esattamente qua
const { TG_TOKEN, APP_HOST } = process.env;
const APP_PORT = parseInt(process.env.APP_PORT);
const telegram_api = `https://api.telegram.org/bot${TG_TOKEN}`;
const uri = `/webhook/${TG_TOKEN}`;
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
app.set("views", path_1.default.join(__dirname, "view"));
const init = () => __awaiter(void 0, void 0, void 0, function* () {
    const host_url = yield (0, ngrok_1.connect)({
        addr: `${APP_HOST}:${APP_PORT}`,
        proto: "http",
        inspect: false,
    });
    const webhook_url = host_url + uri;
    axios_1.default.get(`${telegram_api}/setWebhook?url=${webhook_url}`).catch((err) => { console.log("errore get"); });
    console.log(host_url);
});
app.post(uri, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const dispatcher = new dispatcher_1.Dispatcher();
    let messageBody;
    let chat;
    if (req.body.hasOwnProperty("message")) {
        messageBody = req.body.message;
        chat = req.body.message.chat;
    }
    else if (req.body.hasOwnProperty("callback_query")) {
        messageBody = req.body.callback_query;
        chat = req.body.callback_query.message.chat;
    }
    else {
        return res.send();
    }
    dispatcher
        .dispatch({
        chatId: chat.id,
        text: messageBody === null || messageBody === void 0 ? void 0 : messageBody.text,
        data: messageBody === null || messageBody === void 0 ? void 0 : messageBody.data,
    })
        .then((response) => {
        let message = {
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
        axios_1.default.post(`${telegram_api}/sendMessage`, message, { timeout: 5000 })
            .then(() => {
            return res.send();
        })
            .catch((err) => {
            console.log("errore");
        });
    });
}));
app.use((_req, res, next) => {
    res.status(404).send("Not found");
});
app.listen(APP_PORT, APP_HOST, () => __awaiter(void 0, void 0, void 0, function* () {
    init();
}));
//# sourceMappingURL=app.js.map