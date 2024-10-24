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

export interface NormalResult {
  desc: string;
  status: number;
}

export interface DataResult<T> extends NormalResult {
  data: T;
}

export interface MessageResult extends NormalResult {
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

export interface OwnMsg {
  content: string;
  createTime: string;
  isChatroomMsg: number;
  isSender: number;
  md5: string;
  msgSvrID: LosslessNumber;
  msgType: LosslessNumber;
  szMsgSvrID: string;
  talker: string;
  talkerInfo: {
    alias: string;
    nickName: string;
    smallHeadImgUrl: string;
    type: number;
    userName: string;
    verifyFlag: string;
  };
  userName: string;
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
  ticketInfo?: any;
}

export interface ChatRoom {
  NickName: string;
  PYInitial: string;
  Remark: string;
  RemarkPYInitial: string;
  Type: number;
  UserName: string;
}

export interface ChatRoomDetail {
  announcement: string;
  announcementEditor: string;
  announcementPublishTime: string;
  chatroomAdminUserNames: string[];
  chatroomMaxCount: number;
  chatroomMemberCount: number;
  chatroomMemberInfoVersion: number;
  chatroomMembers: {
    [key in string]: {
      alias: string;
      belongChatroomNickName: string;
      belongChatroomSmallHeadImgUrl: string;
      belongChatroomUserName: string;
      chatroomDisplayName: string;
      chatroomUserFlag: number;
      isChatroomAdmin: boolean;
      isChatroomOwner: boolean;
      nickName: string;
      remark: string;
      smallHeadImgUrl: string;
      type: string;
      userName: string;
      verifyFlag: string;
    };
  };
  infoVersion: string;
  nickName: string;
  ownerUserName: string;
  remark: string;
  smallHeadImgUrl: string;
  userName: string;
  userNameList: string[];
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

export interface LocationParams {
  userName: string;
  longitude: number;
  latitude: number;
  label: string;
  poiName: string;
  poiId: string;
  isFromPoiList: boolean;
}

export interface Tag {
  labelId: number;
  title: string;
}

export interface CdnUploadParams {
  filePath: string;
  aeskey: string;
  fileType: number;
  bAsync?: boolean;
  asyncUserData?: string;
}

export interface CdnDownloadParams {
  fileid: string;
  aeskey: string;
  fileType: number;
  savePath: string;
  bAsync?: boolean;
  asyncUserData?: string;
  chatType?: number;
}

export interface CdnResult {
  aeskey: string;
  encryptfilemd5: string;
  filecrc: string;
  fileid: string;
  filekey: string;
  isgetcdn: string;
  isoverload: string;
  isretry: string;
  rawfilekey: string;
  rawfilemd5: string;
  rawtotalsize: string;
  recvlen: string;
  retcode: string;
  retrysec: string;
  seq: string;
  ver: string;
  'x-ClientIp': string;
}

export interface ContactVerifyResult {
  bigHeadImgUrl: string;
  city?: string;
  encryptUserName: string; // v3_xxx
  nation?: string;
  nickName: string;
  province?: string;
  sex: number; // 0: unknown, 1: male, 2: female
  signature: string;
  smallHeadImgUrl: string;
  ticket: string; // v4_xxx
}
