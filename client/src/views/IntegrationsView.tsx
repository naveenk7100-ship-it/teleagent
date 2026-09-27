import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import {
  KeyRound,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Power,
  Bot,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  Bell,
  Webhook
} from 'lucide-react';
import type { IntegrationsStatus } from '../types';

export const IntegrationsView: React.FC = () => {
  const { currentTenant, currentAgent, addNotification, refreshAll } = useApp();

  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Telegram Reconnect Modal / Input
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [newTelegramToken, setNewTelegramToken] = useState('');
  const [isValidatingTelegram, setIsValidatingTelegram] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);

  // Gemini AI Key Modal / Input
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);
  const [newGeminiKey, setNewGeminiKey] = useState('');
  const [isValidatingGemini, setIsValidatingGemini] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  // Webhook / Notification settings
  const [staffTelegramChatId, setStaffTelegramChatId] = useState('');
  const [staffEmail, setStaffEmail] = useState('');

  const loadStatus = async () => {
    if (!currentTenant) return;
    try {
      setIsLoading(true);
      const res = await api.getIntegrationsStatus(currentTenant.id, currentAgent?.id);
      setStatus(res);
      if (currentAgent?.humanHandoff?.notifyChannels) {
        setStaffTelegramChatId(currentAgent.humanHandoff.notifyChannels.telegramStaffChatId || '');
        setStaffEmail(currentAgent.humanHandoff.notifyChannels.email || '');
      }
    } catch (err: any) {
      console.error('Error fetching integrations status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [currentTenant, currentAgent]);

  // Connect Telegram Bot
  const handleConnectTelegram = async () => {
    if (!newTelegramToken.trim() || !currentAgent) return;
    setIsValidatingTelegram(true);
    setTelegramError(null);
    try {
      const res = await api.connectTelegramBot(currentAgent.id, newTelegramToken.trim());
      if (res.success) {
        addNotification('success', 'Telegram Bot Connected', `@${res.botUsername} is now connected!`);
        setIsTelegramModalOpen(false);
        setNewTelegramToken('');
        await refreshAll();
        await loadStatus();
      } else {
        setTelegramError(res.error || 'Failed to connect Telegram Bot.');
      }
    } catch (err: any) {
      setTelegramError(err.message || 'Error connecting to Telegram.');
    } finally {
      setIsValidatingTelegram(false);
    }
  };

  // Toggle Polling
  const handleTogglePolling = async () => {
    if (!currentAgent) return;
    try {
      const nextState = !status?.telegram.usePolling;
      const res = await api.togglePolling(currentAgent.id, nextState);
      if (res.success) {
        addNotification('success', nextState ? 'Telegram Polling Started' : 'Telegram Polling Paused');
        await refreshAll();
        await loadStatus();
      }
    } catch (err: any) {
      addNotification('error', 'Failed to toggle polling', err.message);
    }
  };

  // Connect Gemini AI
  const handleConnectGemini = async () => {
    if (!newGeminiKey.trim() || !currentTenant) return;
    setIsValidatingGemini(true);
    setGeminiError(null);
    try {
      const res = await api.connectGeminiKey(currentTenant.id, newGeminiKey.trim());
      if (res.success) {
        addNotification('success', 'Gemini API Key Connected', `Securely connected to ${res.model || 'Gemini Flash'}`);
        setIsGeminiModalOpen(false);
        setNewGeminiKey('');
        await refreshAll();
        await loadStatus();
      }
    } catch (err: any) {
      setGeminiError(err.message || 'Error validating Gemini key');
    } finally {
      setIsValidatingGemini(false);
    }
  };

  // Disconnect Gemini Custom Key
  const handleDisconnectGemini = async () => {
    if (!currentTenant) return;
    try {
      await api.disconnectGeminiKey(currentTenant.id);
      addNotification('info', 'Gemini Custom Key Removed', 'Reverted to platform default orchestration engine.');
      await refreshAll();
      await loadStatus();
    } catch (err: any) {
      addNotification('error', 'Error removing Gemini key', err.message);
    }
  };

  // Save Notification Channels
  const handleSaveNotifications = async () => {
    if (!currentAgent) return;
    try {
      await api.updateAgent(currentAgent.id, {
        humanHandoff: {
          ...currentAgent.humanHandoff,
          notifyChannels: {
            ...currentAgent.humanHandoff.notifyChannels,
            telegramStaffChatId: staffTelegramChatId.trim() || undefined,
            email: staffEmail.trim() || undefined,
          }
        }
      });
      addNotification('success', 'Notification Settings Saved');
    } catch (err: any) {
      addNotification('error', 'Failed to save notifications', err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <KeyRound className="w-6 h-6 text-sky-400" />
            Integrations & API Secrets
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Manage your live Telegram Bot Token, Gemini AI keys, and webhook notification channels.
          </p>
        </div>
        <button
          onClick={loadStatus}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* Security Guarantee Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 flex items-start gap-3.5">
        <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed space-y-1">
          <p className="font-bold text-white">Strict SaaS Security Architecture</p>
          <p className="text-slate-300">
            All API tokens and keys are encrypted and stored solely on the server backend. Secrets are NEVER returned to client browsers, NEVER stored in localStorage, and masked in all responses.
          </p>
        </div>
      </div>

      {/* Grid of Main Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* TELEGRAM BOT CARD */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Telegram Bot</h3>
                  <p className="text-xs text-slate-400">Live long-polling & webhook engine</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                status?.telegram.isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status?.telegram.isConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                {status?.telegram.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Bot Handle:</span>
                <span className="font-mono text-white font-semibold">
                  {status?.telegram.botUsername ? `@${status.telegram.botUsername}` : 'Not configured'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bot Name:</span>
                <span className="text-slate-300">{status?.telegram.botName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Masked Token:</span>
                <span className="font-mono text-slate-400">{status?.telegram.maskedToken || '••••••••'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Polling Engine:</span>
                <span className={status?.telegram.usePolling ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                  {status?.telegram.usePolling ? 'Active (Listening)' : 'Paused'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsTelegramModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shadow-md shadow-sky-600/20"
            >
              {status?.telegram.isConnected ? 'Update Token / Reconnect' : 'Connect Telegram Token'}
            </button>
            {status?.telegram.isConnected && (
              <button
                onClick={handleTogglePolling}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                {status.telegram.usePolling ? 'Pause Polling' : 'Resume Polling'}
              </button>
            )}
          </div>
        </div>

        {/* GEMINI AI CARD */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                  ✨
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Google Gemini AI</h3>
                  <p className="text-xs text-slate-400">Generative Language API</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                status?.gemini.isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status?.gemini.isConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                {status?.gemini.isConnected ? 'ACTIVE' : 'DEFAULT ENGINE'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Active Model:</span>
                <span className="font-mono text-indigo-300 font-semibold">{status?.gemini.model || 'Gemini 2.5 Flash'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Key Type:</span>
                <span className="text-slate-300">
                  {status?.gemini.hasCustomKey ? 'Custom Workspace Key' : 'Platform Managed'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Masked Key:</span>
                <span className="font-mono text-slate-400">{status?.gemini.maskedKey || '••••••••'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsGeminiModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md shadow-indigo-600/20"
            >
              {status?.gemini.hasCustomKey ? 'Replace Gemini Key' : 'Add Custom Gemini Key'}
            </button>
            {status?.gemini.hasCustomKey && (
              <button
                onClick={handleDisconnectGemini}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/20 transition-colors"
              >
                Disconnect Key
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Notifications & Handoff Alert Channels */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Handoff & Urgent Alerts Dispatcher</h3>
            <p className="text-xs text-slate-400">Notify your human staff immediately when a customer requests human takeover or logs a high-value lead.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Staff Telegram Group / User Chat ID</label>
            <input
              type="text"
              value={staffTelegramChatId}
              onChange={(e) => setStaffTelegramChatId(e.target.value)}
              placeholder="e.g. -100123456789 or 987654321"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
            />
            <p className="mt-1 text-[11px] text-slate-500">Incoming human requests will be forwarded directly to this Telegram chat.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Staff Notification Email</label>
            <input
              type="email"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              placeholder="staff-alerts@yourbusiness.com"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
            />
            <p className="mt-1 text-[11px] text-slate-500">Receive email alerts for qualified leads and escalated support tickets.</p>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSaveNotifications}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors shadow-md shadow-purple-600/20"
          >
            Save Notification Channels
          </button>
        </div>
      </div>

      {/* TELEGRAM MODAL */}
      {isTelegramModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-sky-400" />
              Connect Telegram Bot Token
            </h3>
            <p className="text-xs text-slate-400">
              Enter your HTTP API bot token from @BotFather. It will be verified against the official Telegram HTTPS API.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Bot Token *</label>
              <input
                type="password"
                value={newTelegramToken}
                onChange={(e) => setNewTelegramToken(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
              {telegramError && (
                <p className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {telegramError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsTelegramModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConnectTelegram}
                disabled={isValidatingTelegram || !newTelegramToken.trim()}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-md shadow-sky-600/20"
              >
                {isValidatingTelegram ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validating with Telegram...
                  </>
                ) : (
                  'Validate & Connect'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GEMINI MODAL */}
      {isGeminiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-400" />
              Connect Custom Gemini API Key
            </h3>
            <p className="text-xs text-slate-400">
              Provide your Google Generative Language API key to power this workspace with your own Gemini quota.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Gemini API Key *</label>
              <input
                type="password"
                value={newGeminiKey}
                onChange={(e) => setNewGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              {geminiError && (
                <p className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {geminiError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsGeminiModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConnectGemini}
                disabled={isValidatingGemini || !newGeminiKey.trim()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-md shadow-indigo-600/20"
              >
                {isValidatingGemini ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing API Key...
                  </>
                ) : (
                  'Validate & Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
