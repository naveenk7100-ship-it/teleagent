import { Agent, ChatMessage } from '../../types/index.js';
import { db } from '../../db/store.js';
import { AgentOrchestrator } from '../orchestrator.js';

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: TelegramUser;
    chat: TelegramChat;
    date: number;
    text?: string;
  };
}

interface TokenPoller {
  token: string;
  agentId: string;
  running: boolean;
  abortController: AbortController;
  offset: number;
}

export class TelegramBotManager {
  // Keyed strictly by Telegram Bot Token to guarantee at most ONE poller per bot
  private static tokenPollers: Map<string, TokenPoller> = new Map();

  // Bounded LRU/TTL set for update and message deduplication
  private static processedUpdates: Map<string, number> = new Map();
  private static readonly DEDUP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Atomically claims an update ID / message ID for a token.
   * Returns true if successfully claimed (first time seen), false if duplicate.
   */
  public static claimUpdate(token: string, updateId: number, messageId?: number): boolean {
    this.cleanExpiredClaims();

    const normalizedToken = token.trim();
    const updateKey = `upd:${normalizedToken}:${updateId}`;
    const msgKey = messageId ? `msg:${normalizedToken}:${messageId}` : null;

    if (this.processedUpdates.has(updateKey)) {
      return false;
    }
    if (msgKey && this.processedUpdates.has(msgKey)) {
      return false;
    }

    const now = Date.now();
    this.processedUpdates.set(updateKey, now);
    if (msgKey) {
      this.processedUpdates.set(msgKey, now);
    }
    return true;
  }

  /**
   * Checks if an update was already processed without claiming it
   */
  public static isUpdateClaimed(token: string, updateId: number, messageId?: number): boolean {
    const normalizedToken = token.trim();
    const updateKey = `upd:${normalizedToken}:${updateId}`;
    const msgKey = messageId ? `msg:${normalizedToken}:${messageId}` : null;

    return this.processedUpdates.has(updateKey) || Boolean(msgKey && this.processedUpdates.has(msgKey));
  }

  /**
   * Resets deduplication state (used in testing)
   */
  public static resetClaimsForTesting() {
    this.processedUpdates.clear();
  }

  private static cleanExpiredClaims() {
    const now = Date.now();
    if (this.processedUpdates.size > 5000) {
      for (const [key, timestamp] of this.processedUpdates.entries()) {
        if (now - timestamp > this.DEDUP_TTL_MS) {
          this.processedUpdates.delete(key);
        }
      }
    }
  }

  /**
   * Validates Bot Token independently using Telegram getMe API
   */
  public static async validateToken(token: string): Promise<{
    success: boolean;
    botUsername?: string;
    botId?: string;
    botName?: string;
    error?: string;
  }> {
    if (!token || !token.includes(':')) {
      return { success: false, error: 'Invalid token format. Tokens look like: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ' };
    }

    let lastErr = 'Network error connecting to Telegram API.';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: controller.signal });
        clearTimeout(timeoutId);
        const data: any = await res.json();

        if (!data.ok) {
          return { success: false, error: data.description || 'Failed to authenticate with Telegram.' };
        }

        const botUser: TelegramUser = data.result;
        return {
          success: true,
          botUsername: botUser.username || '',
          botId: String(botUser.id),
          botName: botUser.first_name || '',
        };
      } catch (err: any) {
        lastErr = err.message || 'Network error connecting to Telegram API.';
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 500 * attempt));
        }
      }
    }
    return { success: false, error: lastErr };
  }

  /**
   * Validates Bot Token using Telegram getMe API and binds to agent
   */
  public static async testAndConnectBot(agentId: string, token: string): Promise<{
    success: boolean;
    botUsername?: string;
    botId?: string;
    botName?: string;
    error?: string;
  }> {
    const valResult = await this.validateToken(token);
    if (!valResult.success) {
      return valResult;
    }

    const { botUsername, botId, botName } = valResult;

    const agent = db.getAgentById(agentId);
    if (agent) {
      db.updateAgent(agentId, {
        telegramBot: {
          ...agent.telegramBot,
          token,
          botUsername,
          botId,
          botName,
          isConnected: true,
          status: 'CONNECTED',
          lastActiveAt: new Date().toISOString(),
        },
        status: 'ACTIVE',
      }, agent.tenantId);

      db.logAudit(agent.tenantId, agent.id, 'BOT_CONNECT', 'info', `Connected Telegram Bot @${botUsername} for agent ${agent.name}`);
    }

    return {
      success: true,
      botUsername,
      botId,
      botName,
    };
  }

  /**
   * Starts long-polling for an agent bot, guaranteeing strictly ONE poller per bot token
   */
  public static startPolling(agentId: string) {
    const agent = db.getAgentById(agentId);
    if (!agent || !agent.telegramBot?.token) {
      console.warn(`Cannot start polling: Agent ${agentId} has no valid Telegram token.`);
      return;
    }

    const token = agent.telegramBot.token.trim();
    const existing = this.tokenPollers.get(token);

    if (existing && existing.running) {
      if (existing.agentId === agentId) {
        // Already actively polling for this agent
        return;
      }
      // Reassigning token to new agent: stop previous poller first
      console.log(`Reassigning bot token from Agent ${existing.agentId} to Agent ${agentId}...`);
      existing.running = false;
      existing.abortController.abort();
      this.tokenPollers.delete(token);
    }

    const abortController = new AbortController();
    const poller: TokenPoller = {
      token,
      agentId,
      running: true,
      abortController,
      offset: 0,
    };

    this.tokenPollers.set(token, poller);
    console.log(`🤖 Starting live Telegram polling for Agent: ${agent.name} (@${agent.telegramBot.botUsername || 'bot'})...`);

    (async () => {
      while (poller.running) {
        try {
          const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${poller.offset}&timeout=20`;
          const response = await fetch(url, { signal: abortController.signal });

          if (!response.ok) {
            if (response.status === 409) {
              console.warn(`Telegram Polling Notice (${agent.name}): Another instance is active. Retrying in 5s...`);
            } else {
              console.error(`Telegram Polling Error (${agent.name}): HTTP ${response.status}`);
            }
            await new Promise(r => setTimeout(r, 5000));
            continue;
          }

          const result: any = await response.json();
          if (result.ok && Array.isArray(result.result)) {
            const updates: TelegramUpdate[] = result.result;

            for (const update of updates) {
              // Advance offset immediately to prevent repeated fetch
              if (update.update_id >= poller.offset) {
                poller.offset = update.update_id + 1;
              }

              if (update.message && update.message.text) {
                await this.handleIncomingMessage(agent, update);
              }
            }
          }
        } catch (err: any) {
          if (err.name === 'AbortError') break;
          console.warn(`Telegram polling loop notice for ${agent.name}:`, err.message);
          await new Promise(r => setTimeout(r, 4000));
        }
      }
    })();
  }

  /**
   * Stops polling for an agent
   */
  public static stopPolling(agentId: string) {
    for (const [token, poller] of this.tokenPollers.entries()) {
      if (poller.agentId === agentId) {
        poller.running = false;
        poller.abortController.abort();
        this.tokenPollers.delete(token);
        console.log(`🛑 Stopped polling for Agent ${agentId}`);
      }
    }
  }

  /**
   * Stops polling for all active agents during graceful shutdown
   */
  public static stopAllPolling() {
    for (const [token, poller] of this.tokenPollers.entries()) {
      poller.running = false;
      poller.abortController.abort();
      console.log(`🛑 Stopped polling for Agent ${poller.agentId}`);
    }
    this.tokenPollers.clear();
  }

  /**
   * Dispatches incoming Telegram message into the Agent Orchestrator with strict update deduplication
   */
  public static async handleIncomingMessage(agent: Agent, update: TelegramUpdate) {
    if (!update.message || !update.message.text) return;

    const msg = update.message;
    const chatId = String(msg.chat.id);
    const userId = String(msg.from?.id || chatId);
    const username = msg.from?.username || msg.from?.first_name || 'Telegram User';
    const text = (msg.text || '').trim();
    const token = (agent.telegramBot?.token || '').trim();

    // 1. Idempotency Check: Claim this update ID and message ID
    if (token && !this.claimUpdate(token, update.update_id, msg.message_id)) {
      console.log(`[Telegram Idempotency] Skipping duplicate update ${update.update_id} / msg ${msg.message_id} for agent ${agent.name}`);
      return;
    }

    // Query fresh agent configuration from database
    const currentAgent = db.getAgentById(agent.id) || agent;

    // 2. Check conversation thread for existing message_id (Cross-restart deduplication)
    const existingConv = db.getConversations(currentAgent.tenantId, currentAgent.id)
      .find(c => c.telegramChatId === chatId && !c.isPlayground);

    if (existingConv && msg.message_id) {
      const alreadySaved = existingConv.messages.some(
        m => m.metadata?.telegramMessageId === msg.message_id || m.metadata?.telegramUpdateId === update.update_id
      );
      if (alreadySaved) {
        console.log(`[Telegram Idempotency] Message ${msg.message_id} already persisted in conversation ${existingConv.id}. Skipping.`);
        return;
      }
    }

    try {
      const result = await AgentOrchestrator.execute({
        tenantId: currentAgent.tenantId,
        agentId: currentAgent.id,
        userId,
        username,
        chatId,
        message: text,
        isPlayground: false,
        telegramMessageId: msg.message_id,
        telegramUpdateId: update.update_id,
      });

      if (result.reply && currentAgent.telegramBot?.token) {
        await this.sendTelegramMessage(currentAgent.telegramBot.token, chatId, result.reply);
      }
    } catch (err: any) {
      console.error(`Error processing Telegram message for ${currentAgent.name}:`, err);
      if (currentAgent.telegramBot?.token) {
        await this.sendTelegramMessage(
          currentAgent.telegramBot.token,
          chatId,
          "I apologize, but I encountered a temporary issue processing your message. Our team has been notified."
        );
      }
    }
  }

  /**
   * Sends a message to a Telegram chat with retry on Markdown parse error
   */
  public static async sendTelegramMessage(token: string, chatId: string | number, text: string): Promise<boolean> {
    if (!token || !chatId || !text) return false;

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      });

      const data: any = await res.json();
      if (!data.ok) {
        // Retry without Markdown if syntax failed
        const retryRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
          }),
        });
        const retryData: any = await retryRes.json();
        return Boolean(retryData.ok);
      }
      return true;
    } catch (err) {
      console.error('Failed to send Telegram message:', err);
      return false;
    }
  }

  /**
   * Human operator manual reply through dashboard
   */
  public static async sendHumanOperatorReply(
    conversationId: string,
    messageText: string,
    operatorName: string = 'Staff Support'
  ): Promise<ChatMessage> {
    const conv = db.getConversationById(conversationId);
    if (!conv) throw new Error('Conversation not found');

    const agent = db.getAgentById(conv.agentId);
    if (!agent) throw new Error('Agent not found');

    const savedMsg = db.appendMessage(conv.id, {
      role: 'human_operator',
      content: messageText,
      metadata: { operatorName },
    });

    if (!conv.isPlayground && agent.telegramBot.token && conv.telegramChatId) {
      await this.sendTelegramMessage(agent.telegramBot.token, conv.telegramChatId, `[${operatorName}]: ${messageText}`);
    }

    return savedMsg;
  }
}
