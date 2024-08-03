const xml2js = require('xml2js');

async function xmlToJson(xml, options) {
  const posIdx = xml.indexOf('<');
  if (posIdx !== 0) xml = xml.slice(posIdx);
  return xml2js.parseStringPromise(xml, options);
}

(async () => {
  const content = `<?xml version="1.0"?>
  <msg>
          <appmsg appid="" sdkver="0">
                  <title>接单小赚两千，有期徒刑两年！</title>
                  <des />
                  <action>view</action>
                  <type>5</type>
                  <showtype>0</showtype>
                  <content />
                  <url>http://mp.weixin.qq.com/s?__biz=MzkyMzcxMDM0MQ==&amp;mid=2247501358&amp;idx=1&amp;sn=a402a85f15130db249838cdc724702a2&amp;chksm=c1e260c4f695e9d2e1e73062a79fec6b6cee781854a7e6744cca83cb861a6972902929a9a27a&amp;mpshare=1&amp;scene=1&amp;srcid=0802cv7lk7BBptdoY8428KWm&amp;sharer_shareinfo=ec07996c95b2ad87696daf0e512789c2&amp;sharer_shareinfo_first=ec07996c95b2ad87696daf0e512789c2#rd</url>
                  <dataurl />
                  <lowurl />
                  <lowdataurl />
                  <recorditem />
                  <thumburl>https://mmbiz.qpic.cn/sz_mmbiz_jpg/POicI8TV3kTopxUHZcTDRIOMlmEFNVewmdBp9Saq0E0H05aEGxFF3c4XKC1JdDFpeZwicPMib1zlR7DQ4dK18rMaA/0?wx_fmt=jpeg</thumburl>
                  <messageaction />
                  <laninfo />
                  <md5>9c9ae14d78450b97c0f99e2b1be1c827</md5>
                  <extinfo />
                  <sourceusername>gh_86aab598880e</sourceusername>
                  <sourcedisplayname>K哥爬虫</sourcedisplayname>
                  <commenturl />
                  <appattach>
                          <totallen>0</totallen>
                          <attachid />
                          <emoticonmd5 />
                          <fileext>jpg</fileext>
                          <filekey>6bc964b67ed447c9afc0f7aa6f47dbfc</filekey>
                          <cdnthumburl>3057020100044b3049020100020409383c0e02032f9f050204257a28b6020466aceaff042437303832656264622d386264342d343831382d393962312d3634333763363261396331350204052408030201000405004c53d900</cdnthumburl>
                          <aeskey>df91a81932fa91ea40afce9cd6d7dbd0</aeskey>
                          <cdnthumbaeskey>df91a81932fa91ea40afce9cd6d7dbd0</cdnthumbaeskey>
                          <cdnthumbmd5>9c9ae14d78450b97c0f99e2b1be1c827</cdnthumbmd5>
                          <encryver>1</encryver>
                          <cdnthumblength>12467</cdnthumblength>
                          <cdnthumbheight>100</cdnthumbheight>
                          <cdnthumbwidth>100</cdnthumbwidth>
                  </appattach>
                  <webviewshared>
                          <publisherId />
                          <publisherReqId>309376042</publisherReqId>
                  </webviewshared>
                  <weappinfo>
                          <pagepath />
                          <username />
                          <appid />
                          <appservicetype>0</appservicetype>
                  </weappinfo>
                  <websearch />
                  <mmreadershare>
                          <itemshowtype>0</itemshowtype>
                  </mmreadershare>
          </appmsg>
          <fromusername>wxid_l4jcwjefz6rv19</fromusername>
          <scene>0</scene>
          <appinfo>
                  <version>1</version>
                  <appname></appname>
          </appinfo>
          <commenturl></commenturl>
  </msg>`;

  const result = await xmlToJson(content, { ignoreAttrs: true, explicitArray: false });

  console.log(result);
  console.log(result.msg.appmsg.appattach);
})();
