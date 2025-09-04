/**
 * Middleware لتتبع الأخطاء المتقدم - خاص بأخطاء 502 في Netlify
 * Advanced Error Tracking Middleware - Specialized for 502 errors in Netlify
 */

import { Request, Response, NextFunction } from 'express';
import { advancedErrorTracker } from '../services/advanced-error-tracker';

/**
 * Middleware لتتبع الأخطاء تلقائياً
 */
export function errorTrackingMiddleware() {
  return async (err: any, req: Request, res: Response, next: NextFunction) => {
    try {
      // تحديد نوع الخطأ ورمز الحالة
      const statusCode = err.status || err.statusCode || 500;
      const errorMessage = err.message || 'خطأ داخلي في الخادم';

      // جمع معلومات إضافية من الطلب
      const context = {
        path: req.path,
        statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        netlifyContext: {
          deploymentId: process.env.NETLIFY_DEPLOY_ID,
          buildId: process.env.BUILD_ID,
          region: process.env.NETLIFY_REGION || process.env.AWS_REGION,
          functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
          isColdStart: !global.isWarm,
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // بالميجابايت
          duration: Date.now() - (req as any).startTime
        }
      };

      // تسجيل الخطأ باستخدام النظام المتقدم
      await advancedErrorTracker.logError(err, context);

      // إرسال استجابة مناسبة للمستخدم
      if (!res.headersSent) {
        const userFriendlyMessage = getUserFriendlyErrorMessage(statusCode);
        res.status(statusCode).json({
          success: false,
          message: userFriendlyMessage,
          timestamp: new Date().toISOString(),
          requestId: (req as any).id || 'unknown'
        });
      }

    } catch (trackingError) {
      console.error('🚨 خطأ في نظام تتبع الأخطاء:', trackingError);
      
      // إرسال استجابة أساسية في حالة فشل التتبع
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'خطأ داخلي في الخادم',
          timestamp: new Date().toISOString()
        });
      }
    }
  };
}

/**
 * Middleware لتسجيل الطلبات وإضافة معلومات التوقيت
 */
export function requestLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // إضافة وقت بداية الطلب
    (req as any).startTime = Date.now();
    
    // تسجيل بداية الطلب
    console.log(`📥 [${new Date().toLocaleTimeString('ar-SA')}] ${req.method} ${req.path} - IP: ${req.ip}`);

    // تسجيل انتهاء الطلب
    res.on('finish', () => {
      const duration = Date.now() - (req as any).startTime;
      const statusEmoji = res.statusCode >= 500 ? '🚨' : res.statusCode >= 400 ? '⚠️' : '✅';
      
      console.log(`📤 [${new Date().toLocaleTimeString('ar-SA')}] ${statusEmoji} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      
      // تسجيل تفصيلي للأخطاء
      if (res.statusCode >= 400) {
        console.log(`🔍 تفاصيل إضافية: User-Agent: ${req.get('User-Agent')}, Referer: ${req.get('Referer') || 'غير محدد'}`);
      }
    });

    // Mark the function as warm for cold start detection
    global.isWarm = true;

    next();
  };
}

/**
 * Middleware لفحص صحة النظام دورياً
 */
export function systemHealthMiddleware() {
  let lastHealthCheck = 0;
  const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 دقائق

  return async (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    
    // فحص الصحة كل 5 دقائق
    if (now - lastHealthCheck > HEALTH_CHECK_INTERVAL) {
      lastHealthCheck = now;
      
      // تشغيل فحص الصحة في الخلفية
      setImmediate(async () => {
        try {
          const healthReport = await advancedErrorTracker.generateSystemHealthReport();
          
          // إذا كانت نقاط الصحة منخفضة، سجل تنبيه
          if (healthReport.summary.healthScore < 70) {
            console.log('🚨 تحذير: نقاط صحة النظام منخفضة -', healthReport.summary.healthScore);
          }
        } catch (error) {
          console.error('خطأ في فحص صحة النظام:', error);
        }
      });
    }

    next();
  };
}

/**
 * تحويل رموز الأخطاء إلى رسائل مفهومة للمستخدم
 */
function getUserFriendlyErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 502:
      return 'عذراً، يواجه النظام مشكلة مؤقتة في الاتصال. يرجى المحاولة مرة أخرى خلال بضع دقائق.';
    case 504:
      return 'عذراً، استغرق الطلب وقتاً أطول من المتوقع. يرجى المحاولة مرة أخرى.';
    case 500:
      return 'عذراً، حدث خطأ داخلي في الخادم. فريق الدعم الفني تم إشعاره وسيتم حل المشكلة قريباً.';
    case 404:
      return 'الصفحة أو الخدمة المطلوبة غير موجودة.';
    case 403:
      return 'عذراً، ليس لديك الصلاحية للوصول إلى هذا المورد.';
    case 429:
      return 'تم تجاوز الحد المسموح للطلبات. يرجى الانتظار قليلاً قبل المحاولة مرة أخرى.';
    default:
      return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
  }
}

/**
 * تصدير middleware مدمج لسهولة الاستخدام
 */
export function setupAdvancedErrorTracking() {
  return [
    requestLoggingMiddleware(),
    systemHealthMiddleware()
  ];
}

// تعريف global type للـ isWarm flag
declare global {
  var isWarm: boolean | undefined;
}