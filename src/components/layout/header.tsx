import { Bell, UserCircle, HardHat, Settings, Home, Building2, Users, Truck, UserCheck, DollarSign, Calculator, Package, ArrowLeftRight, FileText, CreditCard, FileSpreadsheet, Wrench, LogOut, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useAuth } from "@/components/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

// مطابقة الصفحات مع العناوين والأيقونات
const pageInfo: Record<string, { title: string; icon: any }> = {
  '/': { title: 'لوحة التحكم', icon: Home },
  '/projects': { title: 'إدارة المشاريع', icon: Building2 },
  '/workers': { title: 'إدارة العمال', icon: Users },
  '/suppliers-pro': { title: 'إدارة الموردين', icon: Truck },
  '/worker-attendance': { title: 'حضور العمال', icon: UserCheck },
  '/worker-accounts': { title: 'حسابات العمال', icon: DollarSign },
  '/daily-expenses': { title: 'المصاريف اليومية', icon: Calculator },
  '/material-purchase': { title: 'شراء المواد', icon: Package },
  '/project-transfers': { title: 'تحويلات العهدة', icon: ArrowLeftRight },
  '/project-transactions': { title: 'سجل العمليات', icon: FileText },
  '/project-transactions-simple': { title: 'سجل العمليات المبسط', icon: FileText },
  '/supplier-accounts': { title: 'حسابات الموردين', icon: CreditCard },
  '/reports': { title: 'التقارير', icon: FileSpreadsheet },
  '/autocomplete-admin': { title: 'إعدادات الإكمال التلقائي', icon: Wrench },
  '/tools-management': { title: 'إدارة الأدوات والمعدات', icon: Wrench },
  '/notifications': { title: 'الإشعارات', icon: Bell },
  '/ai-system': { title: 'النظام الذكي', icon: Shield },
  '/smart-errors': { title: 'كشف الأخطاء الذكي', icon: Shield },
};

export default function Header() {
  const [location, setLocation] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // الحصول على معلومات الصفحة الحالية
  const currentPage = pageInfo[location] || { title: 'إدارة المشاريع الإنشائية', icon: HardHat };
  const PageIcon = currentPage.icon;

  return (
    <header className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-reverse space-x-3">
            <PageIcon className="h-6 w-6" />
            <h1 className="text-lg font-bold">{currentPage.title}</h1>
          </div>
          <div className="flex items-center space-x-reverse space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2 rounded-full hover:bg-primary/80"
              onClick={() => setLocation('/print-control')}
              title="التحكم في الطباعة"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <NotificationCenter />
            
            {/* قائمة المستخدم المنسدلة */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-2 rounded-full hover:bg-primary/80 relative"
                    data-testid="user-menu-trigger"
                  >
                    <UserCircle className="h-5 w-5" />
                    {user && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-3 h-3 border-2 border-primary" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 text-sm">
                    <div className="font-medium text-foreground">
                      {user?.name || 'المستخدم'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user?.email}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="inline-flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {user?.role === 'admin' ? 'مدير النظام' : 'مستخدم'}
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setLocation('/profile')}
                    className="cursor-pointer"
                    data-testid="menu-profile"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>الملف الشخصي</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation('/settings')}
                    className="cursor-pointer"
                    data-testid="menu-settings"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>الإعدادات</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={async () => {
                      setIsLoggingOut(true);
                      try {
                        await logout();
                        toast({
                          title: "تم تسجيل الخروج بنجاح",
                          description: "شكراً لاستخدام النظام",
                        });
                        setLocation('/login');
                      } catch (error) {
                        toast({
                          title: "خطأ في تسجيل الخروج",
                          description: "حدث خطأ أثناء تسجيل الخروج",
                          variant: "destructive",
                        });
                      } finally {
                        setIsLoggingOut(false);
                      }
                    }}
                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/50"
                    disabled={isLoggingOut}
                    data-testid="menu-logout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isLoggingOut ? 'جارِ تسجيل الخروج...' : 'تسجيل الخروج'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-2 rounded-full hover:bg-primary/80"
                onClick={() => setLocation('/login')}
                data-testid="login-button"
              >
                <UserCircle className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
