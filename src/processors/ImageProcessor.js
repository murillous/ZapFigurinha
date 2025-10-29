import sharp from "sharp";
import path from "path";
import { CONFIG } from "../config/constants.js";

export class ImageProcessor {
  static async toSticker(buffer) {
    return sharp(buffer)
      .resize(CONFIG.STICKER_SIZE, CONFIG.STICKER_SIZE, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: CONFIG.STICKER_QUALITY })
      .toBuffer();
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
