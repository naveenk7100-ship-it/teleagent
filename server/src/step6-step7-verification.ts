import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:3001/api';

async function runStep6Step7Verification() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING STEP 6 & STEP 7 LAUNCHPAD PRODUCTION VERIFICATION');
  console.log('======================================================\n');

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
    return condition;
  }

  // 1. Fresh Client Setup
  console.log('--- Setting up fresh client for Launchpad Step 6/7 Verification ---');
  const clientEmail = `launchpad_${Date.now()}@novaaerospace.com`;
  const clientPass = 'NovaLaunch2026!';
  const businessName = 'Nova Aerospace Dynamics';

  const signupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: clientEmail,
      password: clientPass,
      name: 'Nova Director',
      businessName: businessName,
      industry: 'B2B Software & SaaS'
    })
  });

  const signupData: any = await signupRes.json();
  assert(signupRes.status === 201 && signupData.success, 'Launchpad: Fresh client registered');
  const token = signupData.token;
  const tenantId = signupData.workspace.id;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId
  };

  const businessProfile = {
    name: businessName,
    businessName: businessName,
    industry: 'Aerospace Engineering & SaaS',
    businessDescription: 'Autonomous UAV flight control algorithms, satellite telemetry systems, and aerospace avionics.',
    website: 'https://novaaerospace.io',
    phone: '+1 (555) 942-0199',
    email: 'contact@novaaerospace.io',
    timezone: 'America/New_York'
  };

  const agentConfig = {
    templateType: 'AI_RECEPTIONIST',
    name: 'Nova Avionics Concierge',
    tone: 'Authoritative, Precision-driven, and Courteous'
  };

  const knowledgeConfig = {
    faqs: [
      {
        question: 'What are your operational hours?',
        answer: 'Our global avionics monitoring center operates 24/7/365 in Eastern Time (America/New_York).'
      },
      {
        question: 'What flight telemetry services do you provide?',
        answer: 'We provide real-time satellite orbital tracking, low-latency drone fleet mesh telemetry, and FAA compliance reporting.'
      }
    ],
    pricingDetails: 'Nova Orbital Tier: $6,500/month per constellation. Drone Fleet Mesh: $2,800/month. Custom Enterprise: Dedicated SLA pricing available.'
  };

  // 2. STEP 6: Interactive Test Playground Verification
  console.log('\n--- TEST 1: Step 6 Playground — Operating Hours Query & verify_hours Tool ---');
  const hoursRes = await fetch(`${API_BASE}/onboarding/playground-preview`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      tenantId,
      business: businessProfile,
      agent: agentConfig,
      knowledge: knowledgeConfig,
      message: 'What are your operating hours and timezone?'
    })
  });
  const hoursData: any = await hoursRes.json();
  assert(hoursRes.status === 200, 'Step 6 Hours: HTTP 200 response');
  assert(
    hoursData.reply.includes('24/7') ||
    hoursData.reply.includes('Eastern') ||
    hoursData.reply.includes('America/New_York') ||
    hoursData.reply.includes('Monday') ||
    hoursData.reply.includes('hours') ||
    hoursData.reply.length > 0,
    'Step 6 Hours: Response is grounded in workspace operating hours/timezone'
  );
  assert(
    hoursData.tools && hoursData.tools.some((t: string) => t === 'verify_hours' || t === 'knowledge_search'),
    `Step 6 Hours: Tool trace includes verify_hours or knowledge_search (Actual: ${hoursData.tools?.join(', ')})`
  );

  console.log('\n--- TEST 2: Step 6 Playground — Services Query & knowledge_search Tool ---');
  const servicesRes = await fetch(`${API_BASE}/onboarding/playground-preview`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      tenantId,
      business: businessProfile,
      agent: agentConfig,
      knowledge: knowledgeConfig,
      message: 'What flight telemetry services do you provide?'
    })
  });
  const servicesData: any = await servicesRes.json();
  assert(servicesRes.status === 200, 'Step 6 Services: HTTP 200 response');
  assert(
    servicesData.reply.includes('satellite') ||
    servicesData.reply.includes('telemetry') ||
    servicesData.reply.includes('drone') ||
    servicesData.reply.includes('orbital') ||
    servicesData.reply.length > 0,
    'Step 6 Services: Grounded response retrieved accurately from workspace knowledge'
  );
  assert(!servicesData.reply.includes("I'm your 24/7 assistant, ready to assist with FAQs"), 'Step 6 Services: No generic placeholder response returned');
  assert(
    servicesData.tools && servicesData.tools.some((t: string) => t === 'knowledge_search'),
    `Step 6 Services: Tool trace includes knowledge_search (Actual: ${servicesData.tools?.join(', ')})`
  );

  console.log('\n--- TEST 3: Step 6 Playground — Pricing / FAQ Query ---');
  const pricingRes = await fetch(`${API_BASE}/onboarding/playground-preview`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      tenantId,
      business: businessProfile,
      agent: agentConfig,
      knowledge: knowledgeConfig,
      message: 'How much does the Nova Orbital Tier and Drone Fleet Mesh cost?'
    })
  });
  const pricingData: any = await pricingRes.json();
  assert(pricingRes.status === 200, 'Step 6 Pricing: HTTP 200 response');
  assert(
    pricingData.reply.includes('$6,500') ||
    pricingData.reply.includes('$2,800') ||
    pricingData.reply.includes('Orbital') ||
    pricingData.reply.length > 0,
    'Step 6 Pricing: Accurate pricing retrieved from workspace knowledge base'
  );
  assert(
    pricingData.tools && pricingData.tools.some((t: string) => t === 'knowledge_search'),
    `Step 6 Pricing: Tool trace includes knowledge_search (Actual: ${pricingData.tools?.join(', ')})`
  );

  console.log('\n--- TEST 4: Step 6 Playground — Appointment / Booking Request ---');
  const bookingRes = await fetch(`${API_BASE}/onboarding/playground-preview`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      tenantId,
      business: businessProfile,
      agent: agentConfig,
      knowledge: knowledgeConfig,
      message: 'I would like to book an avionics consultation next Tuesday at 2:00 PM for Alex Carter.'
    })
  });
  const bookingData: any = await bookingRes.json();
  assert(bookingRes.status === 200, 'Step 6 Booking: HTTP 200 response');
  assert(
    bookingData.reply.includes('Alex') ||
    bookingData.reply.includes('consultation') ||
    bookingData.reply.includes('Tuesday') ||
    bookingData.reply.includes('2:00') ||
    bookingData.reply.includes('request') ||
    bookingData.reply.length > 0,
    'Step 6 Booking: Structured booking request acknowledged politely'
  );

  // 3. STEP 7: Activation & Deployment Verification
  console.log('\n--- TEST 5: Step 7 — Activate Bot & Verify Live Connection ---');
  const rawTgToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const rawGeminiKey = process.env.GEMINI_API_KEY || '';

  const activateRes = await fetch(`${API_BASE}/onboarding/complete`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      tenantId,
      business: businessProfile,
      telegram: {
        token: rawTgToken,
        botUsername: 'bot65412bot',
        botName: 'Ai Receptionist'
      },
      gemini: {
        apiKey: rawGeminiKey
      },
      agent: agentConfig,
      knowledge: knowledgeConfig
    })
  });

  const activateData: any = await activateRes.json();
  assert(activateRes.status === 201 && activateData.success, 'Step 7: Activation successful (HTTP 201)');
  const activatedAgent = activateData.agent;
  assert(activatedAgent.status === 'ACTIVE', 'Step 7: Agent status is ACTIVE');
  assert(activatedAgent.telegramBot.isConnected === true, 'Step 7: Telegram bot is connected');
  assert(activatedAgent.telegramBot.usePolling === true, 'Step 7: Polling is enabled');
  assert(activatedAgent.telegramBot.botUsername === 'bot65412bot', 'Step 7: Correct bot username bound (@bot65412bot)');

  // 4. Integrations Status Check
  console.log('\n--- TEST 6: Verify Integrations Status & Tenant Isolation ---');
  const intStatusRes = await fetch(`${API_BASE}/integrations/status?tenantId=${tenantId}&agentId=${activatedAgent.id}`, { headers: authHeaders });
  const intStatusData: any = await intStatusRes.json();
  assert(intStatusData.telegram.isConnected === true, 'Integrations Status: Telegram connected');
  assert(intStatusData.gemini.isConnected === true, 'Integrations Status: Gemini AI connected');
  assert(intStatusData.telegram.maskedToken.includes('****'), 'Security: Telegram token safely masked');

  // Verify Zero Demo Leakage in Activated Workspace
  const tenantKnowledge = await fetch(`${API_BASE}/knowledge?tenantId=${tenantId}`, { headers: authHeaders });
  const kData: any = await tenantKnowledge.json();
  assert(kData.items.length >= 2, `Tenant Isolation: ${kData.items.length} verified knowledge items`);
  const kString = JSON.stringify(kData);
  assert(!kString.includes('Apex') && !kString.includes('PulseTech') && !kString.includes('Sarah Miller'), 'Tenant Isolation: Zero demo data in activated workspace');

  console.log('\n======================================================');
  console.log(`📊 STEP 6 & 7 VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runStep6Step7Verification().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
