import * as PUPPET from 'wechaty-puppet';
import { log } from 'wechaty-puppet';

import type {
  EventError,
  EventScan,
  EventMessage
} from 'wechaty-puppet/payloads';
import type { BridgeProtocol } from '@src/agents/wechatsdk-agent';
import Bridge from '@src/agents/wechatsdk-agent';
import { jsonStringify } from '@src/shared/tools';
import { RecvMsg, RecvScanMsg, User } from '@src/agents/wechatsdk-types';
import { ScanStatus } from 'wechaty-puppet/types';

const VERSION = '3.9.10.19';

interface PuppetOptions extends PUPPET.PuppetOptions {
  sidecarName?: string;
  apiUrl: string;
  protocol?: BridgeProtocol;
}

class PuppetBridge extends PUPPET.Puppet {
  static override readonly VERSION = VERSION;

  private bridge!: Bridge;

  private userInfo!: User;

  constructor(
    options: PuppetOptions = {
      sidecarName: 'wechatsdk-puppet',
      apiUrl: '',
      protocol: 'http'
    }
  ) {
    super(options);

    log.verbose('PuppetBridge', 'constructor(%s)', JSON.stringify(options));

    this.bridge = new Bridge({
      apiUrl: options.apiUrl,
      protocol: options.protocol
    });
  }

  override version(): string {
    return VERSION;
  }

  override login(contactId: string) {
    log.verbose('PuppetBridge', 'login(%s)', contactId);

    super.login(contactId);
  }

  async onStart(): Promise<void> {
    log.verbose('PuppetBridge', 'onStart()');

    this.bridge.start();
    this.bindEvents();
  }

  async onStop(): Promise<void> {
    log.verbose('PuppetBridge', 'onStop()');

    if (!this.bridge) return;
    this.bridge.stop();
  }

  private bindEvents(): void {
    log.verbose('PuppetBridge', 'bindEvents()');

    this.bridge.on('ready', this.onAgentReady.bind(this));
    this.bridge.on('scan', this.onScan.bind(this));
    this.bridge.on('login', this.onLogin.bind(this));
    this.bridge.on('logout', this.onLogout.bind(this));
    this.bridge.on('message', this.onMessage.bind(this));
    this.bridge.on('error', this.onError.bind(this));
  }

  private async onAgentReady(): Promise<void> {
    log.verbose('PuppetBridge', 'onAgentReady()');

    this.emit('ready');
  }

  private async onScan(qrcode: any) {
    log.verbose('PuppetBridge', 'onScan()');

    if (!qrcode) return;

    log.info('PuppetBridge', 'onScan() qrcode %s', qrcode);

    this.emit('scan', {
      qrcode,
      status: ScanStatus.Waiting
    } as EventScan);
  }

  private async onLogin(user: User): Promise<void> {
    log.verbose('PuppetBridge', 'onLogin()');

    if (!user || this.userInfo) return;

    log.info('PuppetBridge', 'onLogin() user %s', jsonStringify(user));

    this.userInfo = user;
    this.login(user.userName);

    process.nextTick(this.onAgentReady.bind(this));
  }

  private async onLogout(reasonNum: number): Promise<void> {
    log.verbose('PuppetBridge', 'onLogout()');

    await super.logout(reasonNum ? 'Kicked by server' : 'logout');
  }

  private isRecvScanMsg(msg: RecvMsg | RecvScanMsg): msg is RecvScanMsg {
    return (msg as RecvScanMsg)?.desc?.includes('scan');
  }
  private isRecvMsg(msg: RecvMsg | RecvScanMsg): msg is RecvMsg {
    return (
      (msg as RecvMsg)?.type !== null && (msg as RecvMsg)?.type !== undefined
    );
  }

  private async scanMsgHandler(message: RecvScanMsg): Promise<void> {
    log.verbose('PuppetBridge', 'scanMsg()');

    let payload = {
      data: JSON.stringify(message)
    } as EventScan;

    switch (message.state) {
      case 0:
        payload.status = ScanStatus.Waiting;
        break;
      case 1:
        payload.status = ScanStatus.Scanned;
        break;
      case 2:
        payload.status = ScanStatus.Confirmed;
        break;
      default:
        payload.status = ScanStatus.Unknown;
        break;
    }

    this.emit('scan', payload);
  }
  private async msgHandler(message: RecvMsg): Promise<void> {
    const payload = {
      type: message.type,
      id: message.msgSvrID,
      messageId: message?.msgSvrID?.toString(),
      talkerId: message?.talkerInfo?.userName,
      text: message.content,
      timestamp: Date.now(),
      fromId: message.from,
      toId: message.to,
      roomId: message.isChatroomMsg ? message.from : ''
    } as EventMessage;
    this.emit('message', payload);
  }

  private async onMessage(message: RecvMsg | RecvScanMsg): Promise<void> {
    log.verbose('PuppetBridge', 'onMessage()');

    if (!message) return;

    log.info('PuppetBridge', 'onMessage() message %s', jsonStringify(message));

    if (this.isRecvScanMsg(message)) {
      this.scanMsgHandler(message);
      return;
    }

    if (this.isRecvMsg(message)) {
      if (!this.userInfo) {
        await this.bridge.getUserInfo();
      }
      this.msgHandler(message);
      return;
    }

    log.warn('PuppetBridge', 'onMessage() unknown message');
  }

  private async onError(error: Error): Promise<void> {
    log.error('PuppetBridge', 'onError()');

    if (!error) return;

    this.emit('error', {
      data: error.stack,
      gerror: error.message
    } as EventError);
  }
}

export { PuppetBridge };
