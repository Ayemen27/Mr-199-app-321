/**
 * الوصف: نظام تصدير Excel موحد لجميع التقارير (محسّن للأداء)
 * المدخلات: بيانات التقرير + نوع التقرير
 * المخرجات: ملف Excel منسق باحترافية
 * المالك: عمار
 * آخر تعديل: 2025-08-20 (تحسين الأداء - Dynamic Import)
 * الحالة: نشط - محسّن للأداء
 */

import { saveAs } from 'file-saver';

// استيراد الأنماط الموحدة
import { EXCEL_STYLES, COMPANY_INFO, addReportHeader } from '../../components/excel-export-utils';

export class UnifiedExcelExporter {
  private workbook: any;
  private ExcelJS: any;
  
  constructor() {
    // تحسين الأداء: تحميل ExcelJS عند الحاجة فقط
  }

  // تحميل ExcelJS بشكل ديناميكي
  private async loadExcelJS() {
    if (!this.ExcelJS) {
      this.ExcelJS = await import('exceljs');
      this.workbook = new this.ExcelJS.Workbook();
      this.initializeWorkbook();
    }
    return this.ExcelJS;
  }

  private initializeWorkbook() {
    this.workbook.creator = COMPANY_INFO.name;
    this.workbook.lastModifiedBy = 'نظام إدارة المشاريع';
    this.workbook.created = new Date();
    this.workbook.modified = new Date();
  }

  /**
   * تصدير تقرير المصروفات اليومية
   */
  async exportDailyExpenses(data: any, filename: string = 'daily-expenses') {
    await this.loadExcelJS(); // تحميل المكتبة عند الحاجة
    const worksheet = this.workbook.addWorksheet('المصروفات اليومية', {
      properties: { defaultColWidth: 15 }
    });
    
    // تعيين اتجاه RTL للورقة
    worksheet.views = [{ rightToLeft: true }];

    // إضافة رأس التقرير
    let currentRow = addReportHeader(
      worksheet,
      'كشف المصروفات اليومية',
      `تاريخ: ${data.date || new Date().toLocaleDateString('en-GB')}`,
      [`المشروع: ${data.projectName || 'غير محدد'}`]
    );

    // إضافة الجداول
    currentRow = this.addExpenseTable(worksheet, data, currentRow + 2);
    currentRow = this.addSummarySection(worksheet, data, currentRow + 2);

    // حفظ الملف
    await this.saveWorkbook(`${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  /**
   * تصدير كشف حساب العامل
   */
  async exportWorkerStatement(data: any, filename: string = 'worker-statement') {
    const worksheet = this.workbook.addWorksheet('كشف حساب العامل', {
      properties: { defaultColWidth: 12 }
    });
    
    // تعيين اتجاه RTL للورقة
    worksheet.views = [{ rightToLeft: true }];

    let currentRow = addReportHeader(
      worksheet,
      'كشف حساب العامل',
      `الفترة: من ${data.dateFrom || ''} إلى ${data.dateTo || ''}`,
      [
        `اسم العامل: ${data.worker?.name || 'غير محدد'}`,
        `نوع العمل: ${data.worker?.type || 'غير محدد'}`,
        `الأجر اليومي: ${data.worker?.dailyWage || 0} ريال`
      ]
    );

    // إضافة جدول الحضور
    if (data.attendance?.length > 0) {
      currentRow = this.addAttendanceTable(worksheet, data.attendance, currentRow + 2);
    }

    // إضافة جدول التحويلات
    if (data.transfers?.length > 0) {
      currentRow = this.addTransfersTable(worksheet, data.transfers, currentRow + 2);
    }

    // إضافة الملخص المالي
    currentRow = this.addWorkerSummary(worksheet, data.summary, currentRow + 2);

    await this.saveWorkbook(`${filename}-${data.worker?.name || 'عامل'}-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  /**
   * إضافة جدول المصروفات
   */
  private addExpenseTable(worksheet: ExcelJS.Worksheet, data: any, startRow: number): number {
    // رأس الجدول
    const headers = ['البند', 'التفاصيل', 'المبلغ', 'النوع', 'التاريخ'];
    const headerRow = worksheet.addRow(headers);
    
    headers.forEach((_, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.font = EXCEL_STYLES.fonts.header;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_STYLES.colors.headerBg } };
      cell.border = {
        top: EXCEL_STYLES.borders.medium,
        bottom: EXCEL_STYLES.borders.medium,
        left: EXCEL_STYLES.borders.thin,
        right: EXCEL_STYLES.borders.thin
      };
    });

    let currentRow = startRow + 1;
    
    // إضافة البيانات
    const expenses = this.flattenExpenseData(data);
    expenses.forEach(expense => {
      const row = worksheet.addRow([
        expense.category,
        expense.description,
        expense.amount,
        expense.type,
        expense.date
      ]);
      
      row.eachCell((cell, colNumber) => {
        cell.font = EXCEL_STYLES.fonts.data;
        cell.border = {
          top: EXCEL_STYLES.borders.thin,
          bottom: EXCEL_STYLES.borders.thin,
          left: EXCEL_STYLES.borders.thin,
          right: EXCEL_STYLES.borders.thin
        };
        
        // تنسيق خاص للمبالغ
        if (colNumber === 3) {
          cell.numFmt = '#,##0 "ريال"';
          cell.alignment = { horizontal: 'left' };
        }
      });
      currentRow++;
    });

    return currentRow;
  }

  /**
   * إضافة قسم الملخص
   */
  private addSummarySection(worksheet: ExcelJS.Worksheet, data: any, startRow: number): number {
    const summaryTitle = worksheet.addRow(['ملخص المصروفات']);
    worksheet.mergeCells(`A${startRow}:E${startRow}`);
    
    const titleCell = summaryTitle.getCell(1);
    titleCell.font = { ...EXCEL_STYLES.fonts.title, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_STYLES.colors.totalsBg } };

    let currentRow = startRow + 2;
    
    const summaryData = [
      ['إجمالي الدخل', data.totalIncome || 0],
      ['إجمالي المصروفات', data.totalExpenses || 0],
      ['الرصيد المرحل', data.carriedForward || 0],
      ['الرصيد النهائي', data.remainingBalance || 0]
    ];

    summaryData.forEach(([label, value]) => {
      const row = worksheet.addRow([label, '', '', '', value]);
      const labelCell = row.getCell(1);
      const valueCell = row.getCell(5);
      
      labelCell.font = EXCEL_STYLES.fonts.totals;
      valueCell.font = EXCEL_STYLES.fonts.totals;
      valueCell.numFmt = '#,##0 "ريال"';
      
      if (label === 'الرصيد النهائي') {
        labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_STYLES.colors.primary } };
        labelCell.font = { ...EXCEL_STYLES.fonts.totals, color: { argb: 'FFFFFFFF' } };
        valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_STYLES.colors.primary } };
        valueCell.font = { ...EXCEL_STYLES.fonts.totals, color: { argb: 'FFFFFFFF' } };
      }
      
      currentRow++;
    });

    return currentRow;
  }

  /**
   * إضافة جدول الحضور
   */
  private addAttendanceTable(worksheet: ExcelJS.Worksheet, attendance: any[], startRow: number): number {
    const sectionTitle = worksheet.addRow(['سجل الحضور']);
    worksheet.mergeCells(`A${startRow}:I${startRow}`);
    
    const titleCell = sectionTitle.getCell(1);
    titleCell.font = EXCEL_STYLES.fonts.subHeader;
    titleCell.alignment = { horizontal: 'center' };

    const headers = ['#', 'التاريخ', 'اليوم', 'وصف العمل', 'عدد أيام العمل', 'ساعات العمل', 'الأجر المستحق', 'المدفوع', 'المتبقي'];
    const headerRow = worksheet.addRow(headers);
    
    headers.forEach((_, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.font = EXCEL_STYLES.fonts.header;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_STYLES.colors.headerBg } };
    });

    let currentRow = startRow + 2;
    
    attendance.forEach((record, index) => {
      // حساب المبلغ المستحق بناءً على عدد الأيام
      const workDays = parseFloat(record.workDays) || (record.isPresent || record.status === 'present' ? 1 : 0);
      const dailyWage = parseFloat(record.dailyWage || 0);
      const workHours = parseFloat(record.workHours) || (workDays * 8);
      const wageAmount = workDays * dailyWage;
      const paidAmount = parseFloat(record.paidAmount) || 0;
      const remainingAmount = wageAmount - paidAmount;
      
      const row = worksheet.addRow([
        index + 1,
        record.date,
        record.dayName || new Date(record.date).toLocaleDateString('ar-SA', { weekday: 'long' }),
        record.workDescription || 'عمل بناء وفقاً لمتطلبات المشروع',
        workDays,
        `${workHours} ساعة`,
        wageAmount,
        paidAmount,
        remainingAmount
      ]);
      
      row.eachCell((cell, colNumber) => {
        cell.font = EXCEL_STYLES.fonts.data;
        // تنسيق أعمدة المبالغ (الأجر المستحق، المدفوع، المتبقي)
        if (colNumber === 7 || colNumber === 8 || colNumber === 9) {
          cell.numFmt = '#,##0 "ريال"';
          cell.alignment = { horizontal: 'left' };
        }
      });
      
      currentRow++;
    });

    return currentRow;
  }

  /**
   * إضافة جدول التحويلات
   */
  private addTransfersTable(worksheet: ExcelJS.Worksheet, transfers: any[], startRow: number): number {
    const sectionTitle = worksheet.addRow(['سجل التحويلات المالية']);
    worksheet.mergeCells(`A${startRow}:E${startRow}`);
    
    const titleCell = sectionTitle.getCell(1);
    titleCell.font = EXCEL_STYLES.fonts.subHeader;
    titleCell.alignment = { horizontal: 'center' };

    const headers = ['التاريخ', 'النوع', 'المبلغ', 'المستفيد', 'ملاحظات'];
    const headerRow = worksheet.addRow(headers);
    
    headers.forEach((_, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.font = EXCEL_STYLES.fonts.header;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_STYLES.colors.headerBg } };
    });

    let currentRow = startRow + 2;
    
    transfers.forEach(transfer => {
      const row = worksheet.addRow([
        transfer.date,
        transfer.type === 'family' ? 'حوالة أهل' : 'تحويل شخصي',
        transfer.amount,
        transfer.beneficiary || 'العامل',
        transfer.notes || ''
      ]);
      
      row.eachCell((cell, colNumber) => {
        cell.font = EXCEL_STYLES.fonts.data;
        if (colNumber === 3) {
          cell.numFmt = '#,##0 "ريال"';
        }
      });
      
      currentRow++;
    });

    return currentRow;
  }

  /**
   * إضافة ملخص العامل
   */
  private addWorkerSummary(worksheet: ExcelJS.Worksheet, summary: any, startRow: number): number {
    const summaryData = [
      ['إجمالي الأجور المستحقة', summary?.totalWages || 0],
      ['إجمالي المدفوع', summary?.totalPaid || 0],
      ['إجمالي التحويلات', summary?.totalTransfers || 0],
      ['الرصيد المتبقي', summary?.remainingBalance || 0]
    ];

    let currentRow = startRow;
    
    summaryData.forEach(([label, value]) => {
      const row = worksheet.addRow([label, '', '', '', value]);
      const labelCell = row.getCell(1);
      const valueCell = row.getCell(5);
      
      labelCell.font = EXCEL_STYLES.fonts.totals;
      valueCell.font = EXCEL_STYLES.fonts.totals;
      valueCell.numFmt = '#,##0 "ريال"';
      
      currentRow++;
    });

    return currentRow;
  }

  /**
   * تحويل بيانات المصروفات لصيغة مسطحة
   */
  private flattenExpenseData(data: any): any[] {
    const expenses: any[] = [];
    
    // تحويلات الأموال
    if (data.fundTransfers) {
      data.fundTransfers.forEach((transfer: any) => {
        expenses.push({
          category: 'تحويل أموال',
          description: transfer.description || 'تحويل عهدة',
          amount: transfer.amount,
          type: 'دخل',
          date: transfer.date
        });
      });
    }
    
    // أجور العمال
    if (data.workerAttendance) {
      data.workerAttendance.forEach((attendance: any) => {
        if (attendance.paidAmount > 0) {
          expenses.push({
            category: 'أجور عمال',
            description: `${attendance.worker?.name || 'عامل'} - ${attendance.date}`,
            amount: attendance.paidAmount,
            type: 'مصروف',
            date: attendance.date
          });
        }
      });
    }
    
    // مشتريات المواد
    if (data.materialPurchases) {
      data.materialPurchases.forEach((purchase: any) => {
        expenses.push({
          category: 'مشتريات مواد',
          description: `${purchase.material?.name || 'مادة'} - ${purchase.quantity} ${purchase.unit}`,
          amount: purchase.totalAmount,
          type: purchase.purchaseType === 'نقد' ? 'مصروف' : 'آجل',
          date: purchase.date
        });
      });
    }
    
    // مصاريف النقل
    if (data.transportationExpenses) {
      data.transportationExpenses.forEach((expense: any) => {
        expenses.push({
          category: 'نقل ومواصلات',
          description: expense.description || 'مصروف نقل',
          amount: expense.amount,
          type: 'مصروف',
          date: expense.date
        });
      });
    }
    
    return expenses;
  }

  /**
   * حفظ المصنف
   */
  private async saveWorkbook(filename: string) {
    const buffer = await this.workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, filename);
  }
}

// تصدير مبسط للاستخدام المباشر
export const exportToExcel = {
  dailyExpenses: async (data: any, filename?: string) => {
    const exporter = new UnifiedExcelExporter();
    await exporter.exportDailyExpenses(data, filename);
  },
  
  workerStatement: async (data: any, filename?: string) => {
    const exporter = new UnifiedExcelExporter();
    await exporter.exportWorkerStatement(data, filename);
  }
};