import type {
  Tenant,
  Agent,
  KnowledgeItem,
  Lead,
  SupportTicket,
  BookingRequest,
  AgentMemoryItem,
  ConversationThread,
  AuditLog,
  AgentTemplateDefinition,
  AgentExecutionResult,
  ChatMessage,
  AuthResponse,
  AuthUserDTO,
  UserRole,
  IntegrationsStatus,
  AdminOverview,
  OnboardingPayload
} from '../types';

const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = RAW_API_URL ? `${RAW_API_URL.replace(/\/$/, '')}/api` : '/api';
const TOKEN_STORAGE_KEY = 'teleagent_session_token';
const WORKSPACE_STORAGE_KEY = 'teleagent_active_workspace_id';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {}
}

export function getStoredWorkspaceId(): string | null {
  try {
    return localStorage.getItem(WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredWorkspaceId(workspaceId: string | null) {
  try {
    if (workspaceId) {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  } catch {}
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const workspaceId = getStoredWorkspaceId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) errorMsg = body.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Authentication
  signup: async (data: { email: string; password: string; name?: string; businessName?: string; industry?: string }): Promise<AuthResponse> => {
    const res = await fetchJson<AuthResponse>(`${API_BASE}/auth/signup`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      setStoredToken(res.token);
      setStoredWorkspaceId(res.activeWorkspaceId);
    }
    return res;
  },

  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const res = await fetchJson<AuthResponse>(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      setStoredToken(res.token);
      setStoredWorkspaceId(res.activeWorkspaceId);
    }
    return res;
  },

  logout: async (): Promise<{ success: boolean }> => {
    try {
      await fetchJson<{ success: boolean }>(`${API_BASE}/auth/logout`, {
        method: 'POST',
      });
    } finally {
      setStoredToken(null);
      setStoredWorkspaceId(null);
    }
    return { success: true };
  },

  getMe: () => fetchJson<{
    user: AuthUserDTO;
    workspace: Tenant;
    workspaces: Tenant[];
    activeWorkspaceId: string;
    role: UserRole;
  }>(`${API_BASE}/auth/me`),

  switchWorkspace: async (workspaceId: string) => {
    const res = await fetchJson<{
      success: boolean;
      workspace: Tenant;
      workspaces: Tenant[];
      activeWorkspaceId: string;
    }>(`${API_BASE}/auth/switch-workspace`, {
      method: 'POST',
      body: JSON.stringify({ workspaceId }),
    });
    setStoredWorkspaceId(res.activeWorkspaceId);
    return res;
  },

  createWorkspace: (data: { name: string; businessName?: string; industry?: string; description?: string }) => fetchJson<{
    success: boolean;
    workspace: Tenant;
    workspaces: Tenant[];
    activeWorkspaceId: string;
  }>(`${API_BASE}/auth/workspaces`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getUserWorkspaces: () => fetchJson<Tenant[]>(`${API_BASE}/auth/workspaces`),

  // Tenants
  getTenants: () => fetchJson<{ tenants: Tenant[] }>(`${API_BASE}/tenants`),
  getTenant: (id: string) => fetchJson<{ tenant: Tenant }>(`${API_BASE}/tenants/${id}`),
  createTenant: (data: Partial<Tenant>) => fetchJson<{ tenant: Tenant }>(`${API_BASE}/tenants`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateTenant: (id: string, data: Partial<Tenant>) => fetchJson<{ tenant: Tenant }>(`${API_BASE}/tenants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteTenant: (id: string) => fetchJson<{ success: boolean }>(`${API_BASE}/tenants/${id}`, {
    method: 'DELETE',
  }),

  // Templates
  getTemplates: () => fetchJson<{ templates: AgentTemplateDefinition[] }>(`${API_BASE}/templates`),

  // Agents
  getAgents: (tenantId?: string) => fetchJson<{ agents: Agent[] }>(`${API_BASE}/agents${tenantId ? `?tenantId=${tenantId}` : ''}`),
  getAgent: (id: string) => fetchJson<{ agent: Agent }>(`${API_BASE}/agents/${id}`),
  createAgent: (data: Partial<Agent>) => fetchJson<{ agent: Agent }>(`${API_BASE}/agents`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateAgent: (id: string, data: Partial<Agent>) => fetchJson<{ agent: Agent }>(`${API_BASE}/agents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  duplicateAgent: (id: string) => fetchJson<{ agent: Agent }>(`${API_BASE}/agents/${id}/duplicate`, {
    method: 'POST',
  }),
  deleteAgent: (id: string) => fetchJson<{ success: boolean }>(`${API_BASE}/agents/${id}`, {
    method: 'DELETE',
  }),
  connectTelegramBot: (agentId: string, token: string) => fetchJson<{ success: boolean; botUsername?: string; botName?: string; error?: string }>(`${API_BASE}/agents/${agentId}/telegram/connect`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  }),
  togglePolling: (agentId: string, enable: boolean) => fetchJson<{ success: boolean; usePolling: boolean }>(`${API_BASE}/agents/${agentId}/telegram/toggle-polling`, {
    method: 'POST',
    body: JSON.stringify({ enable }),
  }),
  setAgentStatus: (agentId: string, status: Agent['status']) => fetchJson<{ agent: Agent }>(`${API_BASE}/agents/${agentId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  }),

  // Knowledge
  getKnowledge: (tenantId: string, agentId?: string) => fetchJson<{ items: KnowledgeItem[] }>(`${API_BASE}/knowledge?tenantId=${tenantId}${agentId ? `&agentId=${agentId}` : ''}`),
  createKnowledge: (data: Partial<KnowledgeItem>) => fetchJson<{ item: KnowledgeItem }>(`${API_BASE}/knowledge`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateKnowledge: (id: string, data: Partial<KnowledgeItem>) => fetchJson<{ item: KnowledgeItem }>(`${API_BASE}/knowledge/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteKnowledge: (id: string) => fetchJson<{ success: boolean }>(`${API_BASE}/knowledge/${id}`, {
    method: 'DELETE',
  }),
  uploadKnowledgeFile: async (formData: FormData) => {
    const token = getStoredToken();
    const workspaceId = getStoredWorkspaceId();
    const headers: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
    };
    const res = await fetch(`${API_BASE}/knowledge/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to upload document');
    }
    return res.json() as Promise<{ success: boolean; item: KnowledgeItem }>;
  },
  scrapeUrlKnowledge: (data: { url: string; tenantId: string; agentId?: string }) => fetchJson<{ success: boolean; item: KnowledgeItem }>(`${API_BASE}/knowledge/scrape-url`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Leads
  getLeads: (tenantId: string, agentId?: string) => fetchJson<{ leads: Lead[] }>(`${API_BASE}/leads?tenantId=${tenantId}${agentId ? `&agentId=${agentId}` : ''}`),
  createLead: (data: Partial<Lead>) => fetchJson<{ lead: Lead }>(`${API_BASE}/leads`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateLead: (id: string, data: Partial<Lead>) => fetchJson<{ lead: Lead }>(`${API_BASE}/leads/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteLead: (id: string) => fetchJson<{ success: boolean }>(`${API_BASE}/leads/${id}`, {
    method: 'DELETE',
  }),

  // Tickets
  getTickets: (tenantId: string, agentId?: string) => fetchJson<{ tickets: SupportTicket[] }>(`${API_BASE}/tickets?tenantId=${tenantId}${agentId ? `&agentId=${agentId}` : ''}`),
  createTicket: (data: Partial<SupportTicket>) => fetchJson<{ ticket: SupportTicket }>(`${API_BASE}/tickets`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateTicket: (id: string, data: Partial<SupportTicket>) => fetchJson<{ ticket: SupportTicket }>(`${API_BASE}/tickets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteTicket: (id: string) => fetchJson<{ success: boolean }>(`${API_BASE}/tickets/${id}`, {
    method: 'DELETE',
  }),

  // Bookings
  getBookings: (tenantId: string, agentId?: string) => fetchJson<{ bookings: BookingRequest[] }>(`${API_BASE}/bookings?tenantId=${tenantId}${agentId ? `&agentId=${agentId}` : ''}`),
  createBooking: (data: Partial<BookingRequest>) => fetchJson<{ booking: BookingRequest }>(`${API_BASE}/bookings`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateBooking: (id: string, data: Partial<BookingRequest>) => fetchJson<{ booking: BookingRequest }>(`${API_BASE}/bookings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteBooking: (id: string) => fetchJson<{ success: boolean }>(`${API_BASE}/bookings/${id}`, {
    method: 'DELETE',
  }),

  // Memories
  getMemories: (tenantId: string, agentId?: string, level?: string, userId?: string) => fetchJson<{ memories: AgentMemoryItem[] }>(
    `${API_BASE}/memories?tenantId=${tenantId}${agentId ? `&agentId=${agentId}` : ''}${level ? `&level=${level}` : ''}${userId ? `&userId=${userId}` : ''}`
  ),
  createMemory: (data: Partial<AgentMemoryItem>) => fetchJson<{ memory: AgentMemoryItem }>(`${API_BASE}/memories`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateMemory: (id: string, data: Partial<AgentMemoryItem>) => fetchJson<{ memory: AgentMemoryItem }>(`${API_BASE}/memories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteMemory: (id: string) => fetchJson<{ success: boolean }>(`${API_BASE}/memories/${id}`, {
    method: 'DELETE',
  }),
  clearConversationMemory: (conversationId: string) => fetchJson<{ success: boolean }>(`${API_BASE}/memories/clear-conversation/${conversationId}`, {
    method: 'POST',
  }),

  // Conversations & Live Inbox
  getConversations: (tenantId: string, agentId?: string) => fetchJson<{ conversations: ConversationThread[] }>(`${API_BASE}/conversations?tenantId=${tenantId}${agentId ? `&agentId=${agentId}` : ''}`),
  getConversation: (id: string) => fetchJson<{ conversation: ConversationThread }>(`${API_BASE}/conversations/${id}`),
  replyAsHuman: (conversationId: string, message: string, operatorName?: string) => fetchJson<{ success: boolean; message: ChatMessage }>(`${API_BASE}/conversations/${conversationId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ message, operatorName }),
  }),
  toggleHandoff: (conversationId: string, handoffActive: boolean) => fetchJson<{ conversation: ConversationThread }>(`${API_BASE}/conversations/${conversationId}/toggle-handoff`, {
    method: 'POST',
    body: JSON.stringify({ handoffActive }),
  }),
  resumeConversation: (conversationId: string) => fetchJson<{ success: boolean; conversation: ConversationThread; message?: ChatMessage }>(`${API_BASE}/conversations/${conversationId}/resume`, {
    method: 'POST',
  }),

  // Playground
  sendPlaygroundMessage: (data: { tenantId: string; agentId: string; message: string; userId?: string; username?: string }) => fetchJson<AgentExecutionResult>(`${API_BASE}/playground/chat`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Analytics & Audit
  getAnalytics: (tenantId: string) => fetchJson<{
    summary: {
      totalAgents: number;
      activeAgents: number;
      totalConversations: number;
      totalMessages: number;
      totalLeads: number;
      qualifiedLeads: number;
      totalTickets: number;
      openTickets: number;
      totalBookings: number;
      pendingBookings: number;
      handoffs: number;
      totalWorkflows: number;
      totalTokens: number;
      avgResponseTimeMs: number;
    };
    agentsMetrics: Array<{
      agentId: string;
      agentName: string;
      agentType: Agent['type'];
      status: Agent['status'];
      metrics: Agent['metrics'];
    }>;
  }>(`${API_BASE}/analytics?tenantId=${tenantId}`),
  getAuditLogs: (tenantId?: string, agentId?: string) => fetchJson<{ logs: AuditLog[] }>(`${API_BASE}/audit?${tenantId ? `tenantId=${tenantId}` : ''}${agentId ? `&agentId=${agentId}` : ''}`),

  // Integrations & Secrets
  validateTelegramToken: (token: string) => fetchJson<{ success: boolean; botUsername?: string; botId?: string; botName?: string; error?: string }>(`${API_BASE}/integrations/telegram/validate`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  }),
  validateGeminiApiKey: (apiKey: string) => fetchJson<{ success: boolean; model?: string; error?: string }>(`${API_BASE}/integrations/gemini/validate`, {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
  }),
  getIntegrationsStatus: (tenantId?: string, agentId?: string) => fetchJson<IntegrationsStatus>(`${API_BASE}/integrations/status?${tenantId ? `tenantId=${tenantId}` : ''}${agentId ? `&agentId=${agentId}` : ''}`),
  connectGeminiKey: (tenantId: string, apiKey: string) => fetchJson<{ success: boolean; maskedKey: string; model?: string }>(`${API_BASE}/integrations/gemini/connect`, {
    method: 'POST',
    body: JSON.stringify({ tenantId, apiKey }),
  }),
  disconnectGeminiKey: (tenantId: string) => fetchJson<{ success: boolean }>(`${API_BASE}/integrations/gemini/disconnect`, {
    method: 'POST',
    body: JSON.stringify({ tenantId }),
  }),

  // Guided Onboarding & Super Admin
  previewOnboardingPlayground: (data: {
    tenantId?: string;
    agentId?: string;
    business?: any;
    agent?: any;
    knowledge?: any;
    message: string;
  }) => fetchJson<{ reply: string; tools: string[]; executionSteps?: any[] }>(`${API_BASE}/onboarding/playground-preview`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  completeOnboarding: (data: OnboardingPayload) => fetchJson<{ success: boolean; tenant: Tenant; agent: Agent; knowledgeCount: number }>(`${API_BASE}/onboarding/complete`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getAdminOverview: () => fetchJson<AdminOverview>(`${API_BASE}/admin/overview`),
};
