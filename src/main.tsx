
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

  // Handle app lifecycle events when running in Capacitor
  if ((window as any).Capacitor) {
    const { App: CapacitorApp } = (window as any).Capacitor.Plugins;
    
    CapacitorApp?.addListener?.("pause", () => {
      console.log("App paused");
    });

    CapacitorApp?.addListener?.("resume", () => {
      console.log("App resumed");
    });

    CapacitorApp?.addListener?.("backButton", () => {
      console.log("Back button pressed");
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
  