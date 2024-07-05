import { WechatyBuilder, log } from 'wechaty';
import { WeChatSdkPuppetBridge_3_9_10_19 as PuppetBridge } from '@src/mod';
import { jsonStringify } from '@src/shared/tools';

async function main() {
  const puppet = new PuppetBridge({
    apiUrl: 'http://192.168.1.13:8888',
    protocol: 'ws'
  });

  const bot = WechatyBuilder.build({ name: 'wechatsdk-bot', puppet });

  bot.on('login', user => {
    log.info('Bot use login: ', jsonStringify(user));
  });

  bot.on('ready', () => {
    log.info('Bot is ready');
  });

  bot.on('room-join', (room, inviteeList, inviter) => {
    log.info('Bot room join: ', jsonStringify(room));
    log.info('Bot room join inviteeList: ', jsonStringify(inviteeList));
    log.info('Bot room join inviter: ', jsonStringify(inviter));
  });
  bot.on('room-leave', (room, leaverList) => {
    log.info('Bot room leave: ', jsonStringify(room));
    log.info('Bot room leave leaverList: ', jsonStringify(leaverList));
  });
  bot.on('room-topic', (room, newTopic, oldTopic, changer) => {
    log.info('Bot room topic: ', jsonStringify(room));
    log.info('Bot room topic newTopic: ', newTopic);
    log.info('Bot room topic oldTopic: ', oldTopic);
    log.info('Bot room topic changer: ', jsonStringify(changer));
  });
  bot.on('room-invite', roomInvitation => {
    log.info('Bot room invite: ', jsonStringify(roomInvitation));
    try {
      // TODO: handle room invitation
    } catch (error) {
      log.error('Bot room invite error: ', error.message);
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

main()
  .then(() => log.info('StarterBot', 'Ready'))
  .catch(console.error);
