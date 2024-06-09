# WxBot Puppet Bridge

基于 [wechaty](https://github.com/wechaty) 协议的微信机器人桥接服务。

已支持版本: 

* [wechatsdk-3.9.10.19](https://github.com/WeChatAPIs/wechatAPI)

## 一、安装

```bash
npm install wxbot-puppet-bridge
```

## 二、基础用法

```typescript
import { ScanStatus } from 'wechaty-puppet/types';
import { log } from 'wechaty-puppet';
import qrTerm from 'qrcode-terminal';
import { WeChatSdkPuppetBridge_3_9_10_19 as PuppetBridge } from 'wxbot-puppet-bridge';
import { jsonStringify } from 'wxbot-puppet-bridge/dist/shared';

async function main() {
  const puppet = new PuppetBridge({
    // wx robot api url
    apiUrl: 'http://127.0.0.1:8888',
    // recv msg protocol, http or ws, default http
    protocol: 'ws' 
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
```

### 三、参考

* [wechaty-puppet](https://github.com/wechaty/wechaty-puppet)：About
Puppet Provider Abstraction for Wechaty
* [puppet-xp](https://github.com/wechaty/puppet-xp)：Wechaty Puppet WeChat Windows Protocol
* [wechatsdk](https://github.com/WeChatAPIs/wechatAPI): 强大的微信 API 工具
