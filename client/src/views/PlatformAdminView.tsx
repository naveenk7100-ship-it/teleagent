import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import {
  ShieldAlert,
  Server,
  Users,
  Bot,
  Activity,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  Send,
  Cpu,
  Database
} from 'lucide-react';
import type { AdminOverview } from '../types';

export const PlatformAdminView: React.FC = () => {
  const { tenants, setCurrentTenant, setActiveTab, addNotification } = useApp();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminOverview();
      setOverview(data);
    } catch (err: any) {
      console.error('Failed to load admin overview:', err);
      addNotification('error', 'Failed to load platform overview', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const filteredTenants = (overview?.tenants || []).filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.activeBot && t.activeBot.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold uppercase tracking-wider">
              Super Admin
            </span>
            <span className="text-xs text-slate-400">Platform Control</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">Multi-Tenant Fleet & Engine Status</h1>
          <p className="text-xs text-slate-400">Real-time supervision of all client workspaces, live Telegram bot pollers, and backend system health.</p>
        </div>

        <button
          onClick={loadAdminData}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Fleet
        </button>
      </div>

      {/* System Health & Capacity Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Client Workspaces</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-white">{overview?.fleet.totalTenants ?? tenants.length}</p>
          <p className="text-[11px] text-slate-400">Isolated database partitions</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Telegram Bots</span>
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{overview?.fleet.activeBots ?? 0}</p>
          <p className="text-[11px] text-emerald-400 font-medium">
            {overview?.fleet.pollingAgents ?? 0} Real-time long-pollers
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">System Memory (Heap)</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">{overview?.system.memoryUsageMB ?? 0} MB</p>
          <p className="text-[11px] text-slate-400">Node {overview?.system.nodeVersion || 'v20'}</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Server Uptime</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {overview?.system.uptimeSeconds ? formatUptime(overview.system.uptimeSeconds) : 'Online'}
          </p>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Health Status: {overview?.system.status || 'HEALTHY'}</span>
          </p>
        </div>
      </div>

      {/* Client Directory */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            Client Workspaces Directory
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search workspaces..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Workspace Name</th>
                <th className="pb-3 font-semibold">Industry</th>
                <th className="pb-3 font-semibold">Agents</th>
                <th className="pb-3 font-semibold">Telegram Bot</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTenants.map((t) => {
                const fullTenant = tenants.find(item => item.id === t.id);
                return (
                  <tr key={t.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3">
                      <p className="font-bold text-white">{t.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{t.id}</p>
                    </td>
                    <td className="py-3 text-slate-300">{t.industry}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                        {t.agentsCount} configured
                      </span>
                    </td>
                    <td className="py-3">
                      {t.activeBot ? (
                        <a
                          href={`https://t.me/${t.activeBot}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:underline inline-flex items-center gap-1 font-mono font-semibold"
                        >
                          @{t.activeBot} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500 italic">No live bot</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          if (fullTenant) {
                            setCurrentTenant(fullTenant);
                            setActiveTab('dashboard');
                            addNotification('info', 'Workspace Switched', `Now managing ${fullTenant.name}`);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 font-medium transition-colors"
                      >
                        Switch Workspace
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
