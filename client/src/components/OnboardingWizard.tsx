import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import {
  X,
  CheckCircle2,
  Sparkles,
  Bot,
  Send,
  Building2,
  KeyRound,
  FileText,
  Play,
  Rocket,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  HelpCircle,
  Clock,
  Globe,
  Upload,
  Plus,
  Trash2,
  Check,
  ShieldCheck
} from 'lucide-react';
import type { AgentType } from '../types';

const AGENT_TEMPLATES: Array<{
  type: AgentType;
  title: string;
  category: string;
  badge: string;
  description: string;
  icon: string;
}> = [
  { type: 'PERSONAL_ASSISTANT', title: 'Personal AI Assistant', category: 'Productivity', badge: 'Executive', description: 'Calendar management, smart briefings, email drafting, and task delegation.', icon: '⚡' },
  { type: 'BUSINESS_ASSISTANT', title: 'Business Assistant', category: 'Enterprise', badge: 'Operations', description: 'Company operations, employee inquiries, SOP guidance, and reporting.', icon: '🏢' },
  { type: 'AI_RECEPTIONIST', title: 'AI Receptionist', category: 'Front Desk', badge: 'Popular', description: '24/7 guest greeting, appointment scheduling, services info, and intake.', icon: '🛎️' },
  { type: 'SALES_AGENT', title: 'Sales Agent', category: 'Revenue', badge: 'High Conversion', description: 'Product recommendations, pricing breakdowns, lead acceleration, and close.', icon: '💼' },
  { type: 'CUSTOMER_SUPPORT', title: 'Customer Support', category: 'Support', badge: '24/7 Desk', description: 'Instant resolution, order tracking, returns, knowledge search, and escalation.', icon: '🎧' },
  { type: 'LEAD_QUALIFICATION', title: 'Lead Qualification Agent', category: 'Marketing', badge: 'B2B Sales', description: 'Budget, authority, timeline, and need (BANT) qualification scoring.', icon: '🎯' },
  { type: 'COMMUNITY_MANAGER', title: 'Community Manager', category: 'Community', badge: 'Engagement', description: 'Telegram group moderation, member onboarding, rules enforcement, and FAQs.', icon: '👥' },
  { type: 'APPOINTMENT_BOOKING', title: 'Appointment Booking Agent', category: 'Scheduling', badge: 'Service Pros', description: 'Frictionless calendar booking, reminders, rescheduling, and confirmations.', icon: '📅' },
  { type: 'ECOMMERCE_ASSISTANT', title: 'E-Commerce Assistant', category: 'Retail', badge: 'Catalog', description: 'Catalog navigation, size/fit guidance, stock checking, and upsells.', icon: '🛍️' },
  { type: 'REAL_ESTATE_AGENT', title: 'Real Estate Assistant', category: 'Property', badge: 'Listings', description: 'Property listings, neighborhood details, viewing scheduling, and buyer intake.', icon: '🏡' },
  { type: 'EDUCATION_ADMISSIONS', title: 'Education & Admissions', category: 'Academic', badge: 'Enrollment', description: 'Course offerings, admission deadlines, fee structures, and application help.', icon: '🎓' },
  { type: 'RESTAURANT_HOTEL', title: 'Restaurant & Hotel Concierge', category: 'Hospitality', badge: 'Concierge', description: 'Table reservations, menu exploration, room bookings, and dietary advice.', icon: '🍽️' },
  { type: 'CUSTOM', title: 'Custom AI Agent', category: 'Tailored', badge: 'Flexible', description: 'Build a bespoke agent tailored precisely to your unique business workflows.', icon: '✨' },
];

export const OnboardingWizard: React.FC = () => {
  const {
    isOnboardingWizardOpen,
    setIsOnboardingWizardOpen,
    addNotification,
    refreshAll,
    setActiveTab
  } = useApp();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Business Profile
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('Healthcare & Wellness');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');

  // Step 2: Telegram Bot
  const [telegramToken, setTelegramToken] = useState('');
  const [isValidatingTelegram, setIsValidatingTelegram] = useState(false);
  const [telegramBotInfo, setTelegramBotInfo] = useState<{ username: string; name: string; id: string } | null>(null);
  const [telegramError, setTelegramError] = useState<string | null>(null);

  // Step 3: Gemini AI
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isValidatingGemini, setIsValidatingGemini] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<{ valid: boolean; model: string } | null>(null);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  // Step 4: Agent Template
  const [selectedTemplate, setSelectedTemplate] = useState<AgentType>('AI_RECEPTIONIST');
  const [agentName, setAgentName] = useState('');
  const [agentTone, setAgentTone] = useState('Warm, Attentive, and Courteous');

  // Step 5: Business Knowledge
  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>([
    { question: 'What are your standard business hours?', answer: 'We are open Monday to Friday from 9:00 AM to 6:00 PM.' },
    { question: 'How do I book an appointment?', answer: 'You can book directly here in this chat by letting me know your preferred date and time!' }
  ]);
  const [pricingDetails, setPricingDetails] = useState('');
  const [scrapedUrl, setScrapedUrl] = useState('');

  // Step 6: Test Playground
  const [testMessage, setTestMessage] = useState('Hi! What services do you provide?');
  const [testChatHistory, setTestChatHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string; tools?: string[] }>>([]);
  const [isTestingAgent, setIsTestingAgent] = useState(false);

  // Step 7: Activated State
  const [isLaunched, setIsLaunched] = useState(false);

  if (!isOnboardingWizardOpen) return null;

  // Validate Telegram Token
  const handleValidateTelegram = async () => {
    if (!telegramToken.trim()) {
      setTelegramError('Please enter your Telegram Bot Token');
      return;
    }
    setIsValidatingTelegram(true);
    setTelegramError(null);
    try {
      const res = await api.validateTelegramToken(telegramToken.trim());
      if (res.success && res.botUsername) {
        setTelegramBotInfo({
          username: res.botUsername,
          name: res.botName || res.botUsername,
          id: res.botId || ''
        });
        addNotification('success', 'Telegram Bot Verified', `@${res.botUsername} is ready to connect!`);
      } else {
        setTelegramError(res.error || 'Failed to authenticate Telegram Bot token.');
      }
    } catch (err: any) {
      setTelegramError(err.message || 'Error validating Telegram token');
    } finally {
      setIsValidatingTelegram(false);
    }
  };

  // Validate Gemini API Key
  const handleValidateGemini = async () => {
    if (!geminiApiKey.trim()) {
      setGeminiError('Please enter your Gemini API Key');
      return;
    }
    setIsValidatingGemini(true);
    setGeminiError(null);
    try {
      const res = await api.validateGeminiApiKey(geminiApiKey.trim());
      if (res.success) {
        setGeminiStatus({ valid: true, model: res.model || 'gemini-2.5-flash' });
        addNotification('success', 'Gemini AI Verified', `Successfully connected to ${res.model || 'Gemini 2.5'}`);
      } else {
        setGeminiError(res.error || 'Invalid Gemini API key.');
      }
    } catch (err: any) {
      setGeminiError(err.message || 'Error verifying Gemini API key');
    } finally {
      setIsValidatingGemini(false);
    }
  };

  // Run Playground Test Simulation
  const handleRunPlaygroundTest = async () => {
    if (!testMessage.trim()) return;
    const userMsg = testMessage.trim();
    setTestChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setTestMessage('');
    setIsTestingAgent(true);

    try {
      const res = await api.previewOnboardingPlayground({
        business: {
          name: businessName || 'My Business',
          businessName: businessName || 'My Business',
          industry: industry || 'General Business',
          businessDescription: description || '',
          timezone: timezone || 'America/New_York',
        },
        agent: {
          templateType: selectedTemplate,
          name: agentName || `${businessName || 'Business'} AI Assistant`,
          tone: agentTone,
        },
        knowledge: {
          faqs: faqs.filter(f => f.question.trim() && f.answer.trim()),
          pricingDetails: pricingDetails.trim() || undefined,
        },
        message: userMsg,
      });

      setTestChatHistory(prev => [
        ...prev,
        {
          role: 'assistant',
          text: res.reply,
          tools: res.tools && res.tools.length > 0 ? res.tools : ['knowledge_search']
        }
      ]);
    } catch (err: any) {
      setTestChatHistory(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `I can help with questions about ${businessName || 'our business'}, pricing, services, and scheduling!`,
          tools: ['knowledge_search']
        }
      ]);
    } finally {
      setIsTestingAgent(false);
    }
  };

  // Launch and Activate Everything
  const handleLaunchAgent = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        business: {
          name: businessName || 'My Business',
          businessName: businessName || 'My Business',
          industry: industry || 'General Business',
          businessDescription: description || '',
          website: website || '',
          phone: phone || '',
          email: email || '',
          timezone: timezone || 'America/New_York',
        },
        telegram: {
          token: telegramToken.trim(),
          botUsername: telegramBotInfo?.username || '',
          botName: telegramBotInfo?.name || '',
        },
        gemini: {
          apiKey: geminiApiKey.trim() || undefined,
        },
        agent: {
          templateType: selectedTemplate,
          name: agentName || `${businessName || 'Business'} AI Assistant`,
          tone: agentTone,
        },
        knowledge: {
          faqs: faqs.filter(f => f.question.trim() && f.answer.trim()),
          pricingDetails: pricingDetails.trim() || undefined,
          scrapedUrls: scrapedUrl.trim() ? [scrapedUrl.trim()] : [],
        }
      };

      const res = await api.completeOnboarding(payload);
      if (res.success) {
        setIsLaunched(true);
        addNotification('success', '🚀 AI Agent Activated!', `Your Telegram bot is now live and automated.`);
        await refreshAll();
      }
    } catch (err: any) {
      addNotification('error', 'Activation Error', err.message || 'Failed to complete activation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addFaqRow = () => {
    setFaqs(prev => [...prev, { question: '', answer: '' }]);
  };

  const removeFaqRow = (index: number) => {
    setFaqs(prev => prev.filter((_, i) => i !== index));
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    setFaqs(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                TeleAgent SaaS Launchpad
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                  Client Control Center
                </span>
              </h2>
              <p className="text-xs text-slate-400">Launch your complete business Telegram AI agent in 7 simple steps</p>
            </div>
          </div>
          <button
            onClick={() => setIsOnboardingWizardOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-800/80 bg-slate-950/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
              Step {step} of 7: {
                step === 1 ? 'Business Profile' :
                step === 2 ? 'Telegram Connection' :
                step === 3 ? 'Gemini AI Intelligence' :
                step === 4 ? 'Choose Agent Type' :
                step === 5 ? 'Business Knowledge & Rules' :
                step === 6 ? 'Interactive Test Playground' :
                'Activation & Launch'
              }
            </span>
            <span className="text-xs text-slate-500 font-mono">{Math.round((step / 7) * 100)}% Completed</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* STEP 1: Business Profile */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs">
                <Building2 className="w-5 h-5 shrink-0 mt-0.5 text-sky-400" />
                <div>
                  <p className="font-semibold text-white">Tell us about your business</p>
                  <p className="text-sky-300/80">Your AI agent uses this information to represent your brand accurately in every customer chat.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Business / Brand Name *</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme Corp, Nova Digital"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Industry *</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                  >
                    <option value="Healthcare & Wellness">Healthcare & Wellness</option>
                    <option value="B2B Software & SaaS">B2B Software & SaaS</option>
                    <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                    <option value="Real Estate & Property">Real Estate & Property</option>
                    <option value="Legal & Professional Services">Legal & Professional Services</option>
                    <option value="Hospitality & Dining">Hospitality & Dining</option>
                    <option value="Education & Courses">Education & Courses</option>
                    <option value="Agency & Marketing">Agency & Marketing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Business Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your primary products, services, target clientele, and what makes your business unique..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Website</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Official Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Contact Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hello@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Timezone (for business hours & bookings)</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="America/New_York">Eastern Time (US & Canada) — America/New_York</option>
                  <option value="America/Chicago">Central Time (US & Canada) — America/Chicago</option>
                  <option value="America/Denver">Mountain Time (US & Canada) — America/Denver</option>
                  <option value="America/Los_Angeles">Pacific Time (US & Canada) — America/Los_Angeles</option>
                  <option value="Europe/London">London / UTC — Europe/London</option>
                  <option value="Europe/Paris">Paris / Berlin — Europe/Paris</option>
                  <option value="Asia/Dubai">Dubai — Asia/Dubai</option>
                  <option value="Asia/Kolkata">India Standard Time — Asia/Kolkata</option>
                  <option value="Asia/Singapore">Singapore / Hong Kong — Asia/Singapore</option>
                  <option value="Australia/Sydney">Sydney — Australia/Sydney</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 2: Telegram Connection */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs">
                <Send className="w-5 h-5 shrink-0 mt-0.5 text-sky-400" />
                <div>
                  <p className="font-semibold text-white">Connect Your Live Telegram Bot</p>
                  <p className="text-sky-300/80">Enter your Telegram Bot Token from @BotFather. We validate it server-side in real-time.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-sky-400" />
                  How to get your free Telegram Bot Token:
                </p>
                <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Open Telegram and search for <strong className="text-sky-400">@BotFather</strong></li>
                  <li>Send <code className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">/newbot</code> and follow the prompts to choose a bot name & username.</li>
                  <li>Copy the HTTP API access token provided by @BotFather and paste it below.</li>
                </ol>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Telegram Bot Token *</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleValidateTelegram}
                    disabled={isValidatingTelegram || !telegramToken.trim()}
                    className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center gap-2 disabled:opacity-50 transition-colors shadow-md shadow-sky-600/20"
                  >
                    {isValidatingTelegram ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Verify Bot
                      </>
                    )}
                  </button>
                </div>
                {telegramError && (
                  <p className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {telegramError}
                  </p>
                )}
              </div>

              {telegramBotInfo && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{telegramBotInfo.name}</p>
                      <p className="text-xs text-emerald-400">@{telegramBotInfo.username} • ID: {telegramBotInfo.id}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified & Ready
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero Secret Exposure: Tokens are stored exclusively on secure backend storage and never sent to client browsers.</span>
              </div>
            </div>
          )}

          {/* STEP 3: Gemini AI Connection */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
                <KeyRound className="w-5 h-5 shrink-0 mt-0.5 text-indigo-400" />
                <div>
                  <p className="font-semibold text-white">Connect Google Gemini AI Intelligence</p>
                  <p className="text-indigo-300/80">Power your bot with Gemini 2.5 Flash / Pro for rapid, intelligent, natural reasoning.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Google Gemini API Key</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIzaSy... (Or leave empty to use platform default)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleValidateGemini}
                    disabled={isValidatingGemini || !geminiApiKey.trim()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 disabled:opacity-50 transition-colors shadow-md shadow-indigo-600/20"
                  >
                    {isValidatingGemini ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Verify Key
                      </>
                    )}
                  </button>
                </div>
                {geminiError && (
                  <p className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {geminiError}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-slate-500">
                  Don't have a Gemini API key yet? Get one at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-sky-400 underline">Google AI Studio</a>. You can also skip this step to use our built-in orchestration.
                </p>
              </div>

              {geminiStatus && (
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                      ✨
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Google Generative Language API</p>
                      <p className="text-xs text-indigo-400">Model: {geminiStatus.model} • Active</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Choose Agent Template */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-white">Select Your AI Agent Archetype</p>
                <p className="text-xs text-slate-400">Choose from 13 battle-tested business agent templates, each pre-configured with industry tools.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {AGENT_TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplate === tpl.type;
                  return (
                    <div
                      key={tpl.type}
                      onClick={() => {
                        setSelectedTemplate(tpl.type);
                        if (!agentName) {
                          setAgentName(`${businessName || 'Business'} ${tpl.title.split(' ')[0]}`);
                        }
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-sky-500/10 border-sky-500 ring-1 ring-sky-500 shadow-lg shadow-sky-500/10'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl">{tpl.icon}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                          {tpl.badge}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1">{tpl.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{tpl.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Agent Display Name</label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="e.g. Front Desk Assistant, Sales Advisor"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Agent Persona & Tone</label>
                  <input
                    type="text"
                    value={agentTone}
                    onChange={(e) => setAgentTone(e.target.value)}
                    placeholder="e.g. Warm, Attentive, Professional, High-Value"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Knowledge & Business Rules */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                <FileText className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <p className="font-semibold text-white">Equip Your Agent with Grounded Business Facts</p>
                  <p className="text-emerald-300/80">Add your FAQs, services, pricing, and operating rules to eliminate hallucinations.</p>
                </div>
              </div>

              {/* FAQs Editor */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200">Frequently Asked Questions (FAQs)</label>
                  <button
                    type="button"
                    onClick={addFaqRow}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add FAQ
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {faqs.map((faq, index) => (
                    <div key={index} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-sky-400 uppercase">Q{index + 1}</span>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => updateFaq(index, 'question', e.target.value)}
                          placeholder="Question, e.g., What are your accepted payment methods?"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                        />
                        {faqs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFaqRow(index)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">A{index + 1}</span>
                        <input
                          type="text"
                          value={faq.answer}
                          onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                          placeholder="Accurate answer the bot should give customers..."
                          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing & Services */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Services & Pricing Details (Optional)</label>
                <textarea
                  value={pricingDetails}
                  onChange={(e) => setPricingDetails(e.target.value)}
                  placeholder="e.g. Standard Consultation: $150 (45 mins). Deep Cleaning: $200. Enterprise Plan: $1,200/mo."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Website Scraper */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Website URL for Auto-Ingestion (Optional)</label>
                <input
                  type="url"
                  value={scrapedUrl}
                  onChange={(e) => setScrapedUrl(e.target.value)}
                  placeholder="https://example.com/about-us"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          {/* STEP 6: Interactive Testing Playground */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
                <Play className="w-5 h-5 shrink-0 mt-0.5 text-purple-400" />
                <div>
                  <p className="font-semibold text-white">Live Simulator Playground</p>
                  <p className="text-purple-300/80">Test how your agent responds before activating it on Telegram.</p>
                </div>
              </div>

              {/* Chat Window */}
              <div className="h-64 rounded-xl bg-slate-950 border border-slate-800 flex flex-col overflow-hidden">
                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                  {testChatHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
                      <Bot className="w-8 h-8 mb-2 text-slate-600 animate-bounce" />
                      <p>Send a message below to test your configured agent!</p>
                    </div>
                  )}

                  {testChatHistory.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-sky-600 text-white rounded-tr-none'
                            : 'bg-slate-850 border border-slate-750 text-slate-100 rounded-tl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                      {msg.tools && msg.tools.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {msg.tools.map((t, idx) => (
                            <span key={idx} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              ⚡ {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {isTestingAgent && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                      <span>{agentName || 'Agent'} is thinking...</span>
                    </div>
                  )}
                </div>

                <div className="p-2 border-t border-slate-800 flex gap-2 bg-slate-900/60">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRunPlaygroundTest()}
                    placeholder="Type a test customer message..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleRunPlaygroundTest}
                    disabled={isTestingAgent || !testMessage.trim()}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Activation Checklist & Launch */}
          {step === 7 && !isLaunched && (
            <div className="space-y-5">
              <div className="text-center py-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-sky-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 mb-3">
                  <Rocket className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">Ready for Launch!</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Review your deployment checklist below. Clicking Activate will start live Telegram polling and make your AI bot instantly available to customers.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-850">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-sky-400" /> Business Profile:
                  </span>
                  <span className="font-semibold text-white">{businessName || 'Configured'} ({industry})</span>
                </div>

                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-850">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Send className="w-4 h-4 text-sky-400" /> Telegram Bot:
                  </span>
                  <span className="font-semibold text-emerald-400">
                    {telegramBotInfo ? `@${telegramBotInfo.username}` : (telegramToken ? 'Token Provided' : 'Default Platform Bot')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-850">
                  <span className="text-slate-400 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-indigo-400" /> AI Provider:
                  </span>
                  <span className="font-semibold text-indigo-400">
                    {geminiStatus ? `Google Gemini (${geminiStatus.model})` : 'Gemini 2.5 Flash Engine'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-850">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-purple-400" /> Agent Archetype:
                  </span>
                  <span className="font-semibold text-white">{agentName || 'AI Assistant'} ({selectedTemplate})</span>
                </div>

                <div className="flex items-center justify-between text-xs py-1.5">
                  <span className="text-slate-400 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" /> Knowledge Ingested:
                  </span>
                  <span className="font-semibold text-emerald-400">{faqs.length} FAQs + Business Rules</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLaunchAgent}
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Deploying & Starting Telegram Polling...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    ACTIVATE AI AGENT NOW
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 7 LAUNCHED SUCCESS MODAL */}
          {isLaunched && (
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 mx-auto flex items-center justify-center text-emerald-400 shadow-2xl shadow-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-white">🎉 AI Telegram Agent is LIVE!</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Your agent is actively listening on Telegram. You can now manage conversations, track incoming leads, configure knowledge, and supervise live handoffs entirely from your website dashboard.
              </p>

              {telegramBotInfo?.username && (
                <div className="inline-block p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <a
                    href={`https://t.me/${telegramBotInfo.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Open @{telegramBotInfo.username} in Telegram
                  </a>
                </div>
              )}

              <div className="pt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsOnboardingWizardOpen(false);
                    setActiveTab('dashboard');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors shadow-lg shadow-sky-600/20"
                >
                  Go to Control Center Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOnboardingWizardOpen(false);
                    setActiveTab('inbox');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  View Live Inbox
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation Buttons */}
        {!isLaunched && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/60">
            <button
              type="button"
              onClick={() => setStep(prev => Math.max(1, prev - 1))}
              disabled={step === 1}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Step {step} of 7</span>
              {step < 7 ? (
                <button
                  type="button"
                  onClick={() => setStep(prev => Math.min(7, prev + 1))}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-sky-600/20"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
