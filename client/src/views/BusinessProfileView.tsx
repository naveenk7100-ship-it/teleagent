import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Tenant } from '../types';
import { api } from '../api/client';
import {
  Building2,
  Save,
  Plus,
  Key,
  Globe,
  Mail,
  Phone,
  MapPin,
  Clock,
  Sparkles,
  Trash2,
  CheckCircle2
} from 'lucide-react';

export const BusinessProfileView: React.FC = () => {
  const { currentTenant, setCurrentTenant, tenants, addNotification, refreshAll } = useApp();

  const [formData, setFormData] = useState<Tenant | null>(currentTenant);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantIndustry, setNewTenantIndustry] = useState('Healthcare & Wellness');
  const [newTenantDesc, setNewTenantDesc] = useState('');

  React.useEffect(() => {
    setFormData(currentTenant);
  }, [currentTenant]);

  if (!currentTenant || !formData) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await api.updateTenant(formData.id, formData);
      addNotification('success', 'Saved business profile changes');
      setCurrentTenant(res.tenant);
      refreshAll();
    } catch (err: any) {
      addNotification('error', 'Failed to save business settings', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTenant = async () => {
    if (!newTenantName.trim()) return;
    try {
      const res = await api.createTenant({
        name: newTenantName,
        businessName: newTenantName,
        industry: newTenantIndustry,
        businessDescription: newTenantDesc,
      });

      addNotification('success', `Created new business client: ${res.tenant.name}`);
      setIsAddTenantModalOpen(false);
      setNewTenantName('');
      setNewTenantDesc('');
      setCurrentTenant(res.tenant);
      refreshAll();
    } catch (err: any) {
      addNotification('error', 'Failed to create business client', err.message);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold">
            <Building2 className="w-3.5 h-3.5" />
            <span>Multi-Tenant Client Architecture</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Business Profile & Integrations
          </h1>
          <p className="text-slate-400 text-sm">
            Manage your isolated business workspace, LLM keys, and brand details.
          </p>
        </div>

        <button
          onClick={() => setIsAddTenantModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
        >
          <Plus className="w-4 h-4 text-sky-400" />
          <span>Add Client Workspace</span>
        </button>
      </div>

      {/* Form Card */}
      <div className="p-6 rounded-2xl bg-slate-850 border border-slate-750 shadow-xl space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Company Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Workspace Label</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Official Business Name</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Timezone</label>
              <input
                type="text"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Business Description</label>
            <textarea
              rows={3}
              value={formData.businessDescription}
              onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Phone Number</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Official Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Website</label>
              <input
                type="url"
                value={formData.website || ''}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* API Key settings */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Custom AI / LLM Keys (Optional)</h3>
          </div>
          <p className="text-xs text-slate-400">
            If provided, this client's agents will connect to your private Gemini or OpenAI quota. If omitted, the high-fidelity built-in engine is used.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Google Gemini API Key</label>
              <input
                type="password"
                value={formData.settings?.customGeminiKey || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, customGeminiKey: e.target.value }
                })}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">OpenAI API Key</label>
              <input
                type="password"
                value={formData.settings?.customOpenAiKey || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, customOpenAiKey: e.target.value }
                })}
                placeholder="sk-..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md shadow-sky-500/25 transition-transform active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Business Profile'}</span>
          </button>
        </div>
      </div>

      {/* Add Client Modal */}
      {isAddTenantModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create New Business Client</h3>
              <button
                onClick={() => setIsAddTenantModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Business Name *</label>
                <input
                  type="text"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  placeholder="e.g. Acme Corp, Nova Digital"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Industry</label>
                <input
                  type="text"
                  value={newTenantIndustry}
                  onChange={(e) => setNewTenantIndustry(e.target.value)}
                  placeholder="e.g. Healthcare, Legal, SaaS"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newTenantDesc}
                  onChange={(e) => setNewTenantDesc(e.target.value)}
                  placeholder="Brief description of the business..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddTenantModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTenant}
                disabled={!newTenantName.trim()}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md disabled:opacity-50"
              >
                Create Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
