import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { ServiceWorkerUpdateBanner } from '../app/components/ServiceWorkerUpdateBanner';
import { useServiceWorkerUpdate } from '../app/hooks/useServiceWorkerUpdate';

afterEach(cleanup);

describe('ServiceWorkerUpdateBanner component', () => {
  it('does not render when no update is available', () => {
    const { container } = render(
      <ServiceWorkerUpdateBanner
        isUpdateAvailable={false}
        onUpdate={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders notification banner with message and actions when update is available', () => {
    const onUpdate = vi.fn();
    const onDismiss = vi.fn();

    render(
      <ServiceWorkerUpdateBanner
        isUpdateAvailable={true}
        onUpdate={onUpdate}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('Update Ready')).toBeTruthy();
    expect(screen.getByText(/New pose models & stunt definitions cached/i)).toBeTruthy();

    const updateBtn = screen.getByRole('button', { name: /^update$/i });
    fireEvent.click(updateBtn);
    expect(onUpdate).toHaveBeenCalledTimes(1);

    const dismissBtn = screen.getByLabelText(/dismiss update notification/i);
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('useServiceWorkerUpdate hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets isUpdateAvailable to true when optistance:sw-update-available event is dispatched', () => {
    const { result } = renderHook(() => useServiceWorkerUpdate());

    expect(result.current.isUpdateAvailable).toBe(false);

    act(() => {
      window.dispatchEvent(new CustomEvent('optistance:sw-update-available'));
    });

    expect(result.current.isUpdateAvailable).toBe(true);

    act(() => {
      result.current.dismissUpdate();
    });

    expect(result.current.isUpdateAvailable).toBe(false);
  });

  it('invokes window.location.reload on reloadToUpdate', () => {
    const reloadMock = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadMock },
    });

    const { result } = renderHook(() => useServiceWorkerUpdate());

    act(() => {
      result.current.reloadToUpdate();
    });

    expect(reloadMock).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });
});
