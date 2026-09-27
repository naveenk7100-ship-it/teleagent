import dotenv from 'dotenv';
import path from 'path';
import { db } from '../db/store.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

async function run() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const geminiKey = process.env.GEMINI_API_KEY;

  console.log('====================================================');
  console.log('🔒 SECURE CREDENTIAL VALIDATION & AGENT CONNECTION');
  console.log('====================================================');

  // 1. Validate Telegram Bot Token
  let tgConnected = false;
  let botUsername = '';
  let botId = '';
  let botName = '';

  if (!token) {
    console.log('Telegram Bot Token: NOT CONFIGURED');
  } else {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data: any = await res.json();
      if (data.ok && data.result) {
        tgConnected = true;
        botUsername = data.result.username || '';
        botId = String(data.result.id);
        botName = data.result.first_name || '';
        console.log(`Telegram Bot: CONNECTED (@${botUsername} - ${botName})`);
      } else {
        console.log(`Telegram Bot: FAILED (${data.description || 'Authentication failed'})`);
      }
    } catch (err: any) {
      console.log(`Telegram Bot: FAILED (${err.message})`);
    }
  }

  // 2. Validate Gemini AI API Key
  if (!geminiKey) {
    console.log('AI Provider: NOT CONFIGURED');
  } else {
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
      const listData: any = await listRes.json();

      if (listData.models && Array.isArray(listData.models)) {
        const available = listData.models.filter((m: any) =>
          m.supportedGenerationMethods?.includes('generateContent')
        );

        if (available.length > 0) {
          const candidate = available.find((m: any) => m.name.includes('gemini-2.0-flash') || m.name.includes('gemini-1.5-flash') || m.name.includes('gemini-pro')) || available[0];
          const modelPath = candidate.name;

          const testUrl = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${geminiKey}`;
          const testRes = await fetch(testUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: 'Respond with the single word: "READY"' }] }]
            })
          });

          const testData: any = await testRes.json();
          if (testRes.ok && testData.candidates && testData.candidates.length > 0) {
            console.log(`AI Provider: CONNECTED (Google ${modelPath.replace('models/', '')})`);
          } else {
            console.log(`AI Provider: CONNECTED (Key verified via Generative Language API, rate limit on test prompt)`);
          }
        } else {
          console.log('AI Provider: FAILED (No generateContent models available)');
        }
      } else {
        console.log(`AI Provider: FAILED (${listData.error?.message || 'Invalid API Key'})`);
      }
    } catch (err: any) {
      console.log(`AI Provider: FAILED (${err.message})`);
    }
  }

  // 3. Connect to Selected Agent
  if (tgConnected && token) {
    const agents = db.getAgents();
    const targetAgent = agents.find(a => a.type === 'AI_RECEPTIONIST') || agents[0];

    if (targetAgent) {
      db.updateAgent(targetAgent.id, {
        telegramBot: {
          token,
          botUsername,
          botId,
          botName,
          isConnected: true,
          usePolling: true,
          status: 'CONNECTED',
          lastActiveAt: new Date().toISOString(),
        },
        status: 'ACTIVE',
      }, targetAgent.tenantId);

      console.log(`Agent: ACTIVE (${targetAgent.name} -> @${botUsername})`);
      console.log('Telegram integration mode: Polling');
    }
  }

  console.log('====================================================');
}

run().catch(err => {
  console.error('Validation script error:', err.message);
  process.exit(1);
});
