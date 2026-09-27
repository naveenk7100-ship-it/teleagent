import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  ChevronDown,
  Plus,
  RefreshCw,
  Sparkles,
  Send,
  Menu,
  X,
  Bot,
  ExternalLink,
  LogOut
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    tenants,
    currentTenant,
    setCurrentTenant,
    agents,
    currentAgent,
    refreshAll,
    setActiveTab,
    startOnboarding,
    isMobileNavOpen,
    setIsMobileNavOpen,
    addNotification
  } = useApp();

  const {
    user,
    workspace,
    workspaces: authWorkspaces,
    switchWorkspace,
    createWorkspace: authCreateWorkspace,
    logout
  } = useAuth();

  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newIndustry, setNewIndustry] = useState('Healthcare & Wellness');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  // Available workspaces list
  const availableWorkspaces = authWorkspaces.length > 0 ? authWorkspaces : tenants;
  const activeWorkspace = workspace || currentTenant;

  const liveBotUsername = currentAgent?.telegramBot?.botUsername;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAll();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSelectWorkspace = async (t: any) => {
    try {
      if (authWorkspaces.length > 0) {
        await switchWorkspace(t.id);
      }
      setCurrentTenant(t);
      setIsTenantDropdownOpen(false);
      addNotification('info', 'Workspace Switched', `Active workspace: ${t.name}`);
    } catch (err: any) {
      addNotification('error', 'Switch Workspace Failed', err.message);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setIsCreatingWorkspace(true);
    try {
      let created: any;
      if (user) {
        created = await authCreateWorkspace({
          name: newWorkspaceName.trim(),
          businessName: newWorkspaceName.trim(),
          industry: newIndustry,
        });
      }
      if (created) {
        setCurrentTenant(created);
      }
      setIsCreateWorkspaceModalOpen(false);
      setNewWorkspaceName('');
      setActiveTab('dashboard');
      startOnboarding();
      addNotification('success', 'Workspace Created', `Welcome to ${newWorkspaceName.trim()}`);
    } catch (err: any) {
      addNotification('error', 'Failed to create workspace', err.message);
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between">
      
      {/* Brand & Mobile Toggle */}
      <div className="flex items-center gap-3 md:gap-5">
        
        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Logo */}
        <div 
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform shrink-0">
            <Send className="w-5 h-5 text-white -rotate-12 translate-x-0.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg text-white tracking-tight">TeleAgent</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                SaaS
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">AI Telegram Agent Builder</p>
          </div>
        </div>

        {/* Workspace Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsTenantDropdownOpen(!isTenantDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 transition-colors text-xs sm:text-sm font-medium"
          >
            <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="max-w-[110px] sm:max-w-[180px] truncate">{activeWorkspace?.name || 'Create your workspace'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {isTenantDropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-72 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex justify-between items-center">
                <span>Select Workspace</span>
                <span className="text-[10px] text-slate-500 font-mono">{availableWorkspaces.length} Workspaces</span>
              </div>
              
              <div className="max-h-60 overflow-y-auto py-1 space-y-1">
                {availableWorkspaces.map(t => {
                  const isDemo = t.isDemo || t.id.includes('apex') || t.id.includes('pulsetech');
                  const isSelected = activeWorkspace?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSelectWorkspace(t)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                        isSelected
                          ? 'bg-sky-500/15 text-sky-300 font-semibold border border-sky-500/20'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate font-medium text-white flex items-center gap-1.5">
                          {t.name}
                          {isDemo && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20 font-normal">
                              Demo Sandbox
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">{t.industry}</div>
                      </div>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setIsTenantDropdownOpen(false);
                    setIsCreateWorkspaceModalOpen(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-sky-600/15 hover:bg-sky-600/25 text-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-sky-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Create New Client Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Active Bot Badge if live */}
        {liveBotUsername && (
          <a
            href={`https://t.me/${liveBotUsername}`}
            target="_blank"
            rel="noreferrer"
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <Bot className="w-3.5 h-3.5" />
            <span>@{liveBotUsername}</span>
            <ExternalLink className="w-3 h-3 text-emerald-400/70" />
          </a>
        )}

        {/* Setup Wizard Button */}
        <button
          onClick={startOnboarding}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Launch Setup Wizard</span>
          <span className="sm:hidden">Wizard</span>
        </button>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
        </button>
      </div>

      {/* CREATE WORKSPACE MODAL */}
      {isCreateWorkspaceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" />
              Create Client Workspace
            </h3>
            <p className="text-xs text-slate-400">
              Each workspace maintains completely isolated business rules, CRM leads, bookings, knowledge, and Telegram bots.
            </p>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Business / Workspace Name *</label>
                <input
                  type="text"
                  required
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g. Acme Corp, Nova Digital"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Industry</label>
                <select
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
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

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateWorkspaceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingWorkspace || !newWorkspaceName.trim()}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-md shadow-sky-600/20"
                >
                  {isCreatingWorkspace ? 'Creating...' : 'Create & Setup Bot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </header>
  );
};
