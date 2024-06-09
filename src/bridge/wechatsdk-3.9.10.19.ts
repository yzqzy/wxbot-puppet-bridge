import path from 'path';
import fs from 'fs';
import os from 'os';

import * as PUPPET from 'wechaty-puppet';
import { log } from 'wechaty-puppet';
import type { FileBoxInterface } from 'file-box';
import { FileBox, FileBoxType } from 'file-box';

import type {
  EventLogin,
  EventError,
  EventScan
} from 'wechaty-puppet/payloads';
import type { BridgeProtocol } from '@src/agents/wechatsdk-agent';
import Bridge from '@src/agents/wechatsdk-agent';
import { jsonStringify } from '@src/shared/tools';
import { RecvMsg, User } from '@src/agents/wechatsdk-typings';
import { ScanStatus } from 'wechaty-puppet/types';

const VERSION = '3.9.10.19';

interface PuppetOptions extends PUPPET.PuppetOptions {
  sidecarName?: string;
  apiUrl: string;
  protocol?: BridgeProtocol;
}

class PuppetBridge extends PUPPET.Puppet {
  static override readonly VERSION = VERSION;

  private isReady = false;

  private bridge!: Bridge;

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

    this.isReady = true;
    this.emit('ready');
  }

  private async onScan(qrcode: any) {
    log.verbose('PuppetBridge', 'onScan(%s)', qrcode);

    if (!qrcode) return;

    this.emit('scan', {
      qrcode,
      status: ScanStatus.Waiting
    } as EventScan);
  }

  private async onLogin(user: User): Promise<void> {
    log.verbose('PuppetBridge', 'onLogin(%s)', jsonStringify(user));

    if (!user) return;

    this.login(user.userName);

    process.nextTick(this.onAgentReady.bind(this));
  }

  private async onLogout(reasonNum: number): Promise<void> {
    log.verbose('PuppetBridge', 'onLogout()');

    await super.logout(reasonNum ? 'Kicked by server' : 'logout');
  }

  private async onMessage(message: RecvMsg): Promise<void> {
    log.verbose('PuppetBridge', 'onMessage(%s)', jsonStringify(message));

    if (!message) return;
  }

  private async onError(error: Error): Promise<void> {
    log.error('PuppetBridge', 'onError()');

    this.emit('error', {
      data: error.stack,
      gerror: error.message
    } as EventError);
  }
}

export { PuppetBridge };
