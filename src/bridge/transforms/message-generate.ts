import * as PUPPET from 'wechaty-puppet';

export const generateUrlLinkMessageXml = (payload: PUPPET.payloads.UrlLink) => {
  const { title, description = '', url = '', thumbnailUrl = '' } = payload;

  return `<appmsg appid=\"\" sdkver=\"0\">
  <title>${title}</title>
  <des>${description}</des>
  <action>view</action>
  <type>5</type>
  <showtype>0</showtype>
  <content></content>
  <url>${url}</url>
  <dataurl></dataurl>
  <lowurl></lowurl>
  <lowdataurl></lowdataurl>
  <recorditem></recorditem>
  <thumburl>${thumbnailUrl}</thumburl>
  <messageaction></messageaction>
  <laninfo></laninfo>
  <extinfo></extinfo>
  <sourceusername></sourceusername>
  <sourcedisplayname></sourcedisplayname>
  <commenturl></commenturl>
  <appattach>
      <totallen>0</totallen>
      <attachid></attachid>
      <emoticonmd5></emoticonmd5>
      <fileext></fileext>
      <aeskey></aeskey>
  </appattach>
  <webviewshared>
      <publisherId></publisherId>
      <publisherReqId></publisherReqId>
  </webviewshared>
  <weappinfo>
      <pagepath></pagepath>
      <username></username>
      <appid></appid>
      <appservicetype>0</appservicetype>
  </weappinfo>
  <websearch />
</appmsg>`;
};

export const generateMiniProgramMessageXml = (payload: PUPPET.payloads.MiniProgram) => {
  const { appid, title = '', description = '', pagePath = '', iconUrl = '', thumbUrl = '', username = '' } = payload;

  return `<appmsg appid="${appid}" sdkver="">
  <title>${title}</title>
  <des>${description}</des>
  <action>view</action>
  <type>33</type>
  <showtype>0</showtype>
  <content></content>
  <url>https://mp.weixin.qq.com/mp/waerrpage?appid=${appid}&amp;amp;type=upgrade&amp;amp;upgradetype=3#wechat_redirect</url>
  <dataurl></dataurl>
  <lowurl></lowurl>
  <lowdataurl></lowdataurl>
  <recorditem></recorditem>
  <thumburl>${thumbUrl}</thumburl>
  <messageaction></messageaction>
  <laninfo></laninfo>
  <md5></md5>
  <extinfo></extinfo>
  <sourceusername></sourceusername>
  <sourcedisplayname>${title}</sourcedisplayname>
  <commenturl></commenturl>
  <appattach>
      <totallen>0</totallen>
      <attachid></attachid>
      <emoticonmd5></emoticonmd5>
      <fileext></fileext>
      <aeskey></aeskey>
  </appattach>
  <webviewshared>
      <publisherId></publisherId>
      <publisherReqId>0</publisherReqId>
  </webviewshared>
  <weappinfo>
      <pagepath>${pagePath}</pagepath>
      <username>${username}</username>
      <appid>${appid}</appid>
      <type>${thumbUrl ? 2 : 1}</type>
      <weappiconurl>${iconUrl}</weappiconurl>
      <appservicetype>0</appservicetype>
      <shareId>2_wx65cc950f42e8fff1_875237370_${Date.now()}_1</shareId>
  </weappinfo>
  <websearch />
</appmsg>`;
};
