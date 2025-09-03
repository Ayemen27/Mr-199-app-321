/**
 * تقرير تصفية العمال بالبيانات الحقيقية - مطابق لتصميم Excel 100%
 * يستخدم البيانات الحقيقية من قاعدة البيانات وليس البيانات الوهمية
 * التصميم يطابق تماماً الصور المرفقة من Excel
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Filter, 
  FileSpreadsheet, 
  Printer, 
  Search,
  Building2,
  Calendar,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle,
  Camera
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { 
  COMPANY_INFO, 
  EXCEL_STYLES, 
  formatCurrency, 
  formatNumber, 
  formatDate, 
  addReportHeader, 
  addReportFooter, 
  formatDataTable
} from '@/components/excel-export-utils';
import '@/styles/excel-print-styles.css';
import { safeFind, ensureArray } from '@/lib/array-utils';

// واجهات البيانات المحدثة
interface Project {
  id: string;
  name: string;
  status: string;
}

interface Worker {
  id: string;
  name: string;
  type: string;
  dailyWage: number;
  isActive: boolean;
}

interface WorkerAttendance {
  id: string;
  workerId: string;
  projectId: string;
  date: string;
  workDays: number;
  workHours: number;
  dailyWage: number;
  paidAmount: number;
  notes: string;
}

interface WorkerSummary {
  workerId: string;
  workerName: string;
  workerType: string;
  projectName: string;
  dailyWage: number;
  totalWorkDays: number;
  totalWorkHours: number;
  totalEarned: number;
  totalPaid: number;
  totalRemaining: number;
}

export default function WorkerFilterReportRealData() {
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [workersSummary, setWorkersSummary] = useState<WorkerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // جلب البيانات الأساسية
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ['/api/workers'],
  });

  // إعداد التواريخ الافتراضية
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    setDateFrom(startOfMonth);
    setDateTo(today);
  }, []);

  // فلترة العمال
  const filteredWorkers = useMemo(() => {
    return workers.filter(worker =>
      worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [workers, searchTerm]);

  // دالة لجلب بيانات الحضور الحقيقية
  const fetchWorkerAttendanceData = async (workerIds: string[], projectIds: string[] = []) => {
    try {
      setIsLoading(true);


      const queryParams = new URLSearchParams({
        dateFrom: dateFrom || '',
        dateTo: dateTo || '',
        workerIds: workerIds.join(','),
        projectIds: projectIds.length > 0 ? projectIds.join(',') : 'all'
      });

      const response = await fetch(`/api/reports/workers-settlement?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`خطأ في الخادم: ${response.status}`);
      }

      const data = await response.json();


      // التحقق من أن البيانات في التنسيق المتوقع
      const workersData = data.workers || [];
      
      // التأكد من أن workersData هو مصفوفة
      if (!Array.isArray(workersData)) {
        console.error('❌ البيانات المستلمة ليست مصفوفة:', workersData);
        throw new Error('تنسيق البيانات غير صحيح');
      }
      
      // تحويل البيانات إلى تنسيق ملخص العمال
      const summaryData: WorkerSummary[] = workersData.map((workerData: any) => {
        const worker = safeFind(workers, w => w.id === workerData.worker_id);
        
        // استخدام البيانات من API بدلاً من حسابها يدوياً - مع إصلاح حساب الأيام
        const totalWorkDays = Number(workerData.total_work_days) || 0;
        const totalWorkHours = totalWorkDays * 8; // حساب الساعات بناءً على أيام العمل الفعلية
        const totalEarned = Number(workerData.total_earned) || 0;
        const totalPaid = Number(workerData.total_paid) || 0;
        


        // الحصول على اسم المشروع
        let projectName = 'جميع المشاريع';
        if (projectIds.length === 1) {
          const project = safeFind(projects, p => p.id === projectIds[0]);
          projectName = project?.name || 'مشروع محدد';
        }

        return {
          workerId: workerData.worker_id,
          workerName: workerData.worker_name || worker?.name || 'غير معروف',
          workerType: workerData.worker_type || worker?.type || 'غير محدد',
          projectName,
          dailyWage: Number(workerData.daily_wage) || Number(worker?.dailyWage) || 0,
          totalWorkDays,
          totalWorkHours,
          totalEarned,
          totalPaid,
          totalRemaining: totalEarned - totalPaid
        };
      });

      setWorkersSummary(summaryData);


    } catch (error) {
      console.error('❌ خطأ في جلب بيانات الحضور:', error);
      alert(`خطأ في جلب البيانات: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // دوال التعامل مع الأحداث
  const handleWorkerSelection = (workerId: string, checked: boolean) => {
    if (checked) {
      setSelectedWorkers(prev => [...prev, workerId]);
    } else {
      setSelectedWorkers(prev => prev.filter(id => id !== workerId));
    }
  };

  const handleSelectAll = () => {
    if (selectedWorkers.length === filteredWorkers.length) {
      setSelectedWorkers([]);
    } else {
      setSelectedWorkers(filteredWorkers.map(w => w.id));
    }
  };

  const handleProjectChange = (value: string) => {
    if (value === 'all') {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds([value]);
    }
  };

  // إنشاء التقرير بالبيانات الحقيقية
  const generateReport = async () => {
    if (selectedWorkers.length === 0) {
      alert('يرجى تحديد عامل واحد على الأقل');
      return;
    }

    await fetchWorkerAttendanceData(selectedWorkers, selectedProjectIds);
    setReportGenerated(true);
  };

  // استخدام دوال التنسيق الموحدة من ملف الأدوات
  // formatCurrency, formatNumber, formatDate تم استيرادها من excel-export-utils

  // تصدير إلى Excel بالبيانات الحقيقية
  const exportToExcel = async () => {
    if (workersSummary.length === 0) {
      alert('لا توجد بيانات للتصدير');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('كشف تصفية العمال - بيانات حقيقية');
    
    // استخدام الرأس الموحد الاحترافي
    const grandTotalEarned = workersSummary.reduce((sum, s) => sum + s.totalEarned, 0);
    const grandTotalPaid = workersSummary.reduce((sum, s) => sum + s.totalPaid, 0);
    const grandTotalRemaining = workersSummary.reduce((sum, s) => sum + s.totalRemaining, 0);
    
    let currentRow = addReportHeader(
      worksheet,
      'كشف تصفية العمال - بيانات حقيقية من النظام',
      `الفترة: من ${formatDate(dateFrom)} إلى ${formatDate(dateTo)}`,
      [
        `عدد المشاريع المختارة: ${formatNumber(selectedProjectIds.length)}`,
        `عدد العمال: ${formatNumber(workersSummary.length)}`,
        `إجمالي الأجور المستحقة: ${formatCurrency(grandTotalEarned)} | المدفوع: ${formatCurrency(grandTotalPaid)} | المتبقي: ${formatCurrency(grandTotalRemaining)}`
      ]
    );
    
    // رؤوس الأعمدة - 11 عمود كما هو مطلوب
    const headers = [
      'م', 'الاسم', 'المهنة', 'اسم المشروع', 'الأجر اليومي', 
      'أيام العمل الفعلية', 'إجمالي الساعات', 'المبلغ المستحق', 
      'المبلغ المدفوع', 'المتبقي', 'ملاحظات'
    ];
    
    worksheet.addRow([]);
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    headerRow.alignment = { horizontal: 'center' };
    
    // البيانات الحقيقية
    workersSummary.forEach((summary, index) => {
      const row = worksheet.addRow([
        index + 1,
        summary.workerName,
        summary.workerType,
        summary.projectName,
        formatCurrency(summary.dailyWage),
        summary.totalWorkDays,
        summary.totalWorkHours,
        formatCurrency(summary.totalEarned),
        formatCurrency(summary.totalPaid),
        formatCurrency(summary.totalRemaining),
        summary.totalRemaining > 0 ? 'متبقي للدفع' : summary.totalRemaining < 0 ? 'مدفوع زائد' : 'مدفوع كامل'
      ]);
      
      if (index % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      }
    });
    
    // صف الإجماليات
    const totals = workersSummary.reduce((acc, summary) => ({
      totalEarned: acc.totalEarned + summary.totalEarned,
      totalPaid: acc.totalPaid + summary.totalPaid,
      totalRemaining: acc.totalRemaining + summary.totalRemaining,
      totalWorkDays: acc.totalWorkDays + summary.totalWorkDays,
      totalWorkHours: acc.totalWorkHours + summary.totalWorkHours
    }), { totalEarned: 0, totalPaid: 0, totalRemaining: 0, totalWorkDays: 0, totalWorkHours: 0 });

    const totalRow = worksheet.addRow([
      '', '', '', '', '',
      totals.totalWorkDays,
      totals.totalWorkHours,
      formatCurrency(totals.totalEarned),
      formatCurrency(totals.totalPaid),
      formatCurrency(totals.totalRemaining),
      'الإجماليات'
    ]);
    totalRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
    
    // تنسيق العرض
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `كشف_تصفية_العمال_بيانات_حقيقية_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const printReport = () => {
    window.print();
  };

  // دالة تحميل صورة التقرير
  const downloadReportImage = async () => {
    try {
      console.log('📸 بدء تحميل صورة تقرير تصفية العمال...');
      
      const element = document.getElementById('worker-filter-report-content');
      if (!element) {
        alert('❌ لم يتم العثور على محتوى التقرير');
        return;
      }

      // إخفاء الأزرار مؤقتاً
      const buttons = element.querySelectorAll('button, .no-print');
      buttons.forEach(btn => (btn as HTMLElement).style.display = 'none');

      // التقاط الصورة
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // جودة عالية
        useCORS: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        width: element.scrollWidth,
        height: element.scrollHeight
      });

      // إظهار الأزرار مرة أخرى
      buttons.forEach(btn => (btn as HTMLElement).style.display = '');

      // تحويل إلى صورة وتحميلها
      const imgData = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const projectName = selectedProjectIds.length === 1 ? 
        (Array.isArray(projects) ? projects.find(p => p.id === selectedProjectIds[0])?.name : undefined) || 'مشروع' : 'جميع_المشاريع';
      link.download = `تقرير_تصفية_العمال_${projectName}_${formatDate(dateFrom)}_إلى_${formatDate(dateTo)}.png`;
      link.href = imgData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✅ تم تحميل صورة التقرير بنجاح');
      
    } catch (error) {
      console.error('❌ خطأ في تحميل الصورة:', error);
      alert('❌ حدث خطأ أثناء تحميل صورة التقرير. يرجى المحاولة مرة أخرى.');
    }
  };

  const clearFilters = () => {
    setSelectedProjectIds([]);
    setSearchTerm('');
    setSelectedWorkers([]);
    setReportGenerated(false);
    setWorkersSummary([]);
  };

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
        <h1 className="text-2xl font-bold text-blue-600 mb-2">شركة الفتحي للمقاولات والاستشارات الهندسية</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-1">كشف تصفية العمال (بيانات حقيقية)</h2>
        <p className="text-sm text-gray-600">للفترة: من {dateFrom} إلى {dateTo}</p>
      </div>

      {/* قسم الإعدادات */}
      <Card className="bg-gradient-to-r from-green-50 to-teal-50 border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-lg">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            إعداد تقرير تصفية العمال بالبيانات الحقيقية
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* تنبيه هام */}
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">تنبيه هام</h3>
            </div>
            <p className="text-sm text-blue-700 mt-2">
              هذا التقرير يستخدم البيانات الحقيقية من قاعدة البيانات، وليس بيانات وهمية.
              سيتم حساب أيام العمل الفعلية والساعات والمبالغ من سجلات الحضور الموجودة في النظام.
            </p>
          </div>

          {/* اختيار المشاريع */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              اختيار المشاريع
            </h3>
            <Select value={selectedProjectIds[0] || 'all'} onValueChange={handleProjectChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="جميع المشاريع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المشاريع</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* فترة التقرير */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              فترة التقرير
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">من تاريخ</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">إلى تاريخ</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
          </div>

          {/* اختيار العمال */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              اختيار العمال
            </h3>

            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                {selectedWorkers.length === filteredWorkers.length ? 'إلغاء الكل' : 'تحديد الكل'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedWorkers([])}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                مسح التحديد
              </Button>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="بحث بالاسم أو الوظيفة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
            </div>

            {/* قائمة العمال */}
            <div className="bg-white border rounded-lg p-4 max-h-80 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {filteredWorkers.map((worker) => (
                  <div key={worker.id} className="flex items-center space-x-3 rtl:space-x-reverse p-2 hover:bg-gray-50 rounded">
                    <Checkbox
                      checked={selectedWorkers.includes(worker.id)}
                      onCheckedChange={(checked) => handleWorkerSelection(worker.id, checked as boolean)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{worker.name}</div>
                      <div className="text-xs text-gray-500">{worker.type}</div>
                    </div>
                    <div className="text-xs text-green-600 font-medium">
                      {formatCurrency(worker.dailyWage)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedWorkers.length > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg mt-4">
                <h4 className="text-sm font-medium text-gray-800 mb-2">محدد حاليا:</h4>
                <p className="text-xs text-gray-600">
                  {selectedWorkers.length} عامل تم تحديدهم لإنشاء التقرير بالبيانات الحقيقية
                </p>
              </div>
            )}
          </div>

          {/* أزرار العمل */}
          <div className="flex gap-3">
            <Button
              onClick={generateReport}
              disabled={selectedWorkers.length === 0 || isLoading}
              className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  جاري جلب البيانات الحقيقية...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  إنشاء التقرير بالبيانات الحقيقية
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={clearFilters}
              className="border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              مسح
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* التقرير النهائي بالبيانات الحقيقية */}
      {reportGenerated && workersSummary.length > 0 && (
        <Card className="bg-white shadow-lg border">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <CardTitle className="text-lg">كشف تصفية العمال - بيانات حقيقية</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={exportToExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <Button variant="secondary" size="sm" onClick={downloadReportImage} className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Camera className="h-4 w-4 mr-1" />
                  صورة
                </Button>
                <Button variant="secondary" size="sm" onClick={printReport}>
                  <Printer className="h-4 w-4 mr-1" />
                  طباعة
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setReportGenerated(false)} className="text-white hover:bg-white/20">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0" id="worker-filter-report-content">
            {/* صف الإحصائيات - بتصميم Excel */}
            <div className="bg-gray-100 px-6 py-4 border-b print:bg-white">
              <div className="grid grid-cols-6 gap-4 text-sm print:text-xs">
                <div className="text-center">
                  <span className="text-gray-600">عدد العمال:</span>
                  <span className="font-bold mr-2">{workersSummary.length}</span>
                </div>
                <div className="text-center">
                  <span className="text-gray-600">أيام العمل:</span>
                  <span className="font-bold mr-2">{workersSummary.reduce((sum, s) => sum + s.totalWorkDays, 0)}</span>
                </div>
                <div className="text-center">
                  <span className="text-gray-600">إجمالي الساعات:</span>
                  <span className="font-bold mr-2">{workersSummary.reduce((sum, s) => sum + s.totalWorkHours, 0)}</span>
                </div>
                <div className="text-center">
                  <span className="text-gray-600">المستحق:</span>
                  <span className="font-bold mr-2 text-green-600">{formatCurrency(workersSummary.reduce((sum, s) => sum + s.totalEarned, 0))}</span>
                </div>
                <div className="text-center">
                  <span className="text-gray-600">المدفوع:</span>
                  <span className="font-bold mr-2 text-blue-600">{formatCurrency(workersSummary.reduce((sum, s) => sum + s.totalPaid, 0))}</span>
                </div>
                <div className="text-center">
                  <span className="text-gray-600">المتبقي:</span>
                  <span className="font-bold mr-2 text-red-600">{formatCurrency(workersSummary.reduce((sum, s) => sum + s.totalRemaining, 0))}</span>
                </div>
              </div>
            </div>

            {/* الجدول الرئيسي - مطابق لتصميم Excel */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 print:text-xs">
                <thead>
                  <tr className="bg-blue-600 text-white print:bg-blue-600">
                    <th className="border border-white px-2 py-2 text-center text-xs font-bold">م</th>
                    <th className="border border-white px-2 py-2 text-center text-xs font-bold">الاسم</th>
                    <th className="border border-white px-2 py-2 text-center text-xs font-bold">المهنة</th>
                    <th className="border border-white px-2 py-2 text-center text-xs font-bold">اسم المشروع</th>
                    <th className="border border-white px-2 py-2 text-center text-xs font-bold">الأجر اليومي</th>
                    <th className="border border-white px-2 py-2 text-center text-xs font-bold">أيام العمل الفعلية</th>
                    <th className="border border-white px-2 py-2 text-center text-xs font-bold">إجمالي الساعات</th>
                    <th className="border border-white px-2 py-2 text-center text-xs font-bold">المبلغ المستحق</th>
                    <th className="border border-white px-2 py-2 text-center text-xs font-bold">المبلغ المدفوع</th>
                    <th className="border border-white px-2 py-2 text-center text-xs font-bold">المتبقي</th>
                    <th className="border border-white px-2 py-2 text-center text-xs font-bold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {workersSummary.map((summary, index) => (
                    <tr key={summary.workerId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 print:bg-gray-100'}>
                      <td className="border border-gray-300 px-2 py-1 text-center text-xs">{index + 1}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center text-xs font-medium">{summary.workerName}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center text-xs">{summary.workerType}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center text-xs text-blue-600">{summary.projectName}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center text-xs font-medium">{formatCurrency(summary.dailyWage)}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center text-xs font-bold text-green-600">{summary.totalWorkDays || 0}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center text-xs font-bold text-blue-600">{summary.totalWorkHours}</td>
                      <td className="border border-gray-300 px-2 py-1 text-center text-xs font-medium text-blue-600 print:text-black">
                        {formatCurrency(summary.totalEarned)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center text-xs font-medium text-green-600 print:text-black">
                        {formatCurrency(summary.totalPaid)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center text-xs font-medium text-red-600 print:text-black">
                        {formatCurrency(summary.totalRemaining)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-center text-xs">
                        {summary.totalRemaining > 0 ? 'متبقي' : summary.totalRemaining < 0 ? 'زائد' : 'مكتمل'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-green-600 text-white font-bold print:bg-green-600">
                    <td colSpan={5} className="border border-white px-2 py-2 text-center text-xs">الإجماليات</td>
                    <td className="border border-white px-2 py-2 text-center text-xs">
                      {workersSummary.reduce((sum, s) => sum + s.totalWorkDays, 0)}
                    </td>
                    <td className="border border-white px-2 py-2 text-center text-xs">
                      {workersSummary.reduce((sum, s) => sum + s.totalWorkHours, 0)}
                    </td>
                    <td className="border border-white px-2 py-2 text-center text-xs">
                      {formatCurrency(workersSummary.reduce((sum, s) => sum + s.totalEarned, 0))}
                    </td>
                    <td className="border border-white px-2 py-2 text-center text-xs">
                      {formatCurrency(workersSummary.reduce((sum, s) => sum + s.totalPaid, 0))}
                    </td>
                    <td className="border border-white px-2 py-2 text-center text-xs">
                      {formatCurrency(workersSummary.reduce((sum, s) => sum + s.totalRemaining, 0))}
                    </td>
                    <td className="border border-white px-2 py-2 text-center text-xs">كاملة</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* رسالة عدم وجود بيانات */}
      {reportGenerated && workersSummary.length === 0 && !isLoading && (
        <Card className="bg-white shadow-lg border">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد بيانات حضور</h3>
            <p className="text-gray-600">
              لم يتم العثور على بيانات حضور للعمال المحددين في الفترة المطلوبة.
              يرجى التأكد من وجود سجلات حضور في النظام للعمال والفترة المحددة.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}