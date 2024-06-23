import axios from 'axios';
import {
  ChatRoom,
  ChatRoomInfo,
  ChatRoomMembers,
  Contact,
  ContactInfo,
  DataResult,
  Result,
  User
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
  private reqest: Request;

  constructor(options: WeChatSdkApiOptions) {
    this.reqest = new Request(options);
  }

  qrcode() {
    return this.reqest.post<{
      desc: string;
      qrcode: Buffer;
      status: number;
      uuid: string;
    }>('/api/', { type: 0 });
  }

  userInfo() {
    return this.reqest.post<DataResult<User>>('/api/', { type: 28 });
  }

  contactList() {
    return this.reqest.post<DataResult<Contact[]>>('/api/', {
      type: 10058,
      dbName: 'MicroMsg.db',
      sql: `SELECT UserName,Remark,NickName,PYInitial,RemarkPYInitial,t2.smallHeadImgUrl FROM Contact t1 LEFT JOIN ContactHeadImgUrl t2 ON t1.UserName = t2.usrName WHERE t1.VerifyFlag = 0 AND (t1.Type = 3 OR t1.Type > 50) and t1.Type != 2050 AND t1.UserName NOT IN ('qmessage', 'tmessage') AND t1.UserName NOT LIKE '%chatroom%' ORDER BY t1.Remark DESC;`
    });
  }

  contactInfo(userName: string) {
    return this.reqest.post<DataResult<ContactInfo>>('/api/', {
      type: 10015,
      userName
    });
  }

  chatroomList() {
    return this.reqest.post<DataResult<ChatRoom[]>>('/api/', {
      type: 10058,
      dbName: 'MicroMsg.db',
      sql: `SELECT UserName,Remark, NickName,PYInitial,RemarkPYInitial,Type FROM Contact t1 WHERE t1.Type in(2,2050) OR (t1.Type = 3 AND t1.UserName LIKE '%chatroom%')`
    });
  }

  chatroomInfo(userName: string) {
    return this.reqest.post<DataResult<ChatRoomInfo>>('/api/', {
      type: 30,
      chatroomUserName: userName
    });
  }

  chatroomMembers(userName: string) {
    return this.reqest.post<DataResult<ChatRoomMembers>>('/api/', {
      type: 31,
      chatroomUserName: userName
    });
  }

  hook(protocol: number, url: string) {
    return this.reqest.post<{
      cookie: string;
      desc: string;
      status: number;
    }>('/api/', { type: 1001, protocol, url });
  }

  unhook(cookie: string) {
    return this.reqest.post('/api/', { type: 1002, cookie });
  }

  logout() {
    return this.reqest.post('/api/', { type: 81 });
  }
}

export default WeChatSdkApi;
