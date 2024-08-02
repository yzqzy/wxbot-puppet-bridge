const xml2js = require('xml2js');

async function xmlToJson(xml, options) {
  const posIdx = xml.indexOf('<');
  if (posIdx !== 0) xml = xml.slice(posIdx);
  return xml2js.parseStringPromise(xml, options);
}

(async () => {
  const content = `<?xml version="1.0"?>
  <msg>
          <appmsg appid="wx6618f1cfc6c132f8" sdkver="0">
                  <title>20539_高二英语语法填空专项训练100(附答案).docx</title>
                  <des />
                  <action>view</action>
                  <type>6</type>
                  <showtype>0</showtype>
                  <content />
                  <url />
                  <dataurl />
                  <lowurl />
                  <lowdataurl />
                  <recorditem />
                  <thumburl />
                  <messageaction />
                  <laninfo />
                  <md5>7dd9bee25fa186170c0de8ea3fb035da</md5>
                  <extinfo />
                  <sourceusername />
                  <sourcedisplayname />
                  <commenturl />
                  <appattach>
                          <totallen>33304</totallen>
                          <attachid>@cdn_3057020100044b3049020100020409383c0e02032f77910204527828b6020466ace557042463643161316263622d363036362d343162302d623930312d6334616165383365396665620204052800050201000405004c4e6100_5ff466c911de8469f8ba091067ef949b_1</attachid>
                          <emoticonmd5 />
                          <fileext>docx</fileext>
                          <fileuploadtoken>v1_ujT9tTV6IOJW9oK+eRfTeORe2+vGO6G2idVUkeWuUDAtx89P0Tr74x6RrWIyeo8H2PC0yebzVKSIM1/xnALMrfofYgn0T3xR1KlRe1nbAKoRYw+hhhLVCa+G509wAyy2wSt754eHAcc8vhFo8Maq9RWT+N5r3KDrMUnm83kRI+LHdg7Y+h9AUBe3DHqgJVsky+OrmaRhzwZagHoiBjxZDXofsxWHgV7dRnOs5F8+BeAlzksyLuf7Wm/bcWLZNcKujncBCETzS47lgwPFQ23EP0pUAk6dWWQ6bt16YnaW31A=</fileuploadtoken>
                          <overwrite_newmsgid>2970813617152575649</overwrite_newmsgid>
                          <filekey>41f49acf72b0b33fa9f525dcf528fdd1</filekey>
                          <cdnattachurl>3057020100044b3049020100020409383c0e02032f77910204527828b6020466ace557042463643161316263622d363036362d343162302d623930312d6334616165383365396665620204052800050201000405004c4e6100</cdnattachurl>
                          <aeskey>5ff466c911de8469f8ba091067ef949b</aeskey>
                          <encryver>1</encryver>
                  </appattach>
                  <webviewshared>
                          <publisherId />
                          <publisherReqId>0</publisherReqId>
                  </webviewshared>
                  <weappinfo>
                          <pagepath />
                          <username />
                          <appid />
                          <appservicetype>0</appservicetype>
                  </weappinfo>
                  <websearch />
          </appmsg>
          <fromusername>wxid_l4jcwjefz6rv19</fromusername>
          <scene>0</scene>
          <appinfo>
                  <version>7</version>
                  <appname>微信电脑版</appname>
          </appinfo>
          <commenturl></commenturl>
  </msg>`;

  const result = await xmlToJson(content, { ignoreAttrs: true, explicitArray: false });

  console.log(result);
  console.log(result.msg.appmsg.appattach);
  console.log(result.msg.appmsg.weappinfo);
})();
