import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Agent, AgentType, AgentStatus } from '../types';
import { api } from '../api/client';
import {
  Bot,
  PlayCircle,
  Settings,
  Copy,
  Trash2,
  Send,
  Sparkles,
  Search,
  Filter,
  Users,
  MessageSquare,
  Flame,
  CheckCircle,
  PauseCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Clock
} from 'lucide-react';

export const AgentsListView: React.FC = () => {
  const {
    agents,
    currentTenant,
    openPlaygroundForAgent,
    openEditorForAgent,
    setIsCreateWizardOpen,
    setPresetTemplate,
    addNotification,
    refreshAll,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || agent.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || agent.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleToggleStatus = async (agent: Agent) => {
    const newStatus: AgentStatus = agent.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await api.setAgentStatus(agent.id, newStatus);
      addNotification('success', `Agent ${agent.name} is now ${newStatus}`);
      refreshAll();
    } catch (err: any) {
      addNotification('error', 'Failed to update status', err.message);
    }
  };

  const handleDuplicate = async (agent: Agent) => {
    try {
      await api.duplicateAgent(agent.id);
      addNotification('success', `Duplicated ${agent.name}`);
      refreshAll();
    } catch (err: any) {
      addNotification('error', 'Failed to duplicate agent', err.message);
    }
  };

  const handleDelete = async (agent: Agent) => {
    if (!window.confirm(`Are you sure you want to delete "${agent.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteAgent(agent.id);
      addNotification('success', `Deleted agent: ${agent.name}`);
      refreshAll();
    } catch (err: any) {
      addNotification('error', 'Failed to delete agent', err.message);
    }
  };

  const getTypeBadge = (type: AgentType) => {
    switch (type) {
      case 'AI_RECEPTIONIST':
        return { label: 'AI Receptionist', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' };
      case 'SALES_AGENT':
        return { label: 'Sales Agent', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20' };
      case 'CUSTOMER_SUPPORT':
        return { label: 'Customer Support', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' };
      case 'PERSONAL_ASSISTANT':
        return { label: 'Personal AI', color: 'bg-purple-500/15 text-purple-400 border-purple-500/20' };
      case 'LEAD_QUALIFICATION':
        return { label: 'Lead Qualifier', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' };
      case 'APPOINTMENT_BOOKING':
        return { label: 'Booking Desk', color: 'bg-teal-500/15 text-teal-400 border-teal-500/20' };
      case 'COMMUNITY_MANAGER':
        return { label: 'Community Manager', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' };
      case 'ECOMMERCE_ASSISTANT':
        return { label: 'E-Commerce', color: 'bg-pink-500/15 text-pink-400 border-pink-500/20' };
      case 'REAL_ESTATE_AGENT':
        return { label: 'Real Estate', color: 'bg-orange-500/15 text-orange-400 border-orange-500/20' };
      case 'EDUCATION_ADMISSIONS':
        return { label: 'Admissions', color: 'bg-rose-500/15 text-rose-400 border-rose-500/20' };
      case 'RESTAURANT_HOTEL':
        return { label: 'Hospitality Concierge', color: 'bg-amber-600/15 text-amber-400 border-amber-600/20' };
      default:
        return { label: 'Custom Agent', color: 'bg-slate-700/40 text-slate-300 border-slate-600/30' };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-850 via-slate-800 to-slate-850 border border-slate-750 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-Agent Fleet Control</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            AI Telegram Agents for {currentTenant?.name || 'Your Business'}
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Create, configure, and monitor intelligent Telegram agents tailored for front-desk reception, sales qualification, support ticketing, and automated operations.
          </p>
        </div>

        <button
          onClick={() => {
            setPresetTemplate(null);
            setIsCreateWizardOpen(true);
          }}
          className="relative z-10 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-sky-500/30 transition-transform active:scale-95 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Create New AI Agent</span>
        </button>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search agents by name or type..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/70 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/60 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/70 text-xs font-medium text-slate-200 focus:outline-none focus:border-sky-500/60"
          >
            <option value="ALL">All Agent Types</option>
            <option value="AI_RECEPTIONIST">AI Receptionist</option>
            <option value="SALES_AGENT">Sales Agent</option>
            <option value="CUSTOMER_SUPPORT">Customer Support</option>
            <option value="PERSONAL_ASSISTANT">Personal AI</option>
            <option value="LEAD_QUALIFICATION">Lead Qualifier</option>
            <option value="APPOINTMENT_BOOKING">Booking Agent</option>
            <option value="COMMUNITY_MANAGER">Community Manager</option>
            <option value="ECOMMERCE_ASSISTANT">E-Commerce</option>
            <option value="REAL_ESTATE_AGENT">Real Estate</option>
            <option value="EDUCATION_ADMISSIONS">Education / Admissions</option>
            <option value="RESTAURANT_HOTEL">Restaurant / Hotel</option>
            <option value="CUSTOM">Custom Agent</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/70 text-xs font-medium text-slate-200 focus:outline-none focus:border-sky-500/60"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="DRAFT">Draft</option>
            <option value="TESTING">Testing</option>
          </select>
        </div>
      </div>

      {/* Agents Grid */}
      {filteredAgents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-850/60 border border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
            <Bot className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-200">No AI agents found</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              {searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or filters to find your agent.'
                : 'Get started by creating your first AI Telegram agent from our 13 ready-to-use templates.'}
            </p>
          </div>
          <button
            onClick={() => {
              setPresetTemplate(null);
              setIsCreateWizardOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create AI Agent</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAgents.map(agent => {
            const badge = getTypeBadge(agent.type);
            const isConnected = agent.telegramBot.isConnected;
            const metrics = agent.metrics || {
              totalConversations: 0,
              totalMessages: 0,
              leadsGenerated: 0,
              avgResponseTimeMs: 0,
            };

            return (
              <div
                key={agent.id}
                className="rounded-2xl bg-slate-850/90 hover:bg-slate-850 border border-slate-750 hover:border-slate-650 transition-all p-5 flex flex-col justify-between group shadow-lg shadow-black/20"
              >
                {/* Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-500/20 to-blue-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                        <Bot className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-100 group-hover:text-sky-300 transition-colors truncate max-w-[170px]">
                          {agent.name}
                        </h3>
                        <p className="text-xs text-slate-400 truncate max-w-[170px]">
                          {agent.businessName}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(agent)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors flex items-center gap-1 ${
                        agent.status === 'ACTIVE'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                          : 'bg-slate-700/40 border-slate-600/40 text-slate-400 hover:bg-slate-700/60'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                      <span>{agent.status}</span>
                    </button>
                  </div>

                  {/* Type Badge & Personality */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                      {agent.personality} Tone
                    </span>
                  </div>

                  {/* Telegram Bot Connection Status */}
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-750/70 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Send className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-slate-300 font-medium">Telegram Bot</span>
                    </div>
                    {isConnected ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>@{agent.telegramBot.botUsername || 'connected'}</span>
                      </span>
                    ) : (
                      <span className="text-amber-400/90 text-[11px]">Token Not Set</span>
                    )}
                  </div>

                  {/* Mini Metrics Bar */}
                  <div className="grid grid-cols-3 gap-2 py-1 text-center">
                    <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-750/50">
                      <div className="text-[10px] text-slate-400">Chats</div>
                      <div className="text-sm font-bold text-slate-100">{metrics.totalConversations}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-750/50">
                      <div className="text-[10px] text-slate-400">Leads</div>
                      <div className="text-sm font-bold text-sky-400">{metrics.leadsGenerated}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-750/50">
                      <div className="text-[10px] text-slate-400">Latency</div>
                      <div className="text-sm font-bold text-emerald-400">
                        {metrics.avgResponseTimeMs > 0 ? `${metrics.avgResponseTimeMs}ms` : 'Instant'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Quick Action Buttons */}
                <div className="pt-4 mt-3 border-t border-slate-750/70 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicate(agent)}
                      title="Duplicate Agent"
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(agent)}
                      title="Delete Agent"
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openPlaygroundForAgent(agent)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Test Agent</span>
                    </button>

                    <button
                      onClick={() => openEditorForAgent(agent)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Configure</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
