import axios from 'axios';
import { Result, User } from './wechatsdk-typings';

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
    return this.reqest.post<{
      data: User;
      desc: '';
      status: 0;
    }>('/api/', { type: 28 });
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

  exit() {
    return this.reqest.post('/api/', { type: 81 });
  }
}

export default WeChatSdkApi;
