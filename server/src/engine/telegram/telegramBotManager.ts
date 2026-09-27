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

export class TelegramBotManager {
  private static activePollers: Map<string, { running: boolean; abortController: AbortController }> = new Map();

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

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
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
      return { success: false, error: err.message || 'Network error connecting to Telegram API.' };
    }
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
   * Starts long-polling for an agent bot
   */
  public static startPolling(agentId: string) {
    if (this.activePollers.has(agentId)) {
      this.stopPolling(agentId);
    }

    const agent = db.getAgentById(agentId);
    if (!agent || !agent.telegramBot.token) {
      console.warn(`Cannot start polling: Agent ${agentId} has no valid Telegram token.`);
      return;
    }

    const token = agent.telegramBot.token;
    const abortController = new AbortController();
    this.activePollers.set(agentId, { running: true, abortController });

    console.log(`🤖 Starting live Telegram polling for Agent: ${agent.name} (@${agent.telegramBot.botUsername || 'bot'})...`);

    (async () => {
      let offset = 0;
      while (this.activePollers.get(agentId)?.running) {
        try {
          const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=20`;
          const response = await fetch(url, { signal: abortController.signal });

          if (!response.ok) {
            console.error(`Telegram Polling Error (${agent.name}): HTTP ${response.status}`);
            await new Promise(r => setTimeout(r, 5000));
            continue;
          }

          const result: any = await response.json();
          if (result.ok && Array.isArray(result.result)) {
            const updates: TelegramUpdate[] = result.result;

            for (const update of updates) {
              offset = update.update_id + 1;
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
    const poller = this.activePollers.get(agentId);
    if (poller) {
      poller.running = false;
      poller.abortController.abort();
      this.activePollers.delete(agentId);
      console.log(`🛑 Stopped polling for Agent ${agentId}`);
    }
  }

  /**
   * Stops polling for all active agents during graceful shutdown
   */
  public static stopAllPolling() {
    for (const [agentId, poller] of this.activePollers.entries()) {
      poller.running = false;
      poller.abortController.abort();
      console.log(`🛑 Stopped polling for Agent ${agentId}`);
    }
    this.activePollers.clear();
  }

  /**
   * Dispatches incoming Telegram message into the Agent Orchestrator and sends response
   */
  public static async handleIncomingMessage(agent: Agent, update: TelegramUpdate) {
    if (!update.message || !update.message.text) return;

    const msg = update.message;
    const chatId = String(msg.chat.id);
    const userId = String(msg.from?.id || chatId);
    const username = msg.from?.username || msg.from?.first_name || 'Telegram User';
    const text = (msg.text || '').trim();

    // Query fresh agent configuration from database
    const currentAgent = db.getAgentById(agent.id) || agent;

    try {
      const result = await AgentOrchestrator.execute({
        tenantId: currentAgent.tenantId,
        agentId: currentAgent.id,
        userId,
        username,
        chatId,
        message: text,
        isPlayground: false,
      });

      if (result.reply && currentAgent.telegramBot.token) {
        await this.sendTelegramMessage(currentAgent.telegramBot.token, chatId, result.reply);
      }
    } catch (err: any) {
      console.error(`Error processing Telegram message for ${currentAgent.name}:`, err);
      if (currentAgent.telegramBot.token) {
        await this.sendTelegramMessage(
          currentAgent.telegramBot.token,
          chatId,
          "I apologize, but I encountered a temporary issue processing your message. Our team has been notified."
        );
      }
    }
  }

  /**
   * Sends a message to a Telegram chat
   */
  public static async sendTelegramMessage(token: string, chatId: string | number, text: string): Promise<boolean> {
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
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
          }),
        });
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
