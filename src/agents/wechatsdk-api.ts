import axios from 'axios';

interface WeChatSdkApiOptions {
  apiUrl: string;
}

class WeChatSdkApi {
  private apiUrl: string;
  private axiosIns: any;

  constructor(options: WeChatSdkApiOptions) {
    this.apiUrl = options.apiUrl;

    this.axiosIns = axios.create({
      baseURL: this.apiUrl,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  qrcode() {
    return this.axiosIns.post('/api/', { type: 0 });
  }

  userInfo() {
    return this.axiosIns.post('/api/', { type: 28 });
  }

  async checkLogin() {
    const res = await this.userInfo();
    console.log(res.data);
  }

  exit() {
    return this.axiosIns.post('/api/', { type: 81 });
  }
}

export default WeChatSdkApi;
