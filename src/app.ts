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
  ],
});

//the position of these constants is really important, don't move them
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

  axios.get(`${telegram_api}/setWebhook?url=${webhook_url}`).catch((err) => {
    console.log("errore get");
  });

  console.log(host_url);
};

app.post(uri, async (req: Request, res: Response, next: NextFunction) => {
  const dispatcher = new Dispatcher();

  let messageBody;
  let chat;
  let messageId;

  //this section handles different types of messages: direct messages and responses through options
  //shown by the bot
  if (req.body.hasOwnProperty("message")) {
    messageBody = req.body.message;
    chat = req.body.message.chat;
    messageId = req.body.message.message_id;
  } else if (req.body.hasOwnProperty("callback_query")) {
    messageBody = req.body.callback_query;
    chat = req.body.callback_query.message.chat;
    messageId = req.body.callback_query.message.message_id;
  } else {
    return res.send();
  }

  dispatcher
    .dispatch({
      chatId: chat.id,
      text: messageBody?.text,
      data: messageBody?.data,
      message_id: messageId,
    })
    .then((responses) => {
      /*
            different commands can return both an array and a single response,
            to handle these different type uniformly we create an array when the
            command returns a single response
            */
      if (!(responses instanceof Array)) {
        responses = [responses];
      }

      let promises = [];

      responses.forEach((response) => {
        let responseMessage: { [name: string]: any } = {
          //if response.to_chat has a value we send the message to the specified chat
          chat_id: response.toChat ?? chat.id,
          text: response.text,
          parse_mode: response.parseMode,
        };

        if (response.options) {
          let keyboardOptions = response.options.map((option) => {
            return [
              {
                text: option.text,
                callback_data: option.data,
              },
            ];
          });

          responseMessage.reply_markup = JSON.stringify({
            inline_keyboard: keyboardOptions,
          });
        }

        if (response.replayToMessage) {
          responseMessage.reply_parameters = {
            message_id: response.replayToMessage,
          };
        }

        let responsePromise = axios
          .post(`${telegram_api}/sendMessage`, responseMessage, { timeout: 5000 })
          .catch((err) => {
            console.log(err);
          });

        promises.push(responsePromise);
      });

      Promise.all(promises).then(() => {
        res.send();
      });
    });
});

app.use((_req, res, next) => {
  res.status(404).send("Not found");
});

app.listen(APP_PORT, APP_HOST, async () => {
  init();
});
