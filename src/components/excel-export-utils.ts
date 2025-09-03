/**
 * الوصف: أدوات تصدير البيانات إلى ملفات Excel مع تصميم احترافي
 * المدخلات: بيانات مختلفة (عمال، مصاريف، تقارير)
 * المخرجات: ملفات Excel منسقة ومصممة احترافياً
 * المالك: عمار
 * آخر تعديل: 2025-08-20
 * الحالة: نشط - نظام التصدير الأساسي
 */

// استيراد أنواع البيانات من exceljs
import * as ExcelJS from 'exceljs';

// إعدادات التصميم الموحد لجميع ملفات Excel
export const EXCEL_STYLES = {
  // ألوان موحدة للتطبيق
  colors: {
    primary: 'FF1E40AF', // أزرق أساسي
    secondary: 'FF64748B', // رمادي
    success: 'FF16A34A', // أخضر
    danger: 'FFDC2626', // أحمر
    warning: 'FFCA8A04', // برتقالي
    background: 'FFF8FAFC', // خلفية فاتحة
    headerBg: 'FF334155', // خلفية الرأس
    totalsBg: 'FFF1F5F9', // خلفية المجاميع
  },
  
  // خطوط موحدة
  fonts: {
    title: { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1E293B' } },
    header: { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } },
    subHeader: { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } },
    data: { name: 'Arial', size: 10, color: { argb: 'FF334155' } },
    totals: { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } },
    footer: { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } },
  },
  
  // حدود موحدة
  borders: {
    thin: { style: 'thin' as const, color: { argb: 'FFE2E8F0' } },
    medium: { style: 'medium' as const, color: { argb: 'FF94A3B8' } },
    thick: { style: 'thick' as const, color: { argb: 'FF475569' } },
  },
};

// معلومات الشركة/المؤسسة - مُحدثة حسب الطلب
export const COMPANY_INFO = {
  name: 'شركة الفتيني للمقاولات والاستشارات الهندسية',
  nameEn: 'Al-Fathi Construction & Engineering Consultancy Company',
  address: 'الجمهورية اليمنية',
  phone: '+967XXXXXXXXX',
  email: 'info@alfatini.com',
  website: 'www.alfatini.com',
  logo: '🏗️', // يمكن استبدالها بشعار الشركة لاحقاً
};

// إضافة رأس موحد للتقرير
export function addReportHeader(
  worksheet: ExcelJS.Worksheet,
  reportTitle: string,
  reportSubtitle?: string,
  additionalInfo?: string[]
): number {
  let currentRow = 1;
  
  // شعار/اسم الشركة
  const companyRow = worksheet.addRow([COMPANY_INFO.name]);
  worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
  const companyCell = worksheet.getCell(`A${currentRow}`);
  companyCell.font = EXCEL_STYLES.fonts.title;
  companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
  companyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_STYLES.colors.background } };
  worksheet.getRow(currentRow).height = 25;
  currentRow++;
  
  // فراغ
  worksheet.addRow([]);
  currentRow++;
  
  // عنوان التقرير
  const titleRow = worksheet.addRow([reportTitle]);
  worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.font = { ...EXCEL_STYLES.fonts.title, size: 18 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_STYLES.colors.primary } };
  titleCell.font = { ...titleCell.font, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(currentRow).height = 30;
  currentRow++;
  
  // عنوان فرعي
  if (reportSubtitle) {
    worksheet.addRow([]);
    currentRow++;
    
    const subtitleRow = worksheet.addRow([reportSubtitle]);
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    const subtitleCell = worksheet.getCell(`A${currentRow}`);
    subtitleCell.font = EXCEL_STYLES.fonts.subHeader;
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(currentRow).height = 20;
    currentRow++;
  }
  
  // معلومات إضافية
  if (additionalInfo && additionalInfo.length > 0) {
    worksheet.addRow([]);
    currentRow++;
    
    additionalInfo.forEach(info => {
      const infoRow = worksheet.addRow([info]);
      worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
      const infoCell = worksheet.getCell(`A${currentRow}`);
      infoCell.font = EXCEL_STYLES.fonts.data;
      infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
      currentRow++;
    });
  }
  
  // فراغ قبل البيانات
  worksheet.addRow([]);
  currentRow++;
  
  return currentRow;
}

// إضافة ذيل موحد للتقرير
export function addReportFooter(worksheet: ExcelJS.Worksheet, startRow: number): void {
  const currentDate = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // فراغ
  worksheet.addRow([]);
  const emptyRow = startRow;
  
  // خط فاصل
  const separatorRow = worksheet.addRow(['─'.repeat(80)]);
  worksheet.mergeCells(`A${startRow + 1}:H${startRow + 1}`);
  const separatorCell = worksheet.getCell(`A${startRow + 1}`);
  separatorCell.font = EXCEL_STYLES.fonts.footer;
  separatorCell.alignment = { horizontal: 'center' };
  
  // معلومات التقرير
  const footerInfo = [
    `تم إنشاء التقرير في: ${currentDate}`,
    `بواسطة: ${COMPANY_INFO.name}`,
    `الهاتف: ${COMPANY_INFO.phone} | البريد: ${COMPANY_INFO.email}`,
    `الموقع: ${COMPANY_INFO.website}`
  ];
  
  footerInfo.forEach((info, index) => {
    const row = startRow + 2 + index;
    const footerRow = worksheet.addRow([info]);
    worksheet.mergeCells(`A${row}:H${row}`);
    const footerCell = worksheet.getCell(`A${row}`);
    footerCell.font = EXCEL_STYLES.fonts.footer;
    footerCell.alignment = { horizontal: 'center' };
  });
}

// تنسيق جدول البيانات
export function formatDataTable(
  worksheet: ExcelJS.Worksheet,
  headerRow: number,
  dataStartRow: number,
  dataEndRow: number,
  columnCount: number
): void {
  // تنسيق رأس الجدول
  const headerRange = worksheet.getRow(headerRow);
  headerRange.eachCell((cell: any) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_STYLES.colors.headerBg } };
    cell.font = EXCEL_STYLES.fonts.header;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: EXCEL_STYLES.borders.medium,
      left: EXCEL_STYLES.borders.medium,
      bottom: EXCEL_STYLES.borders.medium,
      right: EXCEL_STYLES.borders.medium,
    };
  });
  headerRange.height = 25;
  
  // تنسيق بيانات الجدول
  for (let rowIndex = dataStartRow; rowIndex <= dataEndRow; rowIndex++) {
    const row = worksheet.getRow(rowIndex);
    row.eachCell((cell: any) => {
      cell.font = EXCEL_STYLES.fonts.data;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: EXCEL_STYLES.borders.thin,
        left: EXCEL_STYLES.borders.thin,
        bottom: EXCEL_STYLES.borders.thin,
        right: EXCEL_STYLES.borders.thin,
      };
    });
    row.height = 20;
  }
  
  // ضبط عرض الأعمدة تلقائياً
  for (let colIndex = 1; colIndex <= columnCount; colIndex++) {
    const column = worksheet.getColumn(colIndex);
    column.width = 15; // عرض أساسي
    
    // حساب العرض المطلوب بناءً على المحتوى
    let maxLength = 0;
    column.eachCell((cell: any) => {
      const cellLength = cell.value?.toString().length || 0;
      if (cellLength > maxLength) {
        maxLength = cellLength;
      }
    });
    
    // ضبط العرض (الحد الأدنى 12 والحد الأقصى 30)
    column.width = Math.max(12, Math.min(30, maxLength + 2));
  }
}

// تنسيق صف المجاميع
export function formatTotalsRow(worksheet: ExcelJS.Worksheet, totalsRowIndex: number): void {
  const totalsRow = worksheet.getRow(totalsRowIndex);
  totalsRow.eachCell((cell: any) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_STYLES.colors.totalsBg } };
    cell.font = EXCEL_STYLES.fonts.totals;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: EXCEL_STYLES.borders.medium,
      left: EXCEL_STYLES.borders.medium,
      bottom: EXCEL_STYLES.borders.medium,
      right: EXCEL_STYLES.borders.medium,
    };
  });
  totalsRow.height = 25;
}

// حفظ الملف وتحميله
export function saveExcelFile(workbook: any, fileName: string): void {
  workbook.xlsx.writeBuffer().then((buffer: ArrayBuffer) => {
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  });
}

// دوال التنسيق المحسنة للاستخدام في التقارير

// تنسيق العملة بالأرقام الإنجليزية
export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 ريال';
  return num.toLocaleString('en-US', { useGrouping: true }) + ' ريال';
}

// تنسيق الأرقام بالإنجليزية
export function formatNumber(num: string | number): string {
  const number = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(number)) return '0';
  return number.toLocaleString('en-US', { useGrouping: true });
}

// تنسيق التاريخ بالأرقام الإنجليزية
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB');
}

// تنسيق الوقت الكامل
export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-GB', { 
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// تنسيق النسب المئوية
export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return ((value / total) * 100).toFixed(1) + '%';
}