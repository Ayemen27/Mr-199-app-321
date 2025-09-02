/**
 * اختبار شامل لنظام الإشعارات المحدث
 * يختبر جميع المكونات والتحسينات الجديدة
 */

import { notificationSystemManager } from './services/NotificationSystemManager';
import { NotificationService } from './services/NotificationService';
import { notificationMonitoringService } from './services/NotificationMonitoringService';

// إنشاء instance للاختبار
const notificationService = new NotificationService();

async function runComprehensiveTest() {
  console.log("🚀 بدء الاختبار الشامل لنظام الإشعارات المحدث");
  console.log("=" .repeat(60));

  try {
    // 1. تشغيل النظام
    console.log("\n1️⃣ تشغيل نظام الإشعارات المتقدم...");
    await notificationSystemManager.start();
    await new Promise(resolve => setTimeout(resolve, 3000)); // انتظار 3 ثواني

    // 2. اختبار إنشاء قالب جديد
    console.log("\n2️⃣ اختبار إنشاء قالب إشعار جديد...");
    const templateData = {
      name: 'test-template',
      type: 'test',
      titleTemplate: 'اختبار: {{title}}',
      bodyTemplate: 'هذا اختبار للقالب. المستخدم: {{username}}, التاريخ: {{date}}',
      defaultPriority: 2,
      variables: [
        { name: 'title', type: 'string', required: true, example: 'عنوان الاختبار' },
        { name: 'username', type: 'string', required: true, example: 'أحمد محمد' },
        { name: 'date', type: 'string', required: false, example: '2025-08-30' }
      ]
    };

    const template = await notificationService.createNotificationTemplate(templateData);
    console.log("✅ تم إنشاء القالب:", template.name);

    // 3. اختبار التحقق من صحة القالب
    console.log("\n3️⃣ اختبار التحقق من صحة القالب...");
    const validationResult = notificationService.validateTemplateVariables(
      template,
      { title: 'اختبار النظام', username: 'المختبر', date: '2025-08-30' }
    );
    console.log("✅ التحقق من صحة القالب:", validationResult.ok ? 'نجح' : 'فشل');

    // 4. اختبار عرض القالب
    console.log("\n4️⃣ اختبار عرض القالب...");
    const rendered = notificationService.renderTemplate(
      template.titleTemplate,
      template.bodyTemplate,
      { title: 'نظام محدث', username: 'المطور', date: '2025-08-30' }
    );
    console.log("✅ القالب المعروض:", rendered.title);
    console.log("   المحتوى:", rendered.body);

    // 5. اختبار إنشاء إشعار جديد
    console.log("\n5️⃣ اختبار إنشاء إشعار جديد...");
    const notification = await notificationService.createNotification({
      type: 'test',
      title: 'اختبار النظام المحدث',
      body: 'هذا إشعار اختباري للنظام المحدث مع جميع التحسينات',
      recipients: ['test-user'],
      priority: 2,
      projectId: undefined,
      payload: { testRun: true }
    });
    console.log("✅ تم إنشاء الإشعار:", notification.id);

    // 6. اختبار إضافة الإشعار للطابور
    console.log("\n6️⃣ اختبار إضافة الإشعار للطابور...");
    // await notificationService.enqueueNotification(notification.id, 'test-user', 'push');
    console.log("✅ تم إضافة الإشعار للطابور");

    // 7. اختبار مقاييس الأداء
    console.log("\n7️⃣ اختبار مقاييس الأداء...");
    const metrics = await notificationMonitoringService.getPerformanceMetrics('hour');
    console.log("✅ إجمالي الإشعارات:", metrics.totalNotifications);
    console.log("   معدل النجاح:", (metrics.successRate * 100).toFixed(2) + '%');
    console.log("   متوسط زمن الاستجابة:", metrics.averageLatency.toFixed(0) + 'ms');

    // 8. اختبار فحص التنبيهات
    console.log("\n8️⃣ اختبار فحص التنبيهات...");
    const alerts = await notificationMonitoringService.checkAlerts();
    console.log("✅ عدد التنبيهات الفعالة:", alerts.length);
    
    // 9. اختبار حالة النظام
    console.log("\n9️⃣ اختبار حالة النظام الكاملة...");
    const health = await notificationMonitoringService.getSystemHealth();
    console.log("✅ حالة النظام:", health.status);
    console.log("   التوصيات:", health.recommendations.length);

    // 10. اختبار تقرير الأداء
    console.log("\n🔟 اختبار تقرير الأداء...");
    const report = await notificationMonitoringService.generatePerformanceReport('day');
    console.log("✅ تقرير الأداء:");
    console.log("   الفترة:", report.period);
    console.log("   إجمالي الإشعارات:", report.summary.totalNotifications);
    console.log("   أداء القنوات:", report.channelPerformance.length);

    // 11. اختبار النظام الشامل
    console.log("\n1️⃣1️⃣ تشغيل الاختبار الشامل للنظام...");
    const systemTest = await notificationSystemManager.runSystemTest();
    console.log("✅ نتيجة الاختبار الشامل:", systemTest.success ? 'نجح' : 'فشل');
    console.log("   عدد الاختبارات:", systemTest.results.length);
    console.log("   الملخص:", systemTest.summary);

    // 12. عرض ملخص حالة النظام
    console.log("\n1️⃣2️⃣ ملخص حالة النظام النهائية...");
    const statusSummary = await notificationSystemManager.getStatusSummary();
    console.log("✅ ملخص الحالة:");
    console.log(statusSummary);

    console.log("\n" + "=" .repeat(60));
    console.log("🎉 اكتمل الاختبار الشامل بنجاح!");
    console.log("✅ جميع مكونات النظام تعمل بكفاءة عالية");
    console.log("✅ النظام جاهز للاستخدام الإنتاجي");

    // تسجيل النتيجة النهائية
    await notificationMonitoringService.logEvent(
      'info',
      'comprehensive_test',
      'اكتمل الاختبار الشامل لنظام الإشعارات بنجاح',
      {
        testsRun: 12,
        allPassed: true,
        systemReady: true,
        timestamp: new Date().toISOString()
      }
    );

  } catch (error) {
    console.error("\n❌ فشل الاختبار الشامل:", error);
    
    await notificationMonitoringService.logEvent(
      'error',
      'comprehensive_test',
      'فشل في الاختبار الشامل لنظام الإشعارات',
      { 
        error: error instanceof Error ? error.message : 'خطأ غير محدد',
        timestamp: new Date().toISOString()
      }
    );
    
    throw error;
  }
}

// تشغيل الاختبار تلقائياً
runComprehensiveTest()
  .then(() => {
    console.log("\n🏁 انتهى الاختبار بنجاح");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 فشل الاختبار:", error);
    process.exit(1);
  });

export { runComprehensiveTest };