# 💾 Banco de Dados (Dual Database)

Adotamos uma arquitetura de **Banco Duplo** para resolver um problema comum em bots open-source: Como compartilhar estatísticas sem vazar dados privados?

## 🟢 1. O Banco Público (`luma_metrics.sqlite`)

### Objetivo
Guardar números frios e estatísticas que podem ser compartilhadas publicamente.

### Características
- **Git:** ✅ Este arquivo é versionado
- **Acesso:** Leitura pública, escrita apenas pelo bot
- **Sensibilidade:** Sem dados pessoais

### Schema

```sql
-- Tabela de métricas simples (key-value)
CREATE TABLE metrics (
    key TEXT PRIMARY KEY,
    value INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índice para buscas rápidas
CREATE INDEX idx_metrics_updated ON metrics(updated_at);

-- Tabela de histórico (para gráficos)
CREATE TABLE stats_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_key TEXT NOT NULL,
    value INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índice composto para queries temporais
CREATE INDEX idx_history_key_time ON stats_history(metric_key, timestamp);

-- Tabela de logs de erros (sem dados sensíveis)
CREATE TABLE error_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    error_type TEXT NOT NULL,
    error_message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Métricas Coletadas

```javascript
// Contadores básicos
metrics.set('total_messages', count);
metrics.set('stickers_created', count);
metrics.set('ai_responses', count);
metrics.set('errors_handled', count);

// Métricas de performance
metrics.set('avg_response_time_ms', average);
metrics.set('longest_response_time_ms', max);

// Métricas de uso
metrics.set('active_chats_today', count);
metrics.set('commands_executed', count);
```

## 🔴 2. O Banco Privado (`luma_private.sqlite`)

### Objetivo
Guardar configurações de usuários e dados sensíveis.

### Características
- **Git:** ❌ Este arquivo é IGNORADO (`.gitignore`)
- **Acesso:** Apenas local, nunca compartilhado
- **Sensibilidade:** Contém JIDs, preferências pessoais

### Schema

```sql
-- Configurações por chat
CREATE TABLE chat_settings (
    jid TEXT PRIMARY KEY,
    personality TEXT DEFAULT 'default',
    language TEXT DEFAULT 'pt-BR',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Blacklist de usuários
CREATE TABLE blacklist (
    jid TEXT PRIMARY KEY,
    reason TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    added_by TEXT
);

-- Cache de sessões (evita recalcular)
CREATE TABLE session_cache (
    chat_jid TEXT NOT NULL,
    cache_key TEXT NOT NULL,
    cache_value TEXT,
    expires_at DATETIME,
    PRIMARY KEY (chat_jid, cache_key)
);

-- Índice para limpeza de cache expirado
CREATE INDEX idx_cache_expiry ON session_cache(expires_at);

-- Preferências de usuários
CREATE TABLE user_preferences (
    jid TEXT PRIMARY KEY,
    auto_sticker BOOLEAN DEFAULT 0,
    compact_mode BOOLEAN DEFAULT 0,
    notifications BOOLEAN DEFAULT 1,
    custom_prefix TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Dados Armazenados

```javascript
// Personalidades por grupo
chatSettings.set(groupJID, {
    personality: 'aggressive',
    language: 'pt-BR'
});

// Blacklist
blacklist.add(userJID, {
    reason: 'Spam',
    added_by: 'admin'
});

// Preferências
userPreferences.set(userJID, {
    auto_sticker: true,
    compact_mode: false
});
```

## 🧩 O Serviço (`DatabaseService.js`)

O código JavaScript abstrai essa complexidade.

### Implementação Completa

```javascript
// src/services/DatabaseService.js
const Database = require('better-sqlite3');
const path = require('path');

class DatabaseService {
    constructor() {
        // Inicializa os dois bancos
        this.dbMetrics = new Database(
            path.join(__dirname, '../../data/luma_metrics.sqlite')
        );
        this.dbPrivate = new Database(
            path.join(__dirname, '../../data/luma_private.sqlite')
        );
        
        // Otimizações
        this.dbMetrics.pragma('journal_mode = WAL');
        this.dbPrivate.pragma('journal_mode = WAL');
        
        // Inicializa schemas
        this.initSchemas();
    }
    
    // === MÉTRICAS (Público) ===
    
    incrementMetric(key, amount = 1) {
        const stmt = this.dbMetrics.prepare(`
            INSERT INTO metrics (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET 
                value = value + ?,
                updated_at = CURRENT_TIMESTAMP
        `);
        
        stmt.run(key, amount, amount);
    }
    
    getMetric(key) {
        const stmt = this.dbMetrics.prepare(`
            SELECT value FROM metrics WHERE key = ?
        `);
        
        return stmt.get(key)?.value || 0;
    }
    
    getAllMetrics() {
        const stmt = this.dbMetrics.prepare(`
            SELECT key, value, updated_at FROM metrics
            ORDER BY updated_at DESC
        `);
        
        return stmt.all();
    }
    
    snapshotMetrics() {
        // Salva snapshot diário para gráficos
        const metrics = this.getAllMetrics();
        const insert = this.dbMetrics.prepare(`
            INSERT INTO stats_history (metric_key, value)
            VALUES (?, ?)
        `);
        
        const transaction = this.dbMetrics.transaction((metrics) => {
            for (const metric of metrics) {
                insert.run(metric.key, metric.value);
            }
        });
        
        transaction(metrics);
    }
    
    // === CONFIGURAÇÕES (Privado) ===
    
    setPersonality(jid, personality) {
        const stmt = this.dbPrivate.prepare(`
            INSERT INTO chat_settings (jid, personality)
            VALUES (?, ?)
            ON CONFLICT(jid) DO UPDATE SET
                personality = ?,
                updated_at = CURRENT_TIMESTAMP
        `);
        
        stmt.run(jid, personality, personality);
    }
    
    getPersonality(jid) {
        const stmt = this.dbPrivate.prepare(`
            SELECT personality FROM chat_settings WHERE jid = ?
        `);
        
        return stmt.get(jid)?.personality || 'default';
    }
    
    // === BLACKLIST (Privado) ===
    
    addToBlacklist(jid, reason, addedBy) {
        const stmt = this.dbPrivate.prepare(`
            INSERT INTO blacklist (jid, reason, added_by)
            VALUES (?, ?, ?)
            ON CONFLICT(jid) DO UPDATE SET
                reason = ?,
                added_at = CURRENT_TIMESTAMP
        `);
        
        stmt.run(jid, reason, addedBy, reason);
    }
    
    isBlacklisted(jid) {
        const stmt = this.dbPrivate.prepare(`
            SELECT 1 FROM blacklist WHERE jid = ?
        `);
        
        return stmt.get(jid) !== undefined;
    }
    
    // === CACHE (Privado) ===
    
    setCache(chatJid, key, value, expiresInSeconds = 3600) {
        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)
            .toISOString();
        
        const stmt = this.dbPrivate.prepare(`
            INSERT INTO session_cache (chat_jid, cache_key, cache_value, expires_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(chat_jid, cache_key) DO UPDATE SET
                cache_value = ?,
                expires_at = ?
        `);
        
        stmt.run(chatJid, key, value, expiresAt, value, expiresAt);
    }
    
    getCache(chatJid, key) {
        const stmt = this.dbPrivate.prepare(`
            SELECT cache_value FROM session_cache
            WHERE chat_jid = ? AND cache_key = ? AND expires_at > datetime('now')
        `);
        
        return stmt.get(chatJid, key)?.cache_value;
    }
    
    clearExpiredCache() {
        const stmt = this.dbPrivate.prepare(`
            DELETE FROM session_cache WHERE expires_at <= datetime('now')
        `);
        
        const info = stmt.run();
        console.log(`[Database] Limpou ${info.changes} caches expirados`);
    }
    
    // === MANUTENÇÃO ===
    
    vacuum() {
        console.log('[Database] Executando VACUUM...');
        this.dbMetrics.exec('VACUUM');
        this.dbPrivate.exec('VACUUM');
    }
    
    close() {
        this.dbMetrics.close();
        this.dbPrivate.close();
    }
}

module.exports = new DatabaseService();
```

## 🛠️ Por que SQLite?

### Comparação com Outras Opções

| Característica | SQLite | MySQL | PostgreSQL | MongoDB |
|----------------|--------|-------|------------|---------|
| **Latência** | < 1ms | 5-10ms | 5-10ms | 10-20ms |
| **Setup** | Zero | Docker/Install | Docker/Install | Docker/Install |
| **Portabilidade** | Arquivo único | Dump SQL | Dump SQL | Export JSON |
| **Backup** | `cp arquivo.db` | `mysqldump` | `pg_dump` | `mongodump` |
| **Concorrência** | Limitada | Excelente | Excelente | Excelente |
| **Tamanho Max** | ~280TB | Praticamente ilimitado | Praticamente ilimitado | Praticamente ilimitado |

### Quando SQLite é Ideal

✅ **Use SQLite quando:**
- Aplicação single-server (como um bot)
- Menos de 100k queries por segundo
- Dados estruturados simples
- Você quer zero configuração

❌ **NÃO use SQLite quando:**
- Aplicação distribuída (múltiplos servidores)
- Alta concorrência de escrita (> 1000 writes/s)
- Necessidade de replicação geográfica
- Múltiplas aplicações acessando simultaneamente

### Para o LumaBot, SQLite é Perfeito Porque:

1. **Simplicidade**: Sem Docker, sem servidor, sem senhas
2. **Performance**: Leitura local é mais rápida que rede
3. **Portabilidade**: O banco "viaja" com o projeto
4. **Backup**: `cp luma_metrics.sqlite backup/` funciona

## 📊 Otimizações de Performance

### 1. WAL Mode (Write-Ahead Logging)

```javascript
db.pragma('journal_mode = WAL');
```

**O que faz:**
- Permite leituras simultâneas durante escritas
- +300% performance em cenários de leitura pesada

**Como funciona:**
```
Modo Normal (DELETE):
WRITE → Bloqueia → WRITE → Libera

Modo WAL:
WRITE → Escreve no .wal → Leituras continuam
```

### 2. Prepared Statements

```javascript
// ❌ Ruim (recria statement toda vez)
for (let i = 0; i < 1000; i++) {
    db.prepare('INSERT INTO metrics VALUES (?, ?)').run(i, i);
}

// ✅ Bom (reutiliza statement)
const stmt = db.prepare('INSERT INTO metrics VALUES (?, ?)');
for (let i = 0; i < 1000; i++) {
    stmt.run(i, i);
}
```

**Ganho:** ~50% mais rápido

### 3. Transações

```javascript
// ❌ Ruim (cada insert é uma transação)
for (const metric of metrics) {
    db.prepare('INSERT INTO ...').run(metric);
}
// 1000 inserts = 1000 transações = ~10 segundos

// ✅ Bom (uma transação para tudo)
const insert = db.prepare('INSERT INTO ...');
const insertMany = db.transaction((metrics) => {
    for (const metric of metrics) {
        insert.run(metric);
    }
});

insertMany(metrics);
// 1000 inserts = 1 transação = ~0.1 segundos
```

**Ganho:** ~100x mais rápido

### 4. Índices Estratégicos

```sql
-- Sem índice: O(n) - varre tudo
SELECT * FROM stats_history WHERE metric_key = 'stickers_created';

-- Com índice: O(log n) - busca binária
CREATE INDEX idx_stats_key ON stats_history(metric_key);
```

**Quando criar índices:**
- ✅ Colunas usadas em WHERE frequentemente
- ✅ Colunas usadas em JOIN
- ✅ Colunas usadas em ORDER BY

**Quando NÃO criar:**
- ❌ Tabelas muito pequenas (< 1000 linhas)
- ❌ Colunas que mudam muito
- ❌ Índices que não são usados

## 🔒 Segurança e Privacidade

### Dados que NUNCA são Salvos

```javascript
// ❌ NUNCA salvar:
// - Conteúdo das mensagens
// - Números de telefone completos
// - Nomes reais de usuários
// - Imagens/mídias enviadas

// ✅ Pode salvar:
// - JIDs (hashed se necessário)
// - Contadores anônimos
// - Configurações de preferência
```

### Hash de JIDs (Opcional)

Para segurança extra, você pode hashear JIDs antes de salvar:

```javascript
const crypto = require('crypto');

function hashJID(jid) {
    return crypto
        .createHash('sha256')
        .update(jid + process.env.SALT)
        .digest('hex')
        .slice(0, 16);
}

// Uso:
const hashedJID = hashJID('5511999999999@s.whatsapp.net');
// Salva: "a3f5c9d8e1b2f4a6"
```

### .gitignore Correto

```gitignore
# Banco privado
data/luma_private.sqlite
data/luma_private.sqlite-shm
data/luma_private.sqlite-wal

# Autenticação WhatsApp
auth_info/

# Variáveis de ambiente
.env
```

## 📈 Queries de Análise

### Dashboard de Estatísticas

```javascript
class AnalyticsService {
    getOverview() {
        return {
            total_messages: this.getMetric('total_messages'),
            total_stickers: this.getMetric('stickers_created'),
            total_ai_responses: this.getMetric('ai_responses'),
            avg_response_time: this.getMetric('avg_response_time_ms'),
            active_chats: this.getActiveChatsToday()
        };
    }
    
    getHistoricalData(metric, days = 7) {
        const stmt = this.dbMetrics.prepare(`
            SELECT 
                DATE(timestamp) as date,
                MAX(value) as value
            FROM stats_history
            WHERE metric_key = ?
                AND timestamp >= datetime('now', '-' || ? || ' days')
            GROUP BY DATE(timestamp)
            ORDER BY date
        `);
        
        return stmt.all(metric, days);
    }
    
    getTopErrors() {
        const stmt = this.dbMetrics.prepare(`
            SELECT 
                error_type,
                COUNT(*) as occurrences,
                MAX(timestamp) as last_seen
            FROM error_logs
            WHERE timestamp >= datetime('now', '-7 days')
            GROUP BY error_type
            ORDER BY occurrences DESC
            LIMIT 10
        `);
        
        return stmt.all();
    }
}
```

### Limpeza de Dados Antigos

```javascript
class DataRetentionService {
    cleanupOldData() {
        // Remove histórico > 90 dias
        this.dbMetrics.prepare(`
            DELETE FROM stats_history
            WHERE timestamp < datetime('now', '-90 days')
        `).run();
        
        // Remove logs de erro > 30 dias
        this.dbMetrics.prepare(`
            DELETE FROM error_logs
            WHERE timestamp < datetime('now', '-30 days')
        `).run();
        
        // Remove cache expirado
        DatabaseService.clearExpiredCache();
        
        // VACUUM para recuperar espaço
        DatabaseService.vacuum();
    }
}
```

## 🧪 Testes de Integridade

```javascript
// test/database-test.js
describe('DatabaseService', () => {
    it('deve incrementar métricas corretamente', () => {
        const before = DatabaseService.getMetric('test_counter');
        DatabaseService.incrementMetric('test_counter', 5);
        const after = DatabaseService.getMetric('test_counter');
        
        assert.equal(after - before, 5);
    });
    
    it('deve respeitar separação público/privado', () => {
        // Tenta salvar JID no banco público (deve falhar)
        assert.throws(() => {
            DatabaseService.dbMetrics.prepare(`
                INSERT INTO chat_settings ...
            `);
        });
    });
});
```

---

**Próximo passo**: Descubra como funciona a conexão com WhatsApp em [05-conexao-wa.md](./05-conexao-wa.md)