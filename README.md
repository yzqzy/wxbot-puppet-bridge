# WxBot Puppet Bridge

基于 [wechaty](https://github.com/wechaty) 协议的微信机器人桥接服务。

已支持的微信机器人协议: 

* [wechatsdk](https://github.com/WeChatAPIs/wechatAPI)

## 一、安装

```bash
npm install wxbot-puppet-bridge
```

## 二、功能列表

| 列表                                       | 已支持 | 适配中 |
| ------------------------------------------ | ------ | ------ |
| 收发消息、消息体解析                       | ✅      | ✅      |
| 发消息（文本、@文本、@all）                | ✅      | ✅      |
| 发消息（图片、文件、视频）                 | ❌      | ✅      |
| 群操作（邀请入群、同意入群、入群消息提醒） | ❌      | ✅      |
| 标签管理（创建标签、删除标签、列表查询）   | ❌      | ✅      |

## 三、如何使用

```typescript
iimport { WechatyBuilder, ScanStatus, Message, log, types } from 'wechaty';
import qrTerm from 'qrcode-terminal';
import { FileBox } from 'file-box';
import { WeChatSdkPuppetBridge_3_9_10_19 as PuppetBridge } from '@src/mod';
import { jsonStringify } from '@src/shared/tools';
import { createDir } from '@src/shared';

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
```

### 三、参考

* [wechaty-puppet](https://github.com/wechaty/wechaty-puppet)：About
Puppet Provider Abstraction for Wechaty
* [puppet-xp](https://github.com/wechaty/puppet-xp)：Wechaty Puppet WeChat Windows Protocol
* [wechatsdk](https://github.com/WeChatAPIs/wechatAPI): 强大的微信 API 工具
