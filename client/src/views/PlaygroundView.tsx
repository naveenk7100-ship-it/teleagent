import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Agent, AgentExecutionResult, ChatMessage } from '../types';
import { api } from '../api/client';
import {
  Send,
  Bot,
  User,
  Sparkles,
  PlayCircle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  Sliders,
  Layers,
  Calendar,
  LifeBuoy,
  Users,
  Zap,
  Info
} from 'lucide-react';

export const PlaygroundView: React.FC = () => {
  const { agents, currentAgent, setCurrentAgent, currentTenant, addNotification } = useApp();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentAgent?.id || agents[0]?.id || '');
  const [testerName, setTesterName] = useState('Test User');
  const [testerId, setTesterId] = useState('tester_web_01');
  const [latestResult, setLatestResult] = useState<AgentExecutionResult | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || currentAgent || agents[0];

  useEffect(() => {
    if (selectedAgent && (!messages.length || messages[0]?.metadata?.agentId !== selectedAgent.id)) {
      // Welcome message based on agent type
      setMessages([
        {
          id: 'welcome-01',
          role: 'assistant',
          content: getAgentGreeting(selectedAgent),
          timestamp: new Date().toISOString(),
          metadata: { agentId: selectedAgent.id },
        }
      ]);
      setLatestResult(null);
    }
  }, [selectedAgent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  function getAgentGreeting(agent: Agent) {
    if (agent.type === 'AI_RECEPTIONIST') {
      return `Hello and welcome to **${agent.businessName}**! 👋\nI am ${agent.name}, your digital receptionist.\n\nI can help you check our services & pricing, answer clinic hours/locations, or schedule an appointment request.\n\nHow can I help you today?`;
    }
    if (agent.type === 'SALES_AGENT') {
      return `Hello! Welcome to **${agent.businessName}**. 🚀\nI am ${agent.name}, your solutions advisor. What goals or requirements is your team looking to tackle?`;
    }
    if (agent.type === 'CUSTOMER_SUPPORT') {
      return `Hello! Welcome to **${agent.businessName} Support Desk**. 🛠️\nI am ${agent.name}. How can I assist you with your account, service, or issue today?`;
    }
    return `Hello! I am ${agent.name} for **${agent.businessName}**. How may I assist you today?`;
  }

  const handleSendMessage = async (customText?: string) => {
    const text = customText || inputText;
    if (!text.trim() || isLoading || !selectedAgent) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const result = await api.sendPlaygroundMessage({
        tenantId: currentTenant?.id || selectedAgent.tenantId,
        agentId: selectedAgent.id,
        message: text,
        userId: testerId,
        username: testerName,
      });

      setLatestResult(result);

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: result.reply,
        timestamp: new Date().toISOString(),
        toolCalls: result.toolExecutions.map(t => ({ toolName: t.toolName, input: t.input })),
        toolResults: result.toolExecutions.map(t => ({ toolName: t.toolName, output: t.output, status: t.status })),
        executionSteps: result.executionSteps,
        metadata: {
          responseTimeMs: result.responseTimeMs,
          tokens: result.tokensUsed,
          handoffTriggered: result.handoffTriggered,
          outOfHoursTriggered: result.outOfHours,
          createdLeadId: result.leadCreated?.id,
          createdTicketId: result.ticketCreated?.id,
          createdBookingId: result.bookingCreated?.id,
        }
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      addNotification('error', 'Execution Error', err.message);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Error processing interaction: ${err.message}`,
          timestamp: new Date().toISOString(),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    if (selectedAgent) {
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: getAgentGreeting(selectedAgent),
          timestamp: new Date().toISOString(),
          metadata: { agentId: selectedAgent.id },
        }
      ]);
      setLatestResult(null);
      addNotification('info', 'Playground reset', 'Conversation context cleared.');
    }
  };

  const quickPrompts = [
    'Hi, I would like to book an appointment for tomorrow.',
    'What are your services, pricing, and office hours?',
    'I have a billing issue and need to talk to a manager.',
    'I want to speak with a human support representative.',
    'Where is your clinic located and is there parking?',
    'We have 15 team members and want to purchase a growth plan.'
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-4.5rem)] flex flex-col gap-4 animate-fade-in">
      {/* Playground Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-850 border border-slate-750 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <PlayCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <span>Agent Testing Playground</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Live Simulation</span>
            </h1>
            <p className="text-xs text-slate-400">Test multi-agent reasoning, knowledge grounding, and structured CRM/booking tool actions safely.</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5">
          <select
            value={selectedAgentId}
            onChange={(e) => {
              setSelectedAgentId(e.target.value);
              const found = agents.find(a => a.id === e.target.value);
              if (found) setCurrentAgent(found);
            }}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-100 focus:outline-none focus:border-sky-500 max-w-[220px]"
          >
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
            ))}
          </select>

          <button
            onClick={handleResetChat}
            title="Reset Chat"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Chat simulator on Left, Live Execution Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* LEFT: Telegram Chat Simulator (7 cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          {/* Chat Header */}
          <div className="p-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center font-bold text-xs">
                {selectedAgent?.name?.charAt(0) || 'A'}
              </div>
              <div>
                <div className="font-bold text-xs text-slate-100">{selectedAgent?.name}</div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Online • {selectedAgent?.type}</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400">
              Testing as: <strong className="text-slate-200">{testerName}</strong>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/40">
            {messages.map((m) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                >
                  {isAssistant && (
                    <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-2`}>
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                        isAssistant
                          ? 'bg-slate-850 border border-slate-750 text-slate-100 rounded-tl-none shadow-md'
                          : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-tr-none shadow-lg shadow-sky-500/20'
                      }`}
                    >
                      {m.content}
                    </div>

                    {/* Metadata & Actions Triggered */}
                    {isAssistant && m.metadata && (
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 px-1 flex-wrap">
                        {m.metadata.responseTimeMs && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{m.metadata.responseTimeMs}ms</span>
                          </span>
                        )}
                        {m.metadata.tokens && (
                          <span>• {m.metadata.tokens} tokens</span>
                        )}
                        {m.metadata.handoffTriggered && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                            Human Handoff Triggered
                          </span>
                        )}
                        {m.metadata.createdLeadId && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                            Lead Logged #{m.metadata.createdLeadId}
                          </span>
                        )}
                        {m.metadata.createdBookingId && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                            Booking Request #{m.metadata.createdBookingId}
                          </span>
                        )}
                        {m.metadata.createdTicketId && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            Support Ticket #{m.metadata.createdTicketId}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {!isAssistant && (
                    <div className="w-7 h-7 rounded-lg bg-slate-750 text-slate-300 flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-3 rounded-2xl bg-slate-850 border border-slate-750 rounded-tl-none flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 bg-slate-900 border-t border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="text-slate-500 font-semibold shrink-0">Quick Test:</span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-750 whitespace-nowrap transition-colors truncate max-w-[200px]"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-slate-850 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={`Message ${selectedAgent?.name || 'agent'}...`}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputText.trim()}
              className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/25 transition-transform active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIGHT: Live Execution & Tool Inspector (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col justify-between overflow-y-auto space-y-4 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Execution Inspector</h3>
              </div>
              <span className="text-[10px] text-slate-400">Safe Observability</span>
            </div>

            {/* Step by step timeline */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Agent Pipeline Steps
              </h4>

              {latestResult && latestResult.executionSteps.length > 0 ? (
                <div className="space-y-2">
                  {latestResult.executionSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-850 border border-slate-750 flex items-start gap-2 text-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-200">{step.title}</div>
                        {step.detail && <div className="text-[11px] text-slate-400 mt-0.5">{step.detail}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-850/50 border border-slate-800 text-center text-xs text-slate-500">
                  Send a message to view the agent execution steps.
                </div>
              )}
            </div>

            {/* Action Cards for Tools */}
            {latestResult && (latestResult.leadCreated || latestResult.bookingCreated || latestResult.ticketCreated) && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Structured Actions Created
                </h4>

                {latestResult.leadCreated && (
                  <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        CRM Lead Created
                      </span>
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                        Stage: {latestResult.leadCreated.stage} (Score: {latestResult.leadCreated.score}/100)
                      </span>
                    </div>
                    <div className="text-slate-300 font-semibold">{latestResult.leadCreated.fullName}</div>
                    <div className="text-[11px] text-slate-400">Service: {latestResult.leadCreated.serviceRequested}</div>
                  </div>
                )}

                {latestResult.bookingCreated && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Appointment Request Logged
                      </span>
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        {latestResult.bookingCreated.status}
                      </span>
                    </div>
                    <div className="text-slate-200">
                      <strong>{latestResult.bookingCreated.customerName}</strong> for {latestResult.bookingCreated.serviceName}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      📅 Date: {latestResult.bookingCreated.requestedDate} @ {latestResult.bookingCreated.requestedTime}
                    </div>
                  </div>
                )}

                {latestResult.ticketCreated && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400 flex items-center gap-1.5">
                        <LifeBuoy className="w-3.5 h-3.5" />
                        Support Ticket Filed
                      </span>
                      <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        Priority: {latestResult.ticketCreated.priority}
                      </span>
                    </div>
                    <div className="text-slate-200 font-medium">#{latestResult.ticketCreated.id} - {latestResult.ticketCreated.subject}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Guardrails Info Footer */}
          <div className="p-3 rounded-xl bg-slate-850 border border-slate-750 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Anti-Hallucination & Secret Shield</span>
            </div>
            <p>Hidden chain-of-thought is safely sequestered. Secrets & bot tokens are dynamically redacted.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
