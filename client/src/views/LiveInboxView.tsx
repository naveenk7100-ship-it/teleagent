import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { ConversationThread, ChatMessage } from '../types';
import { api } from '../api/client';
import {
  MessageSquare,
  UserCheck,
  Send,
  Bot,
  User,
  PauseCircle,
  PlayCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  RefreshCw,
  Search
} from 'lucide-react';

export const LiveInboxView: React.FC = () => {
  const { currentTenant, addNotification } = useApp();

  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [operatorName, setOperatorName] = useState('Senior Staff Rep');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    if (!currentTenant) return;
    try {
      const res = await api.getConversations(currentTenant.id);
      setConversations(res.conversations);
      if (!selectedConvId && res.conversations.length > 0) {
        setSelectedConvId(res.conversations[0].id);
      }
    } catch (err: any) {
      addNotification('error', 'Failed to load conversations', err.message);
    }
  };

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [currentTenant]);

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConv?.messages]);

  const handleToggleHandoff = async (active: boolean) => {
    if (!selectedConv) return;
    // Optimistic UI update
    setConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, handoffActive: active } : c));

    try {
      if (!active) {
        const res = await api.resumeConversation(selectedConv.id);
        addNotification('success', 'Bot automation resumed successfully.');
        if (res.conversation) {
          setConversations(prev => prev.map(c => c.id === selectedConv.id ? res.conversation : c));
        }
      } else {
        const res = await api.toggleHandoff(selectedConv.id, true);
        addNotification('success', 'Live human takeover active. Bot paused.');
        if (res.conversation) {
          setConversations(prev => prev.map(c => c.id === selectedConv.id ? res.conversation : c));
        }
      }
      loadConversations();
    } catch (err: any) {
      addNotification('error', 'Failed to update handoff state', err.message);
      loadConversations();
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConv || isSending) return;
    setIsSending(true);

    try {
      await api.replyAsHuman(selectedConv.id, replyText, operatorName);
      addNotification('success', 'Message sent to user via Telegram');
      setReplyText('');
      loadConversations();
    } catch (err: any) {
      addNotification('error', 'Failed to send message', err.message);
    } finally {
      setIsSending(false);
    }
  };

  const filteredConvs = conversations.filter(c => {
    const name = c.telegramUsername || c.telegramUserId;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-4.5rem)] flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Real-Time Operator Takeover Desk</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Live Inbox & Human Handoff
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            placeholder="Operator Display Name"
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-semibold focus:outline-none"
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left: Threads List (4 cols) */}
        <div className="md:col-span-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col overflow-hidden shadow-xl">
          <div className="p-3.5 bg-slate-850 border-b border-slate-800 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter chats by user or ID..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {filteredConvs.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-slate-400">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No active conversations yet</p>
                <p className="text-xs text-slate-500">Chats from Telegram or Playground will appear here in real time.</p>
              </div>
            ) : (
              filteredConvs.map(conv => {
                const isSelected = selectedConvId === conv.id;
                const lastMsg = conv.messages[conv.messages.length - 1];

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full p-3.5 rounded-xl text-left transition-all space-y-1.5 border ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-500/40 text-slate-100 shadow-md'
                        : 'bg-slate-850/70 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-100 truncate max-w-[140px]">
                        @{conv.telegramUsername || conv.telegramUserId}
                      </span>

                      {conv.handoffActive ? (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                          HUMAN HANDOFF
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          BOT ACTIVE
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {lastMsg ? lastMsg.content : 'No messages'}
                    </p>

                    <div className="text-xs text-slate-400 font-mono">
                      {new Date(conv.lastMessageAt).toLocaleTimeString()}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Chat & Takeover Controller (8 cols) */}
        <div className="md:col-span-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col overflow-hidden shadow-xl">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-750 border border-slate-700 flex items-center justify-center font-bold text-sm text-sky-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-slate-100">
                        @{selectedConv.telegramUsername || selectedConv.telegramUserId}
                      </span>
                      {selectedConv.handoffActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                          <PauseCircle className="w-3.5 h-3.5" />
                          HUMAN HANDOFF
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <Bot className="w-3.5 h-3.5" />
                          BOT ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      Chat ID: {selectedConv.telegramChatId} • {selectedConv.isPlayground ? 'Playground Session' : 'Live Telegram Bot'}
                    </div>
                  </div>
                </div>

                {/* Takeover / Resume Button */}
                <div className="flex items-center gap-2">
                  {selectedConv.handoffActive ? (
                    <button
                      onClick={() => handleToggleHandoff(false)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Resume Bot</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleHandoff(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-500/20 transition-all hover:scale-[1.02]"
                    >
                      <PauseCircle className="w-4 h-4" />
                      <span>Take Over Conversation</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/40">
                {selectedConv.messages.map((m) => {
                  const isUser = m.role === 'user';
                  const isHumanOp = m.role === 'human_operator';

                  return (
                    <div
                      key={m.id}
                      className={`flex gap-3 ${isUser ? 'justify-start' : 'justify-end'}`}
                    >
                      {!isUser && (
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold mt-1 ${
                          isHumanOp ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        }`}>
                          {isHumanOp ? <UserCheck className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                      )}

                      <div className={`max-w-[80%] space-y-1`}>
                        <div
                          className={`p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                            isUser
                              ? 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none'
                              : isHumanOp
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none shadow-lg'
                              : 'bg-slate-850 border border-slate-750 text-slate-100 rounded-tr-none'
                          }`}
                        >
                          {m.content}
                        </div>
                        <div className="text-xs text-slate-400 px-1">
                          {isHumanOp ? `Sent by ${m.metadata?.operatorName || 'Staff'}` : new Date(m.timestamp).toLocaleTimeString()}
                        </div>
                      </div>

                      {isUser && (
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Human Reply Composer */}
              <div className="p-3.5 bg-slate-850 border-t border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                  placeholder={`Reply as ${operatorName} (delivers directly to user on Telegram)...`}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-750 text-slate-100 text-sm focus:outline-none focus:border-purple-500 placeholder-slate-400"
                />
                <button
                  onClick={handleSendReply}
                  disabled={isSending || !replyText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-sm shadow-md shadow-purple-500/25 transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2 text-slate-400">
              <MessageSquare className="w-10 h-10 text-slate-600 mb-1" />
              <p className="text-sm font-semibold text-slate-300">No conversation selected</p>
              <p className="text-xs text-slate-500 max-w-sm">Select a conversation from the left to view message history, monitor live AI responses, or take over with live human support.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
