// oi curiosos heheehheeheh
class Dashboard {
  /**
   * Inicializa o Dashboard
   */
  constructor() {
    this.statusIndicatorElement = document.getElementById("statusIndicator");
    this.statusTextElement = document.getElementById("statusText");
    this.botStatusElement = document.getElementById("botStatus");
    this.currentTimeElement = document.getElementById("currentTime");
    this.logsContainerElement = document.getElementById("logsContainer");
    this.botToggleElement = document.getElementById("botToggle");

    this.isOnline = true;
    this.logs = [];
    this.maxLogs = 50;

    this.initializeEventListeners();
    this.initializeDashboard();
  }

  /**
   * Inicializa os event listeners
   */
  initializeEventListeners() {
    // Toggle do bot
    this.botToggleElement.addEventListener("change", (event) => {
      this.handleBotToggle(event);
    });

    // Atalho de teclado: Ctrl+C para limpar logs
    document.addEventListener("keydown", (event) => {
      if (event.key === "c" && event.ctrlKey) {
        event.preventDefault();
        this.clearLogs();
      }
    });

    // Atualizar relógio a cada segundo
    setInterval(() => {
      this.updateClock();
    }, 1000);
  }

  /*
  
    CASO sistema nao funcione, implementar logs alternativos 
    junto ao Socket IO conexão direta com o index.js

    CASO dashboard nao carregue, implemente fallback
    dentro do index via express(server)/axios(apernas requisitar) para pagina. 
  

    :) luisao esteve aqui
  */

  /**
   * Inicializa o dashboard com dados padrão
   */
  initializeDashboard() {
    this.updateClock();
    this.loadBotStatus();
    this.displayWelcomeMessages();
  }

  /**
   * Atualiza o relógio na interface
   */
  updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    this.currentTimeElement.textContent = timeString;
  }

  /**
   * Carrega o status atual do bot
   */
  loadBotStatus() {
    try {
      this.botStatusElement.textContent = "RUNNING";
      this.statusIndicatorElement.className = "status-indicator active";
      this.statusTextElement.textContent = "● ONLINE";
      this.isOnline = true;
    } catch (error) {
      console.error("Erro ao carregar status do bot:", error);
      this.addLog("Erro ao carregar status", "error");
    }
  }

  /**
   * Gerencia o toggle do bot (on/off)
   * @param {Event} event - Evento do toggle
   */
  handleBotToggle(event) {
    this.isOnline = event.target.checked;

    if (this.isOnline) {
      this.statusTextElement.textContent = "● ONLINE";
      this.statusTextElement.className = "status-text online";
      this.statusIndicatorElement.className = "status-indicator active";
      this.addLog("Bot conectado", "success");
    } else {
      this.statusTextElement.textContent = "● OFFLINE";
      this.statusTextElement.className = "status-text offline";
      this.statusIndicatorElement.className = "status-indicator inactive";
      this.addLog("Bot desconectado", "warning");
    }
  }

  /**
   * Adiciona uma nova entrada de log
   * @param {string} message - Mensagem do log
   * @param {string} type - Tipo do log (info, success, warning, error)
   */
  addLog(message, type = "info") {
    const timestamp = new Date();

    const logEntry = {
      message,
      type,
      timestamp,
    };

    this.logs.unshift(logEntry);

    // Limita o número de logs armazenados
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    this.renderLogs();
  }

  /**
   * Renderiza os logs na interface
   */
  renderLogs() {
    if (this.logs.length === 0) {
      this.logsContainerElement.innerHTML =
        '<div class="empty-state">» Nenhum log disponível</div>';
      return;
    }

    const logsHTML = this.logs
      .map((log) => this.createLogEntryHTML(log))
      .join("");

    this.logsContainerElement.innerHTML = logsHTML;
    this.logsContainerElement.scrollTop = 0;
  }

  /**
   * Cria o HTML de uma entrada de log
   * @param {Object} log - Objeto do log
   * @returns {string} HTML da entrada
   */
  createLogEntryHTML(log) {
    const timeString = log.timestamp.toLocaleTimeString("en-US", {
      hour12: false,
    });

    const logType = log.type.toUpperCase();
    const escapedMessage = this.escapeHTML(log.message);

    return `
      <div class="log-entry ${log.type}">
        <span class="log-time">[${timeString}]</span>
        <span class="log-type">${logType}</span>
        <span class="log-message">${escapedMessage}</span>
      </div>
    `;
  }

  /**
   * Escapa caracteres HTML para evitar injeção
   * @param {string} text - Texto a ser escapado
   * @returns {string} Texto escapado
   */
  escapeHTML(text) {
    const htmlEscapeMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char]);
  }

  /**
   * Limpa todos os logs
   */
  clearLogs() {
    this.logs = [];
    this.renderLogs();
    this.addLog("Logs limpos", "info");
  }

  /**
   * Exibe mensagens de boas-vindas
   */
  displayWelcomeMessages() {
    const welcomeMessages = [
      {
        text: "WhatsApp Sticker Bot - Dashboard Inicializado",
        type: "success",
      },
      {
        text: "!sticker - Converte imagem/vídeo para sticker",
        type: "info",
      },
      {
        text: "!image - Converte sticker para imagem",
        type: "info",
      },
      {
        text: "!gif - Converte sticker animado para GIF",
        type: "info",
      },
    ];

    welcomeMessages.forEach((msg) => {
      this.addLog(msg.text, msg.type);
    });
  }

  /**
   * Recarrega a página (refresh)
   */
  refreshPage() {
    location.reload();
  }
}

/**
 * Inicializa o Dashboard quando o DOM estiver pronto
 */
document.addEventListener("DOMContentLoaded", () => {
  window.dashboard = new Dashboard();
});
