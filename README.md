# WxBot Puppet Bridge

基于 [wechaty](https://github.com/wechaty) 协议的微信机器人桥接服务。

已支持的微信机器人协议: 

* [wechatsdk](https://github.com/WeChatAPIs/wechatAPI)

## 一、安装

```bash
npm install wxbot-puppet-bridge
```

## 二、功能列表

| 功能列表                                   | 已支持 | 适配中 |
| ------------------------------------------ | ------ | ------ |
| 基础功能（二维码登录、登录回调、消息监听）、消息体解析 | ✅      | ✅      |
| 发消息（文本、@文本、@all、图片、文件、视频）       | ✅      | ✅      |
| 群事件（加入群聊、退出群聊、修改群名称、群邀请） | ✅     | ✅      |
| 群操作（添加/删除群成员、创建/退出群聊、修改群名称、发布群公告、群邀请确认） | ✅   | ✅      |
| 标签管理（创建标签、删除标签、修改标签名称、列表查询） | ❌    | ✅      |

## 三、如何使用

```typescript
iimport { WechatyBuilder, ScanStatus, Message, log, types } from 'wechaty';
import qrTerm from 'qrcode-terminal';
import { FileBox } from 'file-box';
import { WeChatSdkPuppetBridge_3_9_10_19 as PuppetBridge } from 'wxbot-puppet-bridge';
import { jsonStringify, createDir } from 'wxbot-puppet-bridge/dist/shared';

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
