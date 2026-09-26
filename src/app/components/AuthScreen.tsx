import React, { useState } from 'react';
import {
  Activity,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  MailWarning,
  X
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  supabaseLogin,
  supabaseSignUp,
  supabaseResetPassword
} from '../../services/supabaseApi';
import { describeAuthError } from '../utils/authErrors';
import { useResendVerification } from '../hooks/useResendVerification';

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile) => void;
  onContinueAsGuest: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, onContinueAsGuest }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginNeedsConfirmation, setLoginNeedsConfirmation] = useState(false);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup Form States
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Resend helper reused for the "email not confirmed" login case.
  const loginResend = useResendVerification(loginEmail);

  const handleResetPassword = async () => {
    setError(null);
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setIsResetting(true);
    try {
      await supabaseResetPassword(resetEmail);
      setResetEmailSent(true);
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setIsResetting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoginNeedsConfirmation(false);

    if (!loginEmail.trim()) {
      setError('Please enter your email or Athlete ID.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const authenticatedUser = await supabaseLogin(loginEmail, loginPassword);

      const loggedUser: UserProfile = {
        id: authenticatedUser.id,
        name: authenticatedUser.fullName,
        email: authenticatedUser.email,
        role: authenticatedUser.role === 'SystemManager' ? 'SystemManager' : 'Cheer Athlete',
        avatarUrl: '',
        totalSessions: 0,
        totalPracticeMinutes: 0,
        masteredCount: 0,
        isGuest: false,
        emailVerified: true,
        isVerified: authenticatedUser.isVerified === true
      };

      onAuthSuccess(loggedUser);
    } catch (err) {
      setError(describeAuthError(err));
      const raw = err instanceof Error ? err.message.toLowerCase() : '';
      setLoginNeedsConfirmation(raw.includes('not confirmed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signupName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!agreeTerms) {
      setError('Please accept the athlete safety agreement.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { user: newAccount, requiresEmailConfirmation } = await supabaseSignUp(
        signupName.trim(),
        signupEmail.trim(),
        signupPassword
      );

      // New flow: go straight to the home screen after signing up. If Supabase
      // still requires email confirmation, no session is issued yet, so the
      // account enters the app in an unverified state and an optional banner
      // lets the user verify whenever they choose.
      const newUser: UserProfile = {
        id: newAccount.id,
        name: newAccount.fullName,
        email: newAccount.email,
        role: 'Cheer Athlete',
        avatarUrl: '',
        totalSessions: 0,
        totalPracticeMinutes: 0,
        masteredCount: 0,
        isGuest: false,
        emailVerified: !requiresEmailConfirmation,
        // Newly created accounts are never pre-verified.
        isVerified: false
      };

      onAuthSuccess(newUser);
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-[#E0E0E6] flex flex-col justify-between relative overflow-x-hidden font-sans select-none">
      {/* Background ambient lighting */}
      <div className="fixed -top-[10%] -left-[10%] w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed -bottom-[10%] -right-[10%] w-[600px] h-[600px] bg-rose-900/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-purple-900/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 px-6 py-6 flex items-center justify-between max-w-md mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-rose-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-white block">OPTISTANCE</span>
            <span className="text-[9px] text-zinc-400 uppercase tracking-[0.2em] font-bold">Biomechanical Telemetry</span>
          </div>
        </div>

        <button
          onClick={onContinueAsGuest}
          className="text-xs font-bold text-zinc-400 hover:text-white px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5"
        >
          <span>Guest Mode</span>
          <ArrowRight className="w-3 h-3 text-indigo-400" />
        </button>
      </header>

      {/* Main Form Container */}
      <main className="relative z-10 max-w-md mx-auto w-full px-5 py-4 flex-1 flex flex-col justify-center">
        {/* Toggle Switch between Log In and Sign Up */}
        <div className="bg-[#0e0e14]/90 border border-white/10 p-1 rounded-2xl flex items-center mb-6 backdrop-blur-xl shadow-xl">
          <button
            onClick={() => {
              setAuthMode('login');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              authMode === 'login'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => {
              setAuthMode('signup');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              authMode === 'signup'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Card Container */}
        <div className="bg-[#0b0b10]/80 border border-white/[0.08] rounded-3xl p-6 sm:p-7 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
          {/* Form Header */}
          <div className="mb-5">
            <h1 className="text-2xl font-black text-white tracking-tight">
              {authMode === 'login' ? 'Welcome Back, Athlete' : 'Join OptiStance'}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              {authMode === 'login'
                ? 'Sign in to access your posture telemetry and stunt logs.'
                : 'Unlock real-time AI skeleton tracking & posture scoring.'}
            </p>
          </div>

          {/* Note: Demo credentials removed - users sign up with their own accounts */}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Unconfirmed email: offer a resend without leaving the login form */}
          {authMode === 'login' && loginNeedsConfirmation && (
            <div className="mb-4 -mt-1">
              <button
                type="button"
                onClick={() => void loginResend.resend()}
                disabled={loginResend.isSending}
                className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-[11px] font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loginResend.isSending ? 'Sending…' : 'Resend confirmation email'}
              </button>
              {loginResend.status && <p className="text-[11px] text-emerald-300 mt-2">{loginResend.status}</p>}
              {loginResend.error && <p className="text-[11px] text-rose-300 mt-2">{loginResend.error}</p>}
            </div>
          )}

          {/* Login Form */}
          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Email or Athlete ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="athlete@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none rounded-2xl text-xs text-white placeholder-zinc-500 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none rounded-2xl text-xs text-white placeholder-zinc-500 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(loginEmail);
                    setShowForgotPassword(true);
                    setError(null);
                  }}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{isSubmitting ? 'Signing in...' : 'Launch Telemetry Hub'}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          ) : (
            /* Sign Up Form */
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none rounded-2xl text-xs text-white placeholder-zinc-500 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none rounded-2xl text-xs text-white placeholder-zinc-500 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Create Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none rounded-2xl text-xs text-white placeholder-zinc-500 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded bg-white/5 border-white/20 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                  />
                  <span className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                    I agree to the athlete safety protocols and motion analysis terms.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{isSubmitting ? 'Creating account...' : 'Register Athlete Account'}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer Security Badges */}
      <footer className="relative z-10 px-6 py-4 flex items-center justify-between max-w-md mx-auto w-full text-[10px] text-zinc-500 font-mono">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>AES-256 KINEMATICS</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-indigo-400" />
          <span>60 FPS AI INFERENCE</span>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e0e14] border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-fade-in-up">
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setResetEmailSent(false);
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {resetEmailSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
                  <MailWarning className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Email Reset Unavailable</h3>
                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                  This app has no email service configured, so we can&apos;t send you a
                  reset link. Nothing was emailed to{' '}
                  <span className="text-zinc-300 font-semibold">{resetEmail.trim()}</span>.
                </p>
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3.5 mb-4 text-left">
                  <p className="text-xs font-bold text-white mb-1.5">How to get back in</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Contact an administrator and ask them to reset your password. They can
                    do it from the Athletes section of the admin panel in a few seconds.
                    Verify their identity first — they can set any password.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmailSent(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-base font-bold text-white mb-1">Reset Athlete Credentials</h3>
                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                  Enter your registered email so we can confirm the account exists.
                </p>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="athlete@example.com"
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 focus:border-indigo-500 focus:outline-none rounded-xl text-xs text-white placeholder-zinc-500 mb-4"
                />
                {error && <p className="text-xs text-rose-400 mb-3">{error}</p>}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setShowForgotPassword(false)}
                    className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={isResetting}
                    className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 disabled:opacity-60"
                  >
                    {isResetting ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};