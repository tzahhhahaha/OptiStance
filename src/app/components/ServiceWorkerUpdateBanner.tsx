import React from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';

export interface ServiceWorkerUpdateBannerProps {
  isUpdateAvailable: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export const ServiceWorkerUpdateBanner: React.FC<ServiceWorkerUpdateBannerProps> = ({
  isUpdateAvailable,
  onUpdate,
  onDismiss,
}) => {
  if (!isUpdateAvailable) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-40 bg-[#161622]/95 backdrop-blur-md border border-indigo-500/40 rounded-2xl p-3.5 shadow-2xl shadow-indigo-950/60 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30">
          <Sparkles className="w-4 h-4 text-white" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <p className="text-xs font-semibold text-white tracking-wide">
            Update Ready
          </p>
          <p className="text-[11px] text-zinc-300 leading-tight truncate">
            New pose models & stunt definitions cached
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onUpdate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-xs font-medium transition-all shadow-sm"
          >
            <RefreshCw className="w-3 h-3 animate-spin-reverse" />
            <span>Update</span>
          </button>

          <button
            onClick={onDismiss}
            aria-label="Dismiss update notification"
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
