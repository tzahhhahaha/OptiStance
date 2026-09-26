import { describe, expect, it } from 'vitest';
import { describeAuthError } from '../app/utils/authErrors';

describe('describeAuthError', () => {
  it('explains the email rate limit', () => {
    const message = describeAuthError(new Error('Email rate limit exceeded'));
    expect(message).toMatch(/rate limit/i);
    expect(message).toMatch(/supabase/i);
  });

  it('explains an unconfirmed email', () => {
    expect(describeAuthError(new Error('Email not confirmed'))).toMatch(/not confirmed/i);
  });

  it('detects an already-registered account', () => {
    expect(describeAuthError(new Error('User already registered'))).toMatch(/already exists/i);
  });

  it('maps invalid credentials', () => {
    expect(describeAuthError(new Error('Invalid login credentials'))).toBe('Invalid email or password.');
  });

  it('maps weak passwords', () => {
    expect(describeAuthError(new Error('Password should be at least 6 characters'))).toMatch(/too weak/i);
  });

  it('falls back to the raw message for unknown errors', () => {
    expect(describeAuthError(new Error('Network request failed'))).toBe('Network request failed');
  });

  it('handles non-Error values', () => {
    expect(describeAuthError('boom')).toBe('boom');
    expect(describeAuthError(undefined)).toBe('Something went wrong. Please try again.');
  });
});
