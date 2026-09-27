import React from 'react';
import { useApp, type ActiveTab } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  LayoutGrid,
  BookOpen,
  PlayCircle,
  Users,
  Calendar,
  LifeBuoy,
  KeyRound,
  Building,
  ShieldAlert,
  Brain,
  BarChart3,
  ShieldCheck,
  Sparkles,
  X,
  Send,
  ExternalLink
} from 'lucide-react';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
  category: 'Control & Inbox' | 'Agents & Knowledge' | 'CRM & Operations' | 'Settings & Fleet';
}

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    activeTab,
    setActiveTab,
    agents,
    currentAgent,
    isMobileNavOpen,
    setIsMobileNavOpen,
    startOnboarding
  } = useApp();

  const connectedBotsCount = agents.filter(a => a.telegramBot.isConnected).length;
  const isBotActive = Boolean(currentAgent?.status === 'ACTIVE' && currentAgent?.telegramBot?.usePolling);

  const navItems: NavItem[] = [
    // Category 1: Control & Inbox
    { id: 'dashboard', label: 'Control Center', icon: LayoutDashboard, badge: isBotActive ? 'LIVE' : undefined, badgeColor: 'bg-emerald-500/20 text-emerald-400 font-bold', category: 'Control & Inbox' },
    { id: 'inbox', label: 'Live Inbox & Handoff', icon: MessageSquare, category: 'Control & Inbox' },
    { id: 'playground', label: 'Test Simulator', icon: PlayCircle, badge: 'Live', badgeColor: 'bg-purple-500/20 text-purple-300', category: 'Control & Inbox' },

    // Category 2: Agents & Knowledge
    { id: 'agents', label: 'AI Agent Config', icon: Bot, badge: agents.length, badgeColor: 'bg-sky-500/20 text-sky-400', category: 'Agents & Knowledge' },
    { id: 'templates', label: '13 Built-in Templates', icon: LayoutGrid, category: 'Agents & Knowledge' },
    { id: 'knowledge', label: 'Business Knowledge', icon: BookOpen, category: 'Agents & Knowledge' },
    { id: 'memory', label: '4-Tier Memory', icon: Brain, category: 'Agents & Knowledge' },

    // Category 3: CRM & Operations
    { id: 'leads', label: 'CRM Leads', icon: Users, category: 'CRM & Operations' },
    { id: 'bookings', label: 'Bookings & Desk', icon: Calendar, category: 'CRM & Operations' },
    { id: 'tickets', label: 'Support Tickets', icon: LifeBuoy, category: 'CRM & Operations' },

    // Category 4: Settings & Fleet
    { id: 'integrations', label: 'Telegram & Gemini API', icon: KeyRound, badge: connectedBotsCount > 0 ? 'Connected' : 'Setup', badgeColor: connectedBotsCount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300', category: 'Settings & Fleet' },
    { id: 'business', label: 'Business Profile & Hours', icon: Building, category: 'Settings & Fleet' },
    { id: 'analytics', label: 'Analytics & Trends', icon: BarChart3, category: 'Settings & Fleet' },
    { id: 'audit', label: 'Audit Trail Logs', icon: ShieldCheck, category: 'Settings & Fleet' },
    { id: 'admin', label: 'Platform Super Admin', icon: ShieldAlert, badge: 'Fleet', badgeColor: 'bg-rose-500/20 text-rose-300', category: 'Settings & Fleet' },
  ];

  const categories = ['Control & Inbox', 'Agents & Knowledge', 'CRM & Operations', 'Settings & Fleet'] as const;

  const handleNavClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    if (isMobileNavOpen) {
      setIsMobileNavOpen(false);
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full select-none bg-slate-900/95 backdrop-blur">
      
      {/* Mobile Drawer Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 md:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white">
            <Send className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-white">TeleAgent Navigation</span>
        </div>
        <button
          onClick={() => setIsMobileNavOpen(false)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {categories.map(cat => {
          const items = navItems.filter(item => item.category === cat);
          return (
            <div key={cat} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {cat}
              </div>
              {items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-gradient-to-r from-sky-500/20 to-indigo-600/10 text-sky-400 border border-sky-500/30 shadow-sm font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-800 text-slate-400'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Authenticated User Profile & Sign Out Footer */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'TA'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Client User'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || 'authenticated'}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
            title="Sign Out of TeleAgent"
          >
            <ExternalLink className="w-4 h-4 rotate-180" />
          </button>
        </div>

        <div
          onClick={startOnboarding}
          className="p-2.5 rounded-xl bg-gradient-to-br from-sky-950/60 to-indigo-950/60 border border-sky-500/30 hover:border-sky-500/50 cursor-pointer transition-all group flex items-center gap-2"
        >
          <div className="w-6 h-6 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <Sparkles className="w-3 h-3 group-hover:rotate-12 transition-transform" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white">7-Step Setup Wizard</p>
            <p className="text-[9px] text-sky-300/80">Launch or reconfigure bot</p>
          </div>
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex w-64 border-r border-slate-800 bg-slate-900/60 backdrop-blur flex-col h-[calc(100vh-4rem)] select-none shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Off-Canvas Drawer (320px - 767px) */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileNavOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Menu */}
          <div className="relative w-4/5 max-w-xs h-full bg-slate-900 border-r border-slate-800 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
