/**
 * الوصف: نظام إدارة الطباعة الموحد لجميع التقارير
 * المدخلات: عنصر HTML + إعدادات الطباعة
 * المخرجات: طباعة محسنة أو تحويل PDF
 * المالك: عمار
 * آخر تعديل: 2025-08-15
 * الحالة: نشط
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PrintOptions {
  title?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'A4' | 'A3' | 'letter';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  includeDate?: boolean;
  watermark?: string;
}

export class UnifiedPrintManager {
  private static defaultOptions: PrintOptions = {
    orientation: 'portrait',
    format: 'A4',
    margins: {
      top: 15,
      right: 15,
      bottom: 15,
      left: 15
    },
    includeDate: true
  };

  /**
   * طباعة مباشرة للمتصفح
   */
  static async printDirect(elementId: string, options: Partial<PrintOptions> = {}) {
    const config = { ...this.defaultOptions, ...options };
    
    // التحقق من وجود العنصر أولاً
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Print Error: Element with id '${elementId}' not found`);
      throw new Error(`لا يمكن العثور على عنصر الطباعة: ${elementId}`);
    }

    // التحقق من أن العنصر يحتوي على محتوى حقيقي
    const textContent = element.innerText || element.textContent || '';
    const hasVisibleContent = textContent.trim().length > 0;
    const hasTableData = element.querySelector('table tbody tr:not(.empty-state)');
    
    if (!hasVisibleContent && !hasTableData) {
      console.error(`Print Error: Element '${elementId}' has no visible content`);
      throw new Error(`عنصر الطباعة لا يحتوي على بيانات للطباعة. يرجى التأكد من تحميل البيانات أولاً.`);
    }

    // التحقق من وجود رسائل خطأ أو تحميل
    const loadingElement = element.querySelector('.loading, .error, [data-loading]');
    if (loadingElement) {
      throw new Error(`لا يمكن الطباعة أثناء التحميل أو في حالة وجود خطأ. يرجى انتظار تحميل البيانات.`);
    }
    
    // إخفاء العناصر غير المرغوبة
    this.hideNonPrintElements();
    
    // إضافة عنوان إذا كان محدد
    if (config.title) {
      document.title = config.title;
    }
    
    // إضافة التاريخ إذا مطلوب
    if (config.includeDate) {
      this.addPrintDate();
    }
    
    // تطبيق إعدادات الطباعة
    this.applyPrintStyles(config);
    
    try {
      console.log(`🖨️ طباعة العنصر: ${elementId}`);
      window.print();
    } finally {
      // إعادة إظهار العناصر المخفية
      this.showNonPrintElements();
      this.removePrintDate();
    }
  }

  /**
   * تحويل لـ PDF باستخدام html2canvas + jsPDF
   */
  static async convertToPDF(elementId: string, filename: string = 'report.pdf', options: Partial<PrintOptions> = {}) {
    const config = { ...this.defaultOptions, ...options };
    const element = document.getElementById(elementId);
    
    if (!element) {
      throw new Error(`Element with id '${elementId}' not found`);
    }

    try {
      // إخفاء العناصر غير المرغوبة
      this.hideNonPrintElements();
      
      // إعدادات html2canvas
      const canvas = await html2canvas(element, {
        scale: 2, // جودة عالية
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0
      });

      // إنشاء PDF
      const pdf = new jsPDF({
        orientation: config.orientation,
        unit: 'mm',
        format: config.format
      });

      // حساب الأبعاد
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasAspectRatio = canvas.height / canvas.width;
      
      let imgWidth = pdfWidth - (config.margins!.left + config.margins!.right);
      let imgHeight = imgWidth * canvasAspectRatio;
      
      // إذا كانت الصورة أطول من الصفحة، قسمها
      if (imgHeight > pdfHeight - (config.margins!.top + config.margins!.bottom)) {
        const pageHeight = pdfHeight - (config.margins!.top + config.margins!.bottom);
        const totalPages = Math.ceil(imgHeight / pageHeight);
        
        for (let i = 0; i < totalPages; i++) {
          const yOffset = -(i * pageHeight * canvas.width / imgWidth);
          
          if (i > 0) pdf.addPage();
          
          pdf.addImage(
            canvas.toDataURL('image/png'),
            'PNG',
            config.margins!.left,
            config.margins!.top,
            imgWidth,
            imgHeight
          );
        }
      } else {
        // الصورة تتسع في صفحة واحدة
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          config.margins!.left,
          config.margins!.top,
          imgWidth,
          imgHeight
        );
      }

      // إضافة معلومات إضافية
      if (config.title) {
        pdf.setProperties({ title: config.title });
      }
      
      if (config.watermark) {
        this.addWatermark(pdf, config.watermark);
      }

      // حفظ الملف
      pdf.save(filename);
      
    } finally {
      // إعادة إظهار العناصر
      this.showNonPrintElements();
    }
  }

  /**
   * معاينة الطباعة
   */
  static async previewPrint(elementId: string, options: Partial<PrintOptions> = {}) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // إنشاء نافذة معاينة
    const previewWindow = window.open('', '_blank', 'width=800,height=600');
    if (!previewWindow) return;

    // نسخ المحتوى والأنماط
    previewWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>معاينة الطباعة</title>
        <link href="/client/src/styles/unified-print-styles.css" rel="stylesheet">
        <style>
          body { 
            font-family: 'Cairo', Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            background: white;
          }
          .preview-controls {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 1000;
            background: #f0f0f0;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .preview-controls button {
            margin: 0 5px;
            padding: 8px 15px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-family: 'Cairo', Arial, sans-serif;
          }
          .print-btn { background: #1e40af; color: white; }
          .close-btn { background: #dc2626; color: white; }
          @media print {
            .preview-controls { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="preview-controls">
          <button class="print-btn" onclick="window.print()">طباعة</button>
          <button class="close-btn" onclick="window.close()">إغلاق</button>
        </div>
        <div class="print-preview">
          ${element.outerHTML}
        </div>
      </body>
      </html>
    `);

    previewWindow.document.close();
  }

  /**
   * إخفاء العناصر غير المطلوبة في الطباعة
   */
  private static hideNonPrintElements() {
    const elementsToHide = document.querySelectorAll('.no-print, .sidebar, .navbar, button:not(.print-visible)');
    elementsToHide.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
  }

  /**
   * إظهار العناصر المخفية
   */
  private static showNonPrintElements() {
    const hiddenElements = document.querySelectorAll('.no-print, .sidebar, .navbar, button:not(.print-visible)');
    hiddenElements.forEach(el => {
      (el as HTMLElement).style.display = '';
    });
  }

  /**
   * إضافة تاريخ الطباعة
   */
  private static addPrintDate() {
    const printDate = document.createElement('div');
    printDate.id = 'print-date-temp';
    printDate.className = 'print-date-footer';
    printDate.innerHTML = `
      <div style="text-align: center; font-size: 10px; color: #666; margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee;">
        طُبع في: ${new Date().toLocaleDateString('en-GB')} - ${new Date().toLocaleTimeString('en-GB', { hour12: false })}
      </div>
    `;
    document.body.appendChild(printDate);
  }

  /**
   * إزالة تاريخ الطباعة
   */
  private static removePrintDate() {
    const printDate = document.getElementById('print-date-temp');
    if (printDate) {
      printDate.remove();
    }
  }

  /**
   * تطبيق إعدادات الطباعة
   */
  private static applyPrintStyles(config: PrintOptions) {
    const style = document.createElement('style');
    style.id = 'print-config-temp';
    style.innerHTML = `
      @media print {
        @page {
          size: ${config.format};
          margin: ${config.margins?.top}mm ${config.margins?.right}mm ${config.margins?.bottom}mm ${config.margins?.left}mm;
          orientation: ${config.orientation};
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * إضافة علامة مائية
   */
  private static addWatermark(pdf: jsPDF, watermarkText: string) {
    const pageCount = pdf.internal.pages.length - 1;
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(50);
      pdf.setTextColor(220, 220, 220);
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // وضع النص في المنتصف بشكل قطري
      pdf.text(
        watermarkText,
        pageWidth / 2,
        pageHeight / 2,
        {
          angle: -45,
          align: 'center'
        }
      );
    }
  }
}

// تصدير مبسط للاستخدام المباشر
export const printReport = {
  /**
   * طباعة مباشرة
   */
  direct: (elementId: string, title?: string) => 
    UnifiedPrintManager.printDirect(elementId, { title }),
  
  /**
   * تحويل لـ PDF
   */
  toPDF: (elementId: string, filename?: string, title?: string) => 
    UnifiedPrintManager.convertToPDF(elementId, filename, { title }),
  
  /**
   * معاينة الطباعة
   */
  preview: (elementId: string, title?: string) => 
    UnifiedPrintManager.previewPrint(elementId, { title })
};