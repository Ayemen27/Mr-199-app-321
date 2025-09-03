import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  FileSpreadsheet, 
  Printer, 
  Users,
  Calendar,
  DollarSign,
  Clock,
  Filter,
  Download,
  Eye,
  BarChart3
} from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import ProjectSelector from "@/components/project-selector";
import { formatCurrency, formatDate, getCurrentDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface WorkerReportData {
  worker: {
    id: string;
    name: string;
    type: string;
    dailyWage: number;
    isActive: boolean;
  };
  stats: {
    totalWorkDays: number;
    totalEarned: number;
    totalPaid: number;
    remainingBalance: number;
    averageWorkDays: number;
    attendanceRate: number;
  };
  recentAttendance: Array<{
    date: string;
    workDays: number;
    actualWage: number;
    paidAmount: number;
  }>;
}

interface UnifiedReportFilters {
  workerIds: string[];
  workerTypes: string[];
  dateFrom: string;
  dateTo: string;
  includeInactive: boolean;
  reportType: 'summary' | 'detailed' | 'attendance' | 'financial';
}

export default function WorkersUnifiedReports() {
  const [filters, setFilters] = useState<UnifiedReportFilters>({
    workerIds: [],
    workerTypes: [],
    dateFrom: "",
    dateTo: getCurrentDate(),
    includeInactive: false,
    reportType: 'summary'
  });
  
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { selectedProjectId } = useSelectedProject();

  // جلب قائمة العمال
  const { data: workers = [] } = useQuery({
    queryKey: ["/api/workers", selectedProjectId, filters.includeInactive],
    queryFn: () => {
      if (!selectedProjectId) return [];
      const params = new URLSearchParams({
        projectId: selectedProjectId,
        includeInactive: filters.includeInactive.toString()
      });
      return apiRequest(`/api/workers?${params}`, "GET");
    },
    enabled: !!selectedProjectId
  });

  // جلب أنواع العمال المتاحة
  const { data: workerTypes = [] } = useQuery({
    queryKey: ["/api/worker-types"],
    queryFn: () => apiRequest("/api/worker-types", "GET")
  });

  // جلب بيانات التقرير الموحد
  const { data: reportData = [], isLoading } = useQuery<WorkerReportData[]>({
    queryKey: ["/api/workers-unified-report", selectedProjectId, filters],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      
      const params = new URLSearchParams({
        projectId: selectedProjectId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        includeInactive: filters.includeInactive.toString(),
        reportType: filters.reportType
      });
      
      if (filters.workerIds.length > 0) {
        params.append('workerIds', filters.workerIds.join(','));
      }
      
      if (filters.workerTypes.length > 0) {
        params.append('workerTypes', filters.workerTypes.join(','));
      }
      
      return apiRequest(`/api/workers-unified-report?${params}`, "GET");
    },
    enabled: !!selectedProjectId
  });

  const handleWorkerSelection = (workerId: string, checked: boolean) => {
    if (checked) {
      setSelectedWorkers(prev => [...prev, workerId]);
    } else {
      setSelectedWorkers(prev => prev.filter(id => id !== workerId));
    }
    
    setFilters(prev => ({
      ...prev,
      workerIds: checked 
        ? [...prev.workerIds, workerId]
        : prev.workerIds.filter(id => id !== workerId)
    }));
  };

  const handleSelectAllWorkers = (checked: boolean) => {
    if (checked) {
      const allWorkerIds = workers.map((w: any) => w.id);
      setSelectedWorkers(allWorkerIds);
      setFilters(prev => ({ ...prev, workerIds: allWorkerIds }));
    } else {
      setSelectedWorkers([]);
      setFilters(prev => ({ ...prev, workerIds: [] }));
    }
  };

  const handleExportReport = async (format: 'excel' | 'pdf') => {
    if (!selectedProjectId || selectedWorkers.length === 0) {
      alert('يرجى اختيار عمال لتصدير التقرير');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest("/api/export-workers-unified-report", "POST", {
        projectId: selectedProjectId,
        filters,
        format
      });

      if (response.downloadUrl) {
        window.open(response.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('خطأ في تصدير التقرير:', error);
      alert('حدث خطأ في تصدير التقرير');
    } finally {
      setIsGenerating(false);
    }
  };

  const totalStats = reportData.reduce((acc, worker) => ({
    totalWorkers: acc.totalWorkers + 1,
    totalWorkDays: acc.totalWorkDays + worker.stats.totalWorkDays,
    totalEarned: acc.totalEarned + worker.stats.totalEarned,
    totalPaid: acc.totalPaid + worker.stats.totalPaid,
    totalRemaining: acc.totalRemaining + worker.stats.remainingBalance
  }), {
    totalWorkers: 0,
    totalWorkDays: 0,
    totalEarned: 0,
    totalPaid: 0,
    totalRemaining: 0
  });

  return (
    <div className="p-6 space-y-6">
      {/* رأس الصفحة */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">التقارير الموحدة للعمال</h1>
          <p className="text-gray-600 mt-1">تقارير شاملة ومفصلة لجميع العمال</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleExportReport('pdf')}
            disabled={isGenerating || selectedWorkers.length === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            طباعة PDF
          </Button>
          <Button 
            size="sm" 
            onClick={() => handleExportReport('excel')}
            disabled={isGenerating || selectedWorkers.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            تصدير Excel
          </Button>
        </div>
      </div>

      {/* فلاتر التقرير */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            فلاتر وإعدادات التقرير
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">المشروع</label>
              <ProjectSelector onProjectChange={() => {}} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">نوع التقرير</label>
              <Select 
                value={filters.reportType} 
                onValueChange={(value: any) => setFilters(prev => ({ ...prev, reportType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">ملخص</SelectItem>
                  <SelectItem value="detailed">تفصيلي</SelectItem>
                  <SelectItem value="attendance">الحضور</SelectItem>
                  <SelectItem value="financial">مالي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">من تاريخ</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">إلى تاريخ</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeInactive"
                  checked={filters.includeInactive}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, includeInactive: !!checked }))
                  }
                />
                <label htmlFor="includeInactive" className="text-sm">
                  العمال غير النشطين
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="selection" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="selection">اختيار العمال</TabsTrigger>
          <TabsTrigger value="summary">الملخص</TabsTrigger>
          <TabsTrigger value="detailed">التفاصيل</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
        </TabsList>

        {/* اختيار العمال */}
        <TabsContent value="selection" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>اختيار العمال للتقرير</CardTitle>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selectAll"
                  checked={selectedWorkers.length === workers.length && workers.length > 0}
                  onCheckedChange={handleSelectAllWorkers}
                />
                <label htmlFor="selectAll" className="text-sm">
                  تحديد الكل ({workers.length})
                </label>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {workers.map((worker: any) => (
                  <div key={worker.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <Checkbox
                      id={worker.id}
                      checked={selectedWorkers.includes(worker.id)}
                      onCheckedChange={(checked) => handleWorkerSelection(worker.id, !!checked)}
                    />
                    <div className="flex-1">
                      <label htmlFor={worker.id} className="cursor-pointer">
                        <p className="font-medium">{worker.name}</p>
                        <p className="text-sm text-gray-500">
                          {worker.type} - {formatCurrency(worker.dailyWage.toString())}
                        </p>
                      </label>
                    </div>
                    {!worker.isActive && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                        غير نشط
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {workers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد عمال في المشروع المحدد</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ملخص التقرير */}
        <TabsContent value="summary" className="space-y-4">
          {/* إحصائيات عامة */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">عدد العمال</p>
                    <p className="text-2xl font-bold text-blue-600">{totalStats.totalWorkers}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">إجمالي أيام العمل</p>
                    <p className="text-2xl font-bold text-green-600">{totalStats.totalWorkDays}</p>
                  </div>
                  <Clock className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">إجمالي الأجور</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(totalStats.totalEarned.toString())}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">المتبقي</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(totalStats.totalRemaining.toString())}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* جدول ملخص العمال */}
          <Card>
            <CardHeader>
              <CardTitle>ملخص العمال المحددين</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : reportData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  يرجى اختيار عمال لعرض التقرير
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right p-3">اسم العامل</th>
                        <th className="text-right p-3">النوع</th>
                        <th className="text-right p-3">أيام العمل</th>
                        <th className="text-right p-3">الأجر المستحق</th>
                        <th className="text-right p-3">المدفوع</th>
                        <th className="text-right p-3">المتبقي</th>
                        <th className="text-right p-3">معدل الحضور</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((workerData) => (
                        <tr key={workerData.worker.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{workerData.worker.name}</td>
                          <td className="p-3">{workerData.worker.type}</td>
                          <td className="p-3">{workerData.stats.totalWorkDays}</td>
                          <td className="p-3">{formatCurrency(workerData.stats.totalEarned.toString())}</td>
                          <td className="p-3">{formatCurrency(workerData.stats.totalPaid.toString())}</td>
                          <td className="p-3">
                            <span className={workerData.stats.remainingBalance > 0 ? 'text-green-600' : workerData.stats.remainingBalance < 0 ? 'text-red-600' : 'text-gray-600'}>
                              {formatCurrency(workerData.stats.remainingBalance.toString())}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              workerData.stats.attendanceRate >= 90 ? 'bg-green-100 text-green-800' :
                              workerData.stats.attendanceRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {workerData.stats.attendanceRate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* التفاصيل */}
        <TabsContent value="detailed">
          <Card>
            <CardHeader>
              <CardTitle>التقرير المفصل</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">التقرير المفصل سيتم تطويره لاحقاً ليشمل تفاصيل الحضور اليومي والمدفوعات</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* التحليلات */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>تحليلات الأداء</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">تحليلات الأداء والإحصائيات المتقدمة قيد التطوير</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}