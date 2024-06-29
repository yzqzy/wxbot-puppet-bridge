import { WechatyBuilder, ScanStatus, Message, log, types } from 'wechaty';
import qrTerm from 'qrcode-terminal';
import { FileBox } from 'file-box';
import path from 'path';
import { WeChatSdkPuppetBridge_3_9_10_19 as PuppetBridge } from '@src/mod';
import { jsonStringify } from '@src/shared/tools';
import { createDirIfNotExist } from '@src/shared';

async function main() {
  const puppet = new PuppetBridge({
    apiUrl: 'http://127.0.0.1:8888',
    protocol: 'ws'
  });

  const bot = WechatyBuilder.build({ name: 'wechatsdk-bot', puppet });

  bot.on('scan', onScan);

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

async function onScan(qrcode: string, status: ScanStatus): Promise<void> {
  if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
    if (qrcode) {
      log.info('Please scan the QR code to login:', qrcode);
      qrTerm.generate(qrcode as string, { small: true }); // show qrcode on console
    }
    log.info('StarterBot', 'onScan: %s(%s)', ScanStatus[status], status);
    return;
  }

  log.info('StarterBot', 'onScan: %s(%s)', ScanStatus[status], status);
}

async function onMessage(msg: Message) {
  log.info('Bot Msg: ', jsonStringify(msg));

  const contact = msg.talker();
  log.info('Bot Msg Contact: ', jsonStringify(contact));

  sendMsgHandler(msg);

  const room = msg.room();
  log.info('Bot Msg Room Id: ', room?.id);

  if (!room) return;

  try {
    log.info('Bot Msg Room Topic: ', await room.topic());
    log.info('Bot Msg Room Member Count: ', (await room.memberAll()).length);
    log.info('Bot Msg Room Owner: ', room.owner()?.name);
  } catch (error) {
    log.error('Bot Msg Room Error: ', error.message);
  }
}

const basePath = path.join(process.cwd(), 'examples/media/');
async function sendMsgHandler(msg: Message) {
  const text = msg.text();
  log.info('Bot Msg Text: ', text);

  if (text === 'ding') {
    await msg.say(`dong ${Date.now()}`);
    log.info('Bot say dong');
  } else if (text === 'jpg') {
    const newpath = 'https://bce.bdstatic.com/doc/IOTSTACK/IoTPlatform/0-0-1_abfce11.png';
    const fileBox = FileBox.fromUrl(newpath);
    await msg.say(fileBox);
    log.info('Bot say jpg');
  } else if (text === 'text') {
    const newpath = basePath + 'test.txt';
    const fileBox = FileBox.fromFile(newpath);
    await msg.say(fileBox);
    log.info('Bot say text');
  } else if (text === 'jpg_local') {
    const newpath = basePath + 'test.jpg';
    const fileBox = FileBox.fromFile(newpath);
    await msg.say(fileBox);
    log.info('Bot say jpg_local');
  } else if (text === 'gif') {
    const newpath = basePath + 'test.gif';
    const fileBox = FileBox.fromFile(newpath);
    await msg.say(fileBox);
    log.info('Bot say gif');
  } else if (text === 'mp4') {
    const newpath = basePath + 'test.mp4';
    const fileBox = FileBox.fromFile(newpath);
    await msg.say(fileBox);
    log.info('Bot say mp4');
  }

  const room = msg.room();
  if (!room) return;

  if (['ding_room', 'ding_room_@', 'ding_room_@all'].some(t => text.includes(t))) {
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
}
