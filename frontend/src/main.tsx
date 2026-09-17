import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { isAuthError } from "./lib/api";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ToastProvider";
import { useAuthStore } from "./store/auth";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // data stays fresh 30 s — avoids thrashing on tab focus
      // Never retry an auth failure: the 401 handler has already cleared the stored
      // token, so a retry would go out unauthenticated and replace the real error
      // ("Invalid token") with a misleading "Missing bearer token".
      retry: (failureCount, error) => !isAuthError(error) && failureCount < 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Query keys do not include the user, so cached data from one account would show
// on the next account signed in from the same tab. Drop the cache whenever the
// session changes.
useAuthStore.subscribe((state, previous) => {
  if (state.token !== previous.token) queryClient.clear();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
