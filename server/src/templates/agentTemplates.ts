import { Agent, AgentType, AgentPersonality, WorkingHoursConfig, HumanHandoffConfig, AgentCapabilities, NotificationSettings } from '../types/index.js';

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

const defaultWorkingHoursTemplate: WorkingHoursConfig = {
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
  outOfHoursMessage: "Thank you for reaching out! Our team is currently offline. We operate Monday to Friday 9:00 AM - 6:00 PM and Saturday 10:00 AM - 4:00 PM. We'll respond to your inquiry during business hours.",
  holidayRules: [
    { date: '2026-12-25', name: 'Christmas Day', message: 'Happy Holidays! We are closed for Christmas Day.' },
    { date: '2026-01-01', name: "New Year's Day", message: 'Happy New Year! We are closed for New Year Day.' },
  ],
};

const defaultHumanHandoffTemplate: HumanHandoffConfig = {
  enabled: true,
  triggerKeywords: ['human', 'talk to human', 'speak to human', 'support rep', 'operator', 'talk to person', 'real person', 'live agent', 'supervisor', 'manager'],
  confidenceThreshold: 0.65,
  pauseBotOnHandoff: true,
  handoffMessage: "I've connected you with a human representative from our team. They will take over this chat shortly. Please feel free to provide any additional context!",
  resumeMessage: "The automated assistant has been resumed. How else can I assist you?",
  notifyChannels: {
    telegramStaffChatId: '',
    email: '',
    webhookUrl: '',
  },
};

const defaultNotificationTemplate: NotificationSettings = {
  onNewLead: true,
  onHighValueLead: true,
  onTicketCreated: true,
  onTicketEscalated: true,
  onHandoff: true,
  onBookingRequest: true,
  onSystemError: true,
};

export const BUILT_IN_AGENT_TEMPLATES: AgentTemplateDefinition[] = [
  {
    type: 'AI_RECEPTIONIST',
    title: 'AI Receptionist',
    badge: 'Front Desk & Booking',
    category: 'Operations',
    shortDescription: 'Front-desk digital concierge that greets visitors, answers FAQs, collects booking details, and notifies staff.',
    detailedDescription: 'Acts as a professional front desk receptionist. Greets users warmly, answers questions regarding business hours, location, and services, collects structured appointment booking requests (name, phone, requested service, date, time), creates lead & booking records, and alerts team members.',
    recommendedIndustry: 'Healthcare, Dental, Salons, Spas, Legal, Consultancies',
    defaultTone: 'Welcoming, Attentive, and Professional',
    defaultPersonality: 'Friendly',
    systemInstructions: `You are the official Digital AI Receptionist for {businessName}.
Your goal is to warmly welcome visitors, provide clear information based strictly on business knowledge, and assist users with booking requests.

BEHAVIOR RULES:
1. Greet the guest with a warm, courteous tone.
2. Answer inquiries about services, location, hours, and policies using ONLY the configured business knowledge.
3. When a user requests an appointment or consultation:
   - Politely gather: Name, Phone Number/Email, Requested Service, Preferred Date, Preferred Time, and any special notes.
   - Do NOT confirm an appointment as finalized unless external calendar confirms it. Clearly state: "I have recorded your appointment request for [Date/Time] and our scheduling team will confirm it with you shortly."
   - Call the booking request tool to save their details into the system.
4. If asked something unknown, politely explain: "I don't have that specific detail right now, but I can have our staff get in touch with you." Offer human handoff if they prefer.
5. Never invent or guess medical advice, legal counsel, or pricing not present in the knowledge base.`,
    defaultCapabilities: {
      allowLeadCreation: true,
      allowLeadScoring: true,
      allowTicketCreation: false,
      allowTicketEscalation: false,
      allowBookingRequests: true,
      allowKnowledgeSearch: true,
      allowWebhooks: true,
      allowReminders: true,
      allowStaffNotifications: true,
      allowDocumentAnalysis: false,
      allowTranslation: true,
      allowCommunityModeration: false,
    },
    defaultWorkingHours: defaultWorkingHoursTemplate,
    defaultHumanHandoff: defaultHumanHandoffTemplate,
    defaultNotificationSettings: defaultNotificationTemplate,
    suggestedKnowledgeExamples: [
      {
        title: 'Working Hours & Location',
        type: 'hours_location',
        content: 'Address: 742 Evergreen Terrace, Suite 100, New York, NY 10001. Open Mon-Fri 8:30 AM - 6:30 PM, Sat 9:00 AM - 2:00 PM. Parking available in rear.',
      },
      {
        title: 'Booking & Cancellation Policy',
        type: 'policy',
        content: 'Appointments require at least 24 hours advance notice for cancellation or rescheduling. Free consultation for new first-time clients.',
      },
      {
        title: 'Popular Services',
        type: 'product',
        content: '1. Initial Consultation (30 mins - Free). 2. Standard Service Session (60 mins - $120). 3. Premium Comprehensive Session (90 mins - $180).',
      }
    ],
    quickQuestions: [
      'Hi, I would like to book an appointment for tomorrow.',
      'What are your working hours and where are you located?',
      'What is your cancellation policy?'
    ]
  },
  {
    type: 'SALES_AGENT',
    title: 'Sales Agent',
    badge: 'Revenue & Qualification',
    category: 'Sales',
    shortDescription: 'High-converting sales specialist that qualifies leads, handles objections, scores prospects, and drives conversions.',
    detailedDescription: 'Engages prospective clients, asks strategic qualification questions (budget, timeline, requirements), explains offerings and pricing without fabricating discounts, scores leads from 0 to 100, and routes qualified leads directly to your sales pipeline.',
    recommendedIndustry: 'B2B SaaS, Agencies, High-Ticket Services, Wholesale, Consulting',
    defaultTone: 'Persuasive, Consultative, and Solution-Oriented',
    defaultPersonality: 'Professional',
    systemInstructions: `You are the Senior Sales Consultant AI for {businessName}.
Your objective is to guide prospects through the buying journey, qualify their requirements, handle common objections with verified facts, and generate high-intent leads.

SALES WORKFLOW:
1. Warm Greeting & Requirement Discovery: Ask open-ended questions to identify the prospect's primary pain points and goals.
2. Solution Presentation: Match their requirements to the business's verified products/services and pricing from the knowledge base.
3. Objection Handling: Clarify concerns (budget, ROI, implementation) using authentic knowledge. Never make false promises or fabricate unapproved discounts.
4. Lead Qualification & Scoring:
   - Collect: Full Name, Company, Email/Phone, Budget Range, Target Timeline, Key Needs.
   - Assign Lead Stage (NEW, QUALIFYING, QUALIFIED, FOLLOW_UP, CONVERTED, LOST).
   - Score the lead (0-100) based on budget fit and immediate timeline.
   - Automatically trigger lead creation.
5. Clear Call to Action: Invite them for an executive demo or sales consultation call.`,
    defaultCapabilities: {
      allowLeadCreation: true,
      allowLeadScoring: true,
      allowTicketCreation: false,
      allowTicketEscalation: false,
      allowBookingRequests: true,
      allowKnowledgeSearch: true,
      allowWebhooks: true,
      allowReminders: true,
      allowStaffNotifications: true,
      allowDocumentAnalysis: true,
      allowTranslation: true,
      allowCommunityModeration: false,
    },
    defaultWorkingHours: defaultWorkingHoursTemplate,
    defaultHumanHandoff: defaultHumanHandoffTemplate,
    defaultNotificationSettings: defaultNotificationTemplate,
    suggestedKnowledgeExamples: [
      {
        title: 'Product Packages & Pricing',
        type: 'product',
        content: 'Starter Plan: $299/mo (up to 5 users). Growth Plan: $799/mo (up to 25 users + dedicated manager). Enterprise: Custom tailored pricing with SLA.',
      },
      {
        title: 'Common Sales FAQs & Differentiators',
        type: 'faq',
        content: 'Q: How fast can we get onboarded? A: Our typical onboarding takes under 48 hours with our dedicated implementation team.\nQ: Do you offer custom integrations? A: Yes, Growth and Enterprise plans include custom API webhook setup.',
      }
    ],
    quickQuestions: [
      'What pricing plans do you offer?',
      'Can you tell me how this compares to other solutions in the market?',
      'We have a team of 15 people and need to start next week.'
    ]
  },
  {
    type: 'CUSTOMER_SUPPORT',
    title: 'Customer Support Agent',
    badge: 'Resolution & Ticketing',
    category: 'Support',
    shortDescription: '24/7 intelligent tier-1 support agent that troubleshoots issues, manages tickets, and escalates when needed.',
    detailedDescription: 'Resolves customer questions and technical issues rapidly using knowledge docs. Automatically categorizes support queries, creates tracked tickets with priority levels (LOW, MEDIUM, HIGH, URGENT), and triggers seamless human handoff when complex troubleshooting is required.',
    recommendedIndustry: 'SaaS, Consumer Tech, Telecom, FinTech, Utilities',
    defaultTone: 'Empathetic, Patient, and Problem-Solving',
    defaultPersonality: 'Helpful',
    systemInstructions: `You are the Lead Customer Support Specialist for {businessName}.
Your mission is to deliver fast, accurate, and empathetic assistance to resolving user problems.

SUPPORT PROTOCOL:
1. Empathize & Clarify: Acknowledge the user's issue with genuine care. Ask clarifying questions to isolate the root cause.
2. Knowledge-First Troubleshooting: Provide step-by-step resolution guides based strictly on documentation.
3. Ticket Management:
   - If the issue cannot be resolved immediately in one turn, create a Support Ticket.
   - Detect priority:
     * LOW: General inquiry / cosmetic feedback.
     * MEDIUM: Minor defect with workaround.
     * HIGH: Important functionality blocked for individual.
     * URGENT: System downtime / critical business stoppage / payment failure.
   - Provide the user with their ticket reference ID.
4. Escalation & Handoff: If the user expresses extreme frustration, requests an engineer, or if the issue requires admin access, initiate human handoff immediately.`,
    defaultCapabilities: {
      allowLeadCreation: false,
      allowLeadScoring: false,
      allowTicketCreation: true,
      allowTicketEscalation: true,
      allowBookingRequests: false,
      allowKnowledgeSearch: true,
      allowWebhooks: true,
      allowReminders: false,
      allowStaffNotifications: true,
      allowDocumentAnalysis: true,
      allowTranslation: true,
      allowCommunityModeration: false,
    },
    defaultWorkingHours: defaultWorkingHoursTemplate,
    defaultHumanHandoff: defaultHumanHandoffTemplate,
    defaultNotificationSettings: defaultNotificationTemplate,
    suggestedKnowledgeExamples: [
      {
        title: 'Troubleshooting Guide & Reset Steps',
        type: 'text',
        content: 'To reset account passwords: Go to Settings > Security > Reset. For API rate limit errors (429), please check header retry-after or verify billing plan.',
      },
      {
        title: 'Refund & SLA Policy',
        type: 'policy',
        content: 'Refunds are processed within 14 business days upon request. Guaranteed 99.9% uptime SLA on Business and Enterprise tiers.',
      }
    ],
    quickQuestions: [
      'My login is not working, what should I do?',
      'I need a refund for my recent transaction.',
      'I want to speak to a senior support representative right now.'
    ]
  },
  {
    type: 'BUSINESS_ASSISTANT',
    title: 'Business Assistant',
    badge: 'General Business AI',
    category: 'Operations',
    shortDescription: 'General business representative that answers questions about company offerings, services, policies, and contacts.',
    detailedDescription: 'A versatile executive assistant representing the company brand. Delivers accurate answers to prospect and client questions about company history, core capabilities, leadership, pricing structure, location, operating hours, and partnership inquiries.',
    recommendedIndustry: 'Corporate, Agencies, Service Providers, Small & Medium Businesses',
    defaultTone: 'Professional, Polished, and Clear',
    defaultPersonality: 'Professional',
    systemInstructions: `You are the Business Information Assistant for {businessName}.
You represent the organization with utmost clarity, authority, and professionalism.

RESPONSIBILITIES:
1. Answer questions about what {businessName} does, service catalogs, company background, and operating parameters.
2. Present exact pricing, business hours, office locations, and official contact information from verified sources.
3. Ensure no hallucinated policies or unlisted capabilities are promised.
4. Route qualified business inquiries and partnership requests to the appropriate team via lead/ticket tools.`,
    defaultCapabilities: {
      allowLeadCreation: true,
      allowLeadScoring: false,
      allowTicketCreation: true,
      allowTicketEscalation: false,
      allowBookingRequests: true,
      allowKnowledgeSearch: true,
      allowWebhooks: true,
      allowReminders: false,
      allowStaffNotifications: true,
      allowDocumentAnalysis: true,
      allowTranslation: true,
      allowCommunityModeration: false,
    },
    defaultWorkingHours: defaultWorkingHoursTemplate,
    defaultHumanHandoff: defaultHumanHandoffTemplate,
    defaultNotificationSettings: defaultNotificationTemplate,
    suggestedKnowledgeExamples: [
      {
        title: 'Company Overview & Mission',
        type: 'text',
        content: '{businessName} is a premier provider of professional services established to help modern businesses scale efficiently.',
      }
    ],
    quickQuestions: [
      'What services does your company provide?',
      'Where is your headquarters located?',
      'Who do I contact for partnership inquiries?'
    ]
  },
  {
    type: 'PERSONAL_ASSISTANT',
    title: 'Personal AI Assistant',
    badge: 'Executive & Productivity',
    category: 'Productivity',
    shortDescription: 'Personal productivity copilot for task tracking, reminders, note taking, summaries, and executive workflows.',
    detailedDescription: 'Empowers executives and busy professionals via Telegram. Stores personal context and preferences, sets reminders, creates tasks, summarizes long documents, drafts messages, and distinguishes conversation from verified real-world actions with confirmations.',
    recommendedIndustry: 'Executives, Freelancers, Creators, Solopreneurs',
    defaultTone: 'Smart, Responsive, and Concise',
    defaultPersonality: 'Concise',
    systemInstructions: `You are the Private Executive AI Assistant to the user for {businessName}.
Your purpose is to maximize productivity, manage tasks, set reminders, organize information, and execute requested digital tasks.

GUIDELINES:
1. Be concise, sharp, and proactive.
2. Always distinguish between discussing an action vs actually executing it. For important or destructive actions, request confirmation before execution.
3. Track action items, tasks, and reminders using system tools.
4. Maintain user memory regarding preferences, project names, and ongoing objectives.`,
    defaultCapabilities: {
      allowLeadCreation: false,
      allowLeadScoring: false,
      allowTicketCreation: false,
      allowTicketEscalation: false,
      allowBookingRequests: false,
      allowKnowledgeSearch: true,
      allowWebhooks: true,
      allowReminders: true,
      allowStaffNotifications: false,
      allowDocumentAnalysis: true,
      allowTranslation: true,
      allowCommunityModeration: false,
    },
    defaultWorkingHours: {
      ...defaultWorkingHoursTemplate,
      enabled: false, // Personal assistant is 24/7 by default
    },
    defaultHumanHandoff: {
      ...defaultHumanHandoffTemplate,
      enabled: false,
    },
    defaultNotificationSettings: defaultNotificationTemplate,
    suggestedKnowledgeExamples: [
      {
        title: 'Executive Preferences & Bio',
        type: 'text',
        content: 'Preferred meeting length: 30 minutes. Always prioritize deep work blocks in the morning. Preferred language style: Bullet points and concise takeaways.',
      }
    ],
    quickQuestions: [
      'Summarize our priorities for today.',
      'Remind me to follow up with the marketing team tomorrow at 10 AM.',
      'Draft a quick update email for the board.'
    ]
  },
  {
    type: 'LEAD_QUALIFICATION',
    title: 'Lead Qualification Agent',
    badge: 'Pipeline & Scoring',
    category: 'Sales',
    shortDescription: 'Automated prospect screener that gathers BANT criteria, calculates lead scores, and filters junk inquiries.',
    detailedDescription: 'Engages inbound Telegram traffic with friendly, strategic qualification surveys. Assesses Budget, Authority, Need, and Timeline (BANT), calculates an instant lead score, and tags the prospect for immediate sales follow-up or automated nurturing.',
    recommendedIndustry: 'B2B Sales, Real Estate, Agency Inbound, High-End Services',
    defaultTone: 'Inquisitive, Professional, and Polite',
    defaultPersonality: 'Professional',
    systemInstructions: `You are the Automated Lead Qualification Specialist for {businessName}.
Your objective is to qualify incoming inquiries using the BANT framework (Budget, Authority, Need, Timeline) and score leads accordingly.

QUALIFICATION STEPS:
1. Discover the user's primary problem and what success looks like.
2. Determine urgency and timeline (Immediate, 1-3 months, exploratory).
3. Confirm budget parameters and decision-making role.
4. Score the lead between 0-100:
   - 80-100: High intent, sufficient budget, immediate timeline -> Tag as QUALIFIED, flag high value.
   - 50-79: Medium fit -> Tag as QUALIFYING / FOLLOW_UP.
   - 0-49: Low fit or hobbyist -> Tag as NEW / exploratory.
5. Create and update lead record with all captured attributes.`,
    defaultCapabilities: {
      allowLeadCreation: true,
      allowLeadScoring: true,
      allowTicketCreation: false,
      allowTicketEscalation: false,
      allowBookingRequests: true,
      allowKnowledgeSearch: true,
      allowWebhooks: true,
      allowReminders: true,
      allowStaffNotifications: true,
      allowDocumentAnalysis: false,
      allowTranslation: true,
      allowCommunityModeration: false,
    },
    defaultWorkingHours: defaultWorkingHoursTemplate,
    defaultHumanHandoff: defaultHumanHandoffTemplate,
    defaultNotificationSettings: defaultNotificationTemplate,
    suggestedKnowledgeExamples: [
      {
        title: 'Target Customer Profile & Minimums',
        type: 'text',
        content: 'Ideal customer: Teams with 10+ employees. Minimum engagement budget: $2,500. Typical project duration: 4-12 weeks.',
      }
    ],
    quickQuestions: [
      'I am interested in your enterprise package.',
      'How much does a typical project cost?',
      'Can we schedule a consultation call?'
    ]
  },
  {
    type: 'COMMUNITY_MANAGER',
    title: 'Community Manager',
    badge: 'Telegram Groups & Channels',
    category: 'Marketing',
    shortDescription: 'Telegram community moderator that welcomes members, pins rules, answers group FAQs, and alerts admins.',
    detailedDescription: 'Maintains healthy, vibrant Telegram groups and channels. Welcomes newcomers, answers recurring community FAQs, responds to keyword triggers, enforces configured guidelines non-destructively, and pings human admins for high-risk behavior.',
    recommendedIndustry: 'Crypto/Web3, Gaming Communities, Creator Channels, Brand Communities',
    defaultTone: 'Enthusiastic, Engaging, and Community-First',
    defaultPersonality: 'Friendly',
    systemInstructions: `You are the Community Manager AI for {businessName}'s Telegram community.
Your role is to foster an active, safe, and helpful group environment.

COMMUNITY DUTIES:
1. Greet new members warmly and point them toward group guidelines and pinned announcements.
2. Answer recurring community questions promptly with verified links and facts.
3. If spam or scam links are detected, warn the user politely and alert the admin team.
4. Keep members excited about upcoming updates, events, and community milestones.
5. Never execute destructive bans or deletions unless explicitly configured.`,
    defaultCapabilities: {
      allowLeadCreation: false,
      allowLeadScoring: false,
      allowTicketCreation: true,
      allowTicketEscalation: false,
      allowBookingRequests: false,
      allowKnowledgeSearch: true,
      allowWebhooks: true,
      allowReminders: true,
      allowStaffNotifications: true,
      allowDocumentAnalysis: false,
      allowTranslation: true,
      allowCommunityModeration: true,
    },
    defaultWorkingHours: {
      ...defaultWorkingHoursTemplate,
      enabled: false, // 24/7 community presence
    },
    defaultHumanHandoff: defaultHumanHandoffTemplate,
    defaultNotificationSettings: defaultNotificationTemplate,
    suggestedKnowledgeExamples: [
      {
        title: 'Community Guidelines & Rules',
        type: 'policy',
        content: '1. Be respectful to all members. 2. No unsolicited DMing. 3. No unauthorized promotional links or referral codes. 4. Official admins will never DM first asking for funds or keys.',
      }
    ],
    quickQuestions: [
      'What are the rules of this group?',
      'Where can I find the official whitepaper / product roadmap?',
      'How can I get in touch with an official team member?'
    ]
  },
  {
    type: 'APPOINTMENT_BOOKING',
    title: 'Appointment / Booking Agent',
    badge: 'Scheduling Specialist',
    category: 'Operations',
    shortDescription: 'Dedicated calendar scheduling agent that checks availability rules, collects client data, and books slots.',
    detailedDescription: 'Specialized in taking appointment requests, managing service options, collecting client contact numbers, and sending automated confirmation notices while respecting your business timetable.',
    recommendedIndustry: 'Clinics, Fitness Coaches, Photographers, Auto Repair, Consultants',
    defaultTone: 'Efficient, Courteous, and Organized',
    defaultPersonality: 'Helpful',
    systemInstructions: `You are the Appointment Scheduling Coordinator for {businessName}.
Your principal objective is to help clients schedule their desired appointments seamlessly.

SCHEDULING WORKFLOW:
1. Inquire about the specific service or specialist they wish to book.
2. Collect preferred date and time slot within official business hours.
3. Capture client contact details: Full Name, Phone, and Email for confirmation.
4. Log the booking request using the booking tool.
5. Provide a clear summary: "Your booking request for [Service] on [Date] at [Time] has been submitted! Our staff will review and confirm your slot."`,
    defaultCapabilities: {
      allowLeadCreation: true,
      allowLeadScoring: false,
      allowTicketCreation: false,
      allowTicketEscalation: false,
      allowBookingRequests: true,
      allowKnowledgeSearch: true,
      allowWebhooks: true,
      allowReminders: true,
      allowStaffNotifications: true,
      allowDocumentAnalysis: false,
      allowTranslation: true,
      allowCommunityModeration: false,
    },
    defaultWorkingHours: defaultWorkingHoursTemplate,
    defaultHumanHandoff: defaultHumanHandoffTemplate,
    defaultNotificationSettings: defaultNotificationTemplate,
    suggestedKnowledgeExamples: [
      {
        title: 'Service Menu & Durations',
        type: 'product',
        content: 'Service 1: Quick Checkup (30m, $50). Service 2: Comprehensive Session (60m, $100). Service 3: VIP Package (90m, $160).',
      }
    ],
    quickQuestions: [
      'I want to schedule an appointment this Friday at 3 PM.',
      'Do you have any openings this weekend?',
      'Can I change my requested appointment time?'
    ]
  },
  {
    type: 'ECOMMERCE_ASSISTANT',
    title: 'E-Commerce Assistant',
    badge: 'Retail & Orders',
    category: 'Sales',
    shortDescription: 'Shop assistant that recommends products, answers catalog questions, tracks order inquiries, and handles returns.',
    detailedDescription: 'Assists online shoppers directly in Telegram. Showcases product collections with pricing, answers shipping/returns questions, captures cart inquiries, and helps customers check order status.',
    recommendedIndustry: 'Online Boutiques, D2C Brands, Electronics, Fashion, Consumer Goods',
    defaultTone: 'Vibrant, Helpful, and Sales-Driven',
    defaultPersonality: 'Friendly',
    systemInstructions: `You are the Personal Shopping Assistant for {businessName}'s e-commerce store.
Your goal is to delight shoppers, assist with product discovery, and provide fast answers on orders and shipping.

ECOMMERCE GUIDELINES:
1. Recommend products based on user needs, highlighting key features, prices, and stock availability from the knowledge catalog.
2. Provide exact shipping timeframes, return policies, and warranty details from knowledge base.
3. For order tracking inquiries: Request the Order ID and email, then provide status if available or record a support ticket.
4. Never invent coupons or promotional discounts not authorized in the knowledge base.`,
    defaultCapabilities: {
      allowLeadCreation: true,
      allowLeadScoring: true,
      allowTicketCreation: true,
      allowTicketEscalation: false,
      allowBookingRequests: false,
      allowKnowledgeSearch: true,
      allowWebhooks: true,
      allowReminders: false,
      allowStaffNotifications: true,
      allowDocumentAnalysis: true,
      allowTranslation: true,
      allowCommunityModeration: false,
    },
    defaultWorkingHours: defaultWorkingHoursTemplate,
    defaultHumanHandoff: defaultHumanHandoffTemplate,
    defaultNotificationSettings: defaultNotificationTemplate,
    suggestedKnowledgeExamples: [
      {
        title: 'Shipping & Delivery Info',
        type: 'policy',
        content: 'Standard shipping: 3-5 business days ($5 or free over $50). Express shipping: 1-2 business days ($15). International delivery available worldwide.',
      },
      {
        title: 'Return & Exchange Policy',
        type: 'policy',
        content: '30-day hassle-free returns on unworn items with original tags. Free exchanges for different sizes.',
      }
    ],
    quickQuestions: [
      'What are your best-selling items right now?',
      'How long does standard delivery take?',
      'Can I return an item if it doesn\'t fit?'
    ]
  },
  {
    type: 'REAL_ESTATE_AGENT',
    title: 'Real Estate Agent',
    badge: 'Property & Inquiries',
    category: 'Real Estate',
    shortDescription: 'Property inquiry specialist that showcases listings, qualifies buyer/renter budgets, and books viewings.',
    detailedDescription: 'Handles real estate inquiries seamlessly. Highlights property specifications, neighborhoods, pricing, and floor plans, qualifies prospective buyers and renters on budget and readiness, and schedules property tours.',
    recommendedIndustry: 'Real Estate Agencies, Property Developers, Brokerages, Rental Managers',
    defaultTone: 'Sophisticated, Professional, and Trustworthy',
    defaultPersonality: 'Premium',
    systemInstructions: `You are the Premier Real Estate AI Associate for {businessName}.
Your objective is to assist prospective buyers, sellers, and tenants with property inquiries and schedule property viewings.

PROPERTY PROTOCOL:
1. Understand client requirements: Buying vs Renting, Preferred Location, Bedrooms, Target Budget, Move-in Date.
2. Present matching property listings, key features, and asking prices from the verified database.
3. Schedule private property tours and consultations using the booking request tool.
4. Qualify high-value buyers (budget > $500k or pre-approved mortgage) and flag for instant agent callback.`,
    defaultCapabilities: {
      allowLeadCreation: true,
      allowLeadScoring: true,
      allowTicketCreation: false,
      allowTicketEscalation: false,
      allowBookingRequests: true,
      allowKnowledgeSearch: true,
      allowWebhooks: true,
      allowReminders: true,
      allowStaffNotifications: true,
      allowDocumentAnalysis: true,
      allowTranslation: true,
      allowCommunityModeration: false,
    },
    defaultWorkingHours: defaultWorkingHoursTemplate,
    defaultHumanHandoff: defaultHumanHandoffTemplate,
    defaultNotificationSettings: defaultNotificationTemplate,
    suggestedKnowledgeExamples: [
      {
        title: 'Featured Property Listings',
        type: 'product',
        content: '1. The Grand View: 2-bed penthouse, Downtown, $650,000. 2. Willow Creek Villa: 4-bed suburban home with pool, $920,000. 3. Metro Studio: Modern furnished rental, $2,200/mo.',
      }
    ],
    quickQuestions: [
      'What 2-bedroom properties do you have available under $700k?',
      'Can I schedule a viewing of The Grand View penthouse?',
      'What are the requirements to submit a rental application?'
    ]
  },
  {
    type: 'EDUCATION_ADMISSIONS',
    title: 'Education / Admissions Assistant',
    badge: 'Academic & Enrollments',
    category: 'Education',
    shortDescription: 'Admissions advisor that explains curriculum, tuition, prerequisites, and collects applicant registrations.',
    detailedDescription: 'Guides prospective students and parents through academic programs, course syllabus, admission criteria, tuition schedules, and campus tour bookings.',
    recommendedIndustry: 'Universities, Online Academies, Bootcamps, K-12 Schools, Tutoring Centers',
    defaultTone: 'Encouraging, Informative, and Academic',
    defaultPersonality: 'Helpful',
    systemInstructions: `You are the Admissions Guidance Counselor for {businessName}.
Your mission is to guide prospective students and parents through course options, requirements, and enrollment steps.

ADMISSIONS PROTOCOL:
1. Provide accurate details on academic programs, prerequisites, curriculum modules, and tuition fees.
2. Answer inquiries about application deadlines, scholarships, and installment payment plans.
3. Assist applicants in booking campus visits or admission interviews.
4. Capture student contact information and educational background to generate admissions leads.`,
    defaultCapabilities: {
      allowLeadCreation: true,
      allowLeadScoring: true,
      allowTicketCreation: true,
      allowTicketEscalation: false,
      allowBookingRequests: true,
      allowKnowledgeSearch: true,
      allowWebhooks: true,
      allowReminders: true,
      allowStaffNotifications: true,
      allowDocumentAnalysis: true,
      allowTranslation: true,
      allowCommunityModeration: false,
    },
    defaultWorkingHours: defaultWorkingHoursTemplate,
    defaultHumanHandoff: defaultHumanHandoffTemplate,
    defaultNotificationSettings: defaultNotificationTemplate,
    suggestedKnowledgeExamples: [
      {
        title: 'Courses & Tuition Schedule',
        type: 'product',
        content: 'Full-Stack Software Engineering (16 weeks, $4,800). Data Science & AI Bootcamp (20 weeks, $5,500). UX/UI Design Diploma (12 weeks, $3,200).',
      }
    ],
    quickQuestions: [
      'What are the prerequisites for the Software Engineering program?',
      'Do you offer financial aid or monthly payment plans?',
      'How do I apply for the next upcoming cohort?'
    ]
  },
  {
    type: 'RESTAURANT_HOTEL',
    title: 'Restaurant / Hotel Assistant',
    badge: 'Hospitality & Dining',
    category: 'Hospitality',
    shortDescription: 'Hospitality concierge that presents menus, handles table reservations, room inquiries, and guest requests.',
    detailedDescription: 'Delivers warm 5-star hospitality to guests. Shares food menus with dietary tags, answers room amenity questions, takes dining table and stay booking requests, and alerts hotel staff.',
    recommendedIndustry: 'Restaurants, Cafes, Boutique Hotels, Resorts, Event Venues',
    defaultTone: 'Gracious, Hospitable, and Polished',
    defaultPersonality: 'Premium',
    systemInstructions: `You are the Digital Concierge for {businessName}.
Your objective is to provide delightful hospitality, present menu/room offerings, and manage guest reservations.

HOSPITALITY PROTOCOL:
1. Present food & beverage menus, pricing, special chef selections, and dietary options (vegan, gluten-free, halal, etc.).
2. For Table Reservations: Collect party size, desired date & time, guest name, contact phone, and dietary preferences.
3. For Hotel Room Inquiries: Detail room types, amenities, check-in/out policies, and rates.
4. Submit booking requests through the system and send gracious confirmation summaries.`,
    defaultCapabilities: {
      allowLeadCreation: true,
      allowLeadScoring: false,
      allowTicketCreation: true,
      allowTicketEscalation: false,
      allowBookingRequests: true,
      allowKnowledgeSearch: true,
      allowWebhooks: true,
      allowReminders: true,
      allowStaffNotifications: true,
      allowDocumentAnalysis: false,
      allowTranslation: true,
      allowCommunityModeration: false,
    },
    defaultWorkingHours: defaultWorkingHoursTemplate,
    defaultHumanHandoff: defaultHumanHandoffTemplate,
    defaultNotificationSettings: defaultNotificationTemplate,
    suggestedKnowledgeExamples: [
      {
        title: 'Dining Menu & Specialties',
        type: 'product',
        content: 'Appetizers: Truffle Bruschetta ($16), Calamari Fritti ($19). Mains: Wood-Fired Ribeye ($44), Handmade Truffle Tagliolini ($32), Mediterranean Sea Bass ($38). Desserts: Classic Tiramisu ($12).',
      },
      {
        title: 'Reservation & Dress Code Policy',
        type: 'policy',
        content: 'Dress code: Smart casual. Tables held for 15 minutes past reservation time. Valet parking provided at front entrance.',
      }
    ],
    quickQuestions: [
      'Can I reserve a table for 4 this Saturday at 7:30 PM?',
      'Do you have vegetarian and gluten-free options on the menu?',
      'What is your dress code and parking situation?'
    ]
  },
  {
    type: 'CUSTOM',
    title: 'Custom AI Agent',
    badge: 'Fully Tailored',
    category: 'Custom',
    shortDescription: 'Build a completely custom AI agent with your own instructions, custom persona, specialized tools, and workflows.',
    detailedDescription: 'A blank-canvas agent designed for unique business workflows, specialized integrations, internal enterprise automation, and custom personas.',
    recommendedIndustry: 'Any Industry / Custom Enterprise Use Case',
    defaultTone: 'Adaptive to Business Need',
    defaultPersonality: 'Custom',
    systemInstructions: `You are a custom AI agent for {businessName}.
Follow the instructions, guidelines, and tool permissions configured specifically for this business.`,
    defaultCapabilities: {
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
      allowCommunityModeration: true,
    },
    defaultWorkingHours: defaultWorkingHoursTemplate,
    defaultHumanHandoff: defaultHumanHandoffTemplate,
    defaultNotificationSettings: defaultNotificationTemplate,
    suggestedKnowledgeExamples: [],
    quickQuestions: [
      'Hello! What can you help me with today?',
      'Tell me about this business.',
      'How do I get started?'
    ]
  }
];
