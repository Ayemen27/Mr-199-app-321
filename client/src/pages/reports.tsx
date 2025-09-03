/**
 * الوصف: نظام التقارير الاحترافي المتكامل والموحد
 * المدخلات: اختيار نوع التقرير والمعايير المطلوبة
 * المخرجات: عرض وتصدير وطباعة التقارير الاحترافية
 * المالك: عمار
 * آخر تعديل: 2025-08-22
 * الحالة: نسخة احترافية محسنة وموحدة
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  FileSpreadsheet, Printer, Calendar, TrendingUp, Users, DollarSign,
  Building2, Receipt, UserCheck, Package, PieChart, Download,
  Eye, RefreshCw, Settings, Filter, ArrowRight, CheckCircle2,
  Clock, BarChart3, TrendingDown, Search, Grid3X3, List,
  ChevronRight, Info, Target, Briefcase, Database, PlayCircle,
  Wrench, ShoppingCart, CreditCard, Calculator, FileText, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSelectedProject } from "@/hooks/use-selected-project";
import ProjectSelector from "@/components/project-selector";
import { getCurrentDate, formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { StatsCard, StatsGrid } from "@/components/ui/stats-card";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import UnifiedReportCard from "@/components/unified-report-card";
import type { Worker, Project } from "@shared/schema";

// تعريف أنواع التقارير
interface ReportCategory {
  id: string;
  name: string;
  icon: any;
  description: string;
  color: string;
  reports: ReportItem[];
}

interface ReportItem {
  id: string;
  name: string;
  description: string;
  icon: any;
  requiresProject: boolean;
  requiresWorker: boolean;
  requiresDateRange: boolean;
  status: 'active' | 'beta' | 'coming-soon';
  action: () => void;
}

interface ReportStats {
  totalReports: number;
  activeProjects: number;
  totalWorkers: number;
  totalIncome: number;
  totalExpenses: number;
  currentBalance: number;
}

export default function Reports() {
  const [, setLocation] = useLocation();
  const { selectedProjectId, selectProject } = useSelectedProject();
  const { toast } = useToast();
  const { setFloatingAction } = useFloatingButton();

  // حالات التقارير
  const [selectedCategory, setSelectedCategory] = useState<string>("financial");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>(getCurrentDate());
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  // إزالة الزر العائم
  useEffect(() => {
    setFloatingAction(null);
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // جلب البيانات
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
  });

  const { data: projectsWithStats = [] } = useQuery<any[]>({
    queryKey: ["/api/projects/with-stats"],
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const selectedProject = Array.isArray(projects) ? projects.find(p => p.id === selectedProjectId) : undefined;
  const selectedProjectWithStats = Array.isArray(projectsWithStats) ? projectsWithStats.find((p: any) => p.id === selectedProjectId) : undefined;
  const projectStats = selectedProjectWithStats?.stats || {};

  // حساب الإحصائيات
  const reportStats: ReportStats = {
    totalReports: 12, // عدد التقارير المتاحة
    activeProjects: projects.filter(p => p.status === 'active').length,
    totalWorkers: workers.length,
    totalIncome: Number(projectStats?.totalIncome) || 0,
    totalExpenses: Number(projectStats?.totalExpenses) || 0,
    currentBalance: Number(projectStats?.currentBalance) || 0,
  };

  // دوال إنشاء التقارير
  const generateDailyExpensesReport = async () => {
    if (!selectedProjectId || !dateTo) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى اختيار مشروع وتاريخ",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    try {
      setLocation(`/daily-expenses?project=${selectedProjectId}&date=${dateTo}`);
      toast({
        title: "تم فتح تقرير المصروفات اليومية",
        description: "يمكنك الآن عرض وطباعة التقرير",
      });
    } catch (error) {
      toast({
        title: "خطأ في فتح التقرير",
        description: "حدث خطأ أثناء محاولة فتح التقرير",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateWorkerStatementReport = async () => {
    if (!selectedWorkerId || !dateFrom || !dateTo) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى اختيار عامل وفترة زمنية",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    try {
      setLocation(`/worker-accounts?worker=${selectedWorkerId}&from=${dateFrom}&to=${dateTo}&project=${selectedProjectId}`);
      toast({
        title: "تم فتح كشف حساب العامل",
        description: "يمكنك الآن عرض وطباعة التقرير",
      });
    } catch (error) {
      toast({
        title: "خطأ في فتح التقرير",
        description: "حدث خطأ أثناء محاولة فتح التقرير",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateProjectSummaryReport = async () => {
    if (!selectedProjectId) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى اختيار مشروع",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    try {
      setLocation(`/project-transactions?project=${selectedProjectId}&from=${dateFrom}&to=${dateTo}`);
      toast({
        title: "تم فتح تقرير المشروع",
        description: "يمكنك الآن عرض وطباعة التقرير",
      });
    } catch (error) {
      toast({
        title: "خطأ في فتح التقرير",
        description: "حدث خطأ أثناء محاولة فتح التقرير",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const openWorkersReport = () => {
    setLocation("/workers-unified-reports");
    toast({
      title: "تم فتح تقارير العمال",
      description: "يمكنك الآن عرض التقارير الموحدة للعمال",
    });
  };

  const openAdvancedReports = () => {
    setLocation("/advanced-reports");
    toast({
      title: "تم فتح التقارير المتقدمة",
      description: "يمكنك الآن الوصول إلى جميع التقارير المتقدمة",
    });
  };

  // تعريف فئات التقارير
  const reportCategories: ReportCategory[] = [
    {
      id: "financial",
      name: "التقارير المالية",
      icon: DollarSign,
      description: "تقارير الدخل والمصروفات والرصيد المالي",
      color: "text-green-600",
      reports: [
        {
          id: "daily-expenses",
          name: "المصروفات اليومية",
          description: "تقرير مفصل للمصروفات والدخل اليومي",
          icon: Receipt,
          requiresProject: true,
          requiresWorker: false,
          requiresDateRange: false,
          status: "active",
          action: generateDailyExpensesReport
        },
        {
          id: "project-summary",
          name: "ملخص المشروع المالي",
          description: "تقرير شامل للوضع المالي للمشروع",
          icon: Building2,
          requiresProject: true,
          requiresWorker: false,
          requiresDateRange: true,
          status: "active",
          action: generateProjectSummaryReport
        },
        {
          id: "financial-analysis",
          name: "التحليل المالي",
          description: "تحليل مالي متقدم مع الرسوم البيانية",
          icon: BarChart3,
          requiresProject: true,
          requiresWorker: false,
          requiresDateRange: true,
          status: "beta",
          action: openAdvancedReports
        }
      ]
    },
    {
      id: "workers",
      name: "تقارير العمال",
      icon: Users,
      description: "تقارير الحضور والأجور والحوالات",
      color: "text-blue-600",
      reports: [
        {
          id: "worker-statement",
          name: "كشف حساب العامل",
          description: "كشف مفصل لحساب العامل والحوالات",
          icon: UserCheck,
          requiresProject: false,
          requiresWorker: true,
          requiresDateRange: true,
          status: "active",
          action: generateWorkerStatementReport
        },
        {
          id: "workers-summary",
          name: "ملخص جميع العمال",
          description: "تقرير موحد لجميع العمال والأجور",
          icon: Users,
          requiresProject: true,
          requiresWorker: false,
          requiresDateRange: true,
          status: "active",
          action: openWorkersReport
        },
        {
          id: "attendance-report",
          name: "تقرير الحضور",
          description: "تقرير مفصل لحضور العمال",
          icon: Clock,
          requiresProject: true,
          requiresWorker: false,
          requiresDateRange: true,
          status: "active",
          action: openWorkersReport
        }
      ]
    },
    {
      id: "projects",
      name: "تقارير المشاريع",
      icon: Building2,
      description: "تقارير أداء وإحصائيات المشاريع",
      color: "text-purple-600",
      reports: [
        {
          id: "projects-overview",
          name: "نظرة عامة على المشاريع",
          description: "ملخص شامل لجميع المشاريع",
          icon: Database,
          requiresProject: false,
          requiresWorker: false,
          requiresDateRange: false,
          status: "active",
          action: () => setLocation("/projects")
        },
        {
          id: "project-comparison",
          name: "مقارنة المشاريع",
          description: "مقارنة الأداء المالي بين المشاريع",
          icon: TrendingUp,
          requiresProject: false,
          requiresWorker: false,
          requiresDateRange: true,
          status: "beta",
          action: openAdvancedReports
        }
      ]
    },
    {
      id: "materials",
      name: "تقارير المواد",
      icon: Package,
      description: "تقارير المشتريات والمخزون",
      color: "text-orange-600",
      reports: [
        {
          id: "materials-purchases",
          name: "مشتريات المواد",
          description: "تقرير مفصل لجميع مشتريات المواد",
          icon: ShoppingCart,
          requiresProject: true,
          requiresWorker: false,
          requiresDateRange: true,
          status: "active",
          action: () => setLocation("/material-purchases")
        },
        {
          id: "suppliers-report",
          name: "تقرير الموردين",
          description: "تقرير المعاملات مع الموردين",
          icon: Briefcase,
          requiresProject: false,
          requiresWorker: false,
          requiresDateRange: true,
          status: "active",
          action: () => setLocation("/suppliers")
        }
      ]
    }
  ];

  const currentCategory = reportCategories.find(cat => cat.id === selectedCategory);

  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-6" data-testid="reports-page">

      {/* اختيار المشروع */}
      <ProjectSelector
        selectedProjectId={selectedProjectId}
        onProjectChange={(projectId, projectName) => selectProject(projectId, projectName)}
      />

      {/* الإحصائيات العامة */}
      {selectedProjectId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              إحصائيات المشروع: {selectedProject?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs md:text-sm font-medium text-green-700">إجمالي الدخل</p>
                      <p className="text-sm md:text-lg font-bold text-green-900">{formatCurrency(reportStats.totalIncome.toString())}</p>
                    </div>
                    <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs md:text-sm font-medium text-red-700">إجمالي المصروفات</p>
                      <p className="text-sm md:text-lg font-bold text-red-900">{formatCurrency(reportStats.totalExpenses.toString())}</p>
                    </div>
                    <TrendingDown className="h-6 w-6 md:h-8 md:w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className={`bg-gradient-to-br ${reportStats.currentBalance >= 0 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-rose-50 to-rose-100 border-rose-200'}`}>
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className={`text-xs md:text-sm font-medium ${reportStats.currentBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>الرصيد الحالي</p>
                      <p className={`text-sm md:text-lg font-bold ${reportStats.currentBalance >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                        {formatCurrency(reportStats.currentBalance.toString())}
                      </p>
                    </div>
                    <DollarSign className={`h-6 w-6 md:h-8 md:w-8 ${reportStats.currentBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs md:text-sm font-medium text-blue-700">عدد العمال</p>
                      <p className="text-sm md:text-lg font-bold text-blue-900">{reportStats.totalWorkers}</p>
                    </div>
                    <Users className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* فئات التقارير */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 md:gap-0">
          {reportCategories.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger 
                key={category.id} 
                value={category.id} 
                className="flex items-center gap-2"
                data-testid={`tab-${category.id}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{category.name}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {reportCategories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <category.icon className={`w-6 h-6 ${category.color}`} />
                    <div>
                      <CardTitle>{category.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{category.reports.length} تقرير متاح</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.reports.map((report) => (
                    <UnifiedReportCard
                      key={report.id}
                      title={report.name}
                      description={report.description}
                      icon={report.icon}
                      status={report.status}
                      requiresProject={report.requiresProject}
                      requiresWorker={report.requiresWorker}
                      requiresDateRange={report.requiresDateRange}
                      onGenerate={report.action}
                      isGenerating={isGenerating}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* نموذج إعدادات التقرير */}
      {selectedReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              إعدادات التقرير: {selectedReport.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* اختيار العامل */}
              {selectedReport.requiresWorker && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">اختيار العامل *</label>
                  <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                    <SelectTrigger data-testid="select-worker">
                      <SelectValue placeholder="اختر العامل" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(workers) ? workers.map((worker) => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.name} - {worker.type}
                        </SelectItem>
                      )) : null}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* تاريخ البداية */}
              {selectedReport.requiresDateRange && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">تاريخ البداية *</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    data-testid="input-date-from"
                  />
                </div>
              )}

              {/* تاريخ النهاية */}
              {(selectedReport.requiresDateRange || selectedReport.id === "daily-expenses") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {selectedReport.id === "daily-expenses" ? "التاريخ *" : "تاريخ النهاية *"}
                  </label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    data-testid="input-date-to"
                  />
                </div>
              )}
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => setSelectedReport(null)}
                data-testid="button-cancel-settings"
              >
                إلغاء
              </Button>
              <Button 
                onClick={selectedReport.action}
                disabled={isGenerating}
                className="flex items-center gap-2"
                data-testid="button-generate-from-settings"
              >
                <PlayCircle className="w-4 h-4" />
                {isGenerating ? "جاري الإنشاء..." : "إنشاء التقرير"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}