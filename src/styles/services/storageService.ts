export async function uploadImage(file: File): Promise<string | null> {
  try {
    const { initializeApp } = await import('firebase/app');
    const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');

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

    const storage = getStorage();
    const path = `uploads/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    try {
      const { getFirestore, collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const db = getFirestore();
      await addDoc(collection(db, 'uploads'), {
        path,
        name: file.name,
        url,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      // ignore if Firestore not configured or permissions
    }
    return url;
  } catch (err) {
    console.warn('Firebase Storage upload failed or not available:', err);
    return null;
  }
}
