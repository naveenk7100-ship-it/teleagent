import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Agent, AgentStatus, AgentPersonality } from '../types';
import { api } from '../api/client';
import {
  X,
  Bot,
  Sliders,
  BookOpen,
  Send,
  Clock,
  UserCheck,
  Brain,
  BarChart3,
  Save,
  Trash2,
  CheckCircle,
  PlayCircle,
  Shield,
  Info
} from 'lucide-react';

export const AgentDetailView: React.FC = () => {
  const {
    editingAgent,
    setEditingAgent,
    currentTenant,
    addNotification,
    refreshAll,
    openPlaygroundForAgent,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'general' | 'instructions' | 'capabilities' | 'hours' | 'handoff' | 'telegram' | 'memory'>('general');
  const [formData, setFormData] = useState<Agent | null>(editingAgent);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingToken, setIsTestingToken] = useState(false);

  // Sync state if editing agent changes
  React.useEffect(() => {
    setFormData(editingAgent);
  }, [editingAgent]);

  if (!editingAgent || !formData) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await api.updateAgent(formData.id, formData);
      addNotification('success', `Saved changes to ${formData.name}`);
      refreshAll();
      setEditingAgent(updated.agent);
    } catch (err: any) {
      addNotification('error', 'Failed to save changes', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestToken = async () => {
    if (!formData.telegramBot.token) {
      addNotification('error', 'Please enter a Telegram Bot Token first');
      return;
    }

    setIsTestingToken(true);
    try {
      const result = await api.connectTelegramBot(formData.id, formData.telegramBot.token);
      if (result.success) {
        setFormData({
          ...formData,
          telegramBot: {
            ...formData.telegramBot,
            isConnected: true,
            botUsername: result.botUsername,
            botName: result.botName,
            status: 'CONNECTED',
          }
        });
        addNotification('success', `Bot connected: @${result.botUsername}`);
      } else {
        addNotification('error', 'Token check failed', result.error);
      }
    } catch (err: any) {
      addNotification('error', 'Network error checking token', err.message);
    } finally {
      setIsTestingToken(false);
    }
  };

  const handleTogglePolling = async () => {
    const nextState = !formData.telegramBot.usePolling;
    try {
      await api.togglePolling(formData.id, nextState);
      setFormData({
        ...formData,
        telegramBot: {
          ...formData.telegramBot,
          usePolling: nextState,
          status: nextState ? 'CONNECTED' : 'DISCONNECTED',
        }
      });
      addNotification('success', nextState ? 'Started live polling' : 'Stopped polling');
    } catch (err: any) {
      addNotification('error', 'Failed to toggle polling', err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-slide-up">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{formData.name}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {formData.type}
                </span>
              </div>
              <p className="text-xs text-slate-400">{formData.businessName} • {currentTenant?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingAgent(null);
                openPlaygroundForAgent(formData);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-semibold"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Test in Playground</span>
            </button>

            <button
              onClick={() => setEditingAgent(null)}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 border-b border-slate-800 bg-slate-900 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'general', label: 'General Profile', icon: Bot },
            { id: 'instructions', label: 'System Instructions', icon: Sliders },
            { id: 'capabilities', label: 'Capabilities & Tools', icon: Shield },
            { id: 'hours', label: 'Working Hours', icon: Clock },
            { id: 'handoff', label: 'Human Handoff', icon: UserCheck },
            { id: 'telegram', label: 'Telegram Bot API', icon: Send },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-sky-500 text-sky-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {/* TAB 1: General */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Agent Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Agent Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as AgentStatus })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-sky-500"
                  >
                    <option value="ACTIVE">ACTIVE (Live)</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="TESTING">TESTING</option>
                    <option value="DRAFT">DRAFT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Business Name</label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Personality</label>
                  <select
                    value={formData.personality}
                    onChange={(e) => setFormData({ ...formData, personality: e.target.value as AgentPersonality })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-sky-500"
                  >
                    <option value="Professional">Professional</option>
                    <option value="Friendly">Friendly</option>
                    <option value="Casual">Casual</option>
                    <option value="Premium">Premium</option>
                    <option value="Concise">Concise</option>
                    <option value="Helpful">Helpful</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Tone</label>
                  <input
                    type="text"
                    value={formData.tone}
                    onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Language</label>
                  <input
                    type="text"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Business Description</label>
                <textarea
                  rows={3}
                  value={formData.businessDescription}
                  onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Instructions */}
          {activeTab === 'instructions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">System Prompt & Instructions</h3>
                  <p className="text-xs text-slate-400">Controls the reasoning engine, guidelines, and behavioral guardrails.</p>
                </div>
              </div>

              <textarea
                rows={14}
                value={formData.systemInstructions}
                onChange={(e) => setFormData({ ...formData, systemInstructions: e.target.value })}
                className="w-full p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800 focus:outline-none focus:border-sky-500 leading-relaxed"
              />
            </div>
          )}

          {/* TAB 3: Capabilities */}
          {activeTab === 'capabilities' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Control which backend tools this agent is authorized to execute during user conversations.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(formData.capabilities).map(([key, val]) => (
                  <label key={key} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/60 border border-slate-750 cursor-pointer hover:bg-slate-800">
                    <span className="text-xs font-semibold text-slate-200">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                    <input
                      type="checkbox"
                      checked={!!val}
                      onChange={(e) => setFormData({
                        ...formData,
                        capabilities: {
                          ...formData.capabilities,
                          [key]: e.target.checked
                        }
                      })}
                      className="w-4 h-4 accent-sky-500 rounded"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Working Hours */}
          {activeTab === 'hours' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Enforce Working Hours</h4>
                  <p className="text-xs text-slate-400">When enabled, messages outside business hours receive the configured out-of-office reply.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.workingHours.enabled}
                    onChange={(e) => setFormData({
                      ...formData,
                      workingHours: { ...formData.workingHours, enabled: e.target.checked }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Business Timezone</label>
                <input
                  type="text"
                  value={formData.workingHours.timezone}
                  onChange={(e) => setFormData({
                    ...formData,
                    workingHours: { ...formData.workingHours, timezone: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Out of Hours Response</label>
                <textarea
                  rows={3}
                  value={formData.workingHours.outOfHoursMessage}
                  onChange={(e) => setFormData({
                    ...formData,
                    workingHours: { ...formData.workingHours, outOfHoursMessage: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 5: Human Handoff */}
          {activeTab === 'handoff' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Enable Human Handoff</h4>
                  <p className="text-xs text-slate-400">Routes conversations to live staff operators when requested or triggered.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.humanHandoff.enabled}
                    onChange={(e) => setFormData({
                      ...formData,
                      humanHandoff: { ...formData.humanHandoff, enabled: e.target.checked }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Trigger Keywords (Comma separated)
                </label>
                <input
                  type="text"
                  value={formData.humanHandoff.triggerKeywords.join(', ')}
                  onChange={(e) => setFormData({
                    ...formData,
                    humanHandoff: {
                      ...formData.humanHandoff,
                      triggerKeywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                    }
                  })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Handoff Message Sent to User</label>
                <textarea
                  rows={2}
                  value={formData.humanHandoff.handoffMessage}
                  onChange={(e) => setFormData({
                    ...formData,
                    humanHandoff: { ...formData.humanHandoff, handoffMessage: e.target.value }
                  })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 6: Telegram Bot API */}
          {activeTab === 'telegram' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Telegram Bot API Token (from @BotFather)
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={formData.telegramBot.token || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      telegramBot: { ...formData.telegramBot, token: e.target.value }
                    })}
                    placeholder="e.g. 7123456789:AAHq_ABCdef1234567890"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestToken}
                    disabled={isTestingToken || !formData.telegramBot.token}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold text-sky-400 transition-colors disabled:opacity-50"
                  >
                    {isTestingToken ? 'Checking...' : 'Verify Token'}
                  </button>
                </div>
              </div>

              {formData.telegramBot.isConnected && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Connected to: <strong>@{formData.telegramBot.botUsername}</strong></span>
                  </div>

                  <button
                    type="button"
                    onClick={handleTogglePolling}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-colors ${
                      formData.telegramBot.usePolling
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                    }`}
                  >
                    {formData.telegramBot.usePolling ? 'Stop Live Polling' : 'Start Live Polling'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-end gap-3">
          <button
            onClick={() => setEditingAgent(null)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/25 transition-transform active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
