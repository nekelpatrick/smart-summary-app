"use client";

import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-4 md:p-8 lg:p-12">
            <div className="mx-auto max-w-2xl">
              <div className="rounded-lg bg-white p-8 shadow-lg">
                <div className="text-center">
                  <div className="mb-4 text-6xl">😕</div>
                  <h1 className="mb-4 text-2xl font-bold text-gray-800">
                    Something went wrong
                  </h1>
                  <p className="mb-6 text-gray-600">
                    We encountered an unexpected error. Please refresh the page
                    and try again.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="rounded-lg bg-blue-500 px-6 py-3 text-white font-semibold hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
