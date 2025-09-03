/**
 * الوصف: نقطة تصدير موحدة لجميع مكونات التقارير
 * المدخلات: استدعاءات مكونات التقارير المختلفة
 * المخرجات: مكونات وأدوات تقارير موحدة
 * المالك: عمار
 * آخر تعديل: 2025-08-15
 * الحالة: نشط
 */

// قوالب التقارير
export { UnifiedReportTemplate, SummaryCard, UnifiedTable } from '../components/unified-report-template';
export { EnhancedWorkerAccountStatement } from '../components/EnhancedWorkerAccountStatementFixed';

// مكونات التصدير
export { UnifiedExcelExporter, exportToExcel } from './export/unified-excel-exporter';

// مكونات الطباعة
export { UnifiedPrintManager, printReport } from './print/unified-print-manager';

// أدوات مساعدة
export * from '../components/excel-export-utils';

// قوالب التقارير
export * from './templates';

// أنواع البيانات
export interface ReportData {
  title: string;
  date: string;
  projectName?: string;
  data: any;
}

export interface ExportOptions {
  filename?: string;
  includeDate?: boolean;
  format?: 'excel' | 'pdf' | 'print';
}

// دوال مساعدة سريعة
export const quickExport = {
  /**
   * تصدير سريع لتقرير المصروفات اليومية
   */
  dailyExpenses: async (data: any, filename?: string) => {
    const { exportToExcel } = await import('./export/unified-excel-exporter');
    return exportToExcel.dailyExpenses(data, filename);
  },

  /**
   * تصدير سريع لكشف حساب العامل
   */
  workerStatement: async (data: any, filename?: string) => {
    const { exportToExcel } = await import('./export/unified-excel-exporter');
    return exportToExcel.workerStatement(data, filename);
  },

  /**
   * طباعة سريعة
   */
  print: async (elementId: string, title?: string) => {
    const { printReport } = await import('./print/unified-print-manager');
    return printReport.direct(elementId, title);
  },

  /**
   * تحويل سريع لـ PDF
   */
  toPDF: async (elementId: string, filename?: string, title?: string) => {
    const { printReport } = await import('./print/unified-print-manager');
    return printReport.toPDF(elementId, filename, title);
  }
};

// أدوات التحقق والتنظيف
export const reportUtils = {
  /**
   * تنظيف بيانات التقرير
   */
  cleanReportData: (data: any): any => {
    if (!data || typeof data !== 'object') return {};
    
    // إزالة الحقول الفارغة أو null
    const cleaned = Object.keys(data).reduce((acc, key) => {
      const value = data[key];
      if (value !== null && value !== undefined && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
    
    return cleaned;
  },

  /**
   * التحقق من صحة بيانات التقرير
   */
  validateReportData: (data: any, requiredFields: string[]): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    return requiredFields.every(field => {
      return data.hasOwnProperty(field) && 
             data[field] !== null && 
             data[field] !== undefined;
    });
  },

  /**
   * تنسيق العملة
   */
  formatCurrency: (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0 ريال';
    
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num) + ' ريال';
  },

  /**
   * تنسيق التاريخ
   */
  formatDate: (date: string | Date): string => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
};