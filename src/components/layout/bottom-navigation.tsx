import { useLocation } from "wouter";
import { useState } from "react";
import { 
  Home, Users, Receipt, BarChart, CreditCard, Building2, Truck, Filter, FileText,
  MoreHorizontal, Calculator, FileSpreadsheet, UserCheck, DollarSign, Package,
  ClipboardCheck, TrendingUp, Settings, PlusCircle, ArrowLeftRight, Target,
  BookOpen, Calendar, Wrench, User, MapPin, Globe, X, Bell, Brain, Shield,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/AuthProvider";

const navigationItems = [
  { path: "/", icon: Home, label: "الرئيسية", key: "dashboard" },
  { path: "/projects", icon: Building2, label: "المشاريع", key: "projects" },
  { path: "/workers", icon: Users, label: "العمال", key: "workers" },
  { path: "/suppliers-pro", icon: Truck, label: "الموردين", key: "suppliers" },
];

// قائمة الصفحات مع مستوى الحماية المطلوب
const allPagesData = [
  // الصفحات الرئيسية - متاحة للجميع
  {
    category: "الصفحات الرئيسية",
    pages: [
      { path: "/", icon: Home, label: "لوحة التحكم", description: "عرض شامل للمشاريع والإحصائيات", requireAdmin: false },
      { path: "/projects", icon: Building2, label: "إدارة المشاريع", description: "إضافة وإدارة المشاريع", requireAdmin: false },
      { path: "/workers", icon: Users, label: "إدارة العمال", description: "إضافة وإدارة العمال والحرفيين", requireAdmin: false },
      { path: "/suppliers-pro", icon: Truck, label: "إدارة الموردين", description: "إدارة الموردين والموزعين", requireAdmin: false },
    ]
  },
  // العمليات اليومية - مختلطة
  {
    category: "العمليات اليومية",
    pages: [
      { path: "/worker-attendance", icon: UserCheck, label: "حضور العمال", description: "تسجيل حضور وغياب العمال", requireAdmin: false },
      { path: "/daily-expenses", icon: Calculator, label: "المصاريف اليومية", description: "تسجيل المصاريف اليومية للمشاريع", requireAdmin: false },
      { path: "/material-purchase", icon: Package, label: "شراء المواد", description: "إدارة مشتريات مواد البناء", requireAdmin: false },
      { path: "/worker-accounts", icon: DollarSign, label: "حسابات العمال", description: "إدارة حوالات وتحويلات العمال", requireAdmin: true },
      { path: "/equipment", icon: Settings, label: "إدارة المعدات", description: "إدارة المعدات مع النقل والتتبع", requireAdmin: true },
      { path: "/project-transfers", icon: ArrowLeftRight, label: "تحويلات العهدة", description: "إدارة تحويلات الأموال بين المشاريع", requireAdmin: true },
      { path: "/project-transactions", icon: FileText, label: "سجل العمليات", description: "عرض شامل لجميع المعاملات المالية", requireAdmin: true },
    ]
  },
  // إدارة الموردين - للمسؤولين فقط
  {
    category: "إدارة الموردين", 
    pages: [
      { path: "/supplier-accounts", icon: CreditCard, label: "حسابات الموردين", description: "إدارة حسابات ودفعات الموردين", requireAdmin: true },
    ]
  },
  // التقارير والإحصائيات - للمسؤولين فقط
  {
    category: "التقارير والإحصائيات",
    pages: [
      { path: "/reports", icon: FileSpreadsheet, label: "التقارير الأساسية", description: "التقارير المالية الأساسية", requireAdmin: true },
      { path: "/advanced-reports", icon: TrendingUp, label: "التقارير المتقدمة", description: "تقارير مالية متقدمة وتحليلات شاملة", requireAdmin: true },
      { path: "/workers-unified-reports", icon: Users, label: "تقارير العمال الموحدة", description: "تقارير شاملة لحسابات وحضور العمال", requireAdmin: true },
    ]
  },
  // الإشعارات والتنبيهات - متاحة للجميع
  {
    category: "الإشعارات والتنبيهات",
    pages: [
      { path: "/notifications", icon: Bell, label: "الإشعارات", description: "عرض وإدارة إشعارات النظام", requireAdmin: false },
    ]
  },
  // النظام الذكي والأمان - للمسؤولين فقط
  {
    category: "النظام الذكي والأمان",
    pages: [
      { path: "/ai-system", icon: Brain, label: "النظام الذكي", description: "مراقبة ذكية ولوحة تحكم الذكاء الاصطناعي", requireAdmin: true },
      { path: "/security-policies", icon: Shield, label: "السياسات الأمنية", description: "إدارة السياسات الأمنية والامتثال", requireAdmin: true },
      { path: "/smart-errors", icon: Database, label: "كشف الأخطاء الذكي", description: "مراقبة وتحليل أخطاء قاعدة البيانات بذكاء اصطناعي", requireAdmin: true },
    ]
  },
  // الإعدادات والإدارة - للمسؤولين فقط
  {
    category: "الإعدادات والإدارة",
    pages: [
      { path: "/autocomplete-admin", icon: Wrench, label: "إعدادات الإكمال التلقائي", description: "إدارة بيانات الإكمال التلقائي", requireAdmin: true },
      { path: "/admin-notifications", icon: Bell, label: "إشعارات المسؤولين", description: "إدارة وإرسال إشعارات للمستخدمين", requireAdmin: true },
    ]
  }
];

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();
  
  // فلترة الصفحات حسب دور المستخدم
  const isAdmin = user?.role === 'admin';
  const allPages = allPagesData.map(category => ({
    ...category,
    pages: category.pages.filter(page => !page.requireAdmin || isAdmin)
  })).filter(category => category.pages.length > 0);

  const handlePageNavigation = (path: string) => {
    setLocation(path);
    setIsMenuOpen(false);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="grid grid-cols-5 h-16">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Button
              key={item.key}
              variant="ghost"
              className={`flex flex-col items-center justify-center space-y-1 h-full rounded-none ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              onClick={() => setLocation(item.path)}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Button>
          );
        })}
        
        {/* زر المزيد */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="flex flex-col items-center justify-center space-y-1 h-full rounded-none text-muted-foreground hover:text-primary"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs">المزيد</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-right">جميع الصفحات</SheetTitle>
            </SheetHeader>
            
            <ScrollArea className="h-full">
              <div className="space-y-6 pb-20">
                {allPages.map((category, categoryIndex) => (
                  <div key={categoryIndex}>
                    <h3 className="font-semibold text-lg mb-3 text-primary">
                      {category.category}
                    </h3>
                    <div className="space-y-2">
                      {category.pages.map((page, pageIndex) => {
                        const Icon = page.icon;
                        const isActive = location === page.path;
                        
                        return (
                          <Button
                            key={pageIndex}
                            variant={isActive ? "default" : "ghost"}
                            className="w-full justify-start h-auto p-4"
                            onClick={() => handlePageNavigation(page.path)}
                          >
                            <div className="flex items-start gap-3 w-full text-right">
                              <Icon className={`h-5 w-5 mt-0.5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                              <div className="flex-1">
                                <div className={`font-medium ${isActive ? 'text-primary-foreground' : ''}`}>
                                  {page.label}
                                </div>
                                <div className={`text-sm mt-1 ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                  {page.description}
                                </div>
                              </div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                    {categoryIndex < allPages.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
