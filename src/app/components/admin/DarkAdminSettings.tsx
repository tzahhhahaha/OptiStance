import React, { useCallback, useEffect, useState } from 'react';
import { Database, HardDrive, Info, RefreshCw, ShieldCheck, Wifi, WifiOff, Trash2 } from 'lucide-react';
import { mediaService } from '../../../services/supabaseService';
import packageJson from '../../../../package.json';

/** localStorage keys this app owns. Used only for the local-data summary. */
const APP_KEY_PREFIX = 'optistance_';

interface LocalUsage {
  keys: { name: string; bytes: number }[];
  totalBytes: number;
}

/** Size of every app-owned localStorage entry, biggest first. */
const readLocalUsage = (): LocalUsage => {
  const keys: { name: string; bytes: number }[] = [];
  let totalBytes = 0;

  for (let i = 0; i < localStorage.length; i += 1) {
    const name = localStorage.key(i);
    if (name === null || !name.startsWith(APP_KEY_PREFIX)) continue;
    const bytes = (localStorage.getItem(name) ?? '').length * 2; // UTF-16 code units
    keys.push({ name, bytes });
    totalBytes += bytes;
  }

  return { keys: keys.sort((a, b) => b.bytes - a.bytes), totalBytes };
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/** Human labels for the local keys, so the list is not just identifiers. */
const KEY_LABELS: Record<string, string> = {
  optistance_auth_user: 'Signed-in account',
  optistance_is_authenticated: 'Auth flag',
  optistance_user: 'Profile cache',
  optistance_sessions: 'Practice history (unscoped)',
  optistance_settings: 'Display preferences',
  optistance_pending_sessions: 'Sessions queued for upload',
  optistance_admin_settings: 'Legacy admin toggles (unused)',
};

export default function DarkAdminSettings() {
  const [storageUsed, setStorageUsed] = useState<string>('—');
  const [storageError, setStorageError] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [local, setLocal] = useState<LocalUsage>({ keys: [], totalBytes: 0 });
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  const loadStorage = useCallback(async () => {
    setStorageError(false);
    try {
      const bytes = await mediaService.getTotalStorageUsage();
      setStorageUsed(formatBytes(bytes));
    } catch {
      setStorageUsed('Unavailable');
      setStorageError(true);
    }
  }, []);

  useEffect(() => {
    setLocal(readLocalUsage());
    void loadStorage();

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [loadStorage]);

  const clearLocalData = () => {
    const doomed = Object.keys(localStorage).filter((k) => k.startsWith(APP_KEY_PREFIX));
    for (const key of doomed) localStorage.removeItem(key);
    setLocal(readLocalUsage());
    setConfirmingClear(false);
    setCleared(true);
  };

  const backendConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="text-2xl font-black text-white tracking-tight">System</h3>
        <p className="text-sm text-zinc-400 mt-1">
          What this build is connected to, and what it can actually do
        </p>
      </div>

      {/*
        The old page offered six toggles — email notifications, scoring mode,
        audio feedback, upload size, automatic backups, debug mode — all saved
        to a localStorage key that no other file in the project ever read.
        Flipping any of them changed nothing anywhere, including for the next
        admin to sign in on the same device. Rather than keep a settings page
        that lies, this one reports verifiable state only.

        Platform-wide policies (scoring weights, upload limits, backups) are not
        configurable from the app because they are not implemented at all; the
        upload limit in particular is a hardcoded constant in
        services/poseImages.ts. Making them configurable needs a settings table
        and a server-side consumer, which is a backend task, not a UI one.
      */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Fact
          icon={Info}
          label="App Version"
          value={packageJson.version || '—'}
          hint="From package.json"
        />
        <Fact
          icon={Database}
          label="Backend"
          value={backendConfigured ? 'Supabase (configured)' : 'Not configured'}
          hint={
            backendConfigured
              ? 'RLS decides what this session can read.'
              : 'Set VITE_SUPABASE_URL to enable sync.'
          }
          tone={backendConfigured ? 'ok' : 'warn'}
        />
        <Fact
          icon={isOnline ? Wifi : WifiOff}
          label="Connection"
          value={isOnline ? 'Online' : 'Offline'}
          hint={isOnline ? 'Reconnects automatically.' : 'Showing cached data only.'}
          tone={isOnline ? 'ok' : 'warn'}
        />
        <Fact
          icon={HardDrive}
          label="Media Storage"
          value={storageUsed}
          hint={
            storageError
              ? 'Could not read storage usage — check the media bucket policy.'
              : 'Pose reference images'
          }
          tone={storageError ? 'warn' : 'neutral'}
        />
      </div>

      {/* Platform capabilities — stated, not toggleable. */}
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Account recovery
        </h4>
        <div className="space-y-3 text-sm leading-relaxed text-zinc-400">
          <p>
            <span className="font-bold text-white">Self-service password reset is
            unavailable.</span> This project has no SMTP host configured, so Supabase
            cannot deliver a reset email. Athletes who are locked out must ask an
            administrator, who can set a new password from{' '}
            <span className="text-zinc-300">Athletes → Manage → Reset Password</span>.
          </p>
          <p className="text-xs text-zinc-500">
            Every admin reset is written to <code>password_reset_audit</code>. The
            password itself is never logged, emailed, or recoverable — hand it over
            over a channel you trust.
          </p>
        </div>
      </section>

      {/* Local device data — real, and clearable. */}
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
            <HardDrive className="h-4 w-4 text-indigo-400" />
            Cached on this device
          </h4>
          <button
            onClick={() => setLocal(readLocalUsage())}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-zinc-300 transition-all hover:bg-white/[0.1]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Recheck
          </button>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-zinc-500">
          Display preferences and the sign-in cache live here, scoped per account.
          Server records are not affected. On a shared or kiosk device this is
          worth clearing between users.
        </p>

        {local.keys.length === 0 ? (
          <p className="text-xs text-zinc-500">Nothing cached for this device.</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {local.keys.map((entry) => (
              <li
                key={entry.name}
                className="flex items-center justify-between gap-3 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-200">
                    {KEY_LABELS[entry.name] ?? entry.name}
                  </p>
                  <p className="truncate text-[10px] text-zinc-600">{entry.name}</p>
                </div>
                <span className="shrink-0 tabular-nums text-zinc-400">
                  {formatBytes(entry.bytes)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs text-zinc-500">
          Total: <span className="font-bold text-white">{formatBytes(local.totalBytes)}</span>
        </p>

        {cleared && (
          <p
            role="status"
            className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200"
          >
            Local cache cleared. Sign-in state on this device was removed; server data is
            untouched.
          </p>
        )}

        {local.keys.length > 0 && (
          <div className="mt-4">
            {confirmingClear ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
                <p className="mb-3 text-xs text-rose-200">
                  Clear all {local.keys.length} cached{' '}
                  {local.keys.length === 1 ? 'entry' : 'entries'} on this device? You will
                  be asked to sign in again. Nothing on the server is deleted.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={clearLocalData}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-500"
                  >
                    Clear cache
                  </button>
                  <button
                    onClick={() => setConfirmingClear(false)}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.05] px-4 py-2 text-xs font-bold text-zinc-300 transition-colors hover:bg-white/[0.1]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setConfirmingClear(true);
                  setCleared(false);
                }}
                className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300 transition-all hover:bg-rose-500/20"
              >
                <Trash2 className="h-4 w-4" />
                Clear cached data
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  icon: typeof Info;
  label: string;
  value: string;
  hint: string;
  tone?: 'neutral' | 'ok' | 'warn';
}) {
  const valueClass =
    tone === 'ok'
      ? 'text-emerald-400'
      : tone === 'warn'
        ? 'text-amber-400'
        : 'text-white';

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className={`text-sm font-bold ${valueClass}`}>{value}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">{hint}</p>
    </div>
  );
}
