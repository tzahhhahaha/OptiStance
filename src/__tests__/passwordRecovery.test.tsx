import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  supabaseLogin: vi.fn(),
  supabaseSignUp: vi.fn(),
  supabaseResetPassword: vi.fn(),
  supabaseUpdatePassword: vi.fn(),
  supabaseResendConfirmation: vi.fn(),
}));

vi.mock('../services/supabaseApi', () => mocks);

import { AuthScreen } from '../app/components/AuthScreen';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderRecoveryScreen = (onPasswordRecoveryComplete = vi.fn()) => {
  render(
    <AuthScreen
      onAuthSuccess={vi.fn()}
      onContinueAsGuest={vi.fn()}
      isPasswordRecovery
      onPasswordRecoveryComplete={onPasswordRecoveryComplete}
    />
  );
  return onPasswordRecoveryComplete;
};

describe('password recovery screen', () => {
  it('updates the password and returns to sign in', async () => {
    mocks.supabaseUpdatePassword.mockResolvedValue(undefined);
    const onComplete = renderRecoveryScreen();

    fireEvent.change(screen.getByPlaceholderText(/Password must be at least/), {
      target: { value: 'new-password-123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
      target: { value: 'new-password-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    await waitFor(() => {
      expect(mocks.supabaseUpdatePassword).toHaveBeenCalledWith('new-password-123');
      expect(onComplete).toHaveBeenCalledOnce();
    });
  });

  it('rejects short passwords and mismatched confirmation without calling Supabase', () => {
    renderRecoveryScreen();

    fireEvent.change(screen.getByPlaceholderText(/Password must be at least/), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
      target: { value: 'different' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy();
    expect(mocks.supabaseUpdatePassword).not.toHaveBeenCalled();
  });

  it('shows Supabase errors and keeps the recovery screen available', async () => {
    mocks.supabaseUpdatePassword.mockRejectedValue(new Error('recovery link expired'));
    renderRecoveryScreen();

    fireEvent.change(screen.getByPlaceholderText(/Password must be at least/), {
      target: { value: 'new-password-123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
      target: { value: 'new-password-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update Password' }));

    expect(await screen.findByText(/recovery link expired/i)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Choose a New Password' })).toBeTruthy();
  });
});
