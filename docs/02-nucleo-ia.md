# 🧠 Núcleo de Inteligência Artificial (Luma)

A Luma não é "mágica", é pura engenharia de prompt e gerenciamento de estado.

## 🏗️ Engenharia de Prompt

O prompt enviado ao Gemini não é apenas o que o usuário escreveu. É um "sanduíche" de informações montado em `LumaHandler.js`:

### Estrutura do Prompt (System Instruction)

```text
[IDENTIDADE]
Nome: Luma.
Contexto: Você é uma assistente sarcástica... (Vem de lumaConfig.js)

[ESTILO]
Use gírias, seja breve, não use linguagem robótica.

[TRAÇOS OBRIGATÓRIOS]
- Zoa o usuário se a pergunta for óbvia.
- Responde em 1 ou 2 frases.

[FORMATO WHATSAPP]
1. SEJA BREVE.
2. ECONOMIA DE PALAVRAS.

[HISTÓRICO]
Usuário: Oi
Luma: Fala logo.
(Últimas 20 mensagens)

[USUÁRIO ATUAL]
{{mensagem_do_usuario}}
```

### Anatomia de um Prompt Real

```javascript
// src/handlers/LumaHandler.js (Simplificado)
class LumaHandler {
    buildPrompt(userMessage, chatId) {
        const personality = this.getPersonality(chatId);
        const history = this.getHistory(chatId);
        
        const systemInstruction = `
${personality.identity}

${personality.style}

REGRAS OBRIGATÓRIAS:
${personality.rules.join('\n')}

HISTÓRICO DA CONVERSA:
${this.formatHistory(history)}
        `.trim();
        
        return {
            systemInstruction,
            userMessage
        };
    }
    
    formatHistory(history) {
        return history
            .slice(-20) // Últimas 20 mensagens
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');
    }
}
```

## 🎭 Sistema de Personalidades

As personalidades não são apenas "tons diferentes". São instruções estruturadas que moldam comportamento.

### Personalidade: Padrão (default)

```javascript
// config/lumaConfig.js
personalities: {
    default: {
        identity: `
            Você é Luma, uma IA assistente criada para WhatsApp.
            Sua personalidade é amigável, mas direta.
            Você não gosta de perder tempo com enrolação.
        `,
        style: `
            - Use gírias brasileiras naturalmente (ex: "mano", "tipo")
            - Seja concisa. Prefira 1-2 frases.
            - Não use emojis em excesso (máx 1 por mensagem)
            - Evite linguagem formal ou corporativa
        `,
        rules: [
            'Nunca finja que tem emoções reais',
            'Admita quando não souber algo',
            'Zoe gentilmente perguntas óbvias',
            'Seja útil, mas não bajuladora'
        ],
        examples: [
            {
                user: 'Oi',
                luma: 'E aí? Precisando de algo ou só tá testando se funciono?'
            },
            {
                user: 'Qual a capital do Brasil?',
                luma: 'Brasília. Sério que você não sabia isso?'
            }
        ]
    }
}
```

### Personalidade: Agressiva

```javascript
aggressive: {
    identity: `
        Você é Luma no modo "sincerona".
        Sem papas na língua. Você fala o que pensa.
    `,
    style: `
        - Use sarcasmo pesado
        - Seja mais direta e menos educada
        - Pode xingar de leve (sem palavrões pesados)
    `,
    rules: [
        'Zoe TODAS as perguntas bobas',
        'Não tenha medo de ser rude',
        'Mas ainda seja útil quando necessário'
    ]
}
```

### Como Trocar Personalidade por Grupo

```javascript
// No chat do WhatsApp:
Usuario: !setpersona aggressive

// O que acontece:
MessageHandler → CommandRouter → DatabaseService.setPersonality(groupJID, 'aggressive')

// Próxima mensagem:
LumaHandler.getPersonality(groupJID) // Retorna 'aggressive'
```

## 🖼️ Visão Computacional (Multimodalidade)

Quando o usuário envia uma imagem, o fluxo muda:

### Pipeline de Imagem + Texto

```javascript
async generateResponseWithImage(imageBuffer, text, chatId) {
    // 1. Converte imagem para Base64
    const base64Image = imageBuffer.toString('base64');
    
    // 2. Prepara objeto multimodal
    const parts = [
        {
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image
            }
        },
        {
            text: text || 'O que você vê nesta imagem?'
        }
    ];
    
    // 3. Usa modelo com suporte a visão
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        systemInstruction: this.buildVisionPrompt()
    });
    
    // 4. Gera resposta
    const result = await model.generateContent(parts);
    return result.response.text();
}

buildVisionPrompt() {
    return `
        Você está analisando uma imagem enviada no WhatsApp.
        Responda como se estivesse vendo a imagem em tempo real.
        
        REGRAS:
        - Seja descritiva mas concisa (2-3 frases)
        - Se for um meme, reaja com humor
        - Se for uma pergunta visual (ex: "quanto é isso?"), responda objetivamente
        - Mantenha sua personalidade sarcástica
    `;
}
```

### Modelos Disponíveis e Capacidades

| Modelo | Visão | Velocidade | Custo | Quando usar |
|--------|-------|------------|-------|-------------|
| `gemini-2.0-flash-exp` | ✅ | Muito Rápida | Grátis | Produção (experimental) |
| `gemini-1.5-flash` | ✅ | Rápida | Grátis | Fallback estável |
| `gemini-1.5-flash-8b` | ❌ | Ultra Rápida | Grátis | Texto puro, alta carga |
| `gemini-1.5-pro` | ✅ | Lenta | Pago | Análises complexas |

## 💾 Gerenciamento de Memória (Contexto)

O Gemini API não tem memória ("Stateless"). Nós precisamos enviar o histórico a cada mensagem.

### Estrutura em Memória

```javascript
class LumaHandler {
    constructor() {
        // Map<chatId, Array<Message>>
        this.conversationHistory = new Map();
        
        // Configurações
        this.maxHistoryLength = 20;
        this.maxHistoryAge = 2 * 60 * 60 * 1000; // 2 horas
    }
    
    addToHistory(chatId, role, content) {
        if (!this.conversationHistory.has(chatId)) {
            this.conversationHistory.set(chatId, []);
        }
        
        const history = this.conversationHistory.get(chatId);
        
        history.push({
            role,      // 'user' ou 'model'
            content,
            timestamp: Date.now()
        });
        
        // Mantém apenas as últimas N mensagens
        if (history.length > this.maxHistoryLength) {
            history.shift(); // Remove a mais antiga
        }
    }
    
    getHistory(chatId) {
        const history = this.conversationHistory.get(chatId) || [];
        
        // Remove mensagens muito antigas
        const cutoff = Date.now() - this.maxHistoryAge;
        return history.filter(msg => msg.timestamp > cutoff);
    }
}
```

### Limpeza Automática (Garbage Collection)

```javascript
// src/managers/MemoryManager.js
class MemoryManager {
    startCleanupTask() {
        // Roda a cada 1 hora
        setInterval(() => {
            this.cleanupStaleHistories();
        }, 60 * 60 * 1000);
    }
    
    cleanupStaleHistories() {
        const cutoff = Date.now() - (2 * 60 * 60 * 1000);
        let cleaned = 0;
        
        for (const [chatId, history] of LumaHandler.conversationHistory) {
            const validMessages = history.filter(
                msg => msg.timestamp > cutoff
            );
            
            if (validMessages.length === 0) {
                LumaHandler.conversationHistory.delete(chatId);
                cleaned++;
            } else {
                LumaHandler.conversationHistory.set(chatId, validMessages);
            }
        }
        
        console.log(`[MemoryManager] Limpou ${cleaned} conversas inativas`);
    }
}
```

### Por que Não Salvamos Tudo no Banco?

**Vantagens de RAM:**
- ⚡ Acesso instantâneo (ns vs ms)
- 🔄 Não precisa parsear JSON
- 🧹 Limpeza automática

**Desvantagens:**
- 💾 Perde histórico ao reiniciar
- 📊 Não é possível analisar conversas antigas

**Solução Híbrida (Opcional):**
```javascript
// Salva apenas métricas, não conteúdo completo
DatabaseService.logConversation({
    chatId,
    messageCount: history.length,
    lastActivity: Date.now(),
    // NÃO salva o texto por privacidade
});
```

## 🔄 Rotação de Modelos (Fallback System)

Para garantir alta disponibilidade, implementamos um sistema de tentativas:

```javascript
async generateResponse(text, chatId) {
    const models = [
        'gemini-2.0-flash-exp',    // Tentativa 1: Mais inteligente
        'gemini-1.5-flash',        // Tentativa 2: Estável
        'gemini-1.5-flash-8b'      // Tentativa 3: Leve
    ];
    
    for (let i = 0; i < models.length; i++) {
        try {
            const result = await this.callGemini(models[i], text, chatId);
            
            // Sucesso - registra qual modelo funcionou
            DatabaseService.incrementMetric(`model_${models[i]}_success`);
            return result;
            
        } catch (error) {
            console.log(`Modelo ${models[i]} falhou: ${error.message}`);
            
            // Se for rate limit ou erro temporário, tenta próximo
            if (this.isRetryableError(error) && i < models.length - 1) {
                console.log(`Tentando modelo ${models[i + 1]}...`);
                continue;
            }
            
            // Se for erro fatal, não tenta próximo
            throw error;
        }
    }
    
    throw new Error('Todos os modelos falharam');
}

isRetryableError(error) {
    const retryableCodes = [
        429, // Too Many Requests
        503, // Service Unavailable
        500  // Internal Server Error
    ];
    return retryableCodes.includes(error.statusCode);
}
```

### Logs de Tentativas

```
[LumaHandler] Tentando gemini-2.0-flash-exp...
[LumaHandler] ✗ Erro 429: Rate limit exceeded
[LumaHandler] Tentando gemini-1.5-flash...
[LumaHandler] ✓ Resposta gerada em 1.2s
```

## 🎯 Otimizações de Prompt

### Técnica 1: Few-Shot Learning

Incluímos exemplos de conversas no prompt para melhorar a qualidade:

```javascript
examples: [
    {
        user: 'Como faço bolo?',
        luma: 'Tem mil receitas na internet, mano. Especifica: chocolate? Cenoura? Só misturar farinha com ovo não dá certo.'
    },
    {
        user: 'Me ajuda com matemática',
        luma: 'Manda o problema. Mas se for conta básica, usa a calculadora do celular.'
    }
]
```

Esses exemplos "ensinam" o modelo a responder no estilo da Luma.

### Técnica 2: Controle de Tokens

```javascript
const generationConfig = {
    maxOutputTokens: 150,      // Limita tamanho da resposta
    temperature: 0.9,          // Criatividade (0-2)
    topP: 0.8,                 // Diversidade de vocabulário
    topK: 40                   // Número de palavras consideradas
};
```

**Explicação:**
- `temperature` alta → Respostas mais variadas e criativas
- `temperature` baixa → Respostas mais previsíveis e factuais
- `maxOutputTokens` → Força a IA a ser concisa (ideal para WhatsApp)

### Técnica 3: Safety Settings

```javascript
const safetySettings = [
    {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE' // Permite linguagem informal
    },
    {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM' // Bloqueia apenas casos graves
    }
];
```

Ajustamos para permitir gírias e informalidade sem bloquear a IA.

## 📊 Monitoramento de Performance

```javascript
async generateResponse(text, chatId) {
    const startTime = Date.now();
    
    try {
        const response = await this.callGemini(text, chatId);
        const duration = Date.now() - startTime;
        
        // Registra tempo de resposta
        DatabaseService.logMetric('ai_response_time', duration);
        
        // Alerta se estiver lento
        if (duration > 5000) {
            console.warn(`[LumaHandler] Resposta demorou ${duration}ms`);
        }
        
        return response;
    } catch (error) {
        DatabaseService.incrementMetric('ai_errors');
        throw error;
    }
}
```

## 🧪 Testando a IA Localmente

```javascript
// test/luma-test.js
const LumaHandler = require('../src/handlers/LumaHandler');

async function testLuma() {
    const luma = new LumaHandler();
    
    // Simula conversa
    const chatId = 'test-chat';
    
    const response1 = await luma.generateResponse('Oi', chatId);
    console.log('Luma:', response1);
    
    const response2 = await luma.generateResponse('Me explica IA', chatId);
    console.log('Luma:', response2);
    
    // Verifica se histórico foi salvo
    const history = luma.getHistory(chatId);
    console.log('Histórico:', history);
}

testLuma();
```

---

**Próximo passo**: Aprenda sobre processamento de mídia em [03-motor-midia.md](./03-motor-midia.md)