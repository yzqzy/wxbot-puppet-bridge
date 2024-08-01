import fs from 'fs';

let xorCache: string | null = null;

const xorLen = 2;

function imageDecrypt(dataPath: string, messageId: string) {
  try {
    const data = fs.readFileSync(dataPath, 'hex');
    const res = handleEncrypted(data); // 解密后的十六进制数据
    const extension = getNameExtension(res.substring(0, 4));

    const imageInfo = {
      base64: Buffer.from(res, 'hex').toString('base64'),
      extension,
      fileName: `message-${messageId}-url-thumb.${extension}`
    };

    return imageInfo;
  } catch (err) {
    console.error(err);
  }

  throw new Error('ImageDecrypt fail');
}

// 解密加密数据
function handleEncrypted(strEncrypted: string) {
  const code = getXor(strEncrypted.substring(0, 4));
  const strLength = strEncrypted.length;

  let source = '';
  const list = [];

  for (let i = 0; i < strLength; i = i + xorLen) {
    const str = strEncrypted.substring(0, xorLen);
    strEncrypted = strEncrypted.substring(xorLen);
    const res = hexXor(str, code);
    list.push(res);
  }
  source = list.join('');

  return source;
}

// 获取异或值
function getXor(str: string): string {
  if (typeof xorCache === 'string') {
    return xorCache;
  }

  const str01 = str.substring(0, 2);
  const str23 = str.substring(2);

  for (const head of dataHead) {
    const h = head.hex;
    const h01 = h.substring(0, 2);
    const h23 = h.substring(2);
    const code = hexXor(h01, str01);
    const testResult = hexXor(str23, code);
    if (testResult === h23) {
      xorCache = code;
      return xorCache;
    }
  }

  throw new Error('getXor error');
}
void getXor;

// 获取文件名后缀
function getNameExtension(hex: string) {
  const res = dataHead.find(function (item) {
    return item.hex === hex;
  })!.name;
  return res;
}

// 十六进制转二进制
function hexToBin(str: string) {
  const hexArray = [
    { bin: '0000', hex: '0' },
    { bin: '0001', hex: '1' },
    { bin: '0010', hex: '2' },
    { bin: '0011', hex: '3' },
    { bin: '0100', hex: '4' },
    { bin: '0101', hex: '5' },
    { bin: '0110', hex: '6' },
    { bin: '0111', hex: '7' },
    { bin: '1000', hex: '8' },
    { bin: '1001', hex: '9' },
    { bin: '1010', hex: 'a' },
    { bin: '1011', hex: 'b' },
    { bin: '1100', hex: 'c' },
    { bin: '1101', hex: 'd' },
    { bin: '1110', hex: 'e' },
    { bin: '1111', hex: 'f' }
  ] as const;
  let value = '';
  for (let i = 0; i < str.length; i++) {
    value += hexArray.find(function (item) {
      return item.hex === str[i];
    })!.bin;
  }
  return value;
}

// 二进制转十六进制
function binToHex(str: string) {
  const hexArray = [
    { bin: '0000', hex: '0' },
    { bin: '0001', hex: '1' },
    { bin: '0010', hex: '2' },
    { bin: '0011', hex: '3' },
    { bin: '0100', hex: '4' },
    { bin: '0101', hex: '5' },
    { bin: '0110', hex: '6' },
    { bin: '0111', hex: '7' },
    { bin: '1000', hex: '8' },
    { bin: '1001', hex: '9' },
    { bin: '1010', hex: 'a' },
    { bin: '1011', hex: 'b' },
    { bin: '1100', hex: 'c' },
    { bin: '1101', hex: 'd' },
    { bin: '1110', hex: 'e' },
    { bin: '1111', hex: 'f' }
  ];
  let value = '';
  const list: string[] = [];
  while (str.length > 4) {
    list.push(str.substring(0, 4));
    str = str.substring(4);
  }
  list.push(str);
  for (let i = 0; i < list.length; i++) {
    value += hexArray.find(function (item) {
      return item.bin === list[i];
    })!.hex;
  }
  return value;
}

function hexXor(a: string, b: string) {
  const A = hexToBin(a);
  const B = hexToBin(b);
  let d = '';
  for (let i = 0; i < A.length; i++) {
    if (A[i] === B[i]) {
      d = d.concat('0');
    } else {
      d = d.concat('1');
    }
  }
  return binToHex(d);
}

// 扩展名-十六进制表
const dataHead = [
  {
    hex: 'ffd8',
    name: 'jpg'
  },
  {
    hex: '8950',
    name: 'png'
  },
  {
    hex: '4749',
    name: 'gif'
  },
  {
    hex: '424d',
    name: 'bmp'
  }
];

export { imageDecrypt };
