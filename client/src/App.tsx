import React from 'react';
import { useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { NotificationToasts } from './components/NotificationToasts';
import { CreateAgentWizard } from './components/CreateAgentWizard';
import { OnboardingWizard } from './components/OnboardingWizard';
import { AgentDetailView } from './views/AgentDetailView';
import { AuthView } from './views/AuthView';

// Views
import { DashboardOverview } from './views/DashboardOverview';
import { LiveInboxView } from './views/LiveInboxView';
import { AgentsListView } from './views/AgentsListView';
import { TemplatesView } from './views/TemplatesView';
import { KnowledgeBaseView } from './views/KnowledgeBaseView';
import { PlaygroundView } from './views/PlaygroundView';
import { LeadsPipelineView } from './views/LeadsPipelineView';
import { BookingsView } from './views/BookingsView';
import { TicketsView } from './views/TicketsView';
import { IntegrationsView } from './views/IntegrationsView';
import { BusinessProfileView } from './views/BusinessProfileView';
import { PlatformAdminView } from './views/PlatformAdminView';
import { MemoryView } from './views/MemoryView';
import { AnalyticsView } from './views/AnalyticsView';
import { AuditLogsView } from './views/AuditLogsView';
import { Bot } from 'lucide-react';

export const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { activeTab, isLoading: isAppLoading } = useApp();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-slate-200">
        <div className="p-4 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 mb-4 animate-pulse">
          <Bot className="w-10 h-10 text-indigo-400" />
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Authenticating session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'inbox':
        return <LiveInboxView />;
      case 'agents':
        return <AgentsListView />;
      case 'templates':
        return <TemplatesView />;
      case 'knowledge':
        return <KnowledgeBaseView />;
      case 'playground':
        return <PlaygroundView />;
      case 'leads':
        return <LeadsPipelineView />;
      case 'bookings':
        return <BookingsView />;
      case 'tickets':
        return <TicketsView />;
      case 'integrations':
        return <IntegrationsView />;
      case 'business':
        return <BusinessProfileView />;
      case 'admin':
        return <PlatformAdminView />;
      case 'memory':
        return <MemoryView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'audit':
        return <AuditLogsView />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Dynamic View Canvas */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          {isAppLoading ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading workspace...</span>
              </div>
            </div>
          ) : (
            renderActiveView()
          )}
        </main>
      </div>

      {/* Global Modals & Drawers */}
      <OnboardingWizard />
      <CreateAgentWizard />
      <AgentDetailView />
      <NotificationToasts />
    </div>
  );
};

export default AppContent;
