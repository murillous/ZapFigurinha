# 🤖 WhatsApp Sticker Bot

Um bot para WhatsApp que converte imagens, vídeos e GIFs em figurinhas **E** converte figurinhas de volta para imagens.  
Desenvolvido com [Baileys](https://github.com/WhiskeySockets/Baileys), [Sharp](https://sharp.pixelplumbing.com/) e [FFmpeg](https://ffmpeg.org/).

---

## 🚀 Funcionalidades
- **🔄 Conversão bidirecional:**
  - Converte **imagens** em figurinhas (`!sticker`)
  - Converte **vídeos curtos** e **GIFs** em figurinhas animadas (`!sticker`)
  - Converte **figurinhas** de volta para **imagens** (`!image`)
- Permite criar figurinhas e imagens a partir de **mensagens respondidas**
- Otimização automática para manter os stickers abaixo de **500 KB**
- Reconexão automática em caso de desconexão
- Limpeza automática de sessão quando desconectado do app
- Suporte a **QRCode** para login

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
2. Use os comandos disponíveis:

### 🔄 Comandos disponíveis:

#### **Para criar figurinhas:**
- Envie `!sticker` junto com uma **imagem**, **vídeo** ou **GIF**
- Ou responda a uma mensagem com mídia usando `!sticker`

#### **Para converter figurinhas em imagens:**
- Envie `!image` junto com uma **figurinha**
- Ou responda a uma figurinha usando `!image`

### Exemplos de uso:
```
✅ Imagem + !sticker → Figurinha
✅ Vídeo/GIF + !sticker → Figurinha animada  
✅ Figurinha + !image → Imagem PNG
✅ Responder mensagem + !sticker → Figurinha
✅ Responder figurinha + !image → Imagem
```

---

## 🔧 Recursos avançados

### 🔄 Reconexão automática
- O bot detecta automaticamente quando você se desconecta no app do WhatsApp
- Limpa a sessão automaticamente e gera um novo QR Code
- Tentativas inteligentes de reconexão em caso de problemas de rede

### 🧹 Limpeza automática
- Remove arquivos temporários automaticamente
- Limpa sessões corrompidas quando necessário
- Gerenciamento inteligente de memória e armazenamento

---

## 📂 Estrutura do projeto
```
.
├── index.js          # Código principal do bot
├── package.json      # Dependências do projeto
├── /auth_info        # Armazena dados de autenticação (criado automaticamente)
├── /temp             # Diretório temporário para arquivos (criado automaticamente)
└── README.md         # Este arquivo
```

---

## ⚠️ Observações importantes
- O WhatsApp pode **invalidar a sessão** caso o bot fique muito tempo offline
- Figurinhas animadas são limitadas a **6-8 segundos** de duração
- Se o tamanho ultrapassar **500 KB**, o bot tenta recomprimir automaticamente
- As imagens convertidas de figurinhas são salvas em formato **PNG** com qualidade máxima
- O bot rejeita chamadas automaticamente para evitar interrupções

---

## 🛠 Tecnologias utilizadas
- [Node.js](https://nodejs.org/) - Runtime JavaScript
- [Baileys](https://github.com/WhiskeySockets/Baileys) - Biblioteca WhatsApp Web API
- [Sharp](https://sharp.pixelplumbing.com/) - Processamento de imagens
- [FFmpeg](https://ffmpeg.org/) - Processamento de vídeos e GIFs

---

## 📝 Licença
Este projeto é open source e está disponível sob a licença MIT.
