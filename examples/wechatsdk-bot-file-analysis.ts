import { WechatyBuilder, ScanStatus, Message, log, types } from 'wechaty';
import qrTerm from 'qrcode-terminal';
import { FileBox } from 'file-box';
import path from 'path';
import { WeChatSdkPuppetBridge_3_9_10_19 as PuppetBridge } from '@src/mod';
import { jsonStringify } from '@src/shared/tools';

async function main() {
  const puppet = new PuppetBridge({
    apiUrl: 'http://127.0.0.1:8888',
    protocol: 'ws'
  });

  const bot = WechatyBuilder.build({ name: 'wechatsdk-bot', puppet });

  bot.on('login', user => {
    log.info('Bot use login: ', jsonStringify(user));
  });

  bot.on('ready', () => {
    log.info('Bot is ready');
  });

  bot.on('message', onMessage);

  bot.on('logout', user => {
    log.info('Bot user logout: ', jsonStringify(user));
  });

  bot.on('error', error => {
    log.error('Bot error:', error.message);
  });

  await bot.start();
}

main()
  .then(() => log.info('StarterBot', 'Ready'))
  .catch(console.error);

// ------------------------------

async function onMessage(msg: Message) {
  log.info('Bot Msg: ', jsonStringify(msg));

  const contact = msg.talker();
  log.info('Bot Msg Contact: ', jsonStringify(contact));

  sendMsgHandler(msg);
}

async function sendMsgHandler(msg: Message) {
  log.info('Bot Msg Type: ', msg.type());

  let file;

  switch (msg.type()) {
    case types.Message.Image:
      file = await msg.toImage().thumbnail();
      console.log(file);
      break;
    case types.Message.Attachment:
    case types.Message.Video:
    case types.Message.Audio:
    case types.Message.Emoticon:
      file = await msg.toFileBox();
      console.log(file);
      break;
    default:
      console.log('not support');
      break;
  }
}
