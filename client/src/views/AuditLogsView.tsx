import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { AuditLog } from '../types';
import { api } from '../api/client';
import {
  ShieldCheck,
  AlertTriangle,
  Info,
  ShieldAlert,
  Search,
  RefreshCw,
  Lock,
  Zap
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { currentTenant, addNotification } = useApp();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const loadLogs = async () => {
    if (!currentTenant) return;
    try {
      const res = await api.getAuditLogs(currentTenant.id);
      setLogs(res.logs);
    } catch (err: any) {
      addNotification('error', 'Failed to load audit logs', err.message);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [currentTenant]);

  const filteredLogs = logs.filter(l => {
    const matchesSearch = l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.eventType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || l.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const getSeverityBadge = (severity: AuditLog['severity']) => {
    switch (severity) {
      case 'security':
        return { label: 'SECURITY', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: ShieldAlert };
      case 'error':
        return { label: 'ERROR', color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: AlertTriangle };
      case 'warn':
        return { label: 'WARNING', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: AlertTriangle };
      default:
        return { label: 'INFO', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30', icon: Info };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Security, Rate Limiting & Tool Auditing</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          Safety & Audit Logs
        </h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Real-time security audit trails for rate limits, permission checks, tool invocations, and human handoffs.
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
            placeholder="Search audit events..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
          />
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-none"
        >
          <option value="ALL">All Severities</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
          <option value="security">Security</option>
        </select>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
          <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-bold text-base text-slate-200">No audit events recorded</h3>
          <p className="text-sm text-slate-400">Security guardrails, rate-limit triggers, and tool execution logs will be streamed here in real time.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-850 border border-slate-750 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-xs border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Severity</th>
                  <th className="p-3.5">Event Type</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5">Agent / Context</th>
                  <th className="p-3.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredLogs.map(log => {
                  const badge = getSeverityBadge(log.severity);
                  const Icon = badge.icon;

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-md border ${badge.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          <span>{badge.label}</span>
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-slate-100">{log.eventType}</td>
                      <td className="p-3.5 text-slate-200 max-w-md">{log.description}</td>
                      <td className="p-3.5 font-mono text-slate-400">{log.agentId || 'Workspace Global'}</td>
                      <td className="p-3.5 text-right font-mono text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
