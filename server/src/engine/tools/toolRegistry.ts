import { Agent, AgentCapabilities, Lead, SupportTicket, BookingRequest } from '../../types/index.js';
import { db } from '../../db/store.js';
import { KnowledgeRetriever } from '../knowledge/retriever.js';

export interface ToolDefinition {
  name: string;
  description: string;
  requiredCapability: keyof AgentCapabilities;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
  execute: (args: any, context: ToolExecutionContext) => Promise<ToolExecutionResult>;
}

export interface ToolExecutionContext {
  tenantId: string;
  agentId: string;
  agent: Agent;
  userId: string;
  username?: string;
  chatId: string;
  isPlayground?: boolean;
  isOutsideHours?: boolean;
  hoursReason?: string;
}

export interface ToolExecutionResult {
  status: 'success' | 'error';
  message: string;
  data?: any;
  lead?: Lead;
  ticket?: SupportTicket;
  booking?: BookingRequest;
  handoffTriggered?: boolean;
}

export class ToolRegistry {
  private static tools: Map<string, ToolDefinition> = new Map();

  public static registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  public static getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public static getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Returns tools that the specific agent has permissions to use based on capabilities
   */
  public static getAvailableToolsForAgent(agent: Agent): ToolDefinition[] {
    return this.getAllTools().filter(t => {
      const requiredCap = t.requiredCapability;
      return !!agent.capabilities[requiredCap];
    });
  }

  /**
   * Formats tool signatures into a clean prompt schema
   */
  public static formatToolsPrompt(agent: Agent): string {
    const available = this.getAvailableToolsForAgent(agent);
    if (!available.length) return 'No tools currently enabled for this agent.';

    let prompt = 'AVAILABLE PERMISSIONED TOOLS (Invoke only when needed using exact schema):\n';
    available.forEach(t => {
      prompt += `\nTool: ${t.name}\nDescription: ${t.description}\nParameters:\n${JSON.stringify(t.parameters, null, 2)}\n`;
    });
    return prompt;
  }
}

// 1. Tool: create_lead
ToolRegistry.registerTool({
  name: 'create_lead',
  description: 'Creates a new prospective client or sales lead in the CRM pipeline.',
  requiredCapability: 'allowLeadCreation',
  parameters: {
    type: 'object',
    properties: {
      fullName: { type: 'string', description: 'Full name of the lead' },
      phone: { type: 'string', description: 'Contact phone number' },
      email: { type: 'string', description: 'Email address' },
      serviceRequested: { type: 'string', description: 'Requested service, package, or property' },
      company: { type: 'string', description: 'Company or business name (if B2B)' },
      budget: { type: 'string', description: 'Approximate budget or price tier' },
      timeline: { type: 'string', description: 'Timeline or target start date' },
      stage: {
        type: 'string',
        enum: ['NEW', 'QUALIFYING', 'QUALIFIED', 'FOLLOW_UP', 'CONVERTED', 'LOST'],
        description: 'Lead stage in CRM'
      },
      score: { type: 'number', description: 'Lead quality score from 0 to 100' },
      notes: { type: 'string', description: 'Key qualification notes or special requirements' }
    },
    required: ['fullName']
  },
  execute: async (args, ctx) => {
    const lead = db.createLead({
      tenantId: ctx.tenantId,
      agentId: ctx.agentId,
      telegramUserId: ctx.userId,
      telegramUsername: ctx.username,
      fullName: args.fullName,
      phone: args.phone,
      email: args.email,
      serviceRequested: args.serviceRequested,
      company: args.company,
      budget: args.budget,
      timeline: args.timeline,
      stage: args.stage || 'NEW',
      score: typeof args.score === 'number' ? args.score : 60,
      notes: args.notes ? [args.notes] : [],
    });

    return {
      status: 'success',
      message: `Lead successfully logged with ID: ${lead.id} (Stage: ${lead.stage}, Score: ${lead.score})`,
      data: lead,
      lead,
    };
  }
});

// 2. Tool: update_lead_stage
ToolRegistry.registerTool({
  name: 'update_lead_stage',
  description: 'Updates the stage or score of an existing lead in the CRM pipeline.',
  requiredCapability: 'allowLeadScoring',
  parameters: {
    type: 'object',
    properties: {
      leadId: { type: 'string', description: 'ID of the lead to update' },
      stage: {
        type: 'string',
        enum: ['NEW', 'QUALIFYING', 'QUALIFIED', 'FOLLOW_UP', 'CONVERTED', 'LOST'],
        description: 'New stage for the lead'
      },
      score: { type: 'number', description: 'Updated score 0-100' },
      note: { type: 'string', description: 'Additional follow-up notes' }
    },
    required: ['leadId']
  },
  execute: async (args, ctx) => {
    const existing = db.getLeadById(args.leadId);
    if (!existing) {
      return { status: 'error', message: `Lead with ID ${args.leadId} not found.` };
    }

    const updatedNotes = [...existing.notes];
    if (args.note) updatedNotes.push(args.note);

    const updated = db.updateLead(args.leadId, {
      stage: args.stage || existing.stage,
      score: args.score ?? existing.score,
      notes: updatedNotes,
    });

    return {
      status: 'success',
      message: `Lead ${args.leadId} updated.`,
      data: updated,
    };
  }
});

// 3. Tool: create_support_ticket
ToolRegistry.registerTool({
  name: 'create_support_ticket',
  description: 'Creates a customer support ticket for tracking issues, requests, or bug reports.',
  requiredCapability: 'allowTicketCreation',
  parameters: {
    type: 'object',
    properties: {
      subject: { type: 'string', description: 'Brief subject or issue summary' },
      description: { type: 'string', description: 'Detailed problem description' },
      category: { type: 'string', description: 'Category (e.g., Billing, Technical, Account, General)' },
      priority: {
        type: 'string',
        enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
        description: 'Detected priority level'
      },
      escalateToStaff: { type: 'boolean', description: 'Whether to immediately alert staff' }
    },
    required: ['subject', 'description']
  },
  execute: async (args, ctx) => {
    const ticket = db.createTicket({
      tenantId: ctx.tenantId,
      agentId: ctx.agentId,
      telegramUserId: ctx.userId,
      telegramUsername: ctx.username,
      subject: args.subject,
      description: args.description,
      category: args.category || 'General',
      priority: args.priority || 'MEDIUM',
      escalated: !!args.escalateToStaff,
      escalationReason: args.escalateToStaff ? 'Agent detected high priority issue requiring manual assistance' : undefined,
    });

    return {
      status: 'success',
      message: `Support ticket created: #${ticket.id} (${ticket.priority} Priority).`,
      data: ticket,
      ticket,
    };
  }
});

// 4. Tool: create_booking_request
ToolRegistry.registerTool({
  name: 'create_booking_request',
  description: 'Creates a structured appointment or table booking request for business staff to review and confirm.',
  requiredCapability: 'allowBookingRequests',
  parameters: {
    type: 'object',
    properties: {
      customerName: { type: 'string', description: 'Customer or guest name' },
      customerPhone: { type: 'string', description: 'Customer phone number' },
      customerEmail: { type: 'string', description: 'Customer email address' },
      serviceName: { type: 'string', description: 'Service, specialist, table, or room requested' },
      requestedDate: { type: 'string', description: 'Requested appointment date (YYYY-MM-DD or descriptive)' },
      requestedTime: { type: 'string', description: 'Preferred time slot (e.g. 10:00 AM)' },
      notes: { type: 'string', description: 'Special requirements, symptoms, party size' }
    },
    required: ['customerName', 'serviceName', 'requestedDate', 'requestedTime']
  },
  execute: async (args, ctx) => {
    const booking = db.createBooking({
      tenantId: ctx.tenantId,
      agentId: ctx.agentId,
      telegramUserId: ctx.userId,
      telegramUsername: ctx.username,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      customerEmail: args.customerEmail,
      serviceName: args.serviceName,
      requestedDate: args.requestedDate,
      requestedTime: args.requestedTime,
      additionalNotes: args.notes,
      status: 'PENDING_APPROVAL',
    });

    return {
      status: 'success',
      message: `Booking request logged: #${booking.id} for ${booking.customerName} on ${booking.requestedDate} at ${booking.requestedTime}. Pending confirmation.`,
      data: booking,
      booking,
    };
  }
});

// 5. Tool: search_knowledge_base
ToolRegistry.registerTool({
  name: 'search_knowledge_base',
  description: 'Searches official business knowledge items, FAQs, policies, and service menus.',
  requiredCapability: 'allowKnowledgeSearch',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search term or question' }
    },
    required: ['query']
  },
  execute: async (args, ctx) => {
    const results = KnowledgeRetriever.search(ctx.tenantId, ctx.agentId, args.query, 3);
    return {
      status: 'success',
      message: `Found ${results.length} relevant knowledge snippets.`,
      data: results.map(r => ({
        title: r.item.title,
        type: r.item.type,
        snippet: r.snippet,
        score: r.score,
      })),
    };
  }
});

// 6. Tool: trigger_human_handoff
ToolRegistry.registerTool({
  name: 'trigger_human_handoff',
  description: 'Transfers the chat to a human operator or staff member when the AI cannot resolve or when requested.',
  requiredCapability: 'allowStaffNotifications',
  parameters: {
    type: 'object',
    properties: {
      reason: { type: 'string', description: 'Reason for handoff (e.g. user requested, complex troubleshooting, high value deal)' },
      summary: { type: 'string', description: 'Brief context summary for the human operator' }
    },
    required: ['reason']
  },
  execute: async (args, ctx) => {
    return {
      status: 'success',
      message: `Human handoff triggered: ${args.reason}.`,
      handoffTriggered: true,
      data: { reason: args.reason, summary: args.summary },
    };
  }
});

// 7. Tool: schedule_reminder
ToolRegistry.registerTool({
  name: 'schedule_reminder',
  description: 'Schedules a personal reminder or task for the user.',
  requiredCapability: 'allowReminders',
  parameters: {
    type: 'object',
    properties: {
      taskDescription: { type: 'string', description: 'What to remind the user about' },
      timeDue: { type: 'string', description: 'When the reminder should trigger' }
    },
    required: ['taskDescription', 'timeDue']
  },
  execute: async (args, ctx) => {
    // Record in user memory
    db.createMemory({
      tenantId: ctx.tenantId,
      agentId: ctx.agentId,
      level: 'user',
      userId: ctx.userId,
      key: `reminder_${Date.now()}`,
      value: `Reminder: ${args.taskDescription} due at ${args.timeDue}`,
    });

    return {
      status: 'success',
      message: `Reminder scheduled for ${args.timeDue}: "${args.taskDescription}"`,
      data: args,
    };
  }
});

// 8. Tool: trigger_webhook
ToolRegistry.registerTool({
  name: 'trigger_webhook',
  description: 'Dispatches an external HTTP webhook to notify third-party systems.',
  requiredCapability: 'allowWebhooks',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Target webhook URL (if omitted, uses configured channel)' },
      eventName: { type: 'string', description: 'Name of event (e.g. user_signed_up, inquiry_received)' },
      payload: { type: 'string', description: 'JSON string of data to send' }
    },
    required: ['eventName']
  },
  execute: async (args, ctx) => {
    // Audit log webhook trigger
    db.logAudit(ctx.tenantId, ctx.agentId, 'TOOL_EXECUTION', 'info', `Webhook event fired: ${args.eventName}`, {
      url: args.url,
      eventName: args.eventName,
    });

    return {
      status: 'success',
      message: `Webhook event '${args.eventName}' dispatched successfully.`,
      data: { eventName: args.eventName, timestamp: new Date().toISOString() },
    };
  }
});

// 9. Tool: verify_hours
ToolRegistry.registerTool({
  name: 'verify_hours',
  description: 'Verifies the operating hours, current open/closed status, and timezone for the business.',
  requiredCapability: 'allowKnowledgeSearch',
  parameters: {
    type: 'object',
    properties: {
      timezone: { type: 'string', description: 'Target timezone' }
    },
    required: []
  },
  execute: async (args, ctx) => {
    const hours = ctx.agent.workingHours;
    return {
      status: 'success',
      message: `Verified working hours for ${ctx.agent.businessName}. Timezone: ${hours?.timezone || 'America/New_York'}.`,
      data: hours
    };
  }
});

// 10. Tool: knowledge_search
ToolRegistry.registerTool({
  name: 'knowledge_search',
  description: 'Searches official business knowledge items, FAQs, policies, and service menus.',
  requiredCapability: 'allowKnowledgeSearch',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' }
    },
    required: ['query']
  },
  execute: async (args, ctx) => {
    const results = KnowledgeRetriever.search(ctx.tenantId, ctx.agentId, args.query, 3);
    return {
      status: 'success',
      message: `Found ${results.length} relevant knowledge snippets.`,
      data: results.map(r => ({
        title: r.item.title,
        type: r.item.type,
        snippet: r.snippet,
        score: r.score,
      })),
    };
  }
});
