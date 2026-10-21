/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { displayRoleLabel, isSystemManager } from '../app/utils/profile';
import {
  MIN_PASSWORD_LENGTH,
  meetsPasswordPolicy,
} from '../app/utils/passwordPolicy';
import type { UserProfile } from '../app/types';

const asProfile = (overrides: Partial<UserProfile>): UserProfile => ({
  name: 'Alex',
  email: 'alex@example.com',
  role: 'Cheer Athlete',
  avatarUrl: '',
  totalSessions: 0,
  totalPracticeMinutes: 0,
  masteredCount: 0,
  ...overrides,
});

describe('isSystemManager', () => {
  it('recognises both spellings of the admin role', () => {
    expect(isSystemManager(asProfile({ role: 'SystemManager' }))).toBe(true);
    expect(isSystemManager(asProfile({ role: 'admin' }))).toBe(true);
  });

  it('rejects an ordinary athlete', () => {
    expect(isSystemManager(asProfile({ role: 'Cheer Athlete' }))).toBe(false);
    expect(isSystemManager(asProfile({ role: 'Athlete' }))).toBe(false);
  });

  it('handles a missing profile', () => {
    expect(isSystemManager(null)).toBe(false);
    expect(isSystemManager(undefined)).toBe(false);
  });
});

describe('displayRoleLabel', () => {
  it("shows the athlete's own cheer position when they set one", () => {
    expect(
      displayRoleLabel(asProfile({ role: 'Cheer Athlete', specialty: 'Top Flyer' }))
    ).toBe('Top Flyer');
  });

  it('never leaks the internal role string for an admin', () => {
    expect(displayRoleLabel(asProfile({ role: 'SystemManager' }))).toBe('System Manager');
  });

  it('falls back to a generic label', () => {
    expect(displayRoleLabel(asProfile({ role: 'Cheer Athlete' }))).toBe('Cheer Athlete');
    // A blank or whitespace-only specialty must not render as an empty chip.
    expect(displayRoleLabel(asProfile({ specialty: '   ' }))).toBe('Cheer Athlete');
  });
});

describe('password policy', () => {
  it('is a single shared rule', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(meetsPasswordPolicy('1234567')).toBe(false);
    expect(meetsPasswordPolicy('12345678')).toBe(true);
  });

  it('is the same length enforced at sign-up, in settings, and by an admin reset', () => {
    // These three used to disagree (6 / 8 / 8), which let an athlete choose a
    // password their own settings screen would then refuse.
    const auth = readFileSync('src/app/components/AuthScreen.tsx', 'utf8');
    const settings = readFileSync('src/app/components/SettingsScreen.tsx', 'utf8');
    const adminUsers = readFileSync('src/app/components/admin/DarkAdminUsers.tsx', 'utf8');

    for (const source of [auth, settings, adminUsers]) {
      expect(source).toMatch(/meetsPasswordPolicy/);
      // No hardcoded per-form minimums left behind.
      expect(source).not.toMatch(/at least 6 characters/);
    }
  });
});

describe('the athlete cannot grant themselves admin', () => {
  const readProfile = () => readFileSync('src/app/components/ProfileScreen.tsx', 'utf8');
  const readSettings = () => readFileSync('src/app/components/SettingsScreen.tsx', 'utf8');

  it('neither edit form offers a role field', () => {
    // Both forms used to write a free-text "Cheer Specialty / Role" straight
    // into user.role, and the admin console is gated on that value — so typing
    // "SystemManager" revealed the admin UI.
    expect(readProfile()).not.toMatch(/setEditRole/);
    expect(readSettings()).not.toMatch(/setEditRole/);
  });

  it('neither edit form writes role, email or verification flags', () => {
    for (const source of [readProfile(), readSettings()]) {
      expect(source).toMatch(/onEditProfile\(\{/);
      // The save must go through the narrow callback, not the general one.
      expect(source).not.toMatch(/onUpdateUser\(\{[^}]*\brole:/);
      expect(source).not.toMatch(/onEditProfile\(\{[^}]*\bemail:/);
    }
  });

  it('the profile save callback only accepts editable fields', () => {
    // Type-level guard: EditableProfileFields excludes the server-owned fields,
    // so a form that tried to write one would not compile.
    const types = readFileSync('src/app/types.ts', 'utf8');
    expect(types).toMatch(
      /export type EditableProfileFields = Pick<UserProfile, 'name' \| 'specialty'>;/
    );
  });
});

describe('account recovery is honest', () => {
  it('sends real recovery links via Supabase SMTP', () => {
    const auth = readFileSync('src/app/components/AuthScreen.tsx', 'utf8');
    expect(auth).toMatch(/supabaseResetPassword/);
    expect(auth).toMatch(/Reset Your Password/i);
  });

  it('offers one recovery entry point, not two', () => {
    const auth = readFileSync('src/app/components/AuthScreen.tsx', 'utf8');
    // Two "Forgot password?" controls sat in the same form.
    expect(auth.match(/Forgot password\?/gi) ?? []).toHaveLength(1);
  });
});
