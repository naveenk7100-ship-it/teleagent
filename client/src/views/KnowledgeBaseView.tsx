import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { KnowledgeItem, KnowledgeType } from '../types';
import { api } from '../api/client';
import {
  BookOpen,
  Plus,
  Upload,
  Globe,
  FileText,
  HelpCircle,
  Clock,
  DollarSign,
  Shield,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Tag
} from 'lucide-react';

export const KnowledgeBaseView: React.FC = () => {
  const { currentTenant, agents, addNotification } = useApp();

  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('');

  // New snippet modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemType, setNewItemType] = useState<KnowledgeType>('faq');
  const [newItemContent, setNewItemContent] = useState('');
  const [newItemTags, setNewItemTags] = useState('');

  // Semantic retrieval preview
  const [testQuery, setTestQuery] = useState('');
  const [retrievalResults, setRetrievalResults] = useState<KnowledgeItem[]>([]);

  const loadKnowledge = async () => {
    if (!currentTenant) return;
    try {
      const res = await api.getKnowledge(currentTenant.id);
      setItems(res.items);
    } catch (err: any) {
      addNotification('error', 'Failed to load knowledge', err.message);
    }
  };

  useEffect(() => {
    loadKnowledge();
  }, [currentTenant]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTenant) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tenantId', currentTenant.id);
    formData.append('title', file.name);

    try {
      await api.uploadKnowledgeFile(formData);
      addNotification('success', `Parsed and uploaded ${file.name}`);
      loadKnowledge();
    } catch (err: any) {
      addNotification('error', 'Upload failed', err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleScrapeUrl = async () => {
    if (!scrapeUrl.trim() || !currentTenant) return;
    setIsScraping(true);
    try {
      await api.scrapeUrlKnowledge({
        url: scrapeUrl,
        tenantId: currentTenant.id,
      });
      addNotification('success', `Ingested knowledge from ${scrapeUrl}`);
      setScrapeUrl('');
      loadKnowledge();
    } catch (err: any) {
      addNotification('error', 'Scraping failed', err.message);
    } finally {
      setIsScraping(false);
    }
  };

  const handleCreateSnippet = async () => {
    if (!newItemTitle.trim() || !newItemContent.trim() || !currentTenant) return;

    try {
      await api.createKnowledge({
        tenantId: currentTenant.id,
        title: newItemTitle,
        type: newItemType,
        content: newItemContent,
        metadata: {
          tags: newItemTags.split(',').map(t => t.trim()).filter(Boolean),
        },
      });

      addNotification('success', `Added ${newItemTitle}`);
      setIsAddModalOpen(false);
      setNewItemTitle('');
      setNewItemContent('');
      setNewItemTags('');
      loadKnowledge();
    } catch (err: any) {
      addNotification('error', 'Failed to add snippet', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteKnowledge(id);
      addNotification('success', 'Deleted knowledge item');
      loadKnowledge();
    } catch (err: any) {
      addNotification('error', 'Delete failed', err.message);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'ALL' || item.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: KnowledgeType) => {
    switch (type) {
      case 'faq': return { label: 'FAQ', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' };
      case 'product': return { label: 'Product / Pricing', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 'hours_location': return { label: 'Hours & Location', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 'policy': return { label: 'Policy', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
      case 'document': return { label: 'Document (PDF/DOCX)', color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' };
      case 'url': return { label: 'Website URL', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' };
      default: return { label: 'Text Snippet', color: 'bg-slate-750 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Anti-Hallucination Verified Knowledge Base</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Business Knowledge & Sources
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Train your AI agents on verified company knowledge: FAQs, documents (PDF/DOCX), URL links, pricing packages, business hours, and operational policies.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-sky-400" />
            <span>{isUploading ? 'Parsing...' : 'Upload PDF/DOCX'}</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md shadow-sky-500/25 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Knowledge Snippet</span>
          </button>
        </div>
      </div>

      {/* URL Scraper Ingestion Bar */}
      <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 shrink-0">
          <Globe className="w-4 h-4 text-sky-400" />
          <span>Ingest Website URL:</span>
        </div>
        <input
          type="url"
          value={scrapeUrl}
          onChange={(e) => setScrapeUrl(e.target.value)}
          placeholder="https://yourbusiness.com/services-or-pricing"
          className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-sky-500 w-full"
        />
        <button
          onClick={handleScrapeUrl}
          disabled={isScraping || !scrapeUrl.trim()}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-sky-400 border border-slate-700 transition-colors shrink-0 disabled:opacity-50"
        >
          {isScraping ? 'Scraping...' : 'Fetch & Learn'}
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge items..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full sm:w-auto">
          {['ALL', 'faq', 'product', 'hours_location', 'policy', 'document', 'url', 'text'].map(t => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedType === t
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750 border border-slate-700/60'
              }`}
            >
              {t === 'ALL' ? 'All Types' : t.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Knowledge Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-bold text-base text-slate-200">No knowledge items found</h3>
          <p className="text-sm text-slate-400">Add FAQs, pricing, business hours, or upload a PDF/DOCX document above to train your AI agents.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map(item => {
            const badge = getTypeBadge(item.type);

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-slate-850/90 border border-slate-750 p-5 flex flex-col justify-between group shadow-lg shadow-black/20"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="Delete knowledge item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-bold text-base text-slate-100 group-hover:text-sky-300 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-sm text-slate-200 leading-relaxed line-clamp-4 whitespace-pre-wrap bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                    {item.content}
                  </p>

                  {item.metadata?.tags && item.metadata.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {item.metadata.tags.map((tag, idx) => (
                        <span key={idx} className="text-xs px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-750 font-medium">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3.5 mt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Attached to workspace</span>
                  <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Knowledge Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add Knowledge Snippet</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Title</label>
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="e.g. Return Policy, Pricing Tiers, Parking Instructions"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Type</label>
                <select
                  value={newItemType}
                  onChange={(e) => setNewItemType(e.target.value as KnowledgeType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                >
                  <option value="faq">FAQ (Questions & Answers)</option>
                  <option value="product">Product / Service & Pricing</option>
                  <option value="hours_location">Working Hours & Location</option>
                  <option value="policy">Policy / Terms</option>
                  <option value="text">General Knowledge Snippet</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Knowledge Content</label>
                <textarea
                  rows={6}
                  value={newItemContent}
                  onChange={(e) => setNewItemContent(e.target.value)}
                  placeholder="Enter the factual details here..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500 leading-relaxed font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase tracking-wider mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newItemTags}
                  onChange={(e) => setNewItemTags(e.target.value)}
                  placeholder="e.g. pricing, refund, hours"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSnippet}
                disabled={!newItemTitle.trim() || !newItemContent.trim()}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md disabled:opacity-50"
              >
                Save Snippet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
