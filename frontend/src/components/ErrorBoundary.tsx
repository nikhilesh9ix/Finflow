import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "Something went wrong while loading FinFlow." };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Something went wrong while loading FinFlow." };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
          <div className="max-w-md rounded-lg border border-red-400/30 bg-slate-900 p-6 shadow-2xl">
            <h1 className="text-xl font-semibold">FinFlow hit an unexpected error</h1>
            <p className="mt-3 text-sm text-slate-300">{this.state.message}</p>
            <button className="primary-button mt-5" onClick={() => window.location.reload()} type="button">
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
