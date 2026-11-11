import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Optistance ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full bg-[#050507] text-[#E0E0E6] flex items-center justify-center p-6 select-none">
          <div className="max-w-md w-full bg-[#0d0d12]/90 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h1 className="text-xl font-black text-white tracking-tight mb-2">
              Something went wrong
            </h1>
            <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
              An unexpected interface error occurred during execution. Your practice data remains safely stored.
            </p>

            {this.state.error && (
              <div className="w-full mb-6 p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] text-zinc-400 font-mono text-left overflow-x-auto max-h-28">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(99,102,241,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
