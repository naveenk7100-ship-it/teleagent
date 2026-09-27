import { AgentMemoryItem, MemoryLevel, ChatMessage } from '../../types/index.js';
import { db } from '../../db/store.js';

export class MemoryManager {
  /**
   * Retrieves assembled 4-tier memory context for the agent pipeline
   */
  public static getMemoryContext(
    tenantId: string,
    agentId: string,
    userId?: string
  ): {
    conversationMemories: AgentMemoryItem[];
    userMemories: AgentMemoryItem[];
    businessMemories: AgentMemoryItem[];
    formattedString: string;
  } {
    const businessMemories = db.getMemories(tenantId, undefined, 'business');
    const userMemories = userId ? db.getMemories(tenantId, undefined, 'user', userId) : [];
    const conversationMemories = userId ? db.getMemories(tenantId, agentId, 'conversation', userId) : [];

    let formatted = '--- ACTIVE AGENT MEMORY (4-TIER CONTEXT) ---\n';

    if (businessMemories.length > 0) {
      formatted += '\n[Business Level Memory]:\n';
      businessMemories.forEach(m => {
        formatted += `• ${m.key}: ${m.value}\n`;
      });
    }

    if (userMemories.length > 0) {
      formatted += '\n[User Profile Memory]:\n';
      userMemories.forEach(m => {
        formatted += `• ${m.key}: ${m.value}\n`;
      });
    }

    if (conversationMemories.length > 0) {
      formatted += '\n[Conversation Key Facts]:\n';
      conversationMemories.forEach(m => {
        formatted += `• ${m.key}: ${m.value}\n`;
      });
    }

    if (businessMemories.length === 0 && userMemories.length === 0 && conversationMemories.length === 0) {
      formatted += 'No previous persistent memories recorded for this user/business.\n';
    }

    return {
      conversationMemories,
      userMemories,
      businessMemories,
      formattedString: formatted,
    };
  }

  /**
   * Auto-extracts facts from user dialogue to update user or conversation memory
   */
  public static extractAndSaveUserFacts(
    tenantId: string,
    agentId: string,
    userId: string,
    userMessage: string
  ): void {
    if (!userId || !userMessage) return;

    // Detect Name
    const nameMatch = userMessage.match(/(?:my name is|i am|i'm|call me)\s+([A-Z][a-zA-Z\s]{1,30})/i);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim();
      const existing = db.getMemories(tenantId, undefined, 'user', userId).find(m => m.key === 'user_name');
      if (existing) {
        db.updateMemory(existing.id, { value: name });
      } else {
        db.createMemory({
          tenantId,
          agentId,
          level: 'user',
          userId,
          key: 'user_name',
          value: name,
        });
      }
    }

    // Detect Phone
    const phoneMatch = userMessage.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) {
      const phone = phoneMatch[0].trim();
      const existing = db.getMemories(tenantId, undefined, 'user', userId).find(m => m.key === 'phone_number');
      if (existing) {
        db.updateMemory(existing.id, { value: phone });
      } else {
        db.createMemory({
          tenantId,
          agentId,
          level: 'user',
          userId,
          key: 'phone_number',
          value: phone,
        });
      }
    }

    // Detect Email
    const emailMatch = userMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      const email = emailMatch[0].trim();
      const existing = db.getMemories(tenantId, undefined, 'user', userId).find(m => m.key === 'email_address');
      if (existing) {
        db.updateMemory(existing.id, { value: email });
      } else {
        db.createMemory({
          tenantId,
          agentId,
          level: 'user',
          userId,
          key: 'email_address',
          value: email,
        });
      }
    }
  }
}
