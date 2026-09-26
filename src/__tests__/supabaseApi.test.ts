import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const auth = {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    getSession: vi.fn(),
    resend: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
  };
  const from = vi.fn();
  const channelBuilder = {
    on: vi.fn(() => channelBuilder),
    subscribe: vi.fn(() => 'SUBSCRIBED'),
  };
  const channel = vi.fn(() => channelBuilder);
  const removeChannel = vi.fn(() => Promise.resolve());
  return { auth, from, channel, channelBuilder, removeChannel };
});

vi.mock('../services/supabaseService', () => ({
  supabase: {
    auth: mocks.auth,
    from: mocks.from,
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  },
}));

import {
  getCurrentUser,
  getSupabaseSession,
  getVerificationStatus,
  mapProfileRow,
  resolveStartupAuth,
  subscribeToVerification,
  supabaseLogin,
  supabaseResendConfirmation,
  supabaseSignOut,
  supabaseSignUp,
} from '../services/supabaseApi';

interface Terminal {
  insert?: unknown;
  single?: unknown;
  maybeSingle?: unknown;
}

const createQuery = (results: Terminal = {}) => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.insert = vi.fn(() => Promise.resolve(results.insert ?? { error: null }));
  chain.single = vi.fn(() => Promise.resolve(results.single ?? { data: null, error: null }));
  chain.maybeSingle = vi.fn(() => Promise.resolve(results.maybeSingle ?? { data: null, error: null }));
  return chain;
};

let tables: Record<string, Terminal>;

beforeEach(() => {
  vi.clearAllMocks();
  tables = {};
  mocks.from.mockImplementation((table: string) => createQuery(tables[table]));
});

describe('mapProfileRow', () => {
  it('maps an admin row to SystemManager', () => {
    expect(
      mapProfileRow({ id: 'u1', full_name: 'Admin', email: 'a@b.com', role: 'admin', created_at: 't' })
    ).toEqual({ id: 'u1', fullName: 'Admin', email: 'a@b.com', role: 'SystemManager', createdAt: 't', emailVerified: true, isVerified: false, verificationStatus: 'unverified' });
  });

  it('reads the is_verified flag', () => {
    expect(mapProfileRow({ id: 'u1', full_name: 'A', email: 'a@b.com', is_verified: true }).isVerified).toBe(true);
    expect(mapProfileRow({ id: 'u1', full_name: 'A', email: 'a@b.com', is_verified: false }).isVerified).toBe(false);
    expect(mapProfileRow({ id: 'u1', full_name: 'A', email: 'a@b.com' }).isVerified).toBe(false);
  });

  it('reads verification_status when the column is present', () => {
    const base = { id: 'u1', full_name: 'A', email: 'a@b.com' };
    expect(mapProfileRow({ ...base, verification_status: 'verified' }).verificationStatus).toBe('verified');
    expect(mapProfileRow({ ...base, verification_status: 'unverified' }).verificationStatus).toBe('unverified');
    expect(mapProfileRow({ ...base, verification_status: 'pending' }).verificationStatus).toBe('pending');
    expect(mapProfileRow({ ...base, verification_status: 'rejected' }).verificationStatus).toBe('rejected');
  });

  it('falls back to is_verified when verification_status is missing', () => {
    const base = { id: 'u1', full_name: 'A', email: 'a@b.com' };
    expect(mapProfileRow({ ...base, is_verified: true }).verificationStatus).toBe('verified');
    expect(mapProfileRow({ ...base, is_verified: false }).verificationStatus).toBe('unverified');
    expect(mapProfileRow(base).verificationStatus).toBe('unverified');
  });

  it('maps any other role to Athlete', () => {
    expect(mapProfileRow({ id: 'u1', full_name: 'A', email: 'a@b.com', role: 'athlete' }).role).toBe('Athlete');
    expect(mapProfileRow({ id: 'u1', full_name: 'A', email: 'a@b.com' }).role).toBe('Athlete');
  });
});

describe('supabaseSignUp', () => {
  it('does not request a confirmation email at signup', async () => {
    mocks.auth.signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
    tables.users = { insert: { error: null }, maybeSingle: { data: null } };

    await supabaseSignUp('Alex', 'alex@example.com', 'password1');

    expect(mocks.auth.signUp).toHaveBeenCalledWith({
      email: 'alex@example.com',
      password: 'password1',
      options: { data: { full_name: 'Alex' } },
    });
  });

  it('flags email confirmation when signUp returns no session', async () => {
    mocks.auth.signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
    tables.users = { insert: { error: null }, maybeSingle: { data: null } };

    const result = await supabaseSignUp('Alex', 'alex@example.com', 'password1');

    expect(result.requiresEmailConfirmation).toBe(true);
    expect(result.user).toMatchObject({
      id: 'u1',
      fullName: 'Alex',
      email: 'alex@example.com',
      role: 'Athlete',
    });
  });

  it('does not flag confirmation when a session is issued', async () => {
    mocks.auth.signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: { access_token: 't' } }, error: null });
    tables.users = { insert: { error: null }, maybeSingle: { data: { id: 'u1' } } };

    const result = await supabaseSignUp('Alex', 'alex@example.com', 'password1');
    expect(result.requiresEmailConfirmation).toBe(false);
  });

  it('marks the account unverified when email confirmation is pending', async () => {
    mocks.auth.signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
    tables.users = { insert: { error: null }, maybeSingle: { data: null } };

    const result = await supabaseSignUp('Alex', 'alex@example.com', 'password1');
    expect(result.user.emailVerified).toBe(false);
  });

  it('marks the account verified when a session is issued', async () => {
    mocks.auth.signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: { access_token: 't' } }, error: null });
    tables.users = { insert: { error: null }, maybeSingle: { data: { id: 'u1' } } };

    const result = await supabaseSignUp('Alex', 'alex@example.com', 'password1');
    expect(result.user.emailVerified).toBe(true);
  });

  it('tolerates an RLS-blocked profile insert (the trigger owns the row)', async () => {
    mocks.auth.signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
    tables.users = {
      insert: { error: { message: 'new row violates row-level security policy' } },
      maybeSingle: { data: null },
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(supabaseSignUp('Alex', 'alex@example.com', 'password1')).resolves.toBeTruthy();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('throws when the auth service rejects the signup', async () => {
    mocks.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Email rate limit exceeded' },
    });

    await expect(supabaseSignUp('Alex', 'alex@example.com', 'password1')).rejects.toThrow(/rate limit/i);
  });
});

describe('supabaseLogin', () => {
  it('maps an admin profile to SystemManager', async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    tables.users = {
      single: { data: { id: 'u1', full_name: 'Admin', email: 'a@b.com', role: 'admin', created_at: 't' }, error: null },
    };

    await expect(supabaseLogin('a@b.com', 'password1')).resolves.toMatchObject({
      id: 'u1',
      fullName: 'Admin',
      role: 'SystemManager',
    });
  });

  it('rejects invalid credentials', async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid login credentials' } });
    await expect(supabaseLogin('a@b.com', 'nope')).rejects.toThrow(/invalid login credentials/i);
  });

  it('throws when the profile row is missing', async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    tables.users = { single: { data: null, error: { message: 'no rows' } } };
    await expect(supabaseLogin('a@b.com', 'password1')).rejects.toThrow(/profile not found/i);
  });
});

describe('supabaseResendConfirmation', () => {
  it('resends with the current origin as the redirect target', async () => {
    mocks.auth.resend.mockResolvedValue({ error: null });
    await supabaseResendConfirmation('a@b.com');
    expect(mocks.auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'a@b.com',
      options: { emailRedirectTo: window.location.origin },
    });
  });

  it('propagates errors', async () => {
    mocks.auth.resend.mockResolvedValue({ error: { message: 'Email rate limit exceeded' } });
    await expect(supabaseResendConfirmation('a@b.com')).rejects.toThrow(/rate limit/i);
  });
});

describe('getSupabaseSession', () => {
  it('reports an active session and its user id', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    await expect(getSupabaseSession()).resolves.toEqual({ active: true, userId: 'u1' });
  });

  it('reports an inactive session', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(getSupabaseSession()).resolves.toEqual({ active: false, userId: null });
  });
});

describe('getCurrentUser', () => {
  it('loads and maps the profile for the session user', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    tables.users = {
      single: { data: { id: 'u1', full_name: 'Alex', email: 'a@b.com', role: 'athlete', created_at: 't' }, error: null },
    };
    await expect(getCurrentUser()).resolves.toMatchObject({ id: 'u1', fullName: 'Alex' });
  });

  it('reads verification status from the auth session', async () => {
    mocks.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email_confirmed_at: '2026-01-01T00:00:00Z' } } },
    });
    tables.users = {
      single: { data: { id: 'u1', full_name: 'Alex', email: 'a@b.com', role: 'athlete', created_at: 't' }, error: null },
    };
    await expect(getCurrentUser()).resolves.toMatchObject({ id: 'u1', emailVerified: true });
  });

  it('returns null without a session', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it('returns null when the profile row is missing', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    tables.users = { single: { data: null, error: { message: 'no rows' } } };
    await expect(getCurrentUser()).resolves.toBeNull();
  });
});

describe('resolveStartupAuth', () => {
  it('clears stale persisted auth when there is no session', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(resolveStartupAuth({ isAuthenticated: true, userId: 'u1' })).resolves.toEqual({ action: 'clear' });
  });

  it('keeps a signed-in account that is pending email verification', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(
      resolveStartupAuth({ isAuthenticated: true, userId: 'u1', emailVerified: false })
    ).resolves.toEqual({ action: 'none' });
  });

  it('does nothing when signed out and not persisted', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(resolveStartupAuth({ isAuthenticated: false })).resolves.toEqual({ action: 'none' });
  });

  it('keeps an already-matching authenticated session', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    await expect(resolveStartupAuth({ isAuthenticated: true, userId: 'u1' })).resolves.toEqual({ action: 'none' });
  });

  it('never clears or logs in an active guest', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(resolveStartupAuth({ isAuthenticated: true, isGuest: true })).resolves.toEqual({ action: 'none' });
  });

  it('auto-authenticates after the email confirmation redirect', async () => {
    // No persisted auth, but the confirmation link established a real session.
    mocks.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    tables.users = {
      single: { data: { id: 'u1', full_name: 'Alex', email: 'a@b.com', role: 'athlete', created_at: 't' }, error: null },
    };

    const result = await resolveStartupAuth({ isAuthenticated: false });
    expect(result.action).toBe('authenticated');
    if (result.action === 'authenticated') {
      expect(result.user).toMatchObject({ id: 'u1', fullName: 'Alex' });
    }
  });

  it('does not authenticate when the profile row is missing', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    tables.users = { single: { data: null, error: { message: 'no rows' } } };
    await expect(resolveStartupAuth({ isAuthenticated: false })).resolves.toEqual({ action: 'none' });
  });
});

describe('supabaseSignOut', () => {
  it('clears the Supabase auth session', async () => {
    mocks.auth.signOut.mockResolvedValue({ error: null });
    await supabaseSignOut();
    expect(mocks.auth.signOut).toHaveBeenCalledTimes(1);
  });
});

describe('getVerificationStatus', () => {
  it('returns false when unauthenticated', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(getVerificationStatus()).resolves.toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('reads is_verified from the profile row', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    tables.users = { single: { data: { is_verified: true }, error: null } };
    await expect(getVerificationStatus()).resolves.toBe(true);
    expect(mocks.from).toHaveBeenCalledWith('users');
  });

  it('defaults to false when the row is missing', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    tables.users = { single: { data: null, error: { message: 'no rows' } } };
    await expect(getVerificationStatus()).resolves.toBe(false);
  });
});

describe('subscribeToVerification', () => {
  it('subscribes to users UPDATEs and fires when is_verified flips', () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToVerification('u1', onChange);

    expect(mocks.channel).toHaveBeenCalledWith('user-verification-u1');
    expect(mocks.channelBuilder.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'users', filter: 'id=eq.u1' },
      expect.any(Function)
    );
    expect(mocks.channelBuilder.subscribe).toHaveBeenCalled();

    // Deliver an UPDATE payload the way realtime would.
    const onEvent = (mocks.channelBuilder.on as ReturnType<typeof vi.fn>).mock.calls[0][2] as (payload: {
      new: Record<string, unknown>;
    }) => void;
    onEvent({ new: { is_verified: true } });
    expect(onChange).toHaveBeenCalledWith(true);

    // Realtime only delivers when the realtime clone has replica identity full,
    // so a payload without the field must NOT fire.
    onChange.mockClear();
    onEvent({ new: {} });
    expect(onChange).not.toHaveBeenCalled();

    unsubscribe();
    expect(mocks.removeChannel).toHaveBeenCalled();
  });

  it('is a no-op without a userId', () => {
    const unsubscribe = subscribeToVerification('', vi.fn());
    unsubscribe();
    expect(mocks.channel).not.toHaveBeenCalled();
    expect(mocks.removeChannel).not.toHaveBeenCalled();
  });
});
