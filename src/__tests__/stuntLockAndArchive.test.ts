import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const from = vi.fn();
  const auth = { getSession: vi.fn() };
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  return { from, auth, channel, removeChannel: vi.fn().mockResolvedValue('ok') };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mocks.from,
    auth: mocks.auth,
    channel: vi.fn(() => mocks.channel),
    removeChannel: mocks.removeChannel,
  })),
}));

import { stuntService } from '../services/supabaseService';
import {
  supabaseGetArchivedStunts,
  supabaseArchiveStunt,
  supabaseRestoreStunt,
  supabasePermanentlyDeleteStunt,
  supabaseToggleStuntLock,
  supabaseSubscribeToStuntLockChanges,
} from '../services/supabaseApi';

describe('stuntService - lock, archive and restore', () => {
  let queryChain: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 's1', is_locked: true },
        error: null,
      }),
    };
    queryChain.then = vi.fn((resolve) => resolve({ data: [], error: null })) as any;
    mocks.from.mockReturnValue(queryChain);
  });

  it('queries only unarchived stunts in getAllStunts', async () => {
    queryChain.order = vi.fn().mockResolvedValue({ data: [{ id: 's1', name: 'High V' }], error: null });
    const stunts = await stuntService.getAllStunts();
    expect(mocks.from).toHaveBeenCalledWith('stunts');
    expect(queryChain.select).toHaveBeenCalledWith('*');
    expect(queryChain.eq).toHaveBeenCalledWith('is_archived', false);
    expect(stunts).toEqual([{ id: 's1', name: 'High V' }]);
  });

  it('queries only archived stunts in getArchivedStunts', async () => {
    queryChain.order = vi.fn().mockResolvedValue({ data: [{ id: 's2', name: 'Archived Stunt' }], error: null });
    const stunts = await stuntService.getArchivedStunts();
    expect(mocks.from).toHaveBeenCalledWith('stunts');
    expect(queryChain.select).toHaveBeenCalledWith('*');
    expect(queryChain.eq).toHaveBeenCalledWith('is_archived', true);
    expect(stunts).toEqual([{ id: 's2', name: 'Archived Stunt' }]);
  });

  it('archives a stunt by setting is_archived to true', async () => {
    queryChain.eq = vi.fn().mockResolvedValue({ error: null });
    await stuntService.archiveStunt('s1');
    expect(mocks.from).toHaveBeenCalledWith('stunts');
    expect(queryChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_archived: true })
    );
    expect(queryChain.eq).toHaveBeenCalledWith('id', 's1');
  });

  it('restores an archived stunt by setting is_archived to false', async () => {
    queryChain.eq = vi.fn().mockResolvedValue({ error: null });
    await stuntService.restoreStunt('s1');
    expect(mocks.from).toHaveBeenCalledWith('stunts');
    expect(queryChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_archived: false })
    );
    expect(queryChain.eq).toHaveBeenCalledWith('id', 's1');
  });

  it('permanently deletes a stunt row from database', async () => {
    queryChain.eq = vi.fn().mockResolvedValue({ error: null });
    await stuntService.deleteStunt('s1');
    expect(mocks.from).toHaveBeenCalledWith('stunts');
    expect(queryChain.delete).toHaveBeenCalled();
    expect(queryChain.eq).toHaveBeenCalledWith('id', 's1');
  });

  it('persists a lock only after Supabase returns the updated row', async () => {
    await stuntService.toggleLock('s1', true);
    expect(mocks.from).toHaveBeenCalledWith('stunts');
    expect(queryChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_locked: true })
    );
    expect(queryChain.eq).toHaveBeenCalledWith('id', 's1');
    expect(queryChain.select).toHaveBeenCalledWith('id, is_locked');
    expect(queryChain.maybeSingle).toHaveBeenCalled();
  });

  it('supports unlocking a stunt', async () => {
    queryChain.maybeSingle.mockResolvedValue({ data: { id: 's1', is_locked: false }, error: null });
    await stuntService.toggleLock('s1', false);
    expect(queryChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_locked: false })
    );
  });

  it('surfaces Supabase lock update errors without persisting a local lock', async () => {
    const storageSet = vi.spyOn(Storage.prototype, 'setItem');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    queryChain.maybeSingle.mockResolvedValue({ data: null, error: new Error('permission denied') });

    await expect(stuntService.toggleLock('s1', true)).rejects.toThrow('permission denied');
    expect(storageSet).not.toHaveBeenCalledWith('optistance_locked_stunts', expect.any(String));
    consoleError.mockRestore();
    storageSet.mockRestore();
  });

  it('surfaces a filtered zero-row lock update', async () => {
    queryChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(stuntService.toggleLock('s1', true)).rejects.toThrow(
      'The stunt lock was not saved'
    );
  });

  it('exposes supabaseApi wrappers for archive, restore, lock, and permanent delete', async () => {
    const deleteResult = Promise.resolve({ error: null });
    const orderResult = Promise.resolve({ data: [], error: null });

    queryChain.eq.mockImplementation((field) => {
      if (field === 'is_archived') return queryChain;
      return queryChain;
    });
    queryChain.then = vi.fn((resolve) => resolve({ data: null, error: null })) as any;
    queryChain.maybeSingle.mockResolvedValue({ data: { id: 's1', is_locked: true }, error: null });
    queryChain.order = vi.fn().mockReturnValue(orderResult);
    queryChain.delete = vi.fn(() => ({ eq: vi.fn().mockReturnValue(deleteResult) })) as any;

    await supabaseGetArchivedStunts();
    await supabaseArchiveStunt('s1');
    await supabaseRestoreStunt('s1');
    await supabaseToggleStuntLock('s1', true);
    await supabasePermanentlyDeleteStunt('s1');

    expect(mocks.from).toHaveBeenCalledWith('stunts');
  });

  it('subscribes to stunt lock changes and returns an unsubscribe function', async () => {
    const onChange = vi.fn();
    let onPayload: ((payload: { new: Record<string, unknown> }) => void) | undefined;
    mocks.channel.on.mockImplementation((_event, _filter, callback) => {
      onPayload = callback;
      return mocks.channel;
    });

    const unsubscribe = supabaseSubscribeToStuntLockChanges(onChange);
    onPayload?.({
      new: { id: 's1', name: 'High V', pose_key: 'high-v', is_locked: true },
    });

    expect(onChange).toHaveBeenCalledWith({
      id: 's1',
      name: 'High V',
      pose_key: 'high-v',
      is_locked: true,
    });
    unsubscribe();
    await Promise.resolve();
    expect(mocks.removeChannel).toHaveBeenCalledWith(mocks.channel);
  });
});
