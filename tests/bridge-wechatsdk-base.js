const { ScanStatus } = require('wechaty-puppet');
const qrTerm = require('qrcode-terminal');

const { log } = require('wechaty-puppet');

const {
  WeChatSdkPuppetBridge_3_9_10_19: PuppetBridge
} = require('wxbot-puppet-bridge');
const { jsonStringify } = require('wxbot-puppet-bridge/dist/shared');

async function main() {
  const puppet = new PuppetBridge({
    apiUrl: 'http://127.0.0.1:8888',
    protocol: 'ws'
  });

  puppet.on('scan', async options => {
    const { status, qrcode } = options;

    if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
      log.info('Please scan the QR code to login:', qrcode);
      qrTerm.generate(qrcode, { small: true }); // show qrcode on console
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
