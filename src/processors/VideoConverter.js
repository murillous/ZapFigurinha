import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { CONFIG } from "../config/constants.js";
import { FileSystem } from "../utils/FileSystem.js";

const execAsync = promisify(exec);

export class VideoConverter {
  static async toSticker(buffer, isGif = false) {
    const input = this.createTempPath(isGif ? "gif" : "mp4", "in");
    const output = this.createTempPath("webp", "out");

    fs.writeFileSync(input, buffer);

    const duration = isGif ? CONFIG.GIF_DURATION : CONFIG.VIDEO_DURATION;
    const cmd = `ffmpeg -i "${input}" -t ${duration} -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=${CONFIG.VIDEO_FPS}" -c:v libwebp -quality ${CONFIG.WEBP_QUALITY} -loop 0 -an -fs ${CONFIG.MAX_FILE_SIZE}K "${output}"`;

    try {
      await execAsync(cmd);
      const result = fs.existsSync(output) ? fs.readFileSync(output) : null;
      FileSystem.cleanupFiles([input, output]);
      return result;
    } catch (error) {
      FileSystem.cleanupFiles([input, output]);
      throw error;
    }
  }

  static async toGif(framesPattern) {
    const output = this.createTempPath("gif");
    const cmd = `ffmpeg -y -framerate ${CONFIG.GIF_FPS} -i "${framesPattern}" -vf "split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer" -loop 0 "${output}"`;

    await execAsync(cmd);
    return output;
  }

  static async toMp4(input) {
    const output = this.createTempPath("mp4", "video");
    const cmd = `ffmpeg -y -i "${input}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -preset fast -crf 23 "${output}"`;

    await execAsync(cmd);
    return output;
  }

  static createTempPath(extension, prefix = "temp") {
    return path.join(CONFIG.TEMP_DIR, `${prefix}_${Date.now()}.${extension}`);
  }
}