/**
 * نظام التتبع المتقدم للأخطاء - مخصص لتشخيص أخطاء 502 على Netlify
 * Advanced Error Tracking System - Specialized for 502 errors on Netlify
 */

import type { ErrorLog, InsertErrorLog } from "@shared/schema";
import { storage } from "../storage";

export interface NetlifyErrorContext {
  deploymentId?: string;
  buildId?: string;
  region?: string;
  functionName?: string;
  isColdStart?: boolean;
  memoryUsage?: number;
  duration?: number;
}

export interface ErrorAnalysis {
  errorPattern: string;
  possibleCauses: string[];
  solutions: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: '502_gateway' | '504_timeout' | 'cold_start' | 'memory_limit' | 'function_error' | 'unknown';
}

export class AdvancedErrorTracker {
  private errorPatterns = new Map<string, ErrorAnalysis>();

  constructor() {
    this.initializeErrorPatterns();
  }

  /**
   * تهيئة أنماط الأخطاء الشائعة وحلولها
   */
  private initializeErrorPatterns() {
    // خطأ 502 Bad Gateway
    this.errorPatterns.set('502_gateway', {
      errorPattern: '502 Bad Gateway',
      possibleCauses: [
        'الخادم الخلفي (Backend) غير متاح أو لا يستجيب',
        'مشكلة في Load Balancer أو Reverse Proxy',
        'نفاد الذاكرة في Functions',
        'خطأ في تكوين DNS أو SSL',
        'مشكلة في اتصال قاعدة البيانات'
      ],
      solutions: [
        'فحص حالة الـ backend servers',
        'إعادة تشغيل Load Balancer',
        'زيادة الذاكرة المخصصة للـ Functions',
        'فحص إعدادات DNS و SSL',
        'التحقق من اتصال قاعدة البيانات'
      ],
      priority: 'critical',
      category: '502_gateway'
    });

    // خطأ 504 Gateway Timeout
    this.errorPatterns.set('504_timeout', {
      errorPattern: '504 Gateway Timeout',
      possibleCauses: [
        'انتهاء مهلة الانتظار في الـ upstream server',
        'استعلامات قاعدة بيانات بطيئة',
        'عمليات معالجة طويلة في الـ Functions',
        'مشكلة في الشبكة أو الاتصال'
      ],
      solutions: [
        'زيادة timeout في الـ upstream server',
        'تحسين استعلامات قاعدة البيانات',
        'تقسيم العمليات الطويلة إلى مهام أصغر',
        'فحص اتصال الشبكة'
      ],
      priority: 'high',
      category: '504_timeout'
    });

    // مشكلة Cold Start
    this.errorPatterns.set('cold_start', {
      errorPattern: 'Function Cold Start',
      possibleCauses: [
        'تشغيل Function لأول مرة بعد فترة عدم نشاط',
        'عملية تهيئة طويلة للـ runtime',
        'تحميل dependencies كبيرة الحجم',
        'اتصال بقاعدة البيانات يحتاج وقت'
      ],
      solutions: [
        'استخدام Keep-Warm strategies',
        'تحسين عملية تهيئة الـ Function',
        'تقليل حجم Dependencies',
        'استخدام Connection Pooling'
      ],
      priority: 'medium',
      category: 'cold_start'
    });

    // مشكلة الذاكرة
    this.errorPatterns.set('memory_limit', {
      errorPattern: 'Memory Limit Exceeded',
      possibleCauses: [
        'استهلاك ذاكرة أكثر من الحد المسموح',
        'تسريب في الذاكرة (Memory Leaks)',
        'معالجة ملفات كبيرة الحجم',
        'كثرة العمليات المتزامنة'
      ],
      solutions: [
        'زيادة الذاكرة المخصصة للـ Function',
        'إصلاح تسريبات الذاكرة',
        'معالجة الملفات بشكل streaming',
        'تحسين إدارة الذاكرة'
      ],
      priority: 'high',
      category: 'memory_limit'
    });
  }

  /**
   * تسجيل خطأ جديد مع التحليل التلقائي
   */
  async logError(
    error: Error | string,
    context: {
      path: string;
      statusCode: number;
      userAgent?: string;
      ip?: string;
      netlifyContext?: NetlifyErrorContext;
    }
  ): Promise<ErrorLog> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'object' && error.stack ? error.stack : undefined;

    // تحليل نوع الخطأ
    const analysis = this.analyzeError(errorMessage, context.statusCode);
    
    // إنشاء سجل الخطأ
    const errorLogData: InsertErrorLog = {
      timestamp: new Date().toISOString(),
      type: analysis.category,
      path: context.path,
      error: this.formatErrorMessage(errorMessage, analysis),
      status: 'active',
      statusCode: context.statusCode,
      userAgent: context.userAgent,
      ip: context.ip,
      stack: stack
    };

    // حفظ الخطأ في قاعدة البيانات
    const savedError = await storage.createErrorLog(errorLogData);

    // تسجيل تفصيلي في الكونسول
    this.logDetailedError(savedError, analysis, context);

    return savedError;
  }

  /**
   * تحليل نمط الخطأ وتحديد النوع
   */
  private analyzeError(errorMessage: string, statusCode: number): ErrorAnalysis {
    // تحليل بناءً على status code
    if (statusCode === 502) {
      return this.errorPatterns.get('502_gateway')!;
    }
    if (statusCode === 504) {
      return this.errorPatterns.get('504_timeout')!;
    }

    // تحليل بناءً على رسالة الخطأ
    if (errorMessage.toLowerCase().includes('memory') || errorMessage.toLowerCase().includes('ذاكرة')) {
      return this.errorPatterns.get('memory_limit')!;
    }
    if (errorMessage.toLowerCase().includes('cold start') || errorMessage.toLowerCase().includes('تشغيل بارد')) {
      return this.errorPatterns.get('cold_start')!;
    }

    // خطأ غير معروف
    return {
      errorPattern: 'Unknown Error',
      possibleCauses: ['خطأ غير محدد النوع'],
      solutions: ['فحص السجلات التفصيلية', 'مراجعة الكود المصدري'],
      priority: 'medium',
      category: 'unknown'
    };
  }

  /**
   * تنسيق رسالة الخطأ مع معلومات إضافية
   */
  private formatErrorMessage(originalError: string, analysis: ErrorAnalysis): string {
    return `🚨 ${analysis.errorPattern}: ${originalError}`;
  }

  /**
   * تسجيل مفصل للخطأ في الكونسول
   */
  private logDetailedError(
    errorLog: ErrorLog, 
    analysis: ErrorAnalysis, 
    context: any
  ) {
    console.log('\n' + '='.repeat(80));
    console.log('🚨 نظام التتبع المتقدم للأخطاء - ADVANCED ERROR TRACKER 🚨');
    console.log('='.repeat(80));
    
    console.log('📅 الوقت:', new Date(errorLog.timestamp).toLocaleString('ar-SA'));
    console.log('🆔 معرف الخطأ:', errorLog.id);
    console.log('📍 المسار:', errorLog.path);
    console.log('🔢 رمز الحالة:', errorLog.statusCode);
    console.log('📱 وكيل المستخدم:', errorLog.userAgent || 'غير محدد');
    console.log('🌐 عنوان IP:', errorLog.ip || 'غير محدد');
    
    console.log('\n📋 تحليل الخطأ:');
    console.log('├─ النمط:', analysis.errorPattern);
    console.log('├─ الفئة:', analysis.category);
    console.log('├─ الأولوية:', analysis.priority);
    
    console.log('\n🔍 الأسباب المحتملة:');
    analysis.possibleCauses.forEach((cause, index) => {
      console.log(`├─ ${index + 1}. ${cause}`);
    });
    
    console.log('\n💡 الحلول المقترحة:');
    analysis.solutions.forEach((solution, index) => {
      console.log(`├─ ${index + 1}. ${solution}`);
    });

    if (context.netlifyContext) {
      console.log('\n🌐 معلومات Netlify:');
      const ctx = context.netlifyContext;
      if (ctx.deploymentId) console.log('├─ معرف النشر:', ctx.deploymentId);
      if (ctx.buildId) console.log('├─ معرف البناء:', ctx.buildId);
      if (ctx.region) console.log('├─ المنطقة:', ctx.region);
      if (ctx.functionName) console.log('├─ اسم الـ Function:', ctx.functionName);
      if (ctx.isColdStart !== undefined) console.log('├─ تشغيل بارد:', ctx.isColdStart ? 'نعم' : 'لا');
      if (ctx.memoryUsage) console.log('├─ استخدام الذاكرة:', ctx.memoryUsage, 'MB');
      if (ctx.duration) console.log('├─ المدة:', ctx.duration, 'ms');
    }

    if (errorLog.stack) {
      console.log('\n📚 تتبع المكدس:');
      console.log(errorLog.stack);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * الحصول على إحصائيات الأخطاء
   */
  async getErrorStatistics(timeRange: string = '24h') {
    const errorLogs = await storage.getErrorLogs(1000, timeRange);
    
    const stats = {
      totalErrors: errorLogs.length,
      error502Count: errorLogs.filter(log => log.statusCode === 502).length,
      error504Count: errorLogs.filter(log => log.statusCode === 504).length,
      criticalErrors: errorLogs.filter(log => {
        const analysis = this.analyzeError(log.error, log.statusCode);
        return analysis.priority === 'critical';
      }).length,
      resolvedErrors: errorLogs.filter(log => log.status === 'resolved').length,
      activeErrors: errorLogs.filter(log => log.status === 'active').length,
      errorsByCategory: {} as Record<string, number>
    };

    // تصنيف الأخطاء حسب الفئة
    errorLogs.forEach(log => {
      const analysis = this.analyzeError(log.error, log.statusCode);
      const category = analysis.category;
      stats.errorsByCategory[category] = (stats.errorsByCategory[category] || 0) + 1;
    });

    return stats;
  }

  /**
   * تحليل ذكي للاتجاهات والأنماط
   */
  async generateTrendAnalysis(timeRange: string = '24h') {
    const errorLogs = await storage.getErrorLogs(1000, timeRange);
    
    // تحليل التوقيت
    const hourlyDistribution = new Array(24).fill(0);
    errorLogs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hourlyDistribution[hour]++;
    });

    // أكثر المسارات تأثراً
    const pathFrequency: Record<string, number> = {};
    errorLogs.forEach(log => {
      pathFrequency[log.path] = (pathFrequency[log.path] || 0) + 1;
    });

    const topErrorPaths = Object.entries(pathFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    return {
      hourlyDistribution,
      topErrorPaths,
      peakHour: hourlyDistribution.indexOf(Math.max(...hourlyDistribution)),
      recommendations: this.generateRecommendations(errorLogs)
    };
  }

  /**
   * توليد توصيات ذكية بناءً على تحليل الأخطاء
   */
  private generateRecommendations(errorLogs: ErrorLog[]): string[] {
    const recommendations: string[] = [];
    
    const error502Count = errorLogs.filter(log => log.statusCode === 502).length;
    const error504Count = errorLogs.filter(log => log.statusCode === 504).length;
    
    if (error502Count > 10) {
      recommendations.push('🔴 كثرة أخطاء 502: يُنصح بفحص حالة الخوادم الخلفية وإعادة تشغيل Load Balancer');
    }
    
    if (error504Count > 5) {
      recommendations.push('🟡 مشاكل في أوقات الاستجابة: يُنصح بتحسين استعلامات قاعدة البيانات وزيادة timeout');
    }
    
    // تحليل التوقيت للأخطاء
    const recentErrors = errorLogs.filter(log => {
      const errorTime = new Date(log.timestamp).getTime();
      const now = new Date().getTime();
      return (now - errorTime) < 300000; // آخر 5 دقائق
    });
    
    if (recentErrors.length > 5) {
      recommendations.push('🚨 ارتفاع حاد في الأخطاء: يُنصح بتفعيل الوضع الطارئ ومراجعة آخر التغييرات');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ النظام يعمل بشكل طبيعي - لا توجد توصيات خاصة في الوقت الحالي');
    }
    
    return recommendations;
  }

  /**
   * إنشاء تقرير شامل عن حالة النظام
   */
  async generateSystemHealthReport() {
    const stats = await this.getErrorStatistics('24h');
    const trends = await this.generateTrendAnalysis('24h');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        ...stats,
        healthScore: this.calculateHealthScore(stats),
        status: stats.criticalErrors > 0 ? 'critical' : stats.error502Count > 10 ? 'warning' : 'healthy'
      },
      trends,
      actionItems: trends.recommendations
    };
    
    // طباعة التقرير
    this.printHealthReport(report);
    
    return report;
  }

  /**
   * حساب نقاط صحة النظام
   */
  private calculateHealthScore(stats: any): number {
    let score = 100;
    
    // خصم نقاط للأخطاء الحرجة
    score -= stats.criticalErrors * 10;
    score -= stats.error502Count * 2;
    score -= stats.error504Count * 1;
    
    // إضافة نقاط للأخطاء المحلولة
    score += stats.resolvedErrors * 0.5;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * طباعة تقرير صحة النظام
   */
  private printHealthReport(report: any) {
    console.log('\n' + '🏥 تقرير صحة النظام - SYSTEM HEALTH REPORT 🏥'.padStart(50));
    console.log('='.repeat(80));
    console.log('📊 نقاط الصحة:', report.summary.healthScore + '/100');
    console.log('🚦 الحالة:', report.summary.status);
    console.log('📈 إجمالي الأخطاء:', report.summary.totalErrors);
    console.log('🔴 أخطاء 502:', report.summary.error502Count);
    console.log('🟡 أخطاء 504:', report.summary.error504Count);
    console.log('✅ أخطاء محلولة:', report.summary.resolvedErrors);
    
    console.log('\n📋 توصيات العمل:');
    report.actionItems.forEach((item: string, index: number) => {
      console.log(`${index + 1}. ${item}`);
    });
    console.log('='.repeat(80) + '\n');
  }
}

// إنشاء مثيل واحد للاستخدام في جميع أنحاء التطبيق
export const advancedErrorTracker = new AdvancedErrorTracker();