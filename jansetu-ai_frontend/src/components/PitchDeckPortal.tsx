import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Presentation, 
  Award, 
  CheckCircle2, 
  Building2, 
  Globe, 
  Brain, 
  Map, 
  Layers, 
  ShieldCheck, 
  Sparkles
} from 'lucide-react';

export const PitchDeckPortal: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState<number>(1);

  const totalSlides = 11;

  const slides = [
    {
      id: 1,
      tag: "COVER & VISION",
      title: "JanSetu AI — Digital Public Infrastructure for Citizen Alignment",
      subtitle: "Multilingual Voice & Spatial AI Platform Aligning Bottom-Up Citizen Demand with National Infrastructure Priorities across 700+ Indian Districts",
      bullets: [
        "Tracks: Digital Public Good (DPG) • National Infrastructure • Multilingual AI",
        "Built with Google AI: Gemini 2.5 Multimodal Vision, Policy Copilot & Bhashini ASR/TTS",
        "Integrates: PM Gati Shakti GIS, SECC Census Vulnerability, and PFMS Public Budgets"
      ],
      icon: Building2,
      accent: "from-orange-500 to-teal-500"
    },
    {
      id: 2,
      tag: "THE PROBLEM",
      title: "Fragmented Citizen Demands vs Misaligned Capital Expenditure",
      subtitle: "Governments across 28 Indian States struggle to aggregate citizen priorities into central master plans.",
      bullets: [
        "Fragmented Feedback: Citizen requests live in disconnected municipal portals, paper petitions, and local MLA offices.",
        "Unaddressed Infrastructure Deficits: High-vulnerability rural areas lack clean tap water (JJM) and roads (PMGSY) despite unspent funds.",
        "Zero Closed-Loop Visibility: Citizens have no way to track if their complaint led to a sanctioned infrastructure project."
      ],
      icon: Globe,
      accent: "from-rose-500 to-amber-500"
    },
    {
      id: 3,
      tag: "THE SOLUTION",
      title: "JanSetu AI — Scalable Voice-First Multilingual DPI Platform",
      subtitle: "A unified Digital Public Good aggregating voice/text complaints, executing spatial AI clustering, and serving actionable briefs to policymakers.",
      bullets: [
        "Voice-First & Multi-Channel: WhatsApp Business API, 1800 IVR Toll-Free, SMS, and Lightweight Web App.",
        "Powered by Bhashini AI: Native speech recognition & translation in 22+ official Indian languages.",
        "Gemini Vision Diagnostic: Automatic engineering assessment & cost estimation from citizen photo evidence."
      ],
      icon: Sparkles,
      accent: "from-teal-500 to-emerald-500"
    },
    {
      id: 4,
      tag: "INGESTION ARCHITECTURE",
      title: "Multilingual Conversational 3-Point Flow",
      subtitle: "Designed for low-literacy & rural populations to capture accurate ground truth.",
      bullets: [
        "1. What infrastructure is missing? (Road, Water, PHC, School)",
        "2. Where is it located? (Landmark, pincode, GPS cell-tower landmark)",
        "3. How many citizens are affected?",
        "Automatic voice-to-text transcription + Bhashini Neural Machine Translation to NITI Aayog standard schema."
      ],
      icon: Brain,
      accent: "from-sky-500 to-indigo-500"
    },
    {
      id: 5,
      tag: "DATA FUSION LAYER",
      title: "Contextual Cross-Referencing of 5 National Datasets",
      subtitle: "Transforming unstructured raw complaints into geospatial ground truth.",
      bullets: [
        "Citizen Signals: Unstructured voice & text urgency scores",
        "PM Gati Shakti Master Plan: Spatial GIS baselines (road network, pipeline coverage)",
        "Census & SECC Data: Socio-Economic Vulnerability Index (0.0 to 1.0)",
        "Aspirational Districts Program: Time-series development lag indicators",
        "PFMS Financial Registry: Unspent capital expenditure reserves by sector"
      ],
      icon: Layers,
      accent: "from-indigo-500 to-purple-500"
    },
    {
      id: 6,
      tag: "SPATIAL AI MATH ENGINE",
      title: "Composite Priority Index ($PI$) & H3 Hexagonal Grid Clustering",
      subtitle: "Statistical ranking formula isolating genuine infrastructure hotspots.",
      bullets: [
        "Uber H3 Hexagonal Grid: Spatial resolution 8 clustering isolating demand hotspots",
        "Priority Index Formula: PI = w₁·(Demand Volume) + w₂·(Infra Deficit) + w₃·(SECC Vulnerability)",
        "Dynamic Weighting: Allows planners to simulate policy trade-offs in real-time"
      ],
      icon: Map,
      accent: "from-amber-500 to-orange-500"
    },
    {
      id: 7,
      tag: "POLICYMAKER DASHBOARD",
      title: "Executive Decision Support & Central Scheme Matcher",
      subtitle: "Empowers NITI Aayog planners to match bottom-up demand with national budgets.",
      bullets: [
        "Interactive Heatmap: Divergence visual overlay between demand & spending",
        "Scheme Matcher: Auto-matches projects to PMGSY, Jal Jeevan Mission, AB-HIM",
        "Trade-off Simulator: Predicts citizen reach & SDG uplift score before sanctioning funds"
      ],
      icon: Building2,
      accent: "from-teal-500 to-sky-500"
    },
    {
      id: 8,
      tag: "GOOGLE AI INTEGRATION",
      title: "Gemini Multimodal Vision, Copilot & Predictive Engine",
      subtitle: "Deep integration of Google AI technologies across the DPI pipeline.",
      bullets: [
        "Gemini 2.5 Flash: Real-time image structural defect analysis & cost estimation",
        "Gemini Policy Copilot: Conversational planner assistant for budget recommendations",
        "Vertex AI / Auto-ML: Predictive demand hotspot forecasting based on monsoon & demographic trends"
      ],
      icon: Sparkles,
      accent: "from-emerald-500 to-teal-500"
    },
    {
      id: 9,
      tag: "CLOSED-LOOP VERIFICATION",
      title: "Automated Citizen Nudges & Satellite Audit",
      subtitle: "Building DPI trust through transparent status updates and ground-truth verification.",
      bullets: [
        "Automated WhatsApp Alerts: Citizens notified when their request contributes to project sanctioning",
        "ISRO / Sentinel Satellite Audit: Pre vs Post-construction satellite imagery verification",
        "Open DPG APIs: GeoJSON endpoints for state governments & civil society research"
      ],
      icon: ShieldCheck,
      accent: "from-emerald-500 to-indigo-500"
    },
    {
      id: 10,
      tag: "SCALABILITY & DEPLOYABILITY",
      title: "Designed for Pan-India DPI Deployment",
      subtitle: "Built as an open Digital Public Good for 28 States & 8 Union Territories.",
      bullets: [
        "State-Ready Architecture: Zero vendor lock-in with open APIs & standard schemas",
        "Low Bandwidth Support: Works over feature phone SMS/IVR and 2G connectivity",
        "Privacy & Anonymization: PII stripped at ingestion layer to protect citizen privacy"
      ],
      icon: Globe,
      accent: "from-sky-500 to-teal-500"
    },
    {
      id: 11,
      tag: "DEMO & SUBMISSION SUMMARY",
      title: "End-to-End Functioning Hackathon Submission",
      subtitle: "A complete, production-grade working prototype ready for judge evaluation.",
      bullets: [
        "✓ Functioning end-to-end flow across Citizen, Policymaker, and Audit Portals",
        "✓ Mandatory Google AI Integration (Gemini Multimodal Vision & Copilot)",
        "✓ Real & Realistic Indian Government Data (PM Gati Shakti, PFMS, SECC)",
        "✓ Multilingual 22+ Bhashini AI Speech Support",
        "✓ Pan-India Scalability across Aspirational Districts"
      ],
      icon: Award,
      accent: "from-amber-500 to-emerald-500"
    }
  ];

  const slide = slides[currentSlide - 1];
  const IconComponent = slide.icon;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Slide Navigation Control Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Presentation className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-sm font-bold text-white">JanSetu AI Pitch Deck & Submission Viewer</h2>
            <span className="text-xs text-slate-400">Interactive 11-Slide Deck for Judges</span>
          </div>
        </div>

        {/* Slide Counter & Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setCurrentSlide(prev => Math.max(1, prev - 1))}
            disabled={currentSlide === 1}
            className={`p-2 rounded-xl border transition-all ${
              currentSlide === 1 ? 'bg-slate-950 text-slate-700 border-slate-900 cursor-not-allowed' : 'bg-slate-950 text-slate-200 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            Slide {currentSlide} / {totalSlides}
          </span>

          <button
            onClick={() => setCurrentSlide(prev => Math.min(totalSlides, prev + 1))}
            disabled={currentSlide === totalSlides}
            className={`p-2 rounded-xl border transition-all ${
              currentSlide === totalSlides ? 'bg-slate-950 text-slate-700 border-slate-900 cursor-not-allowed' : 'bg-slate-950 text-slate-200 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Presentation Slide View */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-8 sm:p-12 shadow-2xl relative min-h-[500px] flex flex-col justify-between overflow-hidden">
        
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div>
          {/* Tag & Icon Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-6 mb-8">
            <span className={`text-xs font-extrabold uppercase tracking-widest bg-gradient-to-r ${slide.accent} bg-clip-text text-transparent`}>
              {slide.tag}
            </span>
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg">
              <IconComponent className="w-6 h-6 text-teal-400" />
            </div>
          </div>

          {/* Slide Title & Subtitle */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {slide.title}
            </h1>
            <p className="text-base sm:text-lg text-slate-300 font-medium max-w-3xl">
              {slide.subtitle}
            </p>
          </div>

          {/* Bullet Points */}
          <div className="mt-8 space-y-4 max-w-3xl">
            {slide.bullets.map((bullet, idx) => (
              <div key={idx} className="flex items-start space-x-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                <span className="text-sm text-slate-200 leading-relaxed">{bullet}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Slide Footer */}
        <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <div className="flex items-center space-x-2">
            <span className="bg-orange-500 text-slate-950 px-1.5 py-0.5 rounded font-extrabold text-[10px]">
              JANSETU DPI
            </span>
            <span>Google AI Hackathon Submission • Pan-India Infrastructure Alignment</span>
          </div>

          {/* Mini Slide Dots Selector */}
          <div className="flex items-center space-x-1.5">
            {slides.map((s) => (
              <button
                key={s.id}
                onClick={() => setCurrentSlide(s.id)}
                className={`h-2 rounded-full transition-all ${
                  s.id === currentSlide ? 'w-6 bg-teal-400' : 'w-2 bg-slate-800 hover:bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
