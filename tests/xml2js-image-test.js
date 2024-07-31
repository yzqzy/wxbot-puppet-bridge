const xml2js = require('xml2js');


async function xmlToJson(xml, options) {
  const posIdx = xml.indexOf('<');
  if (posIdx !== 0) xml = xml.slice(posIdx);
  return xml2js.parseStringPromise(xml, options);
}

;(async() => {
  const content = `<?xml version="1.0"?>
  <msg>
          <img aeskey="9321b71eaf4ea0e9be04a6138ec29901" encryver="1" cdnthumbaeskey="9321b71eaf4ea0e9be04a6138ec29901" cdnthumburl="3057020100044b3049020100020409383c0e02032f50e7020426e6df78020466aa39bf042433343161646338362d383234612d346534622d623332362d323534323165363966373839020405250a020201000405004c556b00" cdnthumblength="4807" cdnthumbheight="67" cdnthumbwidth="144" cdnmidheight="0" cdnmidwidth="0" cdnhdheight="0" cdnhdwidth="0" cdnmidimgurl="3057020100044b3049020100020409383c0e02032f50e7020426e6df78020466aa39bf042433343161646338362d383234612d346534622d623332362d323534323165363966373839020405250a020201000405004c556b00" length="193523" md5="a243fdbdd7f1ca2b40488bead73f331e" originsourcemd5="de28fa8f26b986bb77b9183bda5bdc23" />
          <platform_signature />
          <imgdatahash />
          <ImgSourceInfo>
                  <ImgSourceUrl />
                  <BizType>0</BizType>
          </ImgSourceInfo>
  </msg>`;


  const result = await xmlToJson(content, { mergeAttrs: true, explicitArray: false });

  console.log(result);
  console.log(result.msg.img);
  console.log(result.msg.img.cdnthumburl);
})()
