
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

// Initialize Capacitor native app
if (typeof window !== "undefined") {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('/sw.js');
    });
  }

  // Handle app lifecycle events when running in Capacitor.
  // Back-button navigation is delegated to the in-app tab/drawer UI, so these
  // listeners only keep the native shell from exiting without user intent.
  if ((window as any).Capacitor) {
    const { App: CapacitorApp } = (window as any).Capacitor.Plugins;

    CapacitorApp?.addListener?.("pause", () => {
      // App moved to background – iOS/Android handle suspension.
    });

    CapacitorApp?.addListener?.("resume", () => {
      // App resumed – session timers continue client-side.
    });

    CapacitorApp?.addListener?.("backButton", () => {
      // Intercept native back so the app can close modals/drawer instead of quitting.
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
  