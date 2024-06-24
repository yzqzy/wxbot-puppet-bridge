import * as PUPPET from 'wechaty-puppet';
import { FileBoxInterface, FileBox } from 'file-box';
import { log } from 'wechaty-puppet';

import type {
  EventError,
  EventScan,
  EventMessage,
  Message,
  Room,
  Contact
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

  private isReady: boolean = false;

  private bridge!: Bridge;

  private userInfo!: User;

  // FIXME: use LRU cache for message store so that we can reduce memory usage
  private messageStore = new Map<string, Message>();
  private contactStore = new Map<string, Contact>();
  private roomStore = new Map<string, Room>();

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

  override ding(data?: string | undefined): void {
    log.silly('PuppetBridge', 'ding(%s)', data || '');

    setTimeout(() => {
      this.emit('dong', { data: data || '' });
    }, 1000);
  }

  // contact --------------

  override contactRawPayloadParser(
    rawPayload: any
  ): Promise<PUPPET.payloads.Contact>;
  override contactRawPayloadParser(
    rawPayload: any
  ): Promise<PUPPET.payloads.Contact> {
    return this.promiseWrap(() => {
      return rawPayload;
    });
  }

  override contactRawPayload(contactId: string): Promise<Contact | null>;
  override contactRawPayload(contactId: string): Promise<Contact | null> {
    return new Promise((resolve, reject) => {
      resolve(this.contactStore.get(contactId) || null);
    });
  }

  override contactAlias(contactId: string): Promise<string>;
  override contactAlias(contactId: string, alias: string | null): Promise<void>;
  override async contactAlias(
    contactId: string,
    alias?: string | null
  ): Promise<void | string> {
    log.verbose('PuppetBridge', 'contactAlias(%s, %s)', contactId, alias || '');

    if (!this.isReady) throw new Error('bridge not ready');

    const contact = await this.contactRawPayload(contactId);
    if (!contact) throw new Error('contact not found');

    if (alias) {
      throw new Error('not support set alias');
    }

    return contact.alias;
  }

  override contactPhone(contactId: string, phoneList: string[]): Promise<void>;
  override contactPhone(contactId: string, phoneList: string[]): Promise<void> {
    log.verbose('PuppetBridge', 'contactPhone(%s, %s)', contactId, phoneList);

    throw new Error('not support set phone');
  }

  override contactList(): Promise<string[]>;
  override contactList(): Promise<string[]> {
    log.verbose('PuppetBridge', 'contactList()');

    return this.promiseWrap(() => Array.from(this.contactStore.keys()));
  }

  override contactAvatar(contactId: string): Promise<FileBoxInterface>;
  override contactAvatar(
    contactId: string,
    file: FileBoxInterface
  ): Promise<void>;
  override contactAvatar(
    contactId: string,
    file?: FileBoxInterface
  ): Promise<void | FileBoxInterface> {
    log.verbose('PuppetBridge', 'contactAvatar(%s, %s)', contactId, file);

    if (file) {
      throw new Error('not support set avatar');
    }

    const contact = this.contactStore.get(contactId);
    if (!contact) throw new Error('contact not found');

    return this.promiseWrap(() => FileBox.fromUrl(contact.avatar));
  }

  // room --------------

  override roomPayload(roomId: string): Promise<PUPPET.payloads.Room> {
    log.verbose('PuppetBridge', 'roomPayload(%s)', roomId);

    const room = this.roomStore.get(roomId);
    if (!room) throw new Error('room not found');

    return this.promiseWrap(() => room);
  }

  override roomMemberList(roomId: string): Promise<string[]>;
  override roomMemberList(roomId: string): Promise<string[]> {
    log.verbose('PuppetBridge', 'roomMemberList(%s)', roomId);

    const room = this.roomStore.get(roomId);
    if (!room) throw new Error('room not found');

    return this.promiseWrap(() => room.memberIdList);
  }

  // message --------------

  override messageContact(messageId: string): Promise<string>;
  override messageContact(messageId: string): Promise<string> {
    log.verbose('PuppetBridge', 'messageContact(%s)', messageId);

    const message = this.messageStore.get(messageId);
    if (!message) throw new Error('message not found');

    return this.promiseWrap(() => message.talkerId);
  }

  override messageRawPayloadParser(
    rawPayload: any
  ): Promise<PUPPET.payloads.Message>;
  override messageRawPayloadParser(
    rawPayload: any
  ): Promise<PUPPET.payloads.Message> {
    return this.promiseWrap(() => {
      return rawPayload;
    });
  }

  override messagePayload(messageId: string): Promise<PUPPET.payloads.Message>;
  override messagePayload(messageId: string): Promise<PUPPET.payloads.Message> {
    log.verbose('PuppetBridge', 'messagePayload(%s)', messageId);

    const message = this.messageStore.get(messageId);
    if (!message) throw new Error('message not found');

    return this.promiseWrap(() => message);
  }

  // core --------------

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

  private async promiseWrap<T>(fn: () => T): Promise<T> {
    return new Promise((resolve, reject) => {
      try {
        resolve(fn());
      } catch (error) {
        reject(error);
      }
    });
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
    log.verbose('PuppetBridge', 'onScan()');

    if (!qrcode) return;

    log.info('PuppetBridge', 'onScan() qrcode %s', qrcode);

    this.emit('scan', {
      qrcode,
      status: ScanStatus.Waiting
    } as EventScan);
  }

  private async updateContactPayload(contact: Contact): Promise<void> {
    log.verbose('PuppetBridge', 'updateContactPayload()');

    try {
      const contactInfo = await this.bridge.getContactInfo(contact.id);

      contact.gender = contactInfo.sex;
      contact.city = contactInfo.city;
      contact.province = contactInfo.province;
      contact.address = contactInfo.province + contactInfo.city;
      contact.alias = contactInfo.alias;
      contact.signature = contactInfo.signature;

      this.contactStore.set(contact.id, contact);
    } catch (error) {}
  }

  private async loadContacts(): Promise<void> {
    log.verbose('PuppetBridge', 'loadContacts()');

    try {
      const contacts = await this.bridge.getContactList();

      for (const contact of contacts) {
        let contactType = PUPPET.types.Contact.Individual;

        if (contact.UserName.startsWith('gh_')) {
          contactType = PUPPET.types.Contact.Official;
        }
        if (contact.UserName.startsWith('@openim')) {
          contactType = PUPPET.types.Contact.Corporation;
        }

        const contactPayload = {
          id: contact.UserName,
          name: contact.NickName,
          type: contactType,
          friend: true,
          phone: [] as string[],
          avatar: contact.smallHeadImgUrl
        } as Contact;
        this.contactStore.set(contact.UserName, contactPayload);
      }

      log.info(
        'PuppetBridge',
        'loadContacts() contacts count %s',
        this.contactStore.size
      );
    } catch (error) {
      log.error('PuppetBridge', 'loadContacts() exception %s', error.stack);
    }
  }

  private async updateRoomPayload(room: Room): Promise<void> {
    log.verbose('PuppetBridge', 'updateRoomPayload()');

    try {
      const roomInfo = await this.bridge.getChatRoomInfo(room.id);
      const { profile } = roomInfo;
      room.avatar = profile.data.smallHeadImgUrl;

      const memebrsData = await this.bridge.getChatRoomMemberList(room.id);
      const members = memebrsData.members;

      room.ownerId = memebrsData.ownerUserName;
      room.adminIdList = memebrsData.chatroomAdminUserNames;
      room.memberIdList = members.map(member => member.userName);

      this.roomStore.set(room.id, room);
    } catch (error) {
      log.error(
        'PuppetBridge',
        'updateRoomPayload() exception %s',
        error.stack
      );
    }
  }

  private async loadRooms(): Promise<void> {
    log.verbose('PuppetBridge', 'loadRooms()');

    try {
      const rooms = await this.bridge.getChatRoomList();

      for (const room of rooms) {
        const roomPayload = {
          id: room.UserName,
          avatar: '',
          external: false,
          ownerId: '',
          adminIdList: [] as string[],
          memberIdList: [] as string[],
          topic: room.NickName
        } as Room;

        this.roomStore.set(room.UserName, roomPayload);
      }

      log.info(
        'PuppetBridge',
        'loadRooms() rooms count %s',
        this.roomStore.size
      );
    } catch (error) {
      log.error('PuppetBridge', 'loadRooms() exception %s', error.stack);
    }
  }

  private async onLogin(user: User): Promise<void> {
    log.verbose('PuppetBridge', 'onLogin()');

    if (!user || this.userInfo) return;

    log.info('PuppetBridge', 'onLogin() user %s', jsonStringify(user));

    this.userInfo = user;

    // init contacts store
    await this.loadContacts();
    // init rooms store
    await this.loadRooms();

    // login
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
      type: Number(message.type),
      id: message?.msgSvrID.toString(),
      talkerId: message?.talkerInfo?.userName,
      text: message.content,
      listenerId: message.to,
      timestamp: Date.now(),
      fromId: message.from,
      toId: message.to,
      roomId: message.isChatroomMsg ? message.from : ''
    } as Message;

    this.messageStore.set(payload.id, payload);

    this.emit('message', { messageId: payload.id } as EventMessage);
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
