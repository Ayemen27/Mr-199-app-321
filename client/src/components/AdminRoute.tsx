/**
 * مكون حماية صفحات المسؤولين - يحمي الصفحات الخاصة بالمسؤولين فقط
 */

import { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { ProfessionalLoader } from "./ui/professional-loader";
import { Redirect } from "wouter";
import { Alert, AlertDescription } from "./ui/alert";
import { ShieldX } from "lucide-react";

interface AdminRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

export function AdminRoute({ children, requiredRole = "admin" }: AdminRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // إظهار شاشة التحميل أثناء التحقق من المصادقة
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ProfessionalLoader />
      </div>
    );
  }

  // إذا لم يكن مصادق عليه، إعادة توجيه لصفحة تسجيل الدخول
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // التحقق من دور المستخدم
  if (!user || user.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <Alert variant="destructive" className="text-center">
            <ShieldX className="h-6 w-6 mx-auto mb-2" />
            <AlertDescription className="text-lg">
              <strong>غير مصرح لك بالوصول</strong>
              <br />
              هذه الصفحة مخصصة للمسؤولين فقط
              <br />
              <span className="text-sm opacity-80">
                دورك الحالي: {user?.role || "غير محدد"}
              </span>
            </AlertDescription>
          </Alert>
          
          <div className="text-center mt-4">
            <a 
              href="/" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              العودة للصفحة الرئيسية
            </a>
          </div>
        </div>
      </div>
    );
  }

  // إذا كان مسؤول، إظهار المحتوى
  return <>{children}</>;
}

/**
 * مكون تحقق من الدور بدون إعادة توجيه
 */
export function useRequireRole(requiredRole: string = "admin"): { hasAccess: boolean; user: any } {
  const { user, isAuthenticated } = useAuth();
  
  const hasAccess = !!(isAuthenticated && user && user.role === requiredRole);
  
  return { hasAccess, user };
}