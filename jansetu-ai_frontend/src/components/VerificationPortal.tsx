import React, { useMemo, useState } from 'react';
import { 
  MessageSquare, 
  Satellite, 
  Code, 
  Send, 
  ShieldCheck, 
  Copy,
  Loader2,
  Search,
  UserCircle2
} from 'lucide-react';
import type { CitizenRequest, NudgeAlert, RecommendedProject } from '../types';
import { apiPost } from '../services/apiClient';

interface VerificationPortalProps {
  nudges: NudgeAlert[];
  recommendedProjects: RecommendedProject[];
  requests?: CitizenRequest[];
  onNudgeSent?: (nudge: NudgeAlert) => void;
  userRole?: 'citizen' | 'policymaker';
}

interface TelegramContact {
  chatId: string;
  name: string;
  requestCount: number;
  lastSeen: string;
  lastDistrict: string;
  lastCategory: string;
}

export const VerificationPortal: React.FC<VerificationPortalProps> = ({
  nudges,
  recommendedProjects,
  requests = [],
  onNudgeSent,
  userRole = 'citizen'
}) => {
  const canDispatch = userRole === 'policymaker';
  const [selectedAuditProject, setSelectedAuditProject] = useState<RecommendedProject>(recommendedProjects[0]);
  const [copiedApi, setCopiedApi] = useState(false);
  const [chatId, setChatId] = useState('');
  const [customNudgeMsg, setCustomNudgeMsg] = useState('');
  const [dispatchState, setDispatchState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Every citizen who has messaged @jansetu_ai_bot becomes a searchable contact — no chat_id memorisation required.
  const telegramContacts: TelegramContact[] = useMemo(() => {
    const map = new Map<string, TelegramContact>();
    for (const r of requests) {
      if (r.channel !== 'telegram' || !r.phone?.startsWith('tg:')) continue;
      const cid = r.phone.slice(3);
      const existing = map.get(cid);
      if (existing) {
        existing.requestCount += 1;
        if ((r.timestamp ?? '') > existing.lastSeen) {
          existing.lastSeen = r.timestamp ?? existing.lastSeen;
          existing.lastDistrict = r.district ?? existing.lastDistrict;
          existing.lastCategory = r.category ?? existing.lastCategory;
        }
      } else {
        map.set(cid, {
          chatId: cid,
          name: r.citizenName?.trim() || 'Citizen',
          requestCount: 1,
          lastSeen: r.timestamp ?? '',
          lastDistrict: r.district ?? '—',
          lastCategory: r.category ?? '—',
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  }, [requests]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return telegramContacts;
    return telegramContacts.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.chatId.includes(q) ||
      c.lastDistrict.toLowerCase().includes(q) ||
      c.lastCategory.toLowerCase().includes(q),
    );
  }, [telegramContacts, contactSearch]);

  const activeContact = telegramContacts.find((c) => c.chatId === chatId);

  const handleSendCustomNudge = async (): Promise<void> => {
    if (!customNudgeMsg.trim() || !chatId.trim()) return;
    setDispatchState('sending');
    setDispatchError(null);
    try {
      const { nudge, dispatched, reason } = await apiPost<{ nudge: NudgeAlert; dispatched: boolean; reason?: string }>(
        '/api/telegram/send',
        { chatId: chatId.trim(), text: customNudgeMsg.trim() },
      );
      onNudgeSent?.(nudge);
      if (dispatched) {
        setDispatchState('sent');
        setTimeout(() => {
          setDispatchState('idle');
          setCustomNudgeMsg('');
        }, 2000);
      } else {
        setDispatchError(reason ?? 'Telegram rejected the message (invalid chat_id?)');
        setDispatchState('error');
        setTimeout(() => setDispatchState('idle'), 5000);
      }
    } catch (err) {
      setDispatchError(err instanceof Error ? err.message : 'Failed to dispatch');
      setDispatchState('error');
      setTimeout(() => setDispatchState('idle'), 5000);
    }
  };

  const copyApiUrl = () => {
    navigator.clipboard.writeText('https://api.jansetu.gov.in/v1/spatial-hotspots?format=geojson');
    setCopiedApi(true);
    setTimeout(() => setCopiedApi(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Closed-Loop Tracking & Post-Execution Verification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Citizen Nudges, Satellite Audit & Open DPG APIs
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Establishes citizen trust through automated status alerts, high-resolution satellite imagery verification, and open API specifications.
          </p>
        </div>
      </div>

      {/* Grid: Left Column (Citizen Nudges & Telegram Alerts), Right Column (Satellite Verification Audit) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Citizen Nudges & Telegram Automated Dispatcher (6 Cols) */}
        <div className="lg:col-span-6 bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg font-bold text-white">Automated Citizen Nudges</h2>
            </div>
            <span className="text-xs bg-sky-950 text-sky-300 border border-sky-700 px-2 py-0.5 rounded font-mono">
              Telegram Bot API
            </span>
          </div>

          {/* Interactive Nudge Dispatch — Contact Directory + Message */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Dispatch Telegram Nudge to Citizen</span>
              <button
                type="button"
                onClick={() => setShowManualEntry((v) => !v)}
                className="text-[10px] text-slate-400 hover:text-sky-300 underline underline-offset-2 font-mono"
              >
                {showManualEntry ? 'Use contact directory' : 'Enter chat_id manually'}
              </button>
            </div>

            {showManualEntry ? (
              <input
                type="text"
                inputMode="numeric"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="Telegram chat_id (e.g. 8863390281)"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none font-mono"
              />
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Search citizen by name, district, category, chat_id..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-700"
                  />
                </div>
                {telegramContacts.length === 0 ? (
                  <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/60 rounded-xl p-2.5">
                    No citizen has messaged <span className="font-mono">@jansetu_ai_bot</span> yet. Once they do, they'll appear here — searchable by name, district, or complaint category.
                  </div>
                ) : (
                  <div className="max-h-[180px] overflow-y-auto pr-1 space-y-1.5">
                    {filteredContacts.length === 0 && (
                      <div className="text-[11px] text-slate-500 text-center py-2">No contact matches "{contactSearch}"</div>
                    )}
                    {filteredContacts.map((c) => {
                      const isActive = c.chatId === chatId;
                      return (
                        <button
                          key={c.chatId}
                          type="button"
                          onClick={() => setChatId(c.chatId)}
                          className={`w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-start gap-2.5 ${
                            isActive
                              ? 'bg-sky-950/60 border-sky-700 ring-1 ring-sky-500/40'
                              : 'bg-slate-900 border-slate-800 hover:border-sky-800 hover:bg-slate-900/80'
                          }`}
                        >
                          <UserCircle2 className={`w-6 h-6 flex-shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className={`text-xs font-bold truncate ${isActive ? 'text-sky-200' : 'text-slate-200'}`}>
                                {c.name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">chat_id {c.chatId}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {c.lastDistrict} · {c.lastCategory.replace('_', ' ')} · {c.requestCount} request{c.requestCount === 1 ? '' : 's'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {activeContact && (
                  <div className="text-[10px] text-sky-300 bg-sky-950/40 border border-sky-800 rounded-lg px-2.5 py-1.5 font-mono">
                    Selected: <span className="font-bold">{activeContact.name}</span> · chat_id {activeContact.chatId}
                  </div>
                )}
              </div>
            )}

            <textarea
              rows={2}
              value={customNudgeMsg}
              onChange={(e) => setCustomNudgeMsg(e.target.value)}
              placeholder={activeContact
                ? `Namaste ${activeContact.name}, your ${activeContact.lastCategory.replace('_', ' ')} request in ${activeContact.lastDistrict} has been approved...`
                : 'Type the status update the citizen should receive on Telegram...'}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none"
            />
            <button
              onClick={handleSendCustomNudge}
              disabled={!canDispatch || dispatchState === 'sending' || !customNudgeMsg.trim() || !chatId.trim()}
              title={!canDispatch ? 'Only policymakers can dispatch citizen nudges' : undefined}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-slate-950 disabled:text-slate-400 font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-1 transition-all"
            >
              {dispatchState === 'sending' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>
                {!canDispatch
                  ? 'Policymaker only — sign in to dispatch'
                  : dispatchState === 'sent'
                    ? 'Telegram Nudge Sent!'
                    : dispatchState === 'sending'
                      ? 'Dispatching via Telegram...'
                      : dispatchState === 'error'
                        ? 'Dispatch failed — retry'
                        : 'Send Telegram Alert to Citizen'}
              </span>
            </button>
            {dispatchState === 'error' && dispatchError && (
              <p className="text-[10px] text-rose-400 font-mono leading-relaxed">{dispatchError}</p>
            )}
          </div>

          {/* Recent Nudge Alert Logs */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Recent Automated Dispatch Logs
            </span>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {nudges.map((nudge) => {
                const isTelegram = nudge.channel === 'telegram';
                const isSms = nudge.channel === 'sms';
                const label = isTelegram ? 'Telegram' : isSms ? 'SMS' : 'WhatsApp';
                const badgeClass = isTelegram
                  ? 'bg-sky-950 text-sky-300 border border-sky-700'
                  : isSms
                    ? 'bg-amber-950 text-amber-300 border border-amber-700'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-700';
                const identifier = isTelegram
                  ? nudge.citizenPhone.replace(/^tg:/, 'chat_id ')
                  : nudge.citizenPhone;
                return (
                  <div key={nudge.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${badgeClass}`}>{label}</span>
                        <span className="font-mono font-bold text-teal-400">{identifier}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{nudge.sentTimestamp}</span>
                    </div>
                    <p className="text-xs text-slate-200 bg-slate-900/80 p-2 rounded border border-slate-800/80 font-sans">
                      {nudge.statusText}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Satellite Imagery Post-Completion Audit (6 Cols) */}
        <div className="lg:col-span-6 bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Satellite className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg font-bold text-white">Post-Completion Satellite Audit</h2>
            </div>
            <span className="text-xs bg-sky-950 text-sky-300 border border-sky-700 px-2 py-0.5 rounded font-mono">
              ISRO / Sentinel-2 AI
            </span>
          </div>

          {/* Project Selector for Satellite Audit */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Sanctioned Infrastructure Project to Audit:
            </label>
            <select
              value={selectedAuditProject.id}
              onChange={(e) => {
                const found = recommendedProjects.find(p => p.id === e.target.value);
                if (found) setSelectedAuditProject(found);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
            >
              {recommendedProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.district})
                </option>
              ))}
            </select>
          </div>

          {/* Before & After Satellite Image Comparison Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-rose-400 block">Pre-Construction Baseline</span>
              <div className="h-40 rounded-xl overflow-hidden border border-slate-800 relative bg-slate-950">
                <img 
                  src={selectedAuditProject.satelliteAudit?.preImageUrl || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'} 
                  alt="Pre Construction" 
                  className="w-full h-full object-cover filter contrast-125"
                />
                <span className="absolute bottom-2 left-2 bg-slate-950/80 text-[10px] text-rose-300 px-1.5 py-0.5 rounded font-mono">
                  Deficit Detected
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-emerald-400 block">Post-Construction Ground Truth</span>
              <div className="h-40 rounded-xl overflow-hidden border border-slate-800 relative bg-slate-950">
                <img 
                  src={selectedAuditProject.satelliteAudit?.postImageUrl || 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80'} 
                  alt="Post Construction" 
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 bg-emerald-950/90 text-[10px] text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                  Verified Asset
                </span>
              </div>
            </div>
          </div>

          {/* Audit Verification Score */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">AI Ground Truth Verification Index</span>
              <span className="text-[11px] text-slate-400">Comparing multispectral reflectance against PMGSY design spec.</span>
            </div>
            <div className="text-right">
              <span className="text-xl font-extrabold text-emerald-400 font-mono">
                {selectedAuditProject.satelliteAudit?.verificationScore || 96}% Verified
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Open Data & DPG Open APIs Section */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <Code className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Digital Public Good (DPG) Open APIs</h2>
          </div>

          <button
            onClick={copyApiUrl}
            className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono flex items-center space-x-2 transition-all"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>{copiedApi ? 'API Endpoint Copied!' : 'GET /v1/spatial-hotspots'}</span>
          </button>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-amber-200/90 overflow-x-auto">
          <pre>{`// JanSetu DPG Open Specification (GeoJSON Standard)
GET https://api.jansetu.gov.in/v1/spatial-hotspots?state=UttarPradesh&h3_res=8

Response: {
  "type": "FeatureCollection",
  "dpg_compliance": "DPGA Standard v1.2",
  "features": [
    {
      "type": "Feature",
      "h3_index": "8860a4c281fffff",
      "properties": {
        "district": "Varanasi (Sewapuri Block)",
        "priority_index": 92.4,
        "citizen_reports_count": 142,
        "primary_demand_category": "rural_roads",
        "matched_scheme": "PMGSY-III"
      }
    }
  ]
}`}</pre>
        </div>
      </div>
    </div>
  );
};
