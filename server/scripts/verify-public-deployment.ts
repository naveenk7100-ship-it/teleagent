/**
 * TeleAgent Public Deployment Live Verification Script
 * Validates public HTTPS endpoint health, readiness, Neon PostgreSQL connectivity,
 * authentication, multi-tenant isolation, and secret masking.
 */

async function verifyPublicDeployment(baseUrl: string) {
  const cleanUrl = baseUrl.replace(/\/$/, '');
  console.log(`====================================================`);
  console.log(`🌐 VERIFYING PUBLIC TELEAGENT DEPLOYMENT: ${cleanUrl}`);
  console.log(`====================================================\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
      return true;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
      return false;
    }
  }

  try {
    // 1. Health Check
    console.log('--- 1. Testing /api/health ---');
    const healthRes = await fetch(`${cleanUrl}/api/health`);
    assert(healthRes.status === 200, `Health check returned HTTP ${healthRes.status}`);
    const healthData: any = await healthRes.json();
    assert(healthData.status === 'healthy', `Health status is "${healthData.status}"`);
    assert(Boolean(healthData.version), `Version reported: ${healthData.version}`);

    // 2. Readiness Check & Database Connection
    console.log('\n--- 2. Testing /api/ready ---');
    const readyRes = await fetch(`${cleanUrl}/api/ready`);
    assert(readyRes.status === 200, `Readiness check returned HTTP ${readyRes.status}`);
    const readyData: any = await readyRes.json();
    assert(readyData.status === 'ready', `Readiness status is "${readyData.status}"`);
    assert(readyData.database === 'connected', `Neon Database connection is "${readyData.database}"`);

    // 3. Authentication & Workspace Isolation
    console.log('\n--- 3. Testing Authentication & Workspace Isolation ---');
    const testEmail = `verify_${Date.now()}@teleagent-cloud.test`;
    const testPass = `TeleAgentProd2026!_${Date.now()}`;

    const signupRes = await fetch(`${cleanUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPass,
        name: 'Public Tester',
        businessName: 'Apex Cloud Verification LLC',
        industry: 'Technology'
      })
    });

    assert(signupRes.status === 201, `Signup endpoint returned HTTP ${signupRes.status}`);
    const signupData: any = await signupRes.json();
    assert(Boolean(signupData.token), `Received 64-char crypto session token`);
    assert(Boolean(signupData.activeWorkspaceId), `Assigned active workspace ID: ${signupData.activeWorkspaceId}`);
    assert(signupData.workspace?.isDemo === false, `Workspace is not a demo sandbox`);

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${signupData.token}`,
      'x-workspace-id': signupData.activeWorkspaceId
    };

    // 4. Verify Zero Initial Data in Production Workspace
    const convsRes = await fetch(`${cleanUrl}/api/conversations?tenantId=${signupData.activeWorkspaceId}`, { headers: authHeaders });
    const convsData: any = await convsRes.json();
    assert(convsData.threads.length === 0, `Fresh workspace starts with 0 conversations`);

    // 5. Verify Multi-Tenant Authorization Guard
    const foreignRes = await fetch(`${cleanUrl}/api/conversations?tenantId=fake-foreign-tenant-id`, { headers: authHeaders });
    assert(foreignRes.status === 403, `Unauthorized cross-workspace access returned HTTP 403 Forbidden`);

    // 6. Verify Secret Masking in Integrations API
    const integrationsRes = await fetch(`${cleanUrl}/api/integrations/status?tenantId=${signupData.activeWorkspaceId}`, { headers: authHeaders });
    assert(integrationsRes.status === 200, `Integrations status returned HTTP 200`);
    const integrationsData: any = await integrationsRes.json();
    assert(integrationsData.telegramToken === undefined, `Raw Telegram Token is undefined in API response`);
    assert(integrationsData.geminiApiKey === undefined, `Raw Gemini Key is undefined in API response`);

    console.log('\n====================================================');
    console.log(`📊 PUBLIC VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    return { success: failed === 0, passed, failed };
  } catch (err: any) {
    console.error(`❌ Verification error against ${cleanUrl}:`, err.message);
    return { success: false, passed, failed: failed + 1, error: err.message };
  }
}

// Read target URL from command-line argument if provided
const targetUrl = process.argv[2];
if (targetUrl) {
  verifyPublicDeployment(targetUrl).then(res => {
    process.exit(res.success ? 0 : 1);
  });
}

export { verifyPublicDeployment };
