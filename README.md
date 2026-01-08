<div align="center">

# 🤖 LumaBot - Assistente de WhatsApp com IA & Stickers

**A evolução dos bots de WhatsApp.**

Uma assistente virtual com personalidade dinâmica, visão computacional e ferramentas profissionais de criação de figurinhas.

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/Baileys-6.7.18-25D366?logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.0%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## ✨ O Que Há de Novo? (v2.0)

### 🚀 Sistema de Personalidades Dinâmicas
A Luma não é apenas um robô. Você pode alternar a personalidade dela em tempo real usando um menu interativo:
- **Sarcástica** (Padrão): Ajuda, mas reclama e faz piada
- **Agressiva**: Curta, grossa e sem paciência
- **Amigável**: Fofa, usa muitos emojis e é super solicita
- **Intelectual**: Formal, técnica e corrige seu português
- **Carioca**: Cheia de gírias e marra

### 💾 Banco de Dados & Métricas
Sistema robusto com SQLite que persiste configurações e gera estatísticas detalhadas de uso, separando dados privados de métricas públicas.

### 🏷️ Metadados Profissionais (Exif)
Todas as figurinhas geradas possuem créditos embutidos ("Criada por LumaBot"), links e nome do pacote, igual aos apps da loja.

### 🌐 Download via URL
Crie figurinhas enviando apenas o link da imagem/vídeo.

---

## 🧠 Luma: Inteligência Artificial Avançada

A Luma utiliza o modelo **Gemini 2.0 Flash** com visão multimodal e memória de contexto.

### 🎭 Personalidades Dinâmicas

Cansou da Luma boazinha? **Mude o humor dela!**

| Personalidade | Descrição | Exemplo |
|--------------|-----------|---------|
| 🎭 **Sarcástica** | Ajuda, mas reclama e faz piada | "Ah claro, vou largar tudo pra fazer SEU sticker..." |
| 😤 **Agressiva** | Curta, grossa e sem paciência | "Quer o sticker? Manda a foto. Sem enrolação." |
| 💖 **Amigável** | Fofa, usa muitos emojis | "Oiii! 🥰 Claro que eu faço seu sticker! ✨" |
| 🎓 **Intelectual** | Formal, técnica e correta | "Certamente. Processarei sua solicitação." |
| 🏖️ **Carioca** | Cheia de gírias e marra | "E aí, parça! Bora criar uns adesivo da hora!" |

**Como mudar:**
```
Digite: !personalidade
→ Menu interativo aparecerá com todas as opções
```

### 👁️ Visão Computacional

- **Analisa fotos, memes e figurinhas** com contexto completo
- **Entende o contexto visual** e reage de acordo com a personalidade ativa
- **Lê textos em imagens** (OCR integrado)
- **Comenta especificamente** sobre o que vê na imagem

**Exemplos de uso:**
```
✅ [Foto de comida] + "luma, tá bom isso?"
✅ [Meme] + "ei luma, explica esse meme"
✅ [Selfie] + "luma, comenta essa foto"
```

### ⚡ Modo "Zap"

- **Respostas curtas e diretas**, otimizadas para chat
- Só manda "textão" se você pedir explicitamente
- Adaptação automática ao contexto da conversa

### 🧠 Memória de Contexto

- Mantém **até 20 mensagens** por conversa
- Lembra do que foi dito anteriormente
- **Auto-limpeza** após 2 horas de inatividade
- Histórico pode ser limpo manualmente com `!luma clear`

---

## 🎨 Estúdio de Mídia Profissional

O LumaBot possui um dos conversores mais avançados disponíveis.

### 🖼️ Conversões Disponíveis

| Entrada | Saída | Comando | Descrição |
|---------|-------|---------|-----------|
| 📷 Imagem | 🎭 Sticker | `!sticker` | Converte qualquer imagem |
| 🎥 Vídeo/GIF | 🎬 Sticker Animado | `!sticker` | Até 6-8 segundos |
| 🎭 Sticker | 🖼️ PNG | `!image` | Alta qualidade |
| 🎬 Sticker Animado | 🎞️ GIF/MP4 | `!gif` | Exportação completa |
| 🔗 URL | 🎭 Sticker | `!sticker <url>` | Download automático |

### 🏷️ Metadados Profissionais (Auto-Exif)

Todas as figurinhas incluem automaticamente:
- ✅ Nome do pacote: "LumaBot 🤖"
- ✅ Autor: "Criado por @Luma"
- ✅ Links da loja (WhatsApp Business)
- ✅ Emojis personalizados

**Resultado:** Igual aos pacotes da Play Store!

### 🔗 Criação via URL

```bash
# Direto da internet
!sticker https://exemplo.com/imagem.jpg

# Funciona com qualquer URL de imagem
!sticker https://i.imgur.com/abc123.png
```

### ⚙️ Otimizações Automáticas

- **Redimensionamento**: Sempre 512x512 pixels
- **Compressão inteligente**: Mantém < 800 KB
- **Qualidade preservada**: Sharp + FFmpeg otimizados
- **Limpeza automática**: Arquivos temporários removidos

---

## 📦 Instalação

### 1. Pré-requisitos

- **Node.js** v18.0.0 ou superior
- **FFmpeg** instalado e no PATH do sistema
- Conta Google para API do Gemini (gratuita)

### 2. Clonar e Instalar

```bash
git clone https://github.com/seu-usuario/lumabot.git
cd lumabot
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

**MacOS:**
```bash
brew install ffmpeg
```

**Windows:**
1. [Download FFmpeg](https://ffmpeg.org/download.html)
2. Extrair e adicionar ao PATH

### 4. Configuração (.env)

Crie um arquivo `.env` na raiz do projeto:

```env
GEMINI_API_KEY=sua_chave_aqui
OWNER_NUMBER=5598988776655
```

**Obter API Key:**
1. Acesse [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crie uma API Key gratuita
3. Cole no arquivo `.env`

### 5. Configurar Número do Proprietário

Edite `src/config/constants.js`:

```javascript
export const CONFIG = {
  OWNER_NUMBER: "5598988776655", // Seu número com DDI
  // ...
};
```

**Para descobrir seu número:**
1. Inicie o bot e escaneie o QR Code
2. Envie `!meunumero` em qualquer conversa
3. Copie o número e configure em `OWNER_NUMBER`

---

## ▶️ Como Usar

### Iniciar o Bot

**Modo produção:**
```bash
npm start
```

**Modo desenvolvimento (hot-reload):**
```bash
npm run dev
```

### Primeiros Passos

1. Execute `npm start`
2. **Escaneie o QR Code** com seu WhatsApp
3. Aguarde: **✅ Conectado com sucesso!**
4. Use os comandos disponíveis

---

## 🎯 Comandos Completos

### 🧠 Assistente Virtual Luma

#### **Conversação Natural**

Acione a Luma usando qualquer gatilho:

```
• luma
• ei luma
• oi luma
• e aí luma
• fala luma
```

**Exemplos:**
```
✅ "luma, como você está?"
✅ "ei luma, me ajuda com uma coisa"
✅ "oi luma, você conhece esse meme?" + [imagem]
✅ Responder mensagem da Luma diretamente
```

#### **!personalidade** - Mudar personalidade

Abre menu interativo para trocar o humor da Luma.

**Como usar:**
```
Digite: !personalidade
→ Selecione entre: Sarcástica, Agressiva, Amigável, Intelectual, Carioca
```

**Observações:**
- 🎭 Cada chat pode ter personalidade diferente
- 💾 Configuração é salva permanentemente
- 🔄 Pode mudar quantas vezes quiser

#### **🖼️ Visão de Imagens**

A Luma pode ver e comentar sobre:
- 📸 Fotos e selfies
- 🎭 Figurinhas/Stickers
- 🎨 Memes e arte
- 📱 Screenshots
- 🖼️ Qualquer imagem

**Como usar:**
```
✅ Envie foto com legenda: "luma, o que você acha?"
✅ Envie figurinha: "ei luma, comenta essa"
✅ Responda imagem: "luma, explica essa foto"
✅ Pergunte detalhes: "luma, que lugar é esse?"
```

**Exemplos com personalidades:**

```
[Foto de pizza] + Personalidade Sarcástica
→ "Cara, essa pizza tá com uma cara BOA demais! 
   Aquele queijo derretendo... Fiquei com fome kkkk"

[Mesmo sticker] + Personalidade Agressiva
→ "É pizza. Tá bonita. E daí?"

[Mesmo sticker] + Personalidade Amigável
→ "Aaah que delícia! 🍕✨ Essa pizza tá PERFEITA! 
   Me dá uma fatia? 🥺💕"
```

#### **!luma stats** - Estatísticas

Exibe métricas globais do bot:
- Total de stickers criados
- Total de mensagens processadas
- Conversas ativas
- Personalidade mais usada

#### **!luma history** - Histórico

Mostra evolução das estatísticas ao longo do tempo.

#### **!luma clear** - Limpar memória

Limpa o histórico de conversa com a Luma no chat atual.

### 🎨 Comandos de Mídia

#### **!sticker** - Criar figurinha

Converte imagens, vídeos ou GIFs em stickers.

**Exemplos:**
```
• Envie foto com legenda: !sticker
• Envie vídeo/GIF: !sticker
• Responda mídia: !sticker
• Via URL: !sticker https://site.com/foto.jpg
```

**Suporta:**
- Imagens: JPG, PNG, WebP
- Vídeos: MP4, MOV, AVI (até 6-8s)
- GIFs animados
- URLs diretas

#### **!image** - Converter para imagem

Converte stickers estáticos para PNG de alta qualidade.

**Exemplos:**
```
• Envie sticker: !image
• Responda sticker: !image
```

#### **!gif** - Converter para GIF/MP4

Converte stickers animados para GIFs ou vídeos.

**Exemplos:**
```
• Envie sticker animado: !gif
• Responda sticker animado: !gif
```

### 👥 Gerenciamento de Grupos

#### **@everyone** - Mencionar todos

Menciona todos os participantes do grupo.

**Uso:**
```
Digite: @everyone
```

**Requisitos:**
- ⚠️ Apenas em grupos
- 🔒 Requer ser administrador

### 🔧 Comandos Administrativos (Apenas Proprietário)

#### **!blacklist add** - Bloquear grupo

Adiciona o grupo atual à lista de bloqueio.

**Uso:**
```
Digite no grupo: !blacklist add
```

#### **!blacklist remove** - Desbloquear grupo

Remove o grupo da blacklist.

#### **!blacklist list** - Listar bloqueios

Mostra todos os grupos bloqueados.

#### **!blacklist clear** - Limpar lista

Remove todos os grupos da blacklist.

**Observações:**
- 🔒 Apenas o `OWNER_NUMBER` pode usar
- 💾 Blacklist é salva em arquivo JSON
- 🚫 Bot ignora automaticamente grupos bloqueados

---

## 💡 Exemplos de Uso

### Conversando com a Luma

```bash
# Conversa casual
"luma, tudo bem?"
→ Luma responde de acordo com a personalidade ativa

# Mudando personalidade
!personalidade
→ Menu aparece, escolha "Agressiva"
"luma, tudo bem?"
→ "Tô. E você?"

# Análise de imagem
[Foto de praia] + "luma, comenta"
→ Personalidade Amigável: "Aaaah que LINDA essa praia! 🏖️✨"
→ Personalidade Sarcástica: "Ah sim, mais uma foto de praia. Que original..."
```

### Criando Stickers

```bash
# Imagem básica
[Enviar foto] + "!sticker"
→ ✅ Sticker criado com metadados

# Via URL
!sticker https://i.imgur.com/exemplo.jpg
→ Bot baixa e converte automaticamente

# Vídeo animado
[Enviar GIF] + "!sticker"
→ ✅ Sticker animado (até 8s)

# Responder mensagem
[Responder foto antiga] + "!sticker"
→ Converte a imagem respondida
```

### Engenharia Reversa

```bash
# Sticker → Imagem
[Enviar sticker] + "!image"
→ Retorna PNG de alta qualidade

# Sticker animado → GIF
[Enviar sticker animado] + "!gif"
→ Retorna arquivo MP4
```

### Gerenciamento

```bash
# Bloquear grupo indesejado
!blacklist add
→ ✅ Grupo bloqueado

# Ver estatísticas
!luma stats
→ Exibe métricas globais

# Histórico de crescimento
!luma history
→ Evolução ao longo do tempo
```

---

## 🏗️ Arquitetura do Projeto

```
lumabot/
├── data/
│   ├── luma_metrics.sqlite   # 🟢 Público: Estatísticas (Git)
│   └── luma_private.sqlite   # 🔴 Privado: Configs (Ignorado)
├── src/
│   ├── config/
│   │   ├── constants.js      # Configurações gerais
│   │   └── lumaConfig.js     # Personalidades da Luma
│   ├── handlers/
│   │   ├── LumaHandler.js    # Lógica da IA
│   │   ├── MediaProcessor.js # Processamento de mídia
│   │   └── MessageHandler.js # Gerenciamento de mensagens
│   ├── managers/
│   │   ├── BlacklistManager.js   # Sistema de blacklist
│   │   ├── ConnectionManager.js  # Conexão WhatsApp
│   │   ├── GroupManager.js       # Funções de grupo
│   │   └── PersonalityManager.js # Gerenciamento de personalidades
│   ├── processors/
│   │   ├── ImageProcessor.js # Sharp - Imagens
│   │   └── VideoConverter.js # FFmpeg - Vídeos
│   ├── services/
│   │   └── DatabaseService.js  # Configurações do SQLite
│   └── utils/
│       ├── Exif.js           # Metadados WebP
│       ├── FileSystem.js     # Gerenciamento de arquivos
│       └── Logger.js         # Sistema de logs
├── temp/                     # Arquivos temporários
├── auth_info/                # Sessão do WhatsApp
├── .env                      # API Keys
├── .gitignore
├── blacklist.json            # Grupos bloqueados
├── index.js                  # Entry point
├── package.json
└── README.md
```

### 🎨 Princípios de Design

**Clean Architecture:**
- Separação clara de responsabilidades
- Classes especializadas e focadas
- Código autodocumentado
- SOLID principles

**Dual Database System:**
- **Privado** (`luma_private.sqlite`): JIDs, configurações de chat
- **Público** (`luma_metrics.sqlite`): Estatísticas anônimas

**Modularização:**
- `config/`: Configurações centralizadas
- `handlers/`: Lógica de negócio
- `managers/`: Gerenciamento de estado
- `processors/`: Processamento pesado
- `services/`: Acesso a dados
- `utils/`: Funções auxiliares

---

## ⚙️ Configuração Avançada

### Personalizar Metadados dos Stickers

Edite `src/config/constants.js`:

```javascript
export const CONFIG = {
  STICKER_META: {
    PACK_NAME: "LumaBot 🤖",
    AUTHOR: "Criado por @Luma"
  },
  // ...
};
```

### Criar Novas Personalidades

Edite `src/config/lumaConfig.js`:

```javascript
personalidades: {
  nova_persona: {
    name: "Nome da Persona",
    description: "Aparece no menu",
    context: `Você é uma IA que...`,
    style: "Estilo de escrita",
    traits: [
      "use emojis",
      "seja concisa",
      "faça piadas"
    ]
  }
}
```

### Ajustar Qualidade das Figurinhas

Em `src/config/constants.js`:

```javascript
export const CONFIG = {
  STICKER_SIZE: 512,          // Dimensões (px)
  STICKER_QUALITY: 90,        // Qualidade Sharp (0-100)
  VIDEO_DURATION: 6,          // Duração vídeos (s)
  GIF_DURATION: 8,            // Duração GIFs (s)
  VIDEO_FPS: 15,              // FPS animações
  MAX_FILE_SIZE: 800,         // Tamanho máximo (KB)
  WEBP_QUALITY: 75,           // Qualidade WebP (0-100)
};
```

### Personalizar Comportamento da Luma

Em `src/config/lumaConfig.js`:

```javascript
export const LUMA_CONFIG = {
  TECHNICAL: {
    model: "gemini-2.0-flash-exp",
    maxHistory: 20,             // Mensagens no contexto
    maxResponseLength: 800,     // Tamanho máximo resposta
    thinkingDelay: {
      min: 800,                 // Delay mínimo (ms)
      max: 2000                 // Delay máximo (ms)
    },
    historyTimeout: 7200000,    // 2h em ms
  },
};
```

---

## 🔧 Recursos Avançados

### 🎭 Sistema de Personalidades

**Persistência:**
- Configurações salvas em SQLite
- Cada chat mantém personalidade independente
- Sobrevive a reinicializações

**Métricas:**
- Rastreia personalidade mais usada
- Histórico de mudanças
- Estatísticas por persona

### 🗄️ Dual Database System

**Banco Privado** (`luma_private.sqlite`):
- JIDs de usuários
- Configurações de personalidade
- **Ignorado pelo Git** (.gitignore)

**Banco de Métricas** (`luma_metrics.sqlite`):
- Contadores anônimos
- Estatísticas agregadas
- **Versionado no Git** (público)

**Vantagens:**
- ✅ Privacidade protegida
- ✅ Métricas compartilháveis
- ✅ Compliance com LGPD

### 🏷️ Sistema de Metadados (Exif)

**Processo:**
1. Converte VP8/VP8L para VP8X
2. Injeta chunk EXIF com JSON
3. Recalcula checksums
4. Valida estrutura WebP

**Resultado:**
- Informações visíveis no WhatsApp
- Compatível com apps da loja
- Créditos automáticos

### 🔄 Sistema de Reconexão

**Estratégia:**
- Backoff exponencial (3 tentativas)
- Detecta desconexões automaticamente
- Limpa sessão quando necessário
- Cooldown entre limpezas

### 🧹 Limpeza Automática

**Gerenciamento de memória:**
- Remove arquivos temporários
- Limpa sessões corrompidas
- Histórico da Luma (2h inatividade)
- GC manual para GIFs grandes

### 📊 Sistema de Métricas

**Rastreamento:**
- Total de stickers criados
- Mensagens processadas
- Conversas ativas
- Personalidade por chat
- Evolução temporal

---

## ⚠️ Observações Importantes

### Limitações do WhatsApp

- Stickers animados: **6-8 segundos máximo**
- Tamanho máximo: **800 KB**
- Sessões expiram se offline por muito tempo
- Máximo de caracteres por mensagem: ~4096

### Luma - IA

- **API Key gratuita** do Google Gemini
- Modelo `gemini-2.0-flash-exp` com visão
- Respostas limitadas a **800 caracteres**
- Histórico mantido por **2 horas**
- **Não identifica pessoas** por privacidade

### Banco de Dados

- **SQLite** não requer configuração
- Privacidade protegida com dual database
- Migrações automáticas na inicialização
- Backups recomendados do `luma_private.sqlite`

### Comportamento

- Compressão automática > 800 KB
- Imagens convertidas em **PNG** de alta qualidade
- Stickers animados exportados como **MP4**
- Blacklist aplicada silenciosamente
- Luma responde apenas quando mencionada

---

## 🐛 Troubleshooting

### Luma não responde

**Checklist:**
- [ ] Arquivo `.env` existe com `GEMINI_API_KEY`
- [ ] Modelo configurado: `gemini-2.0-flash-exp`
- [ ] Mencionou "luma" na mensagem
- [ ] Verificar logs: `🖼️ Imagem será analisada`

**Solução:**
```bash
# Teste a API Key
curl https://generativelanguage.googleapis.com/v1/models?key=SUA_CHAVE
```

### Luma não vê imagens

**Checklist:**
- [ ] Mencionou "luma" na legenda ou resposta
- [ ] Imagem + texto na mesma mensagem
- [ ] Formato suportado: JPG, PNG, WebP
- [ ] Logs mostram: `✅ Imagem convertida para base64`

### "Bad MAC Error"

**Causa:** Erro temporário de criptografia do WhatsApp

**Solução:**
- Apenas tente novamente
- Não é erro do bot

### Bot não conecta

**Soluções:**
1. Verificar internet
2. Deletar `auth_info` e reescanear QR
3. Confirmar FFmpeg: `ffmpeg -version`
4. Reiniciar o bot

### Sticker muito grande

**Soluções:**
- Bot comprime automaticamente
- Envie vídeos mais curtos (< 6s)
- Reduza resolução da mídia original

### Comandos de blacklist não funcionam

**Checklist:**
- [ ] `OWNER_NUMBER` configurado
- [ ] Use `!meunumero` para verificar formato
- [ ] Em grupo (exceto `!blacklist list`)

### "API Key inválida"

**Soluções:**
1. Verificar `.env` sem espaços/aspas
2. Gerar nova key no [AI Studio](https://aistudio.google.com/app/apikey)
3. Reiniciar o bot após alterar

### Banco de dados corrompido

**Solução:**
```bash
# Backup primeiro!
cp data/luma_private.sqlite data/backup.sqlite

# Deletar e reiniciar (perde configs)
rm data/luma_private.sqlite
npm start
```

---

## 🛠 Tecnologias Utilizadas

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| [Node.js](https://nodejs.org/) | v18+ | Runtime JavaScript |
| [Baileys](https://github.com/WhiskeySockets/Baileys) | v6.7.18 | WhatsApp Web API |
| [Google Gemini AI](https://ai.google.dev/) | 2.0 Flash | IA com visão multimodal |
| [Sharp](https://sharp.pixelplumbing.com/) | v0.32.6 | Processamento de imagens |
| [FFmpeg](https://ffmpeg.org/) | Latest | Processamento de vídeos |
| [SQLite3](https://www.npmjs.com/package/sqlite3) | Latest | Banco de dados local |
| [Pino](https://getpino.io/) | v10.0.0 | Sistema de logs |
| [QRCode Terminal](https://github.com/gtanner/qrcode-terminal) | v0.12.0 | Exibição de QR Code |
| [dotenv](https://github.com/motdotla/dotenv) | v16.0.0 | Variáveis de ambiente |

---

## 🤝 Contribuindo

Contribuições são muito bem-vindas!

### Como Contribuir

1. **Fork** o projeto
2. Crie uma **branch** para sua feature
   ```bash
   git checkout -b feature/MinhaFeature
   ```
3. **Commit** suas mudanças
   ```bash
   git commit -m 'Add: MinhaFeature incrível'
   ```
4. **Push** para a branch
   ```bash
   git push origin feature/MinhaFeature
   ```
5. Abra um **Pull Request**

### Diretrizes

- ✅ Siga os princípios de Clean Code
- ✅ Mantenha a arquitetura modular
- ✅ Adicione comentários em código complexo
- ✅ Teste suas mudanças antes de submeter
- ✅ Respeite a personalidade da Luma
- ✅ Documente novas personalidades

### Áreas para Contribuir

- 🎭 Novas personalidades
- 🌍 Internacionalização (i18n)
- 🎨 Novos formatos de mídia
- 📊 Dashboards de métricas
- 🔧 Otimizações de performance
- 📚 Melhorias na documentação

---

## 📝 Licença

Este projeto é open source e está disponível sob a [Licença MIT](LICENSE).

---

## 🎓 Créditos

**Desenvolvido por Murilo Castelhano**

Desenvolvido com [Baileys](https://github.com/WhiskeySockets/Baileys), [Sharp](https://sharp.pixelplumbing.com/), [FFmpeg](https://ffmpeg.org/) e [Google Gemini AI](https://ai.google.dev/).

### Funcionalidades Principais

- ✅ Assistente virtual com IA e visão
- ✅ Sistema de personalidades dinâmicas
- ✅ Metadados profissionais (Exif)
- ✅ Dual database system
- ✅ Conversão completa de mídia
- ✅ Download via URL
- ✅ Sistema de gerenciamento de grupos
- ✅ Blacklist persistente
- ✅ Reconexão automática inteligente
- ✅ Arquitetura limpa e modular
- ✅ Métricas e estatísticas

---

<div align="center">

**Feito com ❤️ para meus amigos**

[⭐ Star no GitHub](https://github.com/murillous/LumaBot) • [🐛 Report Bug](https://github.com/murillous/LumaBot/issues) • [💡 Request Feature](https://github.com/murillous/LumaBot/issues)

</div>