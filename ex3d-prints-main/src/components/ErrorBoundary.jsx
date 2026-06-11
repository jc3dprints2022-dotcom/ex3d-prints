import React from "react";

/**
 * Generic error boundary — prevents render errors from white-screening the app.
 * Wrap any crash-prone section: <ErrorBoundary><RiskyComponent /></ErrorBoundary>
 * Optional props:
 *   - title: custom heading
 *   - compact: smaller inline style for widgets/sections
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Always log — never swallow silently
    console.error("ErrorBoundary caught render error:", error, errorInfo?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message || "An unexpected error occurred.";

    if (this.props.compact) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <p className="font-semibold mb-1">{this.props.title || "Something went wrong in this section."}</p>
          <p className="text-xs text-red-600 break-all mb-2">{message}</p>
          <button
            onClick={this.handleReset}
            className="text-xs font-semibold underline text-red-700 hover:text-red-900"
          >
            Try again
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-xl shadow-sm p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {this.props.title || "Something went wrong"}
          </h2>
          <p className="text-sm text-gray-600 mb-1">
            The page hit an unexpected error. Your data is safe.
          </p>
          <p className="text-xs text-gray-400 break-all mb-5">{message}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Try Again
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
