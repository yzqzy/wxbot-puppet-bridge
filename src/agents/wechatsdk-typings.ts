import { LosslessNumber } from 'lossless-json';

export interface Robot {
  alias: string;
  isLogin: false;
  nickeName: string | null;
  pid: number;
  port: number;
  smallHeadImgUrl: string;
  userName: string;
}

export interface Result<T> {
  data: T;
  description: string;
  error_code: number;
  robot: Robot;
}

export interface RecvResult<T> {
  data: T;
  pushTime: number;
  pushType: number;
  robot: Robot;
}

export interface ChatRoomMember {
  belongChatroomNickName: string;
  belongChatroomSmallHeadImgUrl: string;
  belongChatroomUserName: string;
  chatroomDisplayName: string;
  chatroomUserFlag: number;
  isChatroomAdmin: boolean;
  isChatroomOwner: boolean;
  alias: string;
  nickName: string;
  remark: string;
  smallHeadImgUrl: string;
  type: number;
  userName: string;
  verifyFlag: string;
}

export interface RecvMsg {
  chatroomMemberInfo: ChatRoomMember;
  content: string;
  createTime: string;
  from: string;
  isChatroomMsg: number;
  isSender: number;
  msgSvrID: LosslessNumber;
  reserved1: string;
  syncFromMobile: boolean;
  talkerInfo: {
    alias: string;
    nickName: string;
    smallHeadImgUrl: string;
    type: number;
    userName: string;
    verifyFlag: string;
  };
  to: string;
  type: number;
}

export interface User {
  alias: string;
  dbKey: string;
  exePath: string;
  isLogin: boolean;
  userName: string;
}
