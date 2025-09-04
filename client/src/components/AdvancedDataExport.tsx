/**
 * نظام تصدير البيانات المتقدم
 * يتيح اختيار عدة مشاريع وفترات زمنية مختلفة
 * مع دعم تصدير Excel و PDF والطباعة
 * المالك: عمار
 * التاريخ: 2025-08-17
 */

import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Calendar, 
  Download, 
  CheckCircle2,
  Target,
  Building2,
  Clock,
  Settings,
  Activity
} from 'lucide-react';
// تحسين الأداء: Dynamic import لـ ExcelJS
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Project, Worker } from '@shared/schema';
import { formatCurrency, formatDate, getCurrentDate } from '@/lib/utils';

interface ExportSettings {
  selectedProjects: string[];
  dateFrom: string;
  dateTo: string;
  includeWorkerDetails: boolean;
  includeFinancialSummary: boolean;
  includeAttendance: boolean;
  includeMaterialPurchases: boolean;
  includeTransfers: boolean;
}

interface ExportData {
  projects: any[];
  workers: Worker[];
  dateRange: { from: string; to: string };
  totalStats: {
    totalIncome: number;
    totalExpenses: number;
    totalWorkers: number;
    activeDays: number;
  };
}

export default function AdvancedDataExport() {
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    selectedProjects: [],
    dateFrom: '',
    dateTo: getCurrentDate(),
    includeWorkerDetails: true,
    includeFinancialSummary: true,
    includeAttendance: true,
    includeMaterialPurchases: true,
    includeTransfers: true
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportData, setExportData] = useState<ExportData | null>(null);

  // جلب المشاريع
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // جلب العمال
  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
  });

  // تحديث اختيار المشاريع
  const toggleProject = (projectId: string) => {
    setExportSettings(prev => ({
      ...prev,
      selectedProjects: Array.isArray(prev.selectedProjects) && prev.selectedProjects.includes(projectId)
        ? prev.selectedProjects.filter(id => id !== projectId)
        : [...(Array.isArray(prev.selectedProjects) ? prev.selectedProjects : []), projectId]
    }));
  };

  // اختيار جميع المشاريع
  const selectAllProjects = () => {
    setExportSettings(prev => ({
      ...prev,
      selectedProjects: Array.isArray(projects) ? projects.map(p => p.id) : []
    }));
  };

  // إلغاء اختيار جميع المشاريع
  const clearAllProjects = () => {
    setExportSettings(prev => ({
      ...prev,
      selectedProjects: []
    }));
  };

  // جلب البيانات للتصدير
  const fetchExportData = async (): Promise<ExportData> => {
    const projectsData = Array.isArray(exportSettings.selectedProjects) 
      ? await Promise.all(
          exportSettings.selectedProjects.map(async (projectId) => {
            const response = await fetch(
              `/api/reports/daily-expenses/${projectId}/${exportSettings.dateFrom}?dateTo=${exportSettings.dateTo}`
            );
            if (!response.ok) throw new Error(`خطأ في جلب بيانات المشروع ${projectId}`);
            return response.json();
          })
        )
      : [];

    const totalStats = {
      totalIncome: Array.isArray(projectsData) ? projectsData.reduce((sum, project) => sum + (project.totalIncome || 0), 0) : 0,
      totalExpenses: Array.isArray(projectsData) ? projectsData.reduce((sum, project) => sum + (project.totalExpenses || 0), 0) : 0,
      totalWorkers: Array.isArray(workers) ? workers.length : 0,
      activeDays: Array.isArray(projectsData) ? projectsData.length : 0
    };

    return {
      projects: projectsData,
      workers,
      dateRange: { from: exportSettings.dateFrom, to: exportSettings.dateTo },
      totalStats
    };
  };

  // معاينة البيانات
  const previewData = async () => {
    if (exportSettings.selectedProjects.length === 0) {
      toast({
        title: "يرجى اختيار مشروع واحد على الأقل",
        variant: "destructive"
      });
      return;
    }

    if (!exportSettings.dateFrom || !exportSettings.dateTo) {
      toast({
        title: "يرجى تحديد الفترة الزمنية",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsExporting(true);
      const data = await fetchExportData();
      setExportData(data);
      
      toast({
        title: "تم تحميل البيانات بنجاح",
        description: `${data.projects.length} مشروع للفترة من ${formatDate(data.dateRange.from)} إلى ${formatDate(data.dateRange.to)}`
      });
    } catch (error) {
      toast({
        title: "خطأ في تحميل البيانات",
        description: "تأكد من صحة التواريخ والمشاريع المحددة",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // تصدير Excel
  const exportToExcel = async () => {
    if (!exportData) {
      await previewData();
      return;
    }

    try {
      setIsExporting(true);
      
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      
      // ورقة الملخص العام
      const summarySheet = workbook.addWorksheet('الملخص العام');
      summarySheet.columns = [
        { header: 'البيان', key: 'item', width: 25 },
        { header: 'القيمة', key: 'value', width: 20 }
      ];

      summarySheet.addRows([
        { item: 'عدد المشاريع', value: exportData.projects.length },
        { item: 'إجمالي الدخل', value: formatCurrency(exportData.totalStats.totalIncome) },
        { item: 'إجمالي المصاريف', value: formatCurrency(exportData.totalStats.totalExpenses) },
        { item: 'الرصيد الإجمالي', value: formatCurrency(exportData.totalStats.totalIncome - exportData.totalStats.totalExpenses) },
        { item: 'عدد العمال', value: exportData.totalStats.totalWorkers },
        { item: 'الفترة من', value: formatDate(exportData.dateRange.from) },
        { item: 'الفترة إلى', value: formatDate(exportData.dateRange.to) }
      ]);

      // ورقة تفاصيل المشاريع
      exportData.projects.forEach((project, index) => {
        const projectSheet = workbook.addWorksheet(`مشروع ${index + 1}`);
        
        // معلومات المشروع
        projectSheet.addRow(['اسم المشروع', project.projectName || 'غير محدد']);
        projectSheet.addRow(['التاريخ', formatDate(project.date)]);
        projectSheet.addRow(['إجمالي الدخل', formatCurrency(project.totalIncome || 0)]);
        projectSheet.addRow(['إجمالي المصاريف', formatCurrency(project.totalExpenses || 0)]);
        projectSheet.addRow(['الرصيد المتبقي', formatCurrency(project.remainingBalance || 0)]);
        projectSheet.addRow([]);

        // تفاصيل المصاريف
        if (exportSettings.includeWorkerDetails && project.workerAttendance?.length > 0) {
          projectSheet.addRow(['أجور العمال']);
          projectSheet.addRow(['العامل', 'الحالة', 'الأجر المستحق', 'المدفوع']);
          project.workerAttendance.forEach((attendance: any) => {
            projectSheet.addRow([
              attendance.worker?.name || 'غير محدد',
              attendance.status === 'present' ? 'حاضر' : 'غائب',
              formatCurrency(attendance.wage || 0),
              formatCurrency(attendance.paidAmount || 0)
            ]);
          });
          projectSheet.addRow([]);
        }

        if (exportSettings.includeMaterialPurchases && project.materialPurchases?.length > 0) {
          projectSheet.addRow(['مشتريات المواد']);
          projectSheet.addRow(['المادة', 'الكمية', 'السعر', 'المجموع']);
          project.materialPurchases.forEach((purchase: any) => {
            projectSheet.addRow([
              purchase.material?.name || 'غير محدد',
              `${purchase.quantity} ${purchase.unit || ''}`,
              formatCurrency(purchase.unitPrice || 0),
              formatCurrency(purchase.totalAmount || 0)
            ]);
          });
          projectSheet.addRow([]);
        }

        if (exportSettings.includeTransfers && project.workerTransfers?.length > 0) {
          projectSheet.addRow(['حوالات العمال']);
          projectSheet.addRow(['العامل', 'المستفيد', 'المبلغ', 'النوع']);
          project.workerTransfers.forEach((transfer: any) => {
            projectSheet.addRow([
              transfer.worker?.name || 'غير محدد',
              transfer.recipientName || '',
              formatCurrency(transfer.amount || 0),
              transfer.transferMethod === 'hawaleh' ? 'حوالة' : 'نقد'
            ]);
          });
        }
      });

      // ورقة العمال (إذا كانت مطلوبة)
      if (exportSettings.includeWorkerDetails && exportData.workers.length > 0) {
        const workersSheet = workbook.addWorksheet('قائمة العمال');
        workersSheet.columns = [
          { header: 'الاسم', key: 'name', width: 20 },
          { header: 'النوع', key: 'type', width: 15 },
          { header: 'الأجر اليومي', key: 'wage', width: 15 },
          { header: 'الحالة', key: 'status', width: 10 }
        ];

        exportData.workers.forEach(worker => {
          workersSheet.addRow({
            name: worker.name,
            type: worker.type,
            wage: formatCurrency(worker.dailyWage || 0),
            status: worker.isActive ? 'نشط' : 'غير نشط'
          });
        });
      }

      // حفظ الملف
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const filename = `تصدير-البيانات-${exportData.dateRange.from}-${exportData.dateRange.to}.xlsx`;
      saveAs(blob, filename);
      
      toast({
        title: "تم تصدير Excel بنجاح",
        description: `تم حفظ الملف: ${filename}`
      });
      
    } catch (error) {
      toast({
        title: "خطأ في تصدير Excel",
        description: "حدث خطأ أثناء إنشاء ملف Excel",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // تصدير PDF
  const exportToPDF = async () => {
    if (!exportData || !reportRef.current) {
      toast({
        title: "لا توجد بيانات للتصدير",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsExporting(true);
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 30;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      const filename = `تقرير-البيانات-${exportData.dateRange.from}-${exportData.dateRange.to}.pdf`;
      pdf.save(filename);
      
      toast({
        title: "تم تصدير PDF بنجاح",
        description: `تم حفظ الملف: ${filename}`
      });
      
    } catch (error) {
      toast({
        title: "خطأ في تصدير PDF",
        description: "حدث خطأ أثناء إنشاء ملف PDF",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // الطباعة
  const handlePrint = () => {
    if (!exportData) {
      toast({
        title: "لا توجد بيانات للطباعة",
        variant: "destructive"
      });
      return;
    }

    window.print();
    
    toast({
      title: "جاري الطباعة",
      description: "تم إعداد التقرير للطباعة"
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* إعدادات التصدير */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            إعدادات التصدير المتقدم
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* اختيار المشاريع */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">اختيار المشاريع</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllProjects}>
                  اختيار الكل
                </Button>
                <Button variant="outline" size="sm" onClick={clearAllProjects}>
                  إلغاء الكل
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.isArray(projects) && projects.map(project => (
                <div key={project.id} className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id={project.id}
                    checked={exportSettings.selectedProjects.includes(project.id)}
                    onCheckedChange={() => toggleProject(project.id)}
                  />
                  <Label htmlFor={project.id} className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">{project.name}</span>
                    <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {project.status === 'active' ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </Label>
                </div>
              ))}
            </div>
            
            {exportSettings.selectedProjects.length > 0 && (
              <div className="text-sm text-green-600">
                ✓ تم اختيار {exportSettings.selectedProjects.length} مشروع
              </div>
            )}
          </div>

          <Separator />

          {/* تحديد الفترة الزمنية */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              الفترة الزمنية
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">من تاريخ</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={exportSettings.dateFrom}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, dateFrom: e.target.value }))}
                  max={exportSettings.dateTo || getCurrentDate()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">إلى تاريخ</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={exportSettings.dateTo}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, dateTo: e.target.value }))}
                  min={exportSettings.dateFrom}
                  max={getCurrentDate()}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* خيارات المحتوى */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              محتويات التقرير
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'includeWorkerDetails', label: 'تفاصيل العمال', icon: '👷' },
                { key: 'includeFinancialSummary', label: 'الملخص المالي', icon: '💰' },
                { key: 'includeAttendance', label: 'سجلات الحضور', icon: '📅' },
                { key: 'includeMaterialPurchases', label: 'مشتريات المواد', icon: '🏗️' },
                { key: 'includeTransfers', label: 'التحويلات المالية', icon: '💸' }
              ].map(option => (
                <div key={option.key} className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id={option.key}
                    checked={exportSettings[option.key as keyof ExportSettings] as boolean}
                    onCheckedChange={(checked) => 
                      setExportSettings(prev => ({ ...prev, [option.key]: checked }))
                    }
                  />
                  <Label htmlFor={option.key} className="flex items-center gap-2 cursor-pointer">
                    <span>{option.icon}</span>
                    <span className="text-sm">{option.label}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* أزرار العمل */}
          <div className="flex flex-wrap gap-3 pt-4">
            <Button
              onClick={previewData}
              disabled={isExporting || exportSettings.selectedProjects.length === 0}
              className="flex items-center gap-2"
            >
              {isExporting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Activity className="h-4 w-4" />
              )}
              معاينة البيانات
            </Button>

            {exportData && (
              <>
                <Button
                  onClick={exportToExcel}
                  disabled={isExporting}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  تصدير Excel
                </Button>

                <Button
                  onClick={exportToPDF}
                  disabled={isExporting}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                >
                  <FileText className="h-4 w-4" />
                  تصدير PDF
                </Button>

                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  طباعة
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* معاينة البيانات */}
      {exportData && (
        <div ref={reportRef} className="print:block">
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white print:bg-white print:text-black">
              <CardTitle className="text-center">
                تقرير البيانات الشامل - من {formatDate(exportData.dateRange.from)} إلى {formatDate(exportData.dateRange.to)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* الملخص العام */}
              <div className="bg-gray-50 p-4 rounded-lg print:bg-white">
                <h3 className="text-lg font-bold mb-4 text-center">الملخص العام</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{exportData.projects.length}</div>
                    <div className="text-sm text-gray-600">عدد المشاريع</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(exportData.totalStats.totalIncome)}
                    </div>
                    <div className="text-sm text-gray-600">إجمالي الدخل</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(exportData.totalStats.totalExpenses)}
                    </div>
                    <div className="text-sm text-gray-600">إجمالي المصاريف</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${
                      exportData.totalStats.totalIncome - exportData.totalStats.totalExpenses >= 0 
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(exportData.totalStats.totalIncome - exportData.totalStats.totalExpenses)}
                    </div>
                    <div className="text-sm text-gray-600">الرصيد الإجمالي</div>
                  </div>
                </div>
              </div>

              {/* تفاصيل المشاريع */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold">تفاصيل المشاريع</h3>
                {Array.isArray(exportData.projects) && exportData.projects.map((project, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-lg">{project.projectName || `مشروع ${index + 1}`}</h4>
                      <Badge variant="outline">{formatDate(project.date)}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">
                          {formatCurrency(project.totalIncome || 0)}
                        </div>
                        <div className="text-sm text-gray-600">الدخل</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-red-600">
                          {formatCurrency(project.totalExpenses || 0)}
                        </div>
                        <div className="text-sm text-gray-600">المصاريف</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-xl font-bold ${
                          (project.remainingBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(project.remainingBalance || 0)}
                        </div>
                        <div className="text-sm text-gray-600">الرصيد</div>
                      </div>
                    </div>

                    {/* تفاصيل إضافية حسب الإعدادات */}
                    {exportSettings.includeWorkerDetails && project.workerAttendance?.length > 0 && (
                      <div className="mt-4">
                        <h5 className="font-semibold mb-2">أجور العمال ({project.workerAttendance.length})</h5>
                        <div className="text-sm text-gray-600">
                          إجمالي المدفوع: {formatCurrency(
                            Array.isArray(project.workerAttendance) ? project.workerAttendance.reduce((sum: number, att: any) => 
                              sum + (att.paidAmount || 0), 0
                            ) : 0
                          )}
                        </div>
                      </div>
                    )}

                    {exportSettings.includeMaterialPurchases && project.materialPurchases?.length > 0 && (
                      <div className="mt-4">
                        <h5 className="font-semibold mb-2">مشتريات المواد ({project.materialPurchases.length})</h5>
                        <div className="text-sm text-gray-600">
                          إجمالي المشتريات: {formatCurrency(
                            Array.isArray(project.materialPurchases) ? project.materialPurchases.reduce((sum: number, purchase: any) => 
                              sum + (purchase.totalAmount || 0), 0
                            ) : 0
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CSS للطباعة */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}