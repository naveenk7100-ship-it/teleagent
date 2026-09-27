import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { IRepository } from './IRepository.js';
import {
  Tenant,
  Agent,
  KnowledgeItem,
  Lead,
  SupportTicket,
  BookingRequest,
  AgentMemoryItem,
  ConversationThread,
  ChatMessage,
  AuditLog,
  User,
  WorkspaceMember,
  AuthSession,
  UserRole
} from '../types/index.js';
import { JsonRepository, sanitizeAgent, sanitizeTenant } from './store.js';
import { SecretService } from '../services/secretService.js';

const { Pool } = pg;

/**
 * Production PostgreSQL Repository Implementation
 * Connects to PostgreSQL using pg.Pool when DATABASE_URL is configured.
 * Seamlessly falls back to file-backed JsonRepository for local development when DATABASE_URL is absent.
 */
export class PostgresRepository implements IRepository {
  private pool: pg.Pool | null = null;
  private fallback: JsonRepository;
  public isPgActive = false;

  constructor() {
    this.fallback = new JsonRepository();
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl && databaseUrl.trim() !== '') {
      try {
        this.pool = new Pool({
          connectionString: databaseUrl,
          ssl: databaseUrl.includes('sslmode=require') || process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });
        this.isPgActive = true;
        console.log('🐘 PostgreSQL Repository active and connected via pg connection pool.');
      } catch (err: any) {
        console.error('⚠️ Failed to initialize PostgreSQL pool, falling back to local store:', err.message);
        this.isPgActive = false;
      }
    }
  }

  /**
   * Tests PostgreSQL database connectivity for readiness checks
   */
  public async ping(): Promise<boolean> {
    if (!this.isPgActive || !this.pool) {
      return true; // Json fallback is always ready
    }
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gracefully ends the PostgreSQL connection pool
   */
  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('🐘 PostgreSQL pool closed.');
    }
  }

  // ==========================================
  // 1. USERS
  // ==========================================
  public async getUserById(id: string): Promise<User | undefined> {
    if (!this.isPgActive || !this.pool) return this.fallback.getUserById(id);
    const { rows } = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (!rows[0]) return undefined;
    return this.mapUser(rows[0]);
  }

  public async getUserByEmail(email: string): Promise<User | undefined> {
    if (!this.isPgActive || !this.pool) return this.fallback.getUserByEmail(email);
    const { rows } = await this.pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (!rows[0]) return undefined;
    return this.mapUser(rows[0]);
  }

  public async createUser(data: { email: string; passwordHash: string; name: string; role?: UserRole }): Promise<User> {
    if (!this.isPgActive || !this.pool) return this.fallback.createUser(data);
    const id = `usr-${uuidv4().substring(0, 8)}`;
    const role = data.role || 'OWNER';
    const now = new Date().toISOString();
    const { rows } = await this.pool.query(
      `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, data.email, data.passwordHash, data.name, role, now, now]
    );
    return this.mapUser(rows[0]);
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    if (!this.isPgActive || !this.pool) return this.fallback.updateUser(id, updates);
    const existing = await this.getUserById(id);
    if (!existing) return null;
    const name = updates.name !== undefined ? updates.name : existing.name;
    const role = updates.role !== undefined ? updates.role : existing.role;
    const now = new Date().toISOString();
    const { rows } = await this.pool.query(
      `UPDATE users SET name = $1, role = $2, updated_at = $3 WHERE id = $4 RETURNING *`,
      [name, role, now, id]
    );
    return rows[0] ? this.mapUser(rows[0]) : null;
  }

  public async listUsers(): Promise<User[]> {
    if (!this.isPgActive || !this.pool) return this.fallback.listUsers();
    const { rows } = await this.pool.query('SELECT * FROM users ORDER BY created_at DESC');
    return rows.map(r => this.mapUser(r));
  }

  // ==========================================
  // 2. WORKSPACE MEMBERSHIPS
  // ==========================================
  public async addWorkspaceMember(member: { workspaceId: string; userId: string; role?: UserRole }): Promise<WorkspaceMember> {
    if (!this.isPgActive || !this.pool) return this.fallback.addWorkspaceMember(member);
    const id = `mem-${uuidv4().substring(0, 8)}`;
    const role = member.role || 'MEMBER';
    const now = new Date().toISOString();
    const { rows } = await this.pool.query(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [id, member.workspaceId, member.userId, role, now]
    );
    return this.mapMember(rows[0]);
  }

  public async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    if (!this.isPgActive || !this.pool) return this.fallback.getWorkspaceMembers(workspaceId);
    const { rows } = await this.pool.query('SELECT * FROM workspace_members WHERE workspace_id = $1', [workspaceId]);
    return rows.map(r => this.mapMember(r));
  }

  public async getUserWorkspaces(userId: string): Promise<Tenant[]> {
    if (!this.isPgActive || !this.pool) return this.fallback.getUserWorkspaces(userId);
    const { rows } = await this.pool.query(
      `SELECT t.* FROM tenants t
       INNER JOIN workspace_members wm ON t.id = wm.workspace_id
       WHERE wm.user_id = $1 ORDER BY t.created_at ASC`,
      [userId]
    );
    return rows.map(r => this.mapTenant(r));
  }

  public async isUserInWorkspace(userId: string, workspaceId: string): Promise<boolean> {
    if (!this.isPgActive || !this.pool) return this.fallback.isUserInWorkspace(userId, workspaceId);
    const { rows } = await this.pool.query(
      'SELECT 1 FROM workspace_members WHERE user_id = $1 AND workspace_id = $2 LIMIT 1',
      [userId, workspaceId]
    );
    return rows.length > 0;
  }

  public async getUserWorkspaceRole(userId: string, workspaceId: string): Promise<UserRole | null> {
    if (!this.isPgActive || !this.pool) return this.fallback.getUserWorkspaceRole(userId, workspaceId);
    const { rows } = await this.pool.query(
      'SELECT role FROM workspace_members WHERE user_id = $1 AND workspace_id = $2 LIMIT 1',
      [userId, workspaceId]
    );
    return rows[0] ? (rows[0].role as UserRole) : null;
  }

  // ==========================================
  // 3. AUTH SESSIONS
  // ==========================================
  public async createSession(session: { token: string; userId: string; workspaceId: string; expiresAt: string }): Promise<AuthSession> {
    if (!this.isPgActive || !this.pool) return this.fallback.createSession(session);
    const now = new Date().toISOString();
    const { rows } = await this.pool.query(
      `INSERT INTO auth_sessions (token, user_id, workspace_id, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [session.token, session.userId, session.workspaceId, session.expiresAt, now]
    );
    return this.mapSession(rows[0]);
  }

  public async getSession(token: string): Promise<AuthSession | undefined> {
    if (!this.isPgActive || !this.pool) return this.fallback.getSession(token);
    const { rows } = await this.pool.query('SELECT * FROM auth_sessions WHERE token = $1', [token]);
    if (!rows[0]) return undefined;
    return this.mapSession(rows[0]);
  }

  public async deleteSession(token: string): Promise<boolean> {
    if (!this.isPgActive || !this.pool) return this.fallback.deleteSession(token);
    const res = await this.pool.query('DELETE FROM auth_sessions WHERE token = $1', [token]);
    return (res.rowCount ?? 0) > 0;
  }

  public async deleteUserSessions(userId: string): Promise<number> {
    if (!this.isPgActive || !this.pool) return this.fallback.deleteUserSessions(userId);
    const res = await this.pool.query('DELETE FROM auth_sessions WHERE user_id = $1', [userId]);
    return res.rowCount ?? 0;
  }

  // ==========================================
  // 4. TENANTS (WORKSPACES)
  // ==========================================
  public async getTenants(): Promise<Tenant[]> {
    if (!this.isPgActive || !this.pool) return this.fallback.getTenants();
    const { rows } = await this.pool.query('SELECT * FROM tenants ORDER BY created_at ASC');
    return rows.map(r => this.mapTenant(r));
  }

  public async getSanitizedTenants(): Promise<Tenant[]> {
    const tenants = await this.getTenants();
    return tenants.map(sanitizeTenant);
  }

  public async getTenantById(id: string): Promise<Tenant | undefined> {
    if (!this.isPgActive || !this.pool) return this.fallback.getTenantById(id);
    const { rows } = await this.pool.query('SELECT * FROM tenants WHERE id = $1', [id]);
    if (!rows[0]) return undefined;
    return this.mapTenant(rows[0]);
  }

  public async getSanitizedTenantById(id: string): Promise<Tenant | undefined> {
    const tenant = await this.getTenantById(id);
    return tenant ? sanitizeTenant(tenant) : undefined;
  }

  public async createTenant(data: Partial<Tenant>): Promise<Tenant> {
    if (!this.isPgActive || !this.pool) return this.fallback.createTenant(data);
    const id = data.id || `tenant-${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    const settings = data.settings ? JSON.stringify(data.settings) : '{}';

    const { rows } = await this.pool.query(
      `INSERT INTO tenants (id, name, business_name, business_description, industry, website, email, phone, address, timezone, logo, is_demo, settings, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        id,
        data.name || 'My Business',
        data.businessName || data.name || 'My Business LLC',
        data.businessDescription || '',
        data.industry || 'General',
        data.website || '',
        data.email || '',
        data.phone || '',
        data.address || '',
        data.timezone || 'UTC',
        data.logo || '',
        data.isDemo ?? false,
        settings,
        now,
        now
      ]
    );
    return this.mapTenant(rows[0]);
  }

  public async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant | null> {
    if (!this.isPgActive || !this.pool) return this.fallback.updateTenant(id, updates);
    const existing = await this.getTenantById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const { rows } = await this.pool.query(
      `UPDATE tenants SET
        name = $1, business_name = $2, business_description = $3, industry = $4,
        website = $5, email = $6, phone = $7, address = $8, timezone = $9, logo = $10,
        settings = $11, updated_at = $12
       WHERE id = $13 RETURNING *`,
      [
        merged.name,
        merged.businessName,
        merged.businessDescription,
        merged.industry,
        merged.website,
        merged.email,
        merged.phone,
        merged.address,
        merged.timezone,
        merged.logo,
        JSON.stringify(merged.settings || {}),
        merged.updatedAt,
        id
      ]
    );
    return rows[0] ? this.mapTenant(rows[0]) : null;
  }

  public async deleteTenant(id: string): Promise<boolean> {
    if (!this.isPgActive || !this.pool) return this.fallback.deleteTenant(id);
    const res = await this.pool.query('DELETE FROM tenants WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  // ==========================================
  // 5. AGENTS
  // ==========================================
  public async getAgents(tenantId?: string): Promise<Agent[]> {
    if (!this.isPgActive || !this.pool) return this.fallback.getAgents(tenantId);
    let query = 'SELECT * FROM agents';
    const params: any[] = [];
    if (tenantId) {
      query += ' WHERE tenant_id = $1';
      params.push(tenantId);
    }
    query += ' ORDER BY created_at ASC';
    const { rows } = await this.pool.query(query, params);
    return rows.map(r => this.mapAgent(r));
  }

  public async getSanitizedAgents(tenantId?: string): Promise<Agent[]> {
    const agents = await this.getAgents(tenantId);
    return agents.map(sanitizeAgent);
  }

  public async getAgentById(id: string, tenantId?: string): Promise<Agent | undefined> {
    if (!this.isPgActive || !this.pool) return this.fallback.getAgentById(id, tenantId);
    let query = 'SELECT * FROM agents WHERE id = $1';
    const params: any[] = [id];
    if (tenantId) {
      query += ' AND tenant_id = $2';
      params.push(tenantId);
    }
    const { rows } = await this.pool.query(query, params);
    if (!rows[0]) return undefined;
    return this.mapAgent(rows[0]);
  }

  public async getSanitizedAgentById(id: string, tenantId?: string): Promise<Agent | undefined> {
    const agent = await this.getAgentById(id, tenantId);
    return agent ? sanitizeAgent(agent) : undefined;
  }

  public async createAgent(data: Partial<Agent>): Promise<Agent> {
    if (!this.isPgActive || !this.pool) return this.fallback.createAgent(data);
    const id = data.id || `agent-${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    // Encrypt telegram token if provided
    let tgBot = data.telegramBot || { isConnected: false, usePolling: false, status: 'DISCONNECTED' };
    if (tgBot.token) {
      tgBot = { ...tgBot, token: SecretService.encrypt(tgBot.token) };
    }

    const { rows } = await this.pool.query(
      `INSERT INTO agents (
        id, tenant_id, name, type, business_name, business_description, industry,
        language, tone, personality, custom_personality_prompt, system_instructions,
        status, telegram_bot, working_hours, human_handoff, capabilities,
        notification_settings, knowledge_source_ids, metrics, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *`,
      [
        id,
        data.tenantId,
        data.name || 'AI Assistant',
        data.type || 'CUSTOM',
        data.businessName || 'Business',
        data.businessDescription || '',
        data.industry || 'General',
        data.language || 'English',
        data.tone || 'Professional',
        data.personality || 'Friendly',
        data.customPersonalityPrompt || '',
        data.systemInstructions || '',
        data.status || 'DRAFT',
        JSON.stringify(tgBot),
        JSON.stringify(data.workingHours || {}),
        JSON.stringify(data.humanHandoff || {}),
        JSON.stringify(data.capabilities || {}),
        JSON.stringify(data.notificationSettings || {}),
        JSON.stringify(data.knowledgeSourceIds || []),
        JSON.stringify(data.metrics || {}),
        now,
        now
      ]
    );
    return this.mapAgent(rows[0]);
  }

  public async updateAgent(id: string, updates: Partial<Agent>, tenantId?: string): Promise<Agent | null> {
    if (!this.isPgActive || !this.pool) return this.fallback.updateAgent(id, updates, tenantId);
    const existing = await this.getAgentById(id, tenantId);
    if (!existing) return null;

    let tgBot = updates.telegramBot !== undefined ? { ...existing.telegramBot, ...updates.telegramBot } : existing.telegramBot;
    if (updates.telegramBot?.token) {
      tgBot = { ...tgBot, token: SecretService.encrypt(updates.telegramBot.token) };
    }

    const merged = { ...existing, ...updates, telegramBot: tgBot, updatedAt: new Date().toISOString() };
    let query = `UPDATE agents SET
      name = $1, type = $2, business_name = $3, business_description = $4, industry = $5,
      language = $6, tone = $7, personality = $8, custom_personality_prompt = $9,
      system_instructions = $10, status = $11, telegram_bot = $12, working_hours = $13,
      human_handoff = $14, capabilities = $15, notification_settings = $16,
      knowledge_source_ids = $17, metrics = $18, updated_at = $19
      WHERE id = $20`;
    const params: any[] = [
      merged.name, merged.type, merged.businessName, merged.businessDescription, merged.industry,
      merged.language, merged.tone, merged.personality, merged.customPersonalityPrompt,
      merged.systemInstructions, merged.status, JSON.stringify(merged.telegramBot),
      JSON.stringify(merged.workingHours), JSON.stringify(merged.humanHandoff),
      JSON.stringify(merged.capabilities), JSON.stringify(merged.notificationSettings),
      JSON.stringify(merged.knowledgeSourceIds), JSON.stringify(merged.metrics),
      merged.updatedAt, id
    ];

    if (tenantId) {
      query += ' AND tenant_id = $21';
      params.push(tenantId);
    }
    query += ' RETURNING *';

    const { rows } = await this.pool.query(query, params);
    return rows[0] ? this.mapAgent(rows[0]) : null;
  }

  public async duplicateAgent(id: string, tenantId?: string): Promise<Agent | null> {
    const existing = await this.getAgentById(id, tenantId);
    if (!existing) return null;
    return this.createAgent({
      ...existing,
      id: undefined,
      name: `${existing.name} (Copy)`,
      status: 'DRAFT',
      telegramBot: { isConnected: false, usePolling: false, status: 'DISCONNECTED' }
    });
  }

  public async deleteAgent(id: string, tenantId?: string): Promise<boolean> {
    if (!this.isPgActive || !this.pool) return this.fallback.deleteAgent(id, tenantId);
    let query = 'DELETE FROM agents WHERE id = $1';
    const params: any[] = [id];
    if (tenantId) {
      query += ' AND tenant_id = $2';
      params.push(tenantId);
    }
    const res = await this.pool.query(query, params);
    return (res.rowCount ?? 0) > 0;
  }

  // ==========================================
  // 6. KNOWLEDGE ITEMS
  // ==========================================
  public async getKnowledgeItems(tenantId?: string, agentId?: string): Promise<KnowledgeItem[]> {
    if (!this.isPgActive || !this.pool) return this.fallback.getKnowledgeItems(tenantId, agentId);
    let query = 'SELECT * FROM knowledge_items WHERE 1=1';
    const params: any[] = [];
    if (tenantId) {
      params.push(tenantId);
      query += ` AND tenant_id = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await this.pool.query(query, params);
    let items = rows.map(r => this.mapKnowledge(r));
    if (agentId) {
      items = items.filter(k => !k.agentIds || k.agentIds.length === 0 || k.agentIds.includes(agentId));
    }
    return items;
  }

  public async getKnowledgeItemById(id: string): Promise<KnowledgeItem | undefined> {
    if (!this.isPgActive || !this.pool) return this.fallback.getKnowledgeItemById(id);
    const { rows } = await this.pool.query('SELECT * FROM knowledge_items WHERE id = $1', [id]);
    return rows[0] ? this.mapKnowledge(rows[0]) : undefined;
  }

  public async createKnowledgeItem(item: Partial<KnowledgeItem>): Promise<KnowledgeItem> {
    if (!this.isPgActive || !this.pool) return this.fallback.createKnowledgeItem(item);
    const id = item.id || `kn-${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    const { rows } = await this.pool.query(
      `INSERT INTO knowledge_items (id, tenant_id, agent_ids, title, type, content, metadata, enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        id,
        item.tenantId,
        JSON.stringify(item.agentIds || []),
        item.title || 'Untitled',
        item.type || 'text',
        item.content || '',
        JSON.stringify(item.metadata || {}),
        item.enabled ?? true,
        now,
        now
      ]
    );
    return this.mapKnowledge(rows[0]);
  }

  public async updateKnowledgeItem(id: string, updates: Partial<KnowledgeItem>): Promise<KnowledgeItem | null> {
    if (!this.isPgActive || !this.pool) return this.fallback.updateKnowledgeItem(id, updates);
    const existing = await this.getKnowledgeItemById(id);
    if (!existing) return null;
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const { rows } = await this.pool.query(
      `UPDATE knowledge_items SET
        agent_ids = $1, title = $2, type = $3, content = $4, metadata = $5, enabled = $6, updated_at = $7
       WHERE id = $8 RETURNING *`,
      [
        JSON.stringify(merged.agentIds || []),
        merged.title,
        merged.type,
        merged.content,
        JSON.stringify(merged.metadata || {}),
        merged.enabled,
        merged.updatedAt,
        id
      ]
    );
    return rows[0] ? this.mapKnowledge(rows[0]) : null;
  }

  public async deleteKnowledgeItem(id: string): Promise<boolean> {
    if (!this.isPgActive || !this.pool) return this.fallback.deleteKnowledgeItem(id);
    const res = await this.pool.query('DELETE FROM knowledge_items WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  // ==========================================
  // 7. LEADS
  // ==========================================
  public async getLeads(tenantId?: string, agentId?: string): Promise<Lead[]> {
    if (!this.isPgActive || !this.pool) return this.fallback.getLeads(tenantId, agentId);
    let query = 'SELECT * FROM leads WHERE 1=1';
    const params: any[] = [];
    if (tenantId) {
      params.push(tenantId);
      query += ` AND tenant_id = $${params.length}`;
    }
    if (agentId) {
      params.push(agentId);
      query += ` AND agent_id = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await this.pool.query(query, params);
    return rows.map(r => this.mapLead(r));
  }

  public async getLeadById(id: string): Promise<Lead | undefined> {
    if (!this.isPgActive || !this.pool) return this.fallback.getLeadById(id);
    const { rows } = await this.pool.query('SELECT * FROM leads WHERE id = $1', [id]);
    return rows[0] ? this.mapLead(rows[0]) : undefined;
  }

  public async createLead(lead: Partial<Lead>): Promise<Lead> {
    if (!this.isPgActive || !this.pool) return this.fallback.createLead(lead);
    const id = lead.id || `lead-${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    const { rows } = await this.pool.query(
      `INSERT INTO leads (
        id, tenant_id, agent_id, telegram_user_id, telegram_username, full_name,
        phone, email, service_requested, company, budget, timeline, stage,
        score, qualification_answers, notes, custom_fields, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [
        id,
        lead.tenantId,
        lead.agentId || '',
        lead.telegramUserId || 'tg_anon',
        lead.telegramUsername || '',
        lead.fullName || 'Lead',
        lead.phone || '',
        lead.email || '',
        lead.serviceRequested || '',
        lead.company || '',
        lead.budget || '',
        lead.timeline || '',
        lead.stage || 'NEW',
        lead.score ?? 50,
        JSON.stringify(lead.qualificationAnswers || {}),
        JSON.stringify(lead.notes || []),
        JSON.stringify(lead.customFields || {}),
        now,
        now
      ]
    );
    return this.mapLead(rows[0]);
  }

  public async updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
    if (!this.isPgActive || !this.pool) return this.fallback.updateLead(id, updates);
    const existing = await this.getLeadById(id);
    if (!existing) return null;
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const { rows } = await this.pool.query(
      `UPDATE leads SET
        full_name = $1, phone = $2, email = $3, service_requested = $4, company = $5,
        budget = $6, timeline = $7, stage = $8, score = $9, qualification_answers = $10,
        notes = $11, custom_fields = $12, updated_at = $13
       WHERE id = $14 RETURNING *`,
      [
        merged.fullName, merged.phone, merged.email, merged.serviceRequested, merged.company,
        merged.budget, merged.timeline, merged.stage, merged.score,
        JSON.stringify(merged.qualificationAnswers || {}), JSON.stringify(merged.notes || []),
        JSON.stringify(merged.customFields || {}), merged.updatedAt, id
      ]
    );
    return rows[0] ? this.mapLead(rows[0]) : null;
  }

  public async deleteLead(id: string): Promise<boolean> {
    if (!this.isPgActive || !this.pool) return this.fallback.deleteLead(id);
    const res = await this.pool.query('DELETE FROM leads WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  // ==========================================
  // 8. TICKETS
  // ==========================================
  public async getTickets(tenantId?: string, agentId?: string): Promise<SupportTicket[]> {
    if (!this.isPgActive || !this.pool) return this.fallback.getTickets(tenantId, agentId);
    let query = 'SELECT * FROM support_tickets WHERE 1=1';
    const params: any[] = [];
    if (tenantId) {
      params.push(tenantId);
      query += ` AND tenant_id = $${params.length}`;
    }
    if (agentId) {
      params.push(agentId);
      query += ` AND agent_id = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await this.pool.query(query, params);
    return rows.map(r => this.mapTicket(r));
  }

  public async createTicket(ticket: Partial<SupportTicket>): Promise<SupportTicket> {
    if (!this.isPgActive || !this.pool) return this.fallback.createTicket(ticket);
    const id = ticket.id || `tkt-${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    const { rows } = await this.pool.query(
      `INSERT INTO support_tickets (
        id, tenant_id, agent_id, telegram_user_id, telegram_username, subject,
        description, category, priority, status, escalated, escalation_reason,
        resolution_notes, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        id,
        ticket.tenantId,
        ticket.agentId || '',
        ticket.telegramUserId || 'tg_anon',
        ticket.telegramUsername || '',
        ticket.subject || 'Support Ticket',
        ticket.description || '',
        ticket.category || 'General',
        ticket.priority || 'MEDIUM',
        ticket.status || 'OPEN',
        ticket.escalated ?? false,
        ticket.escalationReason || '',
        ticket.resolutionNotes || '',
        now,
        now
      ]
    );
    return this.mapTicket(rows[0]);
  }

  public async updateTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket | null> {
    if (!this.isPgActive || !this.pool) return this.fallback.updateTicket(id, updates);
    const { rows: existingRows } = await this.pool.query('SELECT * FROM support_tickets WHERE id = $1', [id]);
    if (!existingRows[0]) return null;
    const existing = this.mapTicket(existingRows[0]);
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const { rows } = await this.pool.query(
      `UPDATE support_tickets SET
        subject = $1, description = $2, category = $3, priority = $4, status = $5,
        escalated = $6, escalation_reason = $7, resolution_notes = $8, updated_at = $9
       WHERE id = $10 RETURNING *`,
      [
        merged.subject, merged.description, merged.category, merged.priority, merged.status,
        merged.escalated, merged.escalationReason, merged.resolutionNotes, merged.updatedAt, id
      ]
    );
    return rows[0] ? this.mapTicket(rows[0]) : null;
  }

  public async deleteTicket(id: string): Promise<boolean> {
    if (!this.isPgActive || !this.pool) return this.fallback.deleteTicket(id);
    const res = await this.pool.query('DELETE FROM support_tickets WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  // ==========================================
  // 9. BOOKINGS
  // ==========================================
  public async getBookings(tenantId?: string, agentId?: string): Promise<BookingRequest[]> {
    if (!this.isPgActive || !this.pool) return this.fallback.getBookings(tenantId, agentId);
    let query = 'SELECT * FROM booking_requests WHERE 1=1';
    const params: any[] = [];
    if (tenantId) {
      params.push(tenantId);
      query += ` AND tenant_id = $${params.length}`;
    }
    if (agentId) {
      params.push(agentId);
      query += ` AND agent_id = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await this.pool.query(query, params);
    return rows.map(r => this.mapBooking(r));
  }

  public async createBooking(booking: Partial<BookingRequest>): Promise<BookingRequest> {
    if (!this.isPgActive || !this.pool) return this.fallback.createBooking(booking);
    const id = booking.id || `book-${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    const { rows } = await this.pool.query(
      `INSERT INTO booking_requests (
        id, tenant_id, agent_id, telegram_user_id, telegram_username, customer_name,
        customer_phone, customer_email, service_name, requested_date, requested_time,
        additional_notes, status, confirmed_time_slot, staff_notes, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [
        id,
        booking.tenantId,
        booking.agentId || '',
        booking.telegramUserId || 'tg_anon',
        booking.telegramUsername || '',
        booking.customerName || 'Guest',
        booking.customerPhone || '',
        booking.customerEmail || '',
        booking.serviceName || 'Consultation',
        booking.requestedDate || 'Tomorrow',
        booking.requestedTime || '10:00 AM',
        booking.additionalNotes || '',
        booking.status || 'PENDING_APPROVAL',
        booking.confirmedTimeSlot || '',
        booking.staffNotes || '',
        now,
        now
      ]
    );
    return this.mapBooking(rows[0]);
  }

  public async updateBooking(id: string, updates: Partial<BookingRequest>): Promise<BookingRequest | null> {
    if (!this.isPgActive || !this.pool) return this.fallback.updateBooking(id, updates);
    const { rows: existingRows } = await this.pool.query('SELECT * FROM booking_requests WHERE id = $1', [id]);
    if (!existingRows[0]) return null;
    const existing = this.mapBooking(existingRows[0]);
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const { rows } = await this.pool.query(
      `UPDATE booking_requests SET
        customer_name = $1, customer_phone = $2, customer_email = $3, service_name = $4,
        requested_date = $5, requested_time = $6, additional_notes = $7, status = $8,
        confirmed_time_slot = $9, staff_notes = $10, updated_at = $11
       WHERE id = $12 RETURNING *`,
      [
        merged.customerName, merged.customerPhone, merged.customerEmail, merged.serviceName,
        merged.requestedDate, merged.requestedTime, merged.additionalNotes, merged.status,
        merged.confirmedTimeSlot, merged.staffNotes, merged.updatedAt, id
      ]
    );
    return rows[0] ? this.mapBooking(rows[0]) : null;
  }

  public async deleteBooking(id: string): Promise<boolean> {
    if (!this.isPgActive || !this.pool) return this.fallback.deleteBooking(id);
    const res = await this.pool.query('DELETE FROM booking_requests WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  // ==========================================
  // 10. MEMORIES
  // ==========================================
  public async getMemories(tenantId?: string, agentId?: string, level?: string, userId?: string): Promise<AgentMemoryItem[]> {
    if (!this.isPgActive || !this.pool) return this.fallback.getMemories(tenantId, agentId, level, userId);
    let query = 'SELECT * FROM agent_memories WHERE 1=1';
    const params: any[] = [];
    if (tenantId) {
      params.push(tenantId);
      query += ` AND tenant_id = $${params.length}`;
    }
    if (agentId) {
      params.push(agentId);
      query += ` AND (agent_id = $${params.length} OR agent_id = '')`;
    }
    if (level) {
      params.push(level);
      query += ` AND level = $${params.length}`;
    }
    if (userId) {
      params.push(userId);
      query += ` AND user_id = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await this.pool.query(query, params);
    return rows.map(r => this.mapMemory(r));
  }

  public async createMemory(memory: Partial<AgentMemoryItem>): Promise<AgentMemoryItem> {
    if (!this.isPgActive || !this.pool) return this.fallback.createMemory(memory);
    const id = memory.id || `mem-${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    const { rows } = await this.pool.query(
      `INSERT INTO agent_memories (id, tenant_id, agent_id, level, key, value, user_id, confidence, metadata, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        id,
        memory.tenantId,
        memory.agentId || '',
        memory.level || 'conversation',
        memory.key || 'key',
        memory.value || '',
        memory.userId || '',
        memory.confidence ?? 1.0,
        JSON.stringify(memory.metadata || {}),
        now,
        now
      ]
    );
    return this.mapMemory(rows[0]);
  }

  public async updateMemory(id: string, updates: Partial<AgentMemoryItem>): Promise<AgentMemoryItem | null> {
    if (!this.isPgActive || !this.pool) return this.fallback.updateMemory(id, updates);
    const { rows: existingRows } = await this.pool.query('SELECT * FROM agent_memories WHERE id = $1', [id]);
    if (!existingRows[0]) return null;
    const existing = this.mapMemory(existingRows[0]);
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const { rows } = await this.pool.query(
      `UPDATE agent_memories SET key = $1, value = $2, confidence = $3, metadata = $4, updated_at = $5 WHERE id = $6 RETURNING *`,
      [merged.key, merged.value, merged.confidence, JSON.stringify(merged.metadata || {}), merged.updatedAt, id]
    );
    return rows[0] ? this.mapMemory(rows[0]) : null;
  }

  public async deleteMemory(id: string): Promise<boolean> {
    if (!this.isPgActive || !this.pool) return this.fallback.deleteMemory(id);
    const res = await this.pool.query('DELETE FROM agent_memories WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  public async clearConversationMemory(conversationId: string): Promise<boolean> {
    if (!this.isPgActive || !this.pool) return this.fallback.clearConversationMemory(conversationId);
    const res = await this.pool.query(`DELETE FROM agent_memories WHERE metadata->>'conversationId' = $1`, [conversationId]);
    return (res.rowCount ?? 0) > 0;
  }

  // ==========================================
  // 11. CONVERSATIONS
  // ==========================================
  public async getConversations(tenantId?: string, agentId?: string): Promise<ConversationThread[]> {
    if (!this.isPgActive || !this.pool) return this.fallback.getConversations(tenantId, agentId);
    let query = 'SELECT * FROM conversation_threads WHERE 1=1';
    const params: any[] = [];
    if (tenantId) {
      params.push(tenantId);
      query += ` AND tenant_id = $${params.length}`;
    }
    if (agentId) {
      params.push(agentId);
      query += ` AND agent_id = $${params.length}`;
    }
    query += ' ORDER BY last_message_at DESC';
    const { rows } = await this.pool.query(query, params);
    return rows.map(r => this.mapConversation(r));
  }

  public async getConversationById(id: string): Promise<ConversationThread | undefined> {
    if (!this.isPgActive || !this.pool) return this.fallback.getConversationById(id);
    const { rows } = await this.pool.query('SELECT * FROM conversation_threads WHERE id = $1', [id]);
    return rows[0] ? this.mapConversation(rows[0]) : undefined;
  }

  public async getOrCreateConversation(params: {
    tenantId: string;
    agentId: string;
    telegramUserId: string;
    telegramUsername?: string;
    telegramChatId: string;
    isPlayground?: boolean;
  }): Promise<ConversationThread> {
    if (!this.isPgActive || !this.pool) return this.fallback.getOrCreateConversation(params);
    const { rows } = await this.pool.query(
      `SELECT * FROM conversation_threads WHERE tenant_id = $1 AND agent_id = $2 AND telegram_chat_id = $3 LIMIT 1`,
      [params.tenantId, params.agentId, params.telegramChatId]
    );
    if (rows[0]) {
      return this.mapConversation(rows[0]);
    }

    const id = `conv-${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    const { rows: inserted } = await this.pool.query(
      `INSERT INTO conversation_threads (
        id, tenant_id, agent_id, telegram_user_id, telegram_username, telegram_chat_id,
        is_playground, handoff_active, messages, last_message_at, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        id,
        params.tenantId,
        params.agentId,
        params.telegramUserId,
        params.telegramUsername || '',
        params.telegramChatId,
        params.isPlayground ?? false,
        false,
        '[]',
        now,
        now
      ]
    );
    return this.mapConversation(inserted[0]);
  }

  public async appendMessage(conversationId: string, msg: Partial<ChatMessage>): Promise<ChatMessage> {
    if (!this.isPgActive || !this.pool) return this.fallback.appendMessage(conversationId, msg);
    const message: ChatMessage = {
      id: msg.id || `msg-${uuidv4().substring(0, 8)}`,
      role: msg.role || 'user',
      content: msg.content || '',
      timestamp: msg.timestamp || new Date().toISOString(),
      metadata: msg.metadata || {},
    };

    const conv = await this.getConversationById(conversationId);
    if (conv) {
      const messages = [...conv.messages, message];
      await this.pool.query(
        `UPDATE conversation_threads SET messages = $1, last_message_at = $2 WHERE id = $3`,
        [JSON.stringify(messages), message.timestamp, conversationId]
      );
    }
    return message;
  }

  public async updateConversation(id: string, updates: Partial<ConversationThread>): Promise<ConversationThread | null> {
    if (!this.isPgActive || !this.pool) return this.fallback.updateConversation(id, updates);
    const existing = await this.getConversationById(id);
    if (!existing) return null;
    const merged = { ...existing, ...updates };
    const { rows } = await this.pool.query(
      `UPDATE conversation_threads SET
        handoff_active = $1, handoff_started_at = $2, assigned_staff = $3,
        user_language = $4, messages = $5, last_message_at = $6
       WHERE id = $7 RETURNING *`,
      [
        merged.handoffActive,
        merged.handoffStartedAt || null,
        merged.assignedStaff || null,
        merged.userLanguage || null,
        JSON.stringify(merged.messages || []),
        merged.lastMessageAt,
        id
      ]
    );
    return rows[0] ? this.mapConversation(rows[0]) : null;
  }

  // ==========================================
  // 12. AUDIT LOGS
  // ==========================================
  public async getAuditLogs(tenantId?: string, agentId?: string): Promise<AuditLog[]> {
    if (!this.isPgActive || !this.pool) return this.fallback.getAuditLogs(tenantId, agentId);
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    if (tenantId) {
      params.push(tenantId);
      query += ` AND tenant_id = $${params.length}`;
    }
    if (agentId) {
      params.push(agentId);
      query += ` AND agent_id = $${params.length}`;
    }
    query += ' ORDER BY timestamp DESC LIMIT 200';
    const { rows } = await this.pool.query(query, params);
    return rows.map(r => this.mapAudit(r));
  }

  public async logAudit(
    tenantId: string,
    agentId: string | undefined,
    eventType: AuditLog['eventType'],
    severity: AuditLog['severity'],
    description: string,
    details?: Record<string, any>
  ): Promise<AuditLog> {
    if (!this.isPgActive || !this.pool) {
      return this.fallback.logAudit(tenantId, agentId, eventType, severity, description, details);
    }
    const id = `audit-${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    const safeDetails = details ? SecretService.redactSecrets(JSON.stringify(details)) : '{}';

    const { rows } = await this.pool.query(
      `INSERT INTO audit_logs (id, tenant_id, agent_id, event_type, severity, description, details, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, tenantId, agentId || null, eventType, severity, description, safeDetails, now]
    );
    return this.mapAudit(rows[0]);
  }

  // ==========================================
  // ROW MAPPERS (PostgreSQL snake_case -> CamelCase Domain Objects)
  // ==========================================
  private mapUser(r: any): User {
    return {
      id: r.id,
      email: r.email,
      passwordHash: r.password_hash,
      name: r.name,
      role: r.role as UserRole,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  private mapMember(r: any): WorkspaceMember {
    return {
      id: r.id,
      workspaceId: r.workspace_id,
      userId: r.user_id,
      role: r.role as UserRole,
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  private mapSession(r: any): AuthSession {
    return {
      token: r.token,
      userId: r.user_id,
      workspaceId: r.workspace_id,
      expiresAt: new Date(r.expires_at).toISOString(),
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  private mapTenant(r: any): Tenant {
    return {
      id: r.id,
      name: r.name,
      businessName: r.business_name,
      businessDescription: r.business_description || '',
      industry: r.industry || 'General',
      website: r.website || '',
      email: r.email || '',
      phone: r.phone || '',
      address: r.address || '',
      timezone: r.timezone || 'UTC',
      logo: r.logo || '',
      isDemo: Boolean(r.is_demo),
      settings: typeof r.settings === 'string' ? JSON.parse(r.settings) : (r.settings || {}),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  private mapAgent(r: any): Agent {
    const tgBot = typeof r.telegram_bot === 'string' ? JSON.parse(r.telegram_bot) : (r.telegram_bot || {});
    // Decrypt token for internal server operations
    if (tgBot.token) {
      tgBot.token = SecretService.decrypt(tgBot.token);
    }
    return {
      id: r.id,
      tenantId: r.tenant_id,
      name: r.name,
      type: r.type,
      businessName: r.business_name,
      businessDescription: r.business_description || '',
      industry: r.industry || 'General',
      language: r.language || 'English',
      tone: r.tone || 'Professional',
      personality: r.personality || 'Friendly',
      customPersonalityPrompt: r.custom_personality_prompt || '',
      systemInstructions: r.system_instructions || '',
      status: r.status,
      telegramBot: tgBot,
      workingHours: typeof r.working_hours === 'string' ? JSON.parse(r.working_hours) : (r.working_hours || {}),
      humanHandoff: typeof r.human_handoff === 'string' ? JSON.parse(r.human_handoff) : (r.human_handoff || {}),
      capabilities: typeof r.capabilities === 'string' ? JSON.parse(r.capabilities) : (r.capabilities || {}),
      notificationSettings: typeof r.notification_settings === 'string' ? JSON.parse(r.notification_settings) : (r.notification_settings || {}),
      knowledgeSourceIds: typeof r.knowledge_source_ids === 'string' ? JSON.parse(r.knowledge_source_ids) : (r.knowledge_source_ids || []),
      metrics: typeof r.metrics === 'string' ? JSON.parse(r.metrics) : (r.metrics || {}),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  private mapKnowledge(r: any): KnowledgeItem {
    return {
      id: r.id,
      tenantId: r.tenant_id,
      agentIds: typeof r.agent_ids === 'string' ? JSON.parse(r.agent_ids) : (r.agent_ids || []),
      title: r.title,
      type: r.type,
      content: r.content,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {}),
      enabled: Boolean(r.enabled),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  private mapLead(r: any): Lead {
    return {
      id: r.id,
      tenantId: r.tenant_id,
      agentId: r.agent_id || '',
      telegramUserId: r.telegram_user_id,
      telegramUsername: r.telegram_username || '',
      fullName: r.full_name,
      phone: r.phone || '',
      email: r.email || '',
      serviceRequested: r.service_requested || '',
      company: r.company || '',
      budget: r.budget || '',
      timeline: r.timeline || '',
      stage: r.stage,
      score: r.score ?? 50,
      qualificationAnswers: typeof r.qualification_answers === 'string' ? JSON.parse(r.qualification_answers) : (r.qualification_answers || {}),
      notes: typeof r.notes === 'string' ? JSON.parse(r.notes) : (r.notes || []),
      customFields: typeof r.custom_fields === 'string' ? JSON.parse(r.custom_fields) : (r.custom_fields || {}),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  private mapTicket(r: any): SupportTicket {
    return {
      id: r.id,
      tenantId: r.tenant_id,
      agentId: r.agent_id || '',
      telegramUserId: r.telegram_user_id,
      telegramUsername: r.telegram_username || '',
      subject: r.subject,
      description: r.description,
      category: r.category || 'General',
      priority: r.priority,
      status: r.status,
      escalated: Boolean(r.escalated),
      escalationReason: r.escalation_reason || '',
      resolutionNotes: r.resolution_notes || '',
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  private mapBooking(r: any): BookingRequest {
    return {
      id: r.id,
      tenantId: r.tenant_id,
      agentId: r.agent_id || '',
      telegramUserId: r.telegram_user_id,
      telegramUsername: r.telegram_username || '',
      customerName: r.customer_name,
      customerPhone: r.customer_phone || '',
      customerEmail: r.customer_email || '',
      serviceName: r.service_name,
      requestedDate: r.requested_date,
      requestedTime: r.requested_time,
      additionalNotes: r.additional_notes || '',
      status: r.status,
      confirmedTimeSlot: r.confirmed_time_slot || '',
      staffNotes: r.staff_notes || '',
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  private mapMemory(r: any): AgentMemoryItem {
    return {
      id: r.id,
      tenantId: r.tenant_id,
      agentId: r.agent_id || '',
      level: r.level,
      key: r.key,
      value: r.value,
      userId: r.user_id || '',
      confidence: r.confidence ?? 1.0,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {}),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  private mapConversation(r: any): ConversationThread {
    return {
      id: r.id,
      tenantId: r.tenant_id,
      agentId: r.agent_id,
      telegramUserId: r.telegram_user_id,
      telegramUsername: r.telegram_username || '',
      telegramChatId: r.telegram_chat_id,
      isPlayground: Boolean(r.is_playground),
      handoffActive: Boolean(r.handoff_active),
      handoffStartedAt: r.handoff_started_at ? new Date(r.handoff_started_at).toISOString() : undefined,
      assignedStaff: r.assigned_staff || undefined,
      userLanguage: r.user_language || undefined,
      messages: typeof r.messages === 'string' ? JSON.parse(r.messages) : (r.messages || []),
      lastMessageAt: new Date(r.last_message_at).toISOString(),
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  private mapAudit(r: any): AuditLog {
    return {
      id: r.id,
      tenantId: r.tenant_id,
      agentId: r.agent_id || undefined,
      eventType: r.event_type,
      severity: r.severity,
      description: r.description,
      details: typeof r.details === 'string' ? JSON.parse(r.details) : (r.details || {}),
      timestamp: new Date(r.timestamp).toISOString(),
    };
  }
}
