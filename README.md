# 🤖 WhatsApp Sticker Bot

Um bot profissional e completo para WhatsApp que converte imagens, vídeos e stickers em múltiplos formatos, com sistema de gerenciamento de grupos e moderação integrada.

Desenvolvido com [Baileys](https://github.com/WhiskeySockets/Baileys), [Sharp](https://sharp.pixelplumbing.com/) e [FFmpeg](https://ffmpeg.org/).

---

## ✨ Funcionalidades

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

### 4. Configurar o bot

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

**Observações importantes:**
- 🔒 Apenas o proprietário configurado pode usar estes comandos
- 📁 A blacklist é salva em `blacklist.json` e persiste entre reinicializações
- 🚫 O bot ignorará automaticamente todas as mensagens de grupos bloqueados
- ⚠️ Estes comandos funcionam apenas em grupos

---

## 💡 Exemplos de uso

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
```

---

## 🏗️ Arquitetura do Projeto

```
whatsapp-sticker-bot/
├── src/
│   ├── config/
│   │   ├── constants.js          # Configurações centralizadas
│   │   └── messages.js           # Mensagens do sistema
│   ├── handlers/
│   │   ├── MediaProcessor.js     # Processamento de mídia
│   │   └── MessageHandler.js     # Gerenciamento de mensagens
│   ├── managers/
│   │   ├── BlacklistManager.js   # Sistema de blacklist
│   │   ├── ConnectionManager.js  # Gerenciamento de conexão
│   │   └── GroupManager.js       # Funções de grupo
│   ├── processors/
│   │   ├── ImageProcessor.js     # Processamento de imagens
│   │   └── VideoConverter.js     # Conversão de vídeos
│   ├── public/
│   │   ├── dashboard.html        # Dashboard (em desenvolvimento)
│   │   ├── dashboard.js          # Lógica do dashboard
│   │   └── styles.css            # Estilos do dashboard
│   └── utils/
│       ├── FileSystem.js         # Gerenciamento de arquivos
│       └── Logger.js             # Sistema de logs
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

### Personalizar configurações

Edite `src/config/constants.js`:

```javascript
export const CONFIG = {
  // Diretórios
  TEMP_DIR: "./temp",                    // Arquivos temporários
  AUTH_DIR: "./auth_info",               // Dados de autenticação
  BLACKLIST_FILE: "./blacklist.json",    // Lista de grupos bloqueados
  
  // Segurança
  OWNER_NUMBER: "5598988776655",         // Número do proprietário (com DDI)
  
  // Reconexão
  MAX_RECONNECT_ATTEMPTS: 3,             // Tentativas antes de limpar sessão
  RECONNECT_DELAY: 5000,                 // Delay entre tentativas (ms)
  MIN_CLEAN_INTERVAL: 60000,             // Intervalo mínimo entre limpezas
  
  // Qualidade de mídia
  STICKER_SIZE: 512,                     // Tamanho dos stickers (px)
  STICKER_QUALITY: 90,                   // Qualidade WEBP (0-100)
  VIDEO_DURATION: 6,                     // Duração máxima de vídeo (s)
  GIF_DURATION: 8,                       // Duração máxima de GIF (s)
  GIF_FPS: 15,                           // FPS para GIFs
  VIDEO_FPS: 15,                         // FPS para vídeos
  MAX_FILE_SIZE: 800,                    // Tamanho máximo (KB)
  WEBP_QUALITY: 75,                      // Qualidade WEBP para stickers
  MAX_GIF_FRAMES: 50,                    // Frames máximos para extração
  
  // Timeouts
  TIMEOUT_MS: 60000,                     // Timeout geral (ms)
  KEEPALIVE_MS: 30000,                   // Intervalo keep-alive (ms)
};
```

---

## 🔧 Recursos Avançados

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

### 🎨 Processamento Otimizado

- **Sharp**: Processamento rápido de imagens
- **FFmpeg**: Conversão eficiente de vídeos/GIFs
- **Redimensionamento automático**: Sempre 512x512
- **Compressão inteligente**: Mantém qualidade abaixo de 800 KB

### 📊 Sistema de Logs

- Logs informativos e coloridos
- Indicadores de progresso claros
- Mensagens de erro descritivas
- Rastreamento de todas as operações

---

## ⚠️ Observações Importantes

### Limitações do WhatsApp
- Stickers animados são limitados a **6-8 segundos**
- Tamanho máximo de arquivo: **800 KB**
- Sessões podem ser invalidadas se o bot ficar offline por muito tempo

### Comportamento do Bot
- Compressão automática quando o arquivo ultrapassa 800 KB
- Imagens convertidas são salvas em formato **PNG** com qualidade máxima
- Stickers animados são convertidos para **MP4** para melhor compatibilidade
- Blacklist é aplicada automaticamente sem notificação

### Desenvolvimento
- **Nodemon** ignora `auth_info` e `temp` para evitar loops
- Node.js **v18.0.0+** recomendado
- Dashboard visual ainda em desenvolvimento

---

## 🐛 Troubleshooting

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

### Nodemon reiniciando em loop
- Certifique-se que `nodemon.json` existe
- Use `npm start` em vez de `npm run dev` se persistir

### Comandos de blacklist não funcionam
- Verifique se configurou `OWNER_NUMBER` corretamente
- Use `!meunumero` para ver seu número no formato correto
- Certifique-se de estar usando em um grupo (exceto `!blacklist list`)

### Grupo não está sendo bloqueado
- Verifique se o JID termina com `@g.us`
- Confirme que você é o proprietário configurado
- Verifique os logs para mensagens de erro
- Arquivo `blacklist.json` deve existir

---

## 🛠 Tecnologias Utilizadas

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| [Node.js](https://nodejs.org/) | v18+ | Runtime JavaScript |
| [Baileys](https://github.com/WhiskeySockets/Baileys) | v6.7.18 | WhatsApp Web API |
| [Sharp](https://sharp.pixelplumbing.com/) | v0.32.6 | Processamento de imagens |
| [FFmpeg](https://ffmpeg.org/) | Latest | Processamento de vídeos |
| [Pino](https://getpino.io/) | v10.0.0 | Sistema de logs |
| [QRCode Terminal](https://github.com/gtanner/qrcode-terminal) | v0.12.0 | Exibição de QR Code |

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

---

## 📝 Licença

Este projeto é open source e está disponível sob a licença MIT.

---

## 🎓 Créditos

Desenvolvido por Murilo Castelhano

**Funcionalidades principais:**
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
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>