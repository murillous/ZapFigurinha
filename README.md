# 🤖 WhatsApp Sticker Bot

Um bot profissional para WhatsApp que converte imagens, vídeos e stickers em múltiplos formatos.  
Desenvolvido com [Baileys](https://github.com/WhiskeySockets/Baileys), [Sharp](https://sharp.pixelplumbing.com/) e [FFmpeg](https://ffmpeg.org/).

---

## 🚀 Funcionalidades

- **🔄 Conversão completa e bidirecional:**
  - Converte **imagens** em stickers (`!sticker`)
  - Converte **vídeos curtos** e **GIFs** em stickers animados (`!sticker`)
  - Converte **stickers** de volta para **imagens** (`!image`)
  - Converte **stickers animados** para **GIFs** (`!gif`)
- Permite criar conversões a partir de **mensagens respondidas**
- Otimização automática para manter os stickers abaixo de **800 KB**
- Reconexão automática inteligente em caso de desconexão
- Limpeza automática de sessão quando desconectado do app
- Suporte a **QR Code** para login rápido
- **Código limpo e modular** seguindo princípios de Clean Code

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
- **Linux (Fedora/RHEL):**
  ```bash
  sudo dnf install ffmpeg -y
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

### Iniciar o bot

**Modo produção:**
```bash
npm start
```

**Modo desenvolvimento (com hot-reload):**
```bash
npm run dev
```

1. Escaneie o QR Code que aparecerá no terminal com seu WhatsApp  
2. Aguarde a mensagem: **✅ Conectado com sucesso!**  
3. Use os comandos disponíveis

---

## 🎯 Comandos disponíveis

### **🔄 !sticker** - Criar stickers
Converte imagens, vídeos ou GIFs em stickers animados.

**Exemplos:**
- Envie uma **foto** com a legenda `!sticker`
- Envie um **vídeo** ou **GIF** com a legenda `!sticker`
- Responda a uma mensagem com mídia usando `!sticker`

### **🖼️ !image** - Converter sticker para imagem
Converte stickers estáticos de volta para imagens PNG em alta qualidade.

**Exemplos:**
- Envie um **sticker** com a legenda `!image`
- Responda a um sticker usando `!image`

### **🎬 !gif** - Converter sticker animado para GIF
Converte stickers animados para GIFs/vídeos que podem ser salvos e compartilhados.

**Exemplos:**
- Envie um **sticker animado** com a legenda `!gif`
- Responda a um sticker animado usando `!gif`

---

## 💡 Exemplos de uso

```
✅ Imagem + !sticker          → Sticker estático
✅ Vídeo/GIF + !sticker       → Sticker animado
✅ Sticker + !image           → Imagem PNG
✅ Sticker animado + !gif     → GIF/vídeo MP4
✅ Responder mensagem         → Funciona com todos os comandos
```

---

## 🔧 Recursos avançados

### 🔄 Reconexão automática inteligente
- Detecta automaticamente desconexões do WhatsApp
- Sistema de retry com backoff exponencial (3 tentativas)
- Limpa sessão automaticamente quando necessário
- Gera novo QR Code automaticamente após limpeza

### 🧹 Limpeza automática
- Remove arquivos temporários automaticamente
- Limpa sessões corrompidas quando detecta erros de autenticação
- Gerenciamento inteligente de memória e armazenamento
- Cooldown entre limpezas para evitar loops

### 🎨 Processamento otimizado
- **Sharp** para processamento rápido de imagens
- **FFmpeg** para conversão de vídeos e GIFs
- Redimensionamento automático para 512x512
- Compressão inteligente mantendo qualidade

### 📊 Sistema de logs limpo
- Logs informativos sem poluição visual
- Indicadores de progresso claros
- Mensagens de erro descritivas

---

## 📂 Estrutura do projeto

```
.
├── index.js          # Código principal do bot (ES Modules)
├── package.json      # Dependências e scripts
├── nodemon.json      # Configuração do nodemon
├── /auth_info        # Armazena dados de autenticação (criado automaticamente)
├── /temp             # Diretório temporário para arquivos (criado automaticamente)
└── README.md         # Este arquivo
```

### 🏗️ Arquitetura do código

O código foi refatorado seguindo princípios de **Clean Code**:

- **Separação de responsabilidades**: Cada classe tem uma única responsabilidade
- **ES Modules**: Uso de `import/export` moderno
- **Constantes centralizadas**: Todos os valores em `CONFIG`, `COMMANDS` e `MESSAGES`
- **Classes especializadas**:
  - `FileSystem` - Gerenciamento de arquivos e diretórios
  - `Logger` - Sistema de logs centralizado
  - `ImageProcessor` - Processamento de imagens com Sharp
  - `VideoConverter` - Conversão de vídeos com FFmpeg
  - `ConnectionManager` - Gerenciamento de conexão WhatsApp
  - `MessageHandler` - Processamento de mensagens e comandos
  - `MediaProcessor` - Orquestração de conversões de mídia
- **Métodos pequenos e focados**: Cada método faz uma única coisa
- **Tratamento de erros consistente**: Fallbacks bem definidos
- **Código testável**: Métodos estáticos e classes desacopladas

---

## ⚙️ Configuração

### Personalizar configurações

Edite as constantes no arquivo `index.js`:

```javascript
const CONFIG = {
  TEMP_DIR: "./temp",              // Diretório temporário
  AUTH_DIR: "./auth_info",         // Diretório de autenticação
  MAX_RECONNECT_ATTEMPTS: 3,       // Tentativas de reconexão
  RECONNECT_DELAY: 5000,           // Delay entre reconexões (ms)
  STICKER_SIZE: 512,               // Tamanho dos stickers (px)
  STICKER_QUALITY: 90,             // Qualidade dos stickers (0-100)
  VIDEO_DURATION: 6,               // Duração máxima de vídeo (s)
  GIF_DURATION: 8,                 // Duração máxima de GIF (s)
  GIF_FPS: 15,                     // FPS dos GIFs
  MAX_FILE_SIZE: 800,              // Tamanho máximo (KB)
  // ... mais configurações
};
```

---

## ⚠️ Observações importantes

- O WhatsApp pode **invalidar a sessão** caso o bot fique muito tempo offline
- Stickers animados são limitados a **6-8 segundos** de duração
- Se o tamanho ultrapassar **800 KB**, o bot tenta recomprimir automaticamente
- As imagens convertidas de stickers são salvas em formato **PNG** com qualidade máxima
- Stickers animados são convertidos para **MP4** para melhor compatibilidade no WhatsApp
- Em desenvolvimento, o **nodemon** ignora as pastas `auth_info` e `temp` para evitar loops
- É recomendado Node.js **v18.0.0** ou superior para melhor compatibilidade

---

## 🛠 Tecnologias utilizadas

- [Node.js](https://nodejs.org/) - Runtime JavaScript (v18+)
- [Baileys](https://github.com/WhiskeySockets/Baileys) v6.7.18 - WhatsApp Web API
- [Sharp](https://sharp.pixelplumbing.com/) v0.32.6 - Processamento de imagens
- [FFmpeg](https://ffmpeg.org/) - Processamento de vídeos e GIFs
- [Pino](https://getpino.io/) v10.0.0 - Sistema de logs
- [QRCode Terminal](https://github.com/gtanner/qrcode-terminal) - Exibição de QR Code

---

## 🐛 Troubleshooting

### Problema: "Bad MAC Error"
- Este é um erro temporário de criptografia do WhatsApp
- O bot continua funcionando normalmente
- Basta tentar o comando novamente

### Problema: Bot não conecta
- Verifique sua conexão com internet
- Delete a pasta `auth_info` e escaneie o QR Code novamente
- Certifique-se que o FFmpeg está instalado: `ffmpeg -version`

### Problema: Sticker muito grande
- O bot tenta comprimir automaticamente
- Envie vídeos/GIFs mais curtos (menos de 6 segundos)
- Reduza a qualidade/resolução da mídia original

### Problema: Nodemon reiniciando em loop
- Certifique-se que o arquivo `nodemon.json` existe
- Use `npm start` em vez de `npm run dev` se persistir

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um Fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abrir um Pull Request

---

## 📝 Licença

Este projeto é open source e está disponível sob a licença MIT.

---

<div align="center">
  
**Desenvolvido com ❤️ para Engenharia de Computador**

</div>
