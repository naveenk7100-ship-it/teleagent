import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Lead, LeadStage } from '../types';
import { api } from '../api/client';
import {
  Users,
  Plus,
  Search,
  Filter,
  Flame,
  Phone,
  Mail,
  Building,
  DollarSign,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Tag
} from 'lucide-react';

const STAGES: Array<{ id: LeadStage; label: string; color: string; border: string }> = [
  { id: 'NEW', label: 'New Inquiries', color: 'bg-slate-700/30 text-slate-300', border: 'border-slate-700' },
  { id: 'QUALIFYING', label: 'Qualifying', color: 'bg-blue-500/15 text-blue-400', border: 'border-blue-500/30' },
  { id: 'QUALIFIED', label: 'Qualified (High Fit)', color: 'bg-emerald-500/15 text-emerald-400', border: 'border-emerald-500/30' },
  { id: 'FOLLOW_UP', label: 'Follow Up', color: 'bg-amber-500/15 text-amber-400', border: 'border-amber-500/30' },
  { id: 'CONVERTED', label: 'Converted Deals', color: 'bg-purple-500/15 text-purple-400', border: 'border-purple-500/30' },
  { id: 'LOST', label: 'Lost / Inactive', color: 'bg-rose-500/15 text-rose-400', border: 'border-rose-500/30' },
];

export const LeadsPipelineView: React.FC = () => {
  const { currentTenant, agents, addNotification } = useApp();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // New Lead Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadService, setNewLeadService] = useState('');
  const [newLeadScore, setNewLeadScore] = useState(70);
  const [newLeadStage, setNewLeadStage] = useState<LeadStage>('NEW');

  const loadLeads = async () => {
    if (!currentTenant) return;
    try {
      const res = await api.getLeads(currentTenant.id);
      setLeads(res.leads);
    } catch (err: any) {
      addNotification('error', 'Failed to load leads', err.message);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [currentTenant]);

  const handleStageChange = async (leadId: string, newStage: LeadStage) => {
    try {
      const updated = await api.updateLead(leadId, { stage: newStage });
      addNotification('success', `Moved lead to ${newStage}`);
      setLeads(prev => prev.map(l => l.id === leadId ? updated.lead : l));
      if (selectedLead?.id === leadId) setSelectedLead(updated.lead);
    } catch (err: any) {
      addNotification('error', 'Failed to update lead', err.message);
    }
  };

  const handleCreateLead = async () => {
    if (!newLeadName.trim() || !currentTenant) return;

    try {
      const res = await api.createLead({
        tenantId: currentTenant.id,
        fullName: newLeadName,
        phone: newLeadPhone,
        email: newLeadEmail,
        serviceRequested: newLeadService,
        score: newLeadScore,
        stage: newLeadStage,
      });

      addNotification('success', `Created lead for ${newLeadName}`);
      setIsAddModalOpen(false);
      setNewLeadName('');
      setNewLeadPhone('');
      setNewLeadEmail('');
      setNewLeadService('');
      loadLeads();
    } catch (err: any) {
      addNotification('error', 'Failed to create lead', err.message);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm('Delete this lead record?')) return;
    try {
      await api.deleteLead(id);
      addNotification('success', 'Lead record deleted');
      if (selectedLead?.id === id) setSelectedLead(null);
      loadLeads();
    } catch (err: any) {
      addNotification('error', 'Failed to delete lead', err.message);
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.company && l.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.serviceRequested && l.serviceRequested.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesAgent = selectedAgentFilter === 'ALL' || l.agentId === selectedAgentFilter;
    return matchesSearch && matchesAgent;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in h-[calc(100vh-4.5rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold">
            <Users className="w-3.5 h-3.5" />
            <span>AI Automated Pipeline</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Leads & Revenue CRM
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/25 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by name or service..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedAgentFilter}
            onChange={(e) => setSelectedAgentFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Generating Agents</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5 flex-1 min-h-0 overflow-x-auto pb-2">
        {STAGES.map(stage => {
          const stageLeads = filteredLeads.filter(l => l.stage === stage.id);

          return (
            <div
              key={stage.id}
              className="flex flex-col rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden min-w-[240px]"
            >
              {/* Stage Column Header */}
              <div className="p-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${stage.color} ${stage.border}`}>
                  {stage.label}
                </span>
                <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full">{stageLeads.length}</span>
              </div>

              {/* Lead Cards List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {stageLeads.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No leads in this stage
                  </div>
                ) : (
                  stageLeads.map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="p-3.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 hover:border-sky-500/40 cursor-pointer transition-all space-y-2.5 group shadow-md"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className="font-bold text-sm text-slate-100 group-hover:text-sky-300 transition-colors truncate">
                          {lead.fullName}
                        </h4>
                        <div className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0 ${
                          lead.score >= 80 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          lead.score >= 50 ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                          'bg-slate-700 text-slate-400'
                        }`}>
                          <Flame className="w-3 h-3" />
                          <span>{lead.score}</span>
                        </div>
                      </div>

                      {lead.serviceRequested && (
                        <div className="text-xs text-slate-300 truncate">
                          🎯 <span className="font-medium">{lead.serviceRequested}</span>
                        </div>
                      )}

                      {lead.company && (
                        <div className="text-xs text-slate-400 truncate">
                          🏢 <span>{lead.company}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-750/60 flex items-center justify-between text-xs text-slate-400 font-mono">
                        <span className="truncate max-w-[130px]">{lead.phone || lead.email || `@${lead.telegramUsername || 'user'}`}</span>
                        <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lead Detail Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center font-bold">
                  {selectedLead.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedLead.fullName}</h3>
                  <p className="text-xs text-slate-400">Lead ID: #{selectedLead.id}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLead(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-850 border border-slate-750 space-y-1">
                  <span className="text-slate-400">Current Stage</span>
                  <select
                    value={selectedLead.stage}
                    onChange={(e) => handleStageChange(selectedLead.id, e.target.value as LeadStage)}
                    className="w-full p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-sky-400 font-bold focus:outline-none"
                  >
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-slate-850 border border-slate-750 space-y-1">
                  <span className="text-slate-400">Lead Score</span>
                  <div className="text-base font-black text-emerald-400 flex items-center gap-1">
                    <Flame className="w-4 h-4" />
                    <span>{selectedLead.score} / 100</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-850 border border-slate-750 space-y-2 text-slate-300">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-sky-400" />
                  <span>Phone: <strong>{selectedLead.phone || 'Not provided'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-sky-400" />
                  <span>Email: <strong>{selectedLead.email || 'Not provided'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-sky-400" />
                  <span>Company: <strong>{selectedLead.company || 'N/A'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>Requested Service: <strong>{selectedLead.serviceRequested || 'General Inquiry'}</strong></span>
                </div>
              </div>

              {selectedLead.notes && selectedLead.notes.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-850 border border-slate-750 space-y-1.5">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">AI Qualification Notes</span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300">
                    {selectedLead.notes.map((n, idx) => (
                      <li key={idx}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => handleDeleteLead(selectedLead.id)}
                className="flex items-center gap-1 text-rose-400 hover:text-rose-300 text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Lead</span>
              </button>

              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create New Lead</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                  placeholder="lead@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Requested Service / Package</label>
                <input
                  type="text"
                  value={newLeadService}
                  onChange={(e) => setNewLeadService(e.target.value)}
                  placeholder="e.g. Growth Tier SaaS / Dental Checkup"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 text-xs"
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
                onClick={handleCreateLead}
                disabled={!newLeadName.trim()}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md disabled:opacity-50"
              >
                Save Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
