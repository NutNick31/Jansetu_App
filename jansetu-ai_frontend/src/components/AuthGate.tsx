import React, { useState } from 'react';
import { Loader2, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { signIn, signInWithGoogle, signUp } from '../services/firebaseAuth';

type Mode = 'signin' | 'signup';

const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.85 0-5.27-1.92-6.13-4.5H2.18v2.83A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.87 14.15A6.6 6.6 0 0 1 5.53 12c0-.75.13-1.47.34-2.15V7.02H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.98l3.69-2.83z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.02l3.69 2.83C6.73 7.3 9.15 5.38 12 5.38z" />
  </svg>
);

export const AuthGate: React.FC = () => {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<false | 'password' | 'google'>(false);
  const [error, setError] = useState<string | null>(null);

  const friendlyError = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err);
    const match = /auth\/([a-z-]+)/i.exec(raw);
    return match ? match[1].replace(/-/g, ' ') : raw;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      setError('Enter an email and a password of at least 6 characters.');
      return;
    }
    setBusy('password');
    setError(null);
    try {
      if (mode === 'signin') await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async (): Promise<void> => {
    setBusy('google');
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-emerald-950 text-emerald-300 border border-emerald-700 px-3 py-1 rounded-full text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            JanSetu AI · Digital Public Good
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            {mode === 'signin' ? 'Sign in to JanSetu' : 'Create your JanSetu account'}
          </h1>
          <p className="text-xs text-slate-400">
            Citizens submit infrastructure requests. Policymakers sanction projects and dispatch nudges.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy !== false}
          className="w-full bg-white hover:bg-slate-100 disabled:bg-slate-700 disabled:cursor-not-allowed text-slate-900 disabled:text-slate-400 font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all border border-slate-300"
        >
          {busy === 'google' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <GoogleIcon className="w-4 h-4" />
          )}
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-300 mb-1 block">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.gov.in"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-700"
              disabled={busy !== false}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-300 mb-1 block">Password</span>
            <input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-700"
              disabled={busy !== false}
            />
          </label>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded-lg px-3 py-2 font-mono">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy !== false}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:cursor-not-allowed text-slate-950 disabled:text-slate-400 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
          >
            {busy === 'password' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'signin' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>{mode === 'signin' ? 'Sign in' : 'Create account'}</span>
          </button>
        </form>

        <div className="text-center text-xs text-slate-400">
          {mode === 'signin' ? (
            <>New here?{' '}
              <button onClick={() => { setMode('signup'); setError(null); }} className="text-emerald-400 hover:text-emerald-300 underline">
                Create an account
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => { setMode('signin'); setError(null); }} className="text-emerald-400 hover:text-emerald-300 underline">
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
