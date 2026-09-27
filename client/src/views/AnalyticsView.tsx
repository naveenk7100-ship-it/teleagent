import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import {
  BarChart3,
  MessageSquare,
  Users,
  Flame,
  UserCheck,
  Zap,
  Clock,
  Cpu,
  TrendingUp,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const AnalyticsView: React.FC = () => {
  const { currentTenant, addNotification } = useApp();
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentTenant) return;
    const loadAnalytics = async () => {
      try {
        setIsLoading(true);
        const data = await api.getAnalytics(currentTenant.id);
        setAnalyticsData(data);
      } catch (err: any) {
        addNotification('error', 'Failed to load analytics', err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadAnalytics();
  }, [currentTenant]);

  if (isLoading || !analyticsData) {
    return (
      <div className="p-12 text-center text-xs text-slate-500">
        Loading real-time analytics...
      </div>
    );
  }

  const { summary, agentsMetrics } = analyticsData;

  const barChartData = agentsMetrics.map((a: any) => ({
    name: a.agentName.length > 15 ? a.agentName.substring(0, 13) + '...' : a.agentName,
    conversations: a.metrics?.totalConversations || 0,
    leads: a.metrics?.leadsGenerated || 0,
  }));

  const pieColors = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const pieData = agentsMetrics.map((a: any) => ({
    name: a.agentName,
    value: a.metrics?.totalConversations || 1,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Real Live Performance Metrics</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          Agent Analytics & AI Usage
        </h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Real metrics tracked across all deployed Telegram agents for {currentTenant?.name}.
        </p>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversations</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{summary.totalConversations}</div>
          <div className="text-xs text-slate-400">{summary.totalMessages} total user & agent messages</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leads Generated</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400">{summary.totalLeads}</div>
          <div className="text-xs text-emerald-300 font-semibold">{summary.qualifiedLeads} high-fit qualified leads</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Latency</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{summary.avgResponseTimeMs}ms</div>
          <div className="text-xs text-slate-400">Deterministic & LLM pipeline execution</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tokens Processed</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{summary.totalTokens.toLocaleString()}</div>
          <div className="text-xs text-slate-400">{summary.totalWorkflows} structured tool actions</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bar Chart: Conversations & Leads per Agent (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-850 border border-slate-750 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100">Conversations & Leads per Agent</h3>
            <span className="text-xs text-slate-400">Real-time Volume</span>
          </div>

          <div className="h-64 w-full">
            {barChartData.length === 0 || barChartData.every((b: any) => b.conversations === 0 && b.leads === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400 text-sm">
                <BarChart3 className="w-8 h-8 text-slate-600" />
                <p className="font-semibold text-slate-300">No chart data yet</p>
                <p className="text-xs text-slate-500">Activity volume will populate here as live Telegram chats occur.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '13px' }}
                  />
                  <Bar dataKey="conversations" fill="#0284c7" radius={[6, 6, 0, 0]} name="Conversations" />
                  <Bar dataKey="leads" fill="#10b981" radius={[6, 6, 0, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pie Chart: Share of Traffic (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-850 border border-slate-750 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100">Fleet Traffic Share</h3>
            <span className="text-xs text-slate-400">{agentsMetrics.length} Agents</span>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {agentsMetrics.length === 0 ? (
              <div className="text-center p-4 text-xs text-slate-500">No active agents configured yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '13px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="text-center text-xs text-slate-400">
            Real distribution of user requests across your active agents.
          </div>
        </div>
      </div>

      {/* Agents Performance Breakdown Table */}
      <div className="p-5 rounded-2xl bg-slate-850 border border-slate-750 space-y-4 overflow-hidden">
        <h3 className="text-base font-bold text-slate-100">Agent Performance Breakdown</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-xs border-b border-slate-800">
              <tr>
                <th className="p-3.5">Agent Name</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Chats</th>
                <th className="p-3.5 text-right">Leads</th>
                <th className="p-3.5 text-right">Handoffs</th>
                <th className="p-3.5 text-right">Avg Response</th>
                <th className="p-3.5 text-right">Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {agentsMetrics.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500 text-sm">
                    No agents deployed in this workspace yet.
                  </td>
                </tr>
              ) : (
                agentsMetrics.map((a: any) => (
                  <tr key={a.agentId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-100">{a.agentName}</td>
                    <td className="p-3.5 text-slate-400">{a.agentType}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                        a.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-100">{a.metrics?.totalConversations || 0}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-400">{a.metrics?.leadsGenerated || 0}</td>
                    <td className="p-3.5 text-right font-mono text-purple-400">{a.metrics?.handoffs || 0}</td>
                    <td className="p-3.5 text-right font-mono text-slate-300">{a.metrics?.avgResponseTimeMs || 0}ms</td>
                    <td className="p-3.5 text-right font-mono text-slate-400">{(a.metrics?.totalTokens || 0).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
