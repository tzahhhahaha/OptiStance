import { setToken, clearToken } from './tokenService';

type UserProfile = {
  uid: string;
  displayName: string;
  email?: string | null;
};

const mockSignIn = async (email: string, _password: string): Promise<UserProfile> => {
  return {
    uid: 'mock-uid',
    displayName: 'Juan Dela Cruz',
    email,
  };
};

export async function signIn(email: string, password: string): Promise<UserProfile> {
  try {
    const { initializeApp } = await import('firebase/app');
    const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };

    try {
      initializeApp(firebaseConfig);
    } catch (e) {
      // ignore already-initialized
    }

    const auth = getAuth();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    try {
      const idToken = await cred.user.getIdToken();
      setToken(idToken);
    } catch (e) {
      // ignore token store failures
    }
    return {
      uid: cred.user.uid,
      displayName: cred.user.displayName || cred.user.email || 'User',
      email: cred.user.email,
    };
  } catch (err) {
    console.warn('Firebase signIn failed, falling back to mock:', err);
    return mockSignIn(email, password);
  }
}

export async function signUp(name: string, email: string, password: string): Promise<UserProfile> {
  try {
    const { initializeApp } = await import('firebase/app');
    const { getAuth, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };

    try {
      initializeApp(firebaseConfig);
    } catch (e) {
      // ignore already-initialized
    }

    const auth = getAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try {
      await updateProfile(cred.user, { displayName: name });
    } catch (e) {
      // optional
    }
    try {
      const idToken = await cred.user.getIdToken();
      setToken(idToken);
    } catch (e) {
      // ignore token store failures
    }

    return {
      uid: cred.user.uid,
      displayName: cred.user.displayName || name,
      email: cred.user.email,
    };
  } catch (err) {
    console.warn('Firebase signUp failed, falling back to mock:', err);
    return {
      uid: 'mock-uid',
      displayName: name,
      email,
    };
  }
}

export async function signOut(): Promise<void> {
  try {
    const { getAuth, signOut: fbSignOut } = await import('firebase/auth');
    const auth = getAuth();
    await fbSignOut(auth);
  } catch (err) {
    console.warn('Firebase signOut failed or not available:', err);
  }
  try {
    clearToken();
  } catch (e) {
    // ignore
  }
}

export type { UserProfile };
