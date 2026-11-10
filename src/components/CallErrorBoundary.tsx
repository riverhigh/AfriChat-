import React from 'react';
import { PhoneOff, AlertTriangle } from 'lucide-react';

interface CallErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

interface CallErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
}

/**
 * Error boundary specifically for the AGC call UI.
 * Catches render-time throws from WebRTC/media setup and shows
 * a user-friendly error instead of a black screen crash.
 */
export class CallErrorBoundary extends React.Component<CallErrorBoundaryProps, CallErrorBoundaryState> {
  constructor(props: CallErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): CallErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || 'Unknown call error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AGC] Call render error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 bg-[#06060a] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-600/20 border border-rose-500/40 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-xl font-black mb-2">Call Couldn't Connect</h2>
          <p className="text-sm text-white/60 mb-1">
            There was a problem setting up the call.
          </p>
          <p className="text-xs text-white/40 font-mono mb-6 max-w-xs">
            {this.state.errorMessage}
          </p>
          <p className="text-xs text-white/50 mb-6">
            This can happen if microphone/camera permission was denied, or if your browser doesn't support WebRTC.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-colors active:scale-95"
          >
            <PhoneOff className="w-4 h-4" />
            End Call & Go Back
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
