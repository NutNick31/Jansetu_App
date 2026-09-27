import React, { useState } from 'react';
import { 
  Database, 
  Map, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Download, 
  Layers, 
  Search,
  Satellite,
  CloudRain,
  Radio,
  FileSpreadsheet
} from 'lucide-react';
import type { DistrictMetric } from '../types';

interface DataFusionPortalProps {
  districts: DistrictMetric[];
}

export const DataFusionPortal: React.FC<DataFusionPortalProps> = ({ districts }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDistricts = districts.filter(d => 
    d.districtName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const downloadJSONData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(districts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "jansetu_dpi_data_fusion_export.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Database className="w-4 h-4" />
            <span>Layer 2: Multi-Source Data Fusion & Contextual Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            National Open Data Integration Hub
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Fuses live citizen voice signals (Gemini + Twilio pipeline), India Post pincode geocoding, OpenStreetMap Nominatim coordinates, and Wikipedia district / scheme metadata. Deeper indicators (PM Gati Shakti, PFMS, SECC, ISRO Bhuvan, IMD) load from curated snapshots pending Blaze-plan streaming ingest.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={downloadJSONData}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Fused GeoJSON Dataset</span>
          </button>
        </div>
      </div>

      {/* Expanded Multi-Source Data Matrices (8 Badges) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Source 1 */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-teal-400">
            <span className="text-[11px] font-bold uppercase">1. Citizen Voice / Text</span>
            <Users className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-white">Bhashini ASR / WhatsApp API</p>
          <span className="text-[11px] text-slate-400 block">WhatsApp, 1800 IVR, SMS, USSD</span>
          <span className="text-[10px] bg-emerald-950 border border-emerald-700 px-2 py-0.5 rounded text-emerald-300 font-mono inline-block">
            ● LIVE • Gemini + Twilio
          </span>
        </div>

        {/* Source 2 */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-indigo-400">
            <span className="text-[11px] font-bold uppercase">2. Spatial GIS Layers</span>
            <Map className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-white">PM Gati Shakti Master Plan</p>
          <span className="text-[11px] text-slate-400 block">data.gov.in / BISAG-N Spatial Vector</span>
          <span className="text-[10px] bg-amber-950 border border-amber-700 px-2 py-0.5 rounded text-amber-300 font-mono inline-block">
            ○ SNAPSHOT • Curated seed
          </span>
        </div>

        {/* Source 3 */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-bold uppercase">3. Demographics & SECC</span>
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-white">Census & SECC Registry</p>
          <span className="text-[11px] text-slate-400 block">Wikipedia REST enriches census population per district</span>
          <span className="text-[10px] bg-emerald-950 border border-emerald-700 px-2 py-0.5 rounded text-emerald-300 font-mono inline-block">
            ● LIVE • Wikipedia REST
          </span>
        </div>

        {/* Source 4 */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-bold uppercase">4. Public Financial Funds</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-white">PFMS Financial Portal</p>
          <span className="text-[11px] text-slate-400 block">pfms.nic.in Unspent Sector Funds</span>
          <span className="text-[10px] bg-amber-950 border border-amber-700 px-2 py-0.5 rounded text-amber-300 font-mono inline-block">
            ○ SNAPSHOT • Curated seed
          </span>
        </div>

        {/* Source 5 */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-[11px] font-bold uppercase">5. Satellite Imagery</span>
            <Satellite className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-white">ISRO Bhuvan / Sentinel-2</p>
          <span className="text-[11px] text-slate-400 block">Multispectral Asset Verification</span>
          <span className="text-[10px] bg-amber-950 border border-amber-700 px-2 py-0.5 rounded text-amber-300 font-mono inline-block">
            ○ SNAPSHOT • Curated imagery
          </span>
        </div>

        {/* Source 6 */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-[11px] font-bold uppercase">6. Meteorological Risks</span>
            <CloudRain className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-white">IMD & National Climate Data</p>
          <span className="text-[11px] text-slate-400 block">Monsoon & Flood Vulnerability</span>
          <span className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-400 font-mono inline-block">
            ○ PLANNED • Not integrated
          </span>
        </div>

        {/* Source 7 */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-[11px] font-bold uppercase">7. Development Lags</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-white">NITI Aspirational Districts</p>
          <span className="text-[11px] text-slate-400 block">112 Aspirational District Scores</span>
          <span className="text-[10px] bg-amber-950 border border-amber-700 px-2 py-0.5 rounded text-amber-300 font-mono inline-block">
            ○ SNAPSHOT • Curated seed
          </span>
        </div>

        {/* Source 8 */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-bold uppercase">8. Digital DPI Grid</span>
            <Radio className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-white">BharatNet & USOF Registry</p>
          <span className="text-[11px] text-slate-400 block">Gram Panchayat Fiber Network</span>
          <span className="text-[10px] bg-amber-950 border border-amber-700 px-2 py-0.5 rounded text-amber-300 font-mono inline-block">
            ○ SNAPSHOT • Curated seed
          </span>
        </div>

      </div>

      {/* Main Table: Cross-Referenced District Fusion Data */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Fused DPI District Dataset ({districts.length} Regions)</h2>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by District or State..."
              className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 focus:outline-none w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <th className="p-3">District & State</th>
                <th className="p-3">H3 Spatial Index</th>
                <th className="p-3">Citizen Demand Count</th>
                <th className="p-3">Census Population <span className="text-emerald-400 normal-case">(live • Wikipedia)</span></th>
                <th className="p-3">Gati Shakti Infra Deficit</th>
                <th className="p-3">SECC Vulnerability</th>
                <th className="p-3">PFMS Unspent Reserve</th>
                <th className="p-3">Composite Priority Index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredDistricts.map((d) => (
                <tr key={d.districtId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-white">{d.districtName}</div>
                    <div className="text-[11px] text-slate-400">{d.state}</div>
                  </td>
                  <td className="p-3 font-mono text-teal-400">{d.h3Index}</td>
                  <td className="p-3">
                    <span className="bg-orange-950 text-orange-300 border border-orange-800 px-2 py-0.5 rounded font-mono font-bold">
                      {d.citizenDemandCount} Reports
                    </span>
                  </td>
                  <td className="p-3 font-mono text-teal-200">
                    {d.censusPopulation ? d.censusPopulation.toLocaleString() : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="p-3 font-mono text-amber-300">
                    Road: {d.roadDeficitIndex}% | Water: {d.waterDeficitIndex}%
                  </td>
                  <td className="p-3 font-mono text-slate-300">
                    {(d.vulnerabilityIndex * 100).toFixed(0)}%
                  </td>
                  <td className="p-3 font-mono text-emerald-400 font-bold">
                    ₹{d.unspentPFMSFundsCr} Cr
                  </td>
                  <td className="p-3">
                    <span className="bg-rose-950 text-rose-300 border border-rose-800 px-2.5 py-1 rounded font-mono font-bold text-xs">
                      {d.priorityIndex} / 100
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
