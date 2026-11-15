import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AGC RootErrorBoundary]:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndReload = async () => {
    try {
      window.localStorage?.clear();
    } catch {}
    try {
      window.sessionStorage?.clear();
    } catch {}
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] bg-[#06020d] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="max-w-sm w-full rounded-3xl bg-[#120826] border border-purple-500/30 p-6 shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-rose-400" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-black tracking-tight">AfriChat Needs a Quick Refresh</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {this.state.errorMessage}
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-700/30 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Cache &amp; Reload</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
