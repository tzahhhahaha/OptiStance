import { useState, useEffect, useCallback } from 'react';

export interface ServiceWorkerUpdateState {
  isUpdateAvailable: boolean;
  reloadToUpdate: () => void;
  dismissUpdate: () => void;
}

/**
 * Hook that listens for service worker lifecycle updates and signals
 * when newly cached models/stunt assets are ready to be activated.
 */
export function useServiceWorkerUpdate(): ServiceWorkerUpdateState {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUpdateAvailable = () => {
      setIsUpdateAvailable(true);
    };

    window.addEventListener('optistance:sw-update-available', handleUpdateAvailable);

    // Also check active registration directly if supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;

        // If there's already a waiting worker
        if (reg.waiting && navigator.serviceWorker.controller) {
          setIsUpdateAvailable(true);
        }

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;

          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setIsUpdateAvailable(true);
            }
          });
        });
      }).catch(() => {
        // Service worker lookup fallback
      });
    }

    return () => {
      window.removeEventListener('optistance:sw-update-available', handleUpdateAvailable);
    };
  }, []);

  const reloadToUpdate = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setIsUpdateAvailable(false);
  }, []);

  return {
    isUpdateAvailable,
    reloadToUpdate,
    dismissUpdate,
  };
}
