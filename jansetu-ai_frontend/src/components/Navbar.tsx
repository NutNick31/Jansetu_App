import React from 'react';
import { 
  Building2, 
  MapPin, 
  Database, 
  CheckCircle2, 
  Presentation, 
  Globe, 
  Radio,
  LogOut,
  UserCircle2
} from 'lucide-react';
import type { LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES } from '../data/mockData';

interface NavbarProps {
  activeTab: 'citizen' | 'policymaker' | 'fusion' | 'verification' | 'pitchdeck';
  setActiveTab: (tab: 'citizen' | 'policymaker' | 'fusion' | 'verification' | 'pitchdeck') => void;
  selectedLang: LanguageCode;
  setSelectedLang: (lang: LanguageCode) => void;
  userEmail?: string;
  userRole?: 'citizen' | 'policymaker';
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedLang,
  setSelectedLang,
  userEmail,
  userRole,
  onSignOut,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-xl">
      {/* Top DPI Banner */}
      <div className="bg-gradient-to-r from-orange-600 via-white/10 to-emerald-600 px-4 py-1 text-xs font-semibold text-white/90 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="bg-orange-500 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider">
            INDIA DPI
          </span>
          <span>Digital Public Good for National Infrastructure Alignment</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="hidden sm:inline">Bhashini & Gemini AI Online</span>
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('citizen')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 via-teal-500 to-emerald-500 p-0.5 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-teal-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-orange-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  JanSetu AI
                </span>
                <span className="text-[10px] px-1.5 py-0.2 bg-teal-900/60 text-teal-300 border border-teal-700/50 rounded font-mono">
                  v2.5
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none hidden sm:block">
                Multilingual AI Platform for Citizen Infrastructure Alignment
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('citizen')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'citizen'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Radio className="w-4 h-4 text-orange-400" />
              <span>Citizen Portal</span>
            </button>

            <button
              onClick={() => setActiveTab('policymaker')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'policymaker'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <MapPin className="w-4 h-4 text-teal-400" />
              <span>Policymaker Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('fusion')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'fusion'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Database className="w-4 h-4 text-indigo-400" />
              <span>Data Fusion</span>
            </button>

            <button
              onClick={() => setActiveTab('verification')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'verification'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Nudges & Audit</span>
            </button>

            <button
              onClick={() => setActiveTab('pitchdeck')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'pitchdeck'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-semibold'
                  : 'text-amber-400/80 hover:text-amber-300 hover:bg-slate-900'
              }`}
            >
              <Presentation className="w-4 h-4 text-amber-400" />
              <span>Pitch Deck</span>
            </button>
          </nav>

          {/* Language Selector + User */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg">
              <Globe className="w-4 h-4 text-teal-400" />
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value as LanguageCode)}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer font-medium"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-slate-900 text-slate-200">
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>
            {userEmail && (
              <div className="hidden sm:flex items-center space-x-2 bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg">
                <UserCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono text-slate-200 max-w-[160px] truncate" title={userEmail}>{userEmail}</span>
                {userRole && (
                  <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    userRole === 'policymaker'
                      ? 'bg-amber-950 text-amber-300 border border-amber-700'
                      : 'bg-sky-950 text-sky-300 border border-sky-700'
                  }`}>{userRole}</span>
                )}
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    title="Sign out"
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden border-t border-slate-800 bg-slate-950 px-2 py-2 flex justify-around text-xs">
        <button 
          onClick={() => setActiveTab('citizen')}
          className={`px-2 py-1 rounded ${activeTab === 'citizen' ? 'text-teal-400 font-bold bg-slate-900' : 'text-slate-400'}`}
        >
          Citizen
        </button>
        <button 
          onClick={() => setActiveTab('policymaker')}
          className={`px-2 py-1 rounded ${activeTab === 'policymaker' ? 'text-teal-400 font-bold bg-slate-900' : 'text-slate-400'}`}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('fusion')}
          className={`px-2 py-1 rounded ${activeTab === 'fusion' ? 'text-teal-400 font-bold bg-slate-900' : 'text-slate-400'}`}
        >
          Data Fusion
        </button>
        <button 
          onClick={() => setActiveTab('verification')}
          className={`px-2 py-1 rounded ${activeTab === 'verification' ? 'text-teal-400 font-bold bg-slate-900' : 'text-slate-400'}`}
        >
          Audit
        </button>
        <button 
          onClick={() => setActiveTab('pitchdeck')}
          className={`px-2 py-1 rounded ${activeTab === 'pitchdeck' ? 'text-amber-400 font-bold bg-slate-900' : 'text-amber-400/70'}`}
        >
          Pitch Deck
        </button>
      </div>
    </header>
  );
};
