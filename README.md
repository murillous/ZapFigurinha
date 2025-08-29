# 🤖 WhatsApp Sticker Bot

Um bot para WhatsApp que converte imagens, vídeos e GIFs em figurinhas automaticamente.  
Desenvolvido com [Baileys](https://github.com/WhiskeySockets/Baileys), [Sharp](https://sharp.pixelplumbing.com/) e [FFmpeg](https://ffmpeg.org/).

---

## 🚀 Funcionalidades
- Converte **imagens** em figurinhas (`!sticker`).
- Converte **vídeos curtos** e **GIFs** em figurinhas animadas.
- Permite criar figurinhas a partir de **mensagens respondidas**.
- Otimização automática para manter os stickers abaixo de **500 KB**.
- Reconexão automática em caso de desconexão.
- Suporte a **QRCode** para login.

---

## 📦 Instalação

### 1. Clonar o repositório
```bash
git clone https://github.com/seu-usuario/whatsapp-sticker-bot.git
cd whatsapp-sticker-bot
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Instalar o FFmpeg
- **Linux (Debian/Ubuntu):**
  ```bash
  sudo apt update && sudo apt install ffmpeg -y
  ```
- **Windows:** [Download FFmpeg](https://ffmpeg.org/download.html) e adicione ao PATH.
- **MacOS:**
  ```bash
  brew install ffmpeg
  ```

### 4. (Opcional) Instalar QR Code visual no terminal
```bash
npm install qrcode-terminal
```

---

## ▶️ Como usar
Na diretório raíz do projeto execute:
```bash
node index.js
```

1. Escaneie o QR Code com seu WhatsApp.  
2. Envie `!sticker` junto com uma imagem, vídeo ou GIF.  
3. O bot irá responder com a figurinha. 🎉  

Também é possível responder a uma mensagem com `!sticker` para transformá-la em figurinha.

---

## 📂 Estrutura do projeto
```
.
├── index.js          # Código principal do bot
├── package.json      # Dependências do projeto
├── /auth_info        # Armazena dados de autenticação
├── /temp             # Diretório temporário para arquivos
```

---

## ⚠️ Observações
- O WhatsApp pode **invalidar a sessão** caso o bot fique muito tempo offline.
- Stickers animados são limitados a **6-8 segundos**.
- Se o tamanho ultrapassar **500 KB**, o bot tenta recomprimir automaticamente.

---

## 🛠 Tecnologias
- [Node.js](https://nodejs.org/)  
- [Baileys](https://github.com/WhiskeySockets/Baileys)  
- [Sharp](https://sharp.pixelplumbing.com/)  
- [FFmpeg](https://ffmpeg.org/)  
