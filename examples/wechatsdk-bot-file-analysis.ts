import { WechatyBuilder, Message, log, types } from 'wechaty';
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
    log.info('Bot userInfo: ', jsonStringify(puppet.userSelf()));
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

  log.info('Bot Msg Type: ', msg.type());

  switch (msg.type()) {
    case types.Message.Image:
      log.info('image', msg.text());

      const messageImage = msg.toImage();

      const thumbImage = await messageImage.thumbnail();
      const thumbImageData = await thumbImage.toBuffer();

      log.info(`thumb image size: ${thumbImageData.length}`);
      log.info(`thumn image name: ${thumbImage.name}`);

      break;

    case types.Message.Emoticon:
      const emotionFile = await msg.toFileBox();

      log.info('emotion file name: ', emotionFile.name);
      log.info('emotion file size: ', emotionFile.size);
      log.info('emotion file type: ', emotionFile.type);

      const emotionJSON = emotionFile.toJSON();
      log.info('emotion file json: ', jsonStringify(emotionJSON));

      const emotionData = await emotionFile.toBuffer();
      log.info(`emotion data size: ${emotionData.length}`);

      break;

    case types.Message.Attachment:
    case types.Message.Video:
    case types.Message.Audio:
      const file = await msg.toFileBox();

      log.info('file name: ', file.name);
      log.info('file size: ', file.size);
      log.info('file type: ', file.type);

      const fileData = await file.toBuffer();
      log.info(`file data size: ${fileData.length}`);
      break;

    case types.Message.MiniProgram:
      const miniProgram = await msg.toMiniProgram();
      log.info('min program', JSON.stringify(miniProgram));
      break;

    case types.Message.Url:
      const urlLink = await msg.toUrlLink();
      log.info('url', JSON.stringify(urlLink));
      break;

    default:
      console.log('not support');
      break;
  }
}
