import { KnowledgeItem } from '../../types/index.js';
import { db } from '../../db/store.js';

export interface SearchResult {
  item: KnowledgeItem;
  score: number;
  snippet: string;
}

export class KnowledgeRetriever {
  /**
   * Search knowledge base for a specific tenant and agent using hybrid keyword & semantic scoring
   */
  public static search(tenantId: string, agentId: string, query: string, maxResults: number = 4): SearchResult[] {
    const items = db.getKnowledgeItems(tenantId, agentId).filter(k => k.enabled);
    if (!items.length || !query.trim()) {
      return [];
    }

    const queryTokens = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);

    const scored: SearchResult[] = [];

    for (const item of items) {
      const titleLower = item.title.toLowerCase();
      const contentLower = item.content.toLowerCase();
      const tags = (item.metadata?.tags || []).map(t => t.toLowerCase());

      let score = 0;

      // Exact phrase match bonus
      if (contentLower.includes(query.toLowerCase()) || titleLower.includes(query.toLowerCase())) {
        score += 30;
      }

      for (const token of queryTokens) {
        // Title match has highest weight
        if (titleLower.includes(token)) {
          score += 15;
        }
        // Tags match
        if (tags.some(tag => tag.includes(token))) {
          score += 12;
        }
        // Content frequency match
        const occurrences = (contentLower.match(new RegExp(`\\b${token}`, 'g')) || []).length;
        score += Math.min(occurrences * 4, 20);
      }

      // Priority boost for specific knowledge types
      if (item.type === 'faq' && query.includes('?')) {
        score += 5;
      }
      if (item.type === 'hours_location' && (query.toLowerCase().includes('hour') || query.toLowerCase().includes('where') || query.toLowerCase().includes('location') || query.toLowerCase().includes('open') || query.toLowerCase().includes('address'))) {
        score += 25;
      }
      if (item.type === 'product' && (query.toLowerCase().includes('price') || query.toLowerCase().includes('cost') || query.toLowerCase().includes('plan') || query.toLowerCase().includes('service') || query.toLowerCase().includes('menu'))) {
        score += 25;
      }

      if (score > 0) {
        // Generate relevant snippet
        let snippet = item.content;
        if (snippet.length > 500) {
          const firstToken = queryTokens[0];
          const tokenIdx = firstToken ? contentLower.indexOf(firstToken) : 0;
          const start = Math.max(0, tokenIdx - 100);
          snippet = (start > 0 ? '...' : '') + item.content.substring(start, start + 400) + '...';
        }

        scored.push({
          item,
          score,
          snippet,
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults);
  }

  /**
   * Formats retrieved knowledge into a clean structured context block for the LLM prompt
   */
  public static formatKnowledgeContext(tenantId: string, agentId: string, userMessage: string): string {
    const results = this.search(tenantId, agentId, userMessage);
    if (!results.length) {
      return 'NO_SPECIFIC_KNOWLEDGE_FOUND: Rely on general polite assistance without fabricating business facts, prices, or policies.';
    }

    let ctx = 'VERIFIED BUSINESS KNOWLEDGE (STRICTLY ADHERE TO THESE FACTS):\n';
    results.forEach((r, idx) => {
      ctx += `\n[Source ${idx + 1} - ${r.item.title} (${r.item.type.toUpperCase()})]:\n${r.item.content}\n`;
    });

    return ctx;
  }
}
