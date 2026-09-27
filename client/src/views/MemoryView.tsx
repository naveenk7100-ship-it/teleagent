import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { AgentMemoryItem, MemoryLevel } from '../types';
import { api } from '../api/client';
import {
  Brain,
  Plus,
  Trash2,
  Edit2,
  Search,
  Building,
  User,
  MessageSquare,
  Sliders,
  CheckCircle2,
  Shield,
  Info
} from 'lucide-react';

export const MemoryView: React.FC = () => {
  const { currentTenant, agents, addNotification } = useApp();

  const [memories, setMemories] = useState<AgentMemoryItem[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<MemoryLevel | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Add memory modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newLevel, setNewLevel] = useState<MemoryLevel>('business');
  const [newUserId, setNewUserId] = useState('');

  const loadMemories = async () => {
    if (!currentTenant) return;
    try {
      const res = await api.getMemories(currentTenant.id);
      setMemories(res.memories);
    } catch (err: any) {
      addNotification('error', 'Failed to load memories', err.message);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [currentTenant]);

  const handleCreateMemory = async () => {
    if (!newKey.trim() || !newValue.trim() || !currentTenant) return;

    try {
      await api.createMemory({
        tenantId: currentTenant.id,
        level: newLevel,
        key: newKey,
        value: newValue,
        userId: newUserId ? newUserId : undefined,
      });

      addNotification('success', `Saved ${newKey} to ${newLevel} memory`);
      setIsAddModalOpen(false);
      setNewKey('');
      setNewValue('');
      setNewUserId('');
      loadMemories();
    } catch (err: any) {
      addNotification('error', 'Failed to save memory', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMemory(id);
      addNotification('success', 'Memory fact removed');
      loadMemories();
    } catch (err: any) {
      addNotification('error', 'Delete failed', err.message);
    }
  };

  const filteredMemories = memories.filter(m => {
    const matchesSearch = m.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.value.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === 'ALL' || m.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  const getLevelBadge = (level: MemoryLevel) => {
    switch (level) {
      case 'business':
        return { label: 'Tier 3: Business Memory', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Building };
      case 'user':
        return { label: 'Tier 2: User Memory', color: 'bg-sky-500/15 text-sky-400 border-sky-500/30', icon: User };
      case 'conversation':
        return { label: 'Tier 1: Conversation Context', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: MessageSquare };
      case 'agent_config':
        return { label: 'Tier 4: Agent Configuration', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Sliders };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
            <Brain className="w-3.5 h-3.5" />
            <span>4-Tier Memory Architecture</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Agent Memory & Fact Store
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Inspect, edit, and manage persistent memory across Conversation, User, Business, and Agent Configuration tiers with privacy controls.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/25 transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Memory Fact</span>
        </button>
      </div>

      {/* Tier Explanation Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-750 space-y-1">
          <div className="text-xs font-bold text-purple-400">Tier 1: Conversation</div>
          <p className="text-[11px] text-slate-400">Short-term dialogue thread context & temporary state.</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-750 space-y-1">
          <div className="text-xs font-bold text-sky-400">Tier 2: User Profile</div>
          <p className="text-[11px] text-slate-400">User preferences, names, contact numbers, & history.</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-750 space-y-1">
          <div className="text-xs font-bold text-emerald-400">Tier 3: Business Facts</div>
          <p className="text-[11px] text-slate-400">Shared business rules, special discounts, & policies.</p>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-750 space-y-1">
          <div className="text-xs font-bold text-amber-400">Tier 4: Agent Config</div>
          <p className="text-[11px] text-slate-400">Role instructions, permitted tools, & guardrails.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memory keys or values..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full sm:w-auto">
          {['ALL', 'business', 'user', 'conversation', 'agent_config'].map(level => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedLevel === level
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750 border border-slate-700/60'
              }`}
            >
              {level === 'ALL' ? 'All Tiers' : level.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Items Grid */}
      {filteredMemories.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
          <Brain className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-bold text-slate-200">No memory items found</h3>
          <p className="text-xs text-slate-400">Memories auto-extracted from users or configured by admins will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMemories.map(m => {
            const badge = getLevelBadge(m.level);
            const Icon = badge.icon;

            return (
              <div
                key={m.id}
                className="p-4 rounded-2xl bg-slate-850/90 border border-slate-750 flex flex-col justify-between space-y-3 group shadow-lg shadow-black/20"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.color}`}>
                      <Icon className="w-3 h-3" />
                      <span>{badge.label}</span>
                    </span>

                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Delete memory item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-xs font-mono font-bold text-sky-400 truncate">
                    key: {m.key}
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800 font-mono whitespace-pre-wrap">
                    {m.value}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                  <span>{m.userId ? `User: ${m.userId}` : 'Global for Tenant'}</span>
                  <span>{new Date(m.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Memory Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add Persistent Memory Fact</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Memory Tier</label>
                <select
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value as MemoryLevel)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                >
                  <option value="business">Tier 3: Business Memory (Shared by all agents)</option>
                  <option value="user">Tier 2: User Memory (Associated with specific user)</option>
                  <option value="conversation">Tier 1: Conversation Context</option>
                  <option value="agent_config">Tier 4: Agent Configuration</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Key Name</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="e.g. vip_patient_policy, preferred_parking"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Memory Value</label>
                <textarea
                  rows={4}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Enter the persistent factual instruction..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500 font-mono leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMemory}
                disabled={!newKey.trim() || !newValue.trim()}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md disabled:opacity-50"
              >
                Save Memory Fact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
