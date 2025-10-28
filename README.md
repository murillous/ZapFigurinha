# 🤖 WhatsApp Sticker Bot com IA

Um bot profissional e completo para WhatsApp que converte imagens, vídeos e stickers em múltiplos formatos, **agora com assistente virtual Luma com capacidade de visão!**

Desenvolvido com [Baileys](https://github.com/WhiskeySockets/Baileys), [Sharp](https://sharp.pixelplumbing.com/), [FFmpeg](https://ffmpeg.org/) e [Google Gemini AI](https://ai.google.dev/).

---

## ✨ Funcionalidades

### 🤖 Assistente Virtual Luma
- **Conversação natural**: Fala como uma amiga no WhatsApp
- **Visão de imagens**: Analisa fotos, figurinhas e memes
- **Memória de contexto**: Lembra conversas anteriores
- **Personalidade única**: Engraçada, sarcástica e descontraída
- **Respostas inteligentes**: Comentários específicos sobre imagens

**Como usar a Luma:**
```
• "luma, o que você acha dessa foto?" + [imagem]
• Envie uma figurinha e pergunte: "ei luma, quem é esse?"
• Responda a uma imagem: "luma, explica essa imagem"
• Converse naturalmente: "oi luma, tudo bem?"
```

### 🔄 Conversões de Mídia
- **Imagens → Stickers**: Converte qualquer imagem em sticker estático
- **Vídeos/GIFs → Stickers Animados**: Suporta até 6-8 segundos de duração
- **Stickers → Imagens PNG**: Converte stickers estáticos de volta para imagens em alta qualidade
- **Stickers Animados → GIFs/MP4**: Extrai animações de stickers para formato compartilhável
- **Resposta a mensagens**: Todos os comandos funcionam respondendo mensagens

### 👥 Gerenciamento de Grupos
- **@everyone**: Menciona todos os participantes do grupo (apenas admins)
- **Sistema de Blacklist**: Bloqueie grupos indesejados permanentemente
- **Controle de permissões**: Apenas o proprietário pode gerenciar a blacklist

### 🛡️ Sistema de Proteção
- **Blacklist persistente**: Grupos bloqueados são salvos em arquivo JSON
- **Verificação de proprietário**: Comandos administrativos protegidos
- **Logs detalhados**: Rastreamento completo de todas as ações

### ⚡ Recursos Técnicos
- **IA com visão multimodal** usando Gemini 2.0 Flash
- **Reconexão automática inteligente** com backoff exponencial
- **Limpeza automática de sessão** quando necessário
- **Otimização automática** para manter stickers < 800 KB
- **Processamento eficiente** com Sharp e FFmpeg
- **Arquitetura modular** seguindo Clean Code
- **Gerenciamento de memória** com limpeza automática de arquivos temporários

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

**Linux (Debian/Ubuntu):**
```bash
sudo apt update && sudo apt install ffmpeg -y
```

**Linux (Fedora/RHEL):**
```bash
sudo dnf install ffmpeg -y
```

**Windows:** [Download FFmpeg](https://ffmpeg.org/download.html) e adicione ao PATH

**MacOS:**
```bash
brew install ffmpeg
```

### 4. Configurar a API do Gemini (para Luma)

1. Acesse [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crie uma API Key gratuita
3. Crie um arquivo `.env` na raiz do projeto:

```env
GEMINI_API_KEY=sua_chave_aqui
```

### 5. Configurar o bot

Edite o arquivo `src/config/constants.js` e configure seu número:

```javascript
export const CONFIG = {
  OWNER_NUMBER: "5598988776655", // Substitua pelo seu número com DDI
  // ... outras configurações
};
```

**Para descobrir seu número exato:**
1. Inicie o bot e escaneie o QR Code
2. Envie `!meunumero` para o bot em qualquer conversa
3. Copie o número exibido e configure em `OWNER_NUMBER`

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

**Primeiros passos:**
1. Escaneie o QR Code que aparecerá no terminal com seu WhatsApp
2. Aguarde a mensagem: **✅ Conectado com sucesso!**
3. Use os comandos disponíveis em qualquer conversa

---

## 🎯 Comandos disponíveis

### 🤖 Assistente Virtual Luma

#### **Conversação Natural**
Acione a Luma usando qualquer um destes gatilhos:

```
• luma
• ei luma
• oi luma
• e aí luma
• fala luma
• luminha
• luminda
```

**Exemplos de uso:**
```
✅ "luma, como você está?"
✅ "ei luma, me ajuda com uma coisa"
✅ "oi luma, você conhece esse meme?" + [imagem]
✅ Responder mensagem da Luma diretamente (sem precisar mencionar "luma")
```

#### **🖼️ Visão de Imagens**
A Luma pode ver e comentar sobre:
- 📸 Fotos
- 🎭 Figurinhas/Stickers
- 🎨 Memes
- 📱 Screenshots
- 🖼️ Qualquer imagem

**Como usar:**
```
✅ Envie foto com legenda: "luma, o que você acha?"
✅ Envie figurinha e pergunte: "ei luma, comenta essa"
✅ Responda a uma imagem: "luma, explica essa foto"
✅ Pergunte sobre detalhes: "luma, que lugar é esse?"
```

**Exemplos práticos:**
```
[Foto de comida] → "luma, isso tá com cara de bom?"
  Luma: "Cara, essa pizza tá com uma cara BOA demais! 
         Aquele queijo derretendo... Fiquei com fome kkkk"

[Figurinha de meme] → "ei luma, explica esse meme"
  Luma: "Kkkkk é o Stonks! Representa quando algo dá 
         lucro de jeito inesperado. Clássico da internet 📈"

[Foto de viagem] → "luma"
  Luma: "Eita que praia LINDA! Olha a cor dessa água, 
         parece Caribe. Tá me deixando com inveja aí kkkk"
```

### Conversão de Mídia

#### **🔄 !sticker** - Criar stickers
Converte imagens, vídeos ou GIFs em stickers.

**Exemplos:**
```
• Envie uma foto com a legenda: !sticker
• Envie um vídeo/GIF com a legenda: !sticker
• Responda a uma mensagem com mídia: !sticker
```

#### **🖼️ !image** - Converter para imagem
Converte stickers estáticos de volta para imagens PNG.

**Exemplos:**
```
• Envie um sticker com a legenda: !image
• Responda a um sticker: !image
```

#### **🎬 !gif** - Converter para GIF
Converte stickers animados para GIFs/vídeos.

**Exemplos:**
```
• Envie um sticker animado com a legenda: !gif
• Responda a um sticker animado: !gif
```

### Gerenciamento de Grupos

#### **📢 @everyone** - Mencionar todos
Menciona todos os participantes do grupo (apenas administradores).

**Uso:**
```
Digite: @everyone
```

**Observações:**
- ⚠️ Funciona apenas em grupos
- 🔒 Requer permissão de administrador
- 📋 Marca todos os membros do grupo

### Comandos de Blacklist (Apenas Proprietário)

#### **🚫 !blacklist add**
Adiciona o grupo atual à lista de bloqueio.

**Uso:**
```
Digite no grupo indesejado: !blacklist add
```

#### **✅ !blacklist remove**
Remove o grupo atual da blacklist.

**Uso:**
```
Digite no grupo: !blacklist remove
```

#### **📋 !blacklist list**
Lista todos os grupos bloqueados.

**Uso:**
```
Digite: !blacklist list
```

#### **🗑️ !blacklist clear**
Limpa completamente a blacklist.

**Uso:**
```
Digite: !blacklist clear
```

### Comandos Administrativos da Luma (Apenas Proprietário)

#### **📊 !luma stats**
Exibe estatísticas de uso da Luma.

**Mostra:**
- Número de conversas ativas
- Quantidade de mensagens por usuário
- Última interação de cada conversa

#### **🗑️ !luma clear**
Limpa o histórico de conversa com a Luma na conversa atual.

**Uso:**
```
Digite: !luma clear
```

**Observações importantes:**
- 🔒 Apenas o proprietário configurado pode usar estes comandos
- 📁 A blacklist é salva em `blacklist.json` e persiste entre reinicializações
- 🚫 O bot ignorará automaticamente todas as mensagens de grupos bloqueados
- 🧠 Histórico da Luma é limpo automaticamente após 2 horas de inatividade

---

## 💡 Exemplos de uso

### Conversando com a Luma
```
✅ "luma, tudo bem?"              → Conversa casual
✅ "ei luma, me ajuda aqui"       → Pedir ajuda
✅ Foto + "luma, comenta"         → Análise de imagem
✅ Figurinha + "ei luma"          → Comentar sticker
✅ Responder mensagem dela        → Continuar conversa
```

### Conversões básicas
```
✅ Foto + !sticker              → Sticker estático
✅ Vídeo/GIF + !sticker         → Sticker animado
✅ Sticker + !image             → Imagem PNG
✅ Sticker animado + !gif       → GIF/vídeo MP4
```

### Usando respostas
```
✅ Responder foto com !sticker
✅ Responder vídeo com !sticker
✅ Responder sticker com !image
✅ Responder sticker animado com !gif
```

### Gerenciamento de grupos
```
✅ Mencionar todos              → @everyone (somente admin)
✅ Bloquear grupo atual         → !blacklist add
✅ Desbloquear grupo            → !blacklist remove
✅ Ver grupos bloqueados        → !blacklist list
✅ Ver stats da Luma            → !luma stats
```

---

## 🏗️ Arquitetura do Projeto

```
whatsapp-sticker-bot/
├── src/
│   ├── config/
│   │   ├── constants.js          # Configurações centralizadas
│   │   ├── lumaConfig.js         # Configuração da Luma (NOVO!)
│   │   └── messages.js           # Mensagens do sistema
│   ├── handlers/
│   │   ├── LumaHandler.js        # Lógica da IA (NOVO!)
│   │   ├── MediaProcessor.js     # Processamento de mídia
│   │   └── MessageHandler.js     # Gerenciamento de mensagens
│   ├── managers/
│   │   ├── BlacklistManager.js   # Sistema de blacklist
│   │   ├── ConnectionManager.js  # Gerenciamento de conexão
│   │   └── GroupManager.js       # Funções de grupo
│   ├── processors/
│   │   ├── ImageProcessor.js     # Processamento de imagens
│   │   └── VideoConverter.js     # Conversão de vídeos
│   └── utils/
│       ├── FileSystem.js         # Gerenciamento de arquivos
│       └── Logger.js             # Sistema de logs
├── .env                          # API Keys (criar manualmente)
├── index.js                      # Ponto de entrada
├── package.json
├── nodemon.json
├── blacklist.json                # Grupos bloqueados (gerado automaticamente)
└── README.md
```

### 🎨 Princípios de Design

**Clean Code & SOLID:**
- Separação clara de responsabilidades
- Classes especializadas e focadas
- Métodos pequenos e testáveis
- Código autodocumentado

**Modularização:**
- `config/`: Configurações e constantes centralizadas
- `handlers/`: Lógica de negócio e processamento
- `managers/`: Gerenciamento de estado e conexões
- `processors/`: Processamento especializado de mídia
- `utils/`: Funções utilitárias reutilizáveis

---

## ⚙️ Configuração Avançada

### Personalizar a Luma

Edite `src/config/lumaConfig.js`:

```javascript
export const LUMA_CONFIG = {
  PERSONALITY: {
    name: "Luma",
    gender: "feminino",
    style: "amigável, engraçada e levemente sarcástica",
    // Personalize os traços de personalidade
  },

  TRIGGERS: [
    /^luma[,!?]?\s+/i,
    /^luma$/i,
    // Adicione mais gatilhos personalizados
  ],

  TECHNICAL: {
    model: "gemini-2.0-flash-exp",  // Modelo com visão
    maxHistory: 20,                  // Mensagens no histórico
    maxResponseLength: 800,          // Tamanho máximo da resposta
    thinkingDelay: { min: 800, max: 2000 },  // Delay para parecer humano
  },
};
```

### Personalizar configurações gerais

Edite `src/config/constants.js`:

```javascript
export const CONFIG = {
  // Diretórios
  TEMP_DIR: "./temp",
  AUTH_DIR: "./auth_info",
  BLACKLIST_FILE: "./blacklist.json",
  
  // Segurança
  OWNER_NUMBER: "5598988776655",
  
  // Reconexão
  MAX_RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 5000,
  MIN_CLEAN_INTERVAL: 60000,
  
  // Qualidade de mídia
  STICKER_SIZE: 512,
  STICKER_QUALITY: 90,
  VIDEO_DURATION: 6,
  GIF_DURATION: 8,
  GIF_FPS: 15,
  VIDEO_FPS: 15,
  MAX_FILE_SIZE: 800,
  WEBP_QUALITY: 75,
  MAX_GIF_FRAMES: 50,
  
  // Timeouts
  TIMEOUT_MS: 60000,
  KEEPALIVE_MS: 30000,
};
```

---

## 🔧 Recursos Avançados

### 🤖 Luma - Assistente com IA

**Características:**
- **Modelo**: Gemini 2.0 Flash Experimental (com visão multimodal)
- **Memória**: Mantém contexto de até 20 mensagens por usuário
- **Personalidade**: Amigável, engraçada e levemente sarcástica
- **Limpeza automática**: Históricos antigos são removidos após 2 horas

**Capacidades de Visão:**
- Identifica objetos, pessoas, animais, lugares
- Lê texto em imagens (memes, screenshots, etc)
- Entende contexto e emoções em fotos
- Comenta de forma específica e detalhada
- Faz perguntas para continuar a conversa

### 🔄 Sistema de Reconexão Inteligente

- Detecta automaticamente desconexões
- Retry com backoff exponencial (3 tentativas)
- Limpa sessão automaticamente quando necessário
- Gera novo QR Code após limpeza
- Cooldown entre limpezas para evitar loops

### 🛡️ Sistema de Blacklist

- **Persistência**: Grupos bloqueados são salvos em JSON
- **Automático**: Bot ignora mensagens de grupos bloqueados
- **Gerenciável**: Comandos completos para adicionar/remover grupos
- **Seguro**: Apenas o proprietário pode modificar a blacklist

### 🧹 Limpeza Automática

- Remove arquivos temporários automaticamente
- Limpa sessões corrompidas quando detecta erros
- Gerenciamento inteligente de memória
- Cooldown entre limpezas
- Histórico da Luma auto-limpa após inatividade

### 🎨 Processamento Otimizado

- **Sharp**: Processamento rápido de imagens
- **FFmpeg**: Conversão eficiente de vídeos/GIFs
- **Gemini AI**: Análise inteligente de imagens
- **Redimensionamento automático**: Sempre 512x512
- **Compressão inteligente**: Mantém qualidade abaixo de 800 KB

### 📊 Sistema de Logs

- Logs informativos e coloridos
- Indicadores de progresso claros
- Mensagens de erro descritivas
- Rastreamento de todas as operações
- Debug detalhado para Luma

---

## ⚠️ Observações Importantes

### Limitações do WhatsApp
- Stickers animados são limitados a **6-8 segundos**
- Tamanho máximo de arquivo: **800 KB**
- Sessões podem ser invalidadas se o bot ficar offline por muito tempo

### Luma - IA
- Requer **API Key** do Google Gemini (gratuita)
- Modelo **gemini-2.0-flash-exp** suporta visão
- Respostas limitadas a 800 caracteres
- Histórico mantido por 2 horas de inatividade
- **Não identifica pessoas específicas** por privacidade

### Comportamento do Bot
- Compressão automática quando o arquivo ultrapassa 800 KB
- Imagens convertidas são salvas em formato **PNG** com qualidade máxima
- Stickers animados são convertidos para **MP4** para melhor compatibilidade
- Blacklist é aplicada automaticamente sem notificação
- Luma responde apenas quando mencionada ou em respostas diretas

### Desenvolvimento
- **Nodemon** ignora `auth_info` e `temp` para evitar loops
- Node.js **v18.0.0+** recomendado
- Arquivo `.env` é obrigatório para a Luma funcionar

---

## 🐛 Troubleshooting

### Luma não responde
- Verifique se o arquivo `.env` existe com `GEMINI_API_KEY`
- Confirme que está usando `gemini-2.0-flash-exp` no `lumaConfig.js`
- Mencione "luma" explicitamente na mensagem
- Verifique os logs: deve aparecer `🖼️ Imagem será analisada pela Luma`

### Luma não vê a imagem
- Certifique-se de mencionar "luma" na legenda da imagem ou ao responder
- Envie imagem + texto na **mesma mensagem** ou **responda** à imagem
- Formatos suportados: JPG, PNG, WebP (figurinhas)
- Verifique logs: deve aparecer `✅ Imagem convertida para base64`

### "Bad MAC Error"
- Erro temporário de criptografia do WhatsApp
- **Solução**: Apenas tente o comando novamente

### Bot não conecta
- Verifique sua conexão com internet
- Delete a pasta `auth_info` e escaneie novo QR Code
- Certifique-se que FFmpeg está instalado: `ffmpeg -version`

### Sticker muito grande
- O bot tenta comprimir automaticamente
- **Dica**: Envie vídeos/GIFs mais curtos (< 6 segundos)
- Reduza a qualidade/resolução da mídia original

### Comandos de blacklist não funcionam
- Verifique se configurou `OWNER_NUMBER` corretamente
- Use `!meunumero` para ver seu número no formato correto
- Certifique-se de estar usando em um grupo (exceto `!blacklist list`)

### "API Key inválida" (Luma)
- Verifique se a chave no `.env` está correta
- Acesse [Google AI Studio](https://aistudio.google.com/app/apikey) e gere nova chave
- Não use espaços ou aspas no `.env`

---

## 🛠 Tecnologias Utilizadas

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| [Node.js](https://nodejs.org/) | v18+ | Runtime JavaScript |
| [Baileys](https://github.com/WhiskeySockets/Baileys) | v6.7.18 | WhatsApp Web API |
| [Google Gemini AI](https://ai.google.dev/) | 2.0 Flash | IA com visão multimodal |
| [Sharp](https://sharp.pixelplumbing.com/) | v0.32.6 | Processamento de imagens |
| [FFmpeg](https://ffmpeg.org/) | Latest | Processamento de vídeos |
| [Pino](https://getpino.io/) | v10.0.0 | Sistema de logs |
| [QRCode Terminal](https://github.com/gtanner/qrcode-terminal) | v0.12.0 | Exibição de QR Code |
| [dotenv](https://github.com/motdotla/dotenv) | v16.0.0 | Gerenciamento de variáveis de ambiente |

---

## 🤝 Contribuindo

Contribuições são muito bem-vindas! Para contribuir:

1. Faça um Fork do projeto
2. Crie uma branch para sua feature
   ```bash
   git checkout -b feature/MinhaFeature
   ```
3. Commit suas mudanças
   ```bash
   git commit -m 'Adiciona MinhaFeature'
   ```
4. Push para a branch
   ```bash
   git push origin feature/MinhaFeature
   ```
5. Abra um Pull Request

### Diretrizes
- Siga os princípios de Clean Code
- Mantenha a arquitetura modular
- Adicione comentários em código complexo
- Teste suas mudanças antes de submeter
- Respeite a personalidade da Luma

---

## 📝 Licença

Este projeto é open source e está disponível sob a licença MIT.

---

## 🎓 Créditos

Desenvolvido por Murilo Castelhano

**Funcionalidades principais:**
- ✅ Assistente virtual com IA e visão
- ✅ Conversão completa de mídia
- ✅ Sistema de gerenciamento de grupos
- ✅ Blacklist persistente
- ✅ Reconexão automática inteligente
- ✅ Arquitetura limpa e modular

---

<div align="center">

**Desenvolvido com ❤️ para meus amigos**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/Baileys-6.7.18-25D366?logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.0%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>