import path from 'path';
import fs from 'fs';
import os from 'os';

import * as PUPPET from 'wechaty-puppet';
import { log } from 'wechaty-puppet';
import type { FileBoxInterface } from 'file-box';
import { FileBox, FileBoxType } from 'file-box';

const VERSION = '3.9.10.19';

class PuppetBridge extends PUPPET.Puppet {
  static override readonly VERSION = VERSION;

  private isReady = false;

  constructor(
    options: PUPPET.PuppetOptions = {
      sidecarName: 'wechatsdk-puppet'
    }
  ) {
    super(options);
    log.verbose('PuppetBridge', 'constructor(%s)', JSON.stringify(options));
  }

  override version(): string {
    return VERSION;
  }

  async onReady(): Promise<void> {
    log.verbose('PuppetBridge', 'onReady()');
    this.isReady = true;
  }

  async onStart(): Promise<void> {}

  async onStop(): Promise<void> {}
}

export { PuppetBridge };
export default PuppetBridge;
