import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { monitoringService } from "./services/monitoring";
import { diagnosticsService } from "./services/diagnostics";
import { insertErrorLogSchema, insertAlertSettingsSchema } from "@shared/schema";
import { createServer } from "http";
import { advancedErrorTracker } from "./services/advanced-error-tracker";

const router = Router();

// Health check endpoint مع معلومات Supabase
router.get("/health", async (req: Request, res: Response) => {
  const supabaseStatus = {
    url: !!process.env.SUPABASE_URL,
    serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: !!process.env.SUPABASE_ANON_KEY,
    jwtSecret: !!process.env.JWT_ACCESS_SECRET,
    connected: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  };
  
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    supabase: {
      integrated: supabaseStatus.connected,
      details: supabaseStatus
    },
    message: supabaseStatus.connected ? 
      "🚀 نظام مدمج مع Supabase وجاهز للنشر" : 
      "⚠️ يحتاج إعداد متغيرات Supabase"
  });
});

// System Metrics Routes
router.get("/api/metrics/current", async (req: Request, res: Response) => {
  try {
    const metrics = await storage.getLatestSystemMetrics();
    
    if (!metrics) {
      // Generate current metrics if none exist
      const currentMetrics = await monitoringService.getCurrentSystemMetrics();
      const savedMetrics = await storage.createSystemMetrics(currentMetrics);
      return res.json(savedMetrics);
    }
    
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching current metrics:", error);
    res.status(500).json({ error: "Failed to fetch system metrics" });
  }
});

router.get("/api/metrics/history", async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '24h';
    const metrics = await storage.getSystemMetricsHistory(timeRange);
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching metrics history:", error);
    res.status(500).json({ error: "Failed to fetch metrics history" });
  }
});

router.post("/api/metrics/update", async (req: Request, res: Response) => {
  try {
    const currentMetrics = await monitoringService.getCurrentSystemMetrics();
    const savedMetrics = await storage.createSystemMetrics(currentMetrics);
    res.json(savedMetrics);
  } catch (error) {
    console.error("Error updating metrics:", error);
    res.status(500).json({ error: "Failed to update metrics" });
  }
});

// Error Logs Routes
router.get("/api/error-logs", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const timeFilter = req.query.timeFilter as string || '24h';
    
    const errorLogs = await storage.getErrorLogs(limit, timeFilter);
    res.json(errorLogs);
  } catch (error) {
    console.error("Error fetching error logs:", error);
    res.status(500).json({ error: "Failed to fetch error logs" });
  }
});

router.post("/api/error-logs", async (req: Request, res: Response) => {
  try {
    const validatedData = insertErrorLogSchema.parse(req.body);
    const errorLog = await storage.createErrorLog(validatedData);
    res.status(201).json(errorLog);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    console.error("Error creating error log:", error);
    res.status(500).json({ error: "Failed to create error log" });
  }
});

router.patch("/api/error-logs/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['active', 'processing', 'resolved'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    const updatedLog = await storage.updateErrorLogStatus(id, status);
    res.json(updatedLog);
  } catch (error) {
    console.error("Error updating error log status:", error);
    res.status(500).json({ error: "Failed to update error log status" });
  }
});

router.get("/api/error-logs/502-count", async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '24h';
    const count = await storage.getError502Count(timeRange);
    res.json({ count, timeRange });
  } catch (error) {
    console.error("Error getting 502 error count:", error);
    res.status(500).json({ error: "Failed to get 502 error count" });
  }
});

// Diagnostics Routes
router.get("/api/diagnostics/checks", async (req: Request, res: Response) => {
  try {
    const checks = await storage.getDiagnosticChecks();
    res.json(checks);
  } catch (error) {
    console.error("Error fetching diagnostic checks:", error);
    res.status(500).json({ error: "Failed to fetch diagnostic checks" });
  }
});

router.post("/api/diagnostics/run", async (req: Request, res: Response) => {
  try {
    const results = await diagnosticsService.runFullDiagnostics();
    res.json(results);
  } catch (error) {
    console.error("Error running diagnostics:", error);
    res.status(500).json({ error: "Failed to run diagnostics" });
  }
});

router.get("/api/diagnostics/suggestions", async (req: Request, res: Response) => {
  try {
    const suggestions = await diagnosticsService.getSuggestedActions();
    res.json({ suggestions });
  } catch (error) {
    console.error("Error getting diagnostic suggestions:", error);
    res.status(500).json({ error: "Failed to get suggestions" });
  }
});

// Alert Settings Routes
router.get("/api/alert-settings", async (req: Request, res: Response) => {
  try {
    const settings = await storage.getAlertSettings();
    res.json(settings);
  } catch (error) {
    console.error("Error fetching alert settings:", error);
    res.status(500).json({ error: "Failed to fetch alert settings" });
  }
});

router.patch("/api/alert-settings", async (req: Request, res: Response) => {
  try {
    const validatedData = insertAlertSettingsSchema.partial().parse(req.body);
    const settings = await storage.updateAlertSettings(validatedData);
    res.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data", details: error.errors });
    }
    console.error("Error updating alert settings:", error);
    res.status(500).json({ error: "Failed to update alert settings" });
  }
});

// Deployment Info Routes
router.get("/api/deployment-info", async (req: Request, res: Response) => {
  try {
    const info = await storage.getDeploymentInfo();
    res.json(info);
  } catch (error) {
    console.error("Error fetching deployment info:", error);
    res.status(500).json({ error: "Failed to fetch deployment info" });
  }
});

// Quick Actions Routes
router.post("/api/actions/restart-service", async (req: Request, res: Response) => {
  try {
    // In production, this would trigger actual service restart
    console.log("Service restart requested");
    res.json({ success: true, message: "تم طلب إعادة تشغيل الخدمة" });
  } catch (error) {
    console.error("Error restarting service:", error);
    res.status(500).json({ error: "Failed to restart service" });
  }
});

router.post("/api/actions/clear-cache", async (req: Request, res: Response) => {
  try {
    // In production, this would clear actual cache
    console.log("Cache clear requested");
    res.json({ success: true, message: "تم مسح الذاكرة المؤقتة" });
  } catch (error) {
    console.error("Error clearing cache:", error);
    res.status(500).json({ error: "Failed to clear cache" });
  }
});

router.post("/api/actions/emergency-mode", async (req: Request, res: Response) => {
  try {
    // In production, this would enable emergency mode
    console.log("Emergency mode requested");
    res.json({ success: true, message: "تم تفعيل الوضع الطارئ" });
  } catch (error) {
    console.error("Error enabling emergency mode:", error);
    res.status(500).json({ error: "Failed to enable emergency mode" });
  }
});

// Advanced Error Analytics Routes
router.get("/api/analytics/error-statistics", async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '24h';
    const statistics = await advancedErrorTracker.getErrorStatistics(timeRange);
    
    console.log(`📊 تم جلب إحصائيات الأخطاء للفترة: ${timeRange}`);
    res.json({
      success: true,
      data: statistics,
      timeRange,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching error statistics:", error);
    res.status(500).json({ error: "Failed to fetch error statistics" });
  }
});

router.get("/api/analytics/trend-analysis", async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '24h';
    const trendAnalysis = await advancedErrorTracker.generateTrendAnalysis(timeRange);
    
    console.log(`📈 تم إنشاء تحليل الاتجاهات للفترة: ${timeRange}`);
    res.json({
      success: true,
      data: trendAnalysis,
      timeRange,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error generating trend analysis:", error);
    res.status(500).json({ error: "Failed to generate trend analysis" });
  }
});

router.get("/api/analytics/system-health", async (req: Request, res: Response) => {
  try {
    const healthReport = await advancedErrorTracker.generateSystemHealthReport();
    
    console.log(`🏥 تم إنشاء تقرير صحة النظام - النقاط: ${healthReport.summary.healthScore}/100`);
    res.json({
      success: true,
      data: healthReport,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error generating system health report:", error);
    res.status(500).json({ error: "Failed to generate system health report" });
  }
});

// Route لمحاكاة خطأ 502 للاختبار
router.post("/api/test/simulate-502", async (req: Request, res: Response) => {
  try {
    console.log('🧪 محاكاة خطأ 502 لأغراض الاختبار');
    
    // إنشاء خطأ وهمي
    const testError = new Error('Test 502 Bad Gateway Error - محاكاة لأغراض الاختبار');
    
    // تسجيل الخطأ باستخدام النظام المتقدم
    await advancedErrorTracker.logError(testError, {
      path: req.path,
      statusCode: 502,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      netlifyContext: {
        deploymentId: 'test-deployment-' + Date.now(),
        buildId: 'test-build-123',
        region: 'us-east-1',
        functionName: 'test-function',
        isColdStart: true,
        memoryUsage: 128,
        duration: 2000
      }
    });
    
    res.status(502).json({
      success: false,
      message: 'تم محاكاة خطأ 502 بنجاح - تم تسجيل الخطأ في النظام',
      testMode: true
    });
  } catch (error) {
    console.error("Error simulating 502:", error);
    res.status(500).json({ error: "Failed to simulate 502 error" });
  }
});

// Route لمحاكاة خطأ 504 للاختبار
router.post("/api/test/simulate-504", async (req: Request, res: Response) => {
  try {
    console.log('🧪 محاكاة خطأ 504 لأغراض الاختبار');
    
    // محاكاة تأخير طويل
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const testError = new Error('Test 504 Gateway Timeout - محاكاة انتهاء مهلة الانتظار');
    
    await advancedErrorTracker.logError(testError, {
      path: req.path,
      statusCode: 504,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      netlifyContext: {
        deploymentId: 'test-deployment-' + Date.now(),
        buildId: 'test-build-456',
        region: 'us-west-2',
        functionName: 'slow-function',
        isColdStart: false,
        memoryUsage: 256,
        duration: 30000 // 30 ثانية
      }
    });
    
    res.status(504).json({
      success: false,
      message: 'تم محاكاة خطأ 504 بنجاح - تم تسجيل انتهاء مهلة الانتظار',
      testMode: true
    });
  } catch (error) {
    console.error("Error simulating 504:", error);
    res.status(500).json({ error: "Failed to simulate 504 error" });
  }
});

// Route للحصول على آخر الأخطاء المسجلة
router.get("/api/errors/recent", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const timeRange = req.query.timeRange as string || '24h';
    
    const recentErrors = await storage.getErrorLogs(limit, timeRange);
    
    console.log(`📋 تم جلب آخر ${recentErrors.length} خطأ`);
    res.json({
      success: true,
      data: recentErrors,
      count: recentErrors.length,
      limit,
      timeRange,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching recent errors:", error);
    res.status(500).json({ error: "Failed to fetch recent errors" });
  }
});

export default router;

// اجعل registerRoutes متاحاً للتصدير أيضاً
export function registerRoutes(app: any) {
  app.use(router);
  
  // إنشاء HTTP server وإرجاعه
  const server = createServer(app);
  return server;
}
