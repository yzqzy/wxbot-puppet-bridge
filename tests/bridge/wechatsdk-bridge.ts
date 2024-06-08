import { ScanStatus } from 'wechaty-puppet/types';
import { log } from 'wechaty-puppet';
import qrTerm from 'qrcode-terminal';
import { WeChatSdkPuppetBridge_3_9_10_19 as PuppetBridge } from '@src/mod';
import { jsonStringify } from '@src/shared/tools';

async function main() {
  const puppet = new PuppetBridge({
    apiUrl: 'http://192.168.1.12:19088'
  });

  puppet.on('scan', async options => {
    const { status, qrcode } = options;

    if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
      log.info('Please scan the QR code to login:', qrcode);
      qrTerm.generate(qrcode as string, { small: true }); // show qrcode on console
      log.info('StarterBot', 'onScan: %s(%s)', ScanStatus[status], status);
      return;
    }

    log.info('StarterBot', 'onScan: %s(%s)', ScanStatus[status], status);
  });

  puppet.on('login', user => {
    log.info('User login: ', jsonStringify(user));
  });

  puppet.on('logout', user => {
    log.info('User logout: ', jsonStringify(user));
  });

  await puppet.start();
}

main().catch(console.error);
