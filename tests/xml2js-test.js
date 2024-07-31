const xml2js = require('xml2js');

const content = `<msg><appmsg appid=\"\" sdkver=\"\"><title><![CDATA[邀请你加入群聊]]></title><des><![CDATA[\"AmberL\"邀请你加入群聊\"TalkAI练口语36\"，进入可查看详情。]]></des><action>view</action><type>5</type><showtype>0</showtype><content></content><url><![CDATA[https://support.weixin.qq.com/cgi-bin/mmsupport-bin/addopenimchatroombyinvite?ticket=LjnMY75hL6SJK4FU]]></url><thumburl><![CDATA[http://wx.qlogo.cn/mmcrhead/Lwg6xoUZC844Uc41kDNHkFibPWNpefVeqINUUm230BllGgXok7Q0TUfomM6xHCxTk9icmDkJ17ic9c/0]]></thumburl><lowurl></lowurl><appattach><totallen>0</totallen><attachid></attachid><fileext></fileext></appattach><extinfo></extinfo></appmsg><appinfo><version></version><appname></appname></appinfo></msg>"`;

xml2js.parseString(content, { explicitArray: false, ignoreAttrs: true }, (err, result) => {
  console.log(result);
});
