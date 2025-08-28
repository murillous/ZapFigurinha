const { 
  makeWASocket, 
  DisconnectReason, 
  useMultiFileAuthState, 
  downloadMediaMessage 
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp'); 
const { exec } = require('child_process');
const { promisify } = require('util');

let qrcode;
try {
  qrcode = require('qrcode-terminal');
} catch (e) {
  console.log('💡 Para QR Code visual, instale: npm install qrcode-terminal');
}

const execAsync = promisify(exec);

class WhatsAppStickerBot {
  constructor() {
    this.tempDir = './temp';
    
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async startBot() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
      
      this.sock = makeWASocket({
        auth: state,
        browser: ['WhatsApp Sticker Bot', 'Chrome', '1.0.0'],
        generateHighQualityLinkPreview: true,
      });

      this.sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          console.log('\n📱 Escaneie este QR Code com seu WhatsApp:\n');
          
          if (qrcode) {
            qrcode.generate(qr, { small: true });
          } else {
            console.log('QR Code (texto):', qr);
            console.log('\n💡 Para ver o QR Code visual, instale: npm install qrcode-terminal\n');
          }
        }
        
        if (connection === 'close') {
          const shouldReconnect = lastDisconnect?.error instanceof Boom 
            ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
            : true;
          
          console.log('Conexão fechada devido a:', lastDisconnect?.error, ', reconectando:', shouldReconnect);
          
          if (shouldReconnect) {
            this.startBot();
          }
        } else if (connection === 'open') {
          console.log('✅ Bot conectado com sucesso!');
        }
      });

      this.sock.ev.on('creds.update', saveCreds);
      
      this.sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0];
        if (!message?.key?.fromMe && message) {
          await this.handleMessage(message);
        }
      });

    } catch (error) {
      console.error('Erro ao iniciar o bot:', error);
    }
  }

  async handleMessage(message) {
    try {
      if (message?.message) {
        const messageText = this.extractMessageText(message);
        const hasSticker = messageText?.toLowerCase().includes('!sticker');
        
        if (hasSticker) {
          if (this.hasMedia(message)) {
            await this.processSticker(message);
          }
          else if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedMessage = {
              message: message.message.extendedTextMessage.contextInfo.quotedMessage,
              key: {
                remoteJid: message.key.remoteJid,
                id: message.message.extendedTextMessage.contextInfo.stanzaId
              }
            };
            
            if (this.hasMedia(quotedMessage)) {
              console.log('📋 Processando imagem da mensagem respondida...');
              await this.processSticker(quotedMessage, message.key.remoteJid);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  }

  extractMessageText(message) {
    return message.message?.conversation || 
           message.message?.extendedTextMessage?.text || 
           message.message?.imageMessage?.caption ||
           message.message?.videoMessage?.caption ||
           null;
  }

  hasMedia(message) {
    return !!(message.message?.imageMessage || 
              message.message?.videoMessage || 
              message.message?.documentMessage);
  }

  async processSticker(message, targetJid = null) {
    try {
      console.log('📎 Processando sticker...');
      
      const jid = targetJid || message.key.remoteJid;
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        { 
          logger: undefined,
          reuploadRequest: this.sock.updateMediaMessage
        }
      );
      
      if (!buffer) {
        await this.sendMessage(jid, '❌ Erro ao baixar a mídia.');
        return;
      }

      const messageType = this.getMessageType(message);
      let stickerBuffer;
      
      if (messageType === 'image') {
        stickerBuffer = await this.convertImageWithSharp(buffer);
      } else {
        stickerBuffer = await this.convertVideoWithoutBorders(buffer, messageType);
      }
      
      if (stickerBuffer) {
        await this.sock.sendMessage(jid, {
          sticker: stickerBuffer,
          mimetype: 'image/webp'
        });
        console.log('✅ Sticker enviado com sucesso!');
      } else {
        await this.sendMessage(jid, '❌ Erro ao converter mídia para sticker.');
      }

    } catch (error) {
      console.error('Erro ao processar sticker:', error);
      const jid = targetJid || message.key.remoteJid;
      await this.sendMessage(jid, '❌ Erro interno ao processar sticker.');
    }
  }

  async convertImageWithSharp(buffer) {
    try {
      console.log('🖼️ Convertendo imagem com Sharp...');
      
      const stickerBuffer = await sharp(buffer)
        .resize(512, 512, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } 
        })
        .webp({
          quality: 90,
          alphaQuality: 90,
          force: true
        })
        .toBuffer();

      console.log(`✅ Imagem convertida: ${stickerBuffer.length} bytes`);
      return stickerBuffer;

    } catch (error) {
      console.error('Erro no Sharp:', error);
      return null;
    }
  }

async convertVideoWithoutBorders(buffer, type) {
  try {
    console.log('🎥 Convertendo vídeo com CROP...');
    
    const inputPath = path.join(this.tempDir, `input_${Date.now()}.${this.getFileExtension(type)}`);
    const outputPath = path.join(this.tempDir, `sticker_${Date.now()}.webp`);
    const retryOutputPath = path.join(this.tempDir, `sticker_retry_${Date.now()}.webp`);
    
    fs.writeFileSync(inputPath, buffer);

    let ffmpegCommand;

    if (type === 'gif') {
      ffmpegCommand = `ffmpeg -i "${inputPath}" -t 8 -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=15" -c:v libwebp -quality 75 -method 6 -preset default -loop 0 -an -fs 500K "${outputPath}"`;
    } else {
      ffmpegCommand = `ffmpeg -i "${inputPath}" -t 6 -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=15" -c:v libwebp -quality 75 -method 6 -preset default -loop 0 -an -fs 500K "${outputPath}"`;
    }

    console.log('🔄 FFmpeg (CROP):', ffmpegCommand);
    await execAsync(ffmpegCommand);

    if (fs.existsSync(outputPath)) {
      const stickerBuffer = fs.readFileSync(outputPath);
      const fileSizeMB = stickerBuffer.length / (1024 * 1024);
      console.log(`📊 Sticker criado: ${stickerBuffer.length} bytes (${fileSizeMB.toFixed(2)}MB)`);
      
      if (fileSizeMB > 0.5) {
        console.log('⚠️ Arquivo muito grande, recomprimindo...');
        
        try {
          const retryCommand = type === 'gif' 
            ? `ffmpeg -i "${inputPath}" -t 8 -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=12" -c:v libwebp -quality 50 -method 6 -preset default -loop 0 -an "${retryOutputPath}"`
            : `ffmpeg -i "${inputPath}" -t 6 -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=12" -c:v libwebp -quality 50 -method 6 -preset default -loop 0 -an "${retryOutputPath}"`;
          
          await execAsync(retryCommand);
          
          if (fs.existsSync(retryOutputPath)) {
            const retryStickerBuffer = fs.readFileSync(retryOutputPath);
            const retryFileSizeMB = retryStickerBuffer.length / (1024 * 1024);
            console.log(`✅ Recomprimido: ${retryStickerBuffer.length} bytes (${retryFileSizeMB.toFixed(2)}MB)`);
            
            this.cleanup([inputPath, outputPath, retryOutputPath]);
            return retryStickerBuffer;
          }
        } catch (retryError) {
          console.error('❌ Erro na recompressão:', retryError);
          this.cleanup([inputPath, outputPath, retryOutputPath]);
          return stickerBuffer;
        }
      }
      
      this.cleanup([inputPath, outputPath]);
      return stickerBuffer;
    } else {
      console.error('❌ Arquivo de saída não foi criado');
      this.cleanup([inputPath]);
      return null;
    }

  } catch (error) {
    console.error('Erro na conversão de vídeo:', error);
    return null;
  }
}

  getMessageType(message) {
    if (message.message?.imageMessage) {
      return message.message.imageMessage.mimetype?.includes('gif') ? 'gif' : 'image';
    }
    if (message.message?.videoMessage) {
      return message.message.videoMessage.gifPlayback ? 'gif' : 'video';
    }
    if (message.message?.documentMessage) {
      const mimetype = message.message.documentMessage.mimetype || '';
      if (mimetype.includes('gif')) return 'gif';
      if (mimetype.includes('video')) return 'video';
      if (mimetype.includes('image')) return 'image';
    }
    return 'image';
  }

  getFileExtension(type) {
    switch (type) {
      case 'video': return 'mp4';
      case 'gif': return 'gif';
      default: return 'jpg';
    }
  }

  async sendMessage(jid, text) {
    try {
      await this.sock.sendMessage(jid, { text });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  }

  cleanup(files) {
    files.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          console.log(`🗑️ Arquivo removido: ${file}`);
        }
      } catch (error) {
        console.error(`Erro ao remover arquivo ${file}:`, error);
      }
    });
  }
}

// Inicializar o bot
const bot = new WhatsAppStickerBot();
bot.startBot().catch(console.error);

module.exports = WhatsAppStickerBot;