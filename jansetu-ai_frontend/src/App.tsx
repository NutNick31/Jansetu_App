import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import type { User } from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { AuthGate } from './components/AuthGate';
import { CitizenPortal } from './components/CitizenPortal';
import { PolicymakerDashboard } from './components/PolicymakerDashboard';
import { DataFusionPortal } from './components/DataFusionPortal';
import { VerificationPortal } from './components/VerificationPortal';
import { PitchDeckPortal } from './components/PitchDeckPortal';
import { signOut, subscribeToAuth } from './services/firebaseAuth';
import type { 
  CitizenRequest, 
  DistrictMetric, 
  GovernmentScheme, 
  RecommendedProject, 
  NudgeAlert, 
  LanguageCode 
} from './types';
import { 
  INITIAL_CITIZEN_REQUESTS, 
  MOCK_DISTRICTS, 
  MOCK_GOVERNMENT_SCHEMES, 
  INITIAL_RECOMMENDED_PROJECTS, 
  INITIAL_NUDGES 
} from './data/mockData';
import { apiGet, apiPost } from './services/apiClient';

type BackendStatus = 'loading' | 'online' | 'offline';
type Role = 'citizen' | 'policymaker';

export function App() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [role, setRole] = useState<Role>('citizen');
  const [activeTab, setActiveTab] = useState<'citizen' | 'policymaker' | 'fusion' | 'verification' | 'pitchdeck'>('citizen');
  const [selectedLang, setSelectedLang] = useState<LanguageCode>('hi');
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('loading');
  const [actionError, setActionError] = useState<string | null>(null);

  const [requests, setRequests] = useState<CitizenRequest[]>([]);
  const [districts, setDistricts] = useState<DistrictMetric[]>([]);
  const [schemes, setSchemes] = useState<GovernmentScheme[]>([]);
  const [recommendedProjects, setRecommendedProjects] = useState<RecommendedProject[]>([]);
  const [nudges, setNudges] = useState<NudgeAlert[]>([]);

  useEffect(() => {
    const unsub = subscribeToAuth((user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    (async () => {
      try {
        const [r, d, s, p, n, me] = await Promise.all([
          apiGet<{ requests: CitizenRequest[] }>('/api/requests'),
          apiGet<{ districts: DistrictMetric[] }>('/api/districts'),
          apiGet<{ schemes: GovernmentScheme[] }>('/api/schemes'),
          apiGet<{ projects: RecommendedProject[] }>('/api/projects'),
          apiGet<{ nudges: NudgeAlert[] }>('/api/nudges'),
          apiGet<{ uid: string; email: string | null; role: Role }>('/api/me').catch(() => ({ uid: '', email: null, role: 'citizen' as Role })),
        ]);
        if (cancelled) return;
        setRequests(r.requests);
        setDistricts(d.districts);
        setSchemes(s.schemes);
        setRecommendedProjects(p.projects);
        setNudges(n.nudges);
        setRole(me.role);
        setBackendStatus('online');
      } catch (err) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn('Backend unreachable — falling back to mock data.', err);
        setRequests(INITIAL_CITIZEN_REQUESTS);
        setDistricts(MOCK_DISTRICTS);
        setSchemes(MOCK_GOVERNMENT_SCHEMES);
        setRecommendedProjects(INITIAL_RECOMMENDED_PROJECTS);
        setNudges(INITIAL_NUDGES);
        setBackendStatus('offline');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const handleNewRequest = (newReq: CitizenRequest): void => {
    setRequests(prev => [newReq, ...prev]);
    setDistricts(prev => prev.map(d => {
      if (d.districtName.toLowerCase().includes(newReq.district.toLowerCase()) || newReq.district.includes(d.districtName)) {
        return { ...d, citizenDemandCount: d.citizenDemandCount + 1 };
      }
      return d;
    }));
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });

    if (backendStatus !== 'online') return;
    // Already persisted by the backend ingest pipeline — skip the redundant write.
    if (/^req_(webapp|whatsapp|sms|ivr|ussd)_\d+_[a-z0-9]+$/i.test(newReq.id)) return;
    apiPost<{ request: CitizenRequest }>('/api/requests', newReq)
      .then(({ request }) => {
        setRequests(prev => [request, ...prev.filter(r => r.id !== newReq.id)]);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('POST /api/requests failed, keeping local state', err);
      });
  };

  const handleSanctionProject = (proj: RecommendedProject): void => {
    // Guard: citizens cannot sanction. Backend rejects with 403, so bail before touching the UI.
    if (role !== 'policymaker') {
      setActionError('Only policymakers can sanction projects. Ask an admin to add your email to POLICYMAKER_EMAILS.');
      setTimeout(() => setActionError(null), 5000);
      return;
    }
    const projId = proj.id;
    const prevProjects = recommendedProjects;
    setRecommendedProjects(prev => {
      if (prev.some(p => p.id === projId)) {
        return prev.map(p => (p.id === projId ? { ...p, status: 'sanctioned' } : p));
      }
      return [{ ...proj, status: 'sanctioned' }, ...prev];
    });
    const optimisticNudgeId = `nudge_optimistic_${Date.now()}`;
    const newNudge: NudgeAlert = {
      id: optimisticNudgeId,
      citizenPhone: 'tg:optimistic',
      requestId: 'req_001',
      channel: 'telegram',
      statusText: `🎉 Capital Sanction Approved! ₹${proj.estimatedBudgetCr} Cr allocated under ${proj.matchedSchemeAcronym} for ${proj.title}.`,
      sentTimestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      read: false
    };
    setNudges(prev => [newNudge, ...prev]);
    confetti({ particleCount: 100, spread: 90, origin: { y: 0.5 } });

    if (backendStatus !== 'online') return;

    const persistFirst = projId.startsWith('airec_')
      ? apiPost<{ project: RecommendedProject }>('/api/projects', { ...proj, status: 'recommended' }).catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('Persisting AI-generated project failed', err);
          return null;
        })
      : Promise.resolve(null);

    persistFirst
      .then(() => apiPost<{ project: RecommendedProject; nudgeCount: number; nudges: NudgeAlert[] }>(`/api/projects/${projId}/sanction`, {}))
      .then(({ project, nudges: backendNudges }) => {
        setRecommendedProjects(prev => prev.map(p => (p.id === project.id ? project : p)));
        if (Array.isArray(backendNudges) && backendNudges.length > 0) {
          setNudges(prev => [...backendNudges, ...prev.filter(n => n.id !== optimisticNudgeId)]);
        }
        return apiGet<{ preImageUrl: string; postImageUrl: string; verificationScore: number; completionDate: string }>(
          `/api/verification/projects/${project.id}/satellite-audit`,
        );
      })
      .then((audit) => {
        if (!audit) return;
        setRecommendedProjects(prev => prev.map(p =>
          p.id === projId ? { ...p, satelliteAudit: audit } : p,
        ));
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        // eslint-disable-next-line no-console
        console.warn(`Sanction flow for ${projId} failed — reverting optimistic UI`, err);
        setRecommendedProjects(prevProjects);
        setNudges(prev => prev.filter(n => n.id !== optimisticNudgeId));
        setActionError(
          /403/.test(msg)
            ? 'Sanction rejected: your account does not have policymaker permission.'
            : `Sanction failed: ${msg}`,
        );
        setTimeout(() => setActionError(null), 6000);
      });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm font-mono">
        Restoring session…
      </div>
    );
  }
  if (!authUser) return <AuthGate />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-slate-950 flex flex-col justify-between">
      <div>
        {/* Navigation Shell */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedLang={selectedLang}
          setSelectedLang={setSelectedLang}
          userEmail={authUser.email ?? undefined}
          userRole={role}
          onSignOut={() => { void signOut(); }}
        />

        {/* Floating role/permission error banner */}
        {actionError && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] max-w-lg w-[90%] bg-rose-950/95 border border-rose-700 text-rose-100 text-xs font-mono px-4 py-3 rounded-xl shadow-2xl flex items-start gap-3">
            <span className="text-rose-400 font-bold">⚠</span>
            <span className="flex-1">{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-200">×</button>
          </div>
        )}

        {/* Dynamic Views */}
        <main className="pb-12">
          {activeTab === 'citizen' && (
            <CitizenPortal
              selectedLang={selectedLang}
              requests={requests}
              onNewRequest={handleNewRequest}
            />
          )}

          {activeTab === 'policymaker' && (
            <PolicymakerDashboard
              districts={districts}
              schemes={schemes}
              recommendedProjects={recommendedProjects}
              onSanctionProject={handleSanctionProject}
              userRole={role}
            />
          )}

          {activeTab === 'fusion' && (
            <DataFusionPortal districts={districts} />
          )}

          {activeTab === 'verification' && (
            <VerificationPortal
              nudges={nudges}
              recommendedProjects={recommendedProjects}
              requests={requests}
              onNudgeSent={(nudge) => setNudges(prev => [nudge, ...prev])}
              userRole={role}
            />
          )}

          {activeTab === 'pitchdeck' && (
            <PitchDeckPortal />
          )}
        </main>
      </div>

      {/* Global DPI Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="bg-orange-500 text-slate-950 font-extrabold px-1.5 py-0.5 rounded text-[10px]">
              DPG CORE
            </span>
            <span>JanSetu AI • Open Digital Public Infrastructure Standard for India</span>
            <span
              className={
                backendStatus === 'online'
                  ? 'ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : backendStatus === 'offline'
                    ? 'ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-700/40 text-slate-300 border border-slate-600/40'
              }
              title="Backend / Firestore connectivity"
            >
              {backendStatus === 'online' ? 'LIVE • FIRESTORE' : backendStatus === 'offline' ? 'OFFLINE • MOCK DATA' : 'CONNECTING…'}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-slate-300">Powered by Bhashini AI & Google Gemini</span>
            <span className="text-teal-400 font-mono">22+ Indian Languages</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
