import { WechatyBuilder, ScanStatus, log } from 'wechaty';
import qrTerm from 'qrcode-terminal';
import { WeChatSdkPuppetBridge_3_9_10_19 as PuppetBridge } from '@src/mod';
import { jsonStringify } from '@src/shared/tools';

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

  bot.on('message', message => {
    log.info('Bot Message: ', jsonStringify(message));
    log.info('Bot Message Talker: ', message.talker());
    log.info('Bot Message Self: ', message.self());
    log.info('Bot Message Type: ', message.type());
    log.info('Bot Message Room: ', message.room());
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
