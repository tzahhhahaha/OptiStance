import type { DocumentData } from 'firebase/firestore';

export async function listUploads(): Promise<DocumentData[]> {
  try {
    const { initializeApp } = await import('firebase/app');
    const { getFirestore, collection, query, orderBy, getDocs } = await import('firebase/firestore');

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };

    try { initializeApp(firebaseConfig); } catch (e) {}

    const db = getFirestore();
    const q = query(collection(db, 'uploads'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('listUploads failed:', err);
    return [];
  }
}

export async function deleteUpload(docId: string, path?: string): Promise<boolean> {
  try {
    const { getFirestore, doc, deleteDoc } = await import('firebase/firestore');
    const { getStorage, ref, deleteObject } = await import('firebase/storage');
    const db = getFirestore();
    await deleteDoc(doc(db, 'uploads', docId));
    if (path) {
      try {
        const storage = getStorage();
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
      } catch (e) {
        // ignore storage delete errors
      }
    }
    return true;
  } catch (err) {
    console.warn('deleteUpload failed:', err);
    return false;
  }
}

export async function listUsers(): Promise<DocumentData[]> {
  try {
    const { getFirestore, collection, getDocs } = await import('firebase/firestore');
    const db = getFirestore();
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('listUsers failed:', err);
    return [];
  }
}

export async function setUserDisabled(userId: string, disabled: boolean): Promise<boolean> {
  try {
    const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
    const db = getFirestore();
    await updateDoc(doc(db, 'users', userId), { disabled });
    return true;
  } catch (err) {
    console.warn('setUserDisabled failed:', err);
    return false;
  }
}

export async function listAnalytics(): Promise<DocumentData[]> {
  try {
    const { getFirestore, collection, query, orderBy, getDocs } = await import('firebase/firestore');
    const db = getFirestore();
    const q = query(collection(db, 'analytics'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('listAnalytics failed:', err);
    return [];
  }
}
