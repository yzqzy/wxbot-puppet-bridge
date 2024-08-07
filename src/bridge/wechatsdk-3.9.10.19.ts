import fs from 'fs';
import path from 'path';

import axios from 'axios';
import { FileBoxInterface, FileBox, FileBoxType } from 'file-box';

import * as PUPPET from 'wechaty-puppet';
import { log } from 'wechaty-puppet';
import type {
  EventError,
  EventScan,
  EventMessage,
  Message,
  Room,
  RoomMember,
  Contact,
  EventRoomInvite
} from 'wechaty-puppet/payloads';
import type { BridgeProtocol } from '@src/agents/wechatsdk-agent';

import { REPOS_URL } from '@src/config/config';
import Bridge from '@src/agents/wechatsdk-agent';
import { getDates, jsonStringify } from '@src/shared/tools';
import { RecvMsg, RecvScanMsg, User } from '@src/agents/wechatsdk-types';
import { ScanStatus } from 'wechaty-puppet/types';
import { createDirIfNotExist, getRootPath, removeFile, xmlToJson, xmlDecrypt } from '@src/shared';
import { normalizedMsg } from './transforms/message-parser';

const VERSION = '3.9.10.19';

interface PuppetOptions extends PUPPET.PuppetOptions {
  sidecarName?: string;
  apiUrl: string;
  protocol?: BridgeProtocol;
}

interface PuppetRoom extends Room {
  announce: string;
  members: RoomMember[];
}
interface PuppetContact extends Contact {
  tags: string[];
}

interface PuppetUser extends Contact {
  cachePath: string;
  dbKey: string;
  exePath: string;
}

class PuppetBridge extends PUPPET.Puppet {
  static override readonly VERSION = VERSION;

  private isReady: boolean = false;

  private bridge!: Bridge;

  private userInfo!: PuppetUser;

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

  get bridgeAgent(): Bridge {
    return this.bridge;
  }

  get userPath() {
    return this.userInfo.cachePath;
  }

  get userFilePath() {
    const { year, month } = getDates();
    return path.join(this.userPath, `FileStorage\\File\\${year}-${month}\\`);
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

  override contactSearch(
    query?: string | PUPPET.filters.Contact | undefined,
    searchIdList?: string[] | undefined
  ): Promise<string[]>;
  override contactSearch(
    query?: string | PUPPET.filters.Contact | undefined,
    searchIdList?: string[] | undefined
  ): Promise<string[]> {
    log.verbose('PuppetBridge', 'contactSearch(%s, %s)', query, searchIdList || '');

    const contactList = Array.from(this.contactStore.values());

    let contacts: string[] = [];

    if (typeof query === 'object') {
      if (query.name) {
        contacts = contactList.filter(contact => contact.name === query.name).map(contact => contact.id);
      } else if (query.alias) {
        contacts = contactList.filter(contact => contact.alias === query.alias).map(contact => contact.id);
      } else if (query.id) {
        contacts = contactList.filter(contact => contact.id === query.id).map(contact => contact.id);
      }
    } else if (typeof query === 'string') {
      contacts = contactList
        .filter(contact => contact.id === query || contact.name === query)
        .map(contact => contact.id);
    } else {
      contacts = contactList.map(contact => contact.id);
    }

    return this.promiseWrap(() => contacts);
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

  override async roomAvatar(roomId: string): Promise<FileBoxInterface> {
    log.verbose('PuppetBridge', 'roomAvatar(%s)', roomId);
    const payload = await this.roomPayload(roomId);
    if (payload.avatar) {
      return FileBox.fromUrl(payload.avatar);
    }
    return FileBox.fromUrl(REPOS_URL);
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
    } else {
      rooms = roomList.map(room => room.id);
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
    } else {
      members = memberList.map(member => member.id);
    }

    return this.promiseWrap(() => members);
  }

  // Room ops --------------

  override async roomTopic(roomId: string): Promise<string>;
  override async roomTopic(roomId: string, topic: string): Promise<void>;
  override async roomTopic(roomId: string, topic?: string | undefined): Promise<void | string> {
    log.verbose('PuppetBridge', 'roomTopic(%s, %s)', roomId, topic || '');

    const room = await this.getRoom(roomId);
    if (!room) {
      log.error('roomTopic: room not found');
      return;
    }

    if (!topic || typeof topic !== 'string') {
      return room.topic;
    }

    await this.bridge.modifyRoomTopic(roomId, topic);

    room.topic = topic;
    this.roomStore.set(roomId, room);

    return topic;
  }

  override async roomAnnounce(roomId: string): Promise<string>;
  override async roomAnnounce(roomId: string, text: string): Promise<void>;
  override async roomAnnounce(roomId: string, text?: string | undefined): Promise<void | string> {
    log.verbose('PuppetBridge', 'roomAnnounce(%s, %s)', roomId, text || '');

    const room = await this.getRoom(roomId);
    if (!room) {
      log.error('roomAnnounce: room not found');
      return;
    }

    if (!text || typeof text !== 'string') {
      return room.announce || '';
    }

    await this.bridge.modifyRoomAnnouncement(roomId, text);

    room.announce = text;
    this.roomStore.set(roomId, room);

    return text;
  }

  override async roomAdd(roomId: string, contactId: string): Promise<void>;
  override async roomAdd(roomId: string, contactId: string, inviterId?: string): Promise<void> {
    log.verbose('PuppetBridge', 'roomAdd(%s, %s, %s)', roomId, contactId, inviterId || '');

    if (!roomId || !contactId) {
      log.error('roomAdd: roomId or contactId not found');
      return;
    }

    log.info('roomAdd: %s, %s', roomId, contactId, inviterId);

    const memberList = await this.roomMemberList(roomId);

    if (memberList.includes(contactId)) {
      log.info('contact already in room');
      return;
    }

    if (memberList.length > 40) {
      await this.bridge.inviteRoomMembers(roomId, [contactId]);
      log.info('roomAdd success, invite room member');
      return;
    }

    await this.bridge.addRoomMembers(roomId, [contactId]);
    log.info('roomAdd success, add room member');
  }

  override async roomDel(roomId: string, contactId: string): Promise<void>;
  override async roomDel(roomId: string, contactId: string, reason?: string): Promise<void> {
    log.verbose('PuppetBridge', 'roomDel(%s, %s, %s)', roomId, contactId, reason || '');

    if (!roomId || !contactId) {
      log.error('roomDel: roomId or contactId not found');
      return;
    }

    log.info('roomDel: %s, %s', roomId, contactId, reason);

    await this.bridge.removeRoomMembers(roomId, [contactId]);

    log.info('roomDel success');
  }

  override async roomQuit(roomId: string): Promise<void>;
  override async roomQuit(roomId: string, reason?: string): Promise<void> {
    log.verbose('PuppetBridge', 'roomQuit(%s, %s)', roomId, reason || '');

    log.info('roomQuit: %s, %s', roomId, reason);

    if (!roomId) {
      log.error('roomQuit: roomId not found');
      return;
    }

    log.info('roomQuit: %s', roomId);

    await this.bridge.quitRoom(roomId);

    log.info('roomQuit success');
  }

  override async roomCreate(contactIds: string[], topic?: string | undefined): Promise<string> {
    log.verbose('PuppetBridge', 'roomCreate(%s, %s)', contactIds, topic || '');

    log.info('roomCreate: %s, %s', contactIds, topic || '');

    const roomId = await this.createRoom(contactIds);
    if (!roomId) return '';

    if (topic) {
      await this.roomTopic(roomId, topic);
    }

    await this.updateRoomPayload({
      id: roomId
    } as PuppetRoom);

    return roomId;
  }

  async createRoom(contactIds: string[]): Promise<string> {
    log.verbose('PuppetBridge', 'createRoom(%s)', contactIds);

    const data = await this.bridge.createRoom(contactIds);
    if (!data) return '';

    const roomId = data.data.chatroomUserName;

    log.info('createRoom success: %s', data.data.chatroomUserName);

    return roomId;
  }

  async deleteRoom(roomId: string): Promise<void> {
    log.verbose('PuppetBridge', 'roomDelete(%s)', roomId);

    log.info('roomDelete: %s', roomId);

    await this.bridge.destoryRoom(roomId);

    log.info('roomDelete success');
  }

  // Room Invitation --------------

  override roomInvitationRawPayload(roomInvitationId: string): Promise<any>;
  override roomInvitationRawPayload(roomInvitationId: string): Promise<any> {
    log.verbose('PuppetBridge', 'roomInvitationRawPayload(%s)', roomInvitationId);
    return this.promiseWrap(() => this.messageStore.get(roomInvitationId));
  }

  override roomInvitationRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.RoomInvitation>;
  override roomInvitationRawPayloadParser(rawPayload: any): Promise<PUPPET.payloads.RoomInvitation> {
    log.verbose('PuppetBridge', 'roomInvitationRawPayloadParser(%s)', JSON.stringify(rawPayload));
    return this.promiseWrap(() => rawPayload);
  }

  override async roomInvitationAccept(roomInvitationId: string): Promise<void>;
  override async roomInvitationAccept(roomInvitationId: string): Promise<void> {
    log.verbose('PuppetBridge', 'roomInvitationAccept(%s)', roomInvitationId);

    const message = this.messageStore.get(roomInvitationId);
    if (!message) throw new Error('message not found');

    const content = await xmlDecrypt(message.text || '', message.type);
    if (!content) throw new Error('content not found');

    const url = content?.url as string;
    if (!url) throw new Error('url not found');

    try {
      const isLink = message.type === 5;

      const data = await this.bridge.roomInvitation(url, isLink ? 0 : 1);
      const confrmUrl = data.data.url;

      const headers = {
        Host: 'support.weixin.qq.com',
        Connection: 'keep-alive',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1',
        Origin: 'https://support.weixin.qq.com',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) WindowsWechat(0x63090a13) XWEB/9185',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
        Referer: confrmUrl,
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Length': '0'
      };

      await axios.get(confrmUrl, { headers: isLink ? {} : headers });

      log.info('roomInvitationAccept success');
    } catch (error) {
      log.error('roomInvitationAccept fail:', error);
    }
  }

  // Tag --------------

  override async tagContactAdd(tagId: string, contactId: string): Promise<void>;
  override async tagContactAdd(tagId: string, contactId: string): Promise<void> {
    log.verbose('PuppetBridge', 'tagContactAdd(%s, %s)', tagId, contactId);

    if (!tagId || !contactId) {
      log.error('tagContactAdd: tagId or contactId not found');
      return;
    }

    const contact = this.contactStore.get(contactId);
    if (!contact) {
      log.error('tagContactAdd: contact not found');
      return;
    }

    const tags = contact.tags || [];

    if (tags.includes(tagId)) {
      log.info('contact already in tag');
      return;
    }

    tags.push(tagId);
    this.contactStore.set(contactId, { ...contact, tags });

    await this.bridge.modifyTagMember(tags, contactId);

    log.info('tagContactAdd success');
  }

  override async tagContactRemove(tagId: string, contactId: string): Promise<void>;
  override async tagContactRemove(tagId: string, contactId: string): Promise<void> {
    log.verbose('PuppetBridge', 'tagContactRemove(%s, %s)', tagId, contactId);

    if (!tagId || !contactId) {
      log.error('tagContactRemove: tagId or contactId not found');
      return;
    }

    const contact = this.contactStore.get(contactId);
    if (!contact) {
      log.error('tagContactRemove: contact not found');
      return;
    }

    const tags = contact.tags || [];

    if (!tags.includes(tagId)) {
      log.info('contact not in tag');
      return;
    }

    tags.splice(tags.indexOf(tagId), 1);
    this.contactStore.set(contactId, { ...contact, tags });

    await this.bridge.modifyTagMember(tags, contactId);

    log.info('tagContactRemove success');
  }

  override async tagContactList(contactId?: string): Promise<string[]>;
  override async tagContactList(contactId?: string): Promise<string[]> {
    log.verbose('PuppetBridge', 'tagContactList(%s)', contactId);

    log.info('tagContactList: ', contactId);

    if (contactId) {
      return this.contactStore.get(contactId)?.tags || [];
    }

    const data = await this.bridge.tagList();
    const labels = data.labels.map(tag => tag.labelId);

    return labels.map(String);
  }

  override async tagContactDelete(tagId: string): Promise<void>;
  override async tagContactDelete(tagId: string): Promise<void> {
    log.verbose('PuppetBridge', 'tagContactDelete(%s)', tagId);

    await this.deleteTag(tagId);
  }

  async createTag(name: string): Promise<string> {
    const data = await this.bridge.addTag(name);

    if (!data) return '';

    log.info('createTag success: ', jsonStringify(data.data));

    return String(data.data.labelId);
  }

  async deleteTag(tagId: string): Promise<void>;
  async deleteTag(tagId: string): Promise<void> {
    log.verbose('PuppetBridge', 'tagDelete(%s)', tagId);

    if (!tagId) {
      log.error('tagDelete: tagId not found');
      return;
    }

    await this.bridge.removeTag(tagId);

    this.mapValues(this.contactStore).forEach(contact => {
      if (contact.tags && contact.tags.includes(tagId)) {
        contact.tags.splice(contact.tags.indexOf(tagId), 1);
        this.contactStore.set(contact.id, contact);
      }
    });

    log.info('tagDelete success');
  }

  async getTagMemberList(tagId: string): Promise<string[]>;
  async getTagMemberList(tagId: string): Promise<string[]> {
    log.verbose('PuppetBridge', 'tagMemberList(%s)', tagId);

    return this.getTagContacts(tagId);
  }

  private getTagContacts(labelId: string) {
    const contactIds: string[] = [];

    this.mapValues(this.contactStore).forEach(contact => {
      if (contact.tags && contact.tags.includes(labelId)) {
        contactIds.push(contact.id);
      }
    });

    return contactIds;
  }

  async getTags(): Promise<{ id: string; name: string; ids: string[] }[]>;
  async getTags(): Promise<{ id: string; name: string; ids: string[] }[]> {
    log.verbose('PuppetBridge', 'tags()');

    const data = await this.bridge.tagList();
    const labels = data.labels;

    return labels.map(label => {
      const labelId = String(label.labelId);
      return {
        id: labelId,
        name: label.title,
        ids: this.getTagContacts(labelId)
      };
    });
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

  private getImageFileConfig(imageType: PUPPET.types.Image) {
    if (imageType === PUPPET.types.Image.Thumbnail) {
      return {
        fileType: 3,
        attr: 'cdnthumburl',
        suffix: 'thumb'
      };
    }
    if (imageType === PUPPET.types.Image.HD) {
      return {
        fileType: 2,
        attr: 'cdnmidimgurl',
        suffix: 'hd'
      };
    }
    return {
      fileType: 1,
      attr: 'cdnbigimgurl',
      suffix: 'normal'
    };
  }

  override async messageImage(messageId: string, imageType: PUPPET.types.Image): Promise<FileBoxInterface>;
  override async messageImage(messageId: string, imageType: PUPPET.types.Image): Promise<FileBoxInterface> {
    log.verbose('PuppetBridge', 'messageImage(%s, %s)', messageId, imageType);

    const message = this.messageStore.get(messageId);
    if (!message) throw new Error('message not found');

    try {
      const content = await xmlToJson(message.text || '', { mergeAttrs: true, explicitArray: false });

      const { fileType, suffix, attr } = this.getImageFileConfig(imageType);

      const aeskey = content['msg']['img']['aeskey'];
      const cdnUrl = content['msg']['img'][attr] || content['msg']['img']['cdnmidimgurl'];

      const fileName = `message_${aeskey}_${suffix}.png`;

      const savePath = this.userFilePath + fileName;

      createDirIfNotExist(this.userFilePath);

      if (!fs.existsSync(savePath)) {
        await this.bridge.cdnDownload({
          fileid: cdnUrl,
          aeskey,
          fileType,
          savePath
        });
      }

      return FileBox.fromFile(savePath, fileName);
    } catch (error) {
      console.log('messageImage', error);
    }

    return FileBox.fromUrl(REPOS_URL);
  }

  override messageRecall(messageId: string): Promise<boolean>;
  override messageRecall(messageId: string): Promise<boolean> {
    log.verbose('PuppetBridge', 'messageRecall(%s)', messageId);

    throw new Error('not support message recall');
  }

  private async getMessageFileBox(message: PUPPET.payloads.Message): Promise<FileBoxInterface> {
    log.verbose('PuppetBridge', 'messageFileBox(%s)', message.id);

    const CnfigMapping = {
      [PUPPET.types.Message.Video]: {
        attr: 'videomsg',
        suffix: '.mp4',
        fileTye: 4
      },
      [PUPPET.types.Message.Audio]: {
        attr: 'voicemsg',
        suffix: '.slik',
        fileTye: 15
      }
    } as Record<PUPPET.types.Message, { attr: string; suffix: string; fileTye: number }>;
    const config = CnfigMapping[message.type];

    try {
      const content = await xmlToJson(message.text || '', { mergeAttrs: true, explicitArray: false });

      const aeskey = content['msg'][config.attr]['aeskey'];
      const cdnUrl = content['msg'][config.attr]['cdnvideourl'];

      const fileName = `message_${aeskey}${config.suffix}`;
      const savePath = this.userFilePath + fileName;

      createDirIfNotExist(this.userFilePath);

      if (!fs.existsSync(savePath)) {
        await this.bridge.cdnDownload({
          fileid: cdnUrl,
          aeskey,
          fileType: config.fileTye,
          savePath
        });
      }

      return FileBox.fromFile(savePath, fileName);
    } catch (error) {
      console.log('getMessageFileBox', error);
    }

    return FileBox.fromUrl(REPOS_URL);
  }

  private async getMessageAttachment(message: PUPPET.payloads.Message): Promise<FileBoxInterface> {
    log.verbose('PuppetBridge', 'getMessageAttachment(%s)', message.id);

    try {
      const content = await xmlToJson(message.text || '', { ignoreAttrs: true, explicitArray: false });

      const title = content['msg']['appmsg']['title'];
      const totallen = content['msg']['appmsg']['appattach']['totallen'];
      const aeskey = content['msg']['appmsg']['appattach']['aeskey'];
      const cdnUrl = content['msg']['appmsg']['appattach']['cdnattachurl'];

      const fileName = `message_${aeskey}_${title}`;
      const savePath = this.userFilePath + fileName;

      createDirIfNotExist(this.userFilePath);

      if (!fs.existsSync(savePath)) {
        await this.bridge.cdnDownload({
          fileid: cdnUrl,
          aeskey,
          fileType: totallen > 26214400 ? 7 : 5,
          savePath
        });
      }

      return FileBox.fromFile(savePath, fileName);
    } catch (error) {
      console.log('getMessageAttachment', error);
    }

    return FileBox.fromUrl(REPOS_URL);
  }

  private async getMessageEmoticon(message: PUPPET.payloads.Message): Promise<FileBoxInterface> {
    log.verbose('PuppetBridge', 'messageEmoticon(%s)', message.id);

    try {
      const content = await xmlToJson(message.text || '', { mergeAttrs: true, explicitArray: false });

      const aeskey = content['msg']['emoji']['aeskey'];
      const cdnUrl = content['msg']['emoji']['cdnurl'];

      const emoticonBox = FileBox.fromUrl(cdnUrl, {
        name: `message_${aeskey}.png`
      });

      emoticonBox.metadata = {
        payload: content,
        type: 'emoticon'
      };

      return emoticonBox;
    } catch (error) {
      console.log('messageEmoticon', error);
    }

    return FileBox.fromUrl(REPOS_URL);
  }

  override async messageFile(messageId: string): Promise<FileBoxInterface>;
  override async messageFile(messageId: string): Promise<FileBoxInterface> {
    log.verbose('PuppetBridge', 'messageFile(%s)', messageId);

    const message = this.messageStore.get(messageId);
    if (!message) throw new Error('message not found');

    if (message?.type === PUPPET.types.Message.Image) {
      return this.messageImage(messageId, PUPPET.types.Image.HD);
    }

    if (message.type === PUPPET.types.Message.Emoticon) {
      return this.getMessageEmoticon(message);
    }

    if (message.type === PUPPET.types.Message.Video || message.type === PUPPET.types.Message.Audio) {
      return this.getMessageFileBox(message);
    }

    if (message.type === PUPPET.types.Message.Attachment) {
      return this.getMessageAttachment(message);
    }

    log.info(`messageFile unknown type: ${message.type}`);

    return FileBox.fromUrl(REPOS_URL);
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

    createDirIfNotExist(this.userFilePath);

    const filePath = this.userFilePath + file.name;
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

    console.log('messageSendUrl', conversationId);
    console.log('messageSendUrl', urlLinkPayload);

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
      contact.tags = contactInfo?.labelIds.map(id => String(id)) || [];

      this.contactStore.set(contact.id, contact);
    } catch (error) {}
  }

  private mapValues(map: Map<any, any>) {
    return [...map.values()];
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
      }

      const updateContactPromises = this.mapValues(this.contactStore).map(contact => {
        return this.updateContactPayload(contact, true);
      });
      let size = updateContactPromises.length;

      // update contact payload in batch
      while (size > 0) {
        await Promise.all(updateContactPromises.splice(0, 15));
        size = updateContactPromises.length;
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

      room.ownerId = roomInfo.ownerUserName || '';
      room.announce = roomInfo.announcement || '';
      room.topic = profile.data.userName || '';
      room.avatar = profile.data.smallHeadImgUrl;

      const membersData = await this.bridge.getChatRoomMemberList(room.id);
      const members = membersData.members;

      room.adminIdList = membersData.chatroomAdminUserNames;
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
          announce: room.announcement || '',
          topic: room.nickName || '',
          adminIdList: chatroomMembers.filter(member => member.isChatroomAdmin).map(member => member.userName) || [],
          memberIdList: room.userNameList || [],
          members: chatroomMembers.map(member => ({
            id: member.userName,
            roomAlias: member.alias,
            avatar: member.smallHeadImgUrl,
            name: member.nickName
          }))
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
      avatar: user.smallHeadImgUrl || user.bigHeadImgUrl,
      cachePath: user.cachePath,
      dbKey: user.dbKey,
      exePath: user.exePath
    } as PuppetUser;

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
    const type = message.type.valueOf();
    return [10000, 10002].some(code => code === type);
  };
  private isInviteMsg = (message: Message) => {
    const type = message.type.valueOf();
    return type === 14 && message.text?.includes('邀请你加入群聊');
  };
  private findMemberByName = (name: string, room: PuppetRoom) => {
    const members = room.members || [];
    return members.find(member => member.name === name);
  };
  private findMemberByUserName = async (userName: string, room: PuppetRoom) => {
    const name = userName.split(/“|”|"/)[1] || '';

    if (!this.findMemberByName(name, room)) {
      await this.updateRoomPayload(room, true);
    }

    return this.findMemberByName(name, room);
  };
  private getOpsRelationship = async (contactNames: string[], room: PuppetRoom) => {
    let contact: PUPPET.payloads.Contact | undefined;

    const contactIds = [];

    if (contactNames[0] == '你') {
      contact = this.userInfo;
      const member = await this.findMemberByUserName(contactNames[1], room);
      if (member) {
        contactIds.push(member.id);
      }
    } else if (contactNames[1] === '你') {
      contactIds.push(this.userInfo.id);
      const member = await this.findMemberByUserName(contactNames[0], room);
      if (member) {
        contact = {
          id: member.id,
          name: member.name,
          avatar: member.avatar
        } as PUPPET.payloads.Contact;
      }
    } else {
      const opsMember = await this.findMemberByUserName(contactNames[0], room);
      if (opsMember) {
        contact = {
          id: opsMember.id,
          name: opsMember.name,
          avatar: opsMember.avatar
        } as PUPPET.payloads.Contact;
      }
      const member = await this.findMemberByUserName(contactNames[1], room);
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
          const member = await this.findMemberByUserName(contactNames[0], room);
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
        const { contact, contactIds } = await this.getOpsRelationship(contactNames, room);

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
        const { contact, contactIds } = await this.getOpsRelationship(contactNames, room);

        if (contact && contactIds.length > 0) {
          this.emit('room-join', { inviteeIdList: contactIds, inviterId: contact.id, roomId });
        }
      }
    }

    // 你将\"彬 - Detail\"移出了群聊
    if (text?.includes('移出了群聊')) {
      const contactNames = text.split(/将|移出了群聊/);

      if (contactNames.length > 2 && contactNames[0] && contactNames[1]) {
        const { contact, contactIds } = await this.getOpsRelationship(contactNames, room);

        if (contact && contactIds.length > 0) {
          this.emit('room-leave', { removeeIdList: contactIds, removerId: contact.id, roomId });
        }
      }
    }
  };

  private inviteMsgHandler = (message: Message) => {
    log.verbose('PuppetBridge', 'inviteMsg()');

    log.info('PuppetBridge', 'inviteMsg() message %s', jsonStringify(message));

    this.emit('room-invite', {
      roomInvitationId: message.id
    } as EventRoomInvite);
  };

  // Message Parser

  private async msgHandler(message: RecvMsg): Promise<void> {
    let roomId = '';
    let talkerId = '';
    let listenerId = '';

    if (message.from.includes('@chatroom')) {
      const contentArr = message.content.split(':\n');
      roomId = message.from;
      talkerId = contentArr.length > 1 ? contentArr[0] : '';
      message.content = message.content.replace(`${talkerId}:\n`, '');
    } else if (message.to.includes('@chatroom')) {
      talkerId = message.from;
      roomId = message.to;
    } else {
      talkerId = message.from;
      listenerId = message.to;
    }

    if (talkerId) {
      await this.updateContactPayload({
        id: talkerId
      } as PuppetContact);
    }
    if (listenerId) {
      await this.updateContactPayload({
        id: listenerId
      } as PuppetContact);
    }

    const { content, type } = await normalizedMsg(message);

    const payload = {
      type,
      id: message?.msgSvrID.toString(),
      text: content,
      talkerId,
      listenerId: roomId ? '' : listenerId,
      timestamp: Date.now(),
      roomId
    } as Message;

    if (roomId && !this.roomStore.get(roomId)) {
      await this.updateRoomPayload({
        id: roomId
      } as PuppetRoom);
    }

    if (this.isRoomOps(message)) {
      this.roomMsgHandler(payload);
    } else if (this.isInviteMsg(payload)) {
      this.inviteMsgHandler(payload);
      this.messageStore.set(payload.id, payload);
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
