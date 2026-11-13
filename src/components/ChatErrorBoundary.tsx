import React from 'react';
import { AlertTriangle, ArrowLeft, MessageSquare } from 'lucide-react';

interface ChatErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

interface ChatErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
}

/**
 * Error boundary for the ActiveChat conversation view.
 * Catches any unexpected rendering errors and prevents a blank screen crash.
 */
export class ChatErrorBoundary extends React.Component<ChatErrorBoundaryProps, ChatErrorBoundaryState> {
  constructor(props: ChatErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ChatErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || 'Chat rendering error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AGC] Chat render error caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col h-full w-full max-w-md mx-auto bg-slate-900 text-white items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
          </div>
          <h2 className="text-lg font-bold mb-2">Unable to display chat</h2>
          <p className="text-xs text-slate-300 max-w-xs mb-6 leading-relaxed">
            There was a problem displaying messages for this chat.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Chats
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
