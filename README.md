# TeleAgent — Enterprise Multi-Tenant AI Telegram SaaS Platform

An enterprise-grade, multi-tenant AI Telegram Agent Builder platform that empowers businesses, agencies, and operators to create, configure, test, and deploy production-grade intelligent Telegram bots tailored to any business use case.

---

## 🌟 Production Architecture

```
                                    +-----------------------------------------+
                                    |         Client Browser / Dashboard       |
                                    |  (React 19 + TypeScript + Tailwind CSS) |
                                    +--------------------+--------------------+
                                                         |  Bearer Token (AuthSession)
                                                         |  x-workspace-id header
                                                         v
                                    +--------------------+--------------------+
                                    |       Express Server & API Gateway       |
                                    |    /api/auth  |  /api  |  /health       |
                                    +--------------------+--------------------+
                                                         |
                         +-------------------------------+-------------------------------+
                         |                               |                               |
                         v                               v                               v
             +-----------------------+       +-----------------------+       +-----------------------+
             |   requireAuth (401)   |       | requireWorkspace(403) |       |  SecretService (AES)  |
             | Session & Scrypt Auth |       | Tenant Isolation Gate |       | Credential Encryption |
             +-----------+-----------+       +-----------+-----------+       +-----------+-----------+
                         |                               |                               |
                         +-------------------------------+-------------------------------+
                                                         |
                                                         v
                                    +--------------------+--------------------+
                                    |      Database Abstraction Layer         |
                                    |             (IRepository)               |
                                    +--------------------+--------------------+
                                                         |
                                     +-------------------+-------------------+
                                     |                                       |
                                     v                                       v
                         +-----------------------+               +-----------------------+
                         |     JsonRepository    |               |   PostgresRepository  |
                         |   (Dev / Fast File)   |               |   (Prod / Relational) |
                         +-----------------------+               +-----------------------+
```

---

## 📋 Public Production Deployment Checklist (Step-by-Step)

Follow this beginner-friendly step-by-step checklist to deploy TeleAgent to public production (Railway, Render, Fly.io, AWS, DigitalOcean, Neon/Supabase, or Vercel/Netlify):

### **Step A: Create PostgreSQL Database**
Create a managed PostgreSQL database (e.g., on [Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway](https://railway.app), or [AWS RDS](https://aws.amazon.com/rds/)).
Copy your connection string:
```text
postgresql://username:password@ep-sample-123456.us-east-2.aws.neon.tech/teleagent?sslmode=require
```

### **Step B: Configure Backend Environment Variables**
In your backend hosting platform settings (or in `server/.env`), set:
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
SESSION_SECRET=a_secure_random_64_character_hex_string
CREDENTIAL_ENCRYPTION_KEY=a_secure_random_32_byte_hex_key
FRONTEND_URL=https://app.yourdomain.com
CORS_ORIGIN=https://app.yourdomain.com
```
*(Tip: Generate random hex secrets with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)*

### **Step C: Run Database Migrations**
Initialize the database tables and indexes safely (non-destructive):
```bash
cd server
npm run db:migrate
```
*(Or inside your container / release phase command: `node dist/db/migrate.js`)*

### **Step D: Build Backend**
Compile TypeScript into production JavaScript:
```bash
cd server
npm run build
```

### **Step E: Start Backend**
Run the compiled production server:
```bash
cd server
npm start
```

### **Step F: Deploy Frontend**
Deploy the `client/` React application to [Vercel](https://vercel.com), [Netlify](https://netlify.com), [Cloudflare Pages](https://pages.cloudflare.com), or S3/CloudFront.

### **Step G: Set Frontend API URL**
In your frontend hosting build settings, add:
```env
VITE_API_URL=https://api.yourdomain.com
```
Then build the frontend:
```bash
cd client
npm run build
```

### **Step H: Configure CORS**
Ensure `FRONTEND_URL` on the backend matches the exact URL of your deployed frontend (e.g. `https://app.yourdomain.com`).

### **Step I: Configure HTTPS & Reverse Proxy / WebSockets**
- Ensure SSL/TLS (HTTPS) is enabled on your domain.
- If using Nginx / Cloudflare for reverse proxying, enable WebSocket upgrades:
```nginx
location /ws {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
}
```

### **Step J: Verify Liveness Health Check**
Visit:
```text
https://api.yourdomain.com/api/health
```
Expected response:
```json
{
  "status": "healthy",
  "uptime": 120,
  "timestamp": "2026-09-27T12:00:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

### **Step K: Verify Database Readiness Check**
Visit:
```text
https://api.yourdomain.com/api/ready
```
Expected response:
```json
{
  "status": "ready",
  "database": "connected",
  "tenantsCount": 0,
  "agentsCount": 0,
  "timestamp": "2026-09-27T12:00:00.000Z"
}
```

### **Step L: Create Client Account**
Open your public frontend at `https://app.yourdomain.com` and click **Create Account**.
Your new workspace starts **100% clean** with 0 conversations, 0 leads, and 0 fake records.

### **Step M: Connect Telegram Bot**
1. Open Telegram on your phone and message `@BotFather`.
2. Send `/newbot` to create your bot and copy the API token.
3. In TeleAgent dashboard -> **Integrations**, paste your Bot Token and click **Connect**.
4. The token is immediately encrypted with AES-256-GCM and stored safely on the backend.

### **Step N: Connect Gemini AI**
1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com).
2. In TeleAgent dashboard -> **Integrations**, paste your Gemini Key and click **Connect**.

### **Step O: Activate Agent**
1. Select an Agent Blueprint (e.g. AI Receptionist, Sales Agent, Customer Support).
2. Add your business FAQs, services, or upload PDF documents in the **Knowledge Base**.
3. Toggle the Agent Status switch to **ACTIVE**.

### **Step P: Test from Phone**
1. Open Telegram on your smartphone or desktop.
2. Search for your bot username (e.g. `@YourBusinessBot`) and send `/start` or a customer inquiry.
3. Watch the bot reply in real time and see the lead appear instantly in your **TeleAgent Dashboard**!

---

## 🐳 Optional 1-Command Docker Deployment

You can spin up PostgreSQL and TeleAgent together with Docker:

```bash
docker compose up -d
```

---

## 🧪 Automated Testing & Quality Assurance

TeleAgent includes a comprehensive 12-suite automated test suite covering authentication, tenant isolation, AES-256 encryption, memory tiers, AI workflows, human handoff, and zero-data guarantees:

```bash
cd server
npm test
```

---

## 🔐 Security Standards & Guarantees

1. **Zero Secret Exposure**: Raw Telegram tokens and Gemini API keys are never stored in plaintext, never logged to stdout, never sent to browser localStorage, and masked in all API responses.
2. **Encrypted at Rest**: Sensitive client tokens are encrypted with `AES-256-GCM` using `CREDENTIAL_ENCRYPTION_KEY`.
3. **Multi-Tenant Protection**: Strict backend middleware verifies workspace membership (`requireWorkspace`) on every request, rejecting cross-tenant attempts with HTTP `403 Forbidden`.
4. **Security Headers & Rate Limiting**: Production HTTP security headers (HSTS, X-Frame-Options, CSP-safe) and sliding-window rate limiters protect auth endpoints and public APIs from abuse.
