import { WechatyBuilder, log } from 'wechaty';
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

  bot.on('ready', async () => {
    log.info('Bot is ready');

    // normal ------------------------------

    // 1. get bot tags
    // const tags = await bot.Contact.tags();
    // log.info('Bot tags: ', jsonStringify(tags));

    // 2. get contact tags
    // const contact = await bot.Contact.find({
    //   id: 'wxid_xxx'
    // });
    // const contactTags = await contact?.tags();
    // console.log(contactTags);

    // 3. add contact to tag
    // const tag = await bot.Tag.get('43');
    // const contact = await bot.Contact.find({
    //   id: 'wxid_xxx'
    // });
    // if (contact) {
    //   await tag.add(contact);
    // }

    // 4.remove contact from tag
    // const tag = await bot.Tag.get('48');
    // const contact = await bot.Contact.find({
    //   id: 'wxid_xxx'
    // });
    // if (contact) {
    //   await tag.remove(contact);
    // }

    // hack ---------------------------------

    // 5. create tag
    // const tag = await puppet.createTag('test-tag');
    // log.info('Tag created: ', jsonStringify(tag));

    // 6. delete tag
    // await puppet.deleteTag('59');
    // log.info('Tag deleted successfully');

    // 7. get tag members
    // const memberIds = await puppet.getTagMemberList('56');
    // log.info('Tag members: ', jsonStringify(memberIds));

    // 8. get tags of contact
    const tags = await puppet.getTags();
    log.info('Contact tags: ', jsonStringify(tags));
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
