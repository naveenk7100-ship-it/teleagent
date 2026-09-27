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

export interface IRepository {
  // --- Users & Memberships ---
  getUserById(id: string): Promise<User | undefined> | User | undefined;
  getUserByEmail(email: string): Promise<User | undefined> | User | undefined;
  createUser(user: { email: string; passwordHash: string; name: string; role?: UserRole }): Promise<User> | User;
  updateUser(id: string, updates: Partial<User>): Promise<User | null> | User | null;
  listUsers(): Promise<User[]> | User[];

  // --- Workspace Memberships ---
  addWorkspaceMember(member: { workspaceId: string; userId: string; role?: UserRole }): Promise<WorkspaceMember> | WorkspaceMember;
  getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> | WorkspaceMember[];
  getUserWorkspaces(userId: string): Promise<Tenant[]> | Tenant[];
  isUserInWorkspace(userId: string, workspaceId: string): Promise<boolean> | boolean;
  getUserWorkspaceRole(userId: string, workspaceId: string): Promise<UserRole | null> | UserRole | null;

  // --- Auth Sessions ---
  createSession(session: { token: string; userId: string; workspaceId: string; expiresAt: string }): Promise<AuthSession> | AuthSession;
  getSession(token: string): Promise<AuthSession | undefined> | AuthSession | undefined;
  deleteSession(token: string): Promise<boolean> | boolean;
  deleteUserSessions(userId: string): Promise<number> | number;

  // --- Tenants (Workspaces) ---
  getTenants(): Promise<Tenant[]> | Tenant[];
  getSanitizedTenants(): Promise<Tenant[]> | Tenant[];
  getTenantById(id: string): Promise<Tenant | undefined> | Tenant | undefined;
  getSanitizedTenantById(id: string): Promise<Tenant | undefined> | Tenant | undefined;
  createTenant(tenant: Partial<Tenant>): Promise<Tenant> | Tenant;
  updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant | null> | Tenant | null;
  deleteTenant(id: string): Promise<boolean> | boolean;

  // --- Agents ---
  getAgents(tenantId?: string): Promise<Agent[]> | Agent[];
  getSanitizedAgents(tenantId?: string): Promise<Agent[]> | Agent[];
  getAgentById(id: string, tenantId?: string): Promise<Agent | undefined> | Agent | undefined;
  getSanitizedAgentById(id: string, tenantId?: string): Promise<Agent | undefined> | Agent | undefined;
  createAgent(agent: Partial<Agent>): Promise<Agent> | Agent;
  updateAgent(id: string, updates: Partial<Agent>, tenantId?: string): Promise<Agent | null> | Agent | null;
  duplicateAgent(id: string, tenantId?: string): Promise<Agent | null> | Agent | null;
  deleteAgent(id: string, tenantId?: string): Promise<boolean> | boolean;

  // --- Knowledge Items ---
  getKnowledgeItems(tenantId?: string, agentId?: string): Promise<KnowledgeItem[]> | KnowledgeItem[];
  getKnowledgeItemById(id: string): Promise<KnowledgeItem | undefined> | KnowledgeItem | undefined;
  createKnowledgeItem(item: Partial<KnowledgeItem>): Promise<KnowledgeItem> | KnowledgeItem;
  updateKnowledgeItem(id: string, updates: Partial<KnowledgeItem>): Promise<KnowledgeItem | null> | KnowledgeItem | null;
  deleteKnowledgeItem(id: string): Promise<boolean> | boolean;

  // --- Leads ---
  getLeads(tenantId?: string, agentId?: string): Promise<Lead[]> | Lead[];
  getLeadById(id: string): Promise<Lead | undefined> | Lead | undefined;
  createLead(lead: Partial<Lead>): Promise<Lead> | Lead;
  updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> | Lead | null;
  deleteLead(id: string): Promise<boolean> | boolean;

  // --- Tickets ---
  getTickets(tenantId?: string, agentId?: string): Promise<SupportTicket[]> | SupportTicket[];
  createTicket(ticket: Partial<SupportTicket>): Promise<SupportTicket> | SupportTicket;
  updateTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket | null> | SupportTicket | null;
  deleteTicket(id: string): Promise<boolean> | boolean;

  // --- Bookings ---
  getBookings(tenantId?: string, agentId?: string): Promise<BookingRequest[]> | BookingRequest[];
  createBooking(booking: Partial<BookingRequest>): Promise<BookingRequest> | BookingRequest;
  updateBooking(id: string, updates: Partial<BookingRequest>): Promise<BookingRequest | null> | BookingRequest | null;
  deleteBooking(id: string): Promise<boolean> | boolean;

  // --- Memories ---
  getMemories(tenantId?: string, agentId?: string, level?: string, userId?: string): Promise<AgentMemoryItem[]> | AgentMemoryItem[];
  createMemory(memory: Partial<AgentMemoryItem>): Promise<AgentMemoryItem> | AgentMemoryItem;
  updateMemory(id: string, updates: Partial<AgentMemoryItem>): Promise<AgentMemoryItem | null> | AgentMemoryItem | null;
  deleteMemory(id: string): Promise<boolean> | boolean;
  clearConversationMemory(conversationId: string): Promise<boolean> | boolean;

  // --- Conversations & Messages ---
  getConversations(tenantId?: string, agentId?: string): Promise<ConversationThread[]> | ConversationThread[];
  getConversationById(id: string): Promise<ConversationThread | undefined> | ConversationThread | undefined;
  getOrCreateConversation(params: {
    tenantId: string;
    agentId: string;
    telegramUserId: string;
    telegramUsername?: string;
    telegramChatId: string;
    isPlayground?: boolean;
  }): Promise<ConversationThread> | ConversationThread;
  appendMessage(conversationId: string, message: Partial<ChatMessage>): Promise<ChatMessage> | ChatMessage;
  updateConversation(id: string, updates: Partial<ConversationThread>): Promise<ConversationThread | null> | ConversationThread | null;

  // --- Audit Logs ---
  getAuditLogs(tenantId?: string, agentId?: string): Promise<AuditLog[]> | AuditLog[];
  logAudit(
    tenantId: string,
    agentId: string | undefined,
    eventType: AuditLog['eventType'],
    severity: AuditLog['severity'],
    description: string,
    details?: Record<string, any>
  ): Promise<AuditLog> | AuditLog;
}
