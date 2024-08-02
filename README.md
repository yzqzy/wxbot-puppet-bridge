# WxBot Puppet Bridge

基于 [wechaty](https://github.com/wechaty) 协议的微信机器人桥接服务。

已支持的微信机器人协议: 

* [wechatsdk](https://github.com/WeChatAPIs/wechatAPI)

## 一、安装

```bash
npm install wxbot-puppet-bridge
```

## 二、功能列表

> 没有你想要的功能，可以提 `issue` 优先处理。

| 功能列表                                   | 已支持 |
| ------------------------------------------ | ------ |
| 基础功能（二维码登录、登录回调、消息监听） | ✅      |
| 消息体解析（文本、图片、视频、表情、文件、小程序卡片等） | ✅ |
| 发消息（文本、@文本、@all、图片、文件、视频）       | ✅      |
| 群事件（加入群聊、退出群聊、修改群名称、群邀请） | ✅     |
| 群操作（创建/退出/解散群聊、修改群名称、添加/删除群成员、发布群公告、群邀请验证） | ✅   |
| 标签管理（标签列表、添加成员标签、移除成员标签、创建标签、删除标签） | ✅   |

**适配中：**

* 发送小程序卡片、位置、链接；
* 转发消息（兼容多种消息格式）；

## 三、如何使用

### 1. bot

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

### 2. hack

非  `wechaty puppet`  功能会以  `puppet[method]`  的方式提供，例如：

```typescript
async function main() {
  const puppet = new PuppetBridge({
    apiUrl: 'http://127.0.0.1:8888',
    protocol: 'ws'
  });
  
  // 1. create tag
  // const tag = await puppet.createTag('test-tag');
  // log.info('Tag created: ', jsonStringify(tag));

  // 2. delete tag
  // await puppet.deleteTag('59');
  // log.info('Tag deleted successfully');

  // 3. get tag members
  // const memberIds = await puppet.getTagMemberList('56');
  // log.info('Tag members: ', jsonStringify(memberIds));

  // 4. get tags of contact
  const tags = await puppet.getTags();
  log.info('Contact tags: ', jsonStringify(tags));
}
```

## 三、参考

* [wechaty-puppet](https://github.com/wechaty/wechaty-puppet)：About
Puppet Provider Abstraction for Wechaty
* [puppet-xp](https://github.com/wechaty/puppet-xp)：Wechaty Puppet WeChat Windows Protocol
* [wechatsdk](https://github.com/WeChatAPIs/wechatAPI): 强大的微信 API 工具
