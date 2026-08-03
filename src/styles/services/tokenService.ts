// tokenService provides a small abstraction for storing auth tokens.
// For web it uses localStorage; for mobile replace with secure native storage (Capacitor Secure Storage plugin).

const TOKEN_KEY = 'cheerpose_token_v1';

export function setToken(token: string) {
  try {
    // Prefer native secure storage when available (Capacitor)
    // dynamic import to avoid adding Capacitor as a hard dependency here
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    if (typeof (window as any).Capacitor !== 'undefined') {
      // attempt to use Capacitor Storage plugin if present
      try {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        (async () => {
          const { Plugins } = await import('@capacitor/core');
          const { Storage } = Plugins as any;
          if (Storage && Storage.set) {
            await Storage.set({ key: TOKEN_KEY, value: token });
            return;
          }
        })();
      } catch (e) {
        // fall back to localStorage
      }
    }

    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.warn('setToken failed:', err);
  }
}

export function getToken(): string | null {
  try {
    if (typeof (window as any).Capacitor !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      // Note: synchronous return not possible with Capacitor Storage; callers should prefer async flows on mobile.
    }
    return localStorage.getItem(TOKEN_KEY);
  } catch (err) {
    console.warn('getToken failed:', err);
    return null;
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    // attempt Capacitor clear as best-effort
    if (typeof (window as any).Capacitor !== 'undefined') {
      (async () => {
        try {
          const { Plugins } = await import('@capacitor/core');
          const { Storage } = Plugins as any;
          if (Storage && Storage.remove) {
            await Storage.remove({ key: TOKEN_KEY });
          }
        } catch (e) {
          // ignore
        }
      })();
    }
  } catch (err) {
    console.warn('clearToken failed:', err);
  }
}

export async function getTokenAsync(): Promise<string | null> {
  try {
    if (typeof (window as any).Capacitor !== 'undefined') {
      try {
        const { Plugins } = await import('@capacitor/core');
        const { Storage } = Plugins as any;
        if (Storage && Storage.get) {
          const res = await Storage.get({ key: TOKEN_KEY });
          return res?.value || null;
        }
      } catch (e) {
        // fall through to localStorage
      }
    }
    return Promise.resolve(localStorage.getItem(TOKEN_KEY));
  } catch (err) {
    console.warn('getTokenAsync failed:', err);
    return null;
  }
}
