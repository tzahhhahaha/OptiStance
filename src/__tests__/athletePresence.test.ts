import { describe, expect, it } from 'vitest';

/**
 * Replicated helper from DarkAdminUsers.tsx to unit-test timestamp formatting rules.
 */
const formatLastActive = (lastSessionAt: string | null, now = Date.now()): string => {
  if (!lastSessionAt) return 'Never practiced';
  const timestamp = new Date(lastSessionAt).getTime();
  if (isNaN(timestamp)) return 'Never practiced';
  const diffMs = now - timestamp;
  if (diffMs < 0) return 'Just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(lastSessionAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

interface TestAthlete {
  id: string;
  name: string;
  isActive: boolean;
  isVerified: boolean;
  lastSessionAt: string | null;
}

type ScopeFilter = 'all' | 'online' | 'active' | 'deactivated' | 'verified' | 'unverified';

const matchesScope = (
  athlete: TestAthlete,
  scope: ScopeFilter,
  onlineUserIds: Set<string>
): boolean => {
  switch (scope) {
    case 'online':
      return onlineUserIds.has(athlete.id);
    case 'active':
      return athlete.isActive;
    case 'deactivated':
      return !athlete.isActive;
    case 'verified':
      return athlete.isVerified;
    case 'unverified':
      return !athlete.isVerified;
    default:
      return true;
  }
};

describe('formatLastActive', () => {
  const BASE_TIME = new Date('2026-09-29T12:00:00Z').getTime();

  it('handles null and invalid timestamps as "Never practiced"', () => {
    expect(formatLastActive(null, BASE_TIME)).toBe('Never practiced');
    expect(formatLastActive('invalid-date', BASE_TIME)).toBe('Never practiced');
  });

  it('handles sessions under 1 minute ago as "Just now"', () => {
    const sessionTime = new Date(BASE_TIME - 30 * 1000).toISOString();
    expect(formatLastActive(sessionTime, BASE_TIME)).toBe('Just now');
  });

  it('formats minutes ago', () => {
    const sessionTime = new Date(BASE_TIME - 25 * 60 * 1000).toISOString();
    expect(formatLastActive(sessionTime, BASE_TIME)).toBe('25m ago');
  });

  it('formats hours ago', () => {
    const sessionTime = new Date(BASE_TIME - 3 * 3600 * 1000).toISOString();
    expect(formatLastActive(sessionTime, BASE_TIME)).toBe('3h ago');
  });

  it('formats 1 day ago as "Yesterday"', () => {
    const sessionTime = new Date(BASE_TIME - 26 * 3600 * 1000).toISOString();
    expect(formatLastActive(sessionTime, BASE_TIME)).toBe('Yesterday');
  });

  it('formats multiple days ago', () => {
    const sessionTime = new Date(BASE_TIME - 4 * 86400 * 1000).toISOString();
    expect(formatLastActive(sessionTime, BASE_TIME)).toBe('4d ago');
  });

  it('formats older than 30 days as month and day', () => {
    const sessionTime = new Date('2026-08-01T10:00:00Z').toISOString();
    const result = formatLastActive(sessionTime, BASE_TIME);
    expect(result).toMatch(/Aug/);
  });
});

describe('ScopeFilter with Real Online Presence', () => {
  const athletes: TestAthlete[] = [
    { id: 'ath-1', name: 'Alice', isActive: true, isVerified: true, lastSessionAt: '2026-09-29T10:00:00Z' },
    { id: 'ath-2', name: 'Bob', isActive: true, isVerified: false, lastSessionAt: null },
    { id: 'ath-3', name: 'Charlie', isActive: false, isVerified: false, lastSessionAt: '2026-09-20T10:00:00Z' },
  ];

  const onlineUserIds = new Set(['ath-1']);

  it('filters by "online" returning only actively connected athletes', () => {
    const online = athletes.filter((a) => matchesScope(a, 'online', onlineUserIds));
    expect(online.map((a) => a.id)).toEqual(['ath-1']);
  });

  it('filters by "active" accounts (non-deactivated)', () => {
    const activeAccounts = athletes.filter((a) => matchesScope(a, 'active', onlineUserIds));
    expect(activeAccounts.map((a) => a.id)).toEqual(['ath-1', 'ath-2']);
  });

  it('filters by "deactivated" accounts', () => {
    const deactivated = athletes.filter((a) => matchesScope(a, 'deactivated', onlineUserIds));
    expect(deactivated.map((a) => a.id)).toEqual(['ath-3']);
  });

  it('filters by "all" returning everyone', () => {
    const all = athletes.filter((a) => matchesScope(a, 'all', onlineUserIds));
    expect(all.length).toBe(3);
  });
});
