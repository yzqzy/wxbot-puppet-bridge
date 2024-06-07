import { EventEmitter } from 'events';
import express from 'hyper-express';
import { log } from 'wechaty-puppet';

import EnvVars from '@src/config/EnvVars';
import WeChatSdk from './wechatsdk-api';

type BridgeProtocol = 'ws' | 'http';

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

  private instance!: WeChatSdk;

  constructor(options: WeChatSdkOptions) {
    super();

    this.port = Number(EnvVars.WXBOT_PORT) || 18000;

    this.init(options);
  }

  private createHttpServer() {
    const server = new express.Server();

    server.post('/api/msg/recv', async (req, res) => {
      const data = await req.json();

      log.info('receive message from wechat %s', data);
    });

    server.listen(this.port, () => {
      log.info('WeChat SDK server is running on port %s', this.port);
    });

    return server;
  }

  private createWsServer() {}

  private async startServer() {
    switch (this.protocol) {
      case 'http':
        this.createHttpServer();
        break;
      case 'ws':
        this.createWsServer();
        break;
      default:
        throw new Error('invalid protocol');
    }
  }

  private createInstance() {
    this.instance = new WeChatSdk({ apiUrl: this.apiUrl });
  }

  private init(options: WeChatSdkOptions) {
    const { apiUrl, protocol } = options;

    if (!apiUrl) throw new Error('apiUrl is required');

    this.apiUrl = apiUrl;
    this.protocol = protocol || 'http';

    this.createInstance();

    this.startTimer();
    this.startServer();
  }

  private stopTimer() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  private startTimer() {
    this.stopTimer();

    if (this.isLoggedIn) return;

    this.timer = setInterval(() => {}, 1000 * 60 * 5) as unknown as number;
  }
}

export default Bridge;
