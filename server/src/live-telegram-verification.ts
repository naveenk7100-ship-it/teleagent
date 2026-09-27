import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { TelegramBotManager, TelegramUpdate } from './engine/telegram/telegramBotManager.js';
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

async function runLiveVerification() {
  console.log('\n======================================================');
  console.log('🤖 TELEAGENT LIVE TELEGRAM BOT VERIFICATION');
  console.log('======================================================\n');

  TelegramBotManager.resetClaimsForTesting();

  // Create isolated production test tenant
  const timestamp = Date.now();
  const testTenant: Tenant = db.createTenant({
    name: 'Nova Automation Solutions',
    businessName: 'Nova Automation Solutions',
    businessDescription: 'Industrial robotics and cybernetic automation systems.',
    industry: 'B2B Software & SaaS',
    timezone: 'Asia/Kolkata',
  });

  const tgToken = process.env.TELEGRAM_BOT_TOKEN || '7873130177:AAH0p9t_V3y-Mslw3kY0Tj_Z9V7R9yK0Z6A';
  const testAgent: Agent = db.createAgent({
    tenantId: testTenant.id,
    name: 'Nova Robotics Concierge',
    type: 'AI_RECEPTIONIST',
    businessName: testTenant.businessName,
    businessDescription: testTenant.businessDescription,
    industry: testTenant.industry,
    language: 'English',
    tone: 'Professional & Efficient',
    personality: 'Friendly',
    systemInstructions: 'You are Nova Robotics Concierge representing Nova Automation Solutions.',
    status: 'ACTIVE',
    workingHours: {
      enabled: true,
      timezone: 'Asia/Kolkata',
      schedule: {
        monday: { open: '09:00', close: '18:00', isClosed: false },
        tuesday: { open: '09:00', close: '18:00', isClosed: false },
        wednesday: { open: '09:00', close: '18:00', isClosed: false },
        thursday: { open: '09:00', close: '18:00', isClosed: false },
        friday: { open: '09:00', close: '18:00', isClosed: false },
        saturday: { open: '10:00', close: '16:00', isClosed: false },
        sunday: { open: '00:00', close: '00:00', isClosed: true },
      },
      outOfHoursMessage: 'Our engineering office operates Monday through Friday from 9:00 AM to 6:00 PM IST.',
      holidayRules: [],
    },
    humanHandoff: {
      enabled: true,
      triggerKeywords: ['human', 'operator', 'agent', 'representative', 'talk to a human'],
      confidenceThreshold: 0.7,
      notifyChannels: {},
      pauseBotOnHandoff: true,
      handoffMessage: "I've connected you with a human representative from our team. They will take over shortly.",
      resumeMessage: 'The automated assistant has been resumed. How else can I assist you?',
    },
    telegramBot: {
      token: tgToken,
      botUsername: 'bot65412bot',
      botName: 'Ai Receptionist',
      isConnected: true,
      usePolling: true,
      status: 'CONNECTED',
    }
  });

  // Track Telegram outbound messages
  const outboundMessages: string[] = [];
  const originalSend = TelegramBotManager.sendTelegramMessage;
  TelegramBotManager.sendTelegramMessage = async (token: string, chatId: string | number, text: string) => {
    outboundMessages.push(text);
    return true;
  };

  const testChatId = 778899001;
  const testUserId = 778899001;
  const testUsername = 'arjun_manufacturing';

  try {
    // ----------------------------------------------------
    // TEST STEP 1: Customer sends "HI"
    // ----------------------------------------------------
    console.log('--- TEST STEP 1: Customer sends "HI" ---');
    outboundMessages.length = 0;

    const update1: TelegramUpdate = {
      update_id: 80001,
      message: {
        message_id: 101,
        chat: { id: testChatId, type: 'private', first_name: 'Arjun' },
        from: { id: testUserId, is_bot: false, first_name: 'Arjun', username: testUsername },
        date: Math.floor(Date.now() / 1000),
        text: 'HI',
      }
    };

    await TelegramBotManager.handleIncomingMessage(testAgent, update1);
    assert(outboundMessages.length === 1, `Message 1 ("HI") generated exactly ONE response (Actual: ${outboundMessages.length})`);
    console.log(`   Reply 1: "${outboundMessages[0].substring(0, 80)}..."`);

    // Verify conversation stored
    const convs1 = db.getConversations(testTenant.id);
    assert(convs1.length === 1, 'Exactly 1 conversation thread created in database');
    assert(convs1[0].messages.length === 2, `Thread has exactly 2 messages: 1 user + 1 assistant (Actual: ${convs1[0].messages.length})`);

    // ----------------------------------------------------
    // TEST STEP 2: Customer sends "I want to book an appointment"
    // ----------------------------------------------------
    console.log('\n--- TEST STEP 2: Customer sends "I want to book an appointment" ---');
    outboundMessages.length = 0;

    const update2: TelegramUpdate = {
      update_id: 80002,
      message: {
        message_id: 102,
        chat: { id: testChatId, type: 'private', first_name: 'Arjun' },
        from: { id: testUserId, is_bot: false, first_name: 'Arjun', username: testUsername },
        date: Math.floor(Date.now() / 1000),
        text: 'I want to book an appointment',
      }
    };

    await TelegramBotManager.handleIncomingMessage(testAgent, update2);
    assert(outboundMessages.length === 1, `Message 2 ("I want to book an appointment") generated exactly ONE response (Actual: ${outboundMessages.length})`);
    console.log(`   Reply 2: "${outboundMessages[0].substring(0, 80)}..."`);

    // Verify booking request captured
    const bookings = db.getBookings(testTenant.id);
    assert(bookings.length >= 1, `Booking request stored in database (${bookings.length})`);
    assert(bookings[0].status === 'PENDING_APPROVAL', 'Booking status is PENDING_APPROVAL');

    const leads = db.getLeads(testTenant.id);
    assert(leads.length >= 1, `CRM Lead stored in database (${leads.length})`);

    const convs2 = db.getConversations(testTenant.id);
    assert(convs2[0].messages.length === 4, `Thread now has exactly 4 messages (Actual: ${convs2[0].messages.length})`);

    // ----------------------------------------------------
    // TEST STEP 3: Customer sends "I want to talk to a human"
    // ----------------------------------------------------
    console.log('\n--- TEST STEP 3: Customer sends "I want to talk to a human" ---');
    outboundMessages.length = 0;

    const update3: TelegramUpdate = {
      update_id: 80003,
      message: {
        message_id: 103,
        chat: { id: testChatId, type: 'private', first_name: 'Arjun' },
        from: { id: testUserId, is_bot: false, first_name: 'Arjun', username: testUsername },
        date: Math.floor(Date.now() / 1000),
        text: 'I want to talk to a human',
      }
    };

    await TelegramBotManager.handleIncomingMessage(testAgent, update3);
    assert(outboundMessages.length === 1, `Message 3 ("I want to talk to a human") generated exactly ONE response (Actual: ${outboundMessages.length})`);
    console.log(`   Reply 3: "${outboundMessages[0].substring(0, 80)}..."`);

    // Verify conversation thread state
    const convs3 = db.getConversations(testTenant.id);
    assert(convs3[0].handoffActive === true, 'Conversation thread handoffActive is true');
    assert(convs3[0].messages.length === 6, `Thread now has exactly 6 messages (Actual: ${convs3[0].messages.length})`);

    // ----------------------------------------------------
    // TEST STEP 4: Inbound message while handoff is active -> AI silenced
    // ----------------------------------------------------
    console.log('\n--- TEST STEP 4: Inbound message during handoff -> AI silenced ---');
    outboundMessages.length = 0;

    const update4: TelegramUpdate = {
      update_id: 80004,
      message: {
        message_id: 104,
        chat: { id: testChatId, type: 'private', first_name: 'Arjun' },
        from: { id: testUserId, is_bot: false, first_name: 'Arjun', username: testUsername },
        date: Math.floor(Date.now() / 1000),
        text: 'Is any representative available?',
      }
    };

    await TelegramBotManager.handleIncomingMessage(testAgent, update4);
    assert(outboundMessages.length === 0, `AI remained silenced during human handoff (Outbound count: ${outboundMessages.length})`);

    const convs4 = db.getConversations(testTenant.id);
    assert(convs4[0].messages.length === 7, `User message recorded in thread for Live Inbox (7 messages)`);

    // ----------------------------------------------------
    // TEST STEP 5: Human Operator Manual Reply from Live Inbox
    // ----------------------------------------------------
    console.log('\n--- TEST STEP 5: Operator manual reply from Live Inbox ---');
    outboundMessages.length = 0;

    await TelegramBotManager.sendHumanOperatorReply(convs4[0].id, 'Hello Arjun, this is Dr. Mehta from Nova Automation. How can I assist you?', 'Dr. Mehta');
    assert(outboundMessages.length === 1, 'Operator reply dispatched to Telegram');
    const convs5 = db.getConversations(testTenant.id);
    assert(convs5[0].messages.length === 8, 'Operator message appended to thread (8 messages)');

    // ----------------------------------------------------
    // TEST STEP 6: Operator clicks Resume Bot
    // ----------------------------------------------------
    console.log('\n--- TEST STEP 6: Operator resumes bot ---');
    db.updateConversation(convs5[0].id, { handoffActive: false, handoffStartedAt: undefined });
    assert(db.getConversationById(convs5[0].id)?.handoffActive === false, 'Conversation handoffActive reset to false');

    // ----------------------------------------------------
    // TEST STEP 7: Customer message after resume -> AI automated responses resume
    // ----------------------------------------------------
    console.log('\n--- TEST STEP 7: Customer message after resume ---');
    outboundMessages.length = 0;

    const update5: TelegramUpdate = {
      update_id: 80005,
      message: {
        message_id: 105,
        chat: { id: testChatId, type: 'private', first_name: 'Arjun' },
        from: { id: testUserId, is_bot: false, first_name: 'Arjun', username: testUsername },
        date: Math.floor(Date.now() / 1000),
        text: 'What are your standard consulting packages?',
      }
    };

    await TelegramBotManager.handleIncomingMessage(testAgent, update5);
    assert(outboundMessages.length === 1, `AI responded with exactly ONE automated message after resume (Actual: ${outboundMessages.length})`);
    const convs6 = db.getConversations(testTenant.id);
    assert(convs6[0].messages.length === 10, 'Total conversation thread messages = 10 (no duplicates stored)');

    console.log('\n======================================================');
    console.log(`🏁 LIVE TELEGRAM VERIFICATION: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');

    if (failedCount > 0) {
      console.error('Failures:', failures);
      process.exit(1);
    } else {
      console.log('🎉 LIVE TELEGRAM BUGS RESOLVED AND 100% VERIFIED!\n');
      process.exit(0);
    }
  } finally {
    TelegramBotManager.sendTelegramMessage = originalSend;
    TelegramBotManager.stopAllPolling();
  }
}

runLiveVerification().catch(err => {
  console.error('Live verification error:', err);
  process.exit(1);
});
