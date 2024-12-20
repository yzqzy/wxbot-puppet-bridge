import path from 'path';
import { WechatyBuilder, log } from 'wechaty';
import { FileBox } from 'file-box';
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

    try {
      const basePath = path.join(process.cwd(), 'examples/media/');
      const contact = await bot.Contact.find('filehelper');

      log.info('Contact: ', jsonStringify(contact));

      // 1. send text to contact
      // await contact?.say('Hello, Wechaty!');

      // 2. send file to contact
      // const fileBox = FileBox.fromFile(path.join(basePath, 'test.jpg'));
      // await contact?.say(fileBox);

      // 3. send url link to contact
      // const urlLink = new bot.UrlLink({
      //   title: 'Wechaty',
      //   url: 'https://github.com/wechaty/wechaty',
      //   thumbnailUrl: 'https://avatars1.githubusercontent.com/u/25162437?s=200&v=4',
      //   description:
      //     'Wechaty is a Conversational AI Chatbot SDK for Individual Account, Group Chat, and Multi-Person Chat.'
      // });
      // await contact?.say(urlLink);

      // 4. send mini program to contact
      //
      const miniProgram = new bot.MiniProgram({
        title: '微信读书',
        username: 'gh_d8581e7a45ed@app',
        appid: 'wx8a5d6f9fad07544e',
        description: '微信读书提供海量正版书籍、小说、漫画、公众号、听书，多设备同步实现跨屏阅读。',
        pagePath: '',
        iconUrl: '',
        thumbUrl: ''
      });
      await contact?.say(miniProgram);
    } catch (error) {
      log.error('Bot say error:', error.message);
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
