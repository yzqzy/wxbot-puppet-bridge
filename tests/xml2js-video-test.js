const xml2js = require('xml2js');


async function xmlToJson(xml, options) {
  const posIdx = xml.indexOf('<');
  if (posIdx !== 0) xml = xml.slice(posIdx);
  return xml2js.parseStringPromise(xml, options);
}

;(async() => {
  const content = `<?xml version=\"1.0\"?>\n<msg>\n\t<videomsg aeskey=\"5048b10f20a5f5f6a0619edbcd71ec5f\" cdnvideourl=\"3057020100044b30490201000204c9b2888b02032f50e7020427e7df78020466ac047e042462373830373664332d653163652d343562632d396361622d6534306438326338343239380204052408040201000405004c4f8f00\" cdnthumbaeskey=\"5048b10f20a5f5f6a0619edbcd71ec5f\" cdnthumburl=\"3057020100044b30490201000204c9b2888b02032f50e7020427e7df78020466ac047e042462373830373664332d653163652d343562632d396361622d6534306438326338343239380204052408040201000405004c4f8f00\" length=\"260657\" playlength=\"2\" cdnthumblength=\"4065\" cdnthumbwidth=\"288\" cdnthumbheight=\"162\" fromusername=\"wxid_3w0lupg9j01622\" md5=\"b8c4412e80a17ed30abc77693daf41c4\" newmd5=\"66c5ec11a78b5cdcecb42fef5ff510c2\" isplaceholder=\"0\" rawmd5=\"\" rawlength=\"0\" cdnrawvideourl=\"\" cdnrawvideoaeskey=\"\" overwritenewmsgid=\"0\" originsourcemd5=\"964e174a7794063c4562c8c27ef1f508\" isad=\"0\" />\n</msg>\n`;


  const result = await xmlToJson(content, { mergeAttrs: true, explicitArray: false });

  console.log(result);
})()
