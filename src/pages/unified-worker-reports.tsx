import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Printer, Users, Calendar, TrendingUp, DollarSign, Download } from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import ProjectSelector from "@/components/project-selector";
import { formatCurrency, formatDate, getCurrentDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface UnifiedWorkerData {
  workerId: string;
  workerName: string;
  workerType: string;
  dailyWage: number;
  isActive: boolean;
  summary: {
    totalWorkDays: number;
    totalEarned: number;
    totalPaid: number;
    totalRemaining: number;
    lastWorkDate: string;
    firstWorkDate: string;
  };
  monthlyBreakdown: Array<{
    month: string;
    workDays: number;
    earned: number;
    paid: number;
  }>;
}

export default function UnifiedWorkerReports() {
  const [selectedWorkerId, setSelectedWorkerId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(getCurrentDate());
  const [reportFormat, setReportFormat] = useState<'summary' | 'detailed'>('summary');
  const [sortBy, setSortBy] = useState<'name' | 'workDays' | 'earnings' | 'balance'>('name');
  
  const { selectedProjectId } = useSelectedProject();

  // جلب قائمة العمال
  const { data: workers = [] } = useQuery({
    queryKey: ["/api/workers", selectedProjectId],
    queryFn: () => selectedProjectId ? apiRequest(`/api/workers?projectId=${selectedProjectId}`, "GET") : [],
    enabled: !!selectedProjectId
  });

  // جلب البيانات الموحدة للعمال
  const { data: unifiedData = [], isLoading } = useQuery<UnifiedWorkerData[]>({
    queryKey: ["/api/unified-worker-reports", selectedProjectId, selectedWorkerId, dateFrom, dateTo],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      
      const params = new URLSearchParams({
        projectId: selectedProjectId,
        dateFrom: dateFrom || "",
        dateTo: dateTo || getCurrentDate()
      });
      
      if (selectedWorkerId !== "all") {
        params.append('workerId', selectedWorkerId);
      }
      
      return apiRequest(`/api/unified-worker-reports?${params}`, "GET");
    },
    enabled: !!selectedProjectId
  });

  // حساب الإحصائيات الإجمالية
  const totalStats = Array.isArray(unifiedData) ? unifiedData.reduce((acc, worker) => ({
    totalWorkers: acc.totalWorkers + 1,
    totalWorkDays: acc.totalWorkDays + worker.summary.totalWorkDays,
    totalEarned: acc.totalEarned + worker.summary.totalEarned,
    totalPaid: acc.totalPaid + worker.summary.totalPaid,
    totalRemaining: acc.totalRemaining + worker.summary.totalRemaining
  }), {
    totalWorkers: 0,
    totalWorkDays: 0,
    totalEarned: 0,
    totalPaid: 0,
    totalRemaining: 0
  }) : {
    totalWorkers: 0,
    totalWorkDays: 0,
    totalEarned: 0,
    totalPaid: 0,
    totalRemaining: 0
  };

  // ترتيب البيانات
  const sortedData = Array.isArray(unifiedData) ? [...unifiedData].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.workerName.localeCompare(b.workerName, 'ar');
      case 'workDays':
        return b.summary.totalWorkDays - a.summary.totalWorkDays;
      case 'earnings':
        return b.summary.totalEarned - a.summary.totalEarned;
      case 'balance':
        return b.summary.totalRemaining - a.summary.totalRemaining;
      default:
        return 0;
    }
  }) : [];

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!selectedProjectId) {
      alert('يرجى اختيار مشروع');
      return;
    }

    try {
      const response = await apiRequest("/api/export-unified-worker-report", "POST", {
        projectId: selectedProjectId,
        workerId: selectedWorkerId,
        dateFrom,
        dateTo,
        format,
        reportFormat
      });

      if (response.downloadUrl) {
        window.open(response.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('خطأ في التصدير:', error);
      alert('حدث خطأ في تصدير التقرير');
    }
  };

  if (!selectedProjectId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">يرجى اختيار مشروع لعرض التقارير</p>
            <div className="mt-4">
              <ProjectSelector onProjectChange={() => {}} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* رأس الصفحة */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">التقارير الموحدة للعمال</h1>
          <p className="text-gray-600 mt-1">تقرير شامل موحد لجميع العمال والمشاريع</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
            <Printer className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button size="sm" onClick={() => handleExport('excel')}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* الفلاتر والإعدادات */}
      <Card>
        <CardHeader>
          <CardTitle>إعدادات التقرير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">المشروع</label>
              <ProjectSelector onProjectChange={() => {}} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">العامل</label>
              <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                <SelectTrigger>
                  <SelectValue placeholder="كل العمال" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل العمال</SelectItem>
                  {Array.isArray(workers) && workers.map((worker: any) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name} - {worker.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">من تاريخ</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">إلى تاريخ</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">نوع التقرير</label>
              <Select value={reportFormat} onValueChange={(value: any) => setReportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">ملخص</SelectItem>
                  <SelectItem value="detailed">تفصيلي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ترتيب حسب</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">الاسم</SelectItem>
                  <SelectItem value="workDays">أيام العمل</SelectItem>
                  <SelectItem value="earnings">الأجور</SelectItem>
                  <SelectItem value="balance">الرصيد</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* الإحصائيات الإجمالية */}
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
              <Calendar className="w-8 h-8 text-green-500" />
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
                <p className="text-sm font-medium text-gray-600">إجمالي المتبقي</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(totalStats.totalRemaining.toString())}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* التقرير الرئيسي */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل العمال</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">جاري تحميل البيانات...</p>
            </div>
          ) : sortedData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد بيانات عمال في الفترة المحددة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reportFormat === 'summary' ? (
                /* عرض ملخص */
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right p-3">العامل</th>
                        <th className="text-right p-3">النوع</th>
                        <th className="text-right p-3">الحالة</th>
                        <th className="text-right p-3">أيام العمل</th>
                        <th className="text-right p-3">الأجر المستحق</th>
                        <th className="text-right p-3">المدفوع</th>
                        <th className="text-right p-3">المتبقي</th>
                        <th className="text-right p-3">الفترة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(sortedData) && sortedData.map((worker) => (
                        <tr key={worker.workerId} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{worker.workerName}</p>
                              <p className="text-xs text-gray-500">
                                أجر يومي: {formatCurrency(worker.dailyWage.toString())}
                              </p>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">{worker.workerType}</Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant={worker.isActive ? "default" : "secondary"}>
                              {worker.isActive ? "نشط" : "غير نشط"}
                            </Badge>
                          </td>
                          <td className="p-3 font-medium">{worker.summary.totalWorkDays}</td>
                          <td className="p-3">{formatCurrency(worker.summary.totalEarned.toString())}</td>
                          <td className="p-3">{formatCurrency(worker.summary.totalPaid.toString())}</td>
                          <td className="p-3">
                            <span className={
                              worker.summary.totalRemaining > 0 ? 'text-green-600 font-semibold' :
                              worker.summary.totalRemaining < 0 ? 'text-red-600 font-semibold' :
                              'text-gray-600'
                            }>
                              {formatCurrency(worker.summary.totalRemaining.toString())}
                            </span>
                          </td>
                          <td className="p-3 text-xs">
                            {worker.summary.firstWorkDate && worker.summary.lastWorkDate && (
                              <div>
                                <p>من: {formatDate(worker.summary.firstWorkDate)}</p>
                                <p>إلى: {formatDate(worker.summary.lastWorkDate)}</p>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold bg-gray-50">
                        <td colSpan={3} className="p-3 text-right">الإجمالي:</td>
                        <td className="p-3">{totalStats.totalWorkDays}</td>
                        <td className="p-3">{formatCurrency(totalStats.totalEarned.toString())}</td>
                        <td className="p-3">{formatCurrency(totalStats.totalPaid.toString())}</td>
                        <td className="p-3 text-lg">
                          <span className={
                            totalStats.totalRemaining > 0 ? 'text-green-600' :
                            totalStats.totalRemaining < 0 ? 'text-red-600' :
                            'text-gray-600'
                          }>
                            {formatCurrency(totalStats.totalRemaining.toString())}
                          </span>
                        </td>
                        <td className="p-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                /* عرض تفصيلي */
                <div className="space-y-6">
                  {Array.isArray(sortedData) && sortedData.map((worker) => (
                    <Card key={worker.workerId} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{worker.workerName}</CardTitle>
                            <p className="text-sm text-gray-600">
                              {worker.workerType} - {formatCurrency(worker.dailyWage.toString())} يومياً
                            </p>
                          </div>
                          <Badge variant={worker.isActive ? "default" : "secondary"}>
                            {worker.isActive ? "نشط" : "غير نشط"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center p-3 bg-blue-50 rounded">
                            <p className="text-sm text-gray-600">أيام العمل</p>
                            <p className="text-xl font-bold text-blue-600">{worker.summary.totalWorkDays}</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded">
                            <p className="text-sm text-gray-600">المستحق</p>
                            <p className="text-xl font-bold text-green-600">
                              {formatCurrency(worker.summary.totalEarned.toString())}
                            </p>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded">
                            <p className="text-sm text-gray-600">المدفوع</p>
                            <p className="text-xl font-bold text-purple-600">
                              {formatCurrency(worker.summary.totalPaid.toString())}
                            </p>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded">
                            <p className="text-sm text-gray-600">المتبقي</p>
                            <p className={`text-xl font-bold ${
                              worker.summary.totalRemaining > 0 ? 'text-green-600' :
                              worker.summary.totalRemaining < 0 ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {formatCurrency(worker.summary.totalRemaining.toString())}
                            </p>
                          </div>
                        </div>

                        {worker.monthlyBreakdown && worker.monthlyBreakdown.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-3">التفصيل الشهري:</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-right p-2">الشهر</th>
                                    <th className="text-right p-2">أيام العمل</th>
                                    <th className="text-right p-2">المستحق</th>
                                    <th className="text-right p-2">المدفوع</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Array.isArray(worker.monthlyBreakdown) && worker.monthlyBreakdown.map((month, index) => (
                                    <tr key={index} className="border-b">
                                      <td className="p-2">{month.month}</td>
                                      <td className="p-2">{month.workDays}</td>
                                      <td className="p-2">{formatCurrency(month.earned.toString())}</td>
                                      <td className="p-2">{formatCurrency(month.paid.toString())}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}