import fs from "fs";
import path from "path";

export class FileSystem {
  static ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  static removeDir(dirPath) {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
          this.removeDir(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      }
      fs.rmdirSync(dirPath);
    }
  }

  static cleanupFiles(files) {
    files.forEach((file) => {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch (e) {
        // Ignora erros de limpeza
      }
    });
  }

  static cleanupDir(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach((file) => {
          try {
            fs.unlinkSync(path.join(dirPath, file));
          } catch (e) {
            // Ignora erros
          }
        });
      }
    } catch (e) {
      // Ignora erros
    }
  }
}