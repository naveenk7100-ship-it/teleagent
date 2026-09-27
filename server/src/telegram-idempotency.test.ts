import { TelegramBotManager, TelegramUpdate } from './engine/telegram/telegramBotManager.js';
import { AgentOrchestrator } from './engine/orchestrator.js';
import { db } from './db/store.js';
import { Agent, Tenant } from './types/index.js';

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

async function runIdempotencyTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING TELEGRAM IDEMPOTENCY & OUTSIDE-HOURS TEST SUITE');
  console.log('======================================================\n');

  TelegramBotManager.resetClaimsForTesting();

  // Setup Test Tenant and Agent
  const timestamp = Date.now();
  const testTenant: Tenant = db.createTenant({
    name: 'Idempotency Test Clinic',
    businessName: 'Apex Dental Care',
    businessDescription: 'Comprehensive dental implants and cleaning.',
    industry: 'Healthcare',
    timezone: 'America/New_York',
  });

  const testBotToken = `999888777:TEST_TOKEN_${timestamp}`;
  const testAgent: Agent = db.createAgent({
    tenantId: testTenant.id,
    name: 'Apex Dental Concierge',
    type: 'AI_RECEPTIONIST',
    businessName: testTenant.businessName,
    businessDescription: testTenant.businessDescription,
    industry: testTenant.industry,
    language: 'English',
    tone: 'Courteous & Warm',
    personality: 'Friendly',
    systemInstructions: 'You are Apex Dental Concierge.',
    status: 'ACTIVE',
    workingHours: {
      enabled: true,
      timezone: 'UTC',
      schedule: {
        monday: { open: '09:00', close: '17:00', isClosed: true }, // force outside hours
        tuesday: { open: '09:00', close: '17:00', isClosed: true },
        wednesday: { open: '09:00', close: '17:00', isClosed: true },
        thursday: { open: '09:00', close: '17:00', isClosed: true },
        friday: { open: '09:00', close: '17:00', isClosed: true },
        saturday: { open: '09:00', close: '17:00', isClosed: true },
        sunday: { open: '00:00', close: '00:00', isClosed: true },
      },
      outOfHoursMessage: 'Our dental clinic operates Monday through Friday from 9:00 AM to 5:00 PM.',
      holidayRules: [],
    },
    humanHandoff: {
      enabled: true,
      triggerKeywords: ['human', 'agent', 'representative', 'operator', 'talk to someone'],
      confidenceThreshold: 0.7,
      notifyChannels: {},
      pauseBotOnHandoff: true,
      handoffMessage: "I've connected you with a human representative from our team. They will take over shortly.",
      resumeMessage: 'The automated assistant has been resumed. How else can I assist you?',
    },
    telegramBot: {
      token: testBotToken,
      botUsername: 'apex_dental_test_bot',
      botName: 'Apex Dental Bot',
      isConnected: true,
      usePolling: true,
      status: 'CONNECTED',
    },
  });

  // Track outbound sendMessage calls by mocking fetch or tracking handler executions
  let outboundMessageCount = 0;
  const sentTexts: string[] = [];

  const originalSendTelegramMessage = TelegramBotManager.sendTelegramMessage;
  TelegramBotManager.sendTelegramMessage = async (token: string, chatId: string | number, text: string): Promise<boolean> => {
    outboundMessageCount++;
    sentTexts.push(text);
    return true;
  };

  try {
    // =========================================================================
    // TEST A: One Telegram Update -> Exactly One Outbound Response
    // =========================================================================
    console.log('--- TEST A: One Telegram Update -> Exactly One Response ---');
    outboundMessageCount = 0;
    sentTexts.length = 0;

    const update1: TelegramUpdate = {
      update_id: 10001,
      message: {
        message_id: 501,
        chat: { id: 987654321, type: 'private', first_name: 'Alice' },
        from: { id: 987654321, is_bot: false, first_name: 'Alice' },
        date: Math.floor(Date.now() / 1000),
        text: 'HI',
      }
    };

    await TelegramBotManager.handleIncomingMessage(testAgent, update1);
    assert(outboundMessageCount === 1, `Exactly 1 outbound message sent for update 10001 (Actual: ${outboundMessageCount})`);
    assert(sentTexts[0].includes('Apex Dental Care') || sentTexts[0].includes('outside regular business hours'), 'Outbound message contains outside-hours notice');

    // =========================================================================
    // TEST B: Duplicate Delivery of Same Telegram Update -> No Second Response
    // =========================================================================
    console.log('\n--- TEST B: Duplicate Telegram Update Delivery Deduplication ---');
    const countBeforeDup = outboundMessageCount;

    // Simulate Telegram or Webhook delivering the exact same update again
    await TelegramBotManager.handleIncomingMessage(testAgent, update1);
    assert(outboundMessageCount === countBeforeDup, `Duplicate update 10001 ignored with 0 duplicate responses sent (Actual count: ${outboundMessageCount})`);

    // =========================================================================
    // TEST C: Cross-Restart Message Deduplication
    // =========================================================================
    console.log('\n--- TEST C: Cross-Restart / Poller Reconnection Deduplication ---');
    // Clear in-memory claim cache to simulate fresh process restart
    TelegramBotManager.resetClaimsForTesting();

    // Re-delivering update 10001 whose message 501 is already in DB conversation thread
    await TelegramBotManager.handleIncomingMessage(testAgent, update1);
    assert(outboundMessageCount === countBeforeDup, `Post-restart redelivery of message 501 dropped based on persistent conversation state (Count: ${outboundMessageCount})`);

    // =========================================================================
    // TEST D: Outside-Hours Booking Request -> One Intelligent Response
    // =========================================================================
    console.log('\n--- TEST D: Outside-Hours Booking Request Processing ---');
    outboundMessageCount = 0;
    sentTexts.length = 0;

    const bookingUpdate: TelegramUpdate = {
      update_id: 10002,
      message: {
        message_id: 502,
        chat: { id: 987654321, type: 'private', first_name: 'Alice' },
        from: { id: 987654321, is_bot: false, first_name: 'Alice' },
        date: Math.floor(Date.now() / 1000),
        text: 'I want to book an appointment for dental cleaning. My phone is +1-555-999-8888',
      }
    };

    await TelegramBotManager.handleIncomingMessage(testAgent, bookingUpdate);
    assert(outboundMessageCount === 1, `Exactly 1 response returned for outside-hours booking (Actual: ${outboundMessageCount})`);
    assert(sentTexts[0].includes('appointment request') || sentTexts[0].includes('Pending Staff'), 'Response acknowledges recorded booking request');
    assert(!sentTexts[0].includes('Appointment #999 Confirmed!'), 'Never fabricates a false confirmed appointment');

    // Verify booking saved in database
    const savedBookings = db.getBookings(testTenant.id);
    assert(savedBookings.length >= 1, `Booking request stored in database (${savedBookings.length})`);
    assert(savedBookings[0].status === 'PENDING_APPROVAL', 'Booking status is PENDING_APPROVAL');

    // Verify lead created
    const savedLeads = db.getLeads(testTenant.id);
    assert(savedLeads.length >= 1, `CRM lead stored in database (${savedLeads.length})`);

    // =========================================================================
    // TEST E: Human Handoff Trigger -> Exactly One Acknowledgement
    // =========================================================================
    console.log('\n--- TEST E: Human Handoff Trigger Single Acknowledgement ---');
    outboundMessageCount = 0;
    sentTexts.length = 0;

    const handoffUpdate: TelegramUpdate = {
      update_id: 10003,
      message: {
        message_id: 503,
        chat: { id: 987654321, type: 'private', first_name: 'Alice' },
        from: { id: 987654321, is_bot: false, first_name: 'Alice' },
        date: Math.floor(Date.now() / 1000),
        text: 'I want to talk to a human operator right now.',
      }
    };

    await TelegramBotManager.handleIncomingMessage(testAgent, handoffUpdate);
    assert(outboundMessageCount === 1, `Exactly 1 handoff response sent (Actual: ${outboundMessageCount})`);
    assert(sentTexts[0].includes('human representative'), 'Handoff acknowledgement sent to user');

    // Verify conversation thread is in handoffActive state
    const convs = db.getConversations(testTenant.id);
    assert(convs.length === 1 && convs[0].handoffActive === true, 'Conversation marked handoffActive = true');

    // =========================================================================
    // TEST F: Active Handoff -> AI Remains Silent
    // =========================================================================
    console.log('\n--- TEST F: Active Handoff Bot Silencing ---');
    outboundMessageCount = 0;
    sentTexts.length = 0;

    const userFollowUpWhileHandoff: TelegramUpdate = {
      update_id: 10004,
      message: {
        message_id: 504,
        chat: { id: 987654321, type: 'private', first_name: 'Alice' },
        from: { id: 987654321, is_bot: false, first_name: 'Alice' },
        date: Math.floor(Date.now() / 1000),
        text: 'Are you there operator?',
      }
    };

    await TelegramBotManager.handleIncomingMessage(testAgent, userFollowUpWhileHandoff);
    assert(outboundMessageCount === 0, `AI remained silent during active human handoff (Outbound count: ${outboundMessageCount})`);

    // Verify operator manual reply from Live Inbox works
    await TelegramBotManager.sendHumanOperatorReply(convs[0].id, 'Hello Alice, Dr. Smith here. How can I help you?', 'Dr. Smith');
    assert(outboundMessageCount === 1, 'Operator manual reply sent from Live Inbox');

    // =========================================================================
    // TEST G: Resume Bot -> AI Replies Normally Again
    // =========================================================================
    console.log('\n--- TEST G: Operator Resumes Bot ---');
    db.updateConversation(convs[0].id, { handoffActive: false, handoffStartedAt: undefined });
    assert(db.getConversationById(convs[0].id)?.handoffActive === false, 'Conversation handoffActive reset to false');

    outboundMessageCount = 0;
    sentTexts.length = 0;

    const userMsgAfterResume: TelegramUpdate = {
      update_id: 10005,
      message: {
        message_id: 505,
        chat: { id: 987654321, type: 'private', first_name: 'Alice' },
        from: { id: 987654321, is_bot: false, first_name: 'Alice' },
        date: Math.floor(Date.now() / 1000),
        text: 'What are your operating hours?',
      }
    };

    await TelegramBotManager.handleIncomingMessage(testAgent, userMsgAfterResume);
    assert(outboundMessageCount === 1, `AI automated reply resumed after operator released handoff (Actual: ${outboundMessageCount})`);

    // =========================================================================
    // TEST H: Multiple Agents / Workspaces -> Token Poller Deduplication & Isolation
    // =========================================================================
    console.log('\n--- TEST H: Multi-Workspace Bot Token Poller Deduplication ---');
    const rivalTenant = db.createTenant({
      id: 'tenant-rival-xyz',
      name: 'Rival Dental Group',
      businessName: 'Rival Dental',
      businessDescription: 'Rival Dental',
      industry: 'Healthcare',
    });

    // Create second agent trying to use the SAME token
    const duplicateAgent: Agent = db.createAgent({
      tenantId: rivalTenant.id,
      name: 'Rival Duplicate Agent',
      type: 'AI_RECEPTIONIST',
      businessName: rivalTenant.businessName,
      businessDescription: rivalTenant.businessDescription,
      industry: rivalTenant.industry,
      language: 'English',
      tone: 'Friendly',
      personality: 'Friendly',
      systemInstructions: 'Rival Dental',
      status: 'ACTIVE',
      telegramBot: {
        token: testBotToken, // same token!
        botUsername: 'apex_dental_test_bot',
        botName: 'Apex Dental Bot',
        isConnected: true,
        usePolling: true,
        status: 'CONNECTED',
      }
    });

    // Start polling on both
    TelegramBotManager.startPolling(testAgent.id);
    TelegramBotManager.startPolling(duplicateAgent.id);

    // Verify that sending an update produces strictly 1 response
    outboundMessageCount = 0;
    const testHUpdate: TelegramUpdate = {
      update_id: 10006,
      message: {
        message_id: 506,
        chat: { id: 987654321, type: 'private', first_name: 'Alice' },
        from: { id: 987654321, is_bot: false, first_name: 'Alice' },
        date: Math.floor(Date.now() / 1000),
        text: 'Hello again',
      }
    };

    await TelegramBotManager.handleIncomingMessage(duplicateAgent, testHUpdate);
    assert(outboundMessageCount === 1, `Only 1 response sent even when multiple agents configured with same token (Actual: ${outboundMessageCount})`);

    console.log('\n======================================================');
    console.log(`📊 IDEMPOTENCY TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');

    if (failedCount > 0) {
      console.error('Failures:', failures);
      process.exit(1);
    } else {
      console.log('🎉 ALL TELEGRAM IDEMPOTENCY & HANDOFF TESTS PASSED!\n');
    }
  } finally {
    TelegramBotManager.sendTelegramMessage = originalSendTelegramMessage;
    TelegramBotManager.stopAllPolling();
  }
}

runIdempotencyTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
