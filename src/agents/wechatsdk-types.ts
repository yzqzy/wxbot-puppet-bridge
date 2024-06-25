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

export interface DataResult<T> {
  data: T;
  desc: string;
  status: number;
}

export interface MessageResult {
  desc: string;
  status: number;
  msgSvrID: LosslessNumber;
}

export interface RecvResult<T> {
  data: T;
  pushTime: number;
  pushType: number;
  robot: Robot;
  type: number;
}

export interface RecvChatRoomMember {
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
  chatroomMemberInfo: RecvChatRoomMember;
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
  type: LosslessNumber;
}

interface RecvScanedMsg {
  effectiveTime?: string;
  headImgUrl?: string;
  needExtDevCaptcha?: string;
  nickName?: string;
  reservedFlag1?: string;
  reservedFlag2?: string;
  extDevNewPwd?: string;
  mobileClientVer?: string;
  mobileDeviceType?: string;
}

export interface RecvScanMsg extends RecvScanedMsg {
  desc: string;
  state: number;
  step: number;
  uuid: string;
}

export interface User {
  alias: string;
  bigHeadImgUrl: string;
  cachePath: string;
  dbKey: string;
  exePath: string;
  isLogin: true;
  nation: string;
  nickName: string;
  phone: string;
  city?: string;
  province?: string;
  sex: number;
  signature: string;
  smallHeadImgUrl: string;
  uin: number;
  userName: string;
}

export interface Contact {
  NickName: string;
  PYInitial: string;
  Remark: string;
  RemarkPYInitial: string;
  UserName: string;
  smallHeadImgUrl: string;
}

export interface ContactInfo {
  alias: string;
  bigHeadImgUrl: string;
  certFlag: number;
  city: string;
  encryptUserName: string;
  fullpy: string;
  labelIds: number[];
  nation: string;
  nickName: string;
  province: string;
  remark: string;
  reserved1: number;
  sex: number;
  signature: string;
  simplepy: string;
  smallHeadImgUrl: string;
  userFlag: number;
  userName: string;
}

export interface ChatRoom {
  NickName: string;
  PYInitial: string;
  Remark: string;
  RemarkPYInitial: string;
  Type: number;
  UserName: string;
}

export interface ChatRoomInfo {
  announcement: string;
  createTime: number;
  ownerUserName: string;
  profile: DataResult<{
    certFlag: number;
    chatroomAccessType: number;
    chatroomMaxCount: number;
    chatroomNotify: number;
    encryptUserName: string;
    fullpy: string;
    nickName: string;
    remark: string;
    reserved1: number;
    sex: number;
    simplepy: string;
    smallHeadImgUrl: string;
    userFlag: number;
    userName: string;
  }>;
}

export interface ChatRoomMember {
  bigHeadImgUrl: string;
  chatroomNickName: string;
  isAdmin: boolean;
  nickName: string;
  permission: number;
  smallHeadImgUrl: string;
  userName: string;
}

export interface ChatRoomMembers {
  chatroomAdminUserNames: string[];
  chatroomMemberInfoVerion: number;
  chatroomUserName: string;
  count: number;
  members: ChatRoomMember[];
  ownerUserName: string;
}
