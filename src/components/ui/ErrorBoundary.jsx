import React from 'react';
import { Button } from '@/components/ui/Button';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="h-[100dvh] flex flex-col items-center justify-center p-6 text-center bg-gray-50">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full space-y-4">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">⚠️</span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
                        <p className="text-sm text-gray-500">
                            We encountered an unexpected error. Please try refreshing the page.
                        </p>
                        {/* Optional: Show error message in dev mode only? Or just generic for now */}
                        {process.env.NODE_ENV === 'development' && (
                            <pre className="text-xs text-left bg-gray-100 p-2 rounded overflow-auto max-h-32 text-red-600">
                                {this.state.error?.toString()}
                            </pre>
                        )}
                        <Button
                            onClick={() => window.location.reload()}
                            className="w-full"
                        >
                            Refresh Page
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => window.location.href = '/'}
                            className="w-full"
                        >
                            Go Home
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
