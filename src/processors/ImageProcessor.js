import sharp from "sharp";
import path from "path";
import { CONFIG, STICKER_METADATA } from "../config/constants.js";
import { Exif } from "../utils/Exif.js";

export class ImageProcessor {
  static async toSticker(buffer) {
    const webpBuffer = await sharp(buffer)
      .resize(CONFIG.STICKER_SIZE, CONFIG.STICKER_SIZE, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: CONFIG.STICKER_QUALITY })
      .toBuffer();

    return await Exif.writeExif(
      webpBuffer,
      STICKER_METADATA.PACK_NAME,
      STICKER_METADATA.AUTHOR
    );
  }

  static async toPng(buffer) {
    return sharp(buffer).png({ quality: 100 }).toBuffer();
  }

  static async extractFrame(buffer, pageIndex, outputDir) {
    const framePath = path.join(
      outputDir,
      `frame_${String(pageIndex).padStart(3, "0")}.png`
    );

    await sharp(buffer, { page: pageIndex })
      .resize(CONFIG.STICKER_SIZE, CONFIG.STICKER_SIZE, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toFile(framePath);

    return framePath;
  }

  static async getMetadata(buffer) {
    return sharp(buffer).metadata();
  }
}