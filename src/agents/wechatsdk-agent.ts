import { EventEmitter } from 'events';
import express from 'express';
import { WebSocketServer } from 'ws';
import { parse as parseJson } from 'lossless-json';
import { log } from 'wechaty-puppet';

import EnvVars from '@src/config/EnvVars';
import { decodeQRCode } from '@src/shared/qrcode';

import type { LocationParams, RecvMsg, Result } from './wechatsdk-types';
import WeChatSdkApi from './wechatsdk-api';
import { isJsonString } from '@src/shared';
import { killPort } from '@src/shared/port';

export type BridgeProtocol = 'ws' | 'http';

interface WeChatSdkOptions {
  protocol?: BridgeProtocol;
  apiUrl: string;
}

class Bridge extends EventEmitter {
  private port!: number;
  private host!: string;

  private wechatsdk!: WeChatSdkApi;

  private protocol: BridgeProtocol = 'http';
  private apiUrl: string = '';

  private isLoggedIn: boolean = false;
  private timer: number | null = null;
  private timerInterval: number = 1000 * 30; // 30 seconds
  private hookCookie: string = '';

  constructor(options: WeChatSdkOptions) {
    super();

    this.host = EnvVars.WXBOT_HOST || '127.0.0.1';
    this.port = Number(EnvVars.WXBOT_PORT) || 4000;

    this.initOptions(options);
  }

  start() {
    this.catchErrors();
    this.createInstance();
    this.createApp();
    this.startTimer();
    log.info('WeChat SDK server is started');
  }

  async stop(err?: any) {
    this.stopTimer();

    await this.unHookMsg();

    log.info('WeChat SDK server is stopped');

    if (err) {
      const errMsg = (err && err.message) || 'unknown error';
      this.emit('error', new Error(errMsg));
      log.error('WeChat SDK server stopped with error', errMsg);
    }

    this.emit('logout');

    try {
      await killPort(this.port);
    } catch (error) {
      log.error('kill port failed', error);
    }

    process.exit(0);
  }

  async getContactList() {
    if (!this.isLoggedIn) throw new Error('user is not logged in');

    const res = await this.wechatsdk.contactList();

    if (res.error_code !== 10000) throw new Error('get contacts failed');

    return res.data.data;
  }

  async getContactInfo(contactId: string) {
    if (!this.isLoggedIn) throw new Error('user is not logged in');

    const res = await this.wechatsdk.contactInfo(contactId);

    if (res.error_code !== 10000) throw new Error('get contact info failed');

    return res.data.data;
  }

  async getChatRoomList() {
    if (!this.isLoggedIn) throw new Error('user is not logged in');

    const res = await this.wechatsdk.chatroomList();

    if (res.error_code !== 10000) throw new Error('get chatrooms failed');

    return res.data.data;
  }

  async getChatRoomInfo(chatroomId: string) {
    if (!this.isLoggedIn) throw new Error('user is not logged in');

    const res = await this.wechatsdk.chatroomInfo(chatroomId);

    if (res.error_code !== 10000) throw new Error('get chatroom info failed');

    return res.data.data;
  }

  async getChatRoomMemberList(chatroomId: string) {
    if (!this.isLoggedIn) throw new Error('user is not logged in');

    const res = await this.wechatsdk.chatroomMembers(chatroomId);

    if (res.error_code !== 10000) throw new Error('get chatroom members failed');

    return res.data.data;
  }

  async sendTextMsg(contactId: string, text: string, atContactIds?: string[]) {
    if (!this.isLoggedIn) throw new Error('user is not logged in');

    const res = await this.wechatsdk.sendText(contactId, text, atContactIds);

    if (res.error_code !== 10000) throw new Error('send text msg failed');

    return res.data;
  }

  async sendImageMsg(contactId: string, image: string) {
    if (!this.isLoggedIn) throw new Error('user is not logged in');

    const res = await this.wechatsdk.sendImage(contactId, image);

    if (res.error_code !== 10000) throw new Error('send image msg failed');

    return res.data;
  }

  async sendFileMsg(contactId: string, file: string) {
    if (!this.isLoggedIn) throw new Error('user is not logged in');

    const res = await this.wechatsdk.sendFile(contactId, file);

    if (res.error_code !== 10000) throw new Error('send file msg failed');

    return res.data;
  }

  async sendContactMsg(contactId: string, contactId2: string) {
    if (!this.isLoggedIn) throw new Error('user is not logged in');

    const res = await this.wechatsdk.sendContact(contactId, contactId2);

    if (res.error_code !== 10000) throw new Error('send contact msg failed');

    return res.data;
  }

  async sendPublicAccountMsg(contactId: string, contactId2: string) {
    if (!this.isLoggedIn) throw new Error('user is not logged in');

    const res = await this.wechatsdk.sendPublicAccount(contactId, contactId2);

    if (res.error_code !== 10000) throw new Error('send public account msg failed');

    return res.data;
  }

  async sendBusinessCardMsg(contactId: string, contactId2: string) {
    if (!this.isLoggedIn) throw new Error('user is not logged in');

    const res = await this.wechatsdk.sendBusinessUsers(contactId, contactId2);

    if (res.error_code !== 10000) throw new Error('send business card msg failed');

    return res.data;
  }

  async sendPatMsg(contactId: string, contactId2: string) {
    if (!this.isLoggedIn) throw new Error('user is not logged in');

    const res = await this.wechatsdk.sendPat(contactId, contactId2);

    if (res.error_code !== 10000) throw new Error('send pat msg failed');

    return res.data;
  }

  async sendEmojiMsg(contactId: string, emoji: string) {
    if (!this.isLoggedIn) throw new Error('user is not logged in');

    const res = await this.wechatsdk.sendEmoji(contactId, emoji);

    if (res.error_code !== 10000) throw new Error('send emoji msg failed');

    return res.data;
  }

  async sendLinkMsg(contactId: string, content: string) {
    if (!this.isLoggedIn) throw new Error('user is not logged in');

    const res = await this.wechatsdk.sendLink(contactId, content);

    if (res.error_code !== 10000) throw new Error('send link msg failed');

    return res.data;
  }

  async sendLocation(location: LocationParams) {
    if (!this.isLoggedIn) throw new Error('user is not logged in');

    const res = await this.wechatsdk.sendLocation(location);

    if (res.error_code !== 10000) throw new Error('send location failed');

    return res.data;
  }

  private catchErrors() {
    process.on('uncaughtException', this.stop.bind(this));
    process.on('SIGINT', this.stop.bind(this));
    process.on('exit', this.stop.bind(this));
  }

  private createHttpServer() {
    const app = express();

    app.use(async (req, res, next) => {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          if (isJsonString(body)) {
            req.body = parseJson(body) as Result<RecvMsg>;
          }
        } catch (error) {
          log.error('handle recv msg failed', error);
          res.status(400).send('invalid request body');
        }

        next();
      });
    });

    app.post('/api/msg/recv', async (req, res) => {
      try {
        const data = req.body;
        await this.handleRecvMsg(data);
        res.json({ success: true });
      } catch (error) {
        log.error('handle recv msg failed', error);
        res.status(500).send('error');
      }
    });

    app.listen(this.port, () => {
      log.info('WeChat SDK server is listening on port', this.port);
    });
  }

  private createWsServer() {
    const wss = new WebSocketServer({
      port: this.port,
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        concurrencyLimit: 10,
        threshold: 1024
      }
    });

    wss.on('connection', ws => {
      log.info('WeChat SDK server is connected');

      ws.on('message', async data => {
        try {
          const dataStr = data.toString();
          if (!isJsonString(dataStr)) return;
          await this.handleRecvMsg(parseJson(dataStr) as Result<RecvMsg>);
        } catch (error) {
          log.error('handle recv msg failed', error);
        }
      });

      ws.on('close', () => {
        log.info('WeChat SDK server is disconnected');
      });
      ws.on('error', error => {
        log.error('WeChat SDK server error', error);
      });
    });
  }

  private async handleRecvMsg(data: Result<RecvMsg>) {
    this.emit('message', data.data);
  }

  private async hookMsg(protocol: number, url: string) {
    try {
      const res = await this.wechatsdk.hook(protocol, url);

      if (res.error_code !== 10000) throw new Error('hook msg failed');

      const data = res.data;

      if (data.cookie) {
        log.info('hook msg success, get cookie', data.cookie);
        this.hookCookie = data.cookie;
        return;
      }

      throw new Error('hook msg failed, cookie is empty');
    } catch (error) {
      log.error('hook msg failed', error);
    }
  }

  private async unHookMsg() {
    if (!this.hookCookie) return;
    try {
      const res = await this.wechatsdk.unhook(this.hookCookie);

      if (res.error_code !== 10000) throw new Error('unhook msg failed');

      log.info('unhook msg success');
    } catch (error) {
      log.error('unhook msg failed', error);
    }
  }

  private async createApp() {
    try {
      if (this.protocol === 'http') {
        this.createHttpServer();

        const url = `http://${this.host}:${this.port}/api/msg/recv`;
        log.info('hook wechat sdk with url', url);

        await this.hookMsg(2, url);
        return;
      }
      if (this.protocol === 'ws') {
        this.createWsServer();

        const url = `ws://${this.host}:${this.port}/ws/msg/recv`;
        log.info('hook wechat sdk with url', url);

        await this.hookMsg(3, url);
        return;
      }

      throw new Error('invalid protocol');
    } catch (error) {
      log.error('create app failed', error);
      throw error;
    }
  }

  private createInstance() {
    this.wechatsdk = new WeChatSdkApi({ apiUrl: this.apiUrl });
  }

  private initOptions(options: WeChatSdkOptions) {
    const { apiUrl, protocol } = options;

    if (!apiUrl) throw new Error('apiUrl is required');

    this.apiUrl = apiUrl;
    this.protocol = protocol || 'http';
  }

  private stopTimer() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  async getUserInfo() {
    const res = await this.wechatsdk.userInfo();

    if (res.error_code !== 10000) throw new Error('check login failed');

    if (res.data.data.isLogin) {
      log.info('user is logged in');

      this.isLoggedIn = true;

      this.emit('login', res.data.data);
      this.stopTimer();
      return res;
    }

    log.info('user is not logged in');
  }

  private async checkLogin(initial: boolean = false) {
    if (this.isLoggedIn) return;

    try {
      await this.getUserInfo();

      if (this.isLoggedIn || !initial) return;

      log.info(`get login qrcode`);

      const res = await this.wechatsdk.qrcode();

      if (res.error_code !== 10000) throw new Error('get qrcode failed');

      const qrcodeUrl = await decodeQRCode(Buffer.from(res.data.qrcode));
      log.info(`get qrcode success, url: ${qrcodeUrl}`);

      this.emit('scan', qrcodeUrl);
    } catch (error) {
      log.error('check login failed', error);
    }
  }

  private startTimer() {
    this.stopTimer();

    if (this.isLoggedIn) return;

    this.checkLogin(true);

    this.timer = setInterval(() => {
      if (this.isLoggedIn) {
        this.stopTimer();
        return;
      }
      this.checkLogin();
    }, this.timerInterval) as unknown as number;

    log.info('start timer to check login status');
  }
}

export default Bridge;
