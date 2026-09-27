import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import type { Agent, AgentType, AgentPersonality, AgentTemplateDefinition } from '../types';
import { api } from '../api/client';
import {
  X,
  Sparkles,
  Bot,
  Building2,
  Sliders,
  BookOpen,
  Send,
  Clock,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Shield,
  HelpCircle,
  Zap,
  Info
} from 'lucide-react';

export const CreateAgentWizard: React.FC = () => {
  const {
    isCreateWizardOpen,
    setIsCreateWizardOpen,
    presetTemplate,
    setPresetTemplate,
    templates,
    currentTenant,
    addNotification,
    refreshAll,
    openPlaygroundForAgent,
  } = useApp();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testingToken, setTestingToken] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<{ success?: boolean; botUsername?: string; error?: string } | null>(null);

  // Form State
  const [agentType, setAgentType] = useState<AgentType>('AI_RECEPTIONIST');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState(currentTenant?.businessName || '');
  const [businessDescription, setBusinessDescription] = useState(currentTenant?.businessDescription || '');
  const [industry, setIndustry] = useState(currentTenant?.industry || 'Healthcare & Wellness');
  const [language, setLanguage] = useState('Multilingual (Auto-detect & reply)');
  const [tone, setTone] = useState('Professional & Welcoming');
  const [personality, setPersonality] = useState<AgentPersonality>('Friendly');
  const [customPersonalityPrompt, setCustomPersonalityPrompt] = useState('');
  const [systemInstructions, setSystemInstructions] = useState('');

  // Capabilities
  const [capabilities, setCapabilities] = useState({
    allowLeadCreation: true,
    allowLeadScoring: true,
    allowTicketCreation: true,
    allowTicketEscalation: false,
    allowBookingRequests: true,
    allowKnowledgeSearch: true,
    allowWebhooks: true,
    allowReminders: true,
    allowStaffNotifications: true,
    allowDocumentAnalysis: true,
    allowTranslation: true,
    allowCommunityModeration: false,
  });

  // Working Hours
  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(true);
  const [timezone, setTimezone] = useState(currentTenant?.timezone || 'UTC');
  const [outOfHoursMessage, setOutOfHoursMessage] = useState("Thank you for reaching out! Our team is currently offline. We will reply during business hours.");

  // Human Handoff
  const [handoffEnabled, setHandoffEnabled] = useState(true);
  const [handoffKeywords, setHandoffKeywords] = useState('human, agent, representative, operator, real person');
  const [pauseBotOnHandoff, setPauseBotOnHandoff] = useState(true);
  const [staffEmail, setStaffEmail] = useState(currentTenant?.email || '');

  // Telegram Bot
  const [botToken, setBotToken] = useState('');

  // Apply template preset when opened
  useEffect(() => {
    if (presetTemplate) {
      setAgentType(presetTemplate.type);
      setName(presetTemplate.title);
      setTone(presetTemplate.defaultTone);
      setPersonality(presetTemplate.defaultPersonality);
      setSystemInstructions(presetTemplate.systemInstructions.replace('{businessName}', businessName || 'Our Business'));
      setCapabilities({ ...presetTemplate.defaultCapabilities });
      setWorkingHoursEnabled(presetTemplate.defaultWorkingHours.enabled);
      setOutOfHoursMessage(presetTemplate.defaultWorkingHours.outOfHoursMessage);
      setHandoffEnabled(presetTemplate.defaultHumanHandoff.enabled);
      setHandoffKeywords(presetTemplate.defaultHumanHandoff.triggerKeywords.join(', '));
      setStep(2); // Jump directly to customization
    } else {
      const defaultTpl = templates.find(t => t.type === 'AI_RECEPTIONIST');
      if (defaultTpl) {
        setName(defaultTpl.title);
        setSystemInstructions(defaultTpl.systemInstructions.replace('{businessName}', businessName || 'Our Business'));
      }
      setStep(1);
    }
  }, [presetTemplate, businessName, templates]);

  const handleSelectTemplate = (tpl: AgentTemplateDefinition) => {
    setAgentType(tpl.type);
    setName(tpl.title);
    setTone(tpl.defaultTone);
    setPersonality(tpl.defaultPersonality);
    setSystemInstructions(tpl.systemInstructions.replace('{businessName}', businessName || 'Our Business'));
    setCapabilities({ ...tpl.defaultCapabilities });
    setWorkingHoursEnabled(tpl.defaultWorkingHours.enabled);
    setOutOfHoursMessage(tpl.defaultWorkingHours.outOfHoursMessage);
    setHandoffEnabled(tpl.defaultHumanHandoff.enabled);
    setHandoffKeywords(tpl.defaultHumanHandoff.triggerKeywords.join(', '));
    setStep(2);
  };

  const handleTestToken = async () => {
    if (!botToken.trim()) {
      setTokenStatus({ success: false, error: 'Please enter a Telegram Bot Token first' });
      return;
    }

    setTestingToken(true);
    setTokenStatus(null);
    try {
      const res = await api.validateTelegramToken(botToken.trim());
      if (res.success && res.botUsername) {
        setTokenStatus({ success: true, botUsername: res.botUsername });
        addNotification('success', `Valid bot token! Connected to @${res.botUsername}`);
      } else {
        setTokenStatus({ success: false, error: res.error || 'Invalid Telegram Bot Token' });
      }
    } catch (err: any) {
      setTokenStatus({ success: false, error: err.message || 'Error validating Telegram Bot Token' });
    } finally {
      setTestingToken(false);
    }
  };

  const handleCreateAgent = async () => {
    if (!name.trim()) {
      addNotification('error', 'Agent name is required');
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await api.createAgent({
        tenantId: currentTenant?.id || 'tenant-default',
        name,
        type: agentType,
        businessName,
        businessDescription,
        industry,
        language,
        tone,
        personality,
        customPersonalityPrompt,
        systemInstructions,
        status: 'ACTIVE',
        capabilities,
        workingHours: {
          enabled: workingHoursEnabled,
          timezone,
          schedule: {
            monday: { open: '09:00', close: '18:00', isClosed: false },
            tuesday: { open: '09:00', close: '18:00', isClosed: false },
            wednesday: { open: '09:00', close: '18:00', isClosed: false },
            thursday: { open: '09:00', close: '18:00', isClosed: false },
            friday: { open: '09:00', close: '18:00', isClosed: false },
            saturday: { open: '10:00', close: '16:00', isClosed: false },
            sunday: { open: '00:00', close: '00:00', isClosed: true },
          },
          outOfHoursMessage,
          holidayRules: [],
        },
        humanHandoff: {
          enabled: handoffEnabled,
          triggerKeywords: handoffKeywords.split(',').map(k => k.trim()).filter(Boolean),
          confidenceThreshold: 0.65,
          pauseBotOnHandoff,
          handoffMessage: "I've connected you with a human representative from our team.",
          resumeMessage: "Automated agent resumed.",
          notifyChannels: {
            email: staffEmail,
          },
        },
        telegramBot: {
          token: botToken,
          botUsername: tokenStatus?.botUsername || '',
          isConnected: !!tokenStatus?.success,
          usePolling: !!tokenStatus?.success,
          status: tokenStatus?.success ? 'CONNECTED' : 'DISCONNECTED',
        },
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      addNotification('success', `Created agent: ${created.agent.name}!`, 'Ready for testing and live messaging.');
      await refreshAll();
      setIsCreateWizardOpen(false);
      openPlaygroundForAgent(created.agent);
    } catch (err: any) {
      addNotification('error', 'Failed to create agent', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isCreateWizardOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-slide-up">
        {/* Wizard Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create AI Telegram Agent</h2>
              <p className="text-xs text-slate-400">Step {step} of 5: {
                step === 1 ? 'Choose Blueprint' :
                step === 2 ? 'Agent Profile & Personality' :
                step === 3 ? 'System Instructions & Persona' :
                step === 4 ? 'Capabilities & Working Hours' : 'Connect Telegram Bot'
              }</p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateWizardOpen(false)}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps Progress Bar */}
        <div className="grid grid-cols-5 h-1 bg-slate-800">
          <div className={`h-full transition-colors ${step >= 1 ? 'bg-sky-500' : ''}`} />
          <div className={`h-full transition-colors ${step >= 2 ? 'bg-sky-500' : ''}`} />
          <div className={`h-full transition-colors ${step >= 3 ? 'bg-sky-500' : ''}`} />
          <div className={`h-full transition-colors ${step >= 4 ? 'bg-sky-500' : ''}`} />
          <div className={`h-full transition-colors ${step >= 5 ? 'bg-sky-500' : ''}`} />
        </div>

        {/* Wizard Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm flex-1">
          {/* STEP 1: Choose Template */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Select an Agent Blueprint</h3>
                <p className="text-xs text-slate-400">Pick from our 13 specialized blueprints or build a custom agent from scratch.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {templates.map(tpl => (
                  <button
                    key={tpl.type}
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between group ${
                      agentType === tpl.type
                        ? 'bg-sky-500/10 border-sky-500/50 text-white shadow-md'
                        : 'bg-slate-850/60 hover:bg-slate-800 border-slate-750 text-slate-200'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-100 group-hover:text-sky-300 transition-colors">
                          {tpl.title}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {tpl.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {tpl.shortDescription}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Agent Profile & Personality */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Front Desk Assistant, Sales Advisor"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Agent Blueprint
                  </label>
                  <select
                    value={agentType}
                    onChange={(e) => setAgentType(e.target.value as AgentType)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-sm"
                  >
                    {templates.map(t => (
                      <option key={t.type} value={t.type}>{t.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Business / Company Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme Corp, Nova Digital"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Healthcare, Dental, SaaS, Real Estate"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Personality
                  </label>
                  <select
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value as AgentPersonality)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-sm"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Tone
                  </label>
                  <input
                    type="text"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="e.g. Warm, Consultative, Polished"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Language
                  </label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="e.g. Multilingual (Auto-detect), English"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Business Description & Context
                </label>
                <textarea
                  rows={2}
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  placeholder="Summarize what this business does and who its target customers are..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-sm"
                />
              </div>
            </div>
          )}

          {/* STEP 3: System Instructions */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">System Instructions</h3>
                  <p className="text-xs text-slate-400">Direct how this agent reasons, greets visitors, adheres to knowledge, and routes requests.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const tpl = templates.find(t => t.type === agentType);
                    if (tpl) {
                      setSystemInstructions(tpl.systemInstructions.replace('{businessName}', businessName || 'Our Business'));
                    }
                  }}
                  className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
                >
                  Reset to Template Default
                </button>
              </div>

              <textarea
                rows={12}
                value={systemInstructions}
                onChange={(e) => setSystemInstructions(e.target.value)}
                className="w-full p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800 focus:outline-none focus:border-sky-500 leading-relaxed"
                placeholder="Enter prompt instructions for this AI agent..."
              />

              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
                <span><strong>Real-World Integrity Guardrail:</strong> The agent is automatically instructed never to hallucinate unverified prices, false calendar confirmations, or nonexistent policies.</span>
              </div>
            </div>
          )}

          {/* STEP 4: Capabilities & Working Hours */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Tool Capabilities */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-sky-400" />
                  <h4 className="text-sm font-bold text-white">Permissioned Tools & Capabilities</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-750 cursor-pointer hover:bg-slate-800">
                    <span className="text-xs font-semibold text-slate-200">Create CRM Leads</span>
                    <input
                      type="checkbox"
                      checked={capabilities.allowLeadCreation}
                      onChange={(e) => setCapabilities({ ...capabilities, allowLeadCreation: e.target.checked })}
                      className="w-4 h-4 accent-sky-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-750 cursor-pointer hover:bg-slate-800">
                    <span className="text-xs font-semibold text-slate-200">Score & Qualify Leads</span>
                    <input
                      type="checkbox"
                      checked={capabilities.allowLeadScoring}
                      onChange={(e) => setCapabilities({ ...capabilities, allowLeadScoring: e.target.checked })}
                      className="w-4 h-4 accent-sky-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-750 cursor-pointer hover:bg-slate-800">
                    <span className="text-xs font-semibold text-slate-200">Appointment / Booking Requests</span>
                    <input
                      type="checkbox"
                      checked={capabilities.allowBookingRequests}
                      onChange={(e) => setCapabilities({ ...capabilities, allowBookingRequests: e.target.checked })}
                      className="w-4 h-4 accent-sky-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-750 cursor-pointer hover:bg-slate-800">
                    <span className="text-xs font-semibold text-slate-200">Support Tickets Creation</span>
                    <input
                      type="checkbox"
                      checked={capabilities.allowTicketCreation}
                      onChange={(e) => setCapabilities({ ...capabilities, allowTicketCreation: e.target.checked })}
                      className="w-4 h-4 accent-sky-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-750 cursor-pointer hover:bg-slate-800">
                    <span className="text-xs font-semibold text-slate-200">Search Knowledge Base</span>
                    <input
                      type="checkbox"
                      checked={capabilities.allowKnowledgeSearch}
                      onChange={(e) => setCapabilities({ ...capabilities, allowKnowledgeSearch: e.target.checked })}
                      className="w-4 h-4 accent-sky-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-750 cursor-pointer hover:bg-slate-800">
                    <span className="text-xs font-semibold text-slate-200">Dispatches External Webhooks</span>
                    <input
                      type="checkbox"
                      checked={capabilities.allowWebhooks}
                      onChange={(e) => setCapabilities({ ...capabilities, allowWebhooks: e.target.checked })}
                      className="w-4 h-4 accent-sky-500 rounded"
                    />
                  </label>
                </div>
              </div>

              {/* Working Hours */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">Working Hours & Out-of-Office Response</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={workingHoursEnabled}
                      onChange={(e) => setWorkingHoursEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {workingHoursEnabled && (
                  <div className="space-y-3 bg-slate-850 p-3.5 rounded-xl border border-slate-750">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Timezone</label>
                      <input
                        type="text"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        placeholder="America/New_York or UTC"
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Out of Hours Response Message</label>
                      <textarea
                        rows={2}
                        value={outOfHoursMessage}
                        onChange={(e) => setOutOfHoursMessage(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Human Handoff */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-purple-400" />
                    <h4 className="text-sm font-bold text-white">Live Human Handoff & Takeover</h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={handoffEnabled}
                      onChange={(e) => setHandoffEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                  </label>
                </div>

                {handoffEnabled && (
                  <div className="space-y-3 bg-slate-850 p-3.5 rounded-xl border border-slate-750 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Handoff Trigger Keywords (Comma separated)</label>
                      <input
                        type="text"
                        value={handoffKeywords}
                        onChange={(e) => setHandoffKeywords(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-slate-300">
                      <input
                        type="checkbox"
                        checked={pauseBotOnHandoff}
                        onChange={(e) => setPauseBotOnHandoff(e.target.checked)}
                        className="w-4 h-4 accent-purple-500 rounded"
                      />
                      <span>Automatically pause bot replies when human takeover occurs</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Telegram Bot Connection */}
          {step === 5 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-sky-400" />
                  <h3 className="text-base font-bold text-white">Connect Telegram Bot (BotFather)</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Enter your Telegram Bot Token from BotFather to link this AI agent directly to Telegram. You can also skip this and test inside the dashboard playground first.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Telegram Bot API Token (from @BotFather)
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={botToken}
                    onChange={(e) => {
                      setBotToken(e.target.value);
                      setTokenStatus(null);
                    }}
                    placeholder="e.g. 7123456789:AAHq_ABCdef1234567890"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestToken}
                    disabled={testingToken || !botToken}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-sky-400 transition-colors disabled:opacity-50"
                  >
                    {testingToken ? 'Verifying...' : 'Test Token'}
                  </button>
                </div>

                {tokenStatus && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    tokenStatus.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    {tokenStatus.success ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Connected to Telegram Bot: <strong>@{tokenStatus.botUsername}</strong></span>
                      </>
                    ) : (
                      <>
                        <Info className="w-4 h-4" />
                        <span>{tokenStatus.error}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2 text-xs text-slate-300">
                <div className="font-bold text-slate-200">How to get a Bot Token:</div>
                <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                  <li>Open Telegram and search for <strong>@BotFather</strong>.</li>
                  <li>Send the command <code className="text-sky-400">/newbot</code> and choose a name and username.</li>
                  <li>Copy the HTTP API Token and paste it into the box above.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : <div></div>}

          {step < 5 ? (
            <button
              onClick={() => {
                if (step === 2 && !name.trim()) {
                  addNotification('error', 'Please enter an Agent Name');
                  return;
                }
                setStep(step + 1);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/25 transition-transform active:scale-95"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleCreateAgent}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-transform active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Deploying Agent...' : 'Finish & Activate Agent'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
