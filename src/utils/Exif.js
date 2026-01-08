export class Exif {
    static async writeExif(imageBuffer, packname, author) {
        const imgId = "com.luma.bot";
        const json = {
            "sticker-pack-id": imgId,
            "sticker-pack-name": packname,
            "sticker-pack-publisher": author,
            "android-app-store-link": "https://play.google.com/store/apps/details?id=com.whatsapp",
            "ios-app-store-link": "https://itunes.apple.com/app/whatsapp-messenger/id310633997",
        };

        const exifAttr = Buffer.from([
            0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
            0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
        ]);

        const jsonBuffer = Buffer.from(JSON.stringify(json), "utf-8");
        const exif = Buffer.concat([
            exifAttr,
            jsonBuffer
        ]);

        exif.writeUIntLE(jsonBuffer.length, 14, 4);

        const data = await this.imageToWebp(imageBuffer);

        const exifSize = exif.length + (exif.length % 2);
        const exifChunk = Buffer.alloc(8 + exifSize);

        exifChunk.write("EXIF", 0);
        exifChunk.writeUInt32LE(exif.length, 4);
        exif.copy(exifChunk, 8);

        if (exif.length % 2 !== 0) {
            exifChunk[8 + exif.length] = 0x00;
        }

        const vp8xIndex = data.indexOf(Buffer.from("VP8X"));

        if (vp8xIndex === -1) {
            throw new Error("VP8X chunk não encontrado após conversão");
        }

        const flagsOffset = vp8xIndex + 8;
        data[flagsOffset] = data[flagsOffset] | 0x08;


        const afterVp8x = vp8xIndex + 18;
        const result = Buffer.concat([
            data.slice(0, 8),
            data.slice(8, afterVp8x),
            exifChunk,
            data.slice(afterVp8x)
        ]);

        const fileSize = result.length - 8;
        result.writeUInt32LE(fileSize, 4);

        return result;
    }

    static async imageToWebp(buffer) {
        if (!buffer.slice(0, 4).equals(Buffer.from("RIFF")) || !buffer.slice(8, 12).equals(Buffer.from("WEBP"))) {
            throw new Error("Não é um WebP válido");
        }

        if (buffer.slice(12, 16).equals(Buffer.from("VP8X"))) {
            return buffer;
        }

        if (buffer.slice(12, 16).equals(Buffer.from("VP8 ")) || buffer.slice(12, 16).equals(Buffer.from("VP8L"))) {
            return this.convertVp8ToVp8x(buffer);
        }

        return buffer;
    }

    static convertVp8ToVp8x(buffer) {
        const chunkType = buffer.slice(12, 16);
        const chunkSize = buffer.readUInt32LE(16);
        const chunkData = buffer.slice(20, 20 + chunkSize);

        let width = 512;
        let height = 512;

        if (chunkType.equals(Buffer.from("VP8 "))) {
            if (buffer.length >= 30) {
                width = ((buffer[27] << 8) | buffer[26]) & 0x3fff;
                height = ((buffer[29] << 8) | buffer[28]) & 0x3fff;
            }
        } else if (chunkType.equals(Buffer.from("VP8L"))) {
            if (buffer.length >= 25) {
                const bits = buffer.readUInt32LE(21);
                width = (bits & 0x3FFF) + 1;
                height = ((bits >> 14) & 0x3FFF) + 1;
            }
        }

        const vp8xChunk = Buffer.alloc(18);
        vp8xChunk.write("VP8X", 0);
        vp8xChunk.writeUInt32LE(10, 4);

        vp8xChunk.writeUInt8(0x00, 8);

        vp8xChunk.writeUIntLE(width - 1, 9, 3);
        vp8xChunk.writeUIntLE(height - 1, 12, 3);

        vp8xChunk.writeUIntLE(0, 15, 3);

        const imageChunk = Buffer.concat([
            chunkType,
            this.buildHeader(chunkSize),
            chunkData
        ]);


        const padding = chunkSize % 2 !== 0 ? Buffer.from([0x00]) : Buffer.alloc(0);


        const totalSize = 4 + vp8xChunk.length + imageChunk.length + padding.length;
        const result = Buffer.alloc(8 + totalSize);

        result.write("RIFF", 0);
        result.writeUInt32LE(totalSize, 4);
        result.write("WEBP", 8);
        vp8xChunk.copy(result, 12);
        imageChunk.copy(result, 12 + vp8xChunk.length);

        if (padding.length > 0) {
            padding.copy(result, 12 + vp8xChunk.length + imageChunk.length);
        }

        return result;
    }

    static buildHeader(length) {
        const buffer = Buffer.alloc(4);
        buffer.writeUInt32LE(length, 0);
        return buffer;
    }
}