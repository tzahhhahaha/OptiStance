/// <reference types="node" />
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const mocks = vi.hoisted(() => {
  const auth = { getSession: vi.fn() };
  const from = vi.fn();
  const rpc = vi.fn();
  return { auth, from, rpc };
});

vi.mock('../services/supabaseService', () => ({
  supabase: { auth: mocks.auth, from: mocks.from, rpc: mocks.rpc },
}));

import { adminSetUserPassword, supabaseCreateSupportTicket } from '../services/supabaseApi';

const SESSION_USER_ID = '11111111-1111-1111-1111-111111111111';

const createQuery = (result: { error: { message: string } | null }) => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.insert = vi.fn(() => Promise.resolve(result));
  return chain;
};

const withSession = () =>
  mocks.auth.getSession.mockResolvedValue({ data: { session: { user: { id: SESSION_USER_ID } } } });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockImplementation(() => createQuery({ error: null }));
  withSession();
});

describe('adminSetUserPassword', () => {
  it('calls the admin-only RPC with the target id and new password', async () => {
    mocks.rpc.mockResolvedValue({ data: 'athlete@example.com', error: null });

    await adminSetUserPassword('target-id', 'NewPass123!');

    expect(mocks.rpc).toHaveBeenCalledWith('admin_set_user_password', {
      p_user_id: 'target-id',
      p_password: 'NewPass123!',
    });
  });

  it("returns the target account's email so the admin can confirm who changed", async () => {
    mocks.rpc.mockResolvedValue({ data: 'athlete@example.com', error: null });

    await expect(adminSetUserPassword('target-id', 'NewPass123!')).resolves.toBe(
      'athlete@example.com'
    );
  });

  it('surfaces the server error, e.g. the non-admin rejection', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Not authorized' } });

    await expect(adminSetUserPassword('target-id', 'NewPass123!')).rejects.toThrow('Not authorized');
  });

  it('returns an empty string rather than undefined when the RPC returns nothing', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });

    await expect(adminSetUserPassword('target-id', 'NewPass123!')).resolves.toBe('');
  });
});

describe('supabaseCreateSupportTicket', () => {
  it('files into support_tickets', async () => {
    await supabaseCreateSupportTicket('Knee calibration', 'The joint angle is off');

    expect(mocks.from).toHaveBeenCalledWith('support_tickets');
  });

  it('sends the session user id and the trimmed subject and description', async () => {
    const inserts: unknown[] = [];
    mocks.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn(() => chain);
      chain.insert = vi.fn((row: unknown) => {
        inserts.push(row);
        return Promise.resolve({ error: null });
      });
      return chain;
    });

    await supabaseCreateSupportTicket('  Knee calibration  ', '  The joint angle is off  ');

    // user_id is read from the live session rather than taken from the caller,
    // so a forged value cannot be smuggled through the payload.
    expect(inserts[0]).toEqual({
      user_id: SESSION_USER_ID,
      subject: 'Knee calibration',
      description: 'The joint angle is off',
    });
  });

  it('refuses to file a ticket when there is no session', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: null } });

    await expect(supabaseCreateSupportTicket('Subject', 'Body')).rejects.toThrow(
      /signed in/i
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('rejects an empty subject or message before touching the network', async () => {
    await expect(supabaseCreateSupportTicket('   ', 'Body')).rejects.toThrow(/both/i);
    await expect(supabaseCreateSupportTicket('Subject', '   ')).rejects.toThrow(/both/i);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('surfaces a database error rather than reporting a false success', async () => {
    mocks.from.mockImplementation(() => createQuery({ error: { message: 'row-level security' } }));

    await expect(supabaseCreateSupportTicket('Subject', 'Body')).rejects.toThrow(
      'row-level security'
    );
  });
});

describe('account recovery copy', () => {
  it('no longer claims a reset link was emailed', () => {
    // SMTP is not configured on this project, so any copy implying a delivered
    // email is a lie the athlete will act on. Guard against it coming back.
    const authScreen = readFileSync('src/app/components/AuthScreen.tsx', 'utf8');

    expect(authScreen).not.toMatch(/Reset Link Dispatched/i);
    expect(authScreen).not.toMatch(/sent recovery instructions/i);
    expect(authScreen).toMatch(/no email service configured/i);
  });

  it('tells a locked-out athlete that an admin can reset the password', () => {
    const authScreen = readFileSync('src/app/components/AuthScreen.tsx', 'utf8');

    expect(authScreen).toMatch(/administrator/i);
  });

  it('the support form persists instead of faking a confirmation', () => {
    // The old handler set a boolean and discarded the input. It must now await a
    // real insert and surface failures.
    const help = readFileSync('src/app/components/HelpSupportScreen.tsx', 'utf8');

    expect(help).toMatch(/await supabaseCreateSupportTicket/);
    expect(help).toMatch(/supportError/);
    expect(help).not.toMatch(/setSupportSent\(true\);\s*setTimeout/);
  });
});
