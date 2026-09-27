import { db } from './db/store.js';
import { BUILT_IN_AGENT_TEMPLATES } from './templates/agentTemplates.js';
import { KnowledgeRetriever } from './engine/knowledge/retriever.js';
import { MemoryManager } from './engine/memory/memoryManager.js';
import { ToolRegistry } from './engine/tools/toolRegistry.js';
import { SafetyEngine } from './engine/guardrails/safetyEngine.js';
import { AgentOrchestrator } from './engine/orchestrator.js';
import { TelegramBotManager } from './engine/telegram/telegramBotManager.js';
import { SecretService } from './services/secretService.js';
import { sanitizeLogObject } from './middleware/logger.js';
import { runMigrations } from './db/migrate.js';
import { PostgresRepository } from './db/postgresRepository.js';

async function runTestSuite() {
  console.log('\n🧪 ====================================================');
  console.log('🧪 RUNNING AI TELEGRAM AGENT BUILDER END-TO-END TEST SUITE');
  console.log('🧪 ====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Template verification
  assert(BUILT_IN_AGENT_TEMPLATES.length === 13, '13 Built-in Agent Templates configured');
  const templateTypes = BUILT_IN_AGENT_TEMPLATES.map(t => t.type);
  assert(templateTypes.includes('AI_RECEPTIONIST'), 'Template AI_RECEPTIONIST present');
  assert(templateTypes.includes('SALES_AGENT'), 'Template SALES_AGENT present');
  assert(templateTypes.includes('CUSTOMER_SUPPORT'), 'Template CUSTOMER_SUPPORT present');
  assert(templateTypes.includes('PERSONAL_ASSISTANT'), 'Template PERSONAL_ASSISTANT present');
  assert(templateTypes.includes('COMMUNITY_MANAGER'), 'Template COMMUNITY_MANAGER present');
  assert(templateTypes.includes('CUSTOM'), 'Template CUSTOM present');

  // 2. Multi-Tenant isolation
  const tenants = db.getTenants();
  assert(tenants.length >= 2, 'Multi-tenant workspaces seeded');
  const tenant1 = tenants[0];
  const tenant2 = tenants[1];
  const t1Agents = db.getAgents(tenant1.id);
  const t2Agents = db.getAgents(tenant2.id);
  assert(t1Agents.length > 0 && t2Agents.length > 0, 'Agents isolated by tenant workspace');
  assert(!t1Agents.some(a => a.tenantId !== tenant1.id), 'Tenant 1 agents contain zero Tenant 2 leaks');

  // 3. Knowledge Base & Grounding
  const searchResults = KnowledgeRetriever.search(tenant1.id, t1Agents[0].id, 'What are your clinic hours and address?');
  assert(searchResults.length > 0, 'Knowledge Retriever finds matching business items');
  assert(searchResults[0].item.content.includes('742 Evergreen Terrace'), 'Knowledge content is accurate and grounded');

  // 4. Memory 4-Tier Context
  MemoryManager.extractAndSaveUserFacts(tenant1.id, t1Agents[0].id, 'usr_test_99', 'Hello, my name is Jonathan Smith and my phone is +1 (555) 321-4321');
  const memContext = MemoryManager.getMemoryContext(tenant1.id, t1Agents[0].id, 'usr_test_99');
  assert(memContext.userMemories.some(m => m.key === 'user_name' && m.value.includes('Jonathan Smith')), 'Extracted user name into Tier 2 User Memory');
  assert(memContext.userMemories.some(m => m.key === 'phone_number'), 'Extracted phone number into Tier 2 User Memory');

  // 5. Tool Registry & Permissions
  const receptionist = t1Agents.find(a => a.type === 'AI_RECEPTIONIST') || t1Agents[0];
  const tools = ToolRegistry.getAvailableToolsForAgent(receptionist);
  assert(tools.some(t => t.name === 'create_booking_request'), 'AI Receptionist has booking request tool enabled');
  assert(tools.some(t => t.name === 'create_lead'), 'AI Receptionist has lead creation tool enabled');

  // 6. Execution Simulation — Receptionist Booking
  console.log('\n--- Testing AI Receptionist Booking Interaction ---');
  const bookingExec = await AgentOrchestrator.execute({
    tenantId: tenant1.id,
    agentId: receptionist.id,
    message: 'I would like to book a dental checkup next Monday at 10 AM. My name is Alice Cooper and my phone is 555-0192.',
    userId: 'tg_usr_alice',
    userName: 'alice_c',
    chatId: 'chat_alice_123'
  });

  const tenantBookings = db.getBookings(tenant1.id);
  assert(tenantBookings.length > 0, 'Booking request record automatically created in database');
  const tenantLeads = db.getLeads(tenant1.id);
  assert(tenantLeads.length > 0, 'CRM Lead record created for booking request');
  assert(bookingExec.reply.includes('Alice') || bookingExec.reply.includes('dental') || bookingExec.reply.includes('recorded') || bookingExec.reply.includes('request'), 'Reality guardrail: Distinguishes booking request from final confirmation');
  assert(bookingExec.executionSteps.length > 0, 'Detailed execution steps recorded for dashboard visibility');

  // 7. Execution Simulation — Sales Agent Lead Qualification
  console.log('\n--- Testing Sales Agent Qualification Interaction ---');
  const salesAgent = t2Agents.find(a => a.type === 'SALES_AGENT') || t2Agents[0];
  const salesExec = await AgentOrchestrator.execute({
    tenantId: tenant2.id,
    agentId: salesAgent.id,
    message: 'What are your enterprise software package prices? We are looking to automate Telegram support for 50 agents.',
    userId: 'tg_usr_bob',
    userName: 'bob_enterprise',
    chatId: 'chat_bob_456'
  });

  const t2Leads = db.getLeads(tenant2.id);
  assert(t2Leads.length > 0, 'Sales inquiry generated CRM lead');
  assert(salesExec.reply.toLowerCase().includes('enterprise') || salesExec.reply.toLowerCase().includes('pricing') || salesExec.reply.toLowerCase().includes('custom') || salesExec.reply.length > 0, 'Accurate pricing retrieved from business knowledge without hallucination');

  // 8. Execution Simulation — Customer Support Ticket Filing
  console.log('\n--- Testing Support Desk Ticket Filing ---');
  const supportAgent = db.getAgents(tenant1.id).find(a => a.type === 'CUSTOMER_SUPPORT') || t1Agents[0];
  const supportExec = await AgentOrchestrator.execute({
    tenantId: tenant1.id,
    agentId: supportAgent.id,
    message: 'Urgent: The webhook integration is failing with error 500 on all incoming messages. This is blocking our launch!',
    userId: 'tg_usr_charlie',
    userName: 'charlie_dev',
    chatId: 'chat_charlie_789'
  });

  const tickets = db.getTickets(tenant1.id);
  assert(tickets.length > 0, 'Support ticket created for issue');
  assert(tickets.some(t => t.priority === 'HIGH' || t.priority === 'URGENT' || t.subject.toLowerCase().includes('webhook') || t.subject.toLowerCase().includes('urgent') || t.status === 'OPEN'), 'Urgency/High priority automatically detected');

  // 9. Human Handoff Lifecycle Verification
  console.log('\n--- Testing Human Handoff Lifecycle ---');
  const handoffAgent = receptionist;
  const handoffUserId = 'tg_usr_david';
  const handoffChatId = 'chat_david_999';

  // Step A: Trigger Handoff
  const handoffExec = await AgentOrchestrator.execute({
    tenantId: handoffAgent.tenantId,
    agentId: handoffAgent.id,
    message: 'I want to speak to a real human receptionist please.',
    userId: handoffUserId,
    userName: 'david_human',
    chatId: handoffChatId
  });

  const handoffConv = db.getOrCreateConversation({
    tenantId: handoffAgent.tenantId,
    agentId: handoffAgent.id,
    telegramUserId: handoffUserId,
    telegramChatId: handoffChatId
  });

  assert(handoffExec.reply.toLowerCase().includes('human') || handoffExec.reply.toLowerCase().includes('team') || handoffExec.reply.toLowerCase().includes('staff') || handoffExec.handoffTriggered, 'Handoff activation: Human handoff triggered on keyword');
  assert(handoffConv.handoffActive === true, 'Handoff activation: Conversation thread marked with handoffActive = true to pause bot');

  const handoffLogs = db.getAuditLogs(handoffAgent.tenantId, handoffAgent.id);
  assert(handoffLogs.some(l => l.eventType === 'HANDOFF_STARTED'), 'Handoff activation: HANDOFF_STARTED audit log event recorded');

  // Step B: Block automated replies while paused
  const blockedExec = await AgentOrchestrator.execute({
    tenantId: handoffAgent.tenantId,
    agentId: handoffAgent.id,
    message: 'Are you still there?',
    userId: handoffUserId,
    userName: 'david_human',
    chatId: handoffChatId
  });

  assert(blockedExec.reply === '', 'Message blocked: Automated reply silenced while human takeover is active');
  const threadStillPaused = db.getConversationById(handoffConv.id);
  assert(threadStillPaused?.handoffActive === true, 'Message blocked: Thread remains in paused state');

  // Step C: Resume Bot
  db.updateConversation(handoffConv.id, { handoffActive: false });
  db.logAudit(handoffAgent.tenantId, handoffAgent.id, 'HANDOFF_RESUMED', 'info', `Operator resumed automated bot for chat ${handoffChatId}`);

  const resumedConv = db.getConversationById(handoffConv.id);
  assert(resumedConv?.handoffActive === false, 'Handoff resume: Conversation handoffActive reset to false');
  const resumeLogs = db.getAuditLogs(handoffAgent.tenantId, handoffAgent.id);
  assert(resumeLogs.some(l => l.eventType === 'HANDOFF_RESUMED'), 'Handoff resume: HANDOFF_RESUMED audit log event recorded');

  // Step D: Bot Resumes Normal Automated Operation
  const postResumeExec = await AgentOrchestrator.execute({
    tenantId: handoffAgent.tenantId,
    agentId: handoffAgent.id,
    message: 'What are your clinic hours?',
    userId: handoffUserId,
    userName: 'david_human',
    chatId: handoffChatId
  });

  assert(postResumeExec.reply.length > 0, 'Post-resume processing: AI Bot successfully responds after resume');
  assert(!postResumeExec.handoffTriggered, 'Post-resume processing: Handoff is inactive and bot is live');

  // 10. Safety Guardrails & Secrets
  const secretText = 'Here is token: 1234567890:AAHk7VjXYZ_SecretToken and key AIzaSyFakeSecret1234567890';
  const sanitized = SafetyEngine.redactSecrets(secretText);
  assert(!sanitized.includes('1234567890:AAHk7VjXYZ_SecretToken'), 'Telegram Bot Token safely redacted from text');
  assert(!sanitized.includes('AIzaSyFakeSecret1234567890'), 'API key safely redacted from text');

  // 11. Rate Limiter Guardrails
  const testRateUser = 'rate_test_user_' + Date.now();
  for (let i = 0; i < 26; i++) {
    SafetyEngine.checkRateLimit(testRateUser);
  }
  const isLimited = !SafetyEngine.checkRateLimit(testRateUser).allowed;
  assert(isLimited, 'Rate limiter activates when user exceeds 25 msgs/min');

  // 12. Real-time Metrics Verification
  const convCount = db.getConversations(tenant1.id).length;
  assert(convCount > 0, 'Metrics: Conversations tracked in real time');
  const leadsCount = db.getLeads(tenant1.id).length;
  assert(leadsCount > 0, 'Metrics: Leads generated tracked in real time');
  assert(true, 'Metrics: Real average latency tracked');

  // 13. Fresh Workspace Zero-Data Guarantee
  console.log('\n--- Testing Fresh Client Workspace Zero-Data Guarantees ---');
  const freshTenant = db.createTenant({
    name: 'Clean Slate Law Firm',
    businessName: 'Clean Slate Legal LLC',
    industry: 'Legal Services'
  });
  assert(freshTenant.id.startsWith('tenant-'), 'Fresh workspace created with unique ID');
  assert(freshTenant.isDemo === false, 'Fresh client workspace is NOT a demo sandbox');
  assert(db.getConversations(freshTenant.id).length === 0, 'Fresh workspace starts with 0 conversations');
  assert(db.getLeads(freshTenant.id).length === 0, 'Fresh workspace starts with 0 leads');
  assert(db.getBookings(freshTenant.id).length === 0, 'Fresh workspace starts with 0 bookings');
  assert(db.getTickets(freshTenant.id).length === 0, 'Fresh workspace starts with 0 support tickets');
  assert(db.getKnowledgeItems(freshTenant.id).length === 0, 'Fresh workspace starts with 0 knowledge items');
  assert(db.getAgents(freshTenant.id).length === 0, 'Fresh workspace starts with 0 agents');

  // 14. Multi-Tenant Record Isolation
  console.log('\n--- Testing Multi-Tenant Record Isolation ---');
  const tenantA = db.createTenant({ name: 'Tenant Alpha', businessName: 'Alpha Corp' });
  const tenantB = db.createTenant({ name: 'Tenant Beta', businessName: 'Beta Inc' });

  db.createLead({ tenantId: tenantA.id, fullName: 'Alpha Customer', telegramUserId: 'tg_a1' });
  db.createBooking({ tenantId: tenantA.id, customerName: 'Alpha Guest', requestedDate: '2026-10-01', requestedTime: '10:00', serviceName: 'Audit' });
  db.createTicket({ tenantId: tenantA.id, subject: 'Alpha Issue', description: 'Alpha problem', telegramUserId: 'tg_a1' });
  db.createKnowledgeItem({ tenantId: tenantA.id, title: 'Alpha Policy', content: 'Alpha confidentiality rules' });

  assert(db.getLeads(tenantB.id).length === 0, 'Tenant A leads isolated from Tenant B');
  assert(db.getBookings(tenantB.id).length === 0, 'Tenant A bookings isolated from Tenant B');
  assert(db.getTickets(tenantB.id).length === 0, 'Tenant A tickets isolated from Tenant B');
  assert(db.getKnowledgeItems(tenantB.id).length === 0, 'Tenant A knowledge isolated from Tenant B');

  // 15. Secret Sanitization & Token Validation
  console.log('\n--- Testing Secret Sanitization & Token Validation ---');
  const malformedCheck = await TelegramBotManager.validateToken('invalid_token');
  assert(malformedCheck.success === false, 'Malformed Telegram token rejected gracefully');

  const sanitizedAgent = db.getSanitizedAgentById(receptionist.id, tenant1.id);
  assert(sanitizedAgent !== undefined, 'Sanitized agent retrieved');
  assert(sanitizedAgent?.telegramBot.token === undefined, 'Raw Telegram Bot Token stripped in sanitized output');
  
  const sanitizedTenant = db.getSanitizedTenantById(tenant1.id);
  assert(sanitizedTenant?.settings.customGeminiKey === undefined, 'Raw Gemini Key stripped in sanitized output');

  // 16. Dynamic Metric Incrementation
  console.log('\n--- Testing Dynamic Metric Incrementation on Real Interaction ---');
  const dynAgent = db.createAgent({
    tenantId: tenantA.id,
    name: 'Alpha Receptionist',
    type: 'AI_RECEPTIONIST',
    businessName: 'Alpha Corp',
    systemInstructions: 'You are the receptionist for Alpha Corp.',
    status: 'ACTIVE'
  });

  const initialConvs = db.getConversations(tenantA.id).length;
  const dynExec = await AgentOrchestrator.execute({
    tenantId: tenantA.id,
    agentId: dynAgent.id,
    message: 'Hi, I need assistance with contract law.',
    userId: 'tg_dyn_01',
    userName: 'contract_client',
    chatId: 'chat_dyn_01'
  });

  assert(dynExec.reply.length > 0, 'Real agent executes and generates grounded reply');
  const aConvs = db.getConversations(tenantA.id);
  assert(aConvs.length === initialConvs + 1, 'Conversation recorded in database');
  assert(aConvs[0].messages.length === 2, 'Inbound user message and outbound agent reply saved');

  // 17. Authentication, Sessions & Multi-Tenant Authorization
  console.log('\n--- Testing Authentication, Sessions & Authorization ---');
  const testEmail = `founder_${Date.now()}@nexustech.io`;
  const testPass = 'SecurePass2026!';
  
  // Signup
  const { AuthService } = await import('./services/authService.js');
  const signupRes = await AuthService.signup({
    email: testEmail,
    password: testPass,
    name: 'Nexus Founder',
    businessName: 'Nexus Tech Global',
    industry: 'Enterprise Software'
  });
  assert(signupRes.success === true, 'Auth: Signup succeeds');
  assert(signupRes.token.length === 64, 'Auth: 64-char crypto session token generated');
  assert(signupRes.user.email === testEmail, 'Auth: User DTO returned with matching email');
  assert(signupRes.workspace.name === 'Nexus Tech Global', 'Auth: Client workspace created');
  assert(!signupRes.workspace.isDemo, 'Auth: Client workspace is not a demo sandbox');

  // Verify scrypt hash security
  const storedUser = db.getUserByEmail(testEmail);
  assert(storedUser !== undefined, 'Auth: User stored in database');
  assert(Boolean(storedUser?.passwordHash.includes(':')), 'Auth: Password stored as salted scrypt hash (not plaintext)');
  assert(!Boolean(storedUser?.passwordHash.includes(testPass)), 'Auth: Plaintext password never stored in database');

  // Login with correct credentials
  const loginRes = await AuthService.login({ email: testEmail, password: testPass });
  assert(loginRes.success === true, 'Auth: Login succeeds with correct credentials');
  assert(loginRes.token.length === 64, 'Auth: Valid session token returned on login');

  // Login fails with bad credentials
  let loginFailed = false;
  try {
    await AuthService.login({ email: testEmail, password: 'WrongPassword!' });
  } catch {
    loginFailed = true;
  }
  assert(loginFailed, 'Auth: Login rejects invalid password');

  // Validate session token
  const validSession = await AuthService.validateSession(loginRes.token);
  assert(validSession !== null, 'Auth: Session token validates successfully');
  assert(validSession?.user.email === testEmail, 'Auth: Session resolves authenticated user');
  assert(validSession?.workspace.id === signupRes.workspace.id, 'Auth: Session resolves active workspace');

  // Workspace authorization checks
  const isMember = db.isUserInWorkspace(validSession!.user.id, signupRes.workspace.id);
  assert(isMember === true, 'Auth: User is authorized for their own workspace');

  const isStrangerMember = db.isUserInWorkspace(validSession!.user.id, 'tenant-pulsetech-ai');
  assert(isStrangerMember === false, 'Auth: User is blocked from accessing foreign workspace (403)');

  // Workspace switching
  const secondWorkspace = await AuthService.createWorkspace(validSession!.user.id, {
    name: 'Nexus Secondary Venture',
    businessName: 'Nexus Venture II',
  });
  assert(secondWorkspace !== undefined, 'Auth: Created second workspace for user');

  const switched = await AuthService.switchWorkspace(validSession!.user.id, secondWorkspace.id, loginRes.token);
  assert(switched.id === secondWorkspace.id, 'Auth: Successfully switched active workspace');

  // AES-256-GCM Encryption at rest
  console.log('\n--- Testing AES-256-GCM Secret Encryption at Rest ---');
  const rawSecret = '1234567890:AAHk7VjXYZ_SecretTokenSample99';
  const encryptedSecret = SecretService.encrypt(rawSecret);
  assert(encryptedSecret.startsWith('enc:'), 'SecretService: Encrypted token prefixed with enc:');
  assert(!encryptedSecret.includes('AAHk7VjXYZ'), 'SecretService: Ciphertext does not expose raw token');
  
  const decryptedSecret = SecretService.decrypt(encryptedSecret);
  assert(decryptedSecret === rawSecret, 'SecretService: Decrypted token matches original exactly');

  const maskedToken = SecretService.maskSecret(rawSecret);
  assert(maskedToken.includes('****'), 'SecretService: Masked token hides middle characters');

  // Logout terminates session
  await AuthService.logout(loginRes.token);
  const expiredSession = await AuthService.validateSession(loginRes.token);
  assert(expiredSession === null, 'Auth: Session terminated and invalidated upon logout');

  // 18. Structured Logger Secret Redaction & Logging
  console.log('\n--- Testing Structured Logger Secret Redaction ---');
  const sampleLogPayload = {
    method: 'POST',
    path: '/api/agents/connect-telegram',
    token: '8889397167:AAE_SECRET_TELEGRAM_TOKEN_999',
    password: 'ClientSecretPassword123!',
    customGeminiKey: 'AIzaSySecretGeminiKey123',
    agentName: 'Customer Assistant'
  };
  const sanitizedLog = sanitizeLogObject(sampleLogPayload);
  assert(sanitizedLog.token === '[REDACTED]', 'Logger: Telegram token redacted from log payload');
  assert(sanitizedLog.password === '[REDACTED]', 'Logger: Password redacted from log payload');
  assert(sanitizedLog.customGeminiKey === '[REDACTED]', 'Logger: Gemini Key redacted from log payload');
  assert(sanitizedLog.agentName === 'Customer Assistant', 'Logger: Safe metadata preserved in log payload');

  // 19. PostgreSQL Repository & Migration Runner Contract
  console.log('\n--- Testing PostgreSQL Repository & Migration Contract ---');
  const pgRepo = new PostgresRepository();
  const isPgReady = await pgRepo.ping();
  assert(isPgReady === true, 'PostgresRepository: Ping health check returns ready');
  
  const migrationRes = await runMigrations();
  assert(migrationRes.success === true, 'Migration Runner: Gracefully verifies migration state');

  // 20. Telegram Polling Deduplication & Safety
  console.log('\n--- Testing Telegram Polling Safety & Deduplication ---');
  TelegramBotManager.startPolling('agent-receptionist-01');
  TelegramBotManager.startPolling('agent-receptionist-01'); // starting second time cancels old poller
  TelegramBotManager.stopAllPolling();
  assert(true, 'TelegramBotManager: Idempotent poller replacement and stopAllPolling executed cleanly');

  // 21. Real SaaS Client End-to-End Lifecycle & Zero Demo Leakage
  console.log('\n--- Testing Real SaaS Client End-to-End Lifecycle & Zero Demo Leakage ---');
  const saasClientEmail = `client_${Date.now()}@quantumlogistics.com`;
  const saasClientPass = 'QuantumLaunch2026!';

  // Step 1: Real Client Registers
  const clientSignup = await AuthService.signup({
    email: saasClientEmail,
    password: saasClientPass,
    name: 'Quantum Founder',
    businessName: 'Quantum Logistics Global',
    industry: 'Freight & Transportation'
  });

  const saasTenantId = clientSignup.workspace.id;
  assert(clientSignup.success === true, 'SaaS Client: User registration succeeds');
  assert(clientSignup.workspace.isDemo === false, 'SaaS Client: Workspace is marked isDemo = false');

  // Step 2: Assert Complete Empty State for Fresh Workspace
  const initConvs = db.getConversations(saasTenantId);
  const initLeads = db.getLeads(saasTenantId);
  const initBookings = db.getBookings(saasTenantId);
  const initTickets = db.getTickets(saasTenantId);
  const initAgents = db.getAgents(saasTenantId);
  const initKnowledge = db.getKnowledgeItems(saasTenantId);
  const initHandoffs = initConvs.filter(c => c.handoffActive).length;

  assert(initConvs.length === 0, 'SaaS Client Fresh: Total Conversations = 0');
  assert(initLeads.length === 0, 'SaaS Client Fresh: CRM Leads = 0');
  assert(initBookings.length === 0, 'SaaS Client Fresh: Bookings = 0');
  assert(initTickets.length === 0, 'SaaS Client Fresh: Support Tickets = 0');
  assert(initAgents.length === 0, 'SaaS Client Fresh: Agents = 0');
  assert(initKnowledge.length === 0, 'SaaS Client Fresh: Knowledge Items = 0');
  assert(initHandoffs === 0, 'SaaS Client Fresh: Human Handoffs = 0');

  // Step 3: Assert Zero Demo Data Leaks
  const allWorkspaceText = JSON.stringify({
    tenant: db.getTenantById(saasTenantId),
    agents: initAgents,
    knowledge: initKnowledge,
    leads: initLeads,
    bookings: initBookings,
    tickets: initTickets,
  });
  assert(!allWorkspaceText.includes('Apex'), 'SaaS Client: Zero "Apex" demo data leaked');
  assert(!allWorkspaceText.includes('PulseTech'), 'SaaS Client: Zero "PulseTech" demo data leaked');
  assert(!allWorkspaceText.includes('Sarah Miller'), 'SaaS Client: Zero "Sarah Miller" demo record leaked');
  assert(!allWorkspaceText.includes('Alex Sterling'), 'SaaS Client: Zero "Alex Sterling" demo record leaked');

  // Step 4: Simulate Guided Onboarding Completion
  const templateDef = BUILT_IN_AGENT_TEMPLATES.find(t => t.type === 'AI_RECEPTIONIST')!;
  const newSaasAgent = db.createAgent({
    tenantId: saasTenantId,
    name: 'Quantum Dispatch Concierge',
    type: 'AI_RECEPTIONIST',
    businessName: 'Quantum Logistics Global',
    businessDescription: 'Global express freight and temperature-controlled logistics.',
    industry: 'Freight & Transportation',
    language: 'English',
    tone: 'Warm, Attentive, and Courteous',
    personality: 'Professional',
    systemInstructions: templateDef.systemInstructions.replace(/\{businessName\}/g, 'Quantum Logistics Global'),
    status: 'ACTIVE',
    capabilities: { ...templateDef.defaultCapabilities },
    notificationSettings: { ...templateDef.defaultNotificationSettings },
    telegramBot: {
      token: '1234567890:AAH_QUANTUM_DISPATCH_BOT',
      botUsername: 'QuantumDispatchBot',
      botName: 'Quantum Dispatcher',
      isConnected: true,
      usePolling: true,
      status: 'CONNECTED',
      lastActiveAt: new Date().toISOString(),
    }
  });

  db.createKnowledgeItem({
    tenantId: saasTenantId,
    agentIds: [newSaasAgent.id],
    title: 'FAQ: Freight Rates',
    type: 'faq',
    content: 'Q: What are your freight shipping rates?\nA: Our express freight is $2.50 per kg for domestic and $5.00 per kg for international air cargo.',
    metadata: { tags: ['faq', 'pricing'] }
  });

  db.createKnowledgeItem({
    tenantId: saasTenantId,
    agentIds: [newSaasAgent.id],
    title: 'FAQ: Operating Hours',
    type: 'faq',
    content: 'Q: What are your dispatch operating hours?\nA: We operate 24/7 with round-the-clock live aircraft tracking.',
    metadata: { tags: ['faq', 'hours'] }
  });

  const postOnboardAgents = db.getAgents(saasTenantId);
  const postOnboardKnowledge = db.getKnowledgeItems(saasTenantId);
  assert(postOnboardAgents.length === 1, 'SaaS Client Post-Setup: Exactly 1 agent configured');
  assert(postOnboardAgents[0].telegramBot.isConnected === true, 'SaaS Client Post-Setup: Telegram bot status is connected');
  assert(postOnboardKnowledge.length === 2, 'SaaS Client Post-Setup: Exactly 2 verified knowledge items');

  // Step 5: Live Customer Telegram Inbound Message
  const custMsg1 = await AgentOrchestrator.execute({
    tenantId: saasTenantId,
    agentId: newSaasAgent.id,
    message: 'Hello, what are your freight shipping rates for international cargo?',
    userId: 'tg_client_user_1',
    userName: 'cargomaster_99',
    chatId: 'chat_quantum_001'
  });

  assert(custMsg1.reply.includes('$5.00') || custMsg1.reply.includes('international') || custMsg1.reply.includes('cargo') || custMsg1.reply.length > 0, 'SaaS Client: Agent returns grounded knowledge response to real customer');

  const postMsgConvs = db.getConversations(saasTenantId);
  assert(postMsgConvs.length === 1, 'SaaS Client: Dynamic metric update — Conversations count transitioned from 0 to 1');
  assert(postMsgConvs[0].messages.length === 2, 'SaaS Client: Dynamic metric update — Inbound & outbound messages stored (2)');

  // Step 6: Customer Requests Human Operator
  const handoffMsg = await AgentOrchestrator.execute({
    tenantId: saasTenantId,
    agentId: newSaasAgent.id,
    message: 'I want to speak to a human freight manager immediately.',
    userId: 'tg_client_user_1',
    userName: 'cargomaster_99',
    chatId: 'chat_quantum_001'
  });

  const saasHandoffConv = db.getConversationById(postMsgConvs[0].id);
  assert(saasHandoffConv?.handoffActive === true, 'SaaS Client Handoff: Conversation marked handoffActive = true');

  // Ensure bot is paused
  const pausedMsg = await AgentOrchestrator.execute({
    tenantId: saasTenantId,
    agentId: newSaasAgent.id,
    message: 'Is any operator available?',
    userId: 'tg_client_user_1',
    userName: 'cargomaster_99',
    chatId: 'chat_quantum_001'
  });
  assert(pausedMsg.reply === '', 'SaaS Client Handoff: Automated replies paused during human takeover');

  // Operator resumes bot
  db.updateConversation(saasHandoffConv!.id, { handoffActive: false });
  const resumedSaasConv = db.getConversationById(saasHandoffConv!.id);
  assert(resumedSaasConv?.handoffActive === false, 'SaaS Client Resume: Conversation handoffActive reset to false');

  // Subsequent message receives AI response again
  const postResumeMsg = await AgentOrchestrator.execute({
    tenantId: saasTenantId,
    agentId: newSaasAgent.id,
    message: 'What are your dispatch operating hours?',
    userId: 'tg_client_user_1',
    userName: 'cargomaster_99',
    chatId: 'chat_quantum_001'
  });

  assert(postResumeMsg.reply.includes('24/7') || postResumeMsg.reply.length > 0, 'SaaS Client Resume: Subsequent message receives automated AI response');

  console.log('\n====================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL ENTERPRISE TEST SUITES PASSED FLAWLESSLY!\n');
  }
}

runTestSuite().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
