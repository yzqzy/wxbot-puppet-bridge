import { WechatyBuilder, ScanStatus, Message, log, types } from 'wechaty';
import qrTerm from 'qrcode-terminal';
import { WeChatSdkPuppetBridge_3_9_10_19 as PuppetBridge } from '@src/mod';
import { jsonStringify } from '@src/shared/tools';
import { createDir } from '@src/shared';

async function main() {
  const puppet = new PuppetBridge({
    apiUrl: 'http://127.0.0.1:8888',
    protocol: 'ws'
  });

  const bot = WechatyBuilder.build({
    name: 'wechatsdk-bot',
    puppet
  });

  bot.on('scan', (qrcode, status) => {
    if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
      if (qrcode) {
        log.info('Please scan the QR code to login:', qrcode);
        qrTerm.generate(qrcode as string, { small: true }); // show qrcode on console
      }
      log.info('StarterBot', 'onScan: %s(%s)', ScanStatus[status], status);
      return;
    }

    log.info('StarterBot', 'onScan: %s(%s)', ScanStatus[status], status);
  });

  bot.on('login', user => {
    log.info('Bot use login: ', jsonStringify(user));
  });

  bot.on('ready', () => {
    log.info('Bot is ready');
  });

  const basePath = 'examples/media';

  bot.on('message', async (msg: Message) => {
    log.info('Bot Msg: ', jsonStringify(msg));

    const contact = msg.talker();
    log.info('Bot Msg Contact: ', jsonStringify(contact));

    const room = msg.room();
    log.info('Bot Msg Room Id: ', room?.id);
    try {
      if (!room) return;

      log.info('Bot Msg Room Topic: ', await room.topic());
      log.info('Bot Msg Room Member Count: ', (await room.memberAll()).length);
      log.info('Bot Msg Room Owner: ', room.owner()?.name);
    } catch (error) {
      log.error('Bot Msg Room Error: ', error.message);
    }

    const text = msg.text();
    log.info('Bot Msg Text: ', text);

    if (text === 'ding') {
      await msg.say(`dong ${Date.now()}`);
      log.info('Bot say dong');
    } else if (['ding_room', 'ding_room_@', 'ding_room_@all'].some(t => text.includes(t))) {
      if (!room) return;

      if (text.includes('@all')) {
        await room.say(`@all dong ${Date.now()}`);
      } else if (text.includes('ding_room_@')) {
        const members = await room.memberAll();
        await room.say(`@[mention:${members[0].id}] @[mention:${members[1].id}] dong ${Date.now()}`);
      } else {
        await room.say(`dong ${Date.now()}`);
      }

      log.info('Bot say dong in room');
    }

    let filePath = 'downloads';
    createDir(filePath);

    try {
      const type = msg.type();

      log.info('Bot Msg Type: ', type);

      if (
        [types.Message.Image, types.Message.Video, types.Message.Audio, types.Message.Emoticon].some(t => t === type)
      ) {
        let file;

        if (type === types.Message.Image) {
          file = await msg.toImage().thumbnail();
        } else {
          file = await msg.toFileBox();
        }

        filePath = `${filePath}/${file.name}`;

        try {
          await file.toFile(filePath, true);
          log.info('Bot download file success:', filePath);
        } catch (error) {
          log.error('Bot download file error:', error.message);
        }
      }
    } catch (error) {
      log.error('Bot get file error:', error.message);
    }
  });

  bot.on('logout', user => {
    log.info('Bot user logout: ', jsonStringify(user));
  });

  bot.on('error', error => {
    log.error('Bot error:', error.message);
  });

  await bot.start();
}

main().catch(console.error);
