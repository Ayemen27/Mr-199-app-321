import React, { Component, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('🚨 [ErrorBoundary] تم التقاط خطأ:', error);
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ [ErrorBoundary] تفاصيل الخطأ:', error, errorInfo);
    console.error('📍 [ErrorBoundary] Stack trace:', error.stack);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
              عذراً، حدث خطأ غير متوقع
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              يرجى إعادة تحميل الصفحة أو المحاولة لاحقاً
            </p>
            <div className="space-y-4">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 mr-4"
              >
                إعادة تحميل الصفحة
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                تسجيل دخول جديد
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer font-bold mb-2">
                  تفاصيل الخطأ (وضع التطوير)
                </summary>
                <pre className="bg-red-100 dark:bg-red-900 p-4 rounded text-sm overflow-auto">
                  {this.state.error?.stack || this.state.error?.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}