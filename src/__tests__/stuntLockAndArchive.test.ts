import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const from = vi.fn();
  const auth = { getSession: vi.fn() };
  return { from, auth };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mocks.from,
    auth: mocks.auth,
  })),
}));

import { stuntService } from '../services/supabaseService';
import {
  supabaseGetArchivedStunts,
  supabaseArchiveStunt,
  supabaseRestoreStunt,
  supabasePermanentlyDeleteStunt,
  supabaseToggleStuntLock,
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

  it('toggles lock state to true or false for temporary pose availability control', async () => {
    queryChain.eq = vi.fn().mockResolvedValue({ error: null });
    
    // Lock pose
    await stuntService.toggleLock('s1', true);
    expect(mocks.from).toHaveBeenCalledWith('stunts');
    expect(queryChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_locked: true })
    );
    expect(queryChain.eq).toHaveBeenCalledWith('id', 's1');

    // Unlock pose
    await stuntService.toggleLock('s1', false);
    expect(queryChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_locked: false })
    );
  });

  it('exposes supabaseApi wrappers for archive, restore, lock, and permanent delete', async () => {
    const updateResult = Promise.resolve({ error: null });
    const deleteResult = Promise.resolve({ error: null });
    const orderResult = Promise.resolve({ data: [], error: null });

    queryChain.eq = vi.fn((field) => {
      if (field === 'is_archived') return queryChain;
      return updateResult;
    });
    queryChain.order = vi.fn().mockReturnValue(orderResult);
    queryChain.delete = vi.fn(() => ({ eq: vi.fn().mockReturnValue(deleteResult) })) as any;

    await supabaseGetArchivedStunts();
    await supabaseArchiveStunt('s1');
    await supabaseRestoreStunt('s1');
    await supabaseToggleStuntLock('s1', true);
    await supabasePermanentlyDeleteStunt('s1');

    expect(mocks.from).toHaveBeenCalledWith('stunts');
  });
});
