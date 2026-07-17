import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { Card } from "./Card";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled app error", error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-12 text-slate-950 dark:bg-slate-950 dark:text-white">
          <Card className="max-w-xl text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-rose-500" />
            <h1 className="mt-4 text-2xl font-black">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">The page hit an unexpected error. Reload to try again, or return to the login screen if your session expired.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => window.location.reload()} type="button">Reload</Button>
              <Button onClick={() => window.location.assign("/login")} type="button" variant="secondary">Go to login</Button>
            </div>
          </Card>
        </main>
      );
    }

    return this.props.children;
  }
}