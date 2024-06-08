import path from 'path';
import fs from 'fs';
import os from 'os';

import * as PUPPET from 'wechaty-puppet';
import { log } from 'wechaty-puppet';
import type { FileBoxInterface } from 'file-box';
import { FileBox, FileBoxType } from 'file-box';

import type { BridgeProtocol } from '@src/agents/wechatsdk-agent';
import Bridge from '@src/agents/wechatsdk-agent';

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

  async onStart(): Promise<void> {
    log.verbose('PuppetBridge', 'onStart()');

    this.bridge.start();

    this.bindEvents();
  }

  async onStop(): Promise<void> {
    if (!this.bridge) return;

    log.verbose('PuppetBridge', 'onStop()');

    this.bridge.stop();
  }

  private bindEvents(): void {
    log.verbose('PuppetBridge', 'bindEvents()');

    this.bridge.on('ready', this.onAgentReady.bind(this));
    this.bridge.on('scan', this.onScan.bind(this));
    this.bridge.on('login', this.onLogin.bind(this));
    this.bridge.on('logout', this.onLogout.bind(this));
    this.bridge.on('message', this.onMessage.bind(this));
  }

  private async onAgentReady(): Promise<void> {
    log.verbose('PuppetBridge', 'onAgentReady()');

    this.isReady = true;

    this.emit('ready');
  }

  private async onScan(args: any) {
    log.verbose('PuppetBridge', 'onScan()');

    if (!args) return;

    this.emit('scan', args);
  }

  private async onLogin(user: any): Promise<void> {
    log.verbose('PuppetBridge', 'onLogin()');

    if (!user) return;

    this.emit('login', user);
  }

  private async onLogout(reasonNum: number): Promise<void> {
    log.verbose('PuppetBridge', 'onLogout()');
    await super.logout(reasonNum ? 'Kicked by server' : 'logout');
  }

  private async onMessage(message: any): Promise<void> {
    log.verbose('PuppetBridge', 'onMessage()', message);

    if (!message) return;
  }
}

export { PuppetBridge };
