import { WechatyBuilder, log } from 'wechaty';
import { WeChatSdkPuppetBridge_3_9_10_19 as PuppetBridge } from '@src/mod';
import { delaySync, jsonStringify } from '@src/shared/tools';
import { ContactInterface, WechatyInterface } from 'wechaty/impls';

async function addMemberToRoom(bot: WechatyInterface, roomId: string, memberId: string) {
  log.info('addMemberToRoom: ', `roomId: ${roomId}, memberId: ${memberId}`);

  try {
    const room = await bot.Room.find({ id: roomId });
    const contact = await bot.Contact.find({ id: memberId });

    console.log('room:', room);
    console.log('contact:', contact);

    if (!room || !contact) {
      log.info('addMemberToRoom error: room or contact not found');
      return;
    }

    await room.add(contact);

    log.info('addMemberToRoom success');
  } catch (error) {
    log.info('addMemberToRoom error: ', error.message);
  }
}

async function removeMemberFromRoom(bot: WechatyInterface, roomId: string, memberId: string) {
  log.info('removeMemberFromRoom:', `roomId: ${roomId}, memberId: ${memberId}`);

  try {
    const room = await bot.Room.find({ id: roomId });
    const contact = await bot.Contact.find({ id: memberId });

    console.log('room:', room);
    console.log('contact:', contact);

    if (!room || !contact) {
      log.info('removeMemberFromRoom error: room or contact not found');
      return;
    }

    await room.remove(contact);

    log.info('removeMemberFromRoom success');
  } catch (error) {
    log.info('removeMemberFromRoom error: ', error.message);
  }
}

async function modifyRoomTopic(bot: WechatyInterface, roomId: string, topic: string) {
  log.info('modifyRoomTopic: ', `roomId: ${roomId}, topic: ${topic}`);

  try {
    const room = await bot.Room.find({ id: roomId });

    if (!room) {
      log.info('modifyRoomTopic error: room not found');
      return;
    }

    await room.topic(topic);

    log.info('modifyRoomTopic success');
  } catch (error) {
    log.info('modifyRoomTopic error: ', error.message);
  }
}

async function roomAnnouncement(bot: WechatyInterface, roomId: string, text: string) {
  try {
    log.info('roomAnnouncement: ', `roomId: ${roomId}, text: ${text}`);

    const room = await bot.Room.find({ id: roomId });

    if (!room) {
      log.info('roomAnnouncement error: room not found');
      return;
    }

    await room.announce(text);

    log.info('roomAnnouncement success');
  } catch (error) {
    log.info('roomAnnouncement error: ', error.message);
  }
}

async function createRoom(bot: WechatyInterface, members: string[], topic: string) {
  log.info('createRoom:', topic);

  const contacts = await Promise.all(
    members.map(async member => {
      return bot.Contact.find({ id: member });
    })
  );

  try {
    const room = await bot.Room.create(contacts as ContactInterface[], topic);

    log.info('createRoom success: ', `roomId: ${room.id}`);

    return room;
  } catch (error) {
    log.info('createRoom error: ', error.message);
  }
}

async function exitRoom(bot: WechatyInterface, roomId: string) {
  log.info('exitRoom:', roomId);

  try {
    const room = await bot.Room.find({ id: roomId });

    if (!room) {
      log.info('exitRoom error: room not found');
      return;
    }

    await room.quit();

    log.info('exitRoom success');
  } catch (error) {
    log.info('exitRoom error: ', error.message);
  }
}

async function roomOps(bot: WechatyInterface) {
  try {
    const roomId = '44551008263@chatroom';
    // await modifyRoomTopic(bot, roomId, 'wechaty-bot-room-ops');
    // await addMemberToRoom(bot, roomId, 'wxid_xxxx');
    // await removeMemberFromRoom(bot, roomId, 'wxid_xxxx');
    // await roomAnnouncement(bot, roomId, 'public announcement, test 123.');
  } catch (error) {
    log.error('roomOps error: ', error.message);
  }

  try {
    // const contactIds = ['wxid_xxxx', 'wxid_xxxx', 'wxid_xxxx'];
    // const room = await createRoom(bot, contactIds, 'wechaty-puppet-service');
    // if (!room) return;
    // await delaySync(1000 * 3);
    // await room.say('wechaty-puppet-service room created');
    // await delaySync(1000 * 3);
    // await exitRoom(bot, room.id);
  } catch (error) {
    log.error('error: ', error.message);
  }
}

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

    roomOps(bot);
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
