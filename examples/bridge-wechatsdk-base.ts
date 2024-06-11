import { ScanStatus } from 'wechaty-puppet/types';
import { log } from 'wechaty-puppet';
import qrTerm from 'qrcode-terminal';
import { WeChatSdkPuppetBridge_3_9_10_19 as PuppetBridge } from '@src/mod';
import { jsonStringify } from '@src/shared/tools';

async function main() {
  const puppet = new PuppetBridge({
    apiUrl: 'http://127.0.0.1:8888',
    protocol: 'ws'
  });

  puppet.on('scan', async options => {
    const { status, qrcode } = options;

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

  puppet.on('login', user => {
    log.info('User login: ', jsonStringify(user));
  });

  puppet.on('ready', () => {
    log.info('Puppet is ready');
  });

  puppet.on('message', message => {
    log.info('Message: ', jsonStringify(message));
  });

  puppet.on('logout', user => {
    log.info('User logout: ', jsonStringify(user));
  });

  puppet.on('error', error => {
    log.error('Puppet error:', error.data);
  });

  await puppet.start();
}

main().catch(console.error);
