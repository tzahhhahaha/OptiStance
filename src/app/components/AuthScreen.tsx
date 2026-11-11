import React, { useState, useEffect } from 'react';
import {
  Activity,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  X,
  Send,
  CheckCircle2
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  supabaseLogin,
  supabaseSignUp,
  supabaseResetPassword,
  supabaseUpdatePassword
} from '../../services/supabaseApi';
import { describeAuthError } from '../utils/authErrors';
import { useResendVerification } from '../hooks/useResendVerification';
import { PASSWORD_RULE_MESSAGE, meetsPasswordPolicy } from '../utils/passwordPolicy';
import { translate as t } from '../utils/localization';

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile) => void;
  onContinueAsGuest: () => void;
  isPasswordRecovery?: boolean;
  onPasswordRecoveryComplete?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  onContinueAsGuest,
  isPasswordRecovery = false,
  onPasswordRecoveryComplete
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  /** Prefilled from the login field so the recovery panel can name the account. */
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordResetComplete, setPasswordResetComplete] = useState(false);
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
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Post-Signup Verification Choice Modal State
  const [pendingUser, setPendingUser] = useState<UserProfile | null>(null);
  const [showVerifyChoiceModal, setShowVerifyChoiceModal] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend helper for login and signup confirmation flows
  const loginResend = useResendVerification(loginEmail);
  const signupResend = useResendVerification(pendingUser?.email || signupEmail);

  // 60-second cooldown after initial signup so the user does not accidentally
  // double-send and trigger Supabase's 60-second security rate-limit block.
  useEffect(() => {
    if (!showVerifyChoiceModal || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [showVerifyChoiceModal, resendCooldown]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoginNeedsConfirmation(false);

    if (!loginEmail.trim()) {
      setError('Please enter your email address.');
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
    if (!meetsPasswordPolicy(signupPassword)) {
      setError(PASSWORD_RULE_MESSAGE);
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

      if (!requiresEmailConfirmation) {
        onAuthSuccess(newUser);
        return;
      }

      // Supabase's signUp() already dispatched the confirmation email when
      // requiresEmailConfirmation is true. Show the confirmation notice with a
      // 60s cooldown on Resend so the user does not double-send and hit rate limits.
      setPendingUser(newUser);
      setResendCooldown(60);
      setShowVerifyChoiceModal(true);
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-[#E0E0E6] flex flex-col justify-between relative overflow-x-hidden font-sans">
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
            <span className="text-[9px] text-zinc-400 uppercase tracking-[0.2em] font-bold">{t('Biomechanical Telemetry')}</span>
          </div>
        </div>

        <button
          onClick={onContinueAsGuest}
          className="text-xs font-bold text-zinc-400 hover:text-white px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5"
        >
          <span>{t('Guest Mode')}</span>
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
            {t('Log In')}
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
            {t('Create Account')}
          </button>
        </div>

        {/* Card Container */}
        <div className="bg-[#0b0b10]/80 border border-white/[0.08] rounded-3xl p-6 sm:p-7 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
          {/* Form Header */}
          <div className="mb-5">
            <h1 className="text-2xl font-black text-white tracking-tight">
              {authMode === 'login' ? t('Welcome Back, Athlete') : t('Join OptiStance')}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              {authMode === 'login'
                ? t('Sign in to see your practice history and progress.')
                : t('Create an account to save your scores and track progress.')}
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

          {passwordResetComplete && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
              Password updated successfully. Sign in with your new password.
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
                {loginResend.isSending ? t('Sending…') : t('Resend confirmation email')}
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
                  {t('Email Address')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder={t('Email Address')}
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none rounded-2xl text-xs text-white placeholder-zinc-500 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    {t('Password')}
                  </label>
                  {/* Single recovery entry point. This used to be duplicated —
                      once here and again below the fields — which read as two
                      different things and made the form look unbalanced. */}
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(loginEmail);
                      setShowForgotPassword(true);
                      setError(null);
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                  >
                    {t('Forgot Password?')}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none rounded-2xl text-xs text-white placeholder-zinc-500 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('Hide password') : t('Show password')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{isSubmitting ? t('Signing in...') : t('Log In')}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          ) : (
            /* Sign Up Form */
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  {t('Full Name')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder={t('Full Name')}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none rounded-2xl text-xs text-white placeholder-zinc-500 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  {t('Email Address')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder={t('Email Address')}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none rounded-2xl text-xs text-white placeholder-zinc-500 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-password" className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  {t('Create Password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder={PASSWORD_RULE_MESSAGE}
                    aria-describedby="signup-password-hint"
                    className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none rounded-2xl text-xs text-white placeholder-zinc-500 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('Hide password') : t('Show password')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p id="signup-password-hint" className="text-[11px] text-zinc-500 mt-1.5">
                  {PASSWORD_RULE_MESSAGE}
                </p>
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
                    {t('I agree to the athlete safety protocols and motion analysis terms.')}
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(99,102,241,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{isSubmitting ? t('Creating account...') : t('Create Account')}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer trust line. These used to read "AES-256 KINEMATICS" and
          "60 FPS AI INFERENCE" — encryption and throughput claims the app
          neither makes nor can substantiate. Kept the icons, dropped the claims. */}
      <footer className="relative z-10 px-6 py-4 flex items-center justify-between max-w-md mx-auto w-full text-[10px] text-zinc-500 font-mono">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t('ON-DEVICE POSE ANALYSIS')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-indigo-400" />
          <span>{t('NO DATA LEAVES YOUR PHONE')}</span>
        </div>
      </footer>

      {/* Post-Signup Confirmation Notice Modal */}
      {showVerifyChoiceModal && pendingUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-[#0e0e14] border border-white/10 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl relative animate-fade-in-up text-[#E0E0E6]"
          >
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <Mail className="w-7 h-7" />
              </div>

              <h3 className="text-lg font-black text-white mb-1.5">
                Confirmation Email Sent!
              </h3>

              <p className="text-xs text-zinc-400 mb-2 leading-relaxed">
                We automatically dispatched a confirmation link to:
              </p>
              <p className="text-xs font-semibold text-indigo-300 break-all bg-white/5 border border-white/10 rounded-xl py-1.5 px-3 mb-4">
                {pendingUser.email}
              </p>

              <p className="text-[11px] text-zinc-400 mb-5 leading-relaxed text-left bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                <span className="font-semibold text-zinc-200 block mb-0.5">What happens next:</span>
                Check your inbox (and spam folder) and click the link to confirm. You can enter the app right now and confirm anytime from your <span className="text-indigo-300 font-semibold">Profile tab</span>.
              </p>

              {signupResend.status && (
                <div className="mb-4 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{signupResend.status}</span>
                </div>
              )}
              {signupResend.error && (
                <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-left">
                  {signupResend.error}
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowVerifyChoiceModal(false);
                    onAuthSuccess(pendingUser);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 hover:opacity-95 text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-2"
                >
                  <span>Continue to App</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const res = await signupResend.resend();
                    if (res?.ok) {
                      setResendCooldown(60);
                    }
                  }}
                  disabled={signupResend.isSending || resendCooldown > 0}
                  className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {signupResend.isSending
                      ? 'Resending…'
                      : resendCooldown > 0
                        ? `Didn't get it? Resend in ${resendCooldown}s`
                        : 'Resend Confirmation Email'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPasswordRecovery && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-password-title"
            className="bg-[#0e0e14] border border-white/10 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl relative animate-fade-in-up"
          >
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-7 h-7" />
              </div>
              <h3 id="new-password-title" className="text-lg font-black text-white mb-1.5">
                Choose a New Password
              </h3>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                Enter a new password to finish recovering your account.
              </p>

              {passwordResetComplete ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                  Your password has been updated. You can now continue using your account.
                </div>
              ) : (
                <>
                  {passwordResetError && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-left">
                      {passwordResetError}
                    </div>
                  )}

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!meetsPasswordPolicy(newPassword)) {
                        setPasswordResetError(PASSWORD_RULE_MESSAGE);
                        return;
                      }
                      if (newPassword !== confirmNewPassword) {
                        setPasswordResetError('Passwords do not match.');
                        return;
                      }

                      setIsUpdatingPassword(true);
                      setPasswordResetError(null);
                      try {
                        await supabaseUpdatePassword(newPassword);
                        setPasswordResetComplete(true);
                        onPasswordRecoveryComplete?.();
                      } catch (err) {
                        setPasswordResetError(describeAuthError(err));
                      } finally {
                        setIsUpdatingPassword(false);
                      }
                    }}
                    className="space-y-3"
                  >
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={PASSWORD_RULE_MESSAGE}
                      autoComplete="new-password"
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none rounded-2xl text-xs text-white placeholder-zinc-500 transition-all shadow-sm"
                    />
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none rounded-2xl text-xs text-white placeholder-zinc-500 transition-all shadow-sm"
                    />
                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isUpdatingPassword ? 'Updating Password…' : 'Update Password'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showForgotPassword && !isPasswordRecovery && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => {
            setShowForgotPassword(false);
            setResetStatus(null);
            setResetError(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="recovery-title"
            className="bg-[#0e0e14] border border-white/10 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl relative animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setResetStatus(null);
                setResetError(null);
              }}
              aria-label="Close"
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                <Lock className="w-7 h-7" />
              </div>
              <h3 id="recovery-title" className="text-lg font-black text-white mb-1.5">
                Reset Your Password
              </h3>
              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                Enter your registered email address and we will send a password recovery link to your inbox.
              </p>

              {resetStatus && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{resetStatus}</span>
                </div>
              )}

              {resetError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-left">
                  {resetError}
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!resetEmail.trim() || !resetEmail.includes('@')) {
                    setResetError('Please enter a valid email address.');
                    return;
                  }
                  setIsSendingReset(true);
                  setResetError(null);
                  setResetStatus(null);
                  try {
                    await supabaseResetPassword(resetEmail.trim());
                    setResetStatus('Password reset link sent! Check your inbox (and spam folder).');
                  } catch (err) {
                    setResetError(describeAuthError(err));
                  } finally {
                    setIsSendingReset(false);
                  }
                }}
                className="space-y-3"
              >
                <div className="relative text-left">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:bg-white/[0.08] focus:outline-none rounded-2xl text-xs text-white placeholder-zinc-500 transition-all shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingReset ? 'Sending Link…' : 'Send Reset Link'}</span>
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetStatus(null);
                  setResetError(null);
                }}
                className="w-full mt-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white text-xs font-bold transition-all"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
