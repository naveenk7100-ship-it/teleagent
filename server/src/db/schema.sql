-- TeleAgent Production PostgreSQL Schema
-- Version: 1.0.0

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'MEMBER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workspaces / Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    business_description TEXT DEFAULT '',
    industry VARCHAR(128) DEFAULT 'General',
    website VARCHAR(255) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    phone VARCHAR(64) DEFAULT '',
    address TEXT DEFAULT '',
    timezone VARCHAR(64) DEFAULT 'UTC',
    logo TEXT DEFAULT '',
    is_demo BOOLEAN DEFAULT FALSE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workspace Memberships
CREATE TABLE IF NOT EXISTS workspace_members (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'MEMBER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workspace_user UNIQUE (workspace_id, user_id)
);

-- Auth Sessions Table
CREATE TABLE IF NOT EXISTS auth_sessions (
    token VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agents Table
CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    business_description TEXT DEFAULT '',
    industry VARCHAR(128) DEFAULT 'General',
    language VARCHAR(64) DEFAULT 'English',
    tone VARCHAR(64) DEFAULT 'Professional',
    personality VARCHAR(64) DEFAULT 'Friendly',
    custom_personality_prompt TEXT,
    system_instructions TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    telegram_bot JSONB NOT NULL DEFAULT '{}'::jsonb,
    working_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
    human_handoff JSONB NOT NULL DEFAULT '{}'::jsonb,
    capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
    notification_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    knowledge_source_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Knowledge Items Table
CREATE TABLE IF NOT EXISTS knowledge_items (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id VARCHAR(64) DEFAULT '',
    telegram_user_id VARCHAR(128) NOT NULL,
    telegram_username VARCHAR(128),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(64),
    email VARCHAR(255),
    service_requested VARCHAR(255),
    company VARCHAR(255),
    budget VARCHAR(128),
    timeline VARCHAR(128),
    stage VARCHAR(64) NOT NULL DEFAULT 'NEW',
    score INT NOT NULL DEFAULT 50,
    qualification_answers JSONB DEFAULT '{}'::jsonb,
    notes JSONB DEFAULT '[]'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id VARCHAR(64) DEFAULT '',
    telegram_user_id VARCHAR(128) NOT NULL,
    telegram_username VARCHAR(128),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(128) NOT NULL DEFAULT 'General',
    priority VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    escalated BOOLEAN DEFAULT FALSE,
    escalation_reason TEXT,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Booking Requests Table
CREATE TABLE IF NOT EXISTS booking_requests (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id VARCHAR(64) DEFAULT '',
    telegram_user_id VARCHAR(128) NOT NULL,
    telegram_username VARCHAR(128),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(64),
    customer_email VARCHAR(255),
    service_name VARCHAR(255) NOT NULL,
    requested_date VARCHAR(32) NOT NULL,
    requested_time VARCHAR(32) NOT NULL,
    additional_notes TEXT,
    status VARCHAR(64) NOT NULL DEFAULT 'PENDING_APPROVAL',
    confirmed_time_slot VARCHAR(128),
    staff_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent Memory Table
CREATE TABLE IF NOT EXISTS agent_memories (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id VARCHAR(64) DEFAULT '',
    level VARCHAR(32) NOT NULL DEFAULT 'conversation',
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    user_id VARCHAR(128),
    confidence REAL DEFAULT 1.0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversation Threads Table
CREATE TABLE IF NOT EXISTS conversation_threads (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id VARCHAR(64) NOT NULL,
    telegram_user_id VARCHAR(128) NOT NULL,
    telegram_username VARCHAR(128),
    telegram_chat_id VARCHAR(128) NOT NULL,
    is_playground BOOLEAN DEFAULT FALSE,
    handoff_active BOOLEAN DEFAULT FALSE,
    handoff_started_at TIMESTAMPTZ,
    assigned_staff VARCHAR(128),
    user_language VARCHAR(64),
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_id VARCHAR(64),
    event_type VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'info',
    description TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_tenant ON knowledge_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON support_tickets(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON booking_requests(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_tenant ON agent_memories(tenant_id, level);
CREATE INDEX IF NOT EXISTS idx_conversations_lookup ON conversation_threads(tenant_id, agent_id, telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id, timestamp DESC);
