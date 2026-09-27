import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  MapPin, 
  Layers, 
  Sparkles, 
  Sliders, 
  Building, 
  Send,
  CheckCircle2,
  PieChart,
  Bot,
  Filter,
  Lock
} from 'lucide-react';
import type { DistrictMetric, GovernmentScheme, RecommendedProject, InfrastructureCategory } from '../types';
import { calculatePriorityIndex, DEFAULT_WEIGHTS, type PriorityWeights } from '../utils/priorityEngine';
import { queryPolicyCopilot } from '../services/geminiService';
import { apiPost } from '../services/apiClient';

interface PolicymakerDashboardProps {
  districts: DistrictMetric[];
  schemes: GovernmentScheme[];
  recommendedProjects: RecommendedProject[];
  onSanctionProject: (proj: RecommendedProject) => void;
  userRole?: 'citizen' | 'policymaker';
}

interface SimulateResponse {
  ranked: Array<{ districtId: string; priorityIndex: number }>;
}

const CATEGORY_VALUES: InfrastructureCategory[] = [
  'rural_roads',
  'clean_water',
  'healthcare',
  'school_upgrades',
  'power_grid',
  'sanitation_drainage',
];

export const PolicymakerDashboard: React.FC<PolicymakerDashboardProps> = ({
  districts,
  schemes,
  recommendedProjects,
  onSanctionProject,
  userRole = 'citizen'
}) => {
  const canSanction = userRole === 'policymaker';
  // Map Layer Filters
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictMetric | null>(districts[0]);

  // Priority Index Weight Sliders ($PI = w_1*D + w_2*I + w_3*V$)
  const [weights, setWeights] = useState<PriorityWeights>(DEFAULT_WEIGHTS);

  // Server-computed PIs; null while offline or before first response.
  const [serverPI, setServerPI] = useState<Record<string, number> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const category = CATEGORY_VALUES.includes(selectedCategoryFilter as InfrastructureCategory)
        ? (selectedCategoryFilter as InfrastructureCategory)
        : null;
      apiPost<SimulateResponse>('/api/priority/simulate', { weights, category })
        .then((res) => {
          const map: Record<string, number> = {};
          for (const r of res.ranked) map[r.districtId] = r.priorityIndex;
          setServerPI(map);
        })
        .catch(() => setServerPI(null));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [weights, selectedCategoryFilter]);

  // AI-generated project recommendations, refreshed alongside the simulate call.
  const [aiRecs, setAiRecs] = useState<RecommendedProject[]>([]);
  const recDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setRecsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (recDebounceRef.current) clearTimeout(recDebounceRef.current);
    recDebounceRef.current = setTimeout(() => {
      const category = CATEGORY_VALUES.includes(selectedCategoryFilter as InfrastructureCategory)
        ? (selectedCategoryFilter as InfrastructureCategory)
        : null;
      setRecsLoading(true);
      apiPost<{ projects: RecommendedProject[] }>('/api/projects/recommend', {
        weights,
        category,
        topN: 5,
        useGemini: true,
      })
        .then((res) => setAiRecs(res.projects))
        .catch(() => setAiRecs([]))
        .finally(() => setRecsLoading(false));
    }, 500);
    return () => {
      if (recDebounceRef.current) clearTimeout(recDebounceRef.current);
    };
  }, [weights, selectedCategoryFilter]);

  // Trade-Off Budget Simulator State
  const [simulatedBudgetCr, setSimulatedBudgetCr] = useState<number>(25.0);
  const [simulatedSector, setSimulatedSector] = useState<InfrastructureCategory>('rural_roads');
  const [userPickedSector, setUserPickedSector] = useState(false);

  // Policy Copilot State
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotHistory, setCopilotHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Namaste! I am JanSetu AI Copilot for NITI Aayog planners. Ask me where to prioritize capital expenditure across Jal Jeevan Mission, PMGSY, or health infrastructure.'
    }
  ]);
  const [isCopilotThinking, setIsCopilotThinking] = useState(false);

  // Recalculate Priority Indices — prefer backend, fall back to local formula.
  const maxDemand = Math.max(...districts.map(d => d.citizenDemandCount));
  const rankedDistricts = [...districts].map(d => ({
    ...d,
    dynamicPI: serverPI?.[d.districtId] ?? calculatePriorityIndex(d, maxDemand, weights),
  })).sort((a, b) => b.dynamicPI - a.dynamicPI);

  // Auto-suggest the top-ranked district's dominant deficit sector until the planner picks one manually.
  const suggestedSector: InfrastructureCategory | null = (() => {
    const top = rankedDistricts[0];
    if (!top) return null;
    const options: Array<{ category: InfrastructureCategory; value: number }> = [
      { category: 'rural_roads', value: top.roadDeficitIndex },
      { category: 'clean_water', value: top.waterDeficitIndex },
      { category: 'healthcare', value: top.healthDeficitIndex },
      { category: 'school_upgrades', value: top.schoolDeficitIndex },
      { category: 'power_grid', value: top.powerDeficitIndex },
    ];
    return options.reduce((max, o) => (o.value > max.value ? o : max), options[0]).category;
  })();

  useEffect(() => {
    if (!userPickedSector && suggestedSector && suggestedSector !== simulatedSector) {
      setSimulatedSector(suggestedSector);
    }
  }, [suggestedSector, userPickedSector, simulatedSector]);

// Merge seeded projects with fresh AI recommendations (id-dedupe: seeded wins for same key).
  const mergedProjects: RecommendedProject[] = [
    ...recommendedProjects,
    ...aiRecs.filter((r) => !recommendedProjects.some((p) => p.id === r.id)),
  ];

  const filteredRecommendedProjects = mergedProjects.filter(p =>
    selectedCategoryFilter === 'all' ? true : p.category === selectedCategoryFilter
  );

  // Tradeoff calculations
  const selectedScheme = schemes.find(s => s.category === simulatedSector) || schemes[0];
  const projectedProjectsPossible = Math.floor(simulatedBudgetCr / (selectedScheme.totalBudgetCr / 1000 || 3.5));
  const projectedBeneficiaries = projectedProjectsPossible * 14500;
  const sdgUpliftScore = Math.min(99, Math.round(72 + (simulatedBudgetCr / 50) * 18));

  const handleCopilotSend = async () => {
    if (!copilotQuery.trim()) return;

    const userText = copilotQuery;
    setCopilotQuery('');
    setCopilotHistory(prev => [...prev, { role: 'user', text: userText }]);
    setIsCopilotThinking(true);

    // Pass the currently top-ranked districts so the copilot's answer respects the active weights + category.
    const topIds = rankedDistricts.slice(0, 5).map(d => d.districtId);
    const reply = await queryPolicyCopilot(userText, topIds);

    setIsCopilotThinking(false);
    setCopilotHistory(prev => [...prev, { role: 'assistant', text: reply }]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Executive Dashboard Header */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" />
            <span>NITI Aayog & Ministry of Development Executive Decision Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Policymaker Infrastructure Decision Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Spatial AI alignment of bottom-up citizen demands with PM Gati Shakti baselines & PFMS public capital budgets.
          </p>
        </div>

        {/* Global Key Stats Bar */}
        <div className="flex items-center space-x-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
          <div className="px-3 py-1 text-center border-r border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Active Hotspots</span>
            <span className="text-lg font-bold text-teal-400 font-mono">{districts.length} Districts</span>
          </div>
          <div className="px-3 py-1 text-center border-r border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">PFMS Unspent</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">₹297.3 Cr</span>
          </div>
          <div className="px-3 py-1 text-center">
            <span className="text-[10px] text-slate-400 uppercase block">Avg priority Index</span>
            <span className="text-lg font-bold text-orange-400 font-mono">85.4 / 100</span>
          </div>
        </div>
      </div>

      {/* Main Row 1: Interactive Spatial Map + Priority Index Weights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Spatial Map Component (8 Cols) */}
        <div className="lg:col-span-8 bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-teal-400" />
              <h2 className="text-lg font-bold text-white">Spatial Demand & GIS Overlay Map</h2>
            </div>
            <span className="text-[11px] font-mono text-teal-400 bg-teal-950 border border-teal-700 px-2 py-0.5 rounded">
              Uber H3 • Res 8
            </span>
          </div>

          {/* Interactive Map Visual Container (Vector Polygon Heatmap Grid) */}
          <div className="relative w-full h-[400px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col">

            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none"></div>

            {/* Floating Top Map Legend */}
            <div className="relative z-10 shrink-0 m-4 flex items-center justify-between text-xs bg-slate-900/90 backdrop-blur px-3 py-2 rounded-lg border border-slate-800">
              <div className="flex items-center space-x-3">
                <span className="text-slate-300 font-medium">Uber H3 Grid Resolution 8:</span>
                <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded bg-rose-500"></span><span className="text-slate-400">Critical Demand</span></span>
                <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded bg-amber-500"></span><span className="text-slate-400">Moderate Gap</span></span>
                <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded bg-teal-500"></span><span className="text-slate-400">Funded</span></span>
              </div>
              <span className="text-teal-400 font-mono font-bold">India National View</span>
            </div>

            {/* Interactive District Heatmap Hexagon Nodes — scrolls when overflow */}
            <div className="relative z-10 flex-1 min-h-0 overflow-y-auto px-4 pb-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {rankedDistricts.map((dist) => {
                  const isSelected = selectedDistrict?.districtId === dist.districtId;
                  return (
                    <div
                      key={dist.districtId}
                      onClick={() => setSelectedDistrict(dist)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-900 border-teal-400 shadow-lg shadow-teal-500/20 ring-2 ring-teal-500/30'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white truncate">{dist.districtName}</span>
                        {dist.aspirationalDistrict && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded">
                            Aspirational
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between mt-2">
                        <span className="text-[11px] text-slate-400">Priority Index:</span>
                        <span className="text-sm font-extrabold font-mono text-rose-400">
                          {dist.dynamicPI} / 100
                        </span>
                      </div>

                      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-teal-400 via-amber-400 to-rose-500 h-full"
                          style={{ width: `${dist.dynamicPI}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-800/80">
                        <span>{dist.citizenDemandCount} Reports</span>
                        <span className="text-emerald-400 font-mono">₹{dist.unspentPFMSFundsCr} Cr PFMS</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Status */}
            <div className="relative z-10 shrink-0 m-4 text-[11px] text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 flex justify-between items-center">
              <span>Showing geospatial divergence between citizen demand & PM Gati Shakti infrastructure baselines.</span>
              <span className="text-slate-300 font-semibold">Click district card to inspect</span>
            </div>
          </div>

          {/* Selected District Deep Dive */}
          {selectedDistrict && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-orange-400" />
                  <span>District Infrastructure Profile: {selectedDistrict.districtName} ({selectedDistrict.state})</span>
                </h3>
                <span className="text-xs bg-teal-950 text-teal-300 border border-teal-700 px-2 py-0.5 rounded font-mono">
                  H3 Index: {selectedDistrict.h3Index}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Water Deficit Index</span>
                  <span className="text-base font-bold text-sky-400 font-mono">{selectedDistrict.waterDeficitIndex}%</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Road Connectivity Deficit</span>
                  <span className="text-base font-bold text-amber-400 font-mono">{selectedDistrict.roadDeficitIndex}%</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Healthcare Deficit</span>
                  <span className="text-base font-bold text-rose-400 font-mono">{selectedDistrict.healthDeficitIndex}%</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Unspent PFMS Fund</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">₹{selectedDistrict.unspentPFMSFundsCr} Cr</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Priority Index Math Formula & Dynamic Weight Slider Panel (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <span>Spatial AI Priority Index Math</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize weighting factors for dynamic prioritization:
            </p>
          </div>

          {/* Math Formula Card */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[11px] font-mono text-amber-300 block uppercase font-bold">
              Composite Priority Index Formula ($PI$)
            </span>
            <div className="bg-slate-900 p-3 rounded-lg border border-amber-500/30 font-mono text-xs text-amber-200 text-center">
              PI = w₁·(Demand Volume) + w₂·(Infra Deficit) + w₃·(SECC Vulnerability)
            </div>
          </div>

          {/* Category scope for PI (shared with the projects filter below) */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Filter className="w-3.5 h-3.5 text-teal-400" />
              <span>PI Sector Scope</span>
            </div>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="all">All 5 sectors (mean deficit)</option>
              <option value="rural_roads">PMGSY — Rural Roads deficit</option>
              <option value="clean_water">Jal Jeevan — Water deficit</option>
              <option value="healthcare">Ayushman Bharat — Health deficit</option>
              <option value="school_upgrades">SSA — School deficit</option>
              <option value="power_grid">PM-KUSUM — Power deficit</option>
            </select>
            <p className="text-[10px] text-slate-500 leading-snug">
              Focuses the deficit term on a single sector so the ranking spotlights that scheme's neediest districts.
            </p>
          </div>

          {/* Weight Sliders */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-300">w₁: Citizen Demand Volume Weight</span>
                <span className="text-orange-400 font-bold font-mono">{(weights.demandVolume * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.80"
                step="0.05"
                value={weights.demandVolume}
                onChange={(e) => setWeights({ ...weights, demandVolume: parseFloat(e.target.value) })}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-300">w₂: Gati Shakti Deficit Weight</span>
                <span className="text-teal-400 font-bold font-mono">{(weights.infraDeficit * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.80"
                step="0.05"
                value={weights.infraDeficit}
                onChange={(e) => setWeights({ ...weights, infraDeficit: parseFloat(e.target.value) })}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-300">w₃: SECC Vulnerability Weight</span>
                <span className="text-emerald-400 font-bold font-mono">{(weights.vulnerability * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.80"
                step="0.05"
                value={weights.vulnerability}
                onChange={(e) => setWeights({ ...weights, vulnerability: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <span className="font-semibold text-slate-200 block">⚡ Real-time Re-ranking:</span>
            <span>Adjusting sliders recalculates district priorities instantaneously across all 700+ Indian districts.</span>
          </div>
        </div>

      </div>

      {/* Main Row 2: AI Project Recommendations & Scheme Matching */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Automated Scheme Matching & Capital Sanctioning</span>
            </div>
            <h2 className="text-xl font-bold text-white">AI Recommended Infrastructure Projects</h2>
          </div>

          {/* Scheme Category Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="all">All Central Schemes</option>
              <option value="rural_roads">PMGSY (Rural Roads)</option>
              <option value="clean_water">Jal Jeevan Mission (Water)</option>
              <option value="healthcare">Ayushman Bharat (Health)</option>
              <option value="school_upgrades">Samagra Shiksha (Schools)</option>
              <option value="power_grid">PM-KUSUM / BharatNet (Power)</option>
              <option value="sanitation_drainage">Swachh Bharat (Sanitation)</option>
            </select>
          </div>
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredRecommendedProjects.map((proj) => {
            const isAiGenerated = proj.id.startsWith('airec_');
            return (
            <div 
              key={proj.id}
              className="bg-slate-950 border border-slate-800 hover:border-teal-500/50 p-5 rounded-2xl space-y-4 transition-all relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-700 font-mono">
                    {proj.matchedSchemeAcronym} Matched
                  </span>
                  <div className="flex items-center space-x-1.5">
                    {isAiGenerated && (
                      <span className="text-[10px] font-extrabold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-700 font-mono flex items-center space-x-0.5">
                        <Sparkles className="w-3 h-3" />
                        <span>AI GEN</span>
                      </span>
                    )}
                    <span className="text-xs font-extrabold text-rose-400 font-mono bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
                      PI: {proj.priorityScore}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white leading-snug">{proj.title}</h3>

                {proj.justification && (
                  <p className="text-[11px] text-slate-300 italic bg-slate-900/60 border border-slate-800/80 p-2 rounded">
                    {proj.justification}
                  </p>
                )}

                <p className="text-xs text-slate-400 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>{proj.district}, {proj.state}</span>
                </p>

                <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2.5 rounded-xl text-xs border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Est. Capital Budget</span>
                    <span className="font-bold text-emerald-400 font-mono">₹{proj.estimatedBudgetCr} Cr</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Beneficiary Reach</span>
                    <span className="font-bold text-teal-300 font-mono">{proj.affectedPopulation.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Sanction Action */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Status: <strong className="text-slate-200 capitalize">{proj.status}</strong></span>
                {proj.status === 'recommended' ? (
                  canSanction ? (
                    <button
                      onClick={() => onSanctionProject(proj)}
                      className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1 shadow-md transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Sanction Fund</span>
                    </button>
                  ) : (
                    <span
                      title="Only policymakers can sanction. Sign in with a policymaker account."
                      className="bg-slate-800 text-slate-500 font-semibold px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1 border border-slate-700 cursor-not-allowed"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Policymaker only</span>
                    </span>
                  )
                ) : (
                  <span className="text-xs text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sanctioned</span>
                  </span>
                )}
              </div>
            </div>
          );
          })}
        </div>
      </div>

      {/* Main Row 3: Trade-Off Analysis Simulator & Policy AI Copilot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Trade-off Analysis Simulator (6 Cols) */}
        <div className="lg:col-span-6 bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <PieChart className="w-5 h-5 text-indigo-400" />
              <span>Capital Allocation & Trade-off Simulator</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate budget allocations to predict beneficiary reach & SDG progress before sanctioning projects.
            </p>
          </div>

          <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Proposed Capital Budget Pool (₹ Cr)</span>
                <span className="text-emerald-400 font-mono text-sm">₹{simulatedBudgetCr} Cr</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={simulatedBudgetCr}
                onChange={(e) => setSimulatedBudgetCr(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Target Priority Sector
                </label>
                {suggestedSector && !userPickedSector && (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-700 px-1.5 py-0.5 rounded font-mono flex items-center space-x-0.5">
                    <Sparkles className="w-3 h-3" />
                    <span>AI SUGGESTED</span>
                  </span>
                )}
              </div>
              <select
                value={simulatedSector}
                onChange={(e) => {
                  setSimulatedSector(e.target.value as InfrastructureCategory);
                  setUserPickedSector(true);
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              >
                <option value="rural_roads">PMGSY — Rural Roads & Bridges</option>
                <option value="clean_water">Jal Jeevan — Tap Water Mission</option>
                <option value="healthcare">Ayushman Bharat — Health Infrastructure</option>
                <option value="school_upgrades">Samagra Shiksha — School Electrification</option>
                <option value="power_grid">PM-KUSUM / BharatNet — Power & Digital Grid</option>
                <option value="sanitation_drainage">Swachh Bharat — Sanitation & Drainage</option>
              </select>
              {suggestedSector && !userPickedSector && rankedDistricts[0] && (
                <p className="text-[10px] text-slate-400 mt-1 italic">
                  Suggested from {rankedDistricts[0].districtName}'s dominant deficit — override anytime.
                </p>
              )}
            </div>
          </div>

          {/* Simulation Projected Impact Results */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block">Projects Feasible</span>
              <span className="text-xl font-bold text-teal-400 font-mono">{projectedProjectsPossible} Projects</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block">Citizens Impacted</span>
              <span className="text-xl font-bold text-amber-400 font-mono">{projectedBeneficiaries.toLocaleString()}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block">SDG Index Uplift</span>
              <span className="text-xl font-bold text-emerald-400 font-mono">+{sdgUpliftScore}%</span>
            </div>
          </div>
        </div>

        {/* Policy AI Copilot Chat (6 Cols) */}
        <div className="lg:col-span-6 bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-teal-400" />
                <h2 className="text-lg font-bold text-white">NITI Aayog Policy AI Copilot</h2>
              </div>
              <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-700 px-2 py-0.5 rounded font-mono">
                Gemini 2.5 Active
              </span>
            </div>

            {/* Chat Messages */}
            <div className="mt-4 space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {copilotHistory.map((msg, i) => (
                <div 
                  key={i}
                  className={`p-3 rounded-xl text-xs space-y-1 ${
                    msg.role === 'user' 
                      ? 'bg-teal-950/60 border border-teal-800 text-teal-100 ml-6' 
                      : 'bg-slate-950 border border-slate-800 text-slate-200 mr-6'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    {msg.role === 'user' ? 'Planner' : 'JanSetu AI Copilot'}
                  </span>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-xs max-w-none leading-relaxed
                      [&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-1
                      [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-teal-300 [&_h2]:mb-1 [&_h2]:mt-1
                      [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-teal-300 [&_h3]:mb-1 [&_h3]:mt-1
                      [&_p]:my-1 [&_strong]:text-white [&_strong]:font-semibold
                      [&_em]:text-amber-300 [&_em]:not-italic
                      [&_ul]:my-1 [&_ul]:pl-4 [&_ul]:list-disc [&_ul]:space-y-0.5
                      [&_ol]:my-1 [&_ol]:pl-4 [&_ol]:list-decimal [&_ol]:space-y-0.5
                      [&_li]:my-0
                      [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-amber-300 [&_code]:font-mono [&_code]:text-[11px]
                      [&_a]:text-teal-400 [&_a]:underline"
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                  )}
                </div>
              ))}

              {isCopilotThinking && (
                <div className="p-3 bg-slate-950 rounded-xl text-xs text-teal-400 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Analyzing PM Gati Shakti baselines & PFMS reserves...</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Prompts & Query Input */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCopilotQuery('Where should we deploy ₹50 Cr Jal Jeevan budget in UP?')}
                className="text-[11px] bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-2 py-1 rounded-lg"
              >
                💡 Water budget in UP?
              </button>
              <button
                onClick={() => setCopilotQuery('Show top road connectivity gaps in Varanasi & Kalahandi')}
                className="text-[11px] bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-2 py-1 rounded-lg"
              >
                💡 Top Road Gaps?
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={copilotQuery}
                onChange={(e) => setCopilotQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCopilotSend()}
                placeholder="Ask Policy Copilot..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:border-teal-500 focus:outline-none"
              />
              <button
                onClick={handleCopilotSend}
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 p-2.5 rounded-xl transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
