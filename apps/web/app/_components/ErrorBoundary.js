"use client";

import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you might want to log this to an error reporting service
    // Example: logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {this.props.title || "Something went wrong"}
              </h2>
              <p className="text-gray-600 mb-6">
                {this.props.message ||
                  "We're sorry, but something unexpected happened. Please try again."}
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                <h3 className="text-sm font-semibold text-red-800 mb-2">
                  Error Details (Development Mode):
                </h3>
                <pre className="text-xs text-red-700 overflow-auto max-h-32">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer">
                      Stack Trace
                    </summary>
                    <pre className="text-xs text-red-600 mt-1 overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              {this.props.showHomeButton !== false && (
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              )}
            </div>

            {this.props.contactSupport && (
              <p className="text-sm text-gray-500 mt-4">
                If this problem persists, please{" "}
                <a
                  href="mailto:support@makazicloud.com"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  contact support
                </a>
                .
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for functional components
export const withErrorBoundary = (Component, errorBoundaryConfig = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryConfig}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// Hook for error handling in functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);

  const handleError = React.useCallback((error) => {
    console.error('Error caught by useErrorHandler:', error);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, clearError };
};

// Simplified error boundary for inline use
export const ErrorFallback = ({ error, resetError, title, message }) => (
  <div className="p-6 text-center bg-red-50 border border-red-200 rounded-lg">
    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
    <h3 className="text-lg font-semibold text-red-800 mb-2">
      {title || "Error"}
    </h3>
    <p className="text-red-600 mb-4">
      {message || error?.message || "Something went wrong"}
    </p>
    <button
      onClick={resetError}
      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors"
    >
      Try Again
    </button>
  </div>
);

export default ErrorBoundary;
