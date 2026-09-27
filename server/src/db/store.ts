import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
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
import { BUILT_IN_AGENT_TEMPLATES } from '../templates/agentTemplates.js';
import { SecretService } from '../services/secretService.js';
import { IRepository } from './IRepository.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export function maskSecret(secret?: string): string {
  return SecretService.maskSecret(secret);
}

export function sanitizeTenant(tenant: Tenant): Tenant {
  return {
    ...tenant,
    settings: {
      ...tenant.settings,
      customGeminiKey: undefined,
      customOpenAiKey: undefined,
      apiKeySet: Boolean(tenant.settings?.customGeminiKey || process.env.GEMINI_API_KEY),
    }
  };
}

export function sanitizeAgent(agent: Agent): Agent {
  return {
    ...agent,
    telegramBot: {
      ...agent.telegramBot,
      token: undefined,
    }
  };
}

export interface DatabaseSchema {
  users: User[];
  workspaceMembers: WorkspaceMember[];
  authSessions: AuthSession[];
  tenants: Tenant[];
  agents: Agent[];
  knowledgeItems: KnowledgeItem[];
  leads: Lead[];
  tickets: SupportTicket[];
  bookings: BookingRequest[];
  memories: AgentMemoryItem[];
  conversations: ConversationThread[];
  auditLogs: AuditLog[];
}

export class JsonRepository implements IRepository {
  private data: DatabaseSchema = {
    users: [],
    workspaceMembers: [],
    authSessions: [],
    tenants: [],
    agents: [],
    knowledgeItems: [],
    leads: [],
    tickets: [],
    bookings: [],
    memories: [],
    conversations: [],
    auditLogs: [],
  };

  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          users: parsed.users || [],
          workspaceMembers: parsed.workspaceMembers || [],
          authSessions: parsed.authSessions || [],
          tenants: parsed.tenants || [],
          agents: parsed.agents || [],
          knowledgeItems: parsed.knowledgeItems || [],
          leads: parsed.leads || [],
          tickets: parsed.tickets || [],
          bookings: parsed.bookings || [],
          memories: parsed.memories || [],
          conversations: parsed.conversations || [],
          auditLogs: parsed.auditLogs || [],
        };
        console.log(`📦 Loaded existing database: ${this.data.users.length} users, ${this.data.tenants.length} tenants, ${this.data.agents.length} agents.`);
        
        // Ensure demo user exists if users array is empty
        if (this.data.users.length === 0) {
          this.seedDemoUser();
        }
      } catch (err) {
        console.error('⚠️ Failed to parse db.json, seeding defaults:', err);
        this.seedDefaults();
      }
    } else {
      this.seedDefaults();
    }
  }

  private seedDemoUser() {
    // Default demo credentials: demo@teleagent.ai / DemoPass123!
    // Scrypt hash for "DemoPass123!" using static salt for seed
    const defaultHash = 'e8b79f12d4a532c1:7634f3ad424075b28d6c7ee6e5da55606b94cb22194ff73a9ebf52aeef2b467ecadbf501ceeb08b4ef202157a3e970a294870bfb118cb995ca7442111d4e0e5a';
    const demoUser: User = {
      id: 'usr-demo-01',
      email: 'demo@teleagent.ai',
      passwordHash: defaultHash,
      name: 'Demo Admin',
      role: 'OWNER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.users.push(demoUser);

    // Link demo user to demo tenants
    for (const tenant of this.data.tenants) {
      this.data.workspaceMembers.push({
        id: `mem-${uuidv4().substring(0, 8)}`,
        workspaceId: tenant.id,
        userId: demoUser.id,
        role: 'OWNER',
        createdAt: new Date().toISOString(),
      });
    }
    this.saveSync();
  }

  private seedDefaults() {
    console.log('🌱 Seeding initial demo businesses, agents, knowledge, and CRM records...');

    const tenant1Id = 'tenant-apex-health';
    const tenant2Id = 'tenant-pulsetech-ai';

    const tenant1: Tenant = {
      id: tenant1Id,
      name: 'Demo Sandbox — Apex Healthcare',
      businessName: 'Apex Health Clinic & Dental',
      businessDescription: 'Premier multi-specialty wellness and dental clinic providing family medicine, preventative checkups, and cosmetic dentistry.',
      industry: 'Healthcare & Wellness',
      website: 'https://apexhealthdemo.com',
      email: 'contact@apexhealthdemo.com',
      phone: '+1 (555) 234-5678',
      address: '742 Evergreen Terrace, Suite 100, New York, NY 10001',
      timezone: 'America/New_York',
      isDemo: true,
      settings: {
        defaultLanguage: 'English',
        apiKeySet: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const tenant2: Tenant = {
      id: tenant2Id,
      name: 'Demo Sandbox — PulseTech AI',
      businessName: 'PulseTech Enterprise AI',
      businessDescription: 'Enterprise AI automation workflows, Telegram bots, and CRM lead acceleration platforms for growing companies.',
      industry: 'B2B Software & SaaS',
      website: 'https://pulsetech-ai-demo.com',
      email: 'sales@pulsetech-ai-demo.com',
      phone: '+1 (555) 987-6543',
      address: '100 Silicon Boulevard, San Francisco, CA 94107',
      timezone: 'America/Los_Angeles',
      isDemo: true,
      settings: {
        defaultLanguage: 'English',
        apiKeySet: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Agent 1: Receptionist for Apex Health
    const receptionistTpl = BUILT_IN_AGENT_TEMPLATES.find(t => t.type === 'AI_RECEPTIONIST')!;
    const agent1: Agent = {
      id: 'agent-receptionist-01',
      tenantId: tenant1Id,
      name: 'Dr. Emily Receptionist',
      type: 'AI_RECEPTIONIST',
      businessName: tenant1.businessName,
      businessDescription: tenant1.businessDescription,
      industry: tenant1.industry,
      language: 'Multilingual (English default)',
      tone: 'Warm, Attentive, and Courteous',
      personality: 'Friendly',
      systemInstructions: receptionistTpl.systemInstructions.replace('{businessName}', tenant1.businessName),
      status: 'ACTIVE',
      telegramBot: {
        token: '',
        botUsername: 'ApexHealthReceptionBot',
        botName: 'Apex Health Receptionist',
        isConnected: false,
        usePolling: false,
        status: 'DISCONNECTED',
      },
      workingHours: {
        enabled: true,
        timezone: 'America/New_York',
        schedule: {
          monday: { open: '08:30', close: '18:30', isClosed: false },
          tuesday: { open: '08:30', close: '18:30', isClosed: false },
          wednesday: { open: '08:30', close: '18:30', isClosed: false },
          thursday: { open: '08:30', close: '18:30', isClosed: false },
          friday: { open: '08:30', close: '17:00', isClosed: false },
          saturday: { open: '09:00', close: '14:00', isClosed: false },
          sunday: { open: '00:00', close: '23:59', isClosed: false },
        },
        outOfHoursMessage: 'Thank you for contacting Apex Health Clinic! Our office is closed right now. We operate Mon-Fri 8:30 AM - 6:30 PM & Sat 9:00 AM - 2:00 PM. Leave your details or booking request and we will respond first thing in the morning!',
        holidayRules: [
          { date: '2026-12-25', name: 'Christmas Day', message: 'Apex Clinic is closed for Christmas Day.' },
        ],
      },
      humanHandoff: {
        enabled: true,
        triggerKeywords: ['human', 'talk to human', 'speak to human', 'real person', 'front desk person', 'live operator', 'speak with nurse', 'operator'],
        confidenceThreshold: 0.65,
        pauseBotOnHandoff: true,
        handoffMessage: "I've flagged this conversation for our front desk staff. A receptionist will join this chat momentarily.",
        resumeMessage: 'The automated receptionist has been resumed. How may I assist your health inquiry?',
        notifyChannels: {
          telegramStaffChatId: '',
          email: 'frontdesk@apexhealthdemo.com',
        },
      },
      capabilities: { ...receptionistTpl.defaultCapabilities },
      notificationSettings: { ...receptionistTpl.defaultNotificationSettings },
      knowledgeSourceIds: ['kn-apex-01', 'kn-apex-02', 'kn-apex-03', 'kn-apex-04'],
      metrics: {
        totalConversations: 124,
        totalMessages: 648,
        activeUsers: 89,
        leadsGenerated: 34,
        qualifiedLeads: 28,
        handoffs: 6,
        workflowsExecuted: 32,
        successfulResolutions: 118,
        failedResponses: 2,
        avgResponseTimeMs: 840,
        totalTokens: 148500,
        lastCalculatedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Agent 2: Sales Agent for PulseTech AI
    const salesTpl = BUILT_IN_AGENT_TEMPLATES.find(t => t.type === 'SALES_AGENT')!;
    const agent2: Agent = {
      id: 'agent-sales-01',
      tenantId: tenant2Id,
      name: 'Alex Sterling — Sales Lead AI',
      type: 'SALES_AGENT',
      businessName: tenant2.businessName,
      businessDescription: tenant2.businessDescription,
      industry: tenant2.industry,
      language: 'English',
      tone: 'Persuasive, High-Value, Solution-Focused',
      personality: 'Professional',
      systemInstructions: salesTpl.systemInstructions.replace('{businessName}', tenant2.businessName),
      status: 'ACTIVE',
      telegramBot: {
        token: '',
        botUsername: 'PulseTechSalesBot',
        botName: 'PulseTech Sales Advisor',
        isConnected: false,
        usePolling: false,
        status: 'DISCONNECTED',
      },
      workingHours: {
        enabled: false,
        timezone: 'America/Los_Angeles',
        schedule: {
          monday: { open: '00:00', close: '23:59', isClosed: false },
          tuesday: { open: '00:00', close: '23:59', isClosed: false },
          wednesday: { open: '00:00', close: '23:59', isClosed: false },
          thursday: { open: '00:00', close: '23:59', isClosed: false },
          friday: { open: '00:00', close: '23:59', isClosed: false },
          saturday: { open: '00:00', close: '23:59', isClosed: false },
          sunday: { open: '00:00', close: '23:59', isClosed: false },
        },
        outOfHoursMessage: 'Our sales team is offline, but I can answer product questions and schedule a live executive demo!',
        holidayRules: [],
      },
      humanHandoff: {
        enabled: true,
        triggerKeywords: ['talk to sales rep', 'account executive', 'custom quote', 'procurement', 'human'],
        confidenceThreshold: 0.7,
        pauseBotOnHandoff: true,
        handoffMessage: "I've alerted our Senior Account Executive. They will jump into this conversation shortly.",
        resumeMessage: 'Alex AI Sales Advisor resumed. Feel free to ask about our plans or schedule a product walkthrough.',
        notifyChannels: {
          telegramStaffChatId: '',
          email: 'sales@pulsetech-ai-demo.com',
        },
      },
      capabilities: { ...salesTpl.defaultCapabilities },
      notificationSettings: { ...salesTpl.defaultNotificationSettings },
      knowledgeSourceIds: ['kn-pulse-01', 'kn-pulse-02', 'kn-pulse-03'],
      metrics: {
        totalConversations: 245,
        totalMessages: 1320,
        activeUsers: 180,
        leadsGenerated: 62,
        qualifiedLeads: 48,
        handoffs: 14,
        workflowsExecuted: 56,
        successfulResolutions: 230,
        failedResponses: 3,
        avgResponseTimeMs: 720,
        totalTokens: 312000,
        lastCalculatedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Agent 3: Customer Support for Apex Health
    const supportTpl = BUILT_IN_AGENT_TEMPLATES.find(t => t.type === 'CUSTOMER_SUPPORT')!;
    const agent3: Agent = {
      id: 'agent-support-01',
      tenantId: tenant1Id,
      name: 'Apex Patient Support Desk',
      type: 'CUSTOMER_SUPPORT',
      businessName: tenant1.businessName,
      businessDescription: tenant1.businessDescription,
      industry: tenant1.industry,
      language: 'Multilingual',
      tone: 'Empathetic, Reassuring, Clear',
      personality: 'Helpful',
      systemInstructions: supportTpl.systemInstructions.replace('{businessName}', tenant1.businessName),
      status: 'ACTIVE',
      telegramBot: {
        token: '',
        botUsername: 'ApexSupportDeskBot',
        botName: 'Apex Patient Support',
        isConnected: false,
        usePolling: false,
        status: 'DISCONNECTED',
      },
      workingHours: {
        enabled: true,
        timezone: 'America/New_York',
        schedule: {
          monday: { open: '08:00', close: '20:00', isClosed: false },
          tuesday: { open: '08:00', close: '20:00', isClosed: false },
          wednesday: { open: '08:00', close: '20:00', isClosed: false },
          thursday: { open: '08:00', close: '20:00', isClosed: false },
          friday: { open: '08:00', close: '20:00', isClosed: false },
          saturday: { open: '09:00', close: '17:00', isClosed: false },
          sunday: { open: '10:00', close: '14:00', isClosed: false },
        },
        outOfHoursMessage: 'Our patient support desk is currently closed. For medical emergencies, please dial 911 immediately. For general tickets, our team will reply promptly during opening hours.',
        holidayRules: [],
      },
      humanHandoff: {
        enabled: true,
        triggerKeywords: ['human', 'talk to agent', 'speak to human', 'supervisor', 'operator'],
        confidenceThreshold: 0.6,
        pauseBotOnHandoff: true,
        handoffMessage: 'Your issue has been escalated to a Senior Patient Care Specialist. They will assist you shortly.',
        resumeMessage: 'Patient Support AI is active. How may we assist you?',
        notifyChannels: {
          email: 'support@apexhealthdemo.com',
        },
      },
      capabilities: { ...supportTpl.defaultCapabilities },
      notificationSettings: { ...supportTpl.defaultNotificationSettings },
      knowledgeSourceIds: ['kn-apex-01', 'kn-apex-02', 'kn-apex-04'],
      metrics: {
        totalConversations: 98,
        totalMessages: 430,
        activeUsers: 72,
        leadsGenerated: 12,
        qualifiedLeads: 10,
        handoffs: 8,
        workflowsExecuted: 42,
        successfulResolutions: 91,
        failedResponses: 1,
        avgResponseTimeMs: 650,
        totalTokens: 112000,
        lastCalculatedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Knowledge Items
    const knowledgeItems: KnowledgeItem[] = [
      {
        id: 'kn-apex-01',
        tenantId: tenant1Id,
        agentIds: ['agent-receptionist-01', 'agent-support-01'],
        title: 'Clinic Hours, Location & Contact Details',
        type: 'hours_location',
        content: `Apex Health Clinic & Dental\nAddress: 742 Evergreen Terrace, Suite 100, New York, NY 10001\nPhone: +1 (555) 234-5678\nEmail: contact@apexhealthdemo.com\nOperating Hours:\n- Monday - Thursday: 8:30 AM – 6:30 PM\n- Friday: 8:30 AM – 5:00 PM\n- Saturday: 9:00 AM – 2:00 PM\n- Sunday: Closed\nParking: Dedicated patient parking lot behind the building with wheelchair ramp access.`,
        metadata: {
          tags: ['hours', 'location', 'parking', 'phone'],
        },
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'kn-apex-02',
        tenantId: tenant1Id,
        agentIds: ['agent-receptionist-01', 'agent-support-01'],
        title: 'Medical & Dental Services Price List',
        type: 'product',
        content: `Service Offerings and Pricing:\n1. General Physician Consultation: $95 (30 mins)\n2. Comprehensive Annual Health Checkup: $220 (includes blood panel & ECG)\n3. Dental Routine Cleaning & Exam: $120 (45 mins)\n4. Dental Whitening Treatment: $280 (60 mins)\n5. Pediatric Wellness Exam: $85 (30 mins)\n6. Flu & Travel Vaccinations: $45 per shot\nInsurance Accepted: BlueCross, Aetna, Cigna, Medicare, UnitedHealthcare. Self-pay discount of 15% available on day of service.`,
        metadata: {
          category: 'Services & Pricing',
          tags: ['prices', 'insurance', 'dental', 'consultation'],
        },
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'kn-apex-03',
        tenantId: tenant1Id,
        agentIds: ['agent-receptionist-01'],
        title: 'Appointment Booking & Preparation Rules',
        type: 'policy',
        content: `Booking Instructions:\n- Please bring a valid photo ID and Insurance card to your visit.\n- Fasting for 8 hours is required only for comprehensive lipid and blood glucose panels.\n- Cancellations: Please give at least 24 hours advance notice to avoid a $30 late fee.\n- New patients are encouraged to arrive 10 minutes early to complete check-in forms.`,
        metadata: {
          tags: ['booking', 'preparation', 'cancellation'],
        },
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'kn-apex-04',
        tenantId: tenant1Id,
        agentIds: ['agent-support-01'],
        title: 'Billing & Prescription Refill FAQ',
        type: 'faq',
        content: `Q: How do I request a prescription refill?\nA: Prescription refills can be requested by providing your Full Name, Date of Birth, Medication Name, and Pharmacy details. Refills are processed within 24 business hours.\n\nQ: How do I get an itemized receipt for insurance reimbursement?\nA: Our billing team emails itemized receipts (Superbills) within 2 business days of your appointment, or you can request it directly through support.`,
        metadata: {
          tags: ['refill', 'billing', 'receipt'],
        },
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'kn-pulse-01',
        tenantId: tenant2Id,
        agentIds: ['agent-sales-01'],
        title: 'PulseTech Product Pricing & Packaging',
        type: 'product',
        content: `PulseTech Enterprise AI Packages:\n1. Starter Tier: $299/month\n   - 2 AI Agents (Telegram / Web)\n   - Up to 2,500 active conversations/mo\n   - Standard knowledge base (PDF/FAQ)\n   - Email support\n\n2. Growth Tier: $799/month (Most Popular)\n   - 8 AI Agents\n   - Up to 15,000 conversations/mo\n   - Advanced CRM pipeline & Human Handoff\n   - Custom webhooks & HTTP APIs\n   - Priority Slack support\n\n3. Enterprise Tier: Custom pricing ($2,000+/mo)\n   - Unlimited AI Agents\n   - Dedicated private LLM instances\n   - Custom SSO, 99.95% SLA & Dedicated Account Manager\n   - Onboarding in under 48 hours`,
        metadata: {
          category: 'Pricing',
          tags: ['saas', 'tiers', 'pricing', 'enterprise'],
        },
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'kn-pulse-02',
        tenantId: tenant2Id,
        agentIds: ['agent-sales-01'],
        title: 'PulseTech Key Features & Integrations',
        type: 'text',
        content: `PulseTech Platform Highlights:\n- Deep Telegram Bot API integration (Zero code deployment, live polling & webhook runner)\n- 4-Tier Memory Architecture (Conversation, User Profile, Business Fact store, Agent Config)\n- Native anti-hallucination guardrails and permission-based tool execution\n- Seamless Human Operator Live Takeover\n- Full CRM Lead Kanban and Support Ticket tracker\n- Integrates with HubSpot, Salesforce, Zapier, Webhooks, and REST APIs`,
        metadata: {
          tags: ['features', 'integrations', 'crm', 'security'],
        },
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'kn-pulse-03',
        tenantId: tenant2Id,
        agentIds: ['agent-sales-01'],
        title: 'Sales Objection Handling Guide',
        type: 'faq',
        content: `Q: What if our team already uses standard Telegram bots?\nA: Standard bots only follow rigid rule trees. PulseTech agents understand complex human context, consult verified company knowledge, collect structured leads, score prospect intent, and trigger workflows.\n\nQ: Is our business data kept private?\nA: Absolutely. Each client's data is strictly isolated with tenant isolation. We never train public foundation models on private client knowledge.`,
        metadata: {
          tags: ['objections', 'security', 'competitors'],
        },
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Seed Leads
    const leads: Lead[] = [
      {
        id: 'lead-001',
        tenantId: tenant1Id,
        agentId: 'agent-receptionist-01',
        telegramUserId: 'tg_user_89102',
        telegramUsername: 'sarah_m_wellness',
        fullName: 'Sarah Miller',
        phone: '+1 (555) 432-8765',
        email: 'sarah.miller@example.com',
        serviceRequested: 'Dental Cleaning & Exam',
        stage: 'QUALIFIED',
        score: 85,
        notes: ['Requested appointment for upcoming Tuesday morning.', 'Self-pay patient, inquired about 15% discount.'],
        createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'lead-002',
        tenantId: tenant1Id,
        agentId: 'agent-receptionist-01',
        telegramUserId: 'tg_user_77312',
        telegramUsername: 'john_d_dev',
        fullName: 'John Davis',
        phone: '+1 (555) 321-9988',
        email: 'jdavis@techstartup.io',
        serviceRequested: 'Annual Health Checkup',
        stage: 'NEW',
        score: 60,
        notes: ['Wants comprehensive blood panel and checkup.'],
        createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'lead-003',
        tenantId: tenant2Id,
        agentId: 'agent-sales-01',
        telegramUserId: 'tg_user_11029',
        telegramUsername: 'alex_growth_lead',
        fullName: 'Marcus Vance',
        company: 'Vance Logistics Corp',
        phone: '+1 (555) 901-2233',
        email: 'marcus@vancelogistics.com',
        serviceRequested: 'Growth Tier SaaS (15 Agents)',
        budget: '$800 - $1,500 / mo',
        timeline: 'Immediate (Next 2 weeks)',
        stage: 'QUALIFIED',
        score: 95,
        qualificationAnswers: {
          'Decision Maker': 'VP of Operations',
          'Current Pain': 'Manual support response takes 4+ hours',
          'Team Size': '45 support reps',
        },
        notes: ['Extremely high intent lead.', 'Scheduled executive demo for Thursday 2 PM.'],
        createdAt: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'lead-004',
        tenantId: tenant2Id,
        agentId: 'agent-sales-01',
        telegramUserId: 'tg_user_55198',
        telegramUsername: 'lisa_retail',
        fullName: 'Lisa Thornton',
        company: 'Thornton Fashion Online',
        phone: '+1 (555) 678-1234',
        email: 'lisa@thorntonfashion.com',
        serviceRequested: 'Starter / Growth Plan',
        stage: 'FOLLOW_UP',
        score: 75,
        notes: ['Inquired about Shopify and Telegram webhook integration.'],
        createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    // Seed Bookings
    const bookings: BookingRequest[] = [
      {
        id: 'book-001',
        tenantId: tenant1Id,
        agentId: 'agent-receptionist-01',
        telegramUserId: 'tg_user_89102',
        telegramUsername: 'sarah_m_wellness',
        customerName: 'Sarah Miller',
        customerPhone: '+1 (555) 432-8765',
        customerEmail: 'sarah.miller@example.com',
        serviceName: 'Dental Cleaning & Exam',
        requestedDate: '2026-09-29',
        requestedTime: '10:00 AM',
        additionalNotes: 'Prefers morning slot with Dr. Chen.',
        status: 'PENDING_APPROVAL',
        createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'book-002',
        tenantId: tenant1Id,
        agentId: 'agent-receptionist-01',
        telegramUserId: 'tg_user_33910',
        telegramUsername: 'robert_clark',
        customerName: 'Robert Clark',
        customerPhone: '+1 (555) 777-8899',
        customerEmail: 'rclark@email.com',
        serviceName: 'General Physician Consultation',
        requestedDate: '2026-09-30',
        requestedTime: '02:30 PM',
        additionalNotes: 'Routine blood pressure review.',
        status: 'CONFIRMED',
        confirmedTimeSlot: '2026-09-30 14:30 EST',
        createdAt: new Date(Date.now() - 3600 * 1000 * 20).toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    // Seed Tickets
    const tickets: SupportTicket[] = [
      {
        id: 'tkt-001',
        tenantId: tenant1Id,
        agentId: 'agent-support-01',
        telegramUserId: 'tg_user_44901',
        telegramUsername: 'david_kim_p',
        subject: 'Prescription refill authorization for Lisinopril',
        description: 'Patient requested refill of 10mg Lisinopril for 90 days sent to CVS Pharmacy #401.',
        category: 'Pharmacy & Refills',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        escalated: false,
        createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'tkt-002',
        tenantId: tenant1Id,
        agentId: 'agent-support-01',
        telegramUserId: 'tg_user_99210',
        telegramUsername: 'elena_rostova',
        subject: 'Discrepancy on insurance copay invoice',
        description: 'Patient received bill for $95 but copay should be $25 under Cigna plan.',
        category: 'Billing',
        priority: 'HIGH',
        status: 'OPEN',
        escalated: true,
        escalationReason: 'Billing dispute requires staff ledger adjustment',
        createdAt: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    // Seed Memories
    const memories: AgentMemoryItem[] = [
      {
        id: 'mem-001',
        tenantId: tenant1Id,
        agentId: 'agent-receptionist-01',
        level: 'business',
        key: 'preferred_parking_instruction',
        value: 'Remind elderly and wheelchair patients that rear parking has zero-step elevator access.',
        confidence: 1.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mem-002',
        tenantId: tenant1Id,
        agentId: 'agent-receptionist-01',
        level: 'user',
        userId: 'tg_user_89102',
        key: 'patient_preference',
        value: 'Patient Sarah Miller prefers morning appointments and reminder texts on WhatsApp/Telegram.',
        confidence: 0.95,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mem-003',
        tenantId: tenant2Id,
        agentId: 'agent-sales-01',
        level: 'business',
        key: 'q4_enterprise_discount_rule',
        value: 'Annual prepaid plans get 2 months free (16.6% discount) officially authorized.',
        confidence: 1.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    // Seed Audit Logs
    const auditLogs: AuditLog[] = [
      {
        id: 'audit-001',
        tenantId: tenant1Id,
        agentId: 'agent-receptionist-01',
        eventType: 'BOOKING_CREATED',
        severity: 'info',
        description: 'New booking request created for Sarah Miller (Dental Cleaning).',
        details: { bookingId: 'book-001', requestedDate: '2026-09-29' },
        timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      },
      {
        id: 'audit-002',
        tenantId: tenant2Id,
        agentId: 'agent-sales-01',
        eventType: 'LEAD_CREATED',
        severity: 'info',
        description: 'High-value lead qualified: Marcus Vance (Score: 95/100).',
        details: { leadId: 'lead-003', company: 'Vance Logistics Corp' },
        timestamp: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
      },
      {
        id: 'audit-003',
        tenantId: tenant1Id,
        agentId: 'agent-support-01',
        eventType: 'HANDOFF',
        severity: 'warn',
        description: 'Support ticket escalated to human supervisor for billing review.',
        details: { ticketId: 'tkt-002', reason: 'Billing dispute' },
        timestamp: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
      }
    ];

    this.data = {
      users: [],
      workspaceMembers: [],
      authSessions: [],
      tenants: [tenant1, tenant2],
      agents: [agent1, agent2, agent3],
      knowledgeItems,
      leads,
      tickets,
      bookings,
      memories,
      conversations: [],
      auditLogs,
    };

    this.seedDemoUser();
    this.saveSync();
  }

  public saveSync() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save db.json synchronously:', err);
    }
  }

  public saveAsync() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveSync();
      this.saveTimeout = null;
    }, 250);
  }

  // --- Users & Memberships ---
  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(user: { email: string; passwordHash: string; name: string; role?: UserRole }): User {
    const newUser: User = {
      id: `usr-${uuidv4().substring(0, 8)}`,
      email: user.email.toLowerCase(),
      passwordHash: user.passwordHash,
      name: user.name,
      role: user.role || 'MEMBER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.saveAsync();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): User | null {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = {
      ...this.data.users[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveAsync();
    return this.data.users[idx];
  }

  public listUsers(): User[] {
    return this.data.users;
  }

  // --- Workspace Memberships ---
  public addWorkspaceMember(member: { workspaceId: string; userId: string; role?: UserRole }): WorkspaceMember {
    const existing = this.data.workspaceMembers.find(
      m => m.workspaceId === member.workspaceId && m.userId === member.userId
    );
    if (existing) {
      existing.role = member.role || existing.role;
      this.saveAsync();
      return existing;
    }
    const newMember: WorkspaceMember = {
      id: `mem-${uuidv4().substring(0, 8)}`,
      workspaceId: member.workspaceId,
      userId: member.userId,
      role: member.role || 'MEMBER',
      createdAt: new Date().toISOString(),
    };
    this.data.workspaceMembers.push(newMember);
    this.saveAsync();
    return newMember;
  }

  public getWorkspaceMembers(workspaceId: string): WorkspaceMember[] {
    return this.data.workspaceMembers.filter(m => m.workspaceId === workspaceId);
  }

  public getUserWorkspaces(userId: string): Tenant[] {
    const memberships = this.data.workspaceMembers.filter(m => m.userId === userId);
    const workspaceIds = new Set(memberships.map(m => m.workspaceId));
    return this.data.tenants.filter(t => workspaceIds.has(t.id));
  }

  public isUserInWorkspace(userId: string, workspaceId: string): boolean {
    return this.data.workspaceMembers.some(
      m => m.userId === userId && m.workspaceId === workspaceId
    );
  }

  public getUserWorkspaceRole(userId: string, workspaceId: string): UserRole | null {
    const member = this.data.workspaceMembers.find(
      m => m.userId === userId && m.workspaceId === workspaceId
    );
    return member ? member.role : null;
  }

  // --- Auth Sessions ---
  public createSession(session: { token: string; userId: string; workspaceId: string; expiresAt: string }): AuthSession {
    const newSession: AuthSession = {
      token: session.token,
      userId: session.userId,
      workspaceId: session.workspaceId,
      expiresAt: session.expiresAt,
      createdAt: new Date().toISOString(),
    };
    this.data.authSessions.push(newSession);
    this.saveAsync();
    return newSession;
  }

  public getSession(token: string): AuthSession | undefined {
    return this.data.authSessions.find(s => s.token === token);
  }

  public deleteSession(token: string): boolean {
    const initialLen = this.data.authSessions.length;
    this.data.authSessions = this.data.authSessions.filter(s => s.token !== token);
    if (this.data.authSessions.length !== initialLen) {
      this.saveAsync();
      return true;
    }
    return false;
  }

  public deleteUserSessions(userId: string): number {
    const initialLen = this.data.authSessions.length;
    this.data.authSessions = this.data.authSessions.filter(s => s.userId !== userId);
    const deletedCount = initialLen - this.data.authSessions.length;
    if (deletedCount > 0) {
      this.saveAsync();
    }
    return deletedCount;
  }

  // --- Tenants ---
  public getTenants(): Tenant[] {
    return this.data.tenants;
  }

  public getSanitizedTenants(): Tenant[] {
    return this.data.tenants.map(sanitizeTenant);
  }

  public getTenantById(id: string): Tenant | undefined {
    const t = this.data.tenants.find(t => t.id === id);
    if (!t) return undefined;
    // Decrypt internal AI keys if needed
    if (t.settings?.customGeminiKey) {
      return {
        ...t,
        settings: {
          ...t.settings,
          customGeminiKey: SecretService.decrypt(t.settings.customGeminiKey),
        }
      };
    }
    return t;
  }

  public getSanitizedTenantById(id: string): Tenant | undefined {
    const t = this.data.tenants.find(t => t.id === id);
    return t ? sanitizeTenant(t) : undefined;
  }

  public createTenant(tenant: Partial<Tenant>): Tenant {
    const encGeminiKey = tenant.settings?.customGeminiKey
      ? SecretService.encrypt(tenant.settings.customGeminiKey)
      : undefined;

    const newTenant: Tenant = {
      id: tenant.id || `tenant-${uuidv4().substring(0, 8)}`,
      name: tenant.name || 'New Business',
      businessName: tenant.businessName || tenant.name || 'New Business',
      businessDescription: tenant.businessDescription || '',
      industry: tenant.industry || 'General',
      website: tenant.website || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      address: tenant.address || '',
      timezone: tenant.timezone || 'UTC',
      logo: tenant.logo || '',
      isDemo: tenant.isDemo ?? false,
      settings: {
        defaultLanguage: 'English',
        apiKeySet: Boolean(encGeminiKey || process.env.GEMINI_API_KEY),
        ...tenant.settings,
        customGeminiKey: encGeminiKey,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.tenants.push(newTenant);
    this.saveAsync();
    return newTenant;
  }

  public updateTenant(id: string, updates: Partial<Tenant>): Tenant | null {
    const idx = this.data.tenants.findIndex(t => t.id === id);
    if (idx === -1) return null;

    let encGeminiKey = this.data.tenants[idx].settings?.customGeminiKey;
    if (updates.settings?.customGeminiKey !== undefined) {
      encGeminiKey = updates.settings.customGeminiKey
        ? SecretService.encrypt(updates.settings.customGeminiKey)
        : undefined;
    }

    this.data.tenants[idx] = {
      ...this.data.tenants[idx],
      ...updates,
      settings: {
        ...this.data.tenants[idx].settings,
        ...updates.settings,
        customGeminiKey: encGeminiKey,
        apiKeySet: Boolean(encGeminiKey || process.env.GEMINI_API_KEY),
      },
      updatedAt: new Date().toISOString(),
    };
    this.saveAsync();
    return this.data.tenants[idx];
  }

  public deleteTenant(id: string): boolean {
    const initialLen = this.data.tenants.length;
    this.data.tenants = this.data.tenants.filter(t => t.id !== id);
    if (this.data.tenants.length !== initialLen) {
      this.data.workspaceMembers = this.data.workspaceMembers.filter(m => m.workspaceId !== id);
      this.data.agents = this.data.agents.filter(a => a.tenantId !== id);
      this.data.knowledgeItems = this.data.knowledgeItems.filter(k => k.tenantId !== id);
      this.data.leads = this.data.leads.filter(l => l.tenantId !== id);
      this.data.tickets = this.data.tickets.filter(t => t.tenantId !== id);
      this.data.bookings = this.data.bookings.filter(b => b.tenantId !== id);
      this.data.memories = this.data.memories.filter(m => m.tenantId !== id);
      this.data.conversations = this.data.conversations.filter(c => c.tenantId !== id);
      this.saveAsync();
      return true;
    }
    return false;
  }

  // --- Agents ---
  public getAgents(tenantId?: string): Agent[] {
    const list = tenantId ? this.data.agents.filter(a => a.tenantId === tenantId) : this.data.agents;
    return list.map(a => ({
      ...a,
      telegramBot: {
        ...a.telegramBot,
        token: SecretService.decrypt(a.telegramBot?.token),
      }
    }));
  }

  public getSanitizedAgents(tenantId?: string): Agent[] {
    const list = tenantId ? this.data.agents.filter(a => a.tenantId === tenantId) : this.data.agents;
    return list.map(sanitizeAgent);
  }

  public getAgentById(id: string, tenantId?: string): Agent | undefined {
    const a = this.data.agents.find(a => a.id === id && (!tenantId || a.tenantId === tenantId));
    if (!a) return undefined;
    return {
      ...a,
      telegramBot: {
        ...a.telegramBot,
        token: SecretService.decrypt(a.telegramBot?.token),
      }
    };
  }

  public getSanitizedAgentById(id: string, tenantId?: string): Agent | undefined {
    const a = this.data.agents.find(a => a.id === id && (!tenantId || a.tenantId === tenantId));
    return a ? sanitizeAgent(a) : undefined;
  }

  public createAgent(agent: Partial<Agent>): Agent {
    const id = agent.id || `agent-${uuidv4().substring(0, 8)}`;
    const encToken = agent.telegramBot?.token ? SecretService.encrypt(agent.telegramBot.token) : '';

    const newAgent: Agent = {
      id,
      tenantId: agent.tenantId || this.data.tenants[0]?.id || 'tenant-default',
      name: agent.name || 'New AI Agent',
      type: agent.type || 'CUSTOM',
      businessName: agent.businessName || 'Business',
      businessDescription: agent.businessDescription || '',
      industry: agent.industry || 'General',
      language: agent.language || 'English',
      tone: agent.tone || 'Professional',
      personality: agent.personality || 'Friendly',
      customPersonalityPrompt: agent.customPersonalityPrompt,
      systemInstructions: agent.systemInstructions || 'You are a helpful AI assistant.',
      status: agent.status || 'DRAFT',
      telegramBot: {
        botUsername: '',
        botName: '',
        isConnected: false,
        usePolling: false,
        status: 'DISCONNECTED',
        ...agent.telegramBot,
        token: encToken,
      },
      workingHours: agent.workingHours || {
        enabled: true,
        timezone: 'UTC',
        schedule: {
          monday: { open: '09:00', close: '18:00', isClosed: false },
          tuesday: { open: '09:00', close: '18:00', isClosed: false },
          wednesday: { open: '09:00', close: '18:00', isClosed: false },
          thursday: { open: '09:00', close: '18:00', isClosed: false },
          friday: { open: '09:00', close: '18:00', isClosed: false },
          saturday: { open: '10:00', close: '16:00', isClosed: false },
          sunday: { open: '00:00', close: '00:00', isClosed: true },
        },
        outOfHoursMessage: 'Thank you for reaching out! We are currently outside business hours and will respond shortly.',
        holidayRules: [],
      },
      humanHandoff: agent.humanHandoff || {
        enabled: true,
        triggerKeywords: ['human', 'agent', 'support rep', 'representative', 'operator'],
        confidenceThreshold: 0.65,
        pauseBotOnHandoff: true,
        handoffMessage: "I've connected you with a human representative. They will take over shortly.",
        resumeMessage: 'The automated assistant has been resumed. How else can I assist you?',
        notifyChannels: {},
      },
      capabilities: agent.capabilities || {
        allowLeadCreation: true,
        allowLeadScoring: true,
        allowTicketCreation: true,
        allowTicketEscalation: true,
        allowBookingRequests: true,
        allowKnowledgeSearch: true,
        allowWebhooks: true,
        allowReminders: true,
        allowStaffNotifications: true,
        allowDocumentAnalysis: true,
        allowTranslation: true,
        allowCommunityModeration: false,
      },
      notificationSettings: agent.notificationSettings || {
        onNewLead: true,
        onHighValueLead: true,
        onTicketCreated: true,
        onTicketEscalated: true,
        onHandoff: true,
        onBookingRequest: true,
        onSystemError: true,
      },
      knowledgeSourceIds: agent.knowledgeSourceIds || [],
      metrics: agent.metrics || {
        totalConversations: 0,
        totalMessages: 0,
        activeUsers: 0,
        leadsGenerated: 0,
        qualifiedLeads: 0,
        handoffs: 0,
        workflowsExecuted: 0,
        successfulResolutions: 0,
        failedResponses: 0,
        avgResponseTimeMs: 0,
        totalTokens: 0,
        lastCalculatedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.agents.push(newAgent);
    this.saveAsync();
    this.logAudit(newAgent.tenantId, newAgent.id, 'CONFIG_UPDATE', 'info', `Created new agent: ${newAgent.name} (${newAgent.type})`);
    return newAgent;
  }

  public updateAgent(id: string, updates: Partial<Agent>, tenantId?: string): Agent | null {
    const idx = this.data.agents.findIndex(a => a.id === id && (!tenantId || a.tenantId === tenantId));
    if (idx === -1) return null;

    let encToken = this.data.agents[idx].telegramBot?.token;
    if (updates.telegramBot?.token !== undefined) {
      encToken = updates.telegramBot.token ? SecretService.encrypt(updates.telegramBot.token) : '';
    }

    this.data.agents[idx] = {
      ...this.data.agents[idx],
      ...updates,
      telegramBot: {
        ...this.data.agents[idx].telegramBot,
        ...updates.telegramBot,
        token: encToken,
      },
      updatedAt: new Date().toISOString(),
    };
    this.saveAsync();
    return this.data.agents[idx];
  }

  public duplicateAgent(id: string, tenantId?: string): Agent | null {
    const source = this.getAgentById(id, tenantId);
    if (!source) return null;

    const cloned = this.createAgent({
      ...source,
      id: `agent-${uuidv4().substring(0, 8)}`,
      name: `${source.name} (Copy)`,
      status: 'DRAFT',
      telegramBot: {
        ...source.telegramBot,
        token: '',
        botUsername: '',
        botName: '',
        isConnected: false,
        usePolling: false,
        status: 'DISCONNECTED',
      },
      metrics: {
        totalConversations: 0,
        totalMessages: 0,
        activeUsers: 0,
        leadsGenerated: 0,
        qualifiedLeads: 0,
        handoffs: 0,
        workflowsExecuted: 0,
        successfulResolutions: 0,
        failedResponses: 0,
        avgResponseTimeMs: 0,
        totalTokens: 0,
        lastCalculatedAt: new Date().toISOString(),
      },
    });
    return cloned;
  }

  public deleteAgent(id: string, tenantId?: string): boolean {
    const initialLen = this.data.agents.length;
    this.data.agents = this.data.agents.filter(a => !(a.id === id && (!tenantId || a.tenantId === tenantId)));
    if (this.data.agents.length !== initialLen) {
      this.saveAsync();
      return true;
    }
    return false;
  }

  // --- Knowledge Items ---
  public getKnowledgeItems(tenantId?: string, agentId?: string): KnowledgeItem[] {
    return this.data.knowledgeItems.filter(k => {
      if (tenantId && tenantId !== 'all' && k.tenantId !== tenantId) return false;
      if (agentId && k.agentIds && k.agentIds.length > 0) {
        return k.agentIds.includes(agentId);
      }
      return true;
    });
  }

  public getKnowledgeItemById(id: string): KnowledgeItem | undefined {
    return this.data.knowledgeItems.find(k => k.id === id);
  }

  public createKnowledgeItem(item: Partial<KnowledgeItem>): KnowledgeItem {
    const newItem: KnowledgeItem = {
      id: item.id || `kn-${uuidv4().substring(0, 8)}`,
      tenantId: item.tenantId || 'tenant-default',
      agentIds: item.agentIds || [],
      title: item.title || 'Untitled Knowledge',
      type: item.type || 'text',
      content: item.content || '',
      metadata: item.metadata || {},
      enabled: item.enabled ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.knowledgeItems.push(newItem);
    this.saveAsync();
    return newItem;
  }

  public updateKnowledgeItem(id: string, updates: Partial<KnowledgeItem>): KnowledgeItem | null {
    const idx = this.data.knowledgeItems.findIndex(k => k.id === id);
    if (idx === -1) return null;
    this.data.knowledgeItems[idx] = {
      ...this.data.knowledgeItems[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveAsync();
    return this.data.knowledgeItems[idx];
  }

  public deleteKnowledgeItem(id: string): boolean {
    const initialLen = this.data.knowledgeItems.length;
    this.data.knowledgeItems = this.data.knowledgeItems.filter(k => k.id !== id);
    if (this.data.knowledgeItems.length !== initialLen) {
      this.saveAsync();
      return true;
    }
    return false;
  }

  // --- Leads ---
  public getLeads(tenantId?: string, agentId?: string): Lead[] {
    return this.data.leads.filter(l => (!tenantId || tenantId === 'all' || l.tenantId === tenantId) && (!agentId || l.agentId === agentId));
  }

  public getLeadById(id: string): Lead | undefined {
    return this.data.leads.find(l => l.id === id);
  }

  public createLead(lead: Partial<Lead>): Lead {
    const newLead: Lead = {
      id: lead.id || `lead-${uuidv4().substring(0, 8)}`,
      tenantId: lead.tenantId || 'tenant-default',
      agentId: lead.agentId || '',
      telegramUserId: lead.telegramUserId || `user_${Date.now()}`,
      telegramUsername: lead.telegramUsername,
      fullName: lead.fullName || 'Prospective Lead',
      phone: lead.phone,
      email: lead.email,
      serviceRequested: lead.serviceRequested,
      company: lead.company,
      budget: lead.budget,
      timeline: lead.timeline,
      stage: lead.stage || 'NEW',
      score: typeof lead.score === 'number' ? lead.score : 50,
      qualificationAnswers: lead.qualificationAnswers || {},
      notes: lead.notes || [],
      customFields: lead.customFields || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.leads.unshift(newLead);
    this.saveAsync();
    this.logAudit(newLead.tenantId, newLead.agentId, 'LEAD_CREATED', 'info', `Created lead: ${newLead.fullName} (${newLead.stage}, Score: ${newLead.score})`, { leadId: newLead.id });
    return newLead;
  }

  public updateLead(id: string, updates: Partial<Lead>): Lead | null {
    const idx = this.data.leads.findIndex(l => l.id === id);
    if (idx === -1) return null;
    this.data.leads[idx] = {
      ...this.data.leads[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveAsync();
    return this.data.leads[idx];
  }

  public deleteLead(id: string): boolean {
    const initialLen = this.data.leads.length;
    this.data.leads = this.data.leads.filter(l => l.id !== id);
    if (this.data.leads.length !== initialLen) {
      this.saveAsync();
      return true;
    }
    return false;
  }

  // --- Support Tickets ---
  public getTickets(tenantId?: string, agentId?: string): SupportTicket[] {
    return this.data.tickets.filter(t => (!tenantId || tenantId === 'all' || t.tenantId === tenantId) && (!agentId || t.agentId === agentId));
  }

  public createTicket(ticket: Partial<SupportTicket>): SupportTicket {
    const newTicket: SupportTicket = {
      id: ticket.id || `tkt-${uuidv4().substring(0, 8)}`,
      tenantId: ticket.tenantId || 'tenant-default',
      agentId: ticket.agentId || '',
      telegramUserId: ticket.telegramUserId || `user_${Date.now()}`,
      telegramUsername: ticket.telegramUsername,
      subject: ticket.subject || 'Support Inquiry',
      description: ticket.description || '',
      category: ticket.category || 'General',
      priority: ticket.priority || 'MEDIUM',
      status: ticket.status || 'OPEN',
      escalated: ticket.escalated ?? false,
      escalationReason: ticket.escalationReason,
      resolutionNotes: ticket.resolutionNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.tickets.unshift(newTicket);
    this.saveAsync();
    this.logAudit(newTicket.tenantId, newTicket.agentId, 'TICKET_CREATED', 'info', `Created ticket: ${newTicket.subject} (${newTicket.priority})`, { ticketId: newTicket.id });
    return newTicket;
  }

  public updateTicket(id: string, updates: Partial<SupportTicket>): SupportTicket | null {
    const idx = this.data.tickets.findIndex(t => t.id === id);
    if (idx === -1) return null;
    this.data.tickets[idx] = {
      ...this.data.tickets[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveAsync();
    return this.data.tickets[idx];
  }

  public deleteTicket(id: string): boolean {
    const initialLen = this.data.tickets.length;
    this.data.tickets = this.data.tickets.filter(t => t.id !== id);
    if (this.data.tickets.length !== initialLen) {
      this.saveAsync();
      return true;
    }
    return false;
  }

  // --- Bookings ---
  public getBookings(tenantId?: string, agentId?: string): BookingRequest[] {
    return this.data.bookings.filter(b => (!tenantId || tenantId === 'all' || b.tenantId === tenantId) && (!agentId || b.agentId === agentId));
  }

  public createBooking(booking: Partial<BookingRequest>): BookingRequest {
    const newBooking: BookingRequest = {
      id: booking.id || `book-${uuidv4().substring(0, 8)}`,
      tenantId: booking.tenantId || 'tenant-default',
      agentId: booking.agentId || '',
      telegramUserId: booking.telegramUserId || `user_${Date.now()}`,
      telegramUsername: booking.telegramUsername,
      customerName: booking.customerName || 'Valued Guest',
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail,
      serviceName: booking.serviceName || 'Standard Service',
      requestedDate: booking.requestedDate || new Date().toISOString().split('T')[0],
      requestedTime: booking.requestedTime || '10:00 AM',
      additionalNotes: booking.additionalNotes,
      status: booking.status || 'PENDING_APPROVAL',
      confirmedTimeSlot: booking.confirmedTimeSlot,
      staffNotes: booking.staffNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.bookings.unshift(newBooking);
    this.saveAsync();
    this.logAudit(newBooking.tenantId, newBooking.agentId, 'BOOKING_CREATED', 'info', `Created booking request for ${newBooking.customerName} on ${newBooking.requestedDate}`, { bookingId: newBooking.id });
    return newBooking;
  }

  public updateBooking(id: string, updates: Partial<BookingRequest>): BookingRequest | null {
    const idx = this.data.bookings.findIndex(b => b.id === id);
    if (idx === -1) return null;
    this.data.bookings[idx] = {
      ...this.data.bookings[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveAsync();
    return this.data.bookings[idx];
  }

  public deleteBooking(id: string): boolean {
    const initialLen = this.data.bookings.length;
    this.data.bookings = this.data.bookings.filter(b => b.id !== id);
    if (this.data.bookings.length !== initialLen) {
      this.saveAsync();
      return true;
    }
    return false;
  }

  // --- Memories ---
  public getMemories(tenantId?: string, agentId?: string, level?: string, userId?: string): AgentMemoryItem[] {
    return this.data.memories.filter(m => {
      if (tenantId && tenantId !== 'all' && m.tenantId !== tenantId) return false;
      if (agentId && m.agentId !== agentId) return false;
      if (level && m.level !== level) return false;
      if (userId && m.userId !== userId) return false;
      return true;
    });
  }

  public createMemory(memory: Partial<AgentMemoryItem>): AgentMemoryItem {
    const newMemory: AgentMemoryItem = {
      id: memory.id || `mem-${uuidv4().substring(0, 8)}`,
      tenantId: memory.tenantId || 'tenant-default',
      agentId: memory.agentId || '',
      level: memory.level || 'conversation',
      key: memory.key || 'fact',
      value: memory.value || '',
      userId: memory.userId,
      confidence: memory.confidence ?? 1.0,
      metadata: memory.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.memories.push(newMemory);
    this.saveAsync();
    return newMemory;
  }

  public updateMemory(id: string, updates: Partial<AgentMemoryItem>): AgentMemoryItem | null {
    const idx = this.data.memories.findIndex(m => m.id === id);
    if (idx === -1) return null;
    this.data.memories[idx] = {
      ...this.data.memories[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveAsync();
    return this.data.memories[idx];
  }

  public deleteMemory(id: string): boolean {
    const initialLen = this.data.memories.length;
    this.data.memories = this.data.memories.filter(m => m.id !== id);
    if (this.data.memories.length !== initialLen) {
      this.saveAsync();
      return true;
    }
    return false;
  }

  public clearConversationMemory(conversationId: string): boolean {
    const conv = this.data.conversations.find(c => c.id === conversationId);
    if (conv) {
      conv.messages = [];
      this.data.memories = this.data.memories.filter(m => m.userId !== conv.telegramUserId);
      this.saveAsync();
      return true;
    }
    return false;
  }

  // --- Conversations ---
  public getConversations(tenantId?: string, agentId?: string): ConversationThread[] {
    return this.data.conversations.filter(c => (!tenantId || tenantId === 'all' || c.tenantId === tenantId) && (!agentId || c.agentId === agentId));
  }

  public getConversationById(id: string): ConversationThread | undefined {
    return this.data.conversations.find(c => c.id === id);
  }

  public getOrCreateConversation(params: {
    tenantId: string;
    agentId: string;
    telegramUserId: string;
    telegramUsername?: string;
    telegramChatId: string;
    isPlayground?: boolean;
  }): ConversationThread {
    let thread = this.data.conversations.find(c =>
      c.agentId === params.agentId &&
      c.telegramChatId === params.telegramChatId &&
      c.isPlayground === (params.isPlayground ?? false)
    );

    if (!thread) {
      thread = {
        id: `conv-${uuidv4().substring(0, 8)}`,
        tenantId: params.tenantId,
        agentId: params.agentId,
        telegramUserId: params.telegramUserId,
        telegramUsername: params.telegramUsername,
        telegramChatId: params.telegramChatId,
        isPlayground: params.isPlayground ?? false,
        handoffActive: false,
        messages: [],
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      this.data.conversations.unshift(thread);
      this.saveSync();
    }
    return thread;
  }

  public appendMessage(conversationId: string, message: Partial<ChatMessage>): ChatMessage {
    const thread = this.data.conversations.find(c => c.id === conversationId);
    if (!thread) throw new Error(`Conversation not found: ${conversationId}`);

    const newMsg: ChatMessage = {
      id: message.id || `msg-${uuidv4().substring(0, 8)}`,
      role: message.role || 'user',
      content: message.content || '',
      timestamp: new Date().toISOString(),
      toolCalls: message.toolCalls,
      toolResults: message.toolResults,
      executionSteps: message.executionSteps,
      metadata: message.metadata,
    };

    thread.messages.push(newMsg);
    thread.lastMessageAt = new Date().toISOString();
    this.saveSync();
    return newMsg;
  }

  public updateConversation(id: string, updates: Partial<ConversationThread>): ConversationThread | null {
    const idx = this.data.conversations.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.conversations[idx] = {
      ...this.data.conversations[idx],
      ...updates,
    };
    this.saveSync();
    return this.data.conversations[idx];
  }

  // --- Audit Logs ---
  public getAuditLogs(tenantId?: string, agentId?: string): AuditLog[] {
    return this.data.auditLogs.filter(a => (!tenantId || a.tenantId === tenantId) && (!agentId || a.agentId === agentId));
  }

  public logAudit(
    tenantId: string,
    agentId: string | undefined,
    eventType: AuditLog['eventType'],
    severity: AuditLog['severity'],
    description: string,
    details: Record<string, any> = {}
  ): AuditLog {
    const log: AuditLog = {
      id: `audit-${uuidv4().substring(0, 8)}`,
      tenantId,
      agentId,
      eventType,
      severity,
      description,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.saveAsync();
    return log;
  }
}

export const db = new JsonRepository();
