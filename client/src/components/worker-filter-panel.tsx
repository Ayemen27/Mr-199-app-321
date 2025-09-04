/**
 * الوصف: لوحة تصفية العمال المخصصة للتقارير
 * المدخلات: قائمة العمال وخيارات التصفية
 * المخرجات: واجهة تصفية متقدمة مع معاينة النتائج
 * المالك: عمار
 * آخر تعديل: 2025-08-15
 * الحالة: نشط
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Filter, 
  Users, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Eye,
  X,
  RefreshCw
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Worker } from "@shared/schema";

interface WorkerFilterPanelProps {
  workers: Worker[];
  onFilteredWorkersChange: (workers: Worker[]) => void;
  selectedWorkerId?: string;
  onWorkerSelect?: (workerId: string) => void;
}

export function WorkerFilterPanel({
  workers,
  onFilteredWorkersChange,
  selectedWorkerId,
  onWorkerSelect
}: WorkerFilterPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // تطبيق التصفية والترتيب
  const filteredWorkers = useMemo(() => {
    let result = [...workers];

    // البحث النصي
    if (searchTerm.trim()) {
      result = result.filter(worker => 
        worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((worker as any).phone && (worker as any).phone.includes(searchTerm))
      );
    }

    // تصفية حسب النوع
    if (filterType !== "all") {
      result = result.filter(worker => worker.type === filterType);
    }

    // تصفية حسب الحالة
    if (filterStatus !== "all") {
      const isActive = filterStatus === "active";
      result = result.filter(worker => worker.isActive === isActive);
    }

    // الترتيب
    result.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'dailyWage':
          aValue = Number(a.dailyWage || 0);
          bValue = Number(b.dailyWage || 0);
          break;
        case 'type':
          aValue = a.type.toLowerCase();
          bValue = b.type.toLowerCase();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [workers, searchTerm, filterType, filterStatus, sortBy, sortDirection]);

  // إشعار المكون الأب
  useMemo(() => {
    onFilteredWorkersChange(filteredWorkers);
  }, [filteredWorkers, onFilteredWorkersChange]);

  // إحصائيات العمال المفلترين
  const stats = useMemo(() => {
    const activeWorkers = filteredWorkers.filter(w => w.isActive);
    const totalDailyWages = filteredWorkers.reduce((sum, w) => sum + Number(w.dailyWage || 0), 0);
    const workerTypes = new Set(filteredWorkers.map(w => w.type));

    return {
      total: filteredWorkers.length,
      active: activeWorkers.length,
      inactive: filteredWorkers.length - activeWorkers.length,
      totalDailyWages,
      averageDailyWage: filteredWorkers.length > 0 ? totalDailyWages / filteredWorkers.length : 0,
      typesCount: workerTypes.size,
      types: Array.from(workerTypes)
    };
  }, [filteredWorkers]);

  // إعادة تعيين جميع المرشحات
  const resetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterStatus("all");
    setSortBy("name");
    setSortDirection('asc');
  };

  return (
    <Card className="shadow-lg border-2 border-blue-100">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">تصفية وترتيب العمال</h3>
              <p className="text-sm text-muted-foreground font-normal">
                البحث والتصفية المتقدم للعثور على العامل المطلوب
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="text-red-600 hover:bg-red-50"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            إعادة تعيين
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        <Tabs defaultValue="filter" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="filter">التصفية والبحث</TabsTrigger>
            <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
          </TabsList>

          <TabsContent value="filter" className="space-y-4">
            {/* شريط البحث */}
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="ابحث باسم العامل أو النوع أو رقم الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="absolute left-2 top-2 h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* خيارات التصفية */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">نوع العمل</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    <SelectItem value="عامل عادي">عامل عادي</SelectItem>
                    <SelectItem value="سائق">سائق</SelectItem>
                    <SelectItem value="فني">فني</SelectItem>
                    <SelectItem value="مشرف">مشرف</SelectItem>
                    <SelectItem value="مهندس">مهندس</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">حالة العامل</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">ترتيب حسب</label>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">الاسم</SelectItem>
                      <SelectItem value="dailyWage">الأجر اليومي</SelectItem>
                      <SelectItem value="type">نوع العمل</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="px-3"
                  >
                    {sortDirection === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* عدد النتائج */}
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
              <span className="text-sm text-muted-foreground">
                عرض {filteredWorkers.length} من أصل {workers.length} عامل
              </span>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            {/* الإحصائيات السريعة */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-muted-foreground">إجمالي العمال</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <div className="text-sm text-muted-foreground">عمال نشطين</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(stats.totalDailyWages)}
                </div>
                <div className="text-sm text-muted-foreground">إجمالي الأجور اليومية</div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-indigo-600">{stats.typesCount}</div>
                <div className="text-sm text-muted-foreground">أنواع العمل</div>
              </div>
            </div>

            {/* تفاصيل إضافية */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">متوسط الأجر اليومي:</span>
                <Badge variant="secondary">{formatCurrency(stats.averageDailyWage)}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">العمال غير النشطين:</span>
                <Badge variant={stats.inactive > 0 ? "destructive" : "default"}>
                  {stats.inactive}
                </Badge>
              </div>
              <div>
                <span className="text-sm font-medium block mb-2">أنواع العمل المتاحة:</span>
                <div className="flex flex-wrap gap-1">
                  {stats.types.map(type => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* قائمة العمال المفلترين */}
        {filteredWorkers.length > 0 && onWorkerSelect && (
          <div className="mt-6">
            <h4 className="font-medium mb-3">اختر العامل:</h4>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {filteredWorkers.slice(0, 10).map(worker => (
                <div
                  key={worker.id}
                  onClick={() => onWorkerSelect(worker.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedWorkerId === worker.id
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${worker.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <div className="font-medium">{worker.name}</div>
                        <div className="text-sm text-muted-foreground">{worker.type}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(Number(worker.dailyWage || 0))}</div>
                      <Badge variant={worker.isActive ? "default" : "secondary"} className="text-xs">
                        {worker.isActive ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {filteredWorkers.length > 10 && (
                <div className="text-center text-sm text-muted-foreground">
                  و {filteredWorkers.length - 10} عامل آخر...
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}