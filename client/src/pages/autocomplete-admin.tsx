import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, BarChart3, Settings, Trash2, RefreshCw, Database, Clock, Activity, TrendingUp, Shield } from 'lucide-react';
import { useFloatingButton } from '@/components/layout/floating-button-context';
import { useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

/**
 * واجهة إدارة نظام الإكمال التلقائي
 * AutoComplete System Administration Interface
 */

interface AutocompleteStats {
  totalRecords: number;
  categoriesCount: number;
  categoryBreakdown: { category: string; count: number; avgUsage: number }[];
  oldRecordsCount: number;
}

interface MaintenanceResult {
  cleanupResult: { deletedCount: number; categories: string[] };
  limitResult: { trimmedCategories: string[]; deletedCount: number };
  totalProcessed: number;
}

export default function AutocompleteAdminPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isMaintenanceRunning, setIsMaintenanceRunning] = useState(false);
  const { setFloatingAction } = useFloatingButton();

  // تعيين إجراء الزر العائم لتشغيل الصيانة
  useEffect(() => {
    const handleRunMaintenance = () => {
      if (!isMaintenanceRunning) {
        setIsMaintenanceRunning(true);
        maintenanceMutation.mutate();
      }
    };
    
    setFloatingAction(handleRunMaintenance, "تشغيل الصيانة");
    return () => setFloatingAction(null);
  }, [setFloatingAction, isMaintenanceRunning]);

  // جلب الإحصائيات
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['autocomplete-admin', 'stats'],
    queryFn: () => apiRequest('/api/autocomplete-admin/stats', 'GET') as Promise<AutocompleteStats>,
  });

  // تنظيف البيانات القديمة
  const cleanupMutation = useMutation({
    mutationFn: () => apiRequest('/api/autocomplete-admin/cleanup', 'POST'),
    onSuccess: (result: any) => {
      toast({
        title: "تم التنظيف بنجاح",
        description: `تم حذف ${result.deletedCount} سجل قديم من ${result.categories.length} فئة`
      });
      refetchStats();
    },
    onError: () => {
      toast({
        title: "خطأ في التنظيف",
        description: "فشل في تنظيف البيانات القديمة",
        variant: "destructive"
      });
    }
  });

  // تطبيق حدود الفئات
  const enforceLimitsMutation = useMutation({
    mutationFn: (category?: string) => 
      apiRequest('/api/autocomplete-admin/enforce-limits', 'POST', { category }),
    onSuccess: (result: any) => {
      toast({
        title: "تم تطبيق الحدود بنجاح",
        description: `تم تقليم ${result.trimmedCategories.length} فئة وحذف ${result.deletedCount} سجل`
      });
      refetchStats();
    },
    onError: () => {
      toast({
        title: "خطأ في تطبيق الحدود",
        description: "فشل في تطبيق حدود الفئات",
        variant: "destructive"
      });
    }
  });

  // صيانة شاملة
  const maintenanceMutation = useMutation({
    mutationFn: () => apiRequest('/api/autocomplete-admin/maintenance', 'POST'),
    onSuccess: (result: MaintenanceResult) => {
      toast({
        title: "اكتملت الصيانة الشاملة",
        description: `معالجة ${result.totalProcessed} سجل بنجاح`
      });
      refetchStats();
      setIsMaintenanceRunning(false);
    },
    onError: () => {
      toast({
        title: "خطأ في الصيانة",
        description: "فشل في تشغيل الصيانة الشاملة",
        variant: "destructive"
      });
      setIsMaintenanceRunning(false);
    }
  });

  const handleRunMaintenance = () => {
    setIsMaintenanceRunning(true);
    maintenanceMutation.mutate();
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (statsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" dir="rtl">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        
        {/* الإحصائيات الرئيسية - صفان بكارتين في كل صف */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-medium opacity-90">إجمالي السجلات</CardTitle>
                <Database className="h-4 w-4 sm:h-5 sm:w-5 opacity-80" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1">
                {formatNumber(stats?.totalRecords || 0)}
              </div>
              <p className="text-xs opacity-80">سجل في النظام</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-medium opacity-90">عدد الفئات</CardTitle>
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 opacity-80" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1">
                {formatNumber(stats?.categoriesCount || 0)}
              </div>
              <p className="text-xs opacity-80">فئة مختلفة</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-medium opacity-90">السجلات القديمة</CardTitle>
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 opacity-80" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1">
                {formatNumber(stats?.oldRecordsCount || 0)}
              </div>
              <p className="text-xs opacity-80">تحتاج تنظيف</p>
            </CardContent>
          </Card>

          <Card className={`border-0 shadow-lg text-white hover:shadow-xl transition-all duration-300 ${
            stats?.oldRecordsCount === 0 
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
              : 'bg-gradient-to-br from-yellow-500 to-yellow-600'
          }`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs sm:text-sm font-medium opacity-90">حالة النظام</CardTitle>
                {stats?.oldRecordsCount === 0 ? (
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 opacity-80" />
                ) : (
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 opacity-80" />
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold mb-1">
                {stats?.oldRecordsCount === 0 ? 'ممتاز' : 'يحتاج صيانة'}
              </div>
              <p className="text-xs opacity-80">
                {stats?.oldRecordsCount === 0 ? 'النظام محسّن' : 'يحتاج تنظيف'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg gap-1">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-200 text-sm sm:text-base font-medium rounded-md"
              data-testid="tab-overview"
            >
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger 
              value="categories" 
              className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-200 text-sm sm:text-base font-medium rounded-md"
              data-testid="tab-categories"
            >
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              <span className="hidden sm:inline">تفصيل</span> الفئات
            </TabsTrigger>
            <TabsTrigger 
              value="maintenance" 
              className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all duration-200 text-sm sm:text-base font-medium rounded-md"
              data-testid="tab-maintenance"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              <span className="hidden sm:inline">أدوات</span> الصيانة
            </TabsTrigger>
          </TabsList>

        {/* نظرة عامة */}
        <TabsContent value="overview" className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <Card className="border-0 shadow-md bg-gradient-to-r from-white to-blue-50 dark:from-gray-800 dark:to-gray-900">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-white">صحة النظام</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">كفاءة البيانات</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {stats && stats.totalRecords > 0 ? Math.round(((stats.totalRecords - stats.oldRecordsCount) / stats.totalRecords) * 100) : 0}%
                    </span>
                    <Badge variant={stats && stats.totalRecords > 0 && ((stats.totalRecords - stats.oldRecordsCount) / stats.totalRecords) * 100 > 80 ? "default" : "secondary"}>
                      {stats && stats.totalRecords > 0 && ((stats.totalRecords - stats.oldRecordsCount) / stats.totalRecords) * 100 > 80 ? "ممتاز" : "يحتاج تحسين"}
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={stats && stats.totalRecords > 0 ? ((stats.totalRecords - stats.oldRecordsCount) / stats.totalRecords) * 100 : 0} 
                  className="h-3 bg-gray-200 dark:bg-gray-700"
                />
              </div>
              
              {stats && stats.oldRecordsCount > 0 && (
                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <span className="font-medium text-orange-800 dark:text-orange-200 text-sm sm:text-base">
                        تحذير: يوجد {formatNumber(stats.oldRecordsCount)} سجل قديم
                      </span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-fit border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-600 dark:text-orange-300"
                      onClick={() => cleanupMutation.mutate()}
                      disabled={cleanupMutation.isPending}
                      data-testid="button-quick-cleanup"
                    >
                      <Trash2 className="w-4 h-4 ml-1" />
                      تنظيف سريع
                    </Button>
                  </div>
                  <p className="text-sm text-orange-600 dark:text-orange-300 mt-2 mr-7 sm:mr-0">
                    هذه السجلات لم تُستخدم لأكثر من 6 أشهر وتم استخدامها أقل من 3 مرات
                  </p>
                </div>
              )}

              {/* معلومات إضافية */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-200 text-sm">السجلات النشطة</span>
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    {formatNumber((stats?.totalRecords || 0) - (stats?.oldRecordsCount || 0))}
                  </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800 dark:text-blue-200 text-sm">متوسط الاستخدام</span>
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    {stats?.categoryBreakdown 
                      ? Math.round(stats.categoryBreakdown.reduce((acc, cat) => acc + (cat.avgUsage || 0), 0) / stats.categoryBreakdown.length) || 0
                      : 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تفصيل الفئات */}
        <TabsContent value="categories" className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-white">تفصيل الفئات</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">الاستخدام والإحصائيات</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => enforceLimitsMutation.mutate(undefined)}
                  disabled={enforceLimitsMutation.isPending}
                  className="w-full sm:w-auto"
                  data-testid="button-enforce-all-limits"
                >
                  <Settings className="w-4 h-4 ml-1" />
                  تطبيق الحدود على الكل
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.categoryBreakdown.map((category, index) => (
                  <div key={category.category} className="group bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                      {/* معلومات الفئة */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-green-500"></div>
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {category.category}
                          </h3>
                          <Badge 
                            variant={category.count > 100 ? "destructive" : category.count > 50 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {category.count > 100 ? "مرتفع" : category.count > 50 ? "متوسط" : "منخفض"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 block">عدد السجلات</span>
                            <span className="font-bold text-lg text-gray-900 dark:text-white">
                              {formatNumber(category.count)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400 block">متوسط الاستخدام</span>
                            <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                              {isNaN(category.avgUsage) || !isFinite(category.avgUsage) ? '0.0' : category.avgUsage.toFixed(1)}
                            </span>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <span className="text-gray-500 dark:text-gray-400 block">الحالة</span>
                            <span className={`font-medium ${category.count > 100 ? 'text-red-600' : category.count > 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                              {category.count > 100 ? 'يحتاج تقليم' : category.count > 50 ? 'مراقبة' : 'صحي'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* أزرار الإجراءات */}
                      <div className="flex items-center gap-2 lg:flex-col lg:gap-1">
                        <Button
                          size="sm"
                          variant={category.count > 100 ? "destructive" : "outline"}
                          onClick={() => enforceLimitsMutation.mutate(category.category)}
                          disabled={enforceLimitsMutation.isPending}
                          className="flex-1 lg:flex-none lg:w-20 transition-all duration-200"
                          data-testid={`button-trim-${index}`}
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                          <span className="text-xs sm:text-sm">تقليم</span>
                        </Button>
                        <div className="text-xs text-center text-gray-500 dark:text-gray-400 lg:w-20">
                          {Math.round((category.count / (stats?.totalRecords || 1)) * 100)}%
                        </div>
                      </div>
                    </div>
                    
                    {/* شريط التقدم للاستخدام */}
                    <div className="mt-3">
                      <Progress 
                        value={Math.min((category.count / 100) * 100, 100)}
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>0</span>
                        <span>الحد الأقصى (100)</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!stats?.categoryBreakdown || stats.categoryBreakdown.length === 0) && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد فئات محفوظة بعد</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* أدوات الصيانة */}
        <TabsContent value="maintenance" className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* أدوات الصيانة السريعة */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                    <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-gray-900 dark:text-white">تنظيف البيانات القديمة</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">حذف السجلات غير المستخدمة</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    حذف السجلات التي لم تُستخدم لأكثر من <strong>6 أشهر</strong> والمستخدمة أقل من <strong>3 مرات</strong>
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">السجلات المستهدفة:</span>
                    <Badge variant={stats?.oldRecordsCount === 0 ? "secondary" : "destructive"}>
                      {formatNumber(stats?.oldRecordsCount || 0)} سجل
                    </Badge>
                  </div>
                </div>
                <Button
                  onClick={() => cleanupMutation.mutate()}
                  disabled={cleanupMutation.isPending}
                  className="w-full transition-all duration-200"
                  variant={stats?.oldRecordsCount === 0 ? "secondary" : "destructive"}
                  size="lg"
                  data-testid="button-cleanup"
                >
                  {cleanupMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                      جاري التنظيف...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 ml-2" />
                      تنظيف البيانات القديمة
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-gray-900 dark:text-white">تطبيق حدود الفئات</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">تحسين أداء النظام</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    فرض حد أقصى <strong>100 اقتراح</strong> لكل فئة وحذف الأقل استخداماً
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">الفئات المتأثرة:</span>
                    <Badge variant="secondary">
                      {stats?.categoryBreakdown?.filter(cat => cat.count > 100).length || 0} فئة
                    </Badge>
                  </div>
                </div>
                <Button
                  onClick={() => enforceLimitsMutation.mutate(undefined)}
                  disabled={enforceLimitsMutation.isPending}
                  className="w-full transition-all duration-200"
                  variant="outline"
                  size="lg"
                  data-testid="button-enforce-limits"
                >
                  {enforceLimitsMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                      جاري التطبيق...
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4 ml-2" />
                      تطبيق الحدود
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Separator className="my-6" />

          {/* الصيانة الشاملة */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-sm">
                    <RefreshCw className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-gray-900 dark:text-white">صيانة شاملة للنظام</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">تحسين وتنظيف شامل للنظام</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs bg-white dark:bg-gray-800">
                  موصى به شهرياً
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 sm:p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  ما تتضمنه الصيانة الشاملة:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-blue-700 dark:text-blue-300">حذف السجلات القديمة وغير المستخدمة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-blue-700 dark:text-blue-300">تطبيق حدود على جميع الفئات</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm text-blue-700 dark:text-blue-300">تحسين فهارس قاعدة البيانات</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm text-blue-700 dark:text-blue-300">إعادة تنظيم ترتيب الاقتراحات</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200 text-sm">تحذير هام</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      قد تستغرق العملية عدة دقائق حسب حجم البيانات. لا تغلق الصفحة أثناء التشغيل.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleRunMaintenance}
                disabled={isMaintenanceRunning || maintenanceMutation.isPending}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                size="lg"
                data-testid="button-comprehensive-maintenance"
              >
                {isMaintenanceRunning || maintenanceMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                    جاري تشغيل الصيانة الشاملة...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 ml-2" />
                    تشغيل الصيانة الشاملة
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}