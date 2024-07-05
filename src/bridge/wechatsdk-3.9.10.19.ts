import * as PUPPET from 'wechaty-puppet';
import { FileBoxInterface, FileBox, FileBoxType } from 'file-box';
import xml2js from 'xml2js';
import readXml from 'xmlreader';
import fs from 'fs';
import path from 'path';
import fsPromise from 'fs/promises';
import { log } from 'wechaty-puppet';

import type { EventError, EventScan, EventMessage, Message, Room, RoomMember, Contact } from 'wechaty-puppet/payloads';
import type { BridgeProtocol } from '@src/agents/wechatsdk-agent';
import Bridge from '@src/agents/wechatsdk-agent';
import { delaySync, jsonStringify } from '@src/shared/tools';
import { RecvMsg, RecvScanMsg, User } from '@src/agents/wechatsdk-types';
import { ScanStatus } from 'wechaty-puppet/types';
import { createDirIfNotExist, getRootPath, imageDecrypt, removeFile, xmlDecrypt } from '@src/shared';

const VERSION = '3.9.10.19';

interface PuppetOptions extends PUPPET.PuppetOptions {
  sidecarName?: string;
  apiUrl: string;
  protocol?: BridgeProtocol;
}

interface PuppetRoom extends Room {
  members: RoomMember[];
}
interface PuppetContact extends Contact {}

class PuppetBridge extends PUPPET.Puppet {
  static override readonly VERSION = VERSION;

  private isReady: boolean = false;

  private bridge!: Bridge;

  private userInfo!: Contact;

  private rootPath: string = getRootPath();

  // FIXME: use LRU cache for message store so that we can reduce memory usage
  private messageStore = new Map<string, Message>();
  private contactStore = new Map<string, PuppetContact>();
  private roomStore = new Map<string, PuppetRoom>();

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

  // Contact --------------

  override contactRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.Contact>;
  override contactRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.Contact> {
    return this.promiseWrap(() => {
      return rawPayload;
    });
  }

  override contactRawPayload(contactId: string): Promise<Contact | null>;
  override contactRawPayload(contactId: string): Promise<Contact | null> {
    log.verbose('PuppetBridge', 'contactRawPayload(%s)', contactId);
    return this.promiseWrap(() => this.contactStore.get(contactId) || null);
  }

  override contactAlias(contactId: string): Promise<string>;
  override contactAlias(contactId: string, alias: string | null): Promise<void>;
  override async contactAlias(contactId: string, alias?: string | null): Promise<void | string> {
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
  override contactAvatar(contactId: string, file: FileBoxInterface): Promise<void>;
  override contactAvatar(contactId: string, file?: FileBoxInterface): Promise<void | FileBoxInterface> {
    log.verbose('PuppetBridge', 'contactAvatar(%s, %s)', contactId, file);

    if (file) {
      throw new Error('not support set avatar');
    }

    const contact = this.contactStore.get(contactId);
    if (!contact) throw new Error('contact not found');

    return this.promiseWrap(() => FileBox.fromUrl(contact.avatar));
  }

  // Room --------------

  private async getRoom(roomId: string) {
    const room = this.roomStore.get(roomId);
    if (!room) {
      await this.updateRoomPayload({ id: roomId } as any);
    }
    return this.roomStore.get(roomId) || null;
  }

  override roomRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.Room> {
    log.verbose('PuppetBridge', 'roomRawPayloadParser(%s)', JSON.stringify(rawPayload));
    return this.promiseWrap(() => {
      return rawPayload;
    });
  }
  override roomRawPayload(roomId: string): Promise<any> {
    log.verbose('PuppetBridge', 'roomRawPayload(%s)', roomId);
    return this.getRoom(roomId);
  }

  override roomPayload(roomId: string): Promise<PUPPET.payloads.Room>;
  override roomPayload(roomId: string): Promise<PUPPET.payloads.Room | null>;
  override roomPayload(roomId: string): Promise<PUPPET.payloads.Room | null> {
    log.verbose('PuppetBridge', 'roomPayload(%s)', roomId);
    return this.getRoom(roomId);
  }

  override async roomTopic(roomId: string): Promise<string>;
  override async roomTopic(roomId: string, topic: string): Promise<void>;
  override async roomTopic(roomId: unknown, topic?: unknown): Promise<void | string> {
    log.verbose('PuppetBridge', 'roomTopic(%s, %s)', roomId, topic || '');
    if (typeof roomId !== 'string') return this.promiseWrap(() => '');
    const payload = await this.roomPayload(roomId);
    return (payload && payload.topic) || '';
  }

  override roomSearch(query?: PUPPET.filters.Room | undefined): Promise<string[]> {
    log.verbose('PuppetBridge', 'roomSearch(%s)', query);

    const roomList = Array.from(this.roomStore.values());

    let rooms: string[] = [];

    if (typeof query === 'object') {
      if (query.id) {
        rooms = roomList.filter(room => room.id === query.id).map(room => room.id);
      } else if (query.topic) {
        rooms = roomList.filter(room => room.topic === query.topic).map(room => room.id);
      }
    }

    return this.promiseWrap(() => rooms);
  }

  override roomList(): Promise<string[]>;
  override roomList(): Promise<string[]> {
    log.verbose('PuppetBridge', 'roomList()');
    return this.promiseWrap(() => Array.from(this.roomStore.keys()));
  }

  override roomMemberList(roomId: string): Promise<string[]>;
  override roomMemberList(roomId: string): Promise<string[]> {
    log.verbose('PuppetBridge', 'roomMemberList(%s)', roomId);

    const room = this.roomStore.get(roomId);
    if (!room) return this.promiseWrap(() => []);

    return this.promiseWrap(() => room.memberIdList);
  }
  override roomMemberPayload(roomId: string, memberId: string): Promise<PUPPET.payloads.RoomMember>;
  override roomMemberPayload(roomId: string, memberId: string): Promise<PUPPET.payloads.RoomMember> {
    log.verbose('PuppetBridge', 'roomMemberPayload(%s, %s)', roomId, memberId);

    const room = this.roomStore.get(roomId);
    if (!room) throw new Error('room not found');

    const member = room.members.find(member => member.id === memberId);
    if (!member) throw new Error('member not found');

    return this.promiseWrap(() => member);
  }

  override roomMemberRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.RoomMember>;
  override roomMemberRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.RoomMember> {
    return this.promiseWrap(() => {
      return rawPayload;
    });
  }
  override roomMemberRawPayload(roomId: string, contactId: string): Promise<any>;
  override roomMemberRawPayload(roomId: string, contactId: string): Promise<any> {
    log.verbose('PuppetBridge', 'roomMemberRawPayload(%s, %s)', roomId, contactId);

    const room = this.roomStore.get(roomId);
    if (!room) return this.promiseWrap(() => null);

    const member = room.members.find(member => member.id === contactId);
    if (!member) return this.promiseWrap(() => null);

    return this.promiseWrap(() => member);
  }

  override roomMemberSearch(roomId: string, query: string | symbol | PUPPET.filters.RoomMember): Promise<string[]>;
  override roomMemberSearch(roomId: string, query: string | symbol | PUPPET.filters.RoomMember): Promise<string[]> {
    log.verbose('PuppetBridge', 'roomMemberSearch(%s, %s)', roomId, query);

    const room = this.roomStore.get(roomId);
    if (!room) throw new Error('room not found');

    const memberList = room.members;

    let members: string[] = [];

    if (typeof query === 'function') {
      members = memberList.filter(query).map(member => member.id);
    } else if (typeof query === 'object') {
      if (query.name) {
        members = memberList.filter(member => member.name === query.name).map(member => member.id);
      }
    } else if (typeof query === 'string') {
      members = memberList.filter(member => member.name === query).map(member => member.id);
    }

    return this.promiseWrap(() => members);
  }

  // Room ops --------------

  override async roomAdd(roomId: string, contactId: string): Promise<void>;
  override async roomAdd(roomId: string, contactId: string, inviterId?: string): Promise<void> {
    log.verbose('PuppetBridge', 'roomAdd(%s, %s, %s)', roomId, contactId, inviterId || '');

    // TODO: add contact to room

    return this.promiseWrap(() => {});
  }

  override async roomDel(roomId: string, contactId: string): Promise<void>;
  override async roomDel(roomId: string, contactId: string, reason?: string): Promise<void> {
    log.verbose('PuppetBridge', 'roomDel(%s, %s, %s)', roomId, contactId, reason || '');

    // TODO: remove contact from room

    return this.promiseWrap(() => {});
  }

  override async roomQuit(roomId: string): Promise<void>;
  override async roomQuit(roomId: string, reason?: string): Promise<void> {
    log.verbose('PuppetBridge', 'roomQuit(%s, %s)', roomId, reason || '');

    // TODO: remove self from room

    return this.promiseWrap(() => {});
  }

  // Room Invitation --------------

  override roomInvitationRawPayload(roomInvitationId: string): Promise<any>;
  override roomInvitationRawPayload(roomInvitationId: string): Promise<any> {
    log.verbose('PuppetBridge', 'roomInvitationRawPayload(%s)', roomInvitationId);
    return this.promiseWrap(() => null);
  }

  override roomInvitationRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.RoomInvitation>;
  override roomInvitationRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.RoomInvitation> {
    log.verbose('PuppetBridge', 'roomInvitationRawPayloadParser(%s)', JSON.stringify(rawPayload));
    return this.promiseWrap(() => rawPayload);
  }

  override roomInvitationAccept(roomInvitationId: string): Promise<void>;
  override roomInvitationAccept(roomInvitationId: string): Promise<void> {
    log.verbose('PuppetBridge', 'roomInvitationAccept(%s)', roomInvitationId);

    // TODO: accept room invitation

    return this.promiseWrap(() => {});
  }

  // Message --------------

  override messageRawPayload(messageId: string): Promise<any>;
  override messageRawPayload(messageId: string): Promise<any> {
    log.verbose('PuppetBridge', 'messageRawPayload(%s)', messageId);
    return this.promiseWrap(() => this.messageStore.get(messageId));
  }

  override messageRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.Message>;
  override messageRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.Message> {
    log.verbose('PuppetBridge', 'messageRawPayloadParser(%s)', JSON.stringify(rawPayload));
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

  override async messageContact(messageId: string): Promise<string>;
  override async messageContact(messageId: string): Promise<string> {
    log.verbose('PuppetBridge', 'messageContact(%s)', messageId);
    const message = this.messageStore.get(messageId);
    if (!message) throw new Error('message not found');
    return await xmlDecrypt(message.text || '', message.type || PUPPET.types.Message.Unknown);
  }

  override async messageImage(messageId: string, imageType: PUPPET.types.Image): Promise<FileBoxInterface>;
  override async messageImage(messageId: string, imageType: PUPPET.types.Image): Promise<FileBoxInterface> {
    log.verbose('PuppetBridge', 'messageImage(%s, %s)', messageId, imageType);

    const message = this.messageStore.get(messageId);
    if (!message) throw new Error('message not found');

    let base64 = '';
    let fileName = '';
    let imagePath = '';
    let file: FileBoxInterface;

    try {
      if (message?.text) {
        const picData = JSON.parse(message.text);
        const filePath = picData[imageType];
        const dataPath = this.rootPath + filePath;

        let fileExist = fs.existsSync(dataPath);
        let count = 0;
        while (!fileExist) {
          await delaySync(500);
          fileExist = fs.existsSync(dataPath);
          if (count > 20) {
            break;
          }
          count++;
        }

        await fsPromise.access(dataPath);

        const imageInfo = imageDecrypt(dataPath, messageId);

        log.verbose(dataPath, imageInfo.fileName, imageInfo.extension);

        base64 = imageInfo.base64;
        fileName = `message-${messageId}-url-${imageType}.${imageInfo.extension}`;
        file = FileBox.fromBase64(base64, fileName);

        const paths = dataPath.split('\\');
        paths[paths.length - 1] = fileName;
        imagePath = paths.join('\\');

        log.verbose('图片解密后文件路径：', imagePath, true);

        await file.toFile(imagePath);
      }
    } catch (err) {
      log.error('messageImage fail:', err);
    }
    return FileBox.fromBase64(base64, fileName);
  }

  override messageRecall(messageId: string): Promise<boolean>;
  override messageRecall(messageId: string): Promise<boolean> {
    log.verbose('PuppetBridge', 'messageRecall(%s)', messageId);

    throw new Error('not support message recall');
  }

  override async messageFile(messageId: string): Promise<FileBoxInterface>;
  override async messageFile(messageId: string): Promise<FileBoxInterface> {
    log.verbose('PuppetBridge', 'messageFile(%s)', messageId);

    const message = this.messageStore.get(messageId);
    if (!message) throw new Error('message not found');

    let dataPath = '';
    let fileName = '';

    if (message?.type === PUPPET.types.Message.Image) {
      return this.messageImage(messageId, PUPPET.types.Image.Thumbnail);
    }

    if (message?.type === PUPPET.types.Message.Attachment) {
      try {
        const parser = new xml2js.Parser();
        const messageJson = await parser.parseStringPromise(message.text || '');
        log.info('解析xml结果', JSON.stringify(messageJson));

        const curDate = new Date();
        const year = curDate.getFullYear();
        let month: any = curDate.getMonth() + 1;
        if (month < 10) {
          month = '0' + month;
        }

        fileName = '\\' + messageJson.msg.appmsg[0].title[0];
        const filePath = `${this.userInfo.id}\\FileStorage\\File\\${year}-${month}`;

        dataPath = this.rootPath + filePath + fileName; // 要解密的文件路径
        log.info('保存文件路径：', dataPath);

        return FileBox.fromFile(dataPath, fileName);
      } catch (err) {
        log.error('保存图片messageFile fail:', err);
      }
    }

    if (message?.type === PUPPET.types.Message.Emoticon && message.text) {
      const text = JSON.parse(message.text);
      try {
        try {
          fileName = text.md5 + '.png';
          return FileBox.fromUrl(text.cdnurl, { name: fileName });
        } catch (err) {
          log.error('messageFile fail:', err);
        }
      } catch (err) {
        log.error('messageFile fail:', err);
      }
    }

    if (
      [PUPPET.types.Message.Video, PUPPET.types.Message.Audio].includes(message?.type || PUPPET.types.Message.Unknown)
    ) {
      throw new Error('not support message Video/`Audio');
    }

    return FileBox.fromFile(dataPath, fileName);
  }

  override async messageUrl(messageId: string): Promise<PUPPET.payloads.UrlLink>;
  override async messageUrl(messageId: string): Promise<PUPPET.payloads.UrlLink> {
    log.verbose('PuppetBridge', 'messageUrl(%s)', messageId);

    const message = this.messageStore.get(messageId);
    if (!message) throw new Error('message not found');

    return await xmlDecrypt(message?.text || '', message?.type || PUPPET.types.Message.Unknown);
  }

  override async messageMiniProgram(messageId: string): Promise<PUPPET.payloads.MiniProgram>;
  override async messageMiniProgram(messageId: string): Promise<PUPPET.payloads.MiniProgram> {
    log.verbose('PuppetBridge', 'messageMiniProgram(%s)', messageId);

    const message = this.messageStore.get(messageId);
    if (!message) throw new Error('message not found');

    return await xmlDecrypt(message?.text || '', message?.type || PUPPET.types.Message.Unknown);
  }

  override async messageLocation(messageId: string): Promise<PUPPET.payloads.Location>;
  override async messageLocation(messageId: string): Promise<PUPPET.payloads.Location> {
    log.verbose('PuppetBridge', 'messageLocation(%s)', messageId);

    const message = this.messageStore.get(messageId);
    if (!message) throw new Error('message not found');

    return await xmlDecrypt(message?.text || '', message?.type || PUPPET.types.Message.Unknown);
  }

  private mentionTextParser(message: string): { mentions: string[]; message: string } {
    const mentionRegex = /@\[mention:([^\]]+)\]/g;
    const mentions = message.match(mentionRegex) || [];

    const mentionIds = mentions.map(mention => {
      const match = mention.match(/@\[mention:([^\]]+)\]/);
      return match && match.length > 1 ? match[1] : null;
    });

    const text = message.replace(mentionRegex, '').trim();

    return {
      mentions: mentionIds.filter(id => id) as string[],
      message: text
    };
  }

  private getMentionText(roomId: string, mentions: string[]) {
    let mentionText = '';

    if (mentions.length === 0) return mentionText;

    const chatroom = this.roomStore.get(roomId);
    if (!chatroom) throw new Error('chatroom not found');

    const chatroomMembers = chatroom.members;

    mentionText = mentions.reduce((acc, mentionId) => {
      chatroomMembers.filter(member => {
        if (member.id === mentionId) {
          acc += `@${member.name} `;
          return true;
        }
        return false;
      });

      return acc;
    }, '');

    return mentionText;
  }

  // Message Send --------------

  override async messageSendText(
    conversationId: string,
    text: string,
    mentionIdList?: string[] | undefined
  ): Promise<string | void>;
  override async messageSendText(
    conversationId: string,
    text: string,
    mentionIdList?: string[] | undefined
  ): Promise<string | void> {
    log.verbose('PuppetBridge', 'messageSendText(%s, %s, %s)', conversationId, text, mentionIdList);

    if (!conversationId.includes('@chatroom')) {
      log.info('messageSendText', 'normal text');
      await this.bridge.sendTextMsg(conversationId, text);
      return;
    }

    if (text.includes('@all')) {
      log.info('messageSendText', 'at all');
      text = text.replace('@all', '@所有人').trim();
      await this.bridge.sendTextMsg(conversationId, text, ['notify@all']);
    } else if (/@\[mention:([^\]]+)\]/g.test(text)) {
      log.info('messageSendText', 'at mention');
      const { mentions, message } = this.mentionTextParser(text);
      const mentionText = this.getMentionText(conversationId, mentions);
      await this.bridge.sendTextMsg(conversationId, `${mentionText} ${message}`, mentions);
    } else {
      log.info('messageSendText', 'normal text');
      await this.bridge.sendTextMsg(conversationId, text);
    }
  }

  override async messageSendFile(conversationId: string, file: FileBoxInterface): Promise<string | void>;
  override async messageSendFile(conversationId: string, file: FileBoxInterface): Promise<string | void> {
    log.verbose('PuppetBridge', 'messageSendFile(%s, %s)', conversationId, file);

    let filePath = path.resolve() + '\\downloads\\';
    createDirIfNotExist(filePath);

    filePath = filePath + '\\' + file.name;
    if (!fs.existsSync(filePath)) {
      try {
        await file.toFile(filePath);
      } catch (err) {
        log.error('file.toFile(filePath) fail:', err);
      }
    }

    if (file.type === FileBoxType.Url) {
      try {
        await this.bridge.sendImageMsg(conversationId, filePath);
      } catch (err) {
        log.error('messageSendImage fail:', err);
      }
    } else {
      try {
        await this.bridge.sendFileMsg(conversationId, filePath);
      } catch (err) {
        log.error('messageSendFile fail:', err);
        PUPPET.throwUnsupportedError(conversationId, file);
      }
    }

    removeFile(filePath);
  }

  override messageSendUrl(conversationId: string, urlLinkPayload: PUPPET.payloads.UrlLink): Promise<string | void>;
  override messageSendUrl(conversationId: string, urlLinkPayload: PUPPET.payloads.UrlLink): Promise<string | void> {
    log.verbose('PuppetBridge', 'messageSendUrl(%s, %s)', conversationId, urlLinkPayload);

    // TODO: send url

    return this.promiseWrap(() => {
      // throw new Error('not support messageSendUrl');
    });
  }

  override async messageSendContact(conversationId: string, contactId: string): Promise<string | void>;
  override async messageSendContact(conversationId: string, contactId: string): Promise<string | void> {
    log.verbose('PuppetBridge', 'messageSendContact(%s, %s)', conversationId, contactId);

    try {
      await this.bridge.sendContactMsg(conversationId, contactId);
    } catch (error) {
      log.error('messageSendContact fail:', error);
    }
  }

  override messageSendMiniProgram(
    conversationId: string,
    miniProgramPayload: PUPPET.payloads.MiniProgram
  ): Promise<string | void>;
  override messageSendMiniProgram(
    conversationId: string,
    miniProgramPayload: PUPPET.payloads.MiniProgram
  ): Promise<string | void> {
    log.verbose('PuppetBridge', 'messageSendMiniProgram(%s, %s)', conversationId, miniProgramPayload);

    // TODO: send mini program

    return this.promiseWrap(() => {
      // throw new Error('not support messageSendMiniProgram');
    });
  }

  override messageForward(conversationId: string, messageId: string): Promise<string | void>;
  override messageForward(conversationId: string, messageId: string): Promise<string | void> {
    log.verbose('PuppetBridge', 'messageForward(%s, %s)', conversationId, messageId);

    // TODO: forward message

    return this.promiseWrap(() => {
      // throw new Error('not support messageForward');
    });
  }

  override messageSendLocation(
    conversationId: string,
    locationPayload: PUPPET.payloads.Location
  ): Promise<string | void>;
  override messageSendLocation(
    conversationId: string,
    locationPayload: PUPPET.payloads.Location
  ): Promise<string | void> {
    log.verbose('PuppetBridge', 'messageSendLocation(%s, %s)', conversationId, locationPayload);

    // TODO: send location

    return this.promiseWrap(() => {
      // throw new Error('not support messageSendLocation');
    });
  }

  override messageSendPost(conversationId: string, postPayload: PUPPET.payloads.Post): Promise<string | void>;
  override messageSendPost(conversationId: string, postPayload: PUPPET.payloads.Post): Promise<string | void> {
    log.verbose('PuppetBridge', 'messageSendPost(%s, %s)', conversationId, postPayload);

    // TODO: send post

    return this.promiseWrap(() => {
      // throw new Error('not support messageSendPost');
    });
  }

  // Core --------------

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

  private async updateContactPayload(contact: PuppetContact, forceUpdate = false): Promise<void> {
    log.verbose('PuppetBridge', 'updateContactPayload()');

    if (!contact) return;

    const exist = this.contactStore.get(contact.id);
    if (exist && !forceUpdate) return;

    try {
      const contactInfo = await this.bridge.getContactInfo(contact.id);
      if (!contactInfo) return;

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
        } as PuppetContact;

        this.contactStore.set(contact.UserName, contactPayload);

        // async update contact payload
        this.updateContactPayload(contactPayload, true);
      }

      log.info('PuppetBridge', 'loadContacts() contacts count %s', this.contactStore.size);
    } catch (error) {
      log.error('PuppetBridge', 'loadContacts() exception %s', error.stack);
    }
  }

  private async updateRoomPayload(room: PuppetRoom, forceUpdate = false): Promise<void> {
    log.verbose('PuppetBridge', 'updateRoomPayload()');

    if (!room) return;

    const exist = this.roomStore.get(room.id);
    if (exist && !forceUpdate) return;

    try {
      const roomInfo = await this.bridge.getChatRoomInfo(room.id);
      if (!roomInfo) return;

      const { profile } = roomInfo;

      room.topic = profile.data.userName || '';
      room.avatar = profile.data.smallHeadImgUrl;

      const memebrsData = await this.bridge.getChatRoomMemberList(room.id);
      const members = memebrsData.members;

      room.ownerId = memebrsData.ownerUserName;
      room.adminIdList = memebrsData.chatroomAdminUserNames;
      room.memberIdList = members.map(member => member.userName);
      room.members = members.map(member => {
        return {
          id: member.userName,
          name: member.nickName,
          avatar: member.smallHeadImgUrl || member.bigHeadImgUrl
        } as RoomMember;
      });

      this.roomStore.set(room.id, room);
    } catch (error) {
      log.error('PuppetBridge', 'updateRoomPayload() exception %s', error.stack);
    }
  }

  private async loadRooms(): Promise<void> {
    log.verbose('PuppetBridge', 'loadRooms()');

    try {
      const roomsData = await this.bridge.getChatRoomDetailList();

      if (!roomsData || !roomsData.chatrooms) throw new Error('no rooms data');

      for (const room of roomsData.chatrooms) {
        const chatroomMembers = Object.values(room.chatroomMembers || {});

        const roomPayload = {
          id: room.userName,
          avatar: room.smallHeadImgUrl,
          external: false,
          ownerId: room.ownerUserName || '',
          adminIdList: chatroomMembers.filter(member => member.isChatroomAdmin).map(member => member.userName) || [],
          memberIdList: room.userNameList || [],
          members: chatroomMembers.map(member => ({
            id: member.userName,
            roomAlias: member.alias,
            avatar: member.smallHeadImgUrl,
            name: member.nickName
          })),
          topic: room.nickName || ''
        } as PuppetRoom;

        this.roomStore.set(room.userName, roomPayload);
      }

      log.info('PuppetBridge', 'loadRooms() rooms count %s', this.roomStore.size);
    } catch (error) {
      log.error('PuppetBridge', 'loadRooms() exception %s', error.stack);
    }
  }

  private async onLogin(user: User): Promise<void> {
    log.verbose('PuppetBridge', 'onLogin()');

    if (!user || this.userInfo) return;

    log.info('PuppetBridge', 'onLogin() user %s', jsonStringify(user));

    const userPayload = {
      id: user.userName,
      gender: user.sex,
      type: PUPPET.types.Contact.Individual,
      name: user.nickName,
      alias: user.alias,
      friend: false,
      city: user.city,
      province: user.province,
      signature: user.signature,
      phone: [user.phone],
      avatar: user.smallHeadImgUrl || user.bigHeadImgUrl
    } as Contact;

    this.userInfo = userPayload;

    // init contacts store
    await this.loadContacts();
    // init rooms store
    await this.loadRooms();

    // login
    this.login(userPayload.id);

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
    return (msg as RecvMsg)?.type !== null && (msg as RecvMsg)?.type !== undefined;
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

  private isRoomOps = (message: RecvMsg) => {
    return [10000, 10002].some(code => code === message.type.valueOf());
  };
  private getMemberByUserName = (userName: string, room: PuppetRoom, forceUpdate = false) => {
    const name = userName.split(/“|”|"/)[1] || '';
    const memebrs = room.members || [];
    const member = memebrs.find(member => member.name === name);
    return member;
  };
  private getOpsRelationship = (contactNames: string[], room: PuppetRoom, forceUpdate = false) => {
    let contact: PUPPET.payloads.Contact | undefined;

    const contactIds = [];

    if (contactNames[0] == '你') {
      contact = this.userInfo;
      const member = this.getMemberByUserName(contactNames[1], room, forceUpdate);
      if (member) {
        contactIds.push(member.id);
      }
    } else if (contactNames[1] === '你') {
      contactIds.push(this.userInfo.id);
      const member = this.getMemberByUserName(contactNames[0], room, forceUpdate);
      if (member) {
        contact = {
          id: member.id,
          name: member.name,
          avatar: member.avatar
        } as PUPPET.payloads.Contact;
      }
    } else {
      const opsMember = this.getMemberByUserName(contactNames[0], room, forceUpdate);
      if (opsMember) {
        contact = {
          id: opsMember.id,
          name: opsMember.name,
          avatar: opsMember.avatar
        } as PUPPET.payloads.Contact;
      }
      const member = this.getMemberByUserName(contactNames[1], room, forceUpdate);
      if (member) {
        contactIds.push(member.id);
      }
    }

    return {
      contact,
      contactIds
    };
  };

  private roomMsgHandler = async (message: Message) => {
    log.verbose('PuppetBridge', 'roomMsg()');

    log.info('PuppetBridge', 'roomMsg() message %s', jsonStringify(message));

    const { roomId, text } = message;
    if (!roomId) return;

    const room = this.roomStore.get(roomId);
    const memebrs = room?.members || [];
    if (!room) return;

    // "heora"修改群名为“wxbot1234”
    // 你修改群名为“wxbot1234”
    if (text?.includes('修改群名为')) {
      let topic = '';
      const oldTopic = room ? room.topic : '';
      const contactNames = text.split('修改群名为');

      let changer: PUPPET.payloads.Contact | undefined;

      log.info('PuppetBridge', 'roomMsg() contactNames %s', contactNames);

      if (contactNames[0]) {
        topic = contactNames[1]?.split(/“|”|"/)[1] || '';

        log.info('PuppetBridge', 'roomMsg() topic %s', topic);

        room.topic = topic;
        this.roomStore.set(roomId, room);

        if (contactNames[0] == '你') {
          changer = this.userInfo;
        } else {
          const member = this.getMemberByUserName(contactNames[0], room);
          if (member) {
            changer = {
              id: member.id,
              name: member.name,
              avatar: member.avatar
            } as PUPPET.payloads.Contact;
          }
        }

        this.emit('room-topic', { changerId: changer?.id, newTopic: topic, oldTopic, roomId });
      }
    }

    // 你将\"heora\"添加为群管理员
    // "heora"将\"彬 - Detail\"添加为群管理员
    if (text?.includes('添加为群管理员')) {
      const contactNames = text.split(/将|添加为群管理员/);

      if (contactNames.length > 2 && contactNames[0] && contactNames[1]) {
        const { contact, contactIds } = this.getOpsRelationship(contactNames, room);

        if (contact && contactIds.length > 0) {
          this.emit('room-admin', { adminIdList: contactIds, operatorId: contact.id, roomId });
        }
      }
    }

    // 你邀请\"彬 - Detail\"加入了群聊
    // "heora"邀请\"彬 - Detail"\加入了群聊
    if (text?.includes('加入了群聊')) {
      const contactNames = text.split(/邀请|加入了群聊/);

      if (contactNames.length > 2 && contactNames[0] && contactNames[1]) {
        const { contact, contactIds } = this.getOpsRelationship(contactNames, room, true);

        if (contact && contactIds.length > 0) {
          this.emit('room-join', { inviteeIdList: contactIds, inviterId: contact.id, roomId });
        }
      }
    }

    // 你将\"彬 - Detail\"移出了群聊
    if (text?.includes('移出了群聊')) {
      const contactNames = text.split(/将|移出了群聊/);

      if (contactNames.length > 2 && contactNames[0] && contactNames[1]) {
        const { contact, contactIds } = this.getOpsRelationship(contactNames, room);

        if (contact && contactIds.length > 0) {
          this.emit('room-leave', { removeeIdList: contactIds, removerId: contact.id, roomId });
        }
      }
    }
  };

  private async normalizedMsg(message: RecvMsg) {
    let type = PUPPET.types.Message.Unknown;
    let content = message.content;

    const code = message.type.valueOf();
    let subType = content.match(/<type>(\d+)<\/type>/)?.[1] ? String(content.match(/<type>(\d+)<\/type>/)?.[1]) : '0';

    switch (code) {
      case 1:
        type = PUPPET.types.Message.Text;
        break;
      case 3:
        type = PUPPET.types.Message.Image;
        content = JSON.stringify(['content.thumb', 'content.thumb', 'content.detail', 'content.thumb']);
        break;
      case 4:
        type = PUPPET.types.Message.Video;
        break;
      case 5:
        type = PUPPET.types.Message.Url;
        break;
      case 34:
        type = PUPPET.types.Message.Audio;
        break;
      case 37:
        type = PUPPET.types.Message.Contact;
        break;
      case 40:
        break;
      case 42:
        type = PUPPET.types.Message.Contact;
        break;
      case 43:
        type = PUPPET.types.Message.Video;
        break;
      case 47:
        type = PUPPET.types.Message.Emoticon;
        try {
          await new Promise((resolve, reject) => {
            readXml.read(content, function (errors: any, xmlResponse: any) {
              if (errors !== null) {
                log.error(errors);
                resolve(null);
                return;
              }
              const xml2json = xmlResponse.msg.emoji.attributes();
              content = JSON.stringify(xml2json);
              resolve(null);
            });
          });
        } catch (err) {
          log.error('xml2js.parseString fail:', err);
        }
        break;
      case 48:
        type = PUPPET.types.Message.Location;
        break;
      case 49:
        try {
          await new Promise(resolve => {
            xml2js.parseString(
              content,
              { explicitArray: false, ignoreAttrs: true },
              function (err: any, json: { msg: { appmsg: { type: string; title: string } } }) {
                log.error('PuppetBridge', 'xml2json err:%s', err);
                log.info('PuppetBridge', 'json content:%s', JSON.stringify(json));

                subType = json.msg.appmsg.type || subType;

                switch (subType) {
                  case '5': // card link
                    type = PUPPET.types.Message.Url;
                    break;
                  case '4':
                    type = PUPPET.types.Message.Url;
                    break;
                  case '1':
                    type = PUPPET.types.Message.Url;
                    break;
                  case '6': // file
                    type = PUPPET.types.Message.Attachment;
                    break;
                  case '19':
                    type = PUPPET.types.Message.ChatHistory;
                    break;
                  case '33':
                    type = PUPPET.types.Message.MiniProgram;
                    break;
                  case '87':
                    type = PUPPET.types.Message.GroupNote;
                    break;
                  case '2000':
                    type = PUPPET.types.Message.Transfer;
                    break;
                  case '2001':
                    type = PUPPET.types.Message.RedEnvelope;
                    break;
                  case '10002':
                    type = PUPPET.types.Message.Recalled;
                    break;
                  default:
                }

                resolve(null);
              }
            );
          });
        } catch (err) {
          log.error('xml2js.parseString fail:', err);
        }
        break;
      case 50:
        break;
      case 51:
        break;
      case 52:
        break;
      case 53:
        type = PUPPET.types.Message.GroupNote;
        break;
      case 62:
        break;
      case 9999:
        break;
      case 10000:
        // room event
        break;
      case 10002:
        type = PUPPET.types.Message.Recalled;
        break;
      case 1000000000:
        type = PUPPET.types.Message.Post;
        break;
      default:
    }

    return {
      content,
      type,
      subType
    };
  }
  private async msgHandler(message: RecvMsg): Promise<void> {
    const talkerId = message.talkerInfo?.userName;

    let roomId;

    if (message.from.includes('@chatroom')) {
      roomId = message.from;
      message.content = message.content.replace(`${talkerId}\n`, '');
    } else if (message.to.includes('@chatroom')) {
      roomId = message.to;
    }

    if (talkerId) {
      await this.updateContactPayload({
        id: talkerId
      } as PuppetContact);
    }

    const { content, type } = await this.normalizedMsg(message);

    const payload = {
      type,
      id: message?.msgSvrID.toString(),
      talkerId,
      text: content,
      listenerId: message.to,
      timestamp: Date.now(),
      fromId: message.from,
      toId: message.to,
      roomId
    } as Message;

    if (roomId && !this.roomStore.get(roomId)) {
      await this.updateRoomPayload({
        id: roomId
      } as PuppetRoom);
    }

    if (this.isRoomOps(message)) {
      this.roomMsgHandler(payload);
    } else {
      log.info('PuppetBridge', 'onMessage() message payload %s', jsonStringify(payload));
      this.messageStore.set(payload.id, payload);
      this.emit('message', { messageId: payload.id } as EventMessage);
    }
  }

  private async onMessage(message: RecvMsg | RecvScanMsg): Promise<void> {
    log.verbose('PuppetBridge', 'onMessage()');

    if (!message || !this.isReady) return;

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
