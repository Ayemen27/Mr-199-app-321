import { useState, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, Receipt, ShoppingCart, BarChart, ArrowRight, Settings, DollarSign, TrendingDown, TrendingUp, Calendar, Package, UserCheck, Plus, User, FolderPlus } from "lucide-react";
import { StatsCard, StatsGrid } from "@/components/ui/stats-card";
import { useSelectedProject } from "@/hooks/use-selected-project";
import ProjectSelector from "@/components/project-selector";

import { formatDate } from "@/lib/utils";
import { LoadingCard, LoadingSpinner } from "@/components/ui/loading-spinner";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import { useEffect } from "react";
// import type { Project, DailyExpenseSummary, Worker, insertProjectSchema, insertWorkerSchema } from "@shared/schema";

import { apiRequest } from "@/lib/queryClient";
import type { 
  Project, 
  DailyExpenseSummary, 
  Worker, 
  AutocompleteData as WorkerType 
} from "@shared/schema";

interface ProjectStats {
  totalWorkers: string;
  totalExpenses: number;
  totalIncome: number;
  currentBalance: number;
  activeWorkers: string;
  completedDays: string;
  materialPurchases: string;
  lastActivity: string;
}

interface ProjectWithStats extends Project {
  stats: ProjectStats;
}

export default function Dashboard() {
  console.log('🏠 [Dashboard] بدء تحميل لوحة القيادة...', new Date().toISOString());
  
  const [, setLocation] = useLocation();
  const { selectedProjectId, selectProject } = useSelectedProject();
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // نماذج بيانات العامل والمشروع
  const [workerData, setWorkerData] = useState({
    name: '',
    phone: '',
    type: '',
    dailyWage: ''
  });

  // نموذج إضافة مهنة جديدة
  const [showAddTypeDialog, setShowAddTypeDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  const [projectData, setProjectData] = useState({
    name: '',
    status: 'active',
    description: ''
  });

  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();
  const { toast } = useToast();

  // دالة مساعدة لحفظ القيم في autocomplete_data
  const saveAutocompleteValue = async (category: string, value: string | null | undefined) => {
    if (!value || typeof value !== 'string' || !value.trim()) return;
    try {
      await apiRequest("/api/autocomplete", "POST", { 
        category, 
        value: value.trim() 
      });
    } catch (error) {
      console.log(`Failed to save autocomplete value for ${category}:`, error);
    }
  };

  // تحميل المشاريع مع الإحصائيات بشكل محسن
  const { data: projectsResponse, isLoading: projectsLoading, error: projectsError, refetch: refetchProjects } = useQuery({
    queryKey: ["/api/projects/with-stats"],
    staleTime: 1000 * 30, // 30 ثانية فقط للإحصائيات لضمان الحصول على البيانات المحدثة
    refetchInterval: 1000 * 60, // إعادة التحديث كل دقيقة
    retry: 3, // إعادة المحاولة 3 مرات عند الفشل
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // تأخير متزايد
  });

  // تتبع حالة استعلام المشاريع
  console.log('📊 [Dashboard] حالة استعلام المشاريع:', {
    isLoading: projectsLoading,
    hasData: !!projectsResponse,
    hasError: !!projectsError,
    dataCount: (projectsResponse as any)?.data?.length || 0,
    timestamp: new Date().toISOString()
  });

  // التأكد من أن projects مصفوفة صالحة
  const projects = Array.isArray((projectsResponse as any)?.data) ? (projectsResponse as any).data : [];

  console.log('📋 [Dashboard] المشاريع المحملة:', projects.length, 'مشروع');

  // جلب أنواع العمال من قاعدة البيانات
  const { data: workerTypesResponse, error: workerTypesError, refetch: refetchWorkerTypes } = useQuery({
    queryKey: ["/api/worker-types"],
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 دقائق
  });

  // التأكد من أن workerTypes مصفوفة صالحة
  const workerTypes = Array.isArray((workerTypesResponse as any)?.data) ? (workerTypesResponse as any).data : [];

  // متحولات لإضافة العامل والمشروع
  const addWorkerMutation = useMutation({
    mutationFn: async (data: any) => {
      // حفظ القيم في autocomplete_data قبل العملية الأساسية
      await Promise.all([
        saveAutocompleteValue('workerNames', data.name),
        saveAutocompleteValue('workerTypes', data.type)
      ]);
      
      return apiRequest("/api/workers", "POST", data);
    },
    onSuccess: () => {
      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      queryClient.invalidateQueries({ queryKey: ["/api/workers"] });
      toast({
        title: "نجح الحفظ",
        description: "تم إضافة العامل بنجاح",
      });
      setShowWorkerModal(false);
      setWorkerData({ name: '', phone: '', type: '', dailyWage: '' });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة العامل",
        variant: "destructive",
      });
    },
  });

  const addProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      // حفظ القيم في autocomplete_data قبل العملية الأساسية
      await Promise.all([
        saveAutocompleteValue('projectNames', data.name),
        saveAutocompleteValue('projectDescriptions', data.description)
      ]);
      
      return apiRequest("/api/projects", "POST", data);
    },
    onSuccess: () => {
      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/with-stats"] });
      toast({
        title: "نجح الحفظ",
        description: "تم إضافة المشروع بنجاح",
      });
      setShowProjectModal(false);
      setProjectData({ name: '', status: 'active', description: '' });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة المشروع",
        variant: "destructive",
      });
    },
  });

  // إضافة نوع عامل جديد
  const addWorkerTypeMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      // حفظ قيم أنواع العمال في autocomplete_data
      await saveAutocompleteValue('workerTypes', data.name);
      
      return apiRequest("/api/worker-types", "POST", data);
    },
    onSuccess: (newType) => {
      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      toast({
        title: "تم الحفظ",
        description: "تم إضافة نوع العامل بنجاح",
      });
      setWorkerData({...workerData, type: newType.name});
      setNewTypeName("");
      setShowAddTypeDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/worker-types"] });
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة نوع العامل",
        variant: "destructive",
      });
    },
  });

  const { data: todaySummary } = useQuery<DailyExpenseSummary>({
    queryKey: ["/api/projects", selectedProjectId, "daily-summary", new Date().toISOString().split('T')[0]],
    enabled: !!selectedProjectId,
    staleTime: 1000 * 30, // 30 ثانية للملخص اليومي
  });



  const selectedProject = Array.isArray(projects) ? projects.find((p: ProjectWithStats) => p.id === selectedProjectId) : undefined;



  // إعداد الزر العائم مع قائمة الخيارات
  useEffect(() => {
    const handleFloatingAction = () => {
      setShowFloatingMenu(!showFloatingMenu);
    };
    
    setFloatingAction(handleFloatingAction, "إضافة");
    return () => setFloatingAction(null);
  }, [setFloatingAction, showFloatingMenu]);

  // تسجيل بيانات المشروع المحدد - داخل useEffect لتجنب التحديثات أثناء الرسم
  useEffect(() => {
    if (selectedProject) {
      console.log('🔍 بيانات المشروع المحدد في Frontend:', {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        totalIncome: selectedProject.stats?.totalIncome,
        totalExpenses: selectedProject.stats?.totalExpenses,
        currentBalance: selectedProject.stats?.currentBalance
      });
      
      // فحص خاص لمشروع الحبشي
      if (selectedProject.name.includes('الحبشي')) {
        console.warn('🚨 مشروع الحبشي - تحقق من البيانات:', {
          مشروع: selectedProject.name,
          الدخل: selectedProject.stats?.totalIncome,
          المصاريف: selectedProject.stats?.totalExpenses,
          هل_متساوية: selectedProject.stats?.totalIncome === selectedProject.stats?.totalExpenses,
          fullStats: selectedProject.stats
        });
      }
    }
  }, [selectedProject]);

  // دالة تنسيق العملة
  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number') {
      const num = parseFloat(String(amount));
      if (isNaN(num)) return '0 ر.ي';
      amount = num;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ر.ي';
  };

  const quickActions = [
    {
      icon: Clock,
      label: "تسجيل حضور",
      bgColor: "bg-primary",
      hoverColor: "hover:bg-primary/90",
      textColor: "text-primary-foreground",
      action: () => setLocation("/worker-attendance"),
    },
    {
      icon: Receipt,
      label: "مصروفات يومية",
      bgColor: "bg-secondary",
      hoverColor: "hover:bg-secondary/90",
      textColor: "text-secondary-foreground",
      action: () => setLocation("/daily-expenses"),
    },
    {
      icon: ShoppingCart,
      label: "شراء مواد",
      bgColor: "bg-success",
      hoverColor: "hover:bg-success/90",
      textColor: "text-success-foreground",
      action: () => setLocation("/material-purchase"),
    },
    {
      icon: BarChart,
      label: "التقارير",
      bgColor: "bg-purple-600",
      hoverColor: "hover:bg-purple-700",
      textColor: "text-white",
      action: () => setLocation("/reports"),
    },
    {
      icon: ArrowRight,
      label: "ترحيل أموال",
      bgColor: "bg-orange-600",
      hoverColor: "hover:bg-orange-700",
      textColor: "text-white",
      action: () => setLocation("/project-transfers"),
    },
    {
      icon: Settings,
      label: "إعدادات القوالب",
      bgColor: "bg-indigo-600",
      hoverColor: "hover:bg-indigo-700",
      textColor: "text-white",
      action: () => setLocation("/report-template-settings-enhanced"),
    },
  ];

  // عرض شاشة تحميل أولية إذا كانت المشاريع لم تحمل بعد
  if (projectsLoading && !projects.length) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل المشاريع...</p>
        </div>
      </div>
    );
  }

  // عرض رسالة خطأ إذا فشل تحميل البيانات الأساسية
  if (projectsError && !projects.length) {
    return (
      <div className="p-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">
              <Clock className="mx-auto h-12 w-12 mb-2" />
            </div>
            <h3 className="text-lg font-medium text-red-800 mb-2">
              حدث خطأ في تحميل البيانات
            </h3>
            <p className="text-red-600 mb-4">
              لا يمكن الاتصال بالخادم حالياً. يرجى المحاولة لاحقاً.
            </p>
            <Button 
              onClick={() => refetchProjects()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 fade-in">




      <ProjectSelector
        selectedProjectId={selectedProjectId}
        onProjectChange={(projectId, projectName) => selectProject(projectId, projectName)}
      />

      {/* Project Statistics - Always show with appropriate messaging */}
      <Card className="mb-4">
        <CardContent className="p-4">
          {selectedProject ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">{selectedProject.name}</h3>
                <Badge variant="secondary" className="bg-success text-success-foreground">
                  نشط
                </Badge>
              </div>

              {/* Project Statistics */}
              <div className="grid grid-cols-2 gap-3">
                <StatsCard
                  title="إجمالي التوريد"
                  value={selectedProject?.stats?.totalIncome || 0}
                  icon={TrendingUp}
                  color="blue"
                  formatter={formatCurrency}
                />
                <StatsCard
                  title="إجمالي المنصرف"
                  value={selectedProject?.stats?.totalExpenses || 0}
                  icon={TrendingDown}
                  color="red"
                  formatter={formatCurrency}
                />
                <StatsCard
                  title="المتبقي الحالي"
                  value={selectedProject?.stats?.currentBalance || 0}
                  icon={DollarSign}
                  color="green"
                  formatter={formatCurrency}
                />
                <StatsCard
                  title="العمال النشطين"
                  value={selectedProject?.stats?.activeWorkers || "0"}
                  icon={UserCheck}
                  color="purple"
                />
                <StatsCard
                  title="أيام العمل المكتملة"
                  value={selectedProject?.stats?.completedDays || "0"}
                  icon={Calendar}
                  color="teal"
                />
                <StatsCard
                  title="مشتريات المواد"
                  value={selectedProject?.stats?.materialPurchases || "0"}
                  icon={Package}
                  color="indigo"
                />
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="mb-4">
                <FolderPlus className="mx-auto h-16 w-16 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                مرحباً بك في نظام إدارة المشاريع
              </h3>
              <p className="text-gray-600 mb-4">
                {projects.length > 0 
                  ? "يرجى اختيار مشروع من القائمة أعلاه لعرض الإحصائيات"
                  : "لا توجد مشاريع حالياً. ابدأ بإنشاء مشروع جديد"}
              </p>
              {projects.length === 0 && (
                <Button 
                  onClick={() => setShowProjectModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  إنشاء مشروع جديد
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-bold text-foreground mb-4">إجراءات سريعة</h3>
          <div className="grid grid-cols-2 gap-3">
            {Array.isArray(quickActions) ? quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  onClick={action.action}
                  className={`${action.bgColor} ${action.hoverColor} ${action.textColor} p-4 h-auto flex-col space-y-2 transition-colors`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{action.label}</span>
                </Button>
              );
            }) : null}
          </div>
        </CardContent>
      </Card>

      {/* قائمة الخيارات العائمة */}
      {showFloatingMenu && (
        <div className="fixed bottom-20 right-4 z-50 space-y-2">
          <Button
            onClick={() => {
              setShowWorkerModal(true);
              setShowFloatingMenu(false);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-full px-4 py-3"
            size="sm"
          >
            <User className="h-4 w-4" />
            <span>إضافة عامل</span>
          </Button>
          <Button
            onClick={() => {
              setShowProjectModal(true);
              setShowFloatingMenu(false);
            }}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg rounded-full px-4 py-3"
            size="sm"
          >
            <FolderPlus className="h-4 w-4" />
            <span>إضافة مشروع</span>
          </Button>
        </div>
      )}

      {/* خلفية شفافة لإغلاق القائمة */}
      {showFloatingMenu && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-20"
          onClick={() => setShowFloatingMenu(false)}
        />
      )}

      {/* نموذج إضافة عامل */}
      <Dialog open={showWorkerModal} onOpenChange={setShowWorkerModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة عامل جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="worker-name">اسم العامل</Label>
              <Input
                id="worker-name"
                value={workerData.name}
                onChange={(e) => setWorkerData({...workerData, name: e.target.value})}
                placeholder="أدخل اسم العامل"
              />
            </div>
            <div>
              <Label htmlFor="worker-phone">رقم الهاتف</Label>
              <Input
                id="worker-phone"
                value={workerData.phone}
                onChange={(e) => setWorkerData({...workerData, phone: e.target.value})}
                placeholder="أدخل رقم الهاتف"
              />
            </div>
            <div>
              <Label htmlFor="worker-type">نوع العامل</Label>
              <div className="flex gap-2">
                <Select value={workerData.type} onValueChange={(value) => setWorkerData({...workerData, type: value})}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="اختر نوع العامل..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workerTypesError ? (
                      <div className="p-2 text-center text-red-600 text-sm">
                        خطأ في تحميل أنواع العمال
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={() => refetchWorkerTypes()}
                          className="text-red-600 p-0 h-auto font-normal"
                        >
                          إعادة المحاولة
                        </Button>
                      </div>
                    ) : (
                      <>
                        {workerTypes.map((workerType: any) => (
                          <SelectItem key={workerType.id} value={workerType.value}>
                            {workerType.value}
                          </SelectItem>
                        ))}
                        {workerTypes.length === 0 && (
                          <div className="p-2 text-center text-gray-500 text-sm">
                            لا توجد أنواع عمال محفوظة
                          </div>
                        )}
                      </>
                    )}
                  </SelectContent>
                </Select>
                
                <Dialog open={showAddTypeDialog} onOpenChange={setShowAddTypeDialog}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="icon" className="shrink-0" title="إضافة نوع جديد">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>إضافة نوع عامل جديد</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="new-type-name">اسم نوع العامل</Label>
                        <Input
                          id="new-type-name"
                          type="text"
                          value={newTypeName}
                          onChange={(e) => setNewTypeName(e.target.value)}
                          placeholder="مثال: كهربائي، سباك، حداد..."
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            if (newTypeName.trim()) {
                              addWorkerTypeMutation.mutate({ name: newTypeName.trim() });
                            }
                          }}
                          disabled={!newTypeName.trim() || addWorkerTypeMutation.isPending}
                          className="flex-1"
                        >
                          {addWorkerTypeMutation.isPending ? "جاري الإضافة..." : "إضافة"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowAddTypeDialog(false);
                            setNewTypeName("");
                          }}
                          className="flex-1"
                        >
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div>
              <Label htmlFor="worker-wage">الأجر اليومي (ر.ي)</Label>
              <Input
                id="worker-wage"
                type="number"
                inputMode="decimal"
                value={workerData.dailyWage}
                onChange={(e) => setWorkerData({...workerData, dailyWage: e.target.value})}
                placeholder="0"
                className="text-center arabic-numbers"
                required
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  if (!workerData.name.trim() || !workerData.type || !workerData.dailyWage) {
                    toast({
                      title: "خطأ",
                      description: "يرجى ملء جميع البيانات المطلوبة",
                      variant: "destructive",
                    });
                    return;
                  }

                  const parsedWage = parseFloat(workerData.dailyWage);
                  
                  if (isNaN(parsedWage) || parsedWage <= 0) {
                    toast({
                      title: "خطأ",
                      description: "يرجى إدخال مبلغ صحيح للأجر اليومي",
                      variant: "destructive",
                    });
                    return;
                  }

                  addWorkerMutation.mutate({
                    name: workerData.name.trim(),
                    phone: workerData.phone || null,
                    type: workerData.type,
                    dailyWage: parsedWage.toString(),
                    isActive: true,
                  });
                }}
                disabled={addWorkerMutation.isPending}
                className="flex-1"
              >
                {addWorkerMutation.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" onClick={() => setShowWorkerModal(false)} className="flex-1">
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* نموذج إضافة مشروع */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مشروع جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">اسم المشروع</Label>
              <Input
                id="project-name"
                value={projectData.name}
                onChange={(e) => setProjectData({...projectData, name: e.target.value})}
                placeholder="أدخل اسم المشروع"
              />
            </div>
            <div>
              <Label htmlFor="project-status">حالة المشروع</Label>
              <Select value={projectData.status} onValueChange={(value) => setProjectData({...projectData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="paused">متوقف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="project-description">وصف المشروع</Label>
              <Input
                id="project-description"
                value={projectData.description}
                onChange={(e) => setProjectData({...projectData, description: e.target.value})}
                placeholder="أدخل وصف المشروع (اختياري)"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  if (projectData.name) {
                    addProjectMutation.mutate({
                      name: projectData.name,
                      status: projectData.status,
                      description: projectData.description || null
                    });
                  }
                }}
                disabled={!projectData.name || addProjectMutation.isPending}
                className="flex-1"
              >
                {addProjectMutation.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" onClick={() => setShowProjectModal(false)} className="flex-1">
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
