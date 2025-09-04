// مولد PDF التجريبي - محاولة استخدام Puppeteer
// تم إنشاؤه تلقائياً - 13 أغسطس 2025

interface PDFGenerationOptions {
  html: string;
  filename: string;
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

export async function generatePDF(options: PDFGenerationOptions): Promise<boolean> {
  try {
    // محاولة استخدام Puppeteer إذا كان متاحاً
    const puppeteer = await import('puppeteer').catch(() => null);
    
    if (!puppeteer) {
      console.log('⚠️ Puppeteer غير متاح - سيتم تجربة طرق أخرى');
      return await fallbackPDFGeneration(options);
    }

    console.log('🚀 بدء توليد PDF باستخدام Puppeteer...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // إعداد المحتوى العربي
    await page.setContent(options.html, {
      waitUntil: 'networkidle0'
    });
    
    // توليد PDF
    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      landscape: options.orientation === 'landscape',
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      },
      printBackground: true,
      preferCSSPageSize: true
    });
    
    await browser.close();
    
    // حفظ الملف
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${options.filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ تم توليد PDF بنجاح');
    return true;
    
  } catch (error) {
    console.error('❌ خطأ في توليد PDF:', error);
    return await fallbackPDFGeneration(options);
  }
}

async function fallbackPDFGeneration(options: PDFGenerationOptions): Promise<boolean> {
  try {
    console.log('🔄 محاولة توليد PDF باستخدام window.print()...');
    
    // إنشاء نافذة جديدة للطباعة
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('لا يمكن فتح نافذة الطباعة');
    }
    
    printWindow.document.write(options.html);
    printWindow.document.close();
    
    // انتظار التحميل ثم الطباعة
    printWindow.onload = () => {
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    };
    
    console.log('⚠️ تم فتح نافذة الطباعة - اختر "حفظ كـ PDF" من خيارات الطباعة');
    return true;
    
  } catch (error) {
    console.error('❌ خطأ في الطريقة البديلة:', error);
    return false;
  }
}

export default generatePDF;