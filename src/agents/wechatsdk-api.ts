import axios from 'axios';

interface WeChatSdkApiOptions {
  apiUrl: string;
}

interface Robot {
  alias: string;
  isLogin: false;
  nickeName: string | null;
  pid: number;
  port: number;
  smallHeadImgUrl: string;
  userName: string;
}

interface Result<T> {
  data: T;
  description: string;
  error_code: number;
  robot: Robot;
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
      data: {
        alias: string;
        dbKey: string;
        exePath: string;
        isLogin: boolean;
        userName: string;
      };
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
