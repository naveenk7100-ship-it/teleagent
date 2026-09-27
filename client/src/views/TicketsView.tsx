import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { SupportTicket, TicketPriority, TicketStatus } from '../types';
import { api } from '../api/client';
import {
  LifeBuoy,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  Trash2,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';

export const TicketsView: React.FC = () => {
  const { currentTenant, addNotification } = useApp();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const loadTickets = async () => {
    if (!currentTenant) return;
    try {
      const res = await api.getTickets(currentTenant.id);
      setTickets(res.tickets);
    } catch (err: any) {
      addNotification('error', 'Failed to load tickets', err.message);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [currentTenant]);

  const handleUpdateStatus = async (id: string, status: TicketStatus) => {
    try {
      const updated = await api.updateTicket(id, { status });
      addNotification('success', `Ticket marked as ${status}`);
      setTickets(prev => prev.map(t => t.id === id ? updated.ticket : t));
    } catch (err: any) {
      addNotification('error', 'Update failed', err.message);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case 'URGENT':
        return { label: 'URGENT', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
      case 'HIGH':
        return { label: 'HIGH', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'MEDIUM':
        return { label: 'MEDIUM', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      default:
        return { label: 'LOW', color: 'bg-slate-700/40 text-slate-400 border-slate-700' };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
          <LifeBuoy className="w-3.5 h-3.5" />
          <span>Automated Support Ticketing</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          Support & Escalation Tickets
        </h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Track issues, technical inquiries, billing disputes, and human escalations filed by your Customer Support agents.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets by subject..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
          />
        </div>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-none"
        >
          <option value="ALL">All Priorities</option>
          <option value="URGENT">Urgent Priority</option>
          <option value="HIGH">High Priority</option>
          <option value="MEDIUM">Medium Priority</option>
          <option value="LOW">Low Priority</option>
        </select>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
          <LifeBuoy className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-bold text-base text-slate-200">No support tickets found</h3>
          <p className="text-sm text-slate-400">Support tickets filed by your agents or human escalations will be tracked here in real time.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredTickets.map(t => {
            const priorityBadge = getPriorityBadge(t.priority);

            return (
              <div
                key={t.id}
                className="p-5 rounded-2xl bg-slate-850/90 border border-slate-750 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-black/20"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${priorityBadge.color}`}>
                      {priorityBadge.label}
                    </span>
                    <span className="text-xs font-bold text-slate-400 font-mono">#{t.id}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-750 font-medium">
                      {t.category}
                    </span>
                    {t.escalated && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 animate-pulse">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Escalated to Staff</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-100">{t.subject}</h3>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">{t.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <select
                    value={t.status}
                    onChange={(e) => handleUpdateStatus(t.id, e.target.value as TicketStatus)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm font-bold text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
