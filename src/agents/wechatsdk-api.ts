import axios from 'axios';
import {
  ChatRoom,
  ChatRoomInfo,
  ChatRoomMembers,
  Contact,
  ContactInfo,
  DataResult,
  MessageResult,
  Result,
  User,
  LocationParams,
  NormalResult,
  ChatRoomDetail,
  ChatRoomMember,
  Tag
} from './wechatsdk-types';

interface WeChatSdkApiOptions {
  apiUrl: string;
}

class Request {
  private apiUrl: string;
  private axiosIns!: any;

  constructor(options: WeChatSdkApiOptions) {
    this.apiUrl = options.apiUrl;

    this.axiosIns = axios.create({
      baseURL: this.apiUrl,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async post<T>(url: string, data: any): Promise<Result<T>> {
    const res = await this.axiosIns.post(url, data);
    return res.data;
  }

  async get<T>(url: string): Promise<Result<T>> {
    const res = await this.axiosIns.get(url);
    return res.data;
  }
}

class WeChatSdkApi {
  private request: Request;

  constructor(options: WeChatSdkApiOptions) {
    this.request = new Request(options);
  }

  qrcode() {
    return this.request.post<{
      desc: string;
      qrcode: Buffer;
      status: number;
      uuid: string;
    }>('/api/', { type: 0 });
  }

  userInfo() {
    return this.request.post<DataResult<User>>('/api/', { type: 28 });
  }

  contactList() {
    return this.request.post<DataResult<Contact[]>>('/api/', {
      type: 10058,
      dbName: 'MicroMsg.db',
      sql: `SELECT UserName,Remark,NickName,PYInitial,RemarkPYInitial,t2.smallHeadImgUrl FROM Contact t1 LEFT JOIN ContactHeadImgUrl t2 ON t1.UserName = t2.usrName WHERE t1.VerifyFlag = 0 AND (t1.Type = 3 OR t1.Type > 50) and t1.Type != 2050 AND t1.UserName NOT IN ('qmessage', 'tmessage') AND t1.UserName NOT LIKE '%chatroom%' ORDER BY t1.Remark DESC;`
    });
  }

  contactInfo(userName: string) {
    return this.request.post<DataResult<ContactInfo>>('/api/', {
      type: 10015,
      userName
    });
  }

  chatroomDetailList() {
    return this.request.post<
      DataResult<{
        chatrooms: ChatRoomDetail[];
        count: number;
      }>
    >('/api/', {
      type: 10114
    });
  }

  chatroomList() {
    return this.request.post<DataResult<ChatRoom[]>>('/api/', {
      type: 10058,
      dbName: 'MicroMsg.db',
      sql: `SELECT UserName,Remark, NickName,PYInitial,RemarkPYInitial,Type FROM Contact t1 WHERE t1.Type in(2,2050) OR (t1.Type = 3 AND t1.UserName LIKE '%chatroom%')`
    });
  }

  chatroomInfo(userName: string) {
    return this.request.post<DataResult<ChatRoomInfo>>('/api/', {
      type: 30,
      chatroomUserName: userName
    });
  }

  chatroomMembers(userName: string) {
    return this.request.post<DataResult<ChatRoomMembers>>('/api/', {
      type: 31,
      chatroomUserName: userName
    });
  }

  createChatRoom(userNames: string[]) {
    return this.request.post<
      DataResult<{
        chatroomUserName: string;
        memberCount: number;
        members: ChatRoomMember[];
      }>
    >('/api/', {
      type: 45,
      userNames
    });
  }

  destoryChatRoom(chatroomUserName: string) {
    return this.request.post<NormalResult>('/api/', {
      type: 52,
      chatroomUserName
    });
  }

  transferChatRoomOwner(userName: string, chatroomUserName: string) {
    return this.request.post<NormalResult>('/api/', {
      type: 51,
      userName,
      chatroomUserName
    });
  }

  quitChatRoom(chatroomUserName: string) {
    return this.request.post<NormalResult>('/api/', {
      type: 10028,
      chatroomUserName
    });
  }

  modifyChatRoomName(chatroomUserName: string, chatroomName: string) {
    return this.request.post<NormalResult>('/api/', {
      type: 10023,
      chatroomUserName,
      chatroomName
    });
  }

  modifyChatRoomAnnouncement(chatroomUserName: string, announcement: string) {
    return this.request.post<NormalResult>('/api/', {
      type: 10052,
      chatroomUserName,
      announcement
    });
  }

  addChatRoomMembers(chatroomUserName: string, userNames: string[]) {
    return this.request.post<NormalResult>('/api/', {
      type: 32,
      chatroomUserName,
      userNames
    });
  }

  removeChatRoomMembers(chatroomUserName: string, userNames: string[]) {
    return this.request.post<NormalResult>('/api/', {
      type: 33,
      chatroomUserName,
      userNames
    });
  }

  inviteChatRoomMembers(chatroomUserName: string, userNames: string[]) {
    return this.request.post<NormalResult>('/api/', {
      type: 79,
      chatroomUserName,
      userNames
    });
  }

  addChatRoomManager(userName: string, chatroomUserName: string) {
    return this.request.post<NormalResult>('/api/', {
      type: 49,
      userName,
      chatroomUserName
    });
  }

  removeChatRoomManager(userName: string, chatroomUserName: string) {
    return this.request.post<NormalResult>('/api/', {
      type: 50,
      userName,
      chatroomUserName
    });
  }

  chatRoomInvitation(url: string, inviteType: 0 | 1) {
    return this.request.post<
      DataResult<{
        url: string;
      }>
    >('/api/', {
      type: 10089,
      url,
      inviteType
    });
  }

  tagsList() {
    return this.request.post<
      DataResult<{
        count: number;
        labels: Tag[];
      }>
    >('/api/', {
      type: 36
    });
  }

  addTag(title: string) {
    return this.request.post<DataResult<Tag>>('/api/', {
      type: 37,
      title
    });
  }

  modifyTag(labelId: number, newTitle: string) {
    return this.request.post<NormalResult>('/api/', {
      type: 39,
      labelId,
      newTitle
    });
  }

  removeTag(labelId: number) {
    return this.request.post<NormalResult>('/api/', {
      type: 38,
      labelId
    });
  }

  modifyTagMember(userName: string, labelIds: number[]) {
    return this.request.post<NormalResult>('/api/', {
      type: 40,
      userName,
      labelIds
    });
  }

  sendText(userName: string, content: string, atUserList: string[] = []) {
    return this.request.post<MessageResult>('/api/', {
      type: 10009,
      userName,
      msgContent: content,
      atUserList
    });
  }

  sendImage(userName: string, filePath: string) {
    return this.request.post<MessageResult>('/api/', {
      type: 10010,
      userName,
      filePath
    });
  }

  sendFile(userName: string, filePath: string) {
    return this.request.post<MessageResult>('/api/', {
      type: 10012,
      userName,
      filePath
    });
  }

  sendContact(userName: string, beSharedUserName: string) {
    return this.request.post<MessageResult>('/api/', {
      type: 10037,
      userName,
      beSharedUserName
    });
  }

  sendPublicAccount(userName: string, bizUserName: string) {
    return this.request.post<MessageResult>('/api/', {
      type: 10107,
      userName,
      bizUserName
    });
  }

  sendBusinessUsers(userName: string, openimUserName: string) {
    return this.request.post<MessageResult>('/api/', {
      type: 10110,
      userName,
      openimUserName
    });
  }

  sendPat(userName: string, chatroomUserName: string) {
    return this.request.post<MessageResult>('/api/', {
      type: 57,
      userName,
      chatroomUserName
    });
  }

  sendEmoji(userName: string, emojiPath: string) {
    return this.request.post<MessageResult>('/api/', {
      type: 10011,
      userName,
      emojiPath
    });
  }

  sendLink(userName: string, content: string) {
    return this.request.post<MessageResult>('/api/', {
      type: 10092,
      userName,
      content
    });
  }

  sendLocation(location: LocationParams) {
    return this.request.post<MessageResult>('/api/', Object.assign({ type: 10022 }, location));
  }

  hook(protocol: number, url: string) {
    return this.request.post<{
      cookie: string;
      desc: string;
      status: number;
    }>('/api/', { type: 1001, protocol, url });
  }

  unhook(cookie: string) {
    return this.request.post('/api/', { type: 1002, cookie });
  }

  logout() {
    return this.request.post('/api/', { type: 81 });
  }
}

export default WeChatSdkApi;
