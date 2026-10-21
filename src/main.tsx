
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

import { App as CapApp } from '@capacitor/app';

// Initialize Capacitor native app
if (typeof window !== "undefined") {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('/sw.js');
    });
  }

  // Handle native Android hardware back button
  try {
    CapApp.addListener('backButton', ({ canGoBack }) => {
      // Dispatch custom back event so in-app views, modals, and camera can handle it
      const event = new CustomEvent('optistance:hardware-back', {
        cancelable: true,
        detail: { canGoBack },
      });
      const handled = !window.dispatchEvent(event);
      if (!handled && !canGoBack) {
        // Double-tap or default exit if not handled
        void CapApp.exitApp();
      }
    });
  } catch {
    // Non-native / browser fallback
  }
}

createRoot(document.getElementById("root")!).render(<App />);
  