import Jimp from 'jimp';
import jsQR from 'jsqr';

export const decodeQRCode = async (buffer: Buffer) => {
  try {
    const image = await Jimp.read(buffer);
    const { width, height, data } = image.bitmap;
    const code = jsQR(data, width, height);

    if (code) {
      return code.data;
    } else {
      throw new Error('无法识别二维码');
    }
  } catch (error) {
    console.error(error);

    throw error;
  }
};
