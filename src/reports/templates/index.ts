/**
 * الوصف: نقطة تصدير موحدة لجميع قوالب التقارير
 * المدخلات: استدعاءات قوالب التقارير المختلفة
 * المخرجات: قوالب تقارير منظمة وجاهزة للاستخدام
 * المالك: عمار
 * آخر تعديل: 2025-08-15
 * الحالة: نشط
 */

// تصدير قوالب التقارير الأساسية
export { DailyExpenseTemplate } from './daily-expense-template';
export { WorkerStatementTemplate } from './worker-statement-template';

// أنواع البيانات المشتركة
export interface ReportTemplateProps {
  onPrint?: () => void;
  onExport?: () => void;
  className?: string;
}

export interface BaseReportData {
  date: string;
  projectName?: string;
  projectId?: string;
}

// دوال مساعدة للقوالب
export const templateUtils = {
  /**
   * تحضير معلومات رأس التقرير الأساسية
   */
  prepareBasicHeader: (data: BaseReportData) => [
    { label: "التاريخ", value: data.date },
    { label: "اسم المشروع", value: data.projectName || "غير محدد" }
  ],

  /**
   * تنظيف البيانات الفارغة من المصفوفات
   */
  cleanEmptyData: <T>(array: T[] | undefined): T[] => {
    return array?.filter(item => item && typeof item === 'object') || [];
  },

  /**
   * تحقق من وجود بيانات في أي من المصفوفات
   */
  hasAnyData: (...arrays: any[][]): boolean => {
    return arrays.some(arr => arr && arr.length > 0);
  }
};