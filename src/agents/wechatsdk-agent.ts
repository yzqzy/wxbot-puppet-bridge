import { EventEmitter } from 'events';
import express, { Express } from 'express';
import { ScanStatus } from 'wechaty-puppet/types';
import { log } from 'wechaty-puppet';

import EnvVars from '@src/config/EnvVars';
import { decodeQRCode } from '@src/shared/qrcode';
import WeChatSdkApi from './wechatsdk-api';
import { jsonStringify } from '@src/shared/tools';

export type BridgeProtocol = 'ws' | 'http';

interface WeChatSdkOptions {
  protocol?: BridgeProtocol;
  apiUrl: string;
}

class Bridge extends EventEmitter {
  private port!: number;

  private protocol: BridgeProtocol = 'http';
  private apiUrl: string = '';

  private isLoggedIn: boolean = false;
  private timer: number | null = null;
  private timerInterval: number = 1000 * 30; // 30 seconds

  private wechatsdk!: WeChatSdkApi;

  private hookCookie: string = '';

  constructor(options: WeChatSdkOptions) {
    super();

    this.port = Number(EnvVars.WXBOT_PORT) || 18000;

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

    if (err) log.error('WeChat SDK server stopped with error', err);

    log.info('WeChat SDK server is stopped');

    process.exit(0);
  }

  private catchErrors() {
    process.on('uncaughtException', this.stop.bind(this));
    process.on('SIGINT', this.stop.bind(this));
    process.on('exit', this.stop.bind(this));
  }

  private createHttpServer() {
    const app = express();

    app.use(express.json());

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
    // TODO: implement ws server
  }

  private async handleRecvMsg(data: any) {
    log.info('receive message from wechat', jsonStringify(data));
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
    if (this.protocol === 'http') {
      this.createHttpServer();

      const url = `http://192.168.1.15:${this.port}/api/msg/recv`;
      log.info('hook wechat sdk with url', url);

      await this.hookMsg(2, url);
      return;
    }

    if (this.protocol === 'ws') {
      this.createWsServer();

      // TODO: hook wechat sdk with ws server
      return;
    }

    throw new Error('invalid protocol');
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

  private async checkLogin(initial: boolean = false) {
    if (this.isLoggedIn) return;

    try {
      const res = await this.wechatsdk.userInfo();

      if (res.error_code !== 10000) throw new Error('check login failed');

      if (res.data.data.isLogin) {
        log.info('user is logged in');

        this.isLoggedIn = true;

        this.emit('login', res.data.data);
        this.stopTimer();
        return;
      }

      log.info('user is not logged in');

      if (initial) {
        const res = await this.wechatsdk.qrcode();

        if (res.error_code !== 10000) throw new Error('get qrcode failed');

        this.emit('scan', {
          qrcode: await decodeQRCode(Buffer.from(res.data.qrcode)),
          status: ScanStatus.Waiting
        });
      }
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
