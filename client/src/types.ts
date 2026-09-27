export type AgentType = 
  | 'PERSONAL_ASSISTANT'
  | 'BUSINESS_ASSISTANT'
  | 'AI_RECEPTIONIST'
  | 'SALES_AGENT'
  | 'CUSTOMER_SUPPORT'
  | 'LEAD_QUALIFICATION'
  | 'COMMUNITY_MANAGER'
  | 'APPOINTMENT_BOOKING'
  | 'ECOMMERCE_ASSISTANT'
  | 'REAL_ESTATE_AGENT'
  | 'EDUCATION_ADMISSIONS'
  | 'RESTAURANT_HOTEL'
  | 'CUSTOM';

export type AgentPersonality = 
  | 'Professional'
  | 'Friendly'
  | 'Casual'
  | 'Premium'
  | 'Concise'
  | 'Helpful'
  | 'Custom';

export type AgentStatus = 'DRAFT' | 'TESTING' | 'ACTIVE' | 'PAUSED' | 'ERROR';

export type LeadStage = 'NEW' | 'QUALIFYING' | 'QUALIFIED' | 'FOLLOW_UP' | 'CONVERTED' | 'LOST';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type BookingStatus = 'PENDING_APPROVAL' | 'CONFIRMED' | 'RESCHEDULED' | 'CANCELLED';

export type KnowledgeType = 'faq' | 'text' | 'document' | 'url' | 'product' | 'policy' | 'hours_location';

export type MemoryLevel = 'conversation' | 'user' | 'business' | 'agent_config';

export interface WorkingDaySchedule {
  open: string;
  close: string;
  isClosed: boolean;
}

export interface WorkingHoursConfig {
  enabled: boolean;
  timezone: string;
  schedule: {
    monday: WorkingDaySchedule;
    tuesday: WorkingDaySchedule;
    wednesday: WorkingDaySchedule;
    thursday: WorkingDaySchedule;
    friday: WorkingDaySchedule;
    saturday: WorkingDaySchedule;
    sunday: WorkingDaySchedule;
  };
  outOfHoursMessage: string;
  holidayRules: Array<{
    date: string;
    name: string;
    message?: string;
  }>;
}

export interface HumanHandoffConfig {
  enabled: boolean;
  triggerKeywords: string[];
  confidenceThreshold: number;
  pauseBotOnHandoff: boolean;
  handoffMessage: string;
  resumeMessage: string;
  notifyChannels: {
    telegramStaffChatId?: string;
    email?: string;
    webhookUrl?: string;
  };
}

export interface AgentCapabilities {
  allowLeadCreation: boolean;
  allowLeadScoring: boolean;
  allowTicketCreation: boolean;
  allowTicketEscalation: boolean;
  allowBookingRequests: boolean;
  allowKnowledgeSearch: boolean;
  allowWebhooks: boolean;
  allowReminders: boolean;
  allowStaffNotifications: boolean;
  allowDocumentAnalysis: boolean;
  allowTranslation: boolean;
  allowCommunityModeration: boolean;
}

export interface TelegramBotConfig {
  token?: string;
  botUsername?: string;
  botId?: string;
  botName?: string;
  isConnected: boolean;
  usePolling: boolean;
  webhookUrl?: string;
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
  lastError?: string;
  lastActiveAt?: string;
}

export interface NotificationSettings {
  onNewLead: boolean;
  onHighValueLead: boolean;
  onTicketCreated: boolean;
  onTicketEscalated: boolean;
  onHandoff: boolean;
  onBookingRequest: boolean;
  onSystemError: boolean;
}

export interface AgentMetrics {
  totalConversations: number;
  totalMessages: number;
  activeUsers: number;
  leadsGenerated: number;
  qualifiedLeads: number;
  handoffs: number;
  workflowsExecuted: number;
  successfulResolutions: number;
  failedResponses: number;
  avgResponseTimeMs: number;
  totalTokens: number;
  lastCalculatedAt: string;
}

export interface Agent {
  id: string;
  tenantId: string;
  name: string;
  type: AgentType;
  businessName: string;
  businessDescription: string;
  industry: string;
  language: string;
  tone: string;
  personality: AgentPersonality;
  customPersonalityPrompt?: string;
  systemInstructions: string;
  status: AgentStatus;
  
  telegramBot: TelegramBotConfig;
  workingHours: WorkingHoursConfig;
  humanHandoff: HumanHandoffConfig;
  capabilities: AgentCapabilities;
  notificationSettings: NotificationSettings;
  
  knowledgeSourceIds: string[];
  metrics: AgentMetrics;
  
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  businessName: string;
  businessDescription: string;
  industry: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  timezone: string;
  logo?: string;
  settings: {
    defaultLanguage: string;
    apiKeySet: boolean;
    customGeminiKey?: string;
    customOpenAiKey?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeItem {
  id: string;
  tenantId: string;
  agentIds: string[];
  title: string;
  type: KnowledgeType;
  content: string;
  metadata?: {
    tags?: string[];
    price?: number | string;
    category?: string;
    url?: string;
    filePath?: string;
    fileType?: string;
    docPages?: number;
    parsedTokens?: number;
    hoursDetails?: any;
    locationDetails?: any;
    policies?: string[];
  };
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  tenantId: string;
  agentId: string;
  telegramUserId: string;
  telegramUsername?: string;
  fullName: string;
  phone?: string;
  email?: string;
  serviceRequested?: string;
  company?: string;
  budget?: string;
  timeline?: string;
  stage: LeadStage;
  score: number;
  qualificationAnswers?: Record<string, string>;
  notes: string[];
  customFields?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  id: string;
  tenantId: string;
  agentId: string;
  telegramUserId: string;
  telegramUsername?: string;
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  escalated: boolean;
  escalationReason?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingRequest {
  id: string;
  tenantId: string;
  agentId: string;
  telegramUserId: string;
  telegramUsername?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceName: string;
  requestedDate: string;
  requestedTime: string;
  additionalNotes?: string;
  status: BookingStatus;
  confirmedTimeSlot?: string;
  staffNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMemoryItem {
  id: string;
  tenantId: string;
  agentId: string;
  level: MemoryLevel;
  key: string;
  value: string;
  userId?: string;
  confidence?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'human_operator';
  content: string;
  timestamp: string;
  toolCalls?: Array<{
    toolName: string;
    input: any;
  }>;
  toolResults?: Array<{
    toolName: string;
    output: any;
    status: 'success' | 'error';
  }>;
  executionSteps?: Array<{
    title: string;
    status: 'completed' | 'in_progress' | 'failed' | 'info';
    detail?: string;
  }>;
  metadata?: {
    isPlayground?: boolean;
    telegramMessageId?: number;
    tokens?: number;
    responseTimeMs?: number;
    handoffTriggered?: boolean;
    outOfHoursTriggered?: boolean;
    createdLeadId?: string;
    createdTicketId?: string;
    createdBookingId?: string;
    operatorName?: string;
    [key: string]: any;
  };
}

export interface ConversationThread {
  id: string;
  tenantId: string;
  agentId: string;
  telegramUserId: string;
  telegramUsername?: string;
  telegramChatId: string;
  isPlayground: boolean;
  handoffActive: boolean;
  handoffStartedAt?: string;
  assignedStaff?: string;
  userLanguage?: string;
  messages: ChatMessage[];
  lastMessageAt: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  agentId?: string;
  eventType: 'TOOL_EXECUTION' | 'HANDOFF' | 'HANDOFF_STARTED' | 'HANDOFF_RESUMED' | 'LEAD_CREATED' | 'TICKET_CREATED' | 'BOOKING_CREATED' | 'RATE_LIMIT' | 'SAFETY_GUARD' | 'BOT_CONNECT' | 'CONFIG_UPDATE';
  severity: 'info' | 'warn' | 'error' | 'security';
  description: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface AgentTemplateDefinition {
  type: AgentType;
  title: string;
  badge: string;
  category: string;
  shortDescription: string;
  detailedDescription: string;
  recommendedIndustry: string;
  defaultTone: string;
  defaultPersonality: AgentPersonality;
  systemInstructions: string;
  defaultCapabilities: AgentCapabilities;
  defaultWorkingHours: WorkingHoursConfig;
  defaultHumanHandoff: HumanHandoffConfig;
  defaultNotificationSettings: NotificationSettings;
  suggestedKnowledgeExamples: Array<{
    title: string;
    type: 'faq' | 'text' | 'product' | 'policy' | 'hours_location';
    content: string;
  }>;
  quickQuestions: string[];
}

export interface AgentExecutionResult {
  reply: string;
  executionSteps: Array<{
    title: string;
    status: 'completed' | 'in_progress' | 'failed' | 'info';
    detail?: string;
  }>;
  toolExecutions: Array<{
    toolName: string;
    input: any;
    output: any;
    status: 'success' | 'error';
  }>;
  handoffTriggered: boolean;
  outOfHours: boolean;
  leadCreated?: Lead;
  ticketCreated?: SupportTicket;
  bookingCreated?: BookingRequest;
  responseTimeMs: number;
  tokensUsed: number;
}
