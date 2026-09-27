import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PUBLIC_URL = 'https://urge-intended-life-suggest.trycloudflare.com';
const API_BASE = `${PUBLIC_URL}/api`;

function maskSecret(val?: string): string {
  if (!val || val.length <= 8) return '****';
  return `${val.substring(0, 4)}...${val.substring(val.length - 4)}`;
}

let passedCount = 0;
let failedCount = 0;
const failures: string[] = [];

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ [PASS] ${msg}`);
    passedCount++;
  } else {
    console.error(`❌ [FAIL] ${msg}`);
    failedCount++;
    failures.push(msg);
  }
}

async function runPublicVerification() {
  console.log('\n================================================================');
  console.log('🌐 TELEAGENT PUBLIC HTTPS LIVE PRODUCTION AUDIT');
  console.log(`🔗 Endpoint: ${PUBLIC_URL}`);
  console.log('================================================================\n');

  // 1. Health Endpoint
  console.log('--- TEST 1: Public Health Check ---');
  const healthRes = await fetch(`${API_BASE}/health`);
  assert(healthRes.status === 200, 'GET /api/health returned HTTP 200');
  const healthData: any = await healthRes.json();
  assert(healthData.status === 'healthy', `Health status is healthy (Actual: ${healthData.status})`);
  assert(typeof healthData.uptime === 'number', 'Uptime reported correctly');

  // 2. Readiness Endpoint
  console.log('\n--- TEST 2: Public Database Readiness Check ---');
  const readyRes = await fetch(`${API_BASE}/ready`);
  assert(readyRes.status === 200, 'GET /api/ready returned HTTP 200');
  const readyData: any = await readyRes.json();
  assert(readyData.status === 'ready', `Readiness status is ready (Actual: ${readyData.status})`);
  assert(readyData.database === 'connected', `Database is connected to Neon PostgreSQL (Actual: ${readyData.database})`);
  assert(typeof readyData.tenantsCount === 'number', `Tenants count in PostgreSQL: ${readyData.tenantsCount}`);

  // 3. Frontend Root SPA
  console.log('\n--- TEST 3: Public Frontend SPA Delivery ---');
  const frontendRes = await fetch(PUBLIC_URL);
  assert(frontendRes.status === 200, 'GET / returned HTTP 200 OK');
  const html = await frontendRes.text();
  assert(html.includes('<div id="root">') || html.includes('<!DOCTYPE html>'), 'Frontend HTML entrypoint delivered successfully');
  assert(frontendRes.headers.get('x-frame-options') === 'DENY', 'Security header X-Frame-Options: DENY present');
  assert(frontendRes.headers.get('x-content-type-options') === 'nosniff', 'Security header X-Content-Type-Options: nosniff present');

  // 4. Client Registration & Workspace Creation
  console.log('\n--- TEST 4: Client Authentication & Workspace Isolation ---');
  const timestamp = Date.now();
  const clientEmail = `live_client_${timestamp}@enterprise-tech.io`;
  const signupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: clientEmail,
      password: 'SecureLiveClient2026!#',
      name: 'Dr. Sarah Connor',
      businessName: 'Cyberdyne Systems AI',
      industry: 'Defense & Robotics'
    })
  });

  assert(signupRes.status === 201, 'POST /api/auth/signup returned HTTP 201');
  const signupData: any = await signupRes.json();
  const token = signupData.token;
  const tenantId = signupData.activeWorkspaceId;
  assert(typeof token === 'string' && token.length === 64, 'Generated persistent 64-char crypto session token');
  assert(typeof tenantId === 'string' && tenantId.length > 0, `Assigned isolated workspace ID: ${tenantId}`);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-session-token': token,
    'x-workspace-id': tenantId
  };

  // 5. Telegram Bot & Gemini AI Integration Validation
  console.log('\n--- TEST 5: Real Telegram & Gemini Integrations ---');
  const tgToken = process.env.TELEGRAM_BOT_TOKEN || '7873130177:AAH0p9t_V3y-Mslw3kY0Tj_Z9V7R9yK0Z6A';
  const tgValRes = await fetch(`${API_BASE}/integrations/telegram/validate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ token: tgToken })
  });
  const tgValData: any = await tgValRes.json();
  assert(tgValRes.status === 200 && tgValData.success === true, `Telegram token validated live with Bot API (@${tgValData.botUsername})`);

  const geminiKey = process.env.GEMINI_API_KEY || '';
  const gemValRes = await fetch(`${API_BASE}/integrations/gemini/validate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ apiKey: geminiKey })
  });
  const gemValData: any = await gemValRes.json();
  assert(gemValRes.status === 200 && gemValData.success === true, `Gemini API key validated live with Google AI (model: ${gemValData.model})`);

  // 6. Complete Onboarding & Agent Activation
  console.log('\n--- TEST 6: Atomic Onboarding & Agent Activation ---');
  const onboardRes = await fetch(`${API_BASE}/onboarding/complete`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      tenantId,
      business: {
        name: 'Cyberdyne Systems AI',
        businessName: 'Cyberdyne Systems AI',
        industry: 'Defense & Robotics',
        businessDescription: 'Advanced robotics, cybernetic automation, and AI concierge solutions.',
        timezone: 'Asia/Kolkata',
      },
      telegram: {
        token: tgToken,
        botUsername: tgValData.botUsername || 'bot65412bot',
        botName: tgValData.botName || 'Cyberdyne AI'
      },
      gemini: {
        apiKey: geminiKey
      },
      agent: {
        name: 'Cyberdyne Defense Concierge',
        type: 'AI_RECEPTIONIST',
        tone: 'Precise, Professional, and Authoritative',
        systemInstructions: 'You are Cyberdyne Defense Concierge. You assist manufacturing leaders with autonomous systems.'
      },
      knowledge: {
        faqs: [
          { question: 'What systems do you produce?', answer: 'We manufacture industrial cybernetic robotic systems and automated inspection drones.' },
          { question: 'What are your operational hours?', answer: 'Our engineering labs operate Monday through Friday from 09:00 to 18:00 IST.' }
        ],
        pricingDetails: 'Initial strategic consultation is ₹10,000. Full factory automation deployment starts at ₹5,00,000.'
      }
    })
  });

  assert(onboardRes.status === 201, 'POST /api/onboarding/complete returned HTTP 201');
  const onboardData: any = await onboardRes.json();
  const agent = onboardData.agent;
  assert(agent.status === 'ACTIVE', 'Activated agent status is ACTIVE');
  assert(agent.telegramBot.isConnected === true, 'Telegram bot connected status is true');
  assert(agent.telegramBot.usePolling === true, 'Telegram bot polling is enabled');

  // 7. Real Telegram Customer Conversation Flow
  console.log('\n--- TEST 7: Customer Conversation & AI Orchestration ---');
  const chat1Res = await fetch(`${API_BASE}/playground/chat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      tenantId,
      agentId: agent.id,
      message: 'Hello, what systems do you build and what are your consultation rates?',
      userId: 'tg_user_live_8849',
      username: 'major_kusanagi'
    })
  });

  assert(chat1Res.status === 200, 'Inbound customer message processed with HTTP 200');
  const chat1Data: any = await chat1Res.json();
  assert(chat1Data.reply && chat1Data.reply.length > 0, 'AI response generated by Gemini engine');
  assert(chat1Data.reply.toLowerCase().includes('robot') || chat1Data.reply.toLowerCase().includes('consultation') || chat1Data.reply.includes('10,000') || chat1Data.reply.includes('cybernetic'), 'AI reply is grounded in ingested knowledge base');

  // Booking & CRM Lead Creation
  const chat2Res = await fetch(`${API_BASE}/playground/chat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      tenantId,
      agentId: agent.id,
      message: 'I would like to book a factory automation consultation for tomorrow. My name is Motoko Kusanagi, phone is +91-9876500000',
      userId: 'tg_user_live_8849',
      username: 'major_kusanagi'
    })
  });

  assert(chat2Res.status === 200, 'Customer booking inquiry processed with HTTP 200');
  
  // Verify Lead and Booking in PostgreSQL
  const leadsRes = await fetch(`${API_BASE}/leads?tenantId=${tenantId}`, { headers: authHeaders });
  const leadsData: any = await leadsRes.json();
  assert(leadsData.leads.length >= 1, `CRM Lead record created in PostgreSQL (${leadsData.leads.length} lead)`);

  const bookingsRes = await fetch(`${API_BASE}/bookings?tenantId=${tenantId}`, { headers: authHeaders });
  const bookingsData: any = await bookingsRes.json();
  assert(bookingsData.bookings.length >= 1, `Booking Request record created in PostgreSQL (${bookingsData.bookings.length} booking)`);

  // 8. Human Handoff Lifecycle
  console.log('\n--- TEST 8: Human Handoff & Operator Takeover Lifecycle ---');
  const handoffTriggerRes = await fetch(`${API_BASE}/playground/chat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      tenantId,
      agentId: agent.id,
      message: 'I need to speak to a human operator immediately.',
      userId: 'tg_user_live_8849',
      username: 'major_kusanagi'
    })
  });

  const convsRes = await fetch(`${API_BASE}/conversations?tenantId=${tenantId}`, { headers: authHeaders });
  const convsData: any = await convsRes.json();
  const liveConv = convsData.conversations[0];
  assert(liveConv.handoffActive === true, 'Conversation thread marked handoffActive = true');

  // Customer message during handoff -> AI silenced
  const silentCheckRes = await fetch(`${API_BASE}/playground/chat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      tenantId,
      agentId: agent.id,
      message: 'Are you there human representative?',
      userId: 'tg_user_live_8849',
      username: 'major_kusanagi'
    })
  });
  const silentData: any = await silentCheckRes.json();
  assert(silentData.reply === '', 'Automated AI replies paused while human handoff is active');

  // Operator manual reply from Live Inbox
  const operatorReplyRes = await fetch(`${API_BASE}/conversations/${liveConv.id}/reply`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      message: 'Hello Major Kusanagi, this is Chief Engineer John Connor. I have taken over this channel.',
      operatorName: 'Chief Engineer John Connor'
    })
  });
  assert(operatorReplyRes.status === 200, 'Human operator manual reply dispatched successfully');

  // Operator clicks Resume Bot
  const resumeBotRes = await fetch(`${API_BASE}/conversations/${liveConv.id}/toggle-handoff`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ handoffActive: false })
  });
  assert(resumeBotRes.status === 200, 'Operator clicked Resume Bot successfully');

  // AI responses resume
  const postResumeRes = await fetch(`${API_BASE}/playground/chat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      tenantId,
      agentId: agent.id,
      message: 'What are your operating hours?',
      userId: 'tg_user_live_8849',
      username: 'major_kusanagi'
    })
  });
  const postResumeData: any = await postResumeRes.json();
  assert(postResumeData.reply && postResumeData.reply.length > 0, 'AI automated responses resumed successfully');

  // 9. Multi-Tenant Security & Secret Masking
  console.log('\n--- TEST 9: Multi-Tenant Security & Secret Redaction ---');
  const competitorEmail = `competitor_${timestamp}@foreign-corp.com`;
  const compSignupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: competitorEmail,
      password: 'CompetitorPassword2026!',
      name: 'Foreign Agent',
      businessName: 'Foreign Corp',
      industry: 'Robotics'
    })
  });
  const compSignupData: any = await compSignupRes.json();
  const compHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${compSignupData.token}`,
    'x-workspace-id': compSignupData.activeWorkspaceId
  };

  const crossTenantRes = await fetch(`${API_BASE}/conversations?tenantId=${tenantId}`, { headers: compHeaders });
  assert(crossTenantRes.status === 403, 'Cross-tenant data access blocked with HTTP 403 Forbidden');

  const integrationsRes = await fetch(`${API_BASE}/integrations/status?tenantId=${tenantId}`, { headers: authHeaders });
  const integrationsData: any = await integrationsRes.json();
  assert(integrationsData.telegram.token === undefined, 'Raw Telegram token stripped in frontend API response');
  assert(integrationsData.gemini.apiKey === undefined, 'Raw Gemini API key stripped in frontend API response');
  assert(integrationsData.telegram.maskedToken !== undefined, 'Telegram token is safely masked');

  console.log('\n================================================================');
  console.log(`🏁 PUBLIC HTTPS LIVE AUDIT: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    console.error('Failures:', failures);
    process.exit(1);
  } else {
    console.log('🎉 TELEAGENT IS 100% LIVE, PUBLICLY ACCESSIBLE, AND PRODUCTION VERIFIED!\n');
    process.exit(0);
  }
}

runPublicVerification().catch(err => {
  console.error('Public verification error:', err);
  process.exit(1);
});
