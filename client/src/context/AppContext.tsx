import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  Tenant,
  Agent,
  KnowledgeItem,
  Lead,
  SupportTicket,
  BookingRequest,
  AgentTemplateDefinition,
  ConversationThread,
  AuditLog
} from '../types';
import { api } from '../api/client';

export type ActiveTab = 
  | 'dashboard'
  | 'inbox'
  | 'agents'
  | 'templates'
  | 'knowledge'
  | 'playground'
  | 'leads'
  | 'bookings'
  | 'tickets'
  | 'integrations'
  | 'business'
  | 'admin'
  | 'memory'
  | 'analytics'
  | 'audit';

export interface NotificationToast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface AppContextType {
  tenants: Tenant[];
  currentTenant: Tenant | null;
  setCurrentTenant: (tenant: Tenant) => void;
  createNewTenant: (data: { name: string; businessName?: string; industry?: string; description?: string }) => Promise<Tenant>;
  agents: Agent[];
  currentAgent: Agent | null;
  setCurrentAgent: (agent: Agent | null) => void;
  templates: AgentTemplateDefinition[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isCreateWizardOpen: boolean;
  setIsCreateWizardOpen: (open: boolean) => void;
  isOnboardingWizardOpen: boolean;
  setIsOnboardingWizardOpen: (open: boolean) => void;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
  presetTemplate: AgentTemplateDefinition | null;
  setPresetTemplate: (tpl: AgentTemplateDefinition | null) => void;
  editingAgent: Agent | null;
  setEditingAgent: (agent: Agent | null) => void;
  notifications: NotificationToast[];
  addNotification: (type: NotificationToast['type'], title: string, message?: string) => void;
  removeNotification: (id: string) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  isLoading: boolean;
  refreshAll: () => Promise<void>;
  
  // Quick action helpers
  openCreateWizardWithTemplate: (template: AgentTemplateDefinition) => void;
  openPlaygroundForAgent: (agent: Agent) => void;
  openEditorForAgent: (agent: Agent) => void;
  startOnboarding: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [templates, setTemplates] = useState<AgentTemplateDefinition[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [isOnboardingWizardOpen, setIsOnboardingWizardOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [presetTemplate, setPresetTemplate] = useState<AgentTemplateDefinition | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [notifications, setNotifications] = useState<NotificationToast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const addNotification = useCallback((type: NotificationToast['type'], title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const loadData = useCallback(async (tenantId?: string) => {
    try {
      setIsLoading(true);
      const [tenantsRes, tplsRes] = await Promise.all([
        api.getTenants(),
        api.getTemplates(),
      ]);

      setTenants(tenantsRes.tenants);
      setTemplates(tplsRes.templates);

      const realWorkspaces = tenantsRes.tenants.filter(t => !t.isDemo);
      const defaultWorkspace = realWorkspaces.length > 0 ? realWorkspaces[0] : tenantsRes.tenants[0] || null;

      const targetTenant = tenantId 
        ? tenantsRes.tenants.find(t => t.id === tenantId) || defaultWorkspace
        : (currentTenant ? tenantsRes.tenants.find(t => t.id === currentTenant.id) || defaultWorkspace : defaultWorkspace);

      setCurrentTenantState(targetTenant);

      if (targetTenant) {
        const agentsRes = await api.getAgents(targetTenant.id);
        setAgents(agentsRes.agents);
        if (agentsRes.agents.length > 0) {
          const currentMatches = currentAgent && agentsRes.agents.some(a => a.id === currentAgent.id);
          if (!currentMatches) {
            setCurrentAgent(agentsRes.agents[0]);
          }
        } else {
          setCurrentAgent(null);
        }
      }
    } catch (err: any) {
      console.error('Error loading initial app data:', err);
      addNotification('error', 'Failed to connect to backend', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentAgent, currentTenant, addNotification]);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    loadData();
  }, []);

  const setCurrentTenant = (tenant: Tenant) => {
    setCurrentTenantState(tenant);
    loadData(tenant.id);
  };

  const createNewTenant = async (data: { name: string; businessName?: string; industry?: string; description?: string }): Promise<Tenant> => {
    try {
      const res = await api.createTenant({
        name: data.name,
        businessName: data.businessName || data.name,
        industry: data.industry || 'General Business',
        businessDescription: data.description || '',
      });
      const newTenant = res.tenant;
      setTenants(prev => [...prev, newTenant]);
      setCurrentTenantState(newTenant);
      setAgents([]);
      setCurrentAgent(null);
      addNotification('success', 'Workspace Created', `Switched to workspace "${newTenant.name}"`);
      return newTenant;
    } catch (err: any) {
      addNotification('error', 'Failed to create workspace', err.message);
      throw err;
    }
  };

  const refreshAll = async () => {
    if (currentTenant) {
      const [agentsRes, tenantsRes] = await Promise.all([
        api.getAgents(currentTenant.id),
        api.getTenants(),
      ]);
      setTenants(tenantsRes.tenants);
      setAgents(agentsRes.agents);
      if (currentAgent) {
        const updated = agentsRes.agents.find(a => a.id === currentAgent.id);
        if (updated) setCurrentAgent(updated);
      }
    }
  };

  const openCreateWizardWithTemplate = (template: AgentTemplateDefinition) => {
    setPresetTemplate(template);
    setIsCreateWizardOpen(true);
  };

  const openPlaygroundForAgent = (agent: Agent) => {
    setCurrentAgent(agent);
    setActiveTab('playground');
  };

  const openEditorForAgent = (agent: Agent) => {
    setEditingAgent(agent);
  };

  const startOnboarding = () => {
    setIsOnboardingWizardOpen(true);
  };

  return (
    <AppContext.Provider
      value={{
        tenants,
        currentTenant,
        setCurrentTenant,
        createNewTenant,
        agents,
        currentAgent,
        setCurrentAgent,
        templates,
        activeTab,
        setActiveTab,
        isCreateWizardOpen,
        setIsCreateWizardOpen,
        isOnboardingWizardOpen,
        setIsOnboardingWizardOpen,
        isMobileNavOpen,
        setIsMobileNavOpen,
        presetTemplate,
        setPresetTemplate,
        editingAgent,
        setEditingAgent,
        notifications,
        addNotification,
        removeNotification,
        theme,
        toggleTheme,
        isLoading,
        refreshAll,
        openCreateWizardWithTemplate,
        openPlaygroundForAgent,
        openEditorForAgent,
        startOnboarding,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
