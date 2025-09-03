/**
 * مكون حماية الصفحات - يحمي الصفحات من الوصول غير المصرح به
 */

import { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { ProfessionalLoader } from "./ui/professional-loader";
import { Redirect } from "wouter";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log('🛡️ [ProtectedRoute] فحص الحماية:', {
    isLoading,
    isAuthenticated,
    userEmail: user?.email || 'غير موجود',
    timestamp: new Date().toISOString()
  });

  // إظهار شاشة التحميل أثناء التحقق من المصادقة
  if (isLoading) {
    console.log('⏳ [ProtectedRoute] في حالة تحميل، إظهار شاشة التحميل');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ProfessionalLoader />
      </div>
    );
  }

  // إذا لم يكن مصادق عليه، إعادة توجيه لصفحة تسجيل الدخول
  if (!isAuthenticated) {
    console.log('🚫 [ProtectedRoute] غير مصادق عليه، إعادة توجيه إلى /login');
    return <Redirect to="/login" />;
  }

  // إذا كان مصادق عليه، إظهار المحتوى
  console.log('✅ [ProtectedRoute] مصادق عليه، إظهار المحتوى للمستخدم:', user?.email);
  return <>{children}</>;
}