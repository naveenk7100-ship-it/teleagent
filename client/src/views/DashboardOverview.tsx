import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import {
  MessageSquare,
  Users,
  Calendar,
  Ticket,
  Headphones,
  Zap,
  Bot,
  Send,
  Sparkles,
  ArrowUpRight,
  Clock,
  Play,
  FileText,
  Settings2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  Power,
  Layers,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import type { Lead, BookingRequest, SupportTicket, ConversationThread, IntegrationsStatus } from '../types';

export const DashboardOverview: React.FC = () => {
  const {
    currentTenant,
    currentAgent,
    agents,
    setActiveTab,
    startOnboarding,
    openPlaygroundForAgent,
    addNotification,
    refreshAll
  } = useApp();

  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [integrationsStatus, setIntegrationsStatus] = useState<IntegrationsStatus | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [recentBookings, setRecentBookings] = useState<BookingRequest[]>([]);
  const [recentConversations, setRecentConversations] = useState<ConversationThread[]>([]);
  const [recentTickets, setRecentTickets] = useState<SupportTicket[]>([]);
  const [isTogglingPolling, setIsTogglingPolling] = useState(false);

  const loadDashboardData = async () => {
    if (!currentTenant) return;
    try {
      setIsLoading(true);
      const [analyticsRes, leadsRes, bookingsRes, convsRes, ticketsRes, intStatusRes] = await Promise.all([
        api.getAnalytics(currentTenant.id),
        api.getLeads(currentTenant.id),
        api.getBookings(currentTenant.id),
        api.getConversations(currentTenant.id),
        api.getTickets(currentTenant.id),
        api.getIntegrationsStatus(currentTenant.id, currentAgent?.id),
      ]);

      setAnalytics(analyticsRes.summary);
      setRecentLeads(leadsRes.leads.slice(0, 5));
      setRecentBookings(bookingsRes.bookings.slice(0, 5));
      setRecentConversations(convsRes.conversations.slice(0, 5));
      setRecentTickets(ticketsRes.tickets.slice(0, 5));
      setIntegrationsStatus(intStatusRes);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentTenant, currentAgent]);

  const handleTogglePolling = async () => {
    if (!currentAgent) return;
    const currentlyActive = currentAgent.telegramBot?.usePolling;
    setIsTogglingPolling(true);
    try {
      const res = await api.togglePolling(currentAgent.id, !currentlyActive);
      if (res.success) {
        addNotification(
          'success',
          res.usePolling ? 'Telegram Bot Polling Resumed' : 'Telegram Bot Polling Paused',
          res.usePolling ? 'Agent is actively listening for incoming messages.' : 'Agent automation is temporarily paused.'
        );
        await refreshAll();
        await loadDashboardData();
      }
    } catch (err: any) {
      addNotification('error', 'Failed to toggle polling', err.message);
    } finally {
      setIsTogglingPolling(false);
    }
  };

  // If no agents configured in this workspace, show clean onboarding hero
  if (!currentAgent && agents.length === 0) {
    return (
      <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in">
        {/* Welcome Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-950/80 via-indigo-950/60 to-slate-900 border border-sky-500/30 p-6 sm:p-12 shadow-2xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs sm:text-sm font-semibold">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>Workspace: {currentTenant?.name || 'New Client Workspace'}</span>
          </div>

          <div className="space-y-3 max-w-2xl">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              No AI Agent Connected
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Complete the setup wizard to connect your Telegram bot and Gemini AI.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={startOnboarding}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-sky-500/25 flex items-center gap-2.5 transition-all transform hover:-translate-y-0.5"
            >
              <Sparkles className="w-5 h-5" />
              Launch Setup Wizard
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className="px-5 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 text-sm font-semibold transition-colors border border-slate-700"
            >
              Explore 13 Built-in Templates
            </button>
          </div>
        </div>

        {/* 3 Step Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 font-bold text-lg">
              1
            </div>
            <h3 className="text-base font-bold text-white">Connect Telegram Bot</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Enter your token from @BotFather. We validate it server-side and initiate real-time polling.</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-lg">
              2
            </div>
            <h3 className="text-base font-bold text-white">Equip Knowledge</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Add your pricing, FAQs, services, and policies to ground the AI in verified business facts.</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-lg">
              3
            </div>
            <h3 className="text-base font-bold text-white">Live Customer Chats</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Customers message your Telegram bot and real CRM leads, bookings, and chats appear in real time.</p>
          </div>
        </div>
      </div>
    );
  }

  const isDemo = Boolean(currentTenant?.isDemo);
  const isLive = Boolean(currentAgent?.status === 'ACTIVE' && (currentAgent?.telegramBot?.usePolling || currentAgent?.telegramBot?.isConnected));
  const botUsername = currentAgent?.telegramBot?.botUsername || integrationsStatus?.telegram?.botUsername || '';
  const businessDisplayName = currentTenant?.businessName || currentTenant?.name || 'Business Workspace';
  const agentDisplayName = currentAgent?.name || 'AI Assistant';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      
      {/* Demo Sandbox Alert Banner */}
      {isDemo && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">DEMO SANDBOX WORKSPACE</p>
              <p className="text-xs text-amber-300/80">You are viewing sample seeded data. Switch to a real workspace or create a new one to manage your actual business.</p>
            </div>
          </div>
          <button
            onClick={startOnboarding}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shrink-0"
          >
            + Create Real Workspace
          </button>
        </div>
      )}

      {/* 1. Live Telegram Agent Status Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg ${
                isLive ? 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-sky-600 shadow-emerald-500/20' : 'bg-slate-800 text-slate-400'
              }`}>
                <Bot className="w-7 h-7" />
              </div>
              {isLive && (
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900"></span>
                </span>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">{businessDisplayName}</h1>
                <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                  isLive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {isLive ? '🟢 LIVE' : 'BOT PAUSED'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 flex-wrap">
                <span>Agent: <strong className="text-white font-semibold">{agentDisplayName}</strong></span>
                <span>•</span>
                <span>Type: <span className="font-mono text-sky-400">{currentAgent?.type.replace('_', ' ')}</span></span>
                {botUsername && currentAgent?.telegramBot?.isConnected ? (
                  <>
                    <span>•</span>
                    <span>Telegram: <a href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1 font-mono font-semibold">@{botUsername} <ExternalLink className="w-3.5 h-3.5" /></a></span>
                  </>
                ) : (
                  <>
                    <span>•</span>
                    <span className="text-slate-400 font-semibold">Telegram Not Connected</span>
                  </>
                )}
                {integrationsStatus?.gemini?.isConnected ? (
                  <>
                    <span>•</span>
                    <span className="text-indigo-400 font-semibold">Gemini Connected</span>
                  </>
                ) : (
                  <>
                    <span>•</span>
                    <span className="text-slate-400 font-semibold">Gemini AI Not Connected</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-2.5 flex-wrap pt-2 md:pt-0">
            {currentAgent && (
              <button
                onClick={handleTogglePolling}
                disabled={isTogglingPolling}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors shadow-sm ${
                  currentAgent.telegramBot?.usePolling
                    ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <Power className="w-4 h-4" />
                {currentAgent.telegramBot?.usePolling ? 'Pause Bot' : 'Resume Bot'}
              </button>
            )}

            {currentAgent && (
              <button
                onClick={() => openPlaygroundForAgent(currentAgent)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
              >
                <Play className="w-4 h-4 text-purple-400" />
                Test Agent
              </button>
            )}

            <button
              onClick={() => setActiveTab('business')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <Settings2 className="w-4 h-4 text-slate-400" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive Outcome KPI Cards (Real Database Driven) */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Live Outcome Metrics</h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          
          {/* Total Conversations */}
          <div
            onClick={() => setActiveTab('inbox')}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all hover:bg-slate-850 space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs sm:text-sm font-semibold">Conversations</span>
              <MessageSquare className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{analytics?.totalConversations ?? 0}</p>
            <p className="text-xs text-slate-400">
              {analytics?.totalConversations === 0 ? 'No conversations yet' : `${analytics?.totalMessages ?? 0} messages`}
            </p>
          </div>

          {/* Messages */}
          <div
            onClick={() => setActiveTab('inbox')}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all hover:bg-slate-850 space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs sm:text-sm font-semibold">Messages</span>
              <Send className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{analytics?.totalMessages ?? 0}</p>
            <p className="text-xs text-slate-400">
              {analytics?.totalMessages === 0 ? 'No messages yet' : 'Inbound & outbound'}
            </p>
          </div>

          {/* CRM Leads */}
          <div
            onClick={() => setActiveTab('leads')}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all hover:bg-slate-850 space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs sm:text-sm font-semibold">CRM Leads</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{analytics?.totalLeads ?? 0}</p>
            <p className="text-xs text-slate-400">
              {analytics?.totalLeads === 0 ? 'No leads captured yet' : `${analytics?.qualifiedLeads ?? 0} qualified`}
            </p>
          </div>

          {/* Bookings */}
          <div
            onClick={() => setActiveTab('bookings')}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all hover:bg-slate-850 space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs sm:text-sm font-semibold">Bookings</span>
              <Calendar className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{analytics?.totalBookings ?? 0}</p>
            <p className="text-xs text-slate-400">
              {analytics?.totalBookings === 0 ? 'No bookings yet' : `${analytics?.pendingBookings ?? 0} pending`}
            </p>
          </div>

          {/* Support Tickets */}
          <div
            onClick={() => setActiveTab('tickets')}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all hover:bg-slate-850 space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs sm:text-sm font-semibold">Support Tickets</span>
              <Ticket className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{analytics?.totalTickets ?? 0}</p>
            <p className="text-xs text-slate-400">
              {analytics?.totalTickets === 0 ? 'No support tickets yet' : `${analytics?.openTickets ?? 0} open`}
            </p>
          </div>

          {/* Human Handoffs */}
          <div
            onClick={() => setActiveTab('inbox')}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all hover:bg-slate-850 space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs sm:text-sm font-semibold">Human Handoffs</span>
              <Headphones className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">{analytics?.handoffs ?? 0}</p>
            <p className="text-xs text-slate-400">
              {analytics?.handoffs === 0 ? 'No human handoffs yet' : 'Operator requests'}
            </p>
          </div>

        </div>
      </div>

      {/* 3. Live Activity & Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Real Live Telegram Conversations */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-sky-400" />
                Live Telegram Conversations
              </h3>
              {recentConversations.length > 0 && (
                <button
                  onClick={() => setActiveTab('inbox')}
                  className="text-xs sm:text-sm text-sky-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  Open Inbox <ArrowUpRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {recentConversations.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 mx-auto flex items-center justify-center text-slate-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <p className="text-sm font-bold text-white">No customer conversations yet.</p>
                  <p className="text-xs text-slate-400">
                    Once someone messages your Telegram bot, their conversation will appear here in real-time.
                  </p>
                </div>
                {botUsername && (
                  <div className="pt-2">
                    <a
                      href={`https://t.me/${botUsername}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors shadow-md shadow-sky-600/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Open @{botUsername} in Telegram
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {recentConversations.map((conv) => {
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  return (
                    <div
                      key={conv.id}
                      onClick={() => setActiveTab('inbox')}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-xs font-bold text-sky-300 shrink-0">
                          {conv.telegramUsername ? conv.telegramUsername.substring(0, 2).toUpperCase() : 'TG'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {conv.telegramUsername ? `@${conv.telegramUsername}` : `User ${conv.telegramUserId}`}
                          </p>
                          <p className="text-xs text-slate-300 truncate max-w-xs">
                            {lastMsg ? lastMsg.content : 'Started chat'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {conv.handoffActive ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30">
                            HANDOFF
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
                            Automated
                          </span>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Real CRM Leads */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                CRM Leads Pipeline
              </h3>
              {recentLeads.length > 0 && (
                <button
                  onClick={() => setActiveTab('leads')}
                  className="text-xs sm:text-sm text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  View CRM <ArrowUpRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {recentLeads.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 mx-auto flex items-center justify-center text-slate-400">
                  <Users className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <p className="text-sm font-bold text-white">No leads captured yet.</p>
                  <p className="text-xs text-slate-400">
                    Your AI agent will automatically capture and score qualified leads when customers ask about services or pricing.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => setActiveTab('leads')}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{lead.fullName}</p>
                      <p className="text-xs text-slate-300">
                        {lead.phone || lead.email || (lead.telegramUsername ? `@${lead.telegramUsername}` : 'Telegram Contact')}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        Score: {lead.score}/100
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Stage: <strong className="text-slate-200">{lead.stage}</strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 4. Bookings & Support Tickets Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Real Bookings */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Appointment Bookings
            </h3>
            {recentBookings.length > 0 && (
              <button
                onClick={() => setActiveTab('bookings')}
                className="text-xs sm:text-sm text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
              >
                All Bookings <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {recentBookings.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-300">No booking requests yet.</p>
              <p className="text-xs text-slate-400">
                When customers schedule appointments with your agent, booking requests will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setActiveTab('bookings')}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="text-sm font-bold text-white">{b.customerName}</p>
                    <p className="text-xs text-slate-300">{b.serviceName} • {b.requestedDate} at {b.requestedTime}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    b.status === 'CONFIRMED'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                  }`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real Support Tickets */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-amber-400" />
              Support Desk Tickets
            </h3>
            {recentTickets.length > 0 && (
              <button
                onClick={() => setActiveTab('tickets')}
                className="text-xs sm:text-sm text-amber-400 hover:underline flex items-center gap-1 font-semibold"
              >
                All Tickets <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {recentTickets.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-300">No support tickets yet.</p>
              <p className="text-xs text-slate-400">
                Issues that cannot be immediately resolved by the bot are automatically logged as tickets here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setActiveTab('tickets')}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="text-sm font-bold text-white">{t.subject}</p>
                    <p className="text-xs text-slate-300">Category: {t.category} • {t.priority}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    t.status === 'RESOLVED'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                  }`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
