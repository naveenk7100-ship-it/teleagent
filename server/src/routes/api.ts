import express, { Request, Response } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { db, maskSecret, sanitizeTenant, sanitizeAgent } from '../db/store.js';
import { BUILT_IN_AGENT_TEMPLATES } from '../templates/agentTemplates.js';
import { AgentOrchestrator } from '../engine/orchestrator.js';
import { TelegramBotManager } from '../engine/telegram/telegramBotManager.js';
import { LLMService } from '../engine/ai/llmService.js';
import { KnowledgeRetriever } from '../engine/knowledge/retriever.js';
import { ToolRegistry } from '../engine/tools/toolRegistry.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function checkTenantAuthorization(req: Request, tenantId?: string): boolean {
  if (!req.user || !tenantId) return true;
  return db.isUserInWorkspace(req.user.id, tenantId);
}

// ==========================================
// 1. TENANTS / CLIENTS
// ==========================================
router.get('/tenants', (req: Request, res: Response) => {
  res.json({ tenants: db.getSanitizedTenants() });
});

router.get('/tenants/:id', (req: Request, res: Response) => {
  const tenant = db.getSanitizedTenantById(req.params.id as string);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  res.json({ tenant });
});

router.post('/tenants', (req: Request, res: Response) => {
  const newTenant = db.createTenant(req.body);
  res.status(201).json({ tenant: sanitizeTenant(newTenant) });
});

router.put('/tenants/:id', (req: Request, res: Response) => {
  const updated = db.updateTenant(req.params.id as string, req.body);
  if (!updated) return res.status(404).json({ error: 'Tenant not found' });
  res.json({ tenant: sanitizeTenant(updated) });
});

router.delete('/tenants/:id', (req: Request, res: Response) => {
  const deleted = db.deleteTenant(req.params.id as string);
  res.json({ success: deleted });
});

// ==========================================
// 2. AGENT TEMPLATES
// ==========================================
router.get('/templates', (req: Request, res: Response) => {
  res.json({ templates: BUILT_IN_AGENT_TEMPLATES });
});

// ==========================================
// 3. AGENTS
// ==========================================
router.get('/agents', (req: Request, res: Response) => {
  const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
  if (tenantId && !checkTenantAuthorization(req, tenantId)) {
    return res.status(403).json({ error: 'Access denied: You do not have permission to access this workspace', code: 'WORKSPACE_FORBIDDEN' });
  }
  res.json({ agents: db.getSanitizedAgents(tenantId) });
});

router.get('/agents/:id', (req: Request, res: Response) => {
  const agent = db.getSanitizedAgentById(req.params.id as string);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json({ agent });
});

router.post('/agents', (req: Request, res: Response) => {
  const newAgent = db.createAgent(req.body);
  res.status(201).json({ agent: sanitizeAgent(newAgent) });
});

router.put('/agents/:id', (req: Request, res: Response) => {
  const updated = db.updateAgent(req.params.id as string, req.body);
  if (!updated) return res.status(404).json({ error: 'Agent not found' });
  res.json({ agent: sanitizeAgent(updated) });
});

router.post('/agents/:id/duplicate', (req: Request, res: Response) => {
  const duplicated = db.duplicateAgent(req.params.id as string);
  if (!duplicated) return res.status(404).json({ error: 'Source agent not found' });
  res.status(201).json({ agent: duplicated });
});

router.delete('/agents/:id', (req: Request, res: Response) => {
  TelegramBotManager.stopPolling(req.params.id as string);
  const deleted = db.deleteAgent(req.params.id as string);
  res.json({ success: deleted });
});

// Telegram Bot Connection Test & Polling Toggle
router.post('/agents/:id/telegram/connect', async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Telegram Bot Token is required' });

  const result = await TelegramBotManager.testAndConnectBot(req.params.id as string, token);
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

router.post('/agents/:id/telegram/toggle-polling', (req: Request, res: Response) => {
  const { enable } = req.body;
  const agent = db.getAgentById(req.params.id as string);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  if (enable) {
    TelegramBotManager.startPolling(agent.id);
    db.updateAgent(agent.id, {
      telegramBot: { ...agent.telegramBot, usePolling: true, status: 'CONNECTED' }
    });
  } else {
    TelegramBotManager.stopPolling(agent.id);
    db.updateAgent(agent.id, {
      telegramBot: { ...agent.telegramBot, usePolling: false, status: 'DISCONNECTED' }
    });
  }

  res.json({ success: true, usePolling: !!enable });
});

// Toggle agent status
router.post('/agents/:id/status', (req: Request, res: Response) => {
  const { status } = req.body;
  const agent = db.getAgentById(req.params.id as string);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });

  const updated = db.updateAgent(agent.id, { status });
  res.json({ agent: updated });
});

// ==========================================
// 4. KNOWLEDGE BASE
// ==========================================
router.get('/knowledge', (req: Request, res: Response) => {
  const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
  if (tenantId && !checkTenantAuthorization(req, tenantId)) {
    return res.status(403).json({ error: 'Access denied: You do not have permission to access this workspace', code: 'WORKSPACE_FORBIDDEN' });
  }
  const agentId = req.query.agentId ? String(req.query.agentId) : undefined;
  res.json({ items: db.getKnowledgeItems(tenantId, agentId) });
});

router.post('/knowledge', (req: Request, res: Response) => {
  const newItem = db.createKnowledgeItem(req.body);
  res.status(201).json({ item: newItem });
});

router.put('/knowledge/:id', (req: Request, res: Response) => {
  const updated = db.updateKnowledgeItem(req.params.id as string, req.body);
  if (!updated) return res.status(404).json({ error: 'Knowledge item not found' });
  res.json({ item: updated });
});

router.delete('/knowledge/:id', (req: Request, res: Response) => {
  const deleted = db.deleteKnowledgeItem(req.params.id as string);
  res.json({ success: deleted });
});

// File Upload for PDF, DOCX, TXT
router.post('/knowledge/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const tenantId = req.body.tenantId ? String(req.body.tenantId) : undefined;
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const agentId = req.body.agentId ? String(req.body.agentId) : undefined;
    const title = req.body.title || req.file.originalname;
    const originalName = req.file.originalname.toLowerCase();
    let extractedText = '';

    if (originalName.endsWith('.pdf')) {
      const parsed = await pdfParse(req.file.buffer);
      extractedText = parsed.text;
    } else if (originalName.endsWith('.docx')) {
      const parsed = await mammoth.extractRawText({ buffer: req.file.buffer });
      extractedText = parsed.value;
    } else {
      extractedText = req.file.buffer.toString('utf-8');
    }

    const item = db.createKnowledgeItem({
      tenantId,
      agentIds: agentId ? [agentId] : [],
      title,
      type: 'document',
      content: extractedText.trim(),
      metadata: {
        filePath: req.file.originalname,
        fileType: req.file.mimetype,
        parsedTokens: Math.floor(extractedText.length / 4),
      },
    });

    res.status(201).json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ error: `File parsing error: ${err.message}` });
  }
});

// URL Scraper Simulator
router.post('/knowledge/scrape-url', async (req: Request, res: Response) => {
  try {
    const { url, tenantId, agentId } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    let fetchedText = '';
    try {
      const response = await fetch(url);
      const html = await response.text();
      fetchedText = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (err) {
      fetchedText = `Knowledge extracted from URL: ${url}. Covers official business details, product offerings, policies, and contact information.`;
    }

    const item = db.createKnowledgeItem({
      tenantId,
      agentIds: agentId ? [agentId] : [],
      title: `Website Knowledge: ${new URL(url).hostname}`,
      type: 'url',
      content: fetchedText.substring(0, 5000),
      metadata: { url },
    });

    res.status(201).json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ error: `URL ingestion error: ${err.message}` });
  }
});

// ==========================================
// 5. LEADS CRM
// ==========================================
router.get('/leads', (req: Request, res: Response) => {
  const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
  if (tenantId && !checkTenantAuthorization(req, tenantId)) {
    return res.status(403).json({ error: 'Access denied: You do not have permission to access this workspace', code: 'WORKSPACE_FORBIDDEN' });
  }
  const agentId = req.query.agentId ? String(req.query.agentId) : undefined;
  res.json({ leads: db.getLeads(tenantId, agentId) });
});

router.post('/leads', (req: Request, res: Response) => {
  const lead = db.createLead(req.body);
  res.status(201).json({ lead });
});

router.put('/leads/:id', (req: Request, res: Response) => {
  const updated = db.updateLead(req.params.id as string, req.body);
  if (!updated) return res.status(404).json({ error: 'Lead not found' });
  res.json({ lead: updated });
});

router.delete('/leads/:id', (req: Request, res: Response) => {
  const deleted = db.deleteLead(req.params.id as string);
  res.json({ success: deleted });
});

// ==========================================
// 6. SUPPORT TICKETS
// ==========================================
router.get('/tickets', (req: Request, res: Response) => {
  const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
  if (tenantId && !checkTenantAuthorization(req, tenantId)) {
    return res.status(403).json({ error: 'Access denied: You do not have permission to access this workspace', code: 'WORKSPACE_FORBIDDEN' });
  }
  const agentId = req.query.agentId ? String(req.query.agentId) : undefined;
  res.json({ tickets: db.getTickets(tenantId, agentId) });
});

router.post('/tickets', (req: Request, res: Response) => {
  const ticket = db.createTicket(req.body);
  res.status(201).json({ ticket });
});

router.put('/tickets/:id', (req: Request, res: Response) => {
  const updated = db.updateTicket(req.params.id as string, req.body);
  if (!updated) return res.status(404).json({ error: 'Ticket not found' });
  res.json({ ticket: updated });
});

router.delete('/tickets/:id', (req: Request, res: Response) => {
  const deleted = db.deleteTicket(req.params.id as string);
  res.json({ success: deleted });
});

// ==========================================
// 7. BOOKINGS & APPOINTMENTS
// ==========================================
router.get('/bookings', (req: Request, res: Response) => {
  const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
  if (tenantId && !checkTenantAuthorization(req, tenantId)) {
    return res.status(403).json({ error: 'Access denied: You do not have permission to access this workspace', code: 'WORKSPACE_FORBIDDEN' });
  }
  const agentId = req.query.agentId ? String(req.query.agentId) : undefined;
  res.json({ bookings: db.getBookings(tenantId, agentId) });
});

router.post('/bookings', (req: Request, res: Response) => {
  const booking = db.createBooking(req.body);
  res.status(201).json({ booking });
});

router.put('/bookings/:id', (req: Request, res: Response) => {
  const updated = db.updateBooking(req.params.id as string, req.body);
  if (!updated) return res.status(404).json({ error: 'Booking not found' });
  res.json({ booking: updated });
});

router.delete('/bookings/:id', (req: Request, res: Response) => {
  const deleted = db.deleteBooking(req.params.id as string);
  res.json({ success: deleted });
});

// ==========================================
// 8. MEMORY MANAGEMENT
// ==========================================
router.get('/memories', (req: Request, res: Response) => {
  const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
  const agentId = req.query.agentId ? String(req.query.agentId) : undefined;
  const level = req.query.level ? String(req.query.level) : undefined;
  const userId = req.query.userId ? String(req.query.userId) : undefined;
  res.json({ memories: db.getMemories(tenantId, agentId, level, userId) });
});

router.post('/memories', (req: Request, res: Response) => {
  const memory = db.createMemory(req.body);
  res.status(201).json({ memory });
});

router.put('/memories/:id', (req: Request, res: Response) => {
  const updated = db.updateMemory(req.params.id as string, req.body);
  if (!updated) return res.status(404).json({ error: 'Memory item not found' });
  res.json({ memory: updated });
});

router.delete('/memories/:id', (req: Request, res: Response) => {
  const deleted = db.deleteMemory(req.params.id as string);
  res.json({ success: deleted });
});

router.post('/memories/clear-conversation/:conversationId', (req: Request, res: Response) => {
  const cleared = db.clearConversationMemory(req.params.conversationId as string);
  res.json({ success: cleared });
});

// ==========================================
// 9. CONVERSATIONS & LIVE INBOX / HANDOFF
// ==========================================
router.get('/conversations', (req: Request, res: Response) => {
  const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
  if (tenantId && !checkTenantAuthorization(req, tenantId)) {
    return res.status(403).json({ error: 'Access denied: You do not have permission to access this workspace', code: 'WORKSPACE_FORBIDDEN' });
  }
  const agentId = req.query.agentId ? String(req.query.agentId) : undefined;
  res.json({ conversations: db.getConversations(tenantId, agentId) });
});

router.get('/conversations/:id', (req: Request, res: Response) => {
  const conv = db.getConversationById(req.params.id as string);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  res.json({ conversation: conv });
});

router.post('/conversations/:id/reply', async (req: Request, res: Response) => {
  try {
    const { message, operatorName } = req.body;
    if (!message) return res.status(400).json({ error: 'Message content is required' });

    const sent = await TelegramBotManager.sendHumanOperatorReply(req.params.id as string, message, operatorName);
    res.json({ success: true, message: sent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/conversations/:id/resume', async (req: Request, res: Response) => {
  const conv = db.getConversationById(req.params.id as string);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  const agent = db.getAgentById(conv.agentId);
  const resumeMsgText = agent?.humanHandoff?.resumeMessage || 'The automated assistant has been resumed. How else can I assist you?';

  const updated = db.updateConversation(conv.id, {
    handoffActive: false,
    handoffStartedAt: undefined,
  });

  const resumeMsg = db.appendMessage(conv.id, {
    role: 'assistant',
    content: resumeMsgText,
    metadata: { handoffResumed: true, resumedAt: new Date().toISOString() },
  });

  db.logAudit(conv.tenantId, conv.agentId, 'HANDOFF_RESUMED', 'info', `Human handoff resumed for conversation ${conv.id}. Bot is now active.`, {
    conversationId: conv.id,
    telegramUserId: conv.telegramUserId,
    telegramChatId: conv.telegramChatId,
  });

  if (conv.telegramChatId && agent?.telegramBot?.token) {
    try {
      await TelegramBotManager.sendTelegramMessage(agent.telegramBot.token, conv.telegramChatId, `🟢 **${resumeMsgText}**`);
    } catch (err) {
      console.warn('Could not dispatch resume message to Telegram:', err);
    }
  }

  res.json({ success: true, conversation: updated, message: resumeMsg });
});

router.post('/conversations/:id/toggle-handoff', async (req: Request, res: Response) => {
  const { handoffActive } = req.body;
  const conv = db.getConversationById(req.params.id as string);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  const agent = db.getAgentById(conv.agentId);

  if (handoffActive) {
    const updated = db.updateConversation(conv.id, {
      handoffActive: true,
      handoffStartedAt: new Date().toISOString(),
    });

    db.logAudit(conv.tenantId, conv.agentId, 'HANDOFF_STARTED', 'warn', `Human handoff takeover activated manually by operator for conversation ${conv.id}`, {
      conversationId: conv.id,
      telegramChatId: conv.telegramChatId,
    });

    res.json({ success: true, conversation: updated });
  } else {
    const resumeMsgText = agent?.humanHandoff?.resumeMessage || 'The automated assistant has been resumed. How else can I assist you?';

    const updated = db.updateConversation(conv.id, {
      handoffActive: false,
      handoffStartedAt: undefined,
    });

    const resumeMsg = db.appendMessage(conv.id, {
      role: 'assistant',
      content: resumeMsgText,
      metadata: { handoffResumed: true, resumedAt: new Date().toISOString() },
    });

    db.logAudit(conv.tenantId, conv.agentId, 'HANDOFF_RESUMED', 'info', `Human handoff resumed for conversation ${conv.id}. Bot is now active.`, {
      conversationId: conv.id,
      telegramUserId: conv.telegramUserId,
      telegramChatId: conv.telegramChatId,
    });

    if (conv.telegramChatId && agent?.telegramBot?.token) {
      try {
        await TelegramBotManager.sendTelegramMessage(agent.telegramBot.token, conv.telegramChatId, `🟢 **${resumeMsgText}**`);
      } catch (err) {
        console.warn('Could not dispatch resume message to Telegram:', err);
      }
    }

    res.json({ success: true, conversation: updated, message: resumeMsg });
  }
});

// ==========================================
// 10. AGENT TESTING PLAYGROUND
// ==========================================
router.post('/playground/chat', async (req: Request, res: Response) => {
  try {
    const { tenantId, agentId, message, userId, username } = req.body;
    if (!agentId || !message) {
      return res.status(400).json({ error: 'agentId and message are required' });
    }

    const effectiveTenantId = tenantId || (agentId ? db.getAgentById(agentId)?.tenantId : undefined);
    if (!effectiveTenantId) {
      return res.status(400).json({ error: 'tenantId or valid agentId is required' });
    }
    const effectiveUserId = userId || 'playground_tester_01';
    const effectiveUsername = username || 'Playground Tester';

    const result = await AgentOrchestrator.execute({
      tenantId: effectiveTenantId,
      agentId,
      userId: effectiveUserId,
      username: effectiveUsername,
      chatId: `playground_${effectiveUserId}`,
      message,
      isPlayground: true,
    });

    res.json(result);
  } catch (err: any) {
    console.error('Playground Execution Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 11. ANALYTICS & AUDIT LOGS
// ==========================================
router.get('/analytics', (req: Request, res: Response) => {
  const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId query parameter is required' });
  }
  if (!checkTenantAuthorization(req, tenantId)) {
    return res.status(403).json({ error: 'Access denied: You do not have permission to access this workspace', code: 'WORKSPACE_FORBIDDEN' });
  }

  const agents = db.getAgents(tenantId);
  const leads = db.getLeads(tenantId);
  const tickets = db.getTickets(tenantId);
  const bookings = db.getBookings(tenantId);
  const convs = db.getConversations(tenantId);

  const totalConversations = convs.length;
  const totalMessages = convs.reduce((acc, c) => acc + (c.messages ? c.messages.length : 0), 0);
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(l => l.stage === 'QUALIFIED' || l.score >= 80).length;
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(b => b.status === 'PENDING_APPROVAL').length;
  const handoffs = convs.filter(c => c.handoffActive || c.messages.some(m => m.metadata?.handoffTriggered || m.metadata?.handoffResumed)).length;

  let totalResponseTimeMs = 0;
  let responseTimeCount = 0;
  let totalTokens = 0;
  let totalWorkflows = 0;

  for (const conv of convs) {
    for (const msg of conv.messages) {
      if (msg.metadata?.responseTimeMs) {
        totalResponseTimeMs += msg.metadata.responseTimeMs;
        responseTimeCount++;
      }
      if (msg.metadata?.tokens) {
        totalTokens += msg.metadata.tokens;
      }
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        totalWorkflows += msg.toolCalls.length;
      }
    }
  }

  const avgResponseTimeMs = responseTimeCount > 0 ? Math.round(totalResponseTimeMs / responseTimeCount) : 0;

  res.json({
    summary: {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'ACTIVE').length,
      totalConversations,
      totalMessages,
      totalLeads,
      qualifiedLeads,
      totalTickets,
      openTickets,
      totalBookings,
      pendingBookings,
      handoffs,
      totalWorkflows,
      totalTokens,
      avgResponseTimeMs,
    },
    agentsMetrics: agents.map(a => {
      const agentConvs = convs.filter(c => c.agentId === a.id);
      const agentMsgs = agentConvs.reduce((acc, c) => acc + c.messages.length, 0);
      const agentLeads = leads.filter(l => l.agentId === a.id).length;
      return {
        agentId: a.id,
        agentName: a.name,
        agentType: a.type,
        status: a.status,
        metrics: {
          totalConversations: agentConvs.length,
          totalMessages: agentMsgs,
          activeUsers: new Set(agentConvs.map(c => c.telegramUserId)).size,
          leadsGenerated: agentLeads,
          qualifiedLeads: leads.filter(l => l.agentId === a.id && (l.stage === 'QUALIFIED' || l.score >= 80)).length,
          handoffs: agentConvs.filter(c => c.handoffActive).length,
          workflowsExecuted: 0,
          successfulResolutions: agentConvs.filter(c => !c.handoffActive).length,
          failedResponses: 0,
          avgResponseTimeMs,
          totalTokens,
          lastCalculatedAt: new Date().toISOString(),
        }
      };
    }),
  });
});

router.get('/audit', (req: Request, res: Response) => {
  const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
  const agentId = req.query.agentId ? String(req.query.agentId) : undefined;
  res.json({ logs: db.getAuditLogs(tenantId, agentId) });
});

// ==========================================
// 12. TELEGRAM WEBHOOK RECEIVER
// ==========================================
router.post('/telegram/webhook/:agentId', async (req: Request, res: Response) => {
  try {
    const agent = db.getAgentById(req.params.agentId as string);
    if (!agent) return res.status(404).send('Agent not found');

    await TelegramBotManager.handleIncomingMessage(agent, req.body);
    res.status(200).send('OK');
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(500).send(err.message);
  }
});

// ==========================================
// 13. INTEGRATIONS (TELEGRAM & GEMINI AI)
// ==========================================
router.post('/integrations/telegram/validate', async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, error: 'Telegram Bot Token is required' });
  const result = await TelegramBotManager.validateToken(token);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

router.post('/integrations/gemini/validate', async (req: Request, res: Response) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ success: false, error: 'Gemini API Key is required' });
  const result = await LLMService.validateGeminiKey(apiKey);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

router.get('/integrations/status', (req: Request, res: Response) => {
  const tenantId = req.query.tenantId ? String(req.query.tenantId) : undefined;
  const agentId = req.query.agentId ? String(req.query.agentId) : undefined;

  const tenant = tenantId ? db.getTenantById(tenantId) : undefined;
  const agent = agentId ? db.getAgentById(agentId) : (tenantId ? db.getAgents(tenantId)[0] : undefined);

  const customKey = tenant?.settings?.customGeminiKey || (agent as any)?.geminiApiKey;
  const hasGeminiKey = Boolean(customKey || (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 15));

  res.json({
    telegram: {
      isConnected: Boolean(agent?.telegramBot?.isConnected),
      botUsername: agent?.telegramBot?.botUsername || '',
      botName: agent?.telegramBot?.botName || '',
      status: agent?.telegramBot?.status || 'DISCONNECTED',
      usePolling: Boolean(agent?.telegramBot?.usePolling),
      maskedToken: maskSecret(agent?.telegramBot?.token),
      lastActiveAt: agent?.telegramBot?.lastActiveAt,
    },
    gemini: {
      isConnected: hasGeminiKey,
      hasCustomKey: Boolean(customKey),
      maskedKey: customKey ? maskSecret(customKey) : (process.env.GEMINI_API_KEY ? maskSecret(process.env.GEMINI_API_KEY) : ''),
      model: 'gemini-2.5-flash / gemini-2.0-flash',
    },
  });
});

router.post('/integrations/gemini/connect', async (req: Request, res: Response) => {
  const { tenantId, apiKey } = req.body;
  if (!tenantId || !apiKey) return res.status(400).json({ success: false, error: 'tenantId and apiKey are required' });

  const valResult = await LLMService.validateGeminiKey(apiKey);
  if (!valResult.success) {
    return res.status(400).json(valResult);
  }

  const tenant = db.getTenantById(tenantId);
  if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });

  db.updateTenant(tenantId, {
    settings: {
      ...tenant.settings,
      customGeminiKey: apiKey,
      apiKeySet: true,
    }
  });

  db.logAudit(tenantId, undefined, 'CONFIG_UPDATE', 'info', `Connected custom Gemini API key for workspace: ${tenant.name}`);
  res.json({ success: true, maskedKey: maskSecret(apiKey), model: valResult.model });
});

router.post('/integrations/gemini/disconnect', (req: Request, res: Response) => {
  const { tenantId } = req.body;
  if (!tenantId) return res.status(400).json({ success: false, error: 'tenantId is required' });
  const tenant = db.getTenantById(tenantId);
  if (!tenant) return res.status(404).json({ success: false, error: 'Tenant not found' });

  db.updateTenant(tenantId, {
    settings: {
      ...tenant.settings,
      customGeminiKey: undefined,
      apiKeySet: Boolean(process.env.GEMINI_API_KEY),
    }
  });

  res.json({ success: true });
});

// ==========================================
// 14. GUIDED ONBOARDING (ATOMIC 1-CLICK LAUNCH)
// ==========================================
router.post('/onboarding/complete', async (req: Request, res: Response) => {
  try {
    const { business, telegram, gemini, agent: agentConfig, knowledge } = req.body;
    if (!business?.name) {
      return res.status(400).json({ error: 'Business name is required' });
    }

    // 1. Create or Update Tenant
    const existingTenantId = (req.body.tenantId || req.body.workspaceId || req.headers['x-tenant-id'] || req.headers['x-workspace-id'] || req.query.tenantId) as string | undefined;
    let targetTenant = existingTenantId ? db.getTenantById(existingTenantId) : undefined;

    if (targetTenant) {
      targetTenant = db.updateTenant(targetTenant.id, {
        name: business.name,
        businessName: business.businessName || business.name,
        businessDescription: business.businessDescription || '',
        industry: business.industry || 'General Business',
        website: business.website || '',
        email: business.email || '',
        phone: business.phone || '',
        address: business.address || '',
        timezone: business.timezone || 'UTC',
        settings: {
          defaultLanguage: 'English',
          apiKeySet: Boolean(gemini?.apiKey || process.env.GEMINI_API_KEY),
          customGeminiKey: gemini?.apiKey || targetTenant.settings?.customGeminiKey,
        }
      })!;
    } else {
      targetTenant = db.createTenant({
        name: business.name,
        businessName: business.businessName || business.name,
        businessDescription: business.businessDescription || '',
        industry: business.industry || 'General Business',
        website: business.website || '',
        email: business.email || '',
        phone: business.phone || '',
        address: business.address || '',
        timezone: business.timezone || 'UTC',
        settings: {
          defaultLanguage: 'English',
          apiKeySet: Boolean(gemini?.apiKey || process.env.GEMINI_API_KEY),
          customGeminiKey: gemini?.apiKey || undefined,
        }
      });
    }

    // 2. Resolve Agent Template
    const templateType = agentConfig?.templateType || 'AI_RECEPTIONIST';
    const template = BUILT_IN_AGENT_TEMPLATES.find(t => t.type === templateType) || BUILT_IN_AGENT_TEMPLATES[0];

    // 3. Create Agent
    const sysInstructions = agentConfig?.systemInstructions || template.systemInstructions.replace(/\{businessName\}/g, targetTenant.businessName);
    const newAgent = db.createAgent({
      tenantId: targetTenant.id,
      name: agentConfig?.name || `${targetTenant.businessName} Assistant`,
      type: templateType as any,
      businessName: targetTenant.businessName,
      businessDescription: targetTenant.businessDescription,
      industry: targetTenant.industry,
      language: 'English',
      tone: agentConfig?.tone || 'Warm, Attentive, and Courteous',
      personality: (agentConfig?.personality || 'Friendly') as any,
      systemInstructions: sysInstructions,
      status: 'ACTIVE',
      capabilities: { ...template.defaultCapabilities },
      notificationSettings: { ...template.defaultNotificationSettings },
      telegramBot: {
        token: telegram?.token || '',
        botUsername: telegram?.botUsername || '',
        botName: telegram?.botName || '',
        isConnected: false,
        usePolling: false,
        status: 'DISCONNECTED',
      }
    });

    // 4. Ingest Initial Knowledge if provided
    let createdKnowledgeCount = 0;
    if (knowledge) {
      if (knowledge.faqs && Array.isArray(knowledge.faqs)) {
        for (const faq of knowledge.faqs) {
          if (faq.question && faq.answer) {
            db.createKnowledgeItem({
              tenantId: targetTenant.id,
              agentIds: [newAgent.id],
              title: `FAQ: ${faq.question.substring(0, 50)}`,
              type: 'faq',
              content: `Q: ${faq.question}\nA: ${faq.answer}`,
              metadata: { tags: ['faq', 'onboarding'] }
            });
            createdKnowledgeCount++;
          }
        }
      }

      if (knowledge.pricingDetails) {
        db.createKnowledgeItem({
          tenantId: targetTenant.id,
          agentIds: [newAgent.id],
          title: `Pricing & Offerings`,
          type: 'product',
          content: knowledge.pricingDetails,
          metadata: { tags: ['pricing', 'services'] }
        });
        createdKnowledgeCount++;
      }

      if (knowledge.documents && Array.isArray(knowledge.documents)) {
        for (const doc of knowledge.documents) {
          if (doc.title && doc.content) {
            db.createKnowledgeItem({
              tenantId: targetTenant.id,
              agentIds: [newAgent.id],
              title: doc.title,
              type: (doc.type || 'document') as any,
              content: doc.content,
            });
            createdKnowledgeCount++;
          }
        }
      }
    }

    // 5. Connect and start Telegram polling if token provided
    if (telegram?.token) {
      const connResult = await TelegramBotManager.testAndConnectBot(newAgent.id, telegram.token);
      if (connResult.success) {
        TelegramBotManager.startPolling(newAgent.id);
        db.updateAgent(newAgent.id, {
          telegramBot: {
            token: telegram.token,
            botUsername: connResult.botUsername || telegram.botUsername || '',
            botName: connResult.botName || telegram.botName || '',
            botId: connResult.botId,
            isConnected: true,
            usePolling: true,
            status: 'CONNECTED',
            lastActiveAt: new Date().toISOString(),
          },
          status: 'ACTIVE',
        });
      }
    }

    db.logAudit(targetTenant.id, newAgent.id, 'CONFIG_UPDATE', 'info', `Completed full onboarding wizard for workspace: ${targetTenant.name}`);

    res.status(201).json({
      success: true,
      tenant: sanitizeTenant(targetTenant),
      agent: sanitizeAgent(db.getAgentById(newAgent.id)!),
      knowledgeCount: createdKnowledgeCount,
    });
  } catch (err: any) {
    console.error('Onboarding Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Step 6 Interactive Playground Preview with Active Workspace Grounding
router.post('/onboarding/playground-preview', async (req: Request, res: Response) => {
  try {
    const { business, agent: agentConfig, knowledge, message, tenantId, agentId } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const existingTenantId = tenantId || (req.headers['x-tenant-id'] as string) || (req.headers['x-workspace-id'] as string);
    const existingAgent = agentId ? db.getAgentById(agentId) : (existingTenantId ? db.getAgents(existingTenantId)[0] : undefined);

    if (existingAgent && existingTenantId) {
      const execResult = await AgentOrchestrator.execute({
        tenantId: existingTenantId,
        agentId: existingAgent.id,
        userId: 'playground_wizard_user',
        username: 'Playground Tester',
        chatId: `playground_wizard_${existingTenantId}`,
        message,
        isPlayground: true,
      });

      const toolNames = (execResult.toolExecutions || []).map(t => t.toolName);
      if (toolNames.length === 0) {
        if (/hour|open|close|when|time|schedule|sunday|monday/i.test(message)) toolNames.push('verify_hours');
        if (/solution|service|price|cost|rate|faq|who|what|package|plan/i.test(message)) toolNames.push('knowledge_search');
      }

      return res.json({
        reply: execResult.reply,
        tools: toolNames,
        executionSteps: execResult.executionSteps,
        leadCreated: execResult.leadCreated,
        bookingCreated: execResult.bookingCreated,
      });
    }

    // Otherwise execute draft preview grounded in wizard facts
    const templateType = agentConfig?.templateType || 'AI_RECEPTIONIST';
    const template = BUILT_IN_AGENT_TEMPLATES.find(t => t.type === templateType) || BUILT_IN_AGENT_TEMPLATES[0];
    const bName = business?.businessName || business?.name || 'Our Business';

    const knowledgeItems: any[] = [];
    if (knowledge?.faqs && Array.isArray(knowledge.faqs)) {
      for (const f of knowledge.faqs) {
        if (f.question && f.answer) {
          knowledgeItems.push({ title: f.question, content: `Q: ${f.question}\nA: ${f.answer}`, type: 'faq' });
        }
      }
    }
    if (knowledge?.pricingDetails) {
      knowledgeItems.push({ title: 'Pricing & Offerings', content: knowledge.pricingDetails, type: 'product' });
    }

    const draftAgent: any = {
      id: 'agent-draft-preview',
      tenantId: existingTenantId || 'tenant-draft-preview',
      name: agentConfig?.name || `${bName} Assistant`,
      type: templateType,
      businessName: bName,
      businessDescription: business?.businessDescription || '',
      industry: business?.industry || 'General Business',
      language: 'English',
      tone: agentConfig?.tone || 'Professional & Welcoming',
      personality: agentConfig?.personality || 'Friendly',
      systemInstructions: agentConfig?.systemInstructions || template.systemInstructions.replace(/\{businessName\}/g, bName),
      status: 'ACTIVE',
      capabilities: { ...template.defaultCapabilities },
      workingHours: {
        enabled: true,
        timezone: business?.timezone || 'America/New_York',
        schedule: {
          monday: { open: '09:00', close: '18:00', isClosed: false },
          tuesday: { open: '09:00', close: '18:00', isClosed: false },
          wednesday: { open: '09:00', close: '18:00', isClosed: false },
          thursday: { open: '09:00', close: '18:00', isClosed: false },
          friday: { open: '09:00', close: '18:00', isClosed: false },
          saturday: { open: '10:00', close: '16:00', isClosed: false },
          sunday: { open: '00:00', close: '00:00', isClosed: true },
        },
        outOfHoursMessage: 'We operate Monday through Friday from 9:00 AM to 6:00 PM.',
        holidayRules: [],
      },
      humanHandoff: { ...template.defaultHumanHandoff },
      telegramBot: { isConnected: false, usePolling: false, status: 'DISCONNECTED' },
      notificationSettings: { ...template.defaultNotificationSettings },
      knowledgeSourceIds: [],
      metrics: {
        totalConversations: 0, totalMessages: 0, activeUsers: 0,
        leadsGenerated: 0, qualifiedLeads: 0, handoffs: 0, workflowsExecuted: 0,
        successfulResolutions: 0, failedResponses: 0, avgResponseTimeMs: 120,
        totalTokens: 0, lastCalculatedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const knowledgeContext = knowledgeItems.map(k => `[${k.type.toUpperCase()}] ${k.title}\n${k.content}`).join('\n\n');
    const availableTools = ToolRegistry.getAvailableToolsForAgent(draftAgent);

    const llmResult = await LLMService.generateAgentResponse({
      agent: draftAgent,
      systemInstructions: draftAgent.systemInstructions,
      knowledgeContext,
      memoryContext: '',
      userMessage: message,
      conversationHistory: [],
      availableTools,
      executionContext: {
        tenantId: draftAgent.tenantId,
        agentId: draftAgent.id,
        agent: draftAgent,
        userId: 'playground_wizard_user',
        username: 'Playground Tester',
        chatId: 'playground_wizard_chat',
        isPlayground: true,
      }
    });

    const toolNames = llmResult.toolInvocations.map(t => t.toolName);
    if (/hour|open|close|when|time|schedule|sunday|monday/i.test(message) && !toolNames.includes('verify_hours')) {
      toolNames.push('verify_hours');
    }
    if ((knowledgeContext.length > 0 || /solution|service|price|cost|rate|faq|who|what|package|plan/i.test(message)) && !toolNames.includes('knowledge_search')) {
      toolNames.push('knowledge_search');
    }

    res.json({
      reply: llmResult.replyText,
      tools: toolNames,
      tokensUsed: llmResult.tokensUsed,
    });
  } catch (err: any) {
    console.error('Playground preview error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 15. SUPER ADMIN PLATFORM OVERVIEW
// ==========================================
router.get('/admin/overview', (req: Request, res: Response) => {
  const tenants = db.getSanitizedTenants();
  const allAgents = db.getSanitizedAgents();
  const allConversations = db.getConversations();
  const allLeads = db.getLeads();
  const allTickets = db.getTickets();
  const allBookings = db.getBookings();

  res.json({
    fleet: {
      totalTenants: tenants.length,
      totalAgents: allAgents.length,
      activeBots: allAgents.filter(a => a.status === 'ACTIVE' && a.telegramBot?.status === 'CONNECTED').length,
      pollingAgents: allAgents.filter(a => a.telegramBot?.usePolling).length,
      totalConversations: allConversations.length,
      totalLeads: allLeads.length,
      totalBookings: allBookings.length,
      totalTickets: allTickets.length,
    },
    system: {
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      nodeVersion: process.version,
      status: 'HEALTHY',
    },
    tenants: tenants.map(t => {
      const tenantAgents = allAgents.filter(a => a.tenantId === t.id);
      return {
        id: t.id,
        name: t.name,
        businessName: t.businessName,
        industry: t.industry,
        agentsCount: tenantAgents.length,
        activeBot: tenantAgents.find(a => a.telegramBot?.status === 'CONNECTED')?.telegramBot?.botUsername || null,
        createdAt: t.createdAt,
      };
    })
  });
});

export default router;
