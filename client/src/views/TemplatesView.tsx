import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { AgentTemplateDefinition } from '../types';
import {
  Sparkles,
  Bot,
  Zap,
  Check,
  ArrowRight,
  Shield,
  Layers,
  HelpCircle,
  Building2,
  Calendar,
  Users,
  LifeBuoy,
  ShoppingBag,
  Home,
  GraduationCap,
  UtensilsCrossed,
  Sliders
} from 'lucide-react';

export const TemplatesView: React.FC = () => {
  const { templates, openCreateWizardWithTemplate } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [previewTemplate, setPreviewTemplate] = useState<AgentTemplateDefinition | null>(null);

  const categories = ['ALL', 'Operations', 'Sales', 'Support', 'Productivity', 'Real Estate', 'Education', 'Hospitality', 'Custom'];

  const filteredTemplates = templates.filter(t => {
    if (selectedCategory === 'ALL') return true;
    return t.category.toLowerCase() === selectedCategory.toLowerCase() ||
           t.type.toLowerCase().includes(selectedCategory.toLowerCase());
  });

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'AI_RECEPTIONIST': return Building2;
      case 'SALES_AGENT': return Zap;
      case 'CUSTOMER_SUPPORT': return LifeBuoy;
      case 'PERSONAL_ASSISTANT': return Bot;
      case 'LEAD_QUALIFICATION': return Users;
      case 'APPOINTMENT_BOOKING': return Calendar;
      case 'COMMUNITY_MANAGER': return Users;
      case 'ECOMMERCE_ASSISTANT': return ShoppingBag;
      case 'REAL_ESTATE_AGENT': return Home;
      case 'EDUCATION_ADMISSIONS': return GraduationCap;
      case 'RESTAURANT_HOTEL': return UtensilsCrossed;
      default: return Sliders;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>13 Enterprise Ready-to-Deploy Templates</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
          Built-in Agent Templates
        </h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Choose a tailored blueprint designed for specific industry workflows. Each template comes with pre-configured system instructions, tool permissions, working hours, and sample knowledge bases.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700/60'
            }`}
          >
            {cat === 'ALL' ? 'All Templates (13)' : cat}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map(tpl => {
          const Icon = getTemplateIcon(tpl.type);

          return (
            <div
              key={tpl.type}
              className="rounded-2xl bg-slate-850/90 border border-slate-750 hover:border-sky-500/40 transition-all p-5 flex flex-col justify-between group shadow-xl shadow-black/20 hover:shadow-sky-500/10"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500/20 via-blue-600/20 to-indigo-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {tpl.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
                    {tpl.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {tpl.shortDescription}
                  </p>
                </div>

                {/* Meta details */}
                <div className="space-y-1.5 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Industry:</span>
                    <span className="font-medium text-slate-200 truncate max-w-[160px]">{tpl.recommendedIndustry}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Default Tone:</span>
                    <span className="font-medium text-slate-200">{tpl.defaultTone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Personality:</span>
                    <span className="font-medium text-sky-400">{tpl.defaultPersonality}</span>
                  </div>
                </div>

                {/* Capabilities pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {tpl.defaultCapabilities.allowLeadCreation && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      CRM Leads
                    </span>
                  )}
                  {tpl.defaultCapabilities.allowBookingRequests && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      Booking Desk
                    </span>
                  )}
                  {tpl.defaultCapabilities.allowTicketCreation && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Tickets CRM
                    </span>
                  )}
                  {tpl.defaultCapabilities.allowKnowledgeSearch && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Knowledge Base
                    </span>
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="pt-4 mt-4 border-t border-slate-750 flex items-center justify-between gap-2">
                <button
                  onClick={() => setPreviewTemplate(tpl)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  View Details
                </button>

                <button
                  onClick={() => openCreateWizardWithTemplate(tpl)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-sky-500/25 transition-transform active:scale-95"
                >
                  <span>Use Template</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Template Detail Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{previewTemplate.title}</h2>
                  <p className="text-xs text-slate-400">{previewTemplate.badge} • {previewTemplate.recommendedIndustry}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Description</h4>
                <p className="text-slate-200 leading-relaxed">{previewTemplate.detailedDescription}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Pre-configured System Instructions</h4>
                <pre className="p-4 rounded-xl bg-slate-950 text-xs font-mono text-slate-300 border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                  {previewTemplate.systemInstructions}
                </pre>
              </div>

              {previewTemplate.quickQuestions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Sample Test Questions</h4>
                  <div className="space-y-1.5">
                    {previewTemplate.quickQuestions.map((q, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-750 text-xs text-slate-200">
                        "{q}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-end gap-3">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const tpl = previewTemplate;
                  setPreviewTemplate(null);
                  openCreateWizardWithTemplate(tpl);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/25"
              >
                <span>Deploy Agent from Blueprint</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
