/**
 * كشف حساب العامل المحسن بالبيانات الحقيقية - مطابق لتصميم Excel 100%
 * يستخدم البيانات الحقيقية من قاعدة البيانات مع تصميم احترافي مطابق للصور المرفقة
 * التصميم مُحسن للطباعة والتصدير مع تنسيق A4 مثالي
 */

import React from 'react';
import { FileSpreadsheet, Printer, FileText, Camera } from 'lucide-react';
import { Button } from "@/components/ui/button";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '@/styles/unified-print-styles.css';
import '@/styles/excel-print-styles.css';

// واجهة بيانات المكون المحسنة
interface EnhancedWorkerAccountStatementRealDataProps {
  data: any;
  selectedProject: any;
  workerId: string;
  dateFrom: string;
  dateTo: string;
}

export const EnhancedWorkerAccountStatementRealData = ({ 
  data, 
  selectedProject, 
  workerId, 
  dateFrom, 
  dateTo 
}: EnhancedWorkerAccountStatementRealDataProps) => {
  
  // استخدام دوال التنسيق الموحدة من ملف الأدوات
  // formatCurrency, formatNumber, formatDate تم استيرادها في الأعلى

  const formatDay = (dateStr: string) => {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[new Date(dateStr).getDay()] || '';
  };

  // استخراج البيانات الحقيقية
  const {
    worker = {},
    attendance = [],
    transfers = [],
    summary = {},
    projectsInfo = []
  } = data || {};

  // حساب الإجماليات الحقيقية من البيانات - مع إصلاح حساب أيام العمل
  const realStats = attendance.reduce((acc: any, record: any) => {
    const dailyWage = Number(record.dailyWage) || Number(worker.dailyWage) || 0;
    // إصلاح حساب أيام العمل - يجب استخدام ?? بدلاً من || لتجنب تحويل 0 إلى 1
    const workDays = record.workDays !== undefined && record.workDays !== null ? Number(record.workDays) : 
                     (record.isPresent || record.status === 'present' ? 1 : 0);
    const workHours = Number(record.workHours) || (workDays * 8); // حساب الساعات بناءً على الأيام
    const earned = dailyWage * workDays;
    const paid = Number(record.paidAmount) || 0;
    

    
    return {
      totalWorkDays: acc.totalWorkDays + workDays,
      totalWorkHours: acc.totalWorkHours + workHours,
      totalEarned: acc.totalEarned + earned,
      totalPaid: acc.totalPaid + paid,
    };
  }, { totalWorkDays: 0, totalWorkHours: 0, totalEarned: 0, totalPaid: 0 });
  


  const totalRemaining = realStats.totalEarned - realStats.totalPaid;
  const totalTransferred = transfers.reduce((sum: number, transfer: any) => sum + (Number(transfer.amount) || 0), 0);
  const currentBalance = realStats.totalPaid - totalTransferred;

  // تصدير Excel محسن بالبيانات الحقيقية
  const exportToExcel = async () => {
    try {

      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('كشف حساب العامل - بيانات حقيقية');

      // استخدام الرأس الموحد الاحترافي
      let currentRow = addReportHeader(
        worksheet,
        'كشف حساب العامل التفصيلي - بيانات حقيقية من النظام',
        `الفترة: من ${formatDate(dateFrom)} إلى ${formatDate(dateTo)}`,
        [
          `اسم العامل: ${worker.name || 'غير محدد'} | المهنة: ${worker.type || 'غير محدد'}`,
          `المشروع: ${selectedProject?.name || 'غير محدد'}`,
          `الأجر اليومي: ${formatCurrency(Number(worker.dailyWage) || 0)}`,
          `إجمالي أيام العمل: ${formatNumber(realStats.totalWorkDays)} | إجمالي الساعات: ${formatNumber(realStats.totalWorkHours)}`,
          `المبلغ المستحق: ${formatCurrency(realStats.totalEarned)} | المدفوع: ${formatCurrency(realStats.totalPaid)} | المتبقي: ${formatCurrency(totalRemaining)}`
        ]
      );

      // رؤوس الجدول - مطابقة للتصميم المطلوب
      const headers = [
        '#', 'التاريخ', 'اليوم', 'وصف العمل', 'عدد أيام العمل', 
        'ساعات العمل', 'الأجر المستحق', 'المدفوع', 'المتبقي'
      ];
      const headerRow = worksheet.addRow(headers);
      
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial Unicode MS', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3b82f6' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // البيانات الحقيقية للحضور
      let totalEarnedExcel = 0;
      let totalPaidExcel = 0;
      
      attendance.forEach((record: any, index: number) => {
        const dailyWage = Number(record.dailyWage) || Number(worker?.dailyWage) || 0;
        // إصلاح حساب أيام العمل في تصدير Excel
        const workDays = record.workDays !== undefined && record.workDays !== null ? Number(record.workDays) : 
                         (record.isPresent || record.status === 'present' ? 1 : 0);
        const workHours = Number(record.workHours) || (workDays * 8);
        const earned = dailyWage * workDays;
        const paid = Number(record.paidAmount) || 0;
        const remaining = earned - paid;
        const status = paid >= earned ? 'مدفوع كامل' : paid > 0 ? 'مدفوع جزئي' : 'غير مدفوع';
        

        
        totalEarnedExcel += earned;
        totalPaidExcel += paid;

        const dataRow = worksheet.addRow([
          index + 1,
          formatDate(record.date),
          formatDay(record.date),
          record.workDescription || 'عمل بناء وفقاً لمتطلبات المشروع',
          workDays,
          `${workHours} ساعة`,
          formatCurrency(earned),
          formatCurrency(paid),
          formatCurrency(remaining)
        ]);

        dataRow.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial Unicode MS', size: 9 };
          cell.alignment = { 
            horizontal: colNumber === 4 ? 'right' : 'center', 
            vertical: 'middle' 
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
          if (index % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
        });
      });

      // صف الإجماليات
      const totalRow = worksheet.addRow([
        'الإجماليات', '', '', '',
        realStats.totalWorkDays,
        '',
        formatCurrency(totalEarnedExcel),
        formatCurrency(totalPaidExcel),
        formatCurrency(totalEarnedExcel - totalPaidExcel)
      ]);

      totalRow.eachCell((cell) => {
        cell.font = { name: 'Arial Unicode MS', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'medium', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // إعداد عرض الأعمدة
      worksheet.columns = [
        { width: 5 },   // #
        { width: 12 },  // التاريخ
        { width: 10 },  // اليوم
        { width: 25 },  // وصف العمل
        { width: 12 },  // عدد أيام العمل
        { width: 12 },  // ساعات العمل
        { width: 15 },  // الأجر المستحق
        { width: 15 },  // المدفوع
        { width: 12 }   // المتبقي
      ];

      // إعداد الطباعة
      worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.7, right: 0.7,
          top: 0.75, bottom: 0.75,
          header: 0.3, footer: 0.3
        }
      };

      // إعداد metadata للملف لضمان التوافق
      workbook.creator = 'شركة الفتيني للمقاولات والاستشارات الهندسية';
      workbook.lastModifiedBy = 'نظام إدارة المشاريع';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      // تصدير الملف مع إعدادات محسنة
      const buffer = await workbook.xlsx.writeBuffer({
        useSharedStrings: true,
        useStyles: true
      });
      const workerName = (worker.name || 'Unknown').replace(/[\\/:*?"<>|]/g, '_');
      const fromDate = dateFrom.replace(/[\\/:*?"<>|]/g, '_');
      const toDate = dateTo.replace(/[\\/:*?"<>|]/g, '_');
      const fileName = `كشف_حساب_العامل_بيانات_حقيقية_${workerName}_من_${fromDate}_إلى_${toDate}.xlsx`;
      
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      saveAs(blob, fileName);
      

      
    } catch (error) {
      console.error('❌ خطأ في تصدير Excel:', error);
      alert('❌ حدث خطأ أثناء تصدير ملف Excel. يرجى المحاولة مرة أخرى.');
    }
  };

  // دالة الطباعة المحسنة
  const handlePrint = () => {
    try {

      
      const printContent = document.getElementById('enhanced-worker-account-statement-real-data');
      if (!printContent || !printContent.innerHTML.trim()) {
        alert('❌ لم يتم العثور على محتوى الطباعة أو المحتوى فارغ');
        return;
      }

      window.print();
      

      
    } catch (error) {
      console.error('❌ خطأ في الطباعة:', error);
      alert('❌ حدث خطأ أثناء الطباعة. يرجى المحاولة مرة أخرى.');
    }
  };

  // دالة تحميل صورة التقرير
  const downloadImage = async () => {
    try {

      
      const element = document.getElementById('enhanced-worker-account-statement-real-data');
      if (!element) {
        alert('❌ لم يتم العثور على محتوى التقرير');
        return;
      }

      // إخفاء أزرار التحكم مؤقتاً
      const controlButtons = document.querySelectorAll('.no-print');
      controlButtons.forEach(btn => (btn as HTMLElement).style.display = 'none');

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
      controlButtons.forEach(btn => (btn as HTMLElement).style.display = '');

      // تحويل إلى صورة وتحميلها
      const imgData = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `كشف_حساب_العامل_${worker?.name || 'عامل'}_${formatDate(dateFrom)}_إلى_${formatDate(dateTo)}.png`;
      link.href = imgData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);


      
    } catch (error) {
      console.error('❌ خطأ في تحميل الصورة:', error);
      alert('❌ حدث خطأ أثناء تحميل الصورة. يرجى المحاولة مرة أخرى.');
    }
  };

  return (
    <div style={{ direction: 'rtl' }}>
      {/* أزرار التحكم */}
      <div className="no-print flex justify-end gap-2 mb-4">
        <Button
          onClick={exportToExcel}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          تصدير Excel
        </Button>
        <Button
          onClick={downloadImage}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Camera className="h-4 w-4 mr-2" />
          تحميل صورة
        </Button>
        <Button
          onClick={handlePrint}
          variant="outline"
          className="border-blue-600 text-blue-600 hover:bg-blue-50"
        >
          <Printer className="h-4 w-4 mr-2" />
          طباعة
        </Button>
      </div>

      <div 
        id="enhanced-worker-account-statement-real-data" 
        className="enhanced-worker-statement-print bg-white print-preview-content"
        style={{
          direction: 'rtl',
          width: '100%',
          maxWidth: '210mm',
          margin: '0 auto',
          padding: '8mm',
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
          fontSize: '11px',
          lineHeight: '1.4',
          color: '#1a1a1a',
          background: 'white',
          pageBreakAfter: 'avoid',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        
        {/* رأسية احترافية مطابقة للتصميم */}
        <div style={{
          textAlign: 'center',
          marginBottom: '4mm',
          borderBottom: '2px solid #2563eb',
          paddingBottom: '3mm'
        }}>
          <h1 style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#2563eb',
            margin: '0 0 3mm 0',
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
          }}>
            شركة الفتيني للمقاولات والاستشارات الهندسية
          </h1>
          <h2 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#374151',
            margin: '0 0 2mm 0'
          }}>
            كشف حساب العامل التفصيلي (بيانات حقيقية)
          </h2>
          <p style={{
            fontSize: '9px',
            color: '#6b7280',
            margin: '0'
          }}>
            الفترة: من {formatDate(dateFrom)} إلى {formatDate(dateTo)} | تاريخ الإنشاء: {formatDate(new Date().toISOString().split('T')[0])}
          </p>
        </div>

        {/* معلومات العامل والمشروع - تخطيط محسن */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '4mm',
          marginBottom: '4mm',
          padding: '3mm',
          backgroundColor: '#f0f7ff',
          border: '2px solid #2563eb',
          borderRadius: '3mm',
          fontSize: '10px'
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: '2mm' }}><strong>👤 العامل:</strong> {worker?.name || 'غير محدد'}</div>
            <div style={{ marginBottom: '2mm' }}><strong>🛠️ المهنة:</strong> {worker?.type || 'عامل'}</div>
            <div><strong>💰 الأجر اليومي:</strong> {formatCurrency(Number(worker?.dailyWage) || 0)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '2mm' }}><strong>🏗️ المشروع:</strong></div>
            <div style={{ marginBottom: '2mm', color: '#1e40af', fontWeight: 'bold' }}>{selectedProject?.name || 'غير محدد'}</div>
            <div><strong>📅 فترة الحساب:</strong> {formatDate(dateFrom)} - {formatDate(dateTo)}</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '2mm' }}><strong>💵 إجمالي المستحق:</strong> <span style={{ color: '#059669', fontWeight: 'bold' }}>{formatCurrency(realStats.totalEarned)}</span></div>
            <div style={{ marginBottom: '2mm' }}><strong>💸 إجمالي المدفوع:</strong> <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{formatCurrency(realStats.totalPaid)}</span></div>
            <div><strong>⚖️ الرصيد المتبقي:</strong> <span style={{ color: totalRemaining <= 0 ? '#059669' : '#dc2626', fontWeight: 'bold' }}>{formatCurrency(totalRemaining)}</span></div>
          </div>
        </div>

        {/* جدول الحضور التفصيلي بالبيانات الحقيقية */}
        <div style={{ marginBottom: '3mm' }}>
          <h3 style={{
            fontSize: '11px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '1mm',
            textAlign: 'center',
            padding: '2mm',
            backgroundColor: '#3b82f6',
            borderRadius: '2mm 2mm 0 0'
          }}>
            سجل الحضور والأجور التفصيلي (بيانات حقيقية من النظام)
          </h3>
          
          {attendance.length > 0 ? (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '9px',
              border: '1px solid #d1d5db'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                  <th style={{ border: '1px solid #d1d5db', padding: '2mm', textAlign: 'center', fontWeight: 'bold', width: '4%', fontSize: '8px' }}>🔢 #</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '2mm', textAlign: 'center', fontWeight: 'bold', width: '10%', fontSize: '8px' }}>📅 التاريخ</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '2mm', textAlign: 'center', fontWeight: 'bold', width: '8%', fontSize: '8px' }}>📆 اليوم</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '2mm', textAlign: 'center', fontWeight: 'bold', width: '20%', fontSize: '8px' }}>⚒️ وصف العمل</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '2mm', textAlign: 'center', fontWeight: 'bold', width: '8%', fontSize: '8px' }}>🗓️ عدد أيام العمل</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '2mm', textAlign: 'center', fontWeight: 'bold', width: '8%', fontSize: '8px' }}>⏰ ساعات العمل</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '2mm', textAlign: 'center', fontWeight: 'bold', width: '12%', fontSize: '8px' }}>💰 الأجر المستحق</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '2mm', textAlign: 'center', fontWeight: 'bold', width: '12%', fontSize: '8px' }}>✅ المدفوع</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '2mm', textAlign: 'center', fontWeight: 'bold', width: '10%', fontSize: '8px' }}>⏳ المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record: any, index: number) => {
                  const dailyWage = Number(record.dailyWage) || Number(worker?.dailyWage) || 0;
                  // إصلاح حساب أيام العمل في عرض الجدول
                  const workDays = record.workDays !== undefined && record.workDays !== null ? Number(record.workDays) : 
                                   (record.isPresent || record.status === 'present' ? 1 : 0);
                  const workHours = Number(record.workHours) || (workDays * 8);
                  const earned = dailyWage * workDays;
                  const paid = Number(record.paidAmount) || 0;
                  const remaining = earned - paid;
                  const status = paid >= earned ? 'مدفوع كامل' : paid > 0 ? 'مدفوع جزئي' : 'غير مدفوع';
                  
                  return (
                    <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc' }}>
                      <td style={{ border: '1px solid #d1d5db', padding: '1.5mm', textAlign: 'center', fontSize: '8px' }}>{index + 1}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '1.5mm', textAlign: 'center', fontSize: '8px' }}>{formatDate(record.date)}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '1.5mm', textAlign: 'center', fontSize: '8px' }}>{formatDay(record.date)}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '1.5mm', textAlign: 'right', fontSize: '8px' }}>{record.workDescription || 'عمل بناء وفقاً لمتطلبات المشروع'}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '1.5mm', textAlign: 'center', fontSize: '8px', fontWeight: 'bold', color: '#059669' }}>{workDays}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '1.5mm', textAlign: 'center', fontSize: '8px' }}>{workHours} ساعة</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '1.5mm', textAlign: 'center', fontSize: '8px', fontWeight: 'bold', color: '#2563eb' }}>{formatCurrency(earned)}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '1.5mm', textAlign: 'center', fontSize: '8px', fontWeight: 'bold', color: '#dc2626' }}>{formatCurrency(paid)}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '1.5mm', textAlign: 'center', fontSize: '8px', fontWeight: 'bold', color: remaining > 0 ? '#dc2626' : '#059669' }}>{formatCurrency(remaining)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#059669', color: 'white', fontWeight: 'bold' }}>
                  <td colSpan={4} style={{ border: '1px solid white', padding: '2mm', textAlign: 'center', fontSize: '9px' }}>الإجماليات</td>
                  <td style={{ border: '1px solid white', padding: '2mm', textAlign: 'center', fontSize: '9px' }}>{realStats.totalWorkDays}</td>
                  <td style={{ border: '1px solid white', padding: '2mm', textAlign: 'center', fontSize: '9px' }}>-</td>
                  <td style={{ border: '1px solid white', padding: '2mm', textAlign: 'center', fontSize: '9px' }}>{formatCurrency(realStats.totalEarned)}</td>
                  <td style={{ border: '1px solid white', padding: '2mm', textAlign: 'center', fontSize: '9px' }}>{formatCurrency(realStats.totalPaid)}</td>
                  <td style={{ border: '1px solid white', padding: '2mm', textAlign: 'center', fontSize: '9px' }}>{formatCurrency(totalRemaining)}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              backgroundColor: '#fef2f2',
              border: '2px dashed #f87171',
              borderRadius: '4px',
              color: '#dc2626'
            }}>
              <p style={{ margin: '0', fontSize: '14px', fontWeight: 'bold' }}>
                ⚠️ لا توجد بيانات حضور للعامل في الفترة المحددة
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
                يرجى التأكد من وجود سجلات حضور في النظام للعامل "{worker?.name || 'غير محدد'}" للفترة من {formatDate(dateFrom)} إلى {formatDate(dateTo)}
              </p>
            </div>
          )}
        </div>

        {/* جدول الحوالات المالية */}
        {transfers && transfers.length > 0 && (
          <div style={{ marginTop: '4mm' }}>
            <h3 style={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '1mm',
              textAlign: 'center',
              padding: '2mm',
              backgroundColor: '#dc2626',
              borderRadius: '2mm 2mm 0 0'
            }}>
              سجل الحوالات والتحويلات
            </h3>
            
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '9px',
              border: '1px solid #d1d5db'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#dc2626', color: 'white' }}>
                  <th style={{ border: '1px solid white', padding: '2mm', textAlign: 'center', fontWeight: 'bold', fontSize: '8px' }}>م</th>
                  <th style={{ border: '1px solid white', padding: '2mm', textAlign: 'center', fontWeight: 'bold', fontSize: '8px' }}>تاريخ الحولة</th>
                  <th style={{ border: '1px solid white', padding: '2mm', textAlign: 'center', fontWeight: 'bold', fontSize: '8px' }}>المبلغ</th>
                  <th style={{ border: '1px solid white', padding: '2mm', textAlign: 'center', fontWeight: 'bold', fontSize: '8px' }}>المستلم</th>
                  <th style={{ border: '1px solid white', padding: '2mm', textAlign: 'center', fontWeight: 'bold', fontSize: '8px' }}>طريقة التحويل</th>
                  <th style={{ border: '1px solid white', padding: '2mm', textAlign: 'center', fontWeight: 'bold', fontSize: '8px' }}>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((transfer: any, index: number) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#fef2f2' }}>
                    <td style={{ border: '1px solid #d1d5db', padding: '1.5mm', textAlign: 'center', fontSize: '8px' }}>{index + 1}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '1.5mm', textAlign: 'center', fontSize: '8px' }}>{formatDate(transfer.transferDate)}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '1.5mm', textAlign: 'center', fontSize: '8px', fontWeight: 'bold', color: '#dc2626' }}>{formatCurrency(Number(transfer.amount))}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '1.5mm', textAlign: 'center', fontSize: '8px' }}>{transfer.recipientName}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '1.5mm', textAlign: 'center', fontSize: '8px' }}>{transfer.transferMethod === 'hawaleh' ? 'حولة' : transfer.transferMethod === 'bank' ? 'تحويل بنكي' : 'نقداً'}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '1.5mm', textAlign: 'right', fontSize: '8px' }}>{transfer.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#dc2626', color: 'white', fontWeight: 'bold' }}>
                  <td colSpan={2} style={{ border: '1px solid white', padding: '2mm', textAlign: 'center', fontSize: '9px' }}>إجمالي الحوالات</td>
                  <td style={{ border: '1px solid white', padding: '2mm', textAlign: 'center', fontSize: '9px' }}>{formatCurrency(totalTransferred)}</td>
                  <td colSpan={3} style={{ border: '1px solid white', padding: '2mm', textAlign: 'center', fontSize: '9px' }}>الرصيد المتبقي: {formatCurrency(currentBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* التوقيعات النهائية */}
        <div style={{
          marginTop: '8mm',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '15mm',
          fontSize: '10px',
          textAlign: 'center'
        }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: '3mm' }}>
            <strong>المحاسب</strong><br />
            <div style={{ height: '10mm' }}></div>
            التوقيع: ________________<br />
            التاريخ: ________________
          </div>
          <div style={{ borderTop: '1px solid #000', paddingTop: '3mm' }}>
            <strong>مدير المشروع</strong><br />
            <div style={{ height: '10mm' }}></div>
            التوقيع: ________________<br />
            التاريخ: ________________
          </div>
          <div style={{ borderTop: '1px solid #000', paddingTop: '3mm' }}>
            <strong>العامل</strong><br />
            <div style={{ height: '10mm' }}></div>
            التوقيع: ________________<br />
            التاريخ: ________________
          </div>
        </div>

      </div>
    </div>
  );
};

export default EnhancedWorkerAccountStatementRealData;