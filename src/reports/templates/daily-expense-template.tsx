/**
 * الوصف: قالب تقرير المصروفات اليومية
 * المدخلات: بيانات المصروفات اليومية للمشروع
 * المخرجات: عرض تقرير منسق مع دعم الطباعة والتصدير
 * المالك: عمار
 * آخر تعديل: 2025-08-15
 * الحالة: نشط
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UnifiedReportTemplate, SummaryCard, UnifiedTable } from "@/components/unified-report-template";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DollarSign, TrendingUp, TrendingDown, Activity } from "lucide-react";

interface DailyExpenseData {
  date: string;
  projectName: string;
  projectId: string;
  totalIncome: number;
  totalExpenses: number;
  remainingBalance: number;
  carriedForward: number;
  fundTransfers: any[];
  workerAttendance: any[];
  materialPurchases: any[];
  transportationExpenses: any[];
  workerTransfers: any[];
  miscExpenses: any[];
}

interface DailyExpenseTemplateProps {
  data: DailyExpenseData;
  onPrint?: () => void;
  onExport?: () => void;
}

export function DailyExpenseTemplate({ 
  data, 
  onPrint, 
  onExport 
}: DailyExpenseTemplateProps) {
  // إعداد معلومات الرأس
  const headerInfo = [
    { label: "التاريخ", value: formatDate(data.date) },
    { label: "اسم المشروع", value: data.projectName },
    { label: "إجمالي الدخل", value: formatCurrency(data.totalIncome) },
    { label: "إجمالي المصاريف", value: formatCurrency(data.totalExpenses) },
    { label: "الرصيد المرحل", value: formatCurrency(data.carriedForward) },
    { label: "الرصيد المتبقي", value: formatCurrency(data.remainingBalance) }
  ];

  // تحضير بيانات الجداول
  const expenseCategories = [
    {
      title: "تحويلات الأموال",
      data: data.fundTransfers,
      headers: ["التوقيت", "المبلغ", "الوصف", "النوع"],
      mapRow: (item: any) => [
        formatDate(item.date),
        formatCurrency(item.amount),
        item.description || "تحويل عهدة",
        "دخل"
      ]
    },
    {
      title: "أجور العمال",
      data: data.workerAttendance || [],
      headers: ["العامل", "التاريخ", "الحالة", "الأجر المستحق", "المدفوع", "المتبقي"],
      mapRow: (item: any) => [
        item.worker?.name || "غير محدد",
        formatDate(item.date),
        item.status === 'present' ? '✓ حاضر' : '✗ غائب',
        formatCurrency(item.wage || item.worker?.dailyWage || 0),
        formatCurrency(item.paidAmount || 0),
        formatCurrency((item.wage || item.worker?.dailyWage || 0) - (item.paidAmount || 0))
      ]
    },
    {
      title: "مشتريات المواد",
      data: data.materialPurchases || [],
      headers: ["المادة", "الكمية", "السعر", "المجموع", "نوع الدفع"],
      mapRow: (item: any) => [
        item.material?.name || "غير محدد",
        `${item.quantity} ${item.unit || ''}`,
        formatCurrency(item.unitPrice || 0),
        formatCurrency(item.totalAmount || 0),
        item.purchaseType || "نقد"
      ]
    },
    {
      title: "مصاريف النقل",
      data: data.transportationExpenses || [],
      headers: ["الوصف", "المبلغ", "التاريخ", "الملاحظات"],
      mapRow: (item: any) => [
        item.description || "مصروف نقل",
        formatCurrency(item.amount),
        formatDate(item.date),
        item.notes || ""
      ]
    },
    {
      title: "حوالات العمال",
      data: data.workerTransfers || [],
      headers: ["العامل", "المستفيد", "المبلغ", "النوع", "التاريخ"],
      mapRow: (item: any) => [
        item.worker?.name || "غير محدد",
        item.recipientName || "",
        formatCurrency(item.amount),
        item.transferMethod === 'hawaleh' ? 'حوالة' : item.transferMethod === 'bank' ? 'بنكي' : 'نقد',
        formatDate(item.date)
      ]
    },
    {
      title: "مصروفات متنوعة",
      data: data.miscExpenses || [],
      headers: ["الوصف", "المبلغ", "التاريخ", "ملاحظات"],
      mapRow: (item: any) => [
        item.description || "مصروف متنوع",
        formatCurrency(item.amount),
        formatDate(item.date),
        item.notes || ""
      ]
    }
  ];

  return (
    <UnifiedReportTemplate
      title="كشف المصروفات اليومية"
      subtitle={`مشروع: ${data.projectName}`}
      reportDate={data.date}
      headerInfo={headerInfo}
    >
      {/* ملخص سريع */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="إجمالي الدخل"
          value={data.totalIncome || 0}
          valueColor="text-green-600"
          icon={<TrendingUp className="h-5 w-5 text-green-500" />}
        />
        <SummaryCard
          title="إجمالي المصاريف"
          value={data.totalExpenses || 0}
          valueColor="text-red-600"
          icon={<TrendingDown className="h-5 w-5 text-red-500" />}
        />
        <SummaryCard
          title="الرصيد المرحل"
          value={data.carriedForward || 0}
          valueColor="text-blue-600"
          icon={<Activity className="h-5 w-5 text-blue-500" />}
        />
        <SummaryCard
          title="الرصيد النهائي"
          value={data.remainingBalance || 0}
          valueColor={(data.remainingBalance || 0) >= 0 ? "text-green-600" : "text-red-600"}
          icon={<DollarSign className="h-5 w-5 text-gray-500" />}
        />
      </div>

      {/* تفاصيل المصروفات */}
      <div className="space-y-6">
        {Array.isArray(expenseCategories) && expenseCategories.map((category) => {
          if (!category.data || category.data.length === 0) return null;

          return (
            <Card key={category.title} className="print:shadow-none print:border print:border-gray-300">
              <CardHeader>
                <CardTitle className="text-lg print:text-base">
                  {category.title}
                  <Badge variant="secondary" className="mr-2 print:mr-1">
                    {category.data.length} عنصر
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UnifiedTable
                  headers={category.headers}
                  data={Array.isArray(category.data) ? category.data.map(category.mapRow) : []}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ملاحظات إضافية */}
      {(data.remainingBalance < 0) && (
        <Card className="border-red-200 bg-red-50 print:bg-white print:border-red-400">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="bg-red-100 rounded-full p-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-900 print:text-black">تحذير: الرصيد سالب</h3>
                <p className="text-sm text-red-700 print:text-gray-700 mt-1">
                  الرصيد الحالي سالب بقيمة {formatCurrency(Math.abs(data.remainingBalance))}. 
                  يُنصح بمراجعة المصروفات وضرورة تحويل أموال إضافية للمشروع.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </UnifiedReportTemplate>
  );
}