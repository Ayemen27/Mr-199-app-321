/**
 * الوصف: صفحة تقرير المصروفات اليومية مع النظام الموحد
 * المدخلات: معرف المشروع والتاريخ
 * المخرجات: صفحة تفاعلية لعرض وتصدير وطباعة المصروفات اليومية
 * المالك: عمار
 * آخر تعديل: 2025-08-15
 * الحالة: نشط
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSelectedProject } from '@/hooks/use-selected-project';
import { DailyExpenseTemplate, quickExport, printReport } from '@/reports';
import { getCurrentDate, formatCurrency } from '@/lib/utils';
import { Printer, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import ProjectSelector from '@/components/project-selector';
import type { Project } from '@shared/schema';

export default function DailyExpensesPage() {
  const { selectedProjectId } = useSelectedProject();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());
  const [isExporting, setIsExporting] = useState(false);

  // جلب بيانات المشروع المحدد
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // جلب بيانات التقرير
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: [`/api/reports/daily-expenses/${selectedProjectId}/${selectedDate}`],
    enabled: !!selectedProjectId && !!selectedDate,
  });

  const handleExportExcel = async () => {
    if (!reportData) {
      toast({
        title: "لا توجد بيانات للتصدير",
        description: "يرجى تحديد المشروع والتاريخ أولاً",
        variant: "destructive"
      });
      return;
    }
    
    setIsExporting(true);
    try {
      const projectName = (reportData as any)?.projectName || selectedProject?.name || 'مشروع';
      await quickExport.dailyExpenses(
        reportData as any,
        `مصروفات-يومية-${projectName}-${selectedDate}`
      );
      
      toast({
        title: "تم التصدير بنجاح",
        description: "تم تصدير تقرير المصروفات اليومية إلى Excel"
      });
    } catch (error) {
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير التقرير",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    if (!reportData) {
      toast({
        title: "لا توجد بيانات للطباعة",
        description: "يرجى تحديد المشروع والتاريخ أولاً",
        variant: "destructive"
      });
      return;
    }

    // تحقق من وجود العنصر والمحتوى
    const element = document.getElementById('daily-expense-report');
    if (!element || !element.innerHTML.trim()) {
      toast({
        title: "خطأ في الطباعة",
        description: "لا يمكن العثور على محتوى التقرير للطباعة",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await printReport.direct('daily-expense-report', 'تقرير المصروفات اليومية');
      toast({
        title: "تم إرسال للطباعة",
        description: "تم إعداد التقرير للطباعة"
      });
    } catch (error) {
      toast({
        title: "خطأ في الطباعة",
        description: "حدث خطأ أثناء إعداد الطباعة",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>جاري تحميل التقرير...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>خطأ في تحميل التقرير</p>
              <p className="text-sm mt-2">يرجى التأكد من تحديد المشروع والتاريخ</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* شريط التحكم العلوي */}
      <div className="bg-white shadow-sm border-b print:hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => window.history.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                العودة
              </Button>
              <h1 className="text-xl font-bold text-gray-900">
                المصروفات اليومية
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="report-date" className="text-sm font-medium">
                  التاريخ:
                </Label>
                <Input
                  id="report-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </div>

              <ProjectSelector 
                selectedProjectId={selectedProject?.id || ""}
                onProjectChange={(projectId, projectName) => {
                  // يمكن إضافة منطق إضافي هنا إذا لزم الأمر
                  console.log('مشروع محدد:', projectName);
                }}
              />

              <Button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {isExporting ? 'جاري التصدير...' : 'تصدير Excel'}
              </Button>

              <Button
                onClick={handlePrint}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                طباعة
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* محتوى التقرير */}
      <div className="container mx-auto p-4" id="daily-expense-report">
        {reportData ? (
          <DailyExpenseTemplate
            data={reportData as any}
            onPrint={handlePrint}
            onExport={handleExportExcel}
          />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500">
                <p className="text-lg mb-2">يرجى تحديد المشروع والتاريخ لعرض التقرير</p>
                <p className="text-sm">سيتم تحميل تقرير المصروفات اليومية تلقائياً</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}