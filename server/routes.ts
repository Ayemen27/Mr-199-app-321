/**
 * الوصف: نظام API الرئيسي للخادم - إدارة جميع المسارات والعمليات
 * المدخلات: طلبات HTTP من العميل
 * المخرجات: استجابات JSON مع البيانات المطلوبة
 * المالك: عمار
 * آخر تعديل: 2025-08-20
 * الحالة: نشط - النظام الأساسي للتطبيق
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { backupSystem } from "./backup-system";
import { sql } from "drizzle-orm";
import { db } from "./db";
import * as path from "path";
import * as fs from "fs";
import { 
  insertProjectSchema, insertWorkerSchema, insertFundTransferSchema, 
  insertWorkerAttendanceSchema, insertMaterialSchema, insertMaterialPurchaseSchema,
  insertTransportationExpenseSchema, insertDailyExpenseSummarySchema, insertWorkerTransferSchema,
  insertWorkerBalanceSchema, insertAutocompleteDataSchema, insertWorkerTypeSchema,
  insertWorkerMiscExpenseSchema, insertUserSchema, insertSupplierSchema, insertSupplierPaymentSchema,
  insertPrintSettingsSchema, insertProjectFundTransferSchema,
  insertReportTemplateSchema,
  // Equipment schemas (النظام المبسط)
  insertEquipmentSchema, insertEquipmentMovementSchema,
  // Notification schemas
  insertNotificationSchema,
  // Security Policy schemas (مخططات السياسات الأمنية)
  insertSecurityPolicySchema, insertSecurityPolicySuggestionSchema,
  insertSecurityPolicyImplementationSchema, insertSecurityPolicyViolationSchema
} from "@shared/schema";
import { NotificationService } from "./services/NotificationService";
import { aiSystemService } from "./services/AiSystemService";
import { securityPolicyService } from "./services/SecurityPolicyService";
import { smartErrorHandler } from './services/SmartErrorHandler';
import { secretsManager } from "./services/SecretsManager";
import { smartSecretsManager } from "./services/SmartSecretsManager";
import { 
  notifications, 
  notificationReadStates, 
  notificationQueue 
} from "@shared/schema";
import { eq, and, or, desc, inArray } from "drizzle-orm";
// Import middleware المصادقة المتقدم
import { requireAuth, requireRole, requirePermission } from "./middleware/auth.js";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // إنشاء مثيل من خدمة الإشعارات المتقدمة
  const notificationService = new NotificationService();

  // ✅ تفعيل نظام المصادقة المتقدم
  try {
    const authRoutes = await import('./routes/auth.js');
    app.use("/api/auth", authRoutes.default);
    console.log('✅ تم تفعيل نظام المصادقة المتقدم بنجاح');
  } catch (error: any) {
    console.log('⚠️ خطأ في تحميل مسارات المصادقة:', error.message);
    console.log('💡 تأكد من تنفيذ استعلامات قاعدة البيانات في Supabase');
  }
  
  // ====== مسارات إدارة قاعدة البيانات الذكية ======
  
  // جلب قائمة الجداول مع معلومات RLS (مسار محمي - يتطلب دور admin)
  app.get("/api/db-admin/tables", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const tables = await storage.getDatabaseTables();
      
      // تشغيل تحليل الأمان في الخلفية (لا ننتظره)
      storage.analyzeSecurityThreats().catch(error => {
        console.error('خطأ في تحليل التهديدات الأمنية:', error);
      });
      
      res.json(tables);
    } catch (error) {
      console.error('خطأ في جلب جداول قاعدة البيانات:', error);
      res.status(500).json({ message: "خطأ في جلب جداول قاعدة البيانات" });
    }
  });

  // تحليل التهديدات الأمنية يدوياً (مسار محمي - يتطلب دور admin)
  app.post("/api/db-admin/analyze-security", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const analysis = await storage.analyzeSecurityThreats();
      res.json(analysis);
    } catch (error) {
      console.error('خطأ في تحليل التهديدات الأمنية:', error);
      res.status(500).json({ message: "خطأ في تحليل التهديدات الأمنية" });
    }
  });

  // جلب اقتراحات السياسات لجدول محدد (مسار محمي - يتطلب دور admin)
  app.get("/api/db-admin/policy-suggestions/:tableName", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { tableName } = req.params;
      const tables = await storage.getDatabaseTables();
      const table = tables.find(t => t.table_name === tableName);
      
      if (!table) {
        return res.status(404).json({ message: "الجدول غير موجود" });
      }

      // إنشاء اقتراحات للجدول
      const suggestions = (storage as any).generatePolicySuggestions(table);
      
      res.json({
        tableName,
        securityLevel: table.security_level,
        hasExistingPolicies: table.has_policies,
        suggestions
      });
    } catch (error) {
      console.error('خطأ في جلب اقتراحات السياسات:', error);
      res.status(500).json({ message: "خطأ في جلب اقتراحات السياسات" });
    }
  });

  // تفعيل/تعطيل RLS للجدول (مسار محمي - يتطلب دور admin)
  app.post("/api/db-admin/toggle-rls", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { tableName, enable } = req.body;
      
      if (!tableName || typeof enable !== 'boolean') {
        return res.status(400).json({ message: "معطيات غير صحيحة" });
      }

      const result = await storage.toggleTableRLS(tableName, enable);
      res.json({ 
        success: true, 
        message: `تم ${enable ? 'تفعيل' : 'تعطيل'} RLS للجدول ${tableName}`,
        result 
      });
    } catch (error) {
      console.error('خطأ في تحديث RLS:', error);
      res.status(500).json({ message: "خطأ في تحديث إعدادات RLS" });
    }
  });

  // جلب سياسات RLS للجدول (مسار محمي - يتطلب دور admin)
  app.get("/api/db-admin/policies/:tableName", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { tableName } = req.params;
      const policies = await storage.getTablePolicies(tableName);
      res.json(policies);
    } catch (error) {
      console.error('خطأ في جلب سياسات الجدول:', error);
      res.status(500).json({ message: "خطأ في جلب سياسات الجدول" });
    }
  });

  // ====== مسارات إدارة المفاتيح السرية التلقائية ======
  
  // فحص حالة المفاتيح السرية الذكي (مسار محمي - يتطلب دور admin)
  app.get("/api/secrets/status", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const analysis = smartSecretsManager.analyzeSecretsStatus();
      const quickStatus = smartSecretsManager.getQuickStatus();
      
      res.json({
        success: true,
        analysis,
        quickStatus,
        message: quickStatus.allReady ? 
          "جميع المفاتيح جاهزة ومتزامنة" : 
          `${quickStatus.missingKeys.length} مفتاح يحتاج معالجة`
      });
    } catch (error) {
      console.error('خطأ في فحص حالة المفاتيح السرية:', error);
      res.status(500).json({ 
        success: false,
        message: "خطأ في فحص حالة المفاتيح السرية" 
      });
    }
  });

  // النظام الذكي لإدارة المفاتيح تلقائياً (مسار محمي - يتطلب دور admin)
  app.post("/api/secrets/auto-manage", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const result = await smartSecretsManager.autoManageSecrets();
      
      res.json({
        success: result.success,
        message: result.message,
        details: result.details,
        summary: result.summary
      });
    } catch (error) {
      console.error('خطأ في النظام الذكي لإدارة المفاتيح:', error);
      res.status(500).json({ 
        success: false,
        message: "خطأ في النظام الذكي لإدارة المفاتيح",
        error: error instanceof Error ? error.message : "خطأ غير محدد"
      });
    }
  });

  // إعادة تحميل المفاتيح من ملف .env (مسار محمي - يتطلب دور admin)
  app.post("/api/secrets/reload", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      secretsManager.reloadSecrets();
      
      res.json({
        success: true,
        message: "تم إعادة تحميل المفاتيح السرية بنجاح"
      });
    } catch (error) {
      console.error('خطأ في إعادة تحميل المفاتيح:', error);
      res.status(500).json({ 
        success: false,
        message: "خطأ في إعادة تحميل المفاتيح السرية" 
      });
    }
  });

  // إضافة مفتاح سري جديد مطلوب (مسار محمي - يتطلب دور admin)
  app.post("/api/secrets/add-required", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { name, value, description } = req.body;
      
      if (!name || !value || !description) {
        return res.status(400).json({ 
          success: false,
          message: "جميع الحقول مطلوبة: name, value, description" 
        });
      }
      
      secretsManager.addRequiredSecret(name, value, description);
      
      res.json({
        success: true,
        message: `تم إضافة المفتاح المطلوب: ${name}`
      });
    } catch (error) {
      console.error('خطأ في إضافة المفتاح المطلوب:', error);
      res.status(500).json({ 
        success: false,
        message: "خطأ في إضافة المفتاح المطلوب" 
      });
    }
  });

  // ====== مسارات السياسات الأمنية المتقدمة ======
  
  // جلب جميع السياسات الأمنية (مسار محمي - يتطلب دور admin)
  app.get("/api/security-policies", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { status, category, severity, limit } = req.query;
      const policies = await securityPolicyService.getAllPolicies({
        status: status as string,
        category: category as string, 
        severity: severity as string,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json(policies);
    } catch (error) {
      console.error('خطأ في جلب السياسات الأمنية:', error);
      res.status(500).json({ message: "خطأ في جلب السياسات الأمنية" });
    }
  });

  // إنشاء سياسة أمنية جديدة (مسار محمي - يتطلب دور admin)
  app.post("/api/security-policies", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const validation = insertSecurityPolicySchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: validation.error.errors });
      }

      const policy = await securityPolicyService.createPolicy(validation.data);
      res.status(201).json(policy);
    } catch (error) {
      console.error('خطأ في إنشاء السياسة الأمنية:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "خطأ في إنشاء السياسة الأمنية" });
    }
  });

  // تحديث سياسة أمنية (مسار محمي - يتطلب دور admin)
  app.put("/api/security-policies/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const validation = insertSecurityPolicySchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: validation.error.errors });
      }

      const updatedPolicy = await securityPolicyService.updatePolicy(id, validation.data);
      res.json(updatedPolicy);
    } catch (error) {
      console.error('خطأ في تحديث السياسة الأمنية:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "خطأ في تحديث السياسة الأمنية" });
    }
  });

  // حذف سياسة أمنية (مسار محمي - يتطلب دور admin)
  app.delete("/api/security-policies/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const result = await securityPolicyService.deletePolicy(id);
      res.json(result);
    } catch (error) {
      console.error('خطأ في حذف السياسة الأمنية:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "خطأ في حذف السياسة الأمنية" });
    }
  });

  // جلب اقتراحات السياسات (مسار محمي - يتطلب دور admin)
  app.get("/api/security-policy-suggestions", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { status, priority, category, limit } = req.query;
      const suggestions = await securityPolicyService.getPolicySuggestions({
        status: status as string,
        priority: priority as string,
        category: category as string,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json(suggestions);
    } catch (error) {
      console.error('خطأ في جلب اقتراحات السياسات:', error);
      res.status(500).json({ message: "خطأ في جلب اقتراحات السياسات" });
    }
  });

  // إنشاء اقتراح سياسة جديد (مسار محمي - يتطلب دور admin)
  app.post("/api/security-policy-suggestions", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const validation = insertSecurityPolicySuggestionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: validation.error.errors });
      }

      const suggestion = await securityPolicyService.createPolicySuggestion(validation.data);
      res.status(201).json(suggestion);
    } catch (error) {
      console.error('خطأ في إنشاء اقتراح السياسة:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "خطأ في إنشاء اقتراح السياسة" });
    }
  });

  // الموافقة على اقتراح سياسة (مسار محمي - يتطلب دور admin)
  app.post("/api/security-policy-suggestions/:id/approve", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { reviewerId = 'system' } = req.body;
      
      const result = await securityPolicyService.approvePolicySuggestion(id, reviewerId);
      res.json(result);
    } catch (error) {
      console.error('خطأ في الموافقة على الاقتراح:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "خطأ في الموافقة على الاقتراح" });
    }
  });

  // جلب انتهاكات السياسات (مسار محمي - يتطلب دور admin)
  app.get("/api/security-policy-violations", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { policyId, severity, status, limit } = req.query;
      const violations = await securityPolicyService.getPolicyViolations({
        policyId: policyId as string,
        severity: severity as string,
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json(violations);
    } catch (error) {
      console.error('خطأ في جلب انتهاكات السياسات:', error);
      res.status(500).json({ message: "خطأ في جلب انتهاكات السياسات" });
    }
  });

  // إنشاء سجل انتهاك جديد (مسار محمي - يتطلب دور admin)
  app.post("/api/security-policy-violations", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const validation = insertSecurityPolicyViolationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: validation.error.errors });
      }

      const violation = await securityPolicyService.createViolation(validation.data);
      res.status(201).json(violation);
    } catch (error) {
      console.error('خطأ في إنشاء سجل الانتهاك:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "خطأ في إنشاء سجل الانتهاك" });
    }
  });

  // إنشاء اقتراحات ذكية للسياسات (مسار محمي - يتطلب دور admin)
  app.post("/api/security-policies/generate-smart-suggestions", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const suggestions = await securityPolicyService.generateSmartSuggestions();
      res.json({ 
        message: `تم إنشاء ${suggestions.length} اقتراح ذكي للسياسات الأمنية`,
        suggestions,
        count: suggestions.length
      });
    } catch (error) {
      console.error('خطأ في إنشاء الاقتراحات الذكية:', error);
      res.status(500).json({ message: "خطأ في إنشاء الاقتراحات الذكية" });
    }
  });

  // ====== مسارات النظام الذكي ======
  
  // حالة النظام الذكي الحقيقية (مسار محمي - يتطلب دور admin)
  app.get("/api/ai-system/status", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const systemStatus = await aiSystemService.getSystemStatus();
      res.json(systemStatus);
    } catch (error) {
      console.error('خطأ في جلب حالة النظام الذكي:', error);
      res.status(500).json({ message: "خطأ في جلب حالة النظام الذكي" });
    }
  });

  // مقاييس النظام الحقيقية من قاعدة البيانات (مسار محمي - يتطلب دور admin)
  app.get("/api/ai-system/metrics", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const metrics = await aiSystemService.getSystemMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('خطأ في جلب مقاييس النظام:', error);
      res.status(500).json({ message: "خطأ في جلب مقاييس النظام" });
    }
  });

  // توصيات الذكاء الاصطناعي الحقيقية (مسار محمي)
  app.get("/api/ai-system/recommendations", requireAuth, async (req, res) => {
    try {
      // جلب التوصيات من قاعدة البيانات أولاً
      let recommendations = await storage.getAiSystemRecommendations({ status: 'active' });
      
      // التحقق من تاريخ آخر توصية لتجنب التوليد المتكرر
      const lastRecommendationTime = recommendations.length > 0 
        ? new Date(Math.max(...recommendations.map(r => new Date(r.createdAt || '').getTime())))
        : null;
      
      const shouldGenerateNew = !lastRecommendationTime || 
        (Date.now() - lastRecommendationTime.getTime()) > 30 * 60 * 1000; // 30 دقيقة
      
      // إذا لم توجد توصيات أو كانت قديمة جداً، إنشاء توصيات جديدة
      if (recommendations.length === 0 || shouldGenerateNew) {
        console.log('🔄 توليد توصيات جديدة...');
        await aiSystemService.generateRecommendations();
        recommendations = await storage.getAiSystemRecommendations({ status: 'active' });
      }
      
      res.json(recommendations);
    } catch (error) {
      console.error('خطأ في جلب التوصيات:', error);
      res.status(500).json({ message: "خطأ في جلب التوصيات" });
    }
  });

  // تشغيل/إيقاف النظام الذكي (مسار محمي - يتطلب دور admin)
  app.post("/api/ai-system/toggle", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { action } = req.body;
      
      if (action === 'start') {
        // تشغيل النظام الذكي فعلياً
        aiSystemService.startSystem();
        console.log('🤖 تم تشغيل النظام الذكي');
        res.json({ 
          success: true, 
          message: "تم بدء تشغيل النظام الذكي بنجاح",
          status: "running",
          timestamp: new Date().toISOString()
        });
      } else if (action === 'stop') {
        // إيقاف النظام الذكي فعلياً
        aiSystemService.stopSystem();
        console.log('🤖 تم إيقاف النظام الذكي');
        res.json({ 
          success: true, 
          message: "تم إيقاف النظام الذكي بنجاح",
          status: "stopped",
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({ message: "إجراء غير صالح" });
      }
    } catch (error) {
      console.error('خطأ في تبديل حالة النظام:', error);
      res.status(500).json({ message: "خطأ في تبديل حالة النظام" });
    }
  });

  // تنفيذ توصية ذكية (مسار محمي)
  app.post("/api/ai-system/execute-recommendation", requireAuth, async (req, res) => {
    try {
      const { recommendationId } = req.body;
      
      if (!recommendationId) {
        console.error('❌ لم يتم توفير معرف التوصية');
        return res.status(400).json({ message: "معرف التوصية مطلوب" });
      }
      
      console.log(`🤖 بدء تنفيذ التوصية الذكية: ${recommendationId}`);
      
      // استدعاء خدمة النظام الذكي الحقيقية
      const result = await aiSystemService.executeRecommendation(recommendationId);
      
      console.log(`✅ تم تنفيذ التوصية ${recommendationId} بنجاح`);
      
      res.json(result);
    } catch (error) {
      console.error('خطأ في تنفيذ التوصية:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "خطأ في تنفيذ التوصية" });
    }
  });

  // مسح جميع التوصيات (لحل مشكلة التكرار)
  app.post("/api/ai-system/clear-recommendations", async (req, res) => {
    try {
      const allRecommendations = await storage.getAiSystemRecommendations({});
      console.log(`🧹 مسح ${allRecommendations.length} توصية مكررة`);
      
      for (const rec of allRecommendations) {
        await storage.dismissAiSystemRecommendation(rec.id);
      }
      
      res.json({ 
        message: `تم مسح ${allRecommendations.length} توصية بنجاح`,
        cleared: allRecommendations.length 
      });
    } catch (error: any) {
      console.error('خطأ في مسح التوصيات:', error);
      res.status(500).json({ message: "خطأ في مسح التوصيات" });
    }
  });

  // === المسارات الجديدة للنظام الذكي المتطور ===
  
  // التحقق من النتائج (مسار محمي - يتطلب دور admin)
  app.post('/api/ai-system/verify-results', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { recommendationIds } = req.body;
      const recommendations = recommendationIds?.length > 0 
        ? await storage.getAiSystemRecommendations({ status: 'executed' })
        : await storage.getAiSystemRecommendations({ status: 'executed' });
      
      const results = await aiSystemService.verifyImplementationResults(recommendations);
      res.json(results);
    } catch (error) {
      console.error('خطأ في التحقق من النتائج:', error);
      res.status(500).json({ error: 'فشل في التحقق من النتائج' });
    }
  });

  // إنشاء نسخة احتياطية (مسار محمي - يتطلب دور admin)
  app.post('/api/ai-system/backup', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const backup = await aiSystemService.createSystemBackup();
      res.json(backup);
    } catch (error) {
      console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
      res.status(500).json({ error: 'فشل في إنشاء النسخة الاحتياطية' });
    }
  });

  // التراجع عن التغييرات (مسار محمي - يتطلب دور admin)
  app.post('/api/ai-system/rollback', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { backupId, targetOperations } = req.body;
      if (!backupId) {
        return res.status(400).json({ error: 'معرف النسخة الاحتياطية مطلوب' });
      }
      const results = await aiSystemService.rollbackSystemChanges(backupId, targetOperations);
      res.json(results);
    } catch (error) {
      console.error('خطأ في التراجع:', error);
      res.status(500).json({ error: 'فشل في عملية التراجع' });
    }
  });

  // إضافة مسار تطبيق الموبايل في البداية لتجنب تداخل مع Vite
  app.get("/mobile*", (req, res) => {
    try {
      // إعداد HTML لتطبيق الموبايل
      const mobileAppHtml = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>نظام إدارة المشاريع - الموبايل</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            direction: rtl;
        }
        
        .mobile-container {
            max-width: 375px;
            width: 100%;
            min-height: 100vh;
            background: white;
            border-radius: 25px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
            position: relative;
            border: 8px solid #333;
        }
        
        .status-bar {
            height: 44px;
            background: #000;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 20px;
            color: white;
            font-size: 14px;
            font-weight: bold;
        }
        
        .mobile-header {
            background: linear-gradient(135deg, #2196F3, #1976D2);
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .mobile-header h1 {
            font-size: 18px;
            margin-bottom: 5px;
        }
        
        .mobile-header p {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .mobile-content {
            padding: 30px 20px;
            text-align: center;
            min-height: 400px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 25px;
        }
        
        .icon {
            font-size: 60px;
            margin-bottom: 20px;
            opacity: 0.8;
        }
        
        .message {
            font-size: 16px;
            line-height: 1.6;
            color: #333;
        }
        
        .buttons {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-top: 20px;
        }
        
        .btn {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: block;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(76, 175, 80, 0.4);
        }
        
        .btn-secondary {
            background: linear-gradient(135deg, #2196F3, #1976D2);
        }
        
        .btn-secondary:hover {
            box-shadow: 0 5px 15px rgba(33, 150, 243, 0.4);
        }
        
        .footer {
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        
        @media (max-width: 400px) {
            .mobile-container {
                width: 100vw;
                min-height: 100vh;
                border-radius: 0;
                border: none;
            }
            
            body {
                margin: 0;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="mobile-container">
        <div class="status-bar">
            <span>⚡ 📱</span>
            <span>🔋 تطبيق الموبايل</span>
        </div>
        
        <div class="mobile-header">
            <h1>نظام إدارة المشاريع الإنشائية</h1>
            <p>📱 تطبيق الموبايل - النسخة التجريبية</p>
        </div>
        
        <div class="mobile-content">
            <div class="icon">📱</div>
            <div class="message">
                <h2>✅ تم تفعيل تطبيق الموبايل بنجاح!</h2>
                <p>هذا هو تطبيق الموبايل الخاص بك. للحصول على التطبيق الكامل مع جميع الميزات، يرجى استخدام أحد الخيارات أدناه.</p>
            </div>
            
            <div class="buttons">
                <a href="/" class="btn">🖥️ فتح تطبيق الويب الكامل</a>
                <a href="exp://127.0.0.1:19006" class="btn btn-secondary">📱 فتح التطبيق في Expo Go</a>
            </div>
        </div>
        
        <div class="footer">
            <p>🏗️ نظام إدارة المشاريع الإنشائية © 2025</p>
            <p>✅ يعمل على: ${req.headers.host}</p>
        </div>
    </div>
</body>
</html>`;
      
      res.send(mobileAppHtml);
    } catch (error) {
      console.error("Error serving mobile app:", error);
      res.status(500).json({ message: "خطأ في تشغيل تطبيق الموبايل" });
    }
  });
  
  // تم نقل تتبع الإشعارات المقروءة إلى قاعدة البيانات - حل مشكلة اختفاء الحالة عند إعادة التشغيل
  
  // مسارات المصادقة المتقدمة تم تفعيلها بنجاح في الأعلى

  // Fund Transfers (تحويلات العهدة) - قراءة عامة، كتابة محمية
  app.get("/api/fund-transfers", async (req, res) => {
    try {
      const projectId = req.query.projectId as string;
      const date = req.query.date as string;
      console.log(`🔍 جلب جميع تحويلات العهدة - المشروع: ${projectId || 'الكل'}, التاريخ: ${date || 'الكل'}`);
      const transfers = await storage.getFundTransfers(projectId, date);
      console.log(`✅ تم العثور على ${transfers.length} تحويل`);
      res.json(transfers);
    } catch (error) {
      console.error("خطأ في جلب تحويلات العهدة:", error);
      res.status(500).json({ message: "خطأ في جلب تحويلات العهدة", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
  
  // Projects - قراءة عامة، كتابة محمية
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Error fetching projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const result = insertProjectSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid project data", errors: result.error.issues });
      }
      
      // فحص عدم تكرار اسم المشروع
      const existingProject = await storage.getProjectByName(result.data.name);
      if (existingProject) {
        return res.status(400).json({ message: "يوجد مشروع بنفس الاسم مسبقاً" });
      }
      
      const project = await storage.createProject(result.data);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "خطأ في إنشاء المشروع" });
    }
  });

  // Get projects with statistics - محسن للأداء الفائق - قراءة عامة
  app.get("/api/projects/with-stats", async (req, res) => {
    try {
      console.time('projects-with-stats');
      
      const projects = await storage.getProjects();
      
      // حساب الإحصائيات بشكل متوازي مع تحسين فائق
      const projectsWithStats = await Promise.all(
        projects.map(async (project) => {
          const stats = await storage.getProjectStatistics(project.id);
          return {
            ...project,
            stats: stats
          };
        })
      );
      
      console.timeEnd('projects-with-stats');
      console.log(`⚡ تم جلب ${projectsWithStats.length} مشروع مع الإحصائيات`);
      
      res.json(projectsWithStats);
    } catch (error) {
      console.error("Error fetching projects with stats:", error);
      res.status(500).json({ message: "Error fetching project statistics" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Error fetching project" });
    }
  });

  // Get statistics for a specific project (optimized for single project)
  app.get("/api/projects/:id/stats", async (req, res) => {
    try {
      const stats = await storage.getProjectStatistics(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching project stats:", error);
      res.status(500).json({ message: "Error fetching project statistics" });
    }
  });

  // تحليل مفصل للرصيد السالب للمشروع
  app.get("/api/projects/:projectId/financial-analysis", async (req, res) => {
    try {
      const { projectId } = req.params;
      
      // جلب جميع البيانات المالية التفصيلية
      const [
        project,
        fundTransfers,
        projectTransfersIn,
        projectTransfersOut,
        workerWages,
        materialPurchases,
        transportExpenses,
        miscExpenses
      ] = await Promise.all([
        storage.getProject(projectId),
        
        db.execute(sql`
          SELECT transfer_date, amount, sender_name, notes, created_at
          FROM fund_transfers 
          WHERE project_id = ${projectId}
          ORDER BY transfer_date DESC
        `),
        
        db.execute(sql`
          SELECT transfer_date, amount, notes, from_project_id, created_at
          FROM project_fund_transfers 
          WHERE to_project_id = ${projectId}
          ORDER BY transfer_date DESC
        `),
        
        db.execute(sql`
          SELECT transfer_date, amount, notes, to_project_id, created_at
          FROM project_fund_transfers 
          WHERE from_project_id = ${projectId}
          ORDER BY transfer_date DESC
        `),
        
        db.execute(sql`
          SELECT wa.date, w.name as worker_name, wa.actual_wage, wa.created_at
          FROM worker_attendance wa
          JOIN workers w ON wa.worker_id = w.id
          WHERE wa.project_id = ${projectId}
          ORDER BY wa.date DESC
        `),
        
        db.execute(sql`
          SELECT mp.purchase_date, m.name as material_name, mp.total_amount, mp.created_at
          FROM material_purchases mp
          JOIN materials m ON mp.material_id = m.id
          WHERE mp.project_id = ${projectId}
          ORDER BY mp.purchase_date DESC
        `),
        
        db.execute(sql`
          SELECT expense_date, amount, description, created_at
          FROM transportation_expenses 
          WHERE project_id = ${projectId}
          ORDER BY expense_date DESC
        `),
        
        db.execute(sql`
          SELECT wme.expense_date, w.name as worker_name, wme.amount, wme.description, wme.created_at
          FROM worker_misc_expenses wme
          JOIN workers w ON wme.worker_id = w.id
          WHERE wme.project_id = ${projectId}
          ORDER BY wme.expense_date DESC
        `)
      ]);

      if (!project) {
        return res.status(404).json({ message: "المشروع غير موجود" });
      }

      // تحويل البيانات لتنسيق سهل القراءة
      const analysis = {
        project: {
          name: project.name,
          id: projectId,
          status: project.status,
          createdAt: project.createdAt
        },
        income: {
          fundTransfers: fundTransfers.rows.map((row: any) => ({
            date: row.transfer_date,
            amount: parseFloat(row.amount),
            sender: row.sender_name,
            notes: row.notes,
            createdAt: row.created_at
          })),
          projectTransfersIn: projectTransfersIn.rows.map((row: any) => ({
            date: row.transfer_date,
            amount: parseFloat(row.amount),
            notes: row.notes,
            fromProject: row.from_project_id,
            createdAt: row.created_at
          }))
        },
        expenses: {
          workerWages: workerWages.rows.map((row: any) => ({
            date: row.date,
            workerName: row.worker_name,
            amount: parseFloat(row.actual_wage),
            createdAt: row.created_at
          })),
          materialPurchases: materialPurchases.rows.map((row: any) => ({
            date: row.purchase_date,
            materialName: row.material_name,
            amount: parseFloat(row.total_amount),
            createdAt: row.created_at
          })),
          transportExpenses: transportExpenses.rows.map((row: any) => ({
            date: row.expense_date,
            amount: parseFloat(row.amount),
            description: row.description,
            createdAt: row.created_at
          })),
          projectTransfersOut: projectTransfersOut.rows.map((row: any) => ({
            date: row.transfer_date,
            amount: parseFloat(row.amount),
            notes: row.notes,
            toProject: row.to_project_id,
            createdAt: row.created_at
          })),
          miscExpenses: miscExpenses.rows.map((row: any) => ({
            date: row.expense_date,
            workerName: row.worker_name,
            amount: parseFloat(row.amount),
            description: row.description,
            createdAt: row.created_at
          }))
        }
      };

      // حساب الإجماليات
      const totalIncome = [
        ...analysis.income.fundTransfers,
        ...analysis.income.projectTransfersIn
      ].reduce((sum, item) => sum + item.amount, 0);

      const totalExpenses = [
        ...analysis.expenses.workerWages,
        ...analysis.expenses.materialPurchases,
        ...analysis.expenses.transportExpenses,
        ...analysis.expenses.projectTransfersOut,
        ...analysis.expenses.miscExpenses
      ].reduce((sum, item) => sum + item.amount, 0);

      const currentBalance = totalIncome - totalExpenses;

      (analysis as any).totals = {
        totalIncome,
        totalExpenses,
        currentBalance
      };

      res.json(analysis);
    } catch (error) {
      console.error('خطأ في تحليل البيانات المالية:', error);
      res.status(500).json({ message: "خطأ في تحليل البيانات المالية" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const result = insertProjectSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid project data", errors: result.error.issues });
      }
      
      // فحص عدم تكرار اسم المشروع إذا تم تغييره
      if (result.data.name) {
        const existingProject = await storage.getProjectByName(result.data.name);
        if (existingProject && existingProject.id !== req.params.id) {
          return res.status(400).json({ message: "يوجد مشروع بنفس الاسم مسبقاً" });
        }
      }
      
      const project = await storage.updateProject(req.params.id, result.data);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Error updating project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "المشروع غير موجود" });
      }
      
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "خطأ في حذف المشروع" });
    }
  });

  // إصلاح حسابات يوم محدد - Fix specific day calculations
  app.post("/api/projects/:projectId/fix-day/:date", async (req, res) => {
    try {
      const { projectId, date } = req.params;
      console.log(`🔧 إصلاح حسابات اليوم ${date} للمشروع ${projectId}`);

      // حذف البيانات القديمة الخاطئة
      await storage.deleteDailySummary(projectId, date);
      console.log(`✅ تم حذف الملخص الخاطئ لتاريخ ${date}`);

      // إعادة إنشاء البيانات الصحيحة
      await storage.updateDailySummaryForDate(projectId, date);
      console.log(`✅ تم إعادة حساب الملخص الصحيح لتاريخ ${date}`);

      // جلب البيانات الجديدة للتحقق
      const newSummary = await storage.getDailySummary(projectId, date);
      
      res.json({ 
        success: true, 
        message: `تم إصلاح حسابات ${date} بنجاح`,
        summary: newSummary 
      });
    } catch (error) {
      console.error(`❌ خطأ في إصلاح اليوم ${req.params.date}:`, error);
      res.status(500).json({ message: "خطأ في إصلاح الحسابات" });
    }
  });

  // Workers - قراءة عامة، كتابة محمية
  app.get("/api/workers", async (req, res) => {
    try {
      const workers = await storage.getWorkers();
      res.json(workers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching workers" });
    }
  });

  app.post("/api/workers", async (req, res) => {
    try {
      const result = insertWorkerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid worker data", errors: result.error.issues });
      }
      
      // فحص عدم تكرار اسم العامل
      const existingWorker = await storage.getWorkerByName(result.data.name);
      if (existingWorker) {
        return res.status(400).json({ message: "يوجد عامل بنفس الاسم مسبقاً" });
      }
      
      const worker = await storage.createWorker(result.data);
      res.status(201).json(worker);
    } catch (error) {
      console.error("Error creating worker:", error);
      res.status(500).json({ message: "خطأ في إنشاء العامل" });
    }
  });

  app.put("/api/workers/:id", async (req, res) => {
    try {
      const result = insertWorkerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid worker data", errors: result.error.issues });
      }
      
      const worker = await storage.updateWorker(req.params.id, result.data);
      if (!worker) {
        return res.status(404).json({ message: "العامل غير موجود" });
      }
      res.json(worker);
    } catch (error) {
      console.error("Error updating worker:", error);
      res.status(500).json({ message: "خطأ في تحديث العامل" });
    }
  });

  app.patch("/api/workers/:id", async (req, res) => {
    try {
      const worker = await storage.updateWorker(req.params.id, req.body);
      if (!worker) {
        return res.status(404).json({ message: "العامل غير موجود" });
      }
      res.json(worker);
    } catch (error) {
      console.error("Error updating worker:", error);
      res.status(500).json({ message: "خطأ في تحديث العامل" });
    }
  });

  app.delete("/api/workers/:id", async (req, res) => {
    try {
      await storage.deleteWorker(req.params.id);
      res.json({ message: "تم حذف العامل بنجاح" });
    } catch (error) {
      console.error("Error deleting worker:", error);
      res.status(500).json({ message: "خطأ في حذف العامل" });
    }
  });

  // Worker Types
  app.get("/api/worker-types", async (req, res) => {
    try {
      const workerTypes = await storage.getWorkerTypes();
      res.json(workerTypes);
    } catch (error) {
      console.error("Error fetching worker types:", error);
      res.status(500).json({ message: "خطأ في جلب أنواع العمال" });
    }
  });

  app.post("/api/worker-types", async (req, res) => {
    try {
      const result = insertWorkerTypeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "بيانات نوع العامل غير صالحة", errors: result.error.issues });
      }
      
      const workerType = await storage.createWorkerType(result.data);
      res.status(201).json(workerType);
    } catch (error: any) {
      console.error("Error creating worker type:", error);
      // فحص إذا كان الخطأ بسبب تكرار الاسم
      if (error.code === '23505' && error.constraint === 'worker_types_name_unique') {
        return res.status(400).json({ message: "نوع العامل موجود مسبقاً" });
      }
      res.status(500).json({ message: "خطأ في إضافة نوع العامل" });
    }
  });



  app.get("/api/projects/:projectId/fund-transfers", async (req, res) => {
    try {
      const date = req.query.date as string;
      console.log(`Getting fund transfers for project ${req.params.projectId}, date: ${date}`);
      const transfers = await storage.getFundTransfers(req.params.projectId, date);
      console.log(`Found ${transfers.length} transfers`);
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching fund transfers:", error);
      res.status(500).json({ message: "Error fetching fund transfers", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/fund-transfers", async (req, res) => {
    try {
      console.log("📝 إنشاء حولة جديدة:", req.body);
      
      const result = insertFundTransferSchema.safeParse(req.body);
      if (!result.success) {
        console.error("❌ خطأ في التحقق من البيانات:", result.error.issues);
        return res.status(400).json({ 
          message: "بيانات الحولة غير صحيحة", 
          errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')
        });
      }
      
      // محاولة إنشاء التحويل مباشرة - إذا كان هناك تكرار ستعطي قاعدة البيانات خطأ
      try {
        const transfer = await storage.createFundTransfer(result.data);
        console.log("✅ تم إنشاء الحولة بنجاح:", transfer.id);
        res.status(201).json(transfer);
      } catch (dbError: any) {
        console.error("❌ خطأ في قاعدة البيانات:", dbError);
        
        // فحص إذا كان الخطأ بسبب تكرار رقم الحوالة
        if (dbError.code === '23505' && (dbError.constraint === 'fund_transfers_transfer_number_key' || dbError.constraint === 'fund_transfers_transfer_number_unique')) {
          return res.status(400).json({ message: "يوجد تحويل بنفس رقم الحوالة مسبقاً" });
        }
        
        // معالجة أخطاء أخرى من قاعدة البيانات
        if (dbError.code === '23503') {
          return res.status(400).json({ message: "المشروع المحدد غير موجود" });
        }
        
        throw dbError; // إعادة رفع الخطأ إذا لم يكن معروف
      }
    } catch (error: any) {
      console.error("❌ خطأ عام في إنشاء الحولة:", error);
      res.status(500).json({ 
        message: error?.message || "حدث خطأ أثناء إنشاء الحولة" 
      });
    }
  });

  app.put("/api/fund-transfers/:id", async (req, res) => {
    try {
      const result = insertFundTransferSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid fund transfer data", errors: result.error.issues });
      }
      
      // محاولة تحديث التحويل مباشرة - إذا كان هناك تكرار ستعطي قاعدة البيانات خطأ
      try {
        const transfer = await storage.updateFundTransfer(req.params.id, result.data);
        res.json(transfer);
      } catch (dbError: any) {
        // فحص إذا كان الخطأ بسبب تكرار رقم الحوالة
        if (dbError.code === '23505' && dbError.constraint === 'fund_transfers_transfer_number_key') {
          return res.status(400).json({ message: "يوجد تحويل بنفس رقم الحوالة مسبقاً" });
        }
        throw dbError; // إعادة رفع الخطأ إذا لم يكن تكرار
      }
    } catch (error) {
      console.error("Error updating fund transfer:", error);
      res.status(500).json({ message: "Error updating fund transfer" });
    }
  });

  app.delete("/api/fund-transfers/:id", async (req, res) => {
    try {
      await storage.deleteFundTransfer(req.params.id);
      res.status(200).json({ message: "تم حذف العهدة بنجاح" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting fund transfer" });
    }
  });

  // Project Fund Transfers (ترحيل الأموال بين المشاريع)
  app.get("/api/project-fund-transfers", async (req, res) => {
    try {
      const fromProjectId = req.query.fromProjectId as string;
      const toProjectId = req.query.toProjectId as string;
      const date = req.query.date as string;
      
      const transfers = await storage.getProjectFundTransfers(fromProjectId, toProjectId, date);
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching project fund transfers:", error);
      res.status(500).json({ message: "خطأ في جلب عمليات ترحيل الأموال" });
    }
  });

  app.get("/api/project-fund-transfers/:id", async (req, res) => {
    try {
      const transfer = await storage.getProjectFundTransfer(req.params.id);
      if (!transfer) {
        return res.status(404).json({ message: "عملية الترحيل غير موجودة" });
      }
      res.json(transfer);
    } catch (error) {
      console.error("Error fetching project fund transfer:", error);
      res.status(500).json({ message: "خطأ في جلب عملية الترحيل" });
    }
  });

  app.post("/api/project-fund-transfers", async (req, res) => {
    try {
      const result = insertProjectFundTransferSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "بيانات عملية الترحيل غير صحيحة", 
          errors: result.error.issues 
        });
      }

      const transfer = await storage.createProjectFundTransfer(result.data);
      res.status(201).json(transfer);
    } catch (error: any) {
      console.error("Error creating project fund transfer:", error);
      res.status(500).json({ 
        message: error.message || "خطأ في إنشاء عملية الترحيل" 
      });
    }
  });

  app.put("/api/project-fund-transfers/:id", async (req, res) => {
    try {
      const result = insertProjectFundTransferSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "بيانات عملية الترحيل غير صحيحة", 
          errors: result.error.issues 
        });
      }

      const transfer = await storage.updateProjectFundTransfer(req.params.id, result.data);
      if (!transfer) {
        return res.status(404).json({ message: "عملية الترحيل غير موجودة" });
      }
      
      res.json(transfer);
    } catch (error: any) {
      console.error("Error updating project fund transfer:", error);
      res.status(500).json({ 
        message: error.message || "خطأ في تحديث عملية الترحيل" 
      });
    }
  });

  app.delete("/api/project-fund-transfers/:id", async (req, res) => {
    try {
      await storage.deleteProjectFundTransfer(req.params.id);
      res.status(200).json({ message: "تم حذف عملية الترحيل بنجاح" });
    } catch (error) {
      console.error("Error deleting project fund transfer:", error);
      res.status(500).json({ message: "خطأ في حذف عملية الترحيل" });
    }
  });

  // Worker Attendance
  app.get("/api/projects/:projectId/attendance", async (req, res) => {
    try {
      const date = req.query.date as string;
      const attendance = await storage.getWorkerAttendance(req.params.projectId, date);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Error fetching worker attendance" });
    }
  });

  app.post("/api/worker-attendance", async (req, res) => {
    try {
      console.log("Received attendance data:", req.body);
      const result = insertWorkerAttendanceSchema.safeParse(req.body);
      if (!result.success) {
        console.log("Validation failed:", result.error.issues);
        return res.status(400).json({ message: "Invalid attendance data", errors: result.error.issues });
      }
      
      console.log("Creating attendance with data:", result.data);
      const attendance = await storage.createWorkerAttendance(result.data);
      console.log("Attendance created successfully:", attendance);
      
      // تحديث الملخص اليومي بعد إضافة الحضور
      setImmediate(() => {
        storage.updateDailySummaryForDate(attendance.projectId, attendance.date)
          .catch(error => console.error("Error updating daily summary after attendance:", error));
      });
      
      res.status(201).json(attendance);
    } catch (error) {
      console.error("Error creating worker attendance:", error);
      res.status(500).json({ 
        message: "حدث خطأ أثناء حفظ الحضور", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.get("/api/worker-attendance/:id", async (req, res) => {
    try {
      const attendance = await storage.getWorkerAttendanceById(req.params.id);
      if (!attendance) {
        return res.status(404).json({ message: "Worker attendance not found" });
      }
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Error fetching worker attendance" });
    }
  });

  app.delete("/api/worker-attendance/:id", async (req, res) => {
    try {
      // الحصول على بيانات الحضور قبل حذفه لتحديث الملخص اليومي
      const attendance = await storage.getWorkerAttendanceById(req.params.id);
      
      await storage.deleteWorkerAttendance(req.params.id);
      
      // تحديث الملخص اليومي بعد حذف الحضور
      if (attendance) {
        setImmediate(() => {
          storage.updateDailySummaryForDate(attendance.projectId, attendance.date)
            .catch(error => console.error("Error updating daily summary after attendance deletion:", error));
        });
      }
      
      res.status(200).json({ message: "تم حذف حضور العامل بنجاح" });
    } catch (error) {
      console.error("Error deleting worker attendance:", error);
      res.status(500).json({ message: "حدث خطأ أثناء حذف الحضور" });
    }
  });

  // Worker Attendance Filter (for Workers Filter Report)
  app.get("/api/worker-attendance-filter", async (req, res) => {
    try {
      const { workerId, dateFrom, dateTo } = req.query;
      console.log("Worker filter request:", { workerId, dateFrom, dateTo });
      
      if (!workerId) {
        return res.status(400).json({ message: "Worker ID is required" });
      }

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ message: "Date range is required" });
      }

      // Get worker attendance across all projects for the worker
      const projects = await storage.getProjects();
      const allAttendance = [];
      
      for (const project of projects) {
        try {
          // Get attendance for each day in the date range
          const fromDate = new Date(dateFrom as string);
          const toDate = new Date(dateTo as string);
          
          for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            try {
              const dayAttendance = await storage.getWorkerAttendance(project.id, dateStr);
              const workerDayAttendance = dayAttendance.filter((attendance: any) => attendance.workerId === workerId);
              allAttendance.push(...workerDayAttendance);
            } catch (dayError) {
              // Skip days with no data
              console.log(`No attendance data for ${dateStr} in project ${project.id}`);
            }
          }
        } catch (projectError) {
          console.error(`Error processing project ${project.id}:`, projectError);
        }
      }

      console.log(`Found ${allAttendance.length} attendance records for worker ${workerId}`);
      res.json(allAttendance);
    } catch (error) {
      console.error("Error fetching worker attendance:", error);
      res.status(500).json({ message: "Error fetching worker attendance", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get worker attendance with project details for filtering
  app.get("/api/worker-attendance/by-projects", async (req, res) => {
    try {
      const { projectIds, dateFrom, dateTo } = req.query;
      console.log("🔍 طلب جلب سجلات الحضور:", { projectIds, dateFrom, dateTo });
      
      if (!projectIds) {
        return res.status(400).json({ message: "مطلوب معرفات المشاريع" });
      }

      // تقسيم معرفات المشاريع
      const projectIdArray = (projectIds as string).split(',').filter(id => id.trim());
      console.log("🎯 المشاريع المحددة:", projectIdArray);
      
      if (projectIdArray.length === 0) {
        return res.json([]);
      }

      const allAttendanceRecords = [];
      
      // جلب بيانات المشاريع والعمال
      const projects = await storage.getProjects();
      const workers = await storage.getWorkers();
      
      // إنشاء خرائط للبحث السريع
      const projectMap = new Map(projects.map(p => [p.id, p]));
      const workerMap = new Map(workers.map(w => [w.id, w]));
      
      for (const projectId of projectIdArray) {
        const project = projectMap.get(projectId);
        if (!project) {
          console.log(`⚠️ مشروع غير موجود: ${projectId}`);
          continue;
        }

        try {
          // جلب جميع سجلات الحضور للمشروع
          let projectAttendance = [];
          
          if (dateFrom && dateTo) {
            // إذا تم تحديد تواريخ معينة
            const fromDate = new Date(dateFrom as string);
            const toDate = new Date(dateTo as string);
            
            for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
              const dateStr = d.toISOString().split('T')[0];
              try {
                const dayAttendance = await storage.getWorkerAttendance(projectId, dateStr);
                projectAttendance.push(...dayAttendance);
              } catch (dayError) {
                // تجاهل الأيام التي لا تحتوي على بيانات
              }
            }
          } else {
            // جلب جميع السجلات (آخر 30 يوم)
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            
            for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
              const dateStr = d.toISOString().split('T')[0];
              try {
                const dayAttendance = await storage.getWorkerAttendance(projectId, dateStr);
                projectAttendance.push(...dayAttendance);
              } catch (dayError) {
                // تجاهل الأيام التي لا تحتوي على بيانات
              }
            }
          }
          
          // إضافة تفاصيل المشروع والعامل
          for (const attendance of projectAttendance) {
            const worker = workerMap.get(attendance.workerId);
            if (worker) {
              allAttendanceRecords.push({
                id: attendance.id,
                workerId: attendance.workerId,
                workerName: worker.name,
                workerType: worker.type,
                projectId: projectId,
                projectName: project.name,
                date: attendance.date,
                dailyWage: Number(attendance.dailyWage) || 0,
                actualWage: Number(attendance.actualWage) || 0,
                paidAmount: Number(attendance.paidAmount) || 0,
                remainingAmount: Number(attendance.remainingAmount) || 0,
                isPresent: attendance.isPresent,
                workDays: Number(attendance.workDays) || 0
              });
            }
          }
          
        } catch (projectError) {
          console.error(`⛔ خطأ في معالجة المشروع ${projectId}:`, projectError);
        }
      }

      console.log(`✅ تم جلب ${allAttendanceRecords.length} سجل حضور`);
      res.json(allAttendanceRecords);
    } catch (error) {
      console.error("⛔ خطأ في جلب سجلات الحضور:", error);
      res.status(500).json({ message: "خطأ في جلب سجلات الحضور", error: error instanceof Error ? error.message : 'خطأ غير معروف' });
    }
  });

  // Materials
  app.get("/api/materials", async (req, res) => {
    try {
      const materials = await storage.getMaterials();
      res.json(materials);
    } catch (error) {
      res.status(500).json({ message: "Error fetching materials" });
    }
  });

  app.post("/api/materials", async (req, res) => {
    try {
      const result = insertMaterialSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid material data", errors: result.error.issues });
      }
      
      const material = await storage.createMaterial(result.data);
      res.status(201).json(material);
    } catch (error) {
      res.status(500).json({ message: "Error creating material" });
    }
  });

  // Material Purchases
  app.get("/api/projects/:projectId/material-purchases", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const purchases = await storage.getMaterialPurchases(
        req.params.projectId,
        dateFrom as string,
        dateTo as string
      );
      res.json(purchases);
    } catch (error) {
      res.status(500).json({ message: "Error fetching material purchases" });
    }
  });

  app.post("/api/material-purchases", async (req, res) => {
    try {
      // التحقق من البيانات المطلوبة مع رسائل تفصيلية
      const { materialName, materialCategory, materialUnit, ...purchaseData } = req.body;
      
      // التحقق من البيانات الأساسية بشكل تفصيلي
      const validationErrors = [];
      
      if (!materialName || materialName.trim() === '') {
        validationErrors.push("اسم المادة مطلوب");
      }
      
      if (!materialUnit || materialUnit.trim() === '') {
        validationErrors.push("وحدة القياس مطلوبة");
      }
      
      if (!purchaseData.quantity || isNaN(Number(purchaseData.quantity)) || Number(purchaseData.quantity) <= 0) {
        validationErrors.push("يجب إدخال كمية صحيحة أكبر من صفر");
      }
      
      if (!purchaseData.unitPrice || isNaN(Number(purchaseData.unitPrice)) || Number(purchaseData.unitPrice) <= 0) {
        validationErrors.push("يجب إدخال سعر وحدة صحيح أكبر من صفر");
      }
      
      if (!purchaseData.projectId || purchaseData.projectId.trim() === '') {
        validationErrors.push("يجب اختيار مشروع");
      }
      
      if (!purchaseData.purchaseDate) {
        validationErrors.push("تاريخ الشراء مطلوب");
      }
      
      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          message: "يرجى إصلاح الأخطاء التالية:",
          details: validationErrors,
          validationErrors: validationErrors
        });
      }
      
      // Create or find the material first
      let material = await storage.findMaterialByNameAndUnit(materialName, materialUnit);
      if (!material) {
        material = await storage.createMaterial({
          name: materialName.trim(),
          category: materialCategory?.trim() || "عام",
          unit: materialUnit.trim()
        });
      }
      
      // إعداد البيانات مع القيم الافتراضية المحسنة
      const purchaseDataWithMaterialId = {
        ...purchaseData,
        materialId: material.id,
        purchaseType: purchaseData.purchaseType || "نقد", // ضمان وجود قيمة
        paidAmount: purchaseData.purchaseType === "نقد" ? purchaseData.totalAmount : 0,
        remainingAmount: purchaseData.purchaseType === "آجل" ? purchaseData.totalAmount : 0,
      };
      
      const result = insertMaterialPurchaseSchema.safeParse(purchaseDataWithMaterialId);
      if (!result.success) {
        console.log("Schema validation errors:", result.error.issues);
        const userFriendlyErrors = result.error.issues.map(issue => {
          const field = issue.path.join('.');
          switch(field) {
            case 'quantity': return 'الكمية يجب أن تكون رقم موجب';
            case 'unitPrice': return 'سعر الوحدة يجب أن يكون رقم موجب';
            case 'totalAmount': return 'المبلغ الإجمالي غير صحيح';
            case 'paidAmount': return 'المبلغ المدفوع غير صحيح';
            case 'remainingAmount': return 'المبلغ المتبقي غير صحيح';
            case 'projectId': return 'يجب اختيار مشروع صحيح';
            case 'materialId': return 'معرف المادة غير صحيح';
            case 'purchaseDate': return 'تاريخ الشراء غير صحيح';
            case 'purchaseType': return 'نوع الشراء يجب أن يكون "نقد" أو "آجل"';
            default: return `خطأ في الحقل ${field}: ${issue.message}`;
          }
        });
        
        return res.status(400).json({ 
          message: "يرجى إصلاح الأخطاء التالية:",
          details: userFriendlyErrors,
          validationErrors: userFriendlyErrors
        });
      }
      
      const purchase = await storage.createMaterialPurchase(result.data);
      res.status(201).json(purchase);
    } catch (error: any) {
      console.error("Error creating material purchase:", error);
      
      // التحقق من نوع الخطأ وإرجاع رسالة مناسبة ومفصلة
      if (error.code === '23505') {
        const constraintName = error.constraint || '';
        if (constraintName.includes('invoice')) {
          return res.status(400).json({ 
            message: "رقم الفاتورة مستخدم مسبقاً",
            details: ["يرجى استخدام رقم فاتورة مختلف أو تركه فارغاً"]
          });
        }
        return res.status(400).json({ 
          message: "يوجد مشترى مكرر بنفس البيانات",
          details: ["يرجى التحقق من البيانات المدخلة"]
        });
      }
      
      if (error.code === '23503') {
        return res.status(400).json({ 
          message: "المشروع المحدد غير موجود",
          details: ["يرجى اختيار مشروع صحيح من القائمة"]
        });
      }
      
      if (error.code === '23514') {
        return res.status(400).json({ 
          message: "قيم البيانات غير صحيحة",
          details: ["يرجى التحقق من أن جميع الأرقام موجبة والتواريخ صحيحة"]
        });
      }
      
      // خطأ في الاتصال بقاعدة البيانات
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return res.status(503).json({ 
          message: "مشكلة في الاتصال بقاعدة البيانات",
          details: ["يرجى المحاولة مرة أخرى، إذا استمرت المشكلة تواصل مع الدعم الفني"]
        });
      }
      
      res.status(500).json({ 
        message: "حدث خطأ غير متوقع أثناء حفظ شراء المواد",
        details: ["يرجى المحاولة مرة أخرى، إذا استمرت المشكلة تواصل مع الدعم الفني"]
      });
    }
  });

  app.put("/api/material-purchases/:id", async (req, res) => {
    try {
      // التحقق من البيانات المطلوبة
      const { materialName, materialCategory, materialUnit, ...purchaseData } = req.body;
      
      if (!materialName || !materialUnit) {
        return res.status(400).json({ message: "اسم المادة ووحدة القياس مطلوبان" });
      }
      
      if (!purchaseData.quantity || !purchaseData.unitPrice) {
        return res.status(400).json({ message: "الكمية وسعر الوحدة مطلوبان" });
      }
      
      // Create or find the material first (if material details changed)
      let material = await storage.findMaterialByNameAndUnit(materialName, materialUnit);
      if (!material) {
        material = await storage.createMaterial({
          name: materialName.trim(),
          category: materialCategory?.trim() || "عام",
          unit: materialUnit.trim()
        });
      }
      
      // Update the purchase with the material ID
      const purchaseDataWithMaterialId = {
        ...purchaseData,
        materialId: material.id
      };
      
      const result = insertMaterialPurchaseSchema.safeParse(purchaseDataWithMaterialId);
      if (!result.success) {
        const errorMessages = result.error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ');
        return res.status(400).json({ 
          message: `بيانات غير صحيحة: ${errorMessages}`,
          errors: result.error.issues 
        });
      }
      
      const purchase = await storage.updateMaterialPurchase(req.params.id, result.data);
      if (!purchase) {
        return res.status(404).json({ message: "شراء المواد غير موجود" });
      }
      
      res.json(purchase);
    } catch (error: any) {
      console.error("Error updating material purchase:", error);
      
      // التحقق من نوع الخطأ وإرجاع رسالة مناسبة
      if (error.code === '23505') {
        return res.status(400).json({ message: "يوجد مشترى مكرر بنفس البيانات" });
      }
      
      if (error.code === '23503') {
        return res.status(400).json({ message: "المشروع أو المادة المحددة غير موجودة" });
      }
      
      res.status(500).json({ message: "حدث خطأ أثناء تحديث شراء المواد" });
    }
  });

  // Get all material purchases with filters
  app.get("/api/material-purchases", async (req, res) => {
    try {
      const { supplierId, projectId, dateFrom, dateTo, purchaseType } = req.query;
      console.log("Material purchases filter request:", { supplierId, projectId, dateFrom, dateTo, purchaseType });
      
      // أولاً: فحص إجمالي المشتريات في قاعدة البيانات
      const { materialPurchases } = await import("@shared/schema");
      const allPurchases = await db.select().from(materialPurchases).limit(5);
      console.log(`📊 Total material purchases in DB: ${allPurchases.length}`);
      if (allPurchases.length > 0) {
        console.log("Sample purchase:", {
          id: allPurchases[0].id,
          supplierId: allPurchases[0].supplierId,
          supplierName: allPurchases[0].supplierName,
          projectId: allPurchases[0].projectId
        });
      }
      
      // استخدام دالة storage للحصول على جميع المشتريات مع الفلاتر
      const purchases = await storage.getMaterialPurchasesWithFilters({
        supplierId: supplierId as string,
        projectId: projectId as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        purchaseType: purchaseType as string
      });
      
      // طباعة عينة من البيانات للتحقق من قيم purchaseType
      if (purchases.length > 0) {
        console.log('🔍 عينة من مشتريات المواد:', {
          total: purchases.length,
          first3: purchases.slice(0, 3).map(p => ({
            id: p.id,
            purchaseType: p.purchaseType,
            purchaseTypeValue: JSON.stringify(p.purchaseType),
            totalAmount: p.totalAmount,
            supplierName: p.supplierName
          }))
        });
        
        // عرض جميع القيم الفريدة لـ purchaseType
        const uniqueTypes = Array.from(new Set(purchases.map(p => p.purchaseType)));
        console.log('🏷️ جميع قيم purchaseType في المشتريات:', uniqueTypes.map(t => `"${t}"`));
      }
      
      console.log(`Found ${purchases.length} material purchases`);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching material purchases:", error);
      res.status(500).json({ message: "Error fetching material purchases" });
    }
  });

  app.get("/api/material-purchases/:id", async (req, res) => {
    // التحقق إذا كان المسار هو date-range
    if (req.params.id === 'date-range') {
      try {
        const dateRange = await storage.getMaterialPurchasesDateRange();
        res.json(dateRange);
        return;
      } catch (error) {
        console.error("Error fetching material purchases date range:", error);
        res.status(500).json({ message: "Error fetching date range" });
        return;
      }
    }
    
    // إذا لم يكن date-range، فهو ID عادي
    try {
      const purchase = await storage.getMaterialPurchaseById(req.params.id);
      if (!purchase) {
        return res.status(404).json({ message: "Material purchase not found" });
      }
      res.json(purchase);
    } catch (error) {
      res.status(500).json({ message: "Error fetching material purchase" });
    }
  });

  app.delete("/api/material-purchases/:id", async (req, res) => {
    try {
      await storage.deleteMaterialPurchase(req.params.id);
      res.status(200).json({ message: "تم حذف شراء المواد بنجاح" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting material purchase" });
    }
  });

  // Transportation Expenses
  app.get("/api/transportation-expenses", async (req, res) => {
    try {
      const expenses = await storage.getAllTransportationExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Error fetching transportation expenses" });
    }
  });

  app.get("/api/projects/:projectId/transportation-expenses", async (req, res) => {
    try {
      const date = req.query.date as string;
      const expenses = await storage.getTransportationExpenses(req.params.projectId, date);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Error fetching transportation expenses" });
    }
  });

  app.post("/api/transportation-expenses", async (req, res) => {
    try {
      const result = insertTransportationExpenseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid transportation expense data", errors: result.error.issues });
      }
      
      const expense = await storage.createTransportationExpense(result.data);
      res.status(201).json(expense);
    } catch (error) {
      res.status(500).json({ message: "Error creating transportation expense" });
    }
  });

  app.put("/api/transportation-expenses/:id", async (req, res) => {
    try {
      const result = insertTransportationExpenseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid transportation expense data", errors: result.error.issues });
      }
      
      const expense = await storage.updateTransportationExpense(req.params.id, result.data);
      if (!expense) {
        return res.status(404).json({ message: "Transportation expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Error updating transportation expense" });
    }
  });

  app.delete("/api/transportation-expenses/:id", async (req, res) => {
    try {
      await storage.deleteTransportationExpense(req.params.id);
      res.status(200).json({ message: "تم حذف مصروف المواصلات بنجاح" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting transportation expense" });
    }
  });

  // Daily Expense Summaries
  app.get("/api/projects/:projectId/daily-summary/:date", async (req, res) => {
    try {
      const summary = await storage.getDailyExpenseSummary(req.params.projectId, req.params.date);
      if (!summary) {
        return res.status(404).json({ message: "Daily summary not found" });
      }
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Error fetching daily summary" });
    }
  });

  // إعادة حساب الملخص اليومي
  app.put("/api/projects/:projectId/daily-summary/:date", async (req, res) => {
    try {
      await storage.updateDailySummaryForDate(req.params.projectId, req.params.date);
      const summary = await storage.getDailyExpenseSummary(req.params.projectId, req.params.date);
      res.json({ message: "تم إعادة حساب الملخص اليومي بنجاح", summary });
    } catch (error) {
      console.error("Error recalculating daily summary:", error);
      res.status(500).json({ message: "خطأ في إعادة حساب الملخص اليومي" });
    }
  });

  app.get("/api/projects/:projectId/previous-balance/:date", async (req, res) => {
    try {
      const balance = await storage.getPreviousDayBalance(req.params.projectId, req.params.date);
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ message: "Error fetching previous day balance" });
    }
  });

  // إجبار تحديث الملخص اليومي لتاريخ معين
  app.post("/api/projects/:projectId/update-daily-summary/:date", async (req, res) => {
    try {
      await storage.updateDailySummaryForDate(req.params.projectId, req.params.date);
      res.json({ message: "تم تحديث الملخص اليومي بنجاح" });
    } catch (error) {
      console.error("Error updating daily summary:", error);
      res.status(500).json({ message: "Error updating daily summary" });
    }
  });

  // إعادة حساب جميع الأرصدة لمشروع معين
  app.post("/api/projects/:projectId/recalculate-balances", async (req, res) => {
    try {
      await storage.recalculateAllBalances(req.params.projectId);
      res.json({ message: "تم إعادة حساب جميع الأرصدة بنجاح" });
    } catch (error) {
      console.error("Error recalculating balances:", error);
      res.status(500).json({ message: "خطأ في إعادة حساب الأرصدة" });
    }
  });

  app.post("/api/daily-expense-summaries", async (req, res) => {
    try {
      const result = insertDailyExpenseSummarySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid daily summary data", errors: result.error.issues });
      }
      
      const summary = await storage.createOrUpdateDailyExpenseSummary(result.data);
      res.status(201).json(summary);
    } catch (error) {
      res.status(500).json({ message: "Error creating daily summary" });
    }
  });

  // Reports
  app.get("/api/reports/daily-expenses/:projectId/:date", async (req, res) => {
    try {
      const { projectId, date } = req.params;
      
      console.log(`🟦 Generating daily expense report for project ${projectId}, date ${date}`);
      
      // جلب معلومات المشروع أولاً
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const [
        fundTransfers,
        workerAttendance,
        materialPurchases, 
        transportationExpenses,
        workerTransfers,
        workerMiscExpenses,
        dailySummary,
        incomingProjectTransfers,
        outgoingProjectTransfers
      ] = await Promise.all([
        storage.getFundTransfers(projectId, date),
        storage.getWorkerAttendance(projectId, date),
        storage.getMaterialPurchases(projectId, date, date),
        storage.getTransportationExpenses(projectId, date),
        storage.getFilteredWorkerTransfers(projectId, date),
        storage.getWorkerMiscExpenses(projectId, date),
        storage.getDailyExpenseSummary(projectId, date),
        storage.getProjectFundTransfers(undefined, projectId, date), // الأموال الواردة
        storage.getProjectFundTransfers(projectId, undefined, date) // الأموال الصادرة
      ]);

      console.log(`📊 Data found for ${date}:`);
      console.log(`  - Fund transfers: ${fundTransfers.length}`);
      console.log(`  - Worker attendance: ${workerAttendance.length}`);
      console.log(`  - Material purchases: ${materialPurchases.length}`);
      console.log(`  - Transportation expenses: ${transportationExpenses.length}`);
      console.log(`  - Worker transfers: ${workerTransfers.length}`);
      console.log(`  - Worker misc expenses: ${workerMiscExpenses.length}`);
      console.log(`  - Incoming project transfers: ${incomingProjectTransfers.length}`);
      console.log(`  - Outgoing project transfers: ${outgoingProjectTransfers.length}`);

      // حساب الرصيد المرحل (من اليوم السابق)
      const prevDate = new Date(date);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateString = prevDate.toISOString().split('T')[0];
      const prevDailySummary = await storage.getDailyExpenseSummary(projectId, prevDateString);
      const carriedForward = prevDailySummary?.remainingBalance || 0;

      // حساب الإجماليات
      const totalFundTransfers = fundTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalWorkerCosts = workerAttendance.reduce((sum, a) => sum + parseFloat(a.paidAmount), 0);
      // فقط المشتريات النقدية تُحسب في مصروفات اليوم - المشتريات الآجلة لا تُحسب
      const totalMaterialCosts = materialPurchases
        .filter(p => p.purchaseType === "نقد")
        .reduce((sum, p) => sum + parseFloat(p.totalAmount), 0);
      const totalTransportCosts = transportationExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const totalTransferCosts = workerTransfers.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      const totalWorkerMiscCosts = workerMiscExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
      // حساب إجماليات ترحيل الأموال بين المشاريع
      const totalIncomingTransfers = incomingProjectTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalOutgoingTransfers = outgoingProjectTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const totalExpenses = totalWorkerCosts + totalMaterialCosts + totalTransportCosts + totalTransferCosts + totalWorkerMiscCosts + totalOutgoingTransfers;
      const totalIncome = totalFundTransfers + totalIncomingTransfers;
      const remainingBalance = parseFloat(carriedForward.toString()) + totalIncome - totalExpenses;

      // إضافة معلومات العمال للحضور
      const workerAttendanceWithWorkers = await Promise.all(
        workerAttendance.map(async (attendance) => {
          const worker = await storage.getWorker(attendance.workerId);
          return {
            ...attendance,
            worker
          };
        })
      );

      // إضافة معلومات المواد للمشتريات
      const materialPurchasesWithMaterials = await Promise.all(
        materialPurchases.map(async (purchase) => {
          const materials = await storage.getMaterials();
          const material = materials.find(m => m.id === purchase.materialId);
          return {
            ...purchase,
            material
          };
        })
      );

      // إضافة معلومات العمال لمصروفات النقل
      const transportationExpensesWithWorkers = await Promise.all(
        transportationExpenses.map(async (expense) => {
          const worker = expense.workerId ? await storage.getWorker(expense.workerId) : null;
          return {
            ...expense,
            worker
          };
        })
      );

      // إضافة معلومات العمال لحوالات العمال
      const workerTransfersWithWorkers = await Promise.all(
        workerTransfers.map(async (transfer) => {
          const worker = await storage.getWorker(transfer.workerId);
          return {
            ...transfer,
            worker
          };
        })
      );

      // إضافة معلومات العمال لنثريات العمال (نثريات عامة للمشروع)
      const workerMiscExpensesWithWorkers = workerMiscExpenses.map((expense) => ({
        ...expense,
        workerName: 'نثريات عامة', // نثريات العمال ليست مربوطة بعامل محدد
        worker: null
      }));

      // إضافة معلومات المشاريع لترحيل الأموال الواردة
      const incomingProjectTransfersWithProjects = await Promise.all(
        incomingProjectTransfers.map(async (transfer) => {
          const fromProject = await storage.getProject(transfer.fromProjectId);
          return {
            ...transfer,
            fromProjectName: fromProject?.name || `مشروع ${transfer.fromProjectId}`,
            transferReference: transfer.id.slice(-8).toUpperCase(),
            transferNotes: transfer.description || `أموال مرحلة من مشروع ${fromProject?.name || transfer.fromProjectId} بتاريخ ${transfer.transferDate}`,
            transferReason: transfer.transferReason || 'ترحيل أموال بين المشاريع'
          };
        })
      );

      // إضافة معلومات المشاريع لترحيل الأموال الصادرة
      const outgoingProjectTransfersWithProjects = await Promise.all(
        outgoingProjectTransfers.map(async (transfer) => {
          const toProject = await storage.getProject(transfer.toProjectId);
          return {
            ...transfer,
            toProjectName: toProject?.name || `مشروع ${transfer.toProjectId}`,
            transferReference: transfer.id.slice(-8).toUpperCase(),
            transferNotes: transfer.description || `أموال مرحلة إلى مشروع ${toProject?.name || transfer.toProjectId} بتاريخ ${transfer.transferDate}`,
            transferReason: transfer.transferReason || 'ترحيل أموال بين المشاريع'
          };
        })
      );

      res.json({
        date,
        projectId,
        projectName: project.name, // إضافة اسم المشروع
        
        // البيانات الأساسية بالتنسيق الذي يتوقعه القالب
        fundTransfers,
        workerAttendance: workerAttendanceWithWorkers,
        materialPurchases: materialPurchasesWithMaterials,
        transportationExpenses: transportationExpensesWithWorkers,
        workerTransfers: workerTransfersWithWorkers,
        miscExpenses: workerMiscExpensesWithWorkers, // تغيير الاسم ليتطابق مع القالب
        
        // ترحيل الأموال بين المشاريع
        incomingProjectTransfers: incomingProjectTransfersWithProjects,
        outgoingProjectTransfers: outgoingProjectTransfersWithProjects,
        totalIncomingTransfers,
        totalOutgoingTransfers,
        
        // الملخص المالي في المستوى الأعلى (كما يتوقعه القالب)
        carriedForward,
        totalIncome,
        totalExpenses,
        remainingBalance,
        
        // تفاصيل إضافية للتقرير
        dailySummary,
        summary: {
          carriedForward,
          totalFundTransfers,
          totalWorkerCosts,
          totalMaterialCosts,
          totalTransportCosts,
          totalTransferCosts,
          totalWorkerMiscCosts,
          totalIncome,
          totalExpenses,
          remainingBalance
        }
      });
    } catch (error) {
      console.error("Error generating daily expenses report:", error);
      res.status(500).json({ message: "Error generating daily expenses report" });
    }
  });

  app.get("/api/reports/material-purchases/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const { dateFrom, dateTo } = req.query;
      
      const purchases = await storage.getMaterialPurchases(
        projectId, 
        dateFrom as string, 
        dateTo as string
      );
      
      res.json({
        projectId,
        dateFrom,
        dateTo,
        purchases
      });
    } catch (error) {
      console.error("Error generating material purchases report:", error);
      res.status(500).json({ message: "Error generating material purchases report" });
    }
  });

  app.get("/api/reports/project-summary/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const { dateFrom, dateTo } = req.query;
      
      const [
        project,
        totalFundTransfers,
        totalWorkerAttendance,
        totalMaterialPurchases,
        totalTransportationExpenses,
        totalWorkerTransfers
      ] = await Promise.all([
        storage.getProject(projectId),
        storage.getFundTransfers(projectId),
        storage.getWorkerAttendance(projectId),
        storage.getMaterialPurchases(projectId, dateFrom as string, dateTo as string),
        storage.getTransportationExpenses(projectId),
        storage.getFilteredWorkerTransfers(projectId)
      ]);

      // حساب الإجماليات
      const totalIncome = totalFundTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalWorkerCosts = totalWorkerAttendance.reduce((sum, a) => sum + parseFloat(a.paidAmount), 0);
      // فقط المشتريات النقدية تُحسب في مصروفات التقرير - المشتريات الآجلة لا تُحسب
      const totalMaterialCosts = totalMaterialPurchases
        .filter(p => p.purchaseType === "نقد")
        .reduce((sum, p) => sum + parseFloat(p.totalAmount), 0);
      const totalTransportCosts = totalTransportationExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const totalTransferCosts = totalWorkerTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalExpenses = totalWorkerCosts + totalMaterialCosts + totalTransportCosts + totalTransferCosts;

      res.json({
        project,
        dateFrom,
        dateTo,
        summary: {
          totalIncome,
          totalExpenses,
          netBalance: totalIncome - totalExpenses,
          totalWorkerCosts,
          totalMaterialCosts,
          totalTransportCosts,
          totalTransferCosts
        },
        details: {
          fundTransfers: totalFundTransfers,
          workerAttendance: totalWorkerAttendance,
          materialPurchases: totalMaterialPurchases,
          transportationExpenses: totalTransportationExpenses,
          workerTransfers: totalWorkerTransfers
        }
      });
    } catch (error) {
      console.error("Error generating project summary report:", error);
      res.status(500).json({ message: "Error generating project summary report" });
    }
  });

  app.get("/api/workers/:workerId/account-statement", async (req, res) => {
    try {
      const { projectId, projectIds, dateFrom, dateTo } = req.query;
      
      console.log("🔍 طلب كشف حساب العامل:", { 
        workerId: req.params.workerId, 
        projectId, 
        projectIds, 
        dateFrom, 
        dateTo 
      });

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ 
          message: "يجب تحديد تاريخ البداية والنهاية",
          details: "تأكد من اختيار التاريخ من والى قبل إنشاء التقرير"
        });
      }
      
      // التعامل مع مشاريع متعددة أو واحد
      if (projectIds) {
        // التعامل مع مشاريع متعددة - تحويل النص إلى مصفوفة
        let projectIdsArray: string[] = [];
        if (typeof projectIds === 'string') {
          projectIdsArray = projectIds.split(',').filter(id => id.trim());
        } else if (Array.isArray(projectIds)) {
          projectIdsArray = projectIds.filter(id => typeof id === 'string' && id.trim()).map(id => String(id));
        } else if (projectIds) {
          projectIdsArray = [String(projectIds)].filter(id => id.trim());
        }
        
        console.log("🔧 معالجة مشاريع متعددة:", projectIdsArray);

        if (projectIdsArray.length === 0) {
          return res.status(400).json({ 
            message: "لم يتم تحديد أي مشروع صالح",
            details: "يرجى اختيار مشروع واحد على الأقل لإنشاء كشف الحساب"
          });
        }

        // استخدام نفس الدالة للحالتين - إما مشروع واحد أو متعدد
        if (projectIdsArray.length === 1) {
          // مشروع واحد
          const statement = await storage.getWorkerAccountStatement(
            req.params.workerId,
            projectIdsArray[0],
            dateFrom as string,
            dateTo as string
          );
          res.json(statement);
        } else {
          // مشاريع متعددة
          const statement = await storage.getWorkerAccountStatementMultipleProjects(
            req.params.workerId,
            projectIdsArray,
            dateFrom as string,
            dateTo as string
          );
          res.json(statement);
        }
      } else if (projectId) {
        // التعامل مع مشروع واحد (الطريقة القديمة)
        console.log("🔧 معالجة مشروع واحد:", projectId);
        
        const statement = await storage.getWorkerAccountStatement(
          req.params.workerId,
          projectId as string,
          dateFrom as string,
          dateTo as string
        );
        res.json(statement);
      } else {
        return res.status(400).json({ 
          message: "يجب تحديد المشاريع المراد إنشاء التقرير لها",
          details: "قم بتحديد مشروع واحد أو أكثر من قائمة المشاريع"
        });
      }
    } catch (error) {
      console.error("خطأ في جلب كشف حساب العامل:", error);
      
      // تحسين رسالة الخطأ حسب النوع
      let userMessage = "حدث خطأ أثناء إنشاء كشف حساب العامل";
      let userDetails = "يرجى المحاولة مرة أخرى. إذا استمر الخطأ، تواصل مع الدعم الفني";
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('worker not found') || errorMsg.includes('لم يتم العثور على العامل')) {
          userMessage = "العامل المحدد غير موجود";
          userDetails = "تأكد من اختيار عامل صحيح من القائمة";
        } else if (errorMsg.includes('project not found') || errorMsg.includes('لم يتم العثور على المشروع')) {
          userMessage = "أحد المشاريع المحددة غير موجود";
          userDetails = "تأكد من اختيار مشاريع صحيحة من القائمة";
        } else if (errorMsg.includes('database') || errorMsg.includes('connection')) {
          userMessage = "خطأ في الاتصال بقاعدة البيانات";
          userDetails = "يرجى المحاولة مرة أخرى خلال دقائق قليلة";
        } else if (errorMsg.includes('timeout')) {
          userMessage = "انتهت مهلة الطلب";
          userDetails = "البيانات كثيرة جداً. جرب تقليل المدة الزمنية أو عدد المشاريع";
        }
      }
      
      res.status(500).json({ 
        message: userMessage,
        details: userDetails,
        technicalError: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      });
    }
  });

  // Worker statement with multiple projects support
  app.get("/api/worker-statement/:workerId", async (req, res) => {
    try {
      const { workerId } = req.params;
      const { dateFrom, dateTo, projects } = req.query;
      
      if (!dateFrom || !dateTo || !projects) {
        return res.status(400).json({ message: "Missing required parameters: dateFrom, dateTo, projects" });
      }

      const projectIds = (projects as string).split(',');
      
      // Get worker
      const worker = await storage.getWorker(workerId);
      if (!worker) {
        return res.status(404).json({ message: "Worker not found" });
      }

      // Get projects
      const projectList = await Promise.all(
        projectIds.map(id => storage.getProject(id))
      );
      const validProjects = projectList.filter(p => p !== undefined);

      // Get attendance for all selected projects within date range
      const attendancePromises = projectIds.map(projectId => 
        storage.getWorkerAttendanceForPeriod(workerId, projectId, dateFrom as string, dateTo as string)
      );
      const attendanceArrays = await Promise.all(attendancePromises);
      const attendance = attendanceArrays.flat().sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Get worker transfers (حوالات الأهل) for all projects within date range
      const workerTransfersPromises = projectIds.map(projectId =>
        storage.getWorkerTransfers(workerId, projectId)
      );
      const workerTransfersArrays = await Promise.all(workerTransfersPromises);
      const workerTransfers = workerTransfersArrays.flat().filter((t: any) => {
        const transferDate = new Date(t.transferDate);
        const fromDate = new Date(dateFrom as string);
        const toDate = new Date(dateTo as string);
        return transferDate >= fromDate && transferDate <= toDate;
      }).sort((a: any, b: any) => 
        new Date(a.transferDate).getTime() - new Date(b.transferDate).getTime()
      );

      // Get fund transfers (سلف) for all projects within date range
      const fundTransfersPromises = projectIds.map(projectId =>
        storage.getFundTransfersForWorker(workerId, projectId, dateFrom as string, dateTo as string)
      );
      const fundTransfersArrays = await Promise.all(fundTransfersPromises);
      const fundTransfers = fundTransfersArrays.flat().sort((a: any, b: any) => 
        new Date(a.transferDate).getTime() - new Date(b.transferDate).getTime()
      );

      // Calculate summary
      const totalEarnings = attendance.reduce((sum: number, record: any) => {
        return sum + (record.isPresent ? parseFloat(record.dailyWage) : 0);
      }, 0);

      const totalAdvances = fundTransfers.reduce((sum: number, transfer: any) => {
        return sum + parseFloat(transfer.amount);
      }, 0);

      const totalWorkerTransfers = workerTransfers.reduce((sum: number, transfer: any) => {
        return sum + parseFloat(transfer.amount);
      }, 0);

      const totalDays = attendance.reduce((sum: number, record: any) => {
        return sum + (record.isPresent ? parseFloat(record.workDays || '1') : 0);
      }, 0);
      const totalHours = totalDays * 8; // افتراض 8 ساعات لكل يوم

      const summary = {
        totalEarnings,
        totalAdvances,
        netBalance: totalEarnings - totalAdvances,
        totalDays,
        totalHours,
        projectStats: validProjects.map(project => {
          const projectAttendance = attendance.filter((a: any) => a.projectId === project.id);
          const projectDays = projectAttendance.reduce((sum: number, a: any) => 
            sum + (a.isPresent ? parseFloat(a.workDays || '1') : 0), 0
          );
          const projectEarnings = projectAttendance.reduce((sum: number, a: any) => 
            sum + (a.isPresent ? parseFloat(a.dailyWage) : 0), 0
          );
          
          return {
            projectId: project.id,
            projectName: project.name,
            days: projectDays,
            hours: projectDays * 8,
            earnings: projectEarnings
          };
        })
      };

      res.json({
        worker,
        projects: validProjects,
        attendance,
        transfers: workerTransfers, // حوالات الأهل
        fundTransfers, // السلف
        summary: {
          ...summary,
          totalWorkerTransfers
        }
      });

    } catch (error) {
      console.error("Error fetching worker statement:", error);
      res.status(500).json({ message: "Error fetching worker statement" });
    }
  });

  // Worker balances
  app.get("/api/workers/:workerId/balance/:projectId", async (req, res) => {
    const { workerId, projectId } = req.params;
    
    try {
      const balance = await storage.getWorkerBalance(workerId, projectId);
      res.json(balance);
    } catch (error) {
      console.error("Error fetching worker balance:", error);
      res.status(500).json({ message: "Failed to fetch worker balance" });
    }
  });

  // Worker transfers
  app.get("/api/workers/:workerId/transfers", async (req, res) => {
    const { workerId } = req.params;
    const projectId = req.query.projectId as string;
    
    try {
      const transfers = await storage.getWorkerTransfers(workerId, projectId);
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching worker transfers:", error);
      res.status(500).json({ message: "Failed to fetch worker transfers" });
    }
  });

  app.get("/api/worker-transfers", async (req, res) => {
    const { projectId, date } = req.query;
    
    try {
      const transfers = await storage.getFilteredWorkerTransfers(projectId as string, date as string);
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching worker transfers:", error);
      res.status(500).json({ message: "Failed to fetch worker transfers" });
    }
  });

  app.get("/api/worker-transfers/:id", async (req, res) => {
    try {
      const transfer = await storage.getWorkerTransfer(req.params.id);
      if (!transfer) {
        return res.status(404).json({ message: "Worker transfer not found" });
      }
      res.json(transfer);
    } catch (error) {
      res.status(500).json({ message: "Error fetching worker transfer" });
    }
  });

  app.post("/api/worker-transfers", async (req, res) => {
    try {
      console.log("📥 البيانات المستلمة لإنشاء حولة العامل:", JSON.stringify(req.body, null, 2));
      
      const validationResult = insertWorkerTransferSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log("❌ خطأ في التحقق من البيانات:", JSON.stringify(validationResult.error.errors, null, 2));
        return res.status(400).json({ 
          message: "Invalid worker transfer data", 
          errors: validationResult.error.errors 
        });
      }

      const transfer = await storage.createWorkerTransfer(validationResult.data);
      
      // تحديث الملخص اليومي بعد إضافة الحوالة
      setImmediate(() => {
        storage.updateDailySummaryForDate(transfer.projectId, transfer.transferDate)
          .catch(error => console.error("Error updating daily summary after worker transfer:", error));
      });
      
      res.status(201).json(transfer);
    } catch (error) {
      console.error("Error creating worker transfer:", error);
      res.status(500).json({ message: "Failed to create worker transfer" });
    }
  });

  app.put("/api/worker-transfers/:id", async (req, res) => {
    try {
      const validationResult = insertWorkerTransferSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid worker transfer data", 
          errors: validationResult.error.errors 
        });
      }

      const transfer = await storage.updateWorkerTransfer(req.params.id, validationResult.data);
      if (!transfer) {
        return res.status(404).json({ message: "Worker transfer not found" });
      }
      
      // تحديث الملخص اليومي بعد تعديل الحوالة
      setImmediate(() => {
        storage.updateDailySummaryForDate(transfer.projectId, transfer.transferDate)
          .catch(error => console.error("Error updating daily summary after worker transfer update:", error));
      });
      
      res.json(transfer);
    } catch (error) {
      console.error("Error updating worker transfer:", error);
      res.status(500).json({ message: "Failed to update worker transfer" });
    }
  });

  // إضافة route PATCH للتحديث الجزئي
  app.patch("/api/worker-transfers/:id", async (req, res) => {
    try {
      console.log("📥 البيانات المستلمة لتعديل حولة العامل:", JSON.stringify(req.body, null, 2));
      
      const validationResult = insertWorkerTransferSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        console.log("❌ خطأ في التحقق من البيانات:", JSON.stringify(validationResult.error.errors, null, 2));
        return res.status(400).json({ 
          message: "Invalid worker transfer data", 
          errors: validationResult.error.errors 
        });
      }

      const transfer = await storage.updateWorkerTransfer(req.params.id, validationResult.data);
      if (!transfer) {
        return res.status(404).json({ message: "Worker transfer not found" });
      }
      
      // تحديث الملخص اليومي بعد تعديل الحوالة
      setImmediate(() => {
        storage.updateDailySummaryForDate(transfer.projectId, transfer.transferDate)
          .catch(error => console.error("Error updating daily summary after worker transfer update:", error));
      });
      
      console.log("✅ تم تعديل حولة العامل بنجاح:", transfer.id);
      res.json(transfer);
    } catch (error) {
      console.error("Error updating worker transfer:", error);
      res.status(500).json({ message: "Failed to update worker transfer" });
    }
  });

  app.delete("/api/worker-transfers/:id", async (req, res) => {
    try {
      // الحصول على بيانات الحوالة قبل حذفها لتحديث الملخص اليومي
      const transfer = await storage.getWorkerTransfer(req.params.id);
      
      await storage.deleteWorkerTransfer(req.params.id);
      
      // تحديث الملخص اليومي بعد حذف الحوالة
      if (transfer) {
        setImmediate(() => {
          storage.updateDailySummaryForDate(transfer.projectId, transfer.transferDate)
            .catch(error => console.error("Error updating daily summary after worker transfer deletion:", error));
        });
      }
      
      res.status(200).json({ message: "تم حذف الحولة بنجاح" });
    } catch (error) {
      console.error("Error deleting worker transfer:", error);
      res.status(500).json({ message: "Failed to delete worker transfer" });
    }
  });

  // Multi-project worker management routes
  app.get("/api/workers/multi-project", async (req, res) => {
    try {
      const workers = await storage.getWorkersWithMultipleProjects();
      res.json(workers);
    } catch (error) {
      console.error("Error fetching workers with multiple projects:", error);
      res.status(500).json({ message: "خطأ في جلب العمال متعددي المشاريع" });
    }
  });

  app.get("/api/workers/:workerId/multi-project-statement", async (req, res) => {
    try {
      const { workerId } = req.params;
      const { dateFrom, dateTo } = req.query;
      
      const statement = await storage.getWorkerMultiProjectStatement(
        workerId,
        dateFrom as string,
        dateTo as string
      );
      
      res.json(statement);
    } catch (error) {
      console.error("Error fetching multi-project worker statement:", error);
      res.status(500).json({ message: "خطأ في جلب كشف حساب العامل متعدد المشاريع" });
    }
  });

  app.get("/api/workers/:workerId/projects", async (req, res) => {
    try {
      const { workerId } = req.params;
      const projects = await storage.getWorkerProjects(workerId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching worker projects:", error);
      res.status(500).json({ message: "خطأ في جلب مشاريع العامل" });
    }
  });

  // Daily expenses range report
  app.get("/api/reports/daily-expenses-range/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const { dateFrom, dateTo } = req.query;
      
      if (!dateFrom || !dateTo) {
        return res.status(400).json({ message: "يرجى تحديد تاريخ البداية والنهاية" });
      }
      
      const results = await storage.getDailyExpensesRange(projectId, dateFrom as string, dateTo as string);
      res.json(results);
    } catch (error) {
      console.error("Error generating daily expenses range report:", error);
      res.status(500).json({ message: "خطأ في إنشاء كشف المصروفات اليومية" });
    }
  });

  // Autocomplete data routes - محسنة مع إدارة الصيانة
  app.get("/api/autocomplete/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const { limit = '50' } = req.query;
      const data = await storage.getAutocompleteData(category, parseInt(limit as string));
      res.json(data);
    } catch (error) {
      console.error("Error fetching autocomplete data:", error);
      res.status(500).json({ message: "خطأ في جلب بيانات الإكمال التلقائي" });
    }
  });

  app.post("/api/autocomplete", async (req, res) => {
    try {
      const result = insertAutocompleteDataSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid autocomplete data", errors: result.error.issues });
      }
      
      const data = await storage.saveAutocompleteData(result.data);
      res.status(201).json(data);
    } catch (error) {
      console.error("Error saving autocomplete data:", error);
      res.status(500).json({ message: "خطأ في حفظ بيانات الإكمال التلقائي" });
    }
  });

  app.delete("/api/autocomplete/:category/:value", async (req, res) => {
    try {
      const { category, value } = req.params;
      await storage.removeAutocompleteData(category, decodeURIComponent(value));
      res.status(204).send();
    } catch (error) {
      console.error("Error removing autocomplete data:", error);
      res.status(500).json({ message: "خطأ في حذف بيانات الإكمال التلقائي" });
    }
  });

  // نقاط نهاية إدارة وصيانة الإكمال التلقائي
  app.get("/api/autocomplete-admin/stats", async (req, res) => {
    try {
      const { autocompleteOptimizer } = await import("./autocomplete-optimizer");
      const stats = await autocompleteOptimizer.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching autocomplete stats:", error);
      res.status(500).json({ message: "خطأ في جلب إحصائيات نظام الإكمال التلقائي" });
    }
  });

  app.post("/api/autocomplete-admin/cleanup", async (req, res) => {
    try {
      const { autocompleteOptimizer } = await import("./autocomplete-optimizer");
      const result = await autocompleteOptimizer.cleanupOldData();
      res.json(result);
    } catch (error) {
      console.error("Error cleaning up autocomplete data:", error);
      res.status(500).json({ message: "خطأ في تنظيف بيانات الإكمال التلقائي" });
    }
  });

  app.post("/api/autocomplete-admin/enforce-limits", async (req, res) => {
    try {
      const { category } = req.body;
      const { autocompleteOptimizer } = await import("./autocomplete-optimizer");
      const result = await autocompleteOptimizer.enforceCategoryLimits(category);
      res.json(result);
    } catch (error) {
      console.error("Error enforcing autocomplete limits:", error);
      res.status(500).json({ message: "خطأ في تطبيق حدود نظام الإكمال التلقائي" });
    }
  });

  app.post("/api/autocomplete-admin/maintenance", async (req, res) => {
    try {
      const { autocompleteOptimizer } = await import("./autocomplete-optimizer");
      const result = await autocompleteOptimizer.runMaintenance();
      res.json(result);
    } catch (error) {
      console.error("Error running autocomplete maintenance:", error);
      res.status(500).json({ message: "خطأ في تشغيل صيانة نظام الإكمال التلقائي" });
    }
  });

  // Worker miscellaneous expenses routes
  app.get("/api/projects/:projectId/worker-misc-expenses", async (req, res) => {
    try {
      const { projectId } = req.params;
      const { date } = req.query;
      const expenses = await storage.getWorkerMiscExpenses(projectId, date as string);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching worker misc expenses:", error);
      res.status(500).json({ message: "خطأ في جلب نثريات العمال" });
    }
  });

  app.get("/api/worker-misc-expenses", async (req, res) => {
    try {
      const { projectId, date } = req.query;
      const expenses = await storage.getWorkerMiscExpenses(projectId as string, date as string);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching worker misc expenses:", error);
      res.status(500).json({ message: "خطأ في جلب نثريات العمال" });
    }
  });

  app.post("/api/worker-misc-expenses", async (req, res) => {
    try {
      const result = insertWorkerMiscExpenseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid worker misc expense data", errors: result.error.issues });
      }
      
      const expense = await storage.createWorkerMiscExpense(result.data);
      
      // تحديث الملخص اليومي
      setImmediate(() => {
        storage.updateDailySummaryForDate(expense.projectId, expense.date)
          .catch(error => console.error("Error updating daily summary after worker misc expense creation:", error));
      });
      
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating worker misc expense:", error);
      res.status(500).json({ message: "خطأ في إنشاء نثريات العمال" });
    }
  });

  app.put("/api/worker-misc-expenses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = insertWorkerMiscExpenseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid worker misc expense data", errors: result.error.issues });
      }
      
      const expense = await storage.updateWorkerMiscExpense(id, result.data);
      if (!expense) {
        return res.status(404).json({ message: "Worker misc expense not found" });
      }
      
      // تحديث الملخص اليومي
      setImmediate(() => {
        storage.updateDailySummaryForDate(expense.projectId, expense.date)
          .catch(error => console.error("Error updating daily summary after worker misc expense update:", error));
      });
      
      res.json(expense);
    } catch (error) {
      console.error("Error updating worker misc expense:", error);
      res.status(500).json({ message: "خطأ في تحديث نثريات العمال" });
    }
  });

  app.delete("/api/worker-misc-expenses/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // الحصول على تفاصيل النثريات قبل الحذف لتحديث الملخص اليومي
      const expense = await storage.getWorkerMiscExpense(id);
      
      await storage.deleteWorkerMiscExpense(id);
      
      // تحديث الملخص اليومي إذا كانت النثريات موجودة
      if (expense) {
        setImmediate(() => {
          storage.updateDailySummaryForDate(expense.projectId, expense.date)
            .catch(error => console.error("Error updating daily summary after worker misc expense deletion:", error));
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting worker misc expense:", error);
      res.status(500).json({ message: "خطأ في حذف نثريات العمال" });
    }
  });

  // Users endpoints
  app.get("/api/users", async (req, res) => {
    try {
      const includeRole = req.query.includeRole === 'true';
      const users = await storage.getUsers();
      
      // إخفاء كلمات المرور من الاستجابة وإضافة الأدوار إذا طُلبت
      const safeUsers = users.map(user => {
        const { password, totpSecret, backupCodes, ...safeUser } = user;
        
        // إضافة الدور إذا طُلب
        if (includeRole) {
          return {
            ...safeUser,
            role: user.role || 'user' // تأكد من وجود دور افتراضي
          };
        }
        
        return safeUser;
      });
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "خطأ في جلب المستخدمين" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "بيانات مستخدم غير صحيحة", errors: result.error.issues });
      }
      
      // فحص عدم تكرار البريد الإلكتروني
      const existingUser = await storage.getUserByEmail(result.data.email);
      if (existingUser) {
        return res.status(400).json({ message: "يوجد مستخدم بنفس البريد الإلكتروني مسبقاً" });
      }
      
      const user = await storage.createUser(result.data);
      
      // إخفاء كلمة المرور من الاستجابة
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "خطأ في إنشاء المستخدم" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      
      // إخفاء كلمة المرور من الاستجابة
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "خطأ في جلب المستخدم" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const result = insertUserSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "بيانات مستخدم غير صحيحة", errors: result.error.issues });
      }
      
      const user = await storage.updateUser(req.params.id, result.data);
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      
      // إخفاء كلمة المرور من الاستجابة
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "خطأ في تحديث المستخدم" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "خطأ في حذف المستخدم" });
    }
  });

  // Performance analysis endpoints  
  app.get("/api/performance/quick-analysis", async (req, res) => {
    try {
      const { performanceAnalyzer } = await import('./performance-analyzer');
      const result = await performanceAnalyzer.runQuickAnalysis();
      res.json({ analysis: result });
    } catch (error) {
      res.status(500).json({ error: "تعذر تشغيل تحليل الأداء" });
    }
  });

  app.post("/api/performance/detailed-report", async (req, res) => {
    try {
      const { performanceAnalyzer } = await import('./performance-analyzer');
      await performanceAnalyzer.generateDetailedReport();
      res.json({ message: "تم إنشاء تقرير الأداء المفصل بنجاح" });
    } catch (error) {
      res.status(500).json({ error: "تعذر إنشاء تقرير الأداء" });
    }
  });

  app.get("/api/performance/analysis", async (req, res) => {
    try {
      const { performanceAnalyzer } = await import('./performance-analyzer');
      const analysis = await performanceAnalyzer.analyzeInsertDeletePerformance();
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "تعذر تحليل أداء قاعدة البيانات" });
    }
  });

  // Admin routes for autocomplete system
  app.get("/api/autocomplete-admin/stats", async (req, res) => {
    try {
      const { autocompleteOptimizer } = await import('./autocomplete-optimizer');
      const stats = await autocompleteOptimizer.getSystemStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "تعذر جلب إحصائيات النظام" });
    }
  });

  app.post("/api/autocomplete-admin/cleanup", async (req, res) => {
    try {
      const { autocompleteOptimizer } = await import('./autocomplete-optimizer');
      const result = await autocompleteOptimizer.cleanupOldData();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "تعذر تنظيف البيانات القديمة" });
    }
  });

  app.post("/api/autocomplete-admin/enforce-limits", async (req, res) => {
    try {
      const { autocompleteOptimizer } = await import('./autocomplete-optimizer');
      const { category } = req.body;
      const result = await autocompleteOptimizer.enforceCategoryLimits(category);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "تعذر تطبيق حدود الفئات" });
    }
  });

  app.post("/api/autocomplete-admin/maintenance", async (req, res) => {
    try {
      const { autocompleteOptimizer } = await import('./autocomplete-optimizer');
      const result = await autocompleteOptimizer.runMaintenance();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "تعذر تشغيل الصيانة الشاملة" });
    }
  });

  // Batch operations endpoints - العمليات الجماعية المحسنة
  app.delete("/api/batch/autocomplete", async (req, res) => {
    try {
      const { batchOperationsOptimizer } = await import('./batch-operations-optimizer');
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "مطلوب مصفوفة من المعرفات" });
      }

      const result = await batchOperationsOptimizer.batchDeleteAutocomplete(ids);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "تعذر تنفيذ الحذف الجماعي" });
    }
  });

  app.post("/api/batch/autocomplete", async (req, res) => {
    try {
      const { batchOperationsOptimizer } = await import('./batch-operations-optimizer');
      const { records } = req.body;
      
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: "مطلوب مصفوفة من السجلات" });
      }

      const result = await batchOperationsOptimizer.batchInsertAutocomplete(records);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "تعذر تنفيذ الإدخال الجماعي" });
    }
  });

  app.post("/api/batch/cleanup", async (req, res) => {
    try {
      const { batchOperationsOptimizer } = await import('./batch-operations-optimizer');
      const result = await batchOperationsOptimizer.optimizedBatchCleanup();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "تعذر تنفيذ التنظيف الجماعي" });
    }
  });

  app.get("/api/batch/stats", async (req, res) => {
    try {
      const { batchOperationsOptimizer } = await import('./batch-operations-optimizer');
      const stats = await batchOperationsOptimizer.getBatchOperationsStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "تعذر جلب إحصائيات العمليات الجماعية" });
    }
  });

  // Materialized Views endpoints
  app.post("/api/materialized-views/setup", async (req, res) => {
    try {
      const { materializedViewManager } = await import('./materialized-view-manager');
      const result = await materializedViewManager.setupMaterializedViews();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "تعذر إعداد Materialized Views" });
    }
  });

  app.post("/api/materialized-views/refresh", async (req, res) => {
    try {
      const { materializedViewManager } = await import('./materialized-view-manager');
      const result = await materializedViewManager.refreshDailySummaryView();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "تعذر تحديث Materialized Views" });
    }
  });

  app.get("/api/materialized-views/stats", async (req, res) => {
    try {
      const { materializedViewManager } = await import('./materialized-view-manager');
      const stats = await materializedViewManager.getMaterializedViewStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "تعذر جلب إحصائيات Materialized Views" });
    }
  });

  // Quick Performance Fixes endpoints
  app.post("/api/performance/apply-all-optimizations", async (req, res) => {
    try {
      const { quickPerformanceFixes } = await import('./quick-performance-fixes');
      const result = await quickPerformanceFixes.applyAllOptimizations();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "تعذر تطبيق التحسينات" });
    }
  });

  app.post("/api/performance/apply-indexes", async (req, res) => {
    try {
      const { quickPerformanceFixes } = await import('./quick-performance-fixes');
      const result = await quickPerformanceFixes.applyOptimizedIndexes();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "تعذر تطبيق الفهارس المحسنة" });
    }
  });

  app.post("/api/performance/immediate-cleanup", async (req, res) => {
    try {
      const { quickPerformanceFixes } = await import('./quick-performance-fixes');
      const result = await quickPerformanceFixes.immediateCleanupAndOptimize();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "تعذر تنفيذ التنظيف الفوري" });
    }
  });

  app.get("/api/performance/benchmark", async (req, res) => {
    try {
      const { quickPerformanceFixes } = await import('./quick-performance-fixes');
      const result = await quickPerformanceFixes.benchmarkPerformance();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "تعذر قياس الأداء" });
    }
  });

  // مسار التقارير المتقدمة
  app.get("/api/reports/advanced", async (req, res) => {
    try {
      const { projectId, reportType, dateFrom, dateTo } = req.query;
      
      if (!projectId || !reportType || !dateFrom || !dateTo) {
        return res.status(400).json({ 
          message: "مطلوب: projectId, reportType, dateFrom, dateTo" 
        });
      }

      if (reportType === 'expenses') {
        // جلب المصروفات من جميع الجداول
        const expenses = await storage.getExpensesForReport(
          projectId as string, 
          dateFrom as string, 
          dateTo as string
        );
        
        // حساب الإجماليات حسب الفئة أولاً
        const categoryTotals: Record<string, number> = {};
        expenses.forEach(expense => {
          const category = expense.category;
          const amount = parseFloat(expense.amount.toString());
          if (!isNaN(amount)) {
            categoryTotals[category] = (categoryTotals[category] || 0) + amount;
          }
        });

        // حساب الإجمالي العام من مجموع الفئات
        const totalExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);

        // سجلات تشخيصية للتحقق من دقة الحسابات
        console.log('🔍 تشخيص حسابات التقرير:');
        console.log(`📊 عدد المصروفات: ${expenses.length}`);
        console.log('💰 إجماليات الفئات:');
        Object.entries(categoryTotals).forEach(([category, total]) => {
          console.log(`   ${category}: ${total.toLocaleString('en-US')} ر.ي`);
        });
        console.log(`🔢 الإجمالي العام: ${totalExpenses.toLocaleString('en-US')} ر.ي`);
        console.log(`✅ التحقق: مجموع الفئات = ${Object.values(categoryTotals).reduce((a, b) => a + b, 0).toLocaleString('en-US')}`);

        res.json({
          expenses,
          totalExpenses,
          categoryTotals
        });

      } else if (reportType === 'income') {
        // جلب الإيرادات (تحويلات العهدة)
        const income = await storage.getIncomeForReport(
          projectId as string, 
          dateFrom as string, 
          dateTo as string
        );
        
        const totalIncome = income.reduce((sum, inc) => sum + parseFloat(inc.amount.toString()), 0);
        
        res.json({
          income,
          totalIncome
        });
      }
      
    } catch (error) {
      console.error("خطأ في إنشاء التقرير:", error);
      res.status(500).json({ message: "خطأ في إنشاء التقرير المتقدم" });
    }
  });

  // Suppliers routes
  app.get("/api/suppliers", async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "خطأ في جلب قائمة الموردين" });
    }
  });

  // إحصائيات الموردين العامة مع فصل النقدي والآجل (يجب أن يأتي قبل route :id)
  app.get("/api/suppliers/statistics", async (req, res) => {
    try {
      const { supplierId, projectId, dateFrom, dateTo, purchaseType } = req.query;
      console.log(`📊 طلب إحصائيات الموردين:`, { supplierId, projectId, dateFrom, dateTo, purchaseType });
      
      // تصفية القيم الفارغة والغير محددة
      const filters: any = {};
      if (supplierId && supplierId !== 'undefined' && supplierId !== '') filters.supplierId = supplierId as string;
      if (projectId && projectId !== 'all' && projectId !== 'undefined' && projectId !== '') filters.projectId = projectId as string;
      if (dateFrom && dateFrom !== 'undefined' && dateFrom !== '') filters.dateFrom = dateFrom as string;
      if (dateTo && dateTo !== 'undefined' && dateTo !== '') filters.dateTo = dateTo as string;
      if (purchaseType && purchaseType !== 'all' && purchaseType !== 'undefined' && purchaseType !== '') filters.purchaseType = purchaseType as string;
      
      console.log(`🔄 الفلاتر المطبقة:`, filters);
      
      const statistics = await storage.getSupplierStatistics(filters);
      
      console.log(`✅ تم حساب إحصائيات الموردين:`, statistics);
      res.json(statistics);
    } catch (error) {
      console.error("خطأ في جلب إحصائيات الموردين:", error);
      
      // إرجاع إحصائيات فارغة بدلاً من خطأ 500
      res.json({
        totalSuppliers: 0,
        totalCashPurchases: "0",
        totalCreditPurchases: "0",
        totalDebt: "0",
        totalPaid: "0",
        remainingDebt: "0",
        activeSuppliers: 0
      });
    }
  });

  app.post("/api/suppliers", async (req, res) => {
    try {
      const result = insertSupplierSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "بيانات مورد غير صحيحة", errors: result.error.issues });
      }
      
      // فحص عدم تكرار اسم المورد
      const existingSupplier = await storage.getSupplierByName(result.data.name);
      if (existingSupplier) {
        return res.status(400).json({ message: "يوجد مورد بنفس الاسم مسبقاً" });
      }
      
      const supplier = await storage.createSupplier(result.data);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ message: "خطأ في إنشاء المورد" });
    }
  });

  app.get("/api/suppliers/:id", async (req, res) => {
    try {
      const supplier = await storage.getSupplier(req.params.id);
      if (!supplier) {
        return res.status(404).json({ message: "المورد غير موجود" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Error fetching supplier:", error);
      res.status(500).json({ message: "خطأ في جلب المورد" });
    }
  });

  app.put("/api/suppliers/:id", async (req, res) => {
    try {
      const result = insertSupplierSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "بيانات مورد غير صحيحة", errors: result.error.issues });
      }
      
      const supplier = await storage.updateSupplier(req.params.id, result.data);
      if (!supplier) {
        return res.status(404).json({ message: "المورد غير موجود" });
      }
      
      res.json(supplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ message: "خطأ في تحديث المورد" });
    }
  });

  app.delete("/api/suppliers/:id", async (req, res) => {
    try {
      await storage.deleteSupplier(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ message: "خطأ في حذف المورد" });
    }
  });

  // Supplier account statement
  app.get("/api/suppliers/:id/account", async (req, res) => {
    try {
      const { projectId, dateFrom, dateTo } = req.query;
      const statement = await storage.getSupplierAccountStatement(
        req.params.id,
        projectId as string,
        dateFrom as string,
        dateTo as string
      );
      res.json(statement);
    } catch (error) {
      console.error("Error fetching supplier account statement:", error);
      res.status(500).json({ message: "خطأ في جلب كشف حساب المورد" });
    }
  });


  // Supplier purchases
  app.get("/api/suppliers/:id/purchases", async (req, res) => {
    try {
      const { paymentType, dateFrom, dateTo } = req.query;
      const purchases = await storage.getPurchasesBySupplier(
        req.params.id,
        paymentType as string,
        dateFrom as string,
        dateTo as string
      );
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching supplier purchases:", error);
      res.status(500).json({ message: "خطأ في جلب مشتريات المورد" });
    }
  });

  // Supplier payments routes
  app.get("/api/supplier-payments", async (req, res) => {
    try {
      console.log('🔍 API: بدء استدعاء getAllSupplierPayments...');
      const payments = await storage.getAllSupplierPayments();
      console.log(`📊 API: تم الحصول على ${payments.length} مدفوعة`);
      res.json(payments);
    } catch (error) {
      console.error("خطأ في API route للمدفوعات:", error);
      res.status(500).json({ message: "خطأ في جلب جميع مدفوعات الموردين" });
    }
  });

  app.get("/api/suppliers/:supplierId/payments", async (req, res) => {
    try {
      const { supplierId } = req.params;
      const projectId = req.query.projectId as string;
      
      const payments = await storage.getSupplierPayments(supplierId, projectId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching supplier payments:", error);
      res.status(500).json({ message: "خطأ في جلب مدفوعات المورد" });
    }
  });

  app.post("/api/supplier-payments", async (req, res) => {
    try {
      const result = insertSupplierPaymentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "بيانات دفعة غير صحيحة", errors: result.error.issues });
      }
      
      const payment = await storage.createSupplierPayment(result.data);
      res.status(201).json(payment);
    } catch (error) {
      console.error("Error creating supplier payment:", error);
      res.status(500).json({ message: "خطأ في إنشاء دفعة المورد" });
    }
  });

  app.get("/api/supplier-payments/:id", async (req, res) => {
    try {
      const payment = await storage.getSupplierPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ message: "الدفعة غير موجودة" });
      }
      res.json(payment);
    } catch (error) {
      console.error("Error fetching supplier payment:", error);
      res.status(500).json({ message: "خطأ في جلب الدفعة" });
    }
  });

  app.put("/api/supplier-payments/:id", async (req, res) => {
    try {
      const result = insertSupplierPaymentSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "بيانات دفعة غير صحيحة", errors: result.error.issues });
      }
      
      const payment = await storage.updateSupplierPayment(req.params.id, result.data);
      if (!payment) {
        return res.status(404).json({ message: "الدفعة غير موجودة" });
      }
      
      res.json(payment);
    } catch (error) {
      console.error("Error updating supplier payment:", error);
      res.status(500).json({ message: "خطأ في تحديث الدفعة" });
    }
  });

  app.delete("/api/supplier-payments/:id", async (req, res) => {
    try {
      await storage.deleteSupplierPayment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting supplier payment:", error);
      res.status(500).json({ message: "خطأ في حذف الدفعة" });
    }
  });

  // Supplier reports
  app.get("/api/suppliers/:supplierId/statement", async (req, res) => {
    try {
      const { supplierId } = req.params;
      const { projectId, dateFrom, dateTo } = req.query;
      
      const statement = await storage.getSupplierAccountStatement(
        supplierId,
        projectId as string,
        dateFrom as string,
        dateTo as string
      );
      
      res.json(statement);
    } catch (error) {
      console.error("Error fetching supplier statement:", error);
      res.status(500).json({ message: "خطأ في جلب كشف حساب المورد" });
    }
  });

  app.get("/api/suppliers/:supplierId/purchases", async (req, res) => {
    try {
      const { supplierId } = req.params;
      const { paymentType, dateFrom, dateTo } = req.query;
      
      const purchases = await storage.getPurchasesBySupplier(
        supplierId,
        paymentType as string,
        dateFrom as string,
        dateTo as string
      );
      
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching supplier purchases:", error);
      res.status(500).json({ message: "خطأ في جلب مشتريات المورد" });
    }
  });

  // Print Settings Routes
  app.get("/api/print-settings", async (req, res) => {
    try {
      const { reportType, userId } = req.query;
      const settings = await storage.getPrintSettings(reportType as string, userId as string);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching print settings:", error);
      res.status(500).json({ message: "خطأ في جلب إعدادات الطباعة" });
    }
  });

  app.post("/api/print-settings", async (req, res) => {
    try {
      const result = insertPrintSettingsSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "بيانات إعدادات الطباعة غير صحيحة", errors: result.error.issues });
      }
      
      const settings = await storage.createPrintSettings(result.data);
      res.status(201).json(settings);
    } catch (error) {
      console.error("Error creating print settings:", error);
      res.status(500).json({ message: "خطأ في إنشاء إعدادات الطباعة" });
    }
  });

  app.get("/api/print-settings/:id", async (req, res) => {
    try {
      const settings = await storage.getPrintSettingsById(req.params.id);
      if (!settings) {
        return res.status(404).json({ message: "إعدادات الطباعة غير موجودة" });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching print settings:", error);
      res.status(500).json({ message: "خطأ في جلب إعدادات الطباعة" });
    }
  });

  app.put("/api/print-settings/:id", async (req, res) => {
    try {
      const result = insertPrintSettingsSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "بيانات إعدادات الطباعة غير صحيحة", errors: result.error.issues });
      }
      
      const settings = await storage.updatePrintSettings(req.params.id, result.data);
      if (!settings) {
        return res.status(404).json({ message: "إعدادات الطباعة غير موجودة" });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error updating print settings:", error);
      res.status(500).json({ message: "خطأ في تحديث إعدادات الطباعة" });
    }
  });

  app.delete("/api/print-settings/:id", async (req, res) => {
    try {
      await storage.deletePrintSettings(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting print settings:", error);
      res.status(500).json({ message: "خطأ في حذف إعدادات الطباعة" });
    }
  });

  // Get default print settings by report type
  app.get("/api/print-settings/default/:reportType", async (req, res) => {
    try {
      const settings = await storage.getDefaultPrintSettings(req.params.reportType);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching default print settings:", error);
      res.status(500).json({ message: "خطأ في جلب الإعدادات الافتراضية للطباعة" });
    }
  });

  // Print Preview API - للمعاينة المباشرة للتقارير
  app.get("/api/print-preview/:reportType", async (req, res) => {
    try {
      const { reportType } = req.params;
      let previewData = {};

      switch (reportType) {
        case 'worker_statement':
          // جلب بيانات تجريبية لكشف حساب العامل
          const workers = await storage.getWorkers();
          const projects = await storage.getProjects();
          previewData = {
            type: 'worker_statement',
            worker: workers[0] || { name: 'عامل تجريبي', workerType: 'معلم بناء', dailyWage: 200 },
            project: projects[0] || { name: 'مشروع تجريبي', location: 'الرياض' },
            attendanceData: [
              { date: '2025-08-01', hours: 8, description: 'أعمال البناء', amount: 200 },
              { date: '2025-08-02', hours: 8, description: 'أعمال التشطيب', amount: 200 },
              { date: '2025-08-03', hours: 8, description: 'أعمال الدهان', amount: 200 }
            ],
            transfers: [
              { date: '2025-08-03', amount: 300, transferNumber: '12345', recipient: 'الأهل' }
            ]
          };
          break;

        case 'supplier_statement':
          const suppliers = await storage.getSuppliers();
          previewData = {
            type: 'supplier_statement',
            supplier: suppliers[0] || { name: 'مورد تجريبي', phone: '+966501234567' },
            purchases: [
              { date: '2025-08-01', material: 'أسمنت', quantity: 50, unitPrice: 25, total: 1250, paymentType: 'deferred' },
              { date: '2025-08-02', material: 'حديد', quantity: 2, unitPrice: 2500, total: 5000, paymentType: 'cash' }
            ]
          };
          break;

        case 'daily_expenses':
          const projectsForDaily = await storage.getProjects();
          previewData = {
            type: 'daily_expenses',
            date: new Date().toISOString().split('T')[0],
            project: projectsForDaily[0] || { name: 'مشروع تجريبي' },
            expenses: [
              { time: '08:00', category: 'عمالة', description: 'أجور عمال اليوم', amount: 1500, notes: '5 عمال' },
              { time: '10:30', category: 'مواد', description: 'شراء أسمنت', amount: 800, notes: 'من المورد الرئيسي' },
              { time: '14:00', category: 'مواصلات', description: 'نقل مواد', amount: 200, notes: 'شاحنة كبيرة' }
            ]
          };
          break;

        case 'material_purchases':
          previewData = {
            type: 'material_purchases',
            purchases: [
              { date: '2025-08-03', material: 'أسمنت بورتلاندي', supplier: 'مصنع الرياض', quantity: 100, price: 25, total: 2500 },
              { date: '2025-08-03', material: 'حديد تسليح', supplier: 'مصنع الحديد', quantity: 3, price: 3000, total: 9000 }
            ]
          };
          break;

        case 'advanced_reports':
          previewData = {
            type: 'advanced_reports',
            analysis: {
              totalExpenses: 50000,
              categories: {
                labor: { amount: 30000, percentage: 60 },
                materials: { amount: 15000, percentage: 30 },
                transportation: { amount: 5000, percentage: 10 }
              },
              dailyAverage: 2500,
              projectDuration: 20
            }
          };
          break;

        default:
          return res.status(400).json({ message: "نوع تقرير غير مدعوم" });
      }

      res.json(previewData);
    } catch (error) {
      console.error("Error generating print preview:", error);
      res.status(500).json({ message: "خطأ في إنشاء معاينة التقرير" });
    }
  });

  // إضافة APIs مفقودة حسب خطة التحسينات
  
  // API Health Check - إصلاح المشكلة الحرجة
  app.get("/api/health", async (req, res) => {
    try {
      const healthStatus = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: 'connected',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      };
      res.json(healthStatus);
    } catch (error) {
      res.status(500).json({ 
        status: 'ERROR', 
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // API Stats Summary - إضافة المفقود
  app.get("/api/stats-summary", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      const workers = await storage.getWorkers();
      const materials = await storage.getMaterials();
      
      // حساب إحصائيات سريعة بدون تفاصيل مطولة
      const totalProjects = projects.length;
      const activeProjects = projects.filter(p => p.status === 'active' || !p.status).length;
      const totalWorkers = workers.length;
      const totalMaterials = materials.length;
      
      const summary = {
        projects: {
          total: totalProjects,
          active: activeProjects
        },
        workers: {
          total: totalWorkers
        },
        materials: {
          total: totalMaterials
        },
        system: {
          status: 'operational',
          lastUpdated: new Date().toISOString()
        }
      };
      
      res.json(summary);
    } catch (error) {
      console.error("Error getting stats summary:", error);
      res.status(500).json({ message: "Error retrieving system statistics" });
    }
  });

  // ملاحظة: تم نقل مسارات المصادقة إلى النظام المتقدم أعلاه
  // النظام الأساسي تم إزالته حسب طلب المستخدم

  // مسارات النسخ الاحتياطي
  app.post("/api/backup/create", async (req, res) => {
    try {
      const result = await backupSystem.createFullBackup();
      res.json(result);
    } catch (error) {
      console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
      res.status(500).json({ 
        success: false, 
        message: 'خطأ في إنشاء النسخة الاحتياطية' 
      });
    }
  });

  app.get("/api/backup/list", async (req, res) => {
    try {
      const backups = await backupSystem.getBackupsList();
      res.json({ success: true, backups });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'خطأ في جلب قائمة النسخ الاحتياطية' 
      });
    }
  });

  // Workers Settlement Report - تقرير تصفية العمال الجماعي (مشاريع متعددة)
  app.get("/api/reports/workers-settlement", async (req, res) => {
    try {
      const { projectIds, dateFrom, dateTo, workerIds } = req.query;

      console.log('📊 طلب تقرير تصفية العمال:', { projectIds, dateFrom, dateTo, workerIds });

      // التحقق من المعاملات المطلوبة
      if (!projectIds) {
        return res.status(400).json({ message: "معرفات المشاريع مطلوبة" });
      }

      // جلب البيانات الأساسية
      const [allProjects, allWorkers] = await Promise.all([
        storage.getProjects(),
        storage.getWorkers()
      ]);

      // تحويل projectIds إلى مصفوفة ومعالجة حالة 'all'
      let selectedProjectIds: string[] = [];
      let selectedProjects: any[] = [];
      
      if (typeof projectIds === 'string') {
        if (projectIds.trim() === 'all' || projectIds.trim() === '') {
          // في حالة 'all' أو فارغ، استخدم جميع المشاريع
          selectedProjects = allProjects;
          selectedProjectIds = allProjects.map(p => p.id);
        } else {
          // في حالة تحديد مشاريع معينة
          selectedProjectIds = projectIds.split(',').filter(id => id.trim());
          selectedProjects = allProjects.filter(project => 
            selectedProjectIds.includes(project.id)
          );
        }
      }

      if (selectedProjects.length === 0) {
        return res.status(404).json({ message: "لا توجد مشاريع متاحة" });
      }

      // فلترة العمال إذا تم تحديدهم
      let selectedWorkerIds: string[] = [];
      if (workerIds && typeof workerIds === 'string') {
        selectedWorkerIds = workerIds.split(',').filter(id => id.trim());
      }

      // جلب بيانات الحضور والتحويلات لجميع المشاريع المحددة
      const allAttendances: any[] = [];
      const allTransfers: any[] = [];

      for (const projectId of selectedProjectIds) {
        try {
          const [attendances, transfers] = await Promise.all([
            storage.getWorkerAttendance(projectId),
            storage.getFilteredWorkerTransfers(projectId)
          ]);
          
          // فلترة بالتاريخ إذا تم تحديده
          let filteredAttendances = attendances;
          if (dateFrom && dateTo) {
            filteredAttendances = attendances.filter(att => 
              att.date >= dateFrom && att.date <= dateTo
            );
          } else if (dateFrom) {
            filteredAttendances = attendances.filter(att => att.date >= dateFrom);
          } else if (dateTo) {
            filteredAttendances = attendances.filter(att => att.date <= dateTo);
          }

          // فلترة التحويلات بالتاريخ إذا تم تحديده
          let filteredTransfers = transfers;
          if (dateFrom && dateTo) {
            filteredTransfers = transfers.filter(trans => 
              trans.transferDate >= dateFrom && trans.transferDate <= dateTo
            );
          } else if (dateFrom) {
            filteredTransfers = transfers.filter(trans => trans.transferDate >= dateFrom);
          } else if (dateTo) {
            filteredTransfers = transfers.filter(trans => trans.transferDate <= dateTo);
          }

          allAttendances.push(...filteredAttendances);
          allTransfers.push(...filteredTransfers);
        } catch (error) {
          console.error(`خطأ في جلب بيانات المشروع ${projectId}:`, error);
        }
      }

      // بناء تقرير العمال
      const workersReport = allWorkers
        .filter(worker => worker.isActive)
        .filter(worker => {
          // إذا تم تحديد عمال معينين
          if (selectedWorkerIds.length > 0) {
            return selectedWorkerIds.includes(worker.id);
          }
          // إذا لم يتم تحديد عمال، أظهر العمال الذين لديهم نشاط في المشاريع المحددة
          return allAttendances.some(attendance => attendance.workerId === worker.id) ||
                 allTransfers.some(transfer => transfer.workerId === worker.id);
        })
        .map(worker => {
          // حساب الحضور والأجور للعامل من جميع المشاريع
          const workerAttendanceRecords = allAttendances.filter(attendance => 
            attendance.workerId === worker.id
          );

          // حساب التحويلات للعامل من جميع المشاريع
          const workerTransferRecords = allTransfers.filter(transfer => 
            transfer.workerId === worker.id
          );

          const totalWorkDays = workerAttendanceRecords.reduce((sum, record) => 
            sum + parseFloat(record.workDays.toString()), 0
          );

          const totalEarned = workerAttendanceRecords.reduce((sum, record) => 
            sum + parseFloat(record.actualWage.toString()), 0
          );

          const totalPaid = workerAttendanceRecords.reduce((sum, record) => 
            sum + parseFloat(record.paidAmount.toString()), 0
          );

          const totalTransfers = workerTransferRecords.reduce((sum, record) => 
            sum + parseFloat(record.amount.toString()), 0
          );

          // الرصيد النهائي = المكتسب - المستلم - المحول للأهل
          const finalBalance = totalEarned - totalPaid - totalTransfers;

          return {
            worker_id: worker.id,
            worker_name: worker.name,
            worker_type: worker.type,
            daily_wage: parseFloat(worker.dailyWage.toString()),
            total_work_days: totalWorkDays,
            total_earned: totalEarned,
            total_paid: totalPaid,
            total_transfers: totalTransfers,
            final_balance: finalBalance
          };
        })
        .filter(workerData => 
          // إظهار العمال الذين لديهم نشاط (حضور أو تحويلات)
          workerData.total_work_days > 0 || workerData.total_transfers > 0
        );

      // حساب الإجماليات
      const totals = {
        total_workers: workersReport.length,
        total_work_days: workersReport.reduce((sum, w) => sum + w.total_work_days, 0),
        total_earned: workersReport.reduce((sum, w) => sum + w.total_earned, 0),
        total_paid: workersReport.reduce((sum, w) => sum + w.total_paid, 0),
        total_transfers: workersReport.reduce((sum, w) => sum + w.total_transfers, 0),
        final_balance: workersReport.reduce((sum, w) => sum + w.final_balance, 0)
      };

      const response = {
        projects: selectedProjects,
        workers: workersReport,
        totals: totals,
        filters: {
          projectIds: selectedProjectIds,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          workerIds: selectedWorkerIds.length > 0 ? selectedWorkerIds : null
        },
        generated_at: new Date().toISOString()
      };

      console.log('✅ تم إنشاء تقرير تصفية العمال بنجاح:', {
        projectsCount: selectedProjects.length,
        workersCount: workersReport.length,
        totalEarned: totals.total_earned,
        finalBalance: totals.final_balance
      });

      res.json(response);

    } catch (error) {
      console.error('❌ خطأ في إنشاء تقرير تصفية العمال:', error);
      res.status(500).json({ 
        message: "خطأ في إنشاء تقرير تصفية العمال",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Report Templates Routes - إعدادات قوالب التقارير
  app.get("/api/report-templates", async (req, res) => {
    try {
      const templates = await storage.getReportTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching report templates:", error);
      res.status(500).json({ message: "خطأ في جلب قوالب التقارير" });
    }
  });

  app.get("/api/report-templates/active", async (req, res) => {
    try {
      const template = await storage.getActiveReportTemplate();
      if (!template) {
        // إنشاء قالب افتراضي إذا لم يوجد
        const defaultTemplate = {
          templateName: 'default',
          headerTitle: 'نظام إدارة مشاريع البناء',
          companyName: 'شركة البناء والتطوير',
          companyAddress: 'صنعاء - اليمن',
          companyPhone: '+967 1 234567',
          companyEmail: 'info@company.com',
          footerText: 'تم إنشاء هذا التقرير بواسطة نظام إدارة المشاريع',
          footerContact: 'للاستفسار: info@company.com | +967 1 234567',
          primaryColor: '#1f2937',
          secondaryColor: '#3b82f6',
          accentColor: '#10b981',
          textColor: '#1f2937',
          backgroundColor: '#ffffff',
          fontSize: 11,
          fontFamily: 'Arial',
          pageOrientation: 'portrait',
          pageSize: 'A4',
          margins: { top: 1, bottom: 1, left: 0.75, right: 0.75 },
          showHeader: true,
          showFooter: true,
          showLogo: true,
          showDate: true,
          showPageNumbers: true,
          isActive: true,
        };
        const newTemplate = await storage.createReportTemplate(defaultTemplate);
        return res.json(newTemplate);
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching active report template:", error);
      res.status(500).json({ message: "خطأ في جلب القالب النشط" });
    }
  });

  app.get("/api/report-templates/:id", async (req, res) => {
    try {
      const template = await storage.getReportTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "قالب التقرير غير موجود" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching report template:", error);
      res.status(500).json({ message: "خطأ في جلب قالب التقرير" });
    }
  });

  app.post("/api/report-templates", async (req, res) => {
    try {
      const result = insertReportTemplateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "بيانات قالب التقرير غير صحيحة", 
          errors: result.error.issues 
        });
      }
      
      const template = await storage.createReportTemplate(result.data);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating report template:", error);
      res.status(500).json({ message: "خطأ في إنشاء قالب التقرير" });
    }
  });

  app.put("/api/report-templates/:id", async (req, res) => {
    try {
      const result = insertReportTemplateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "بيانات قالب التقرير غير صحيحة", 
          errors: result.error.issues 
        });
      }
      
      const template = await storage.updateReportTemplate(req.params.id, result.data);
      if (!template) {
        return res.status(404).json({ message: "قالب التقرير غير موجود" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating report template:", error);
      res.status(500).json({ message: "خطأ في تحديث قالب التقرير" });
    }
  });

  app.delete("/api/report-templates/:id", async (req, res) => {
    try {
      const template = await storage.getReportTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "قالب التقرير غير موجود" });
      }
      
      await storage.deleteReportTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting report template:", error);
      res.status(500).json({ message: "خطأ في حذف قالب التقرير" });
    }
  });

  // =====================================================
  // API Routes لنظام إدارة الإشعارات
  // =====================================================

  // فحص حالة قراءة إشعار معين - قراءة عامة
  app.get("/api/notifications/:userId/read-state", async (req, res) => {
    try {
      const { notificationId, notificationType } = req.query;
      
      if (!notificationId || !notificationType) {
        return res.status(400).json({ message: "notificationId and notificationType are required" });
      }
      
      const isRead = await storage.isNotificationRead(
        req.params.userId,
        notificationId as string,
        notificationType as string
      );
      
      res.json({ isRead });
    } catch (error) {
      console.error('Error checking notification read state:', error);
      res.status(500).json({ message: "خطأ في فحص حالة قراءة الإشعار" });
    }
  });

  // جلب إحصائيات حالة القراءة للمستخدم - قراءة عامة
  app.get("/api/notifications/:userId/read-stats", async (req, res) => {
    try {
      const { userId } = req.params;
      console.log(`📖 جلب إحصائيات حالة القراءة للمستخدم: ${userId}`);
      
      // محاكاة الإحصائيات (يمكن تطويرها لاحقاً لتستخدم قاعدة البيانات الفعلية)
      const readStats = {
        userId,
        totalNotifications: 12,
        readNotifications: 8,
        unreadNotifications: 4,
        lastReadAt: new Date().toISOString(),
        readPercentage: 67
      };
      
      res.json(readStats);
    } catch (error) {
      console.error('خطأ في جلب إحصائيات القراءة:', error);
      res.status(500).json({ message: "خطأ في جلب إحصائيات القراءة" });
    }
  });


  // =====================================================
  // نظام إدارة الإشعارات المتقدم - Advanced Notification System
  // =====================================================

  // جلب الإشعارات للمستخدم مع الفلترة - قراءة عامة
  app.get("/api/notifications", async (req, res) => {
    try {
      // استخدام userId من النظام المتقدم JWT token
      const userId = (req as any).user?.userId;
      const type = req.query.type as string;
      const unreadOnly = req.query.unreadOnly === 'true';
      const projectId = req.query.projectId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await notificationService.getUserNotifications(userId, {
        type,
        unreadOnly,
        projectId,
        limit,
        offset
      });

      // إذا لم توجد إشعارات، أرجع إشعار ترحيب مناسب للمستخدم
      if (result.notifications.length === 0) {
        const userRole = (req as any).user?.role;
        const isAdmin = userRole === 'admin';
        
        if (!isAdmin) {
          // فحص إذا كان إشعار الترحيب مُعلم كمقروء
          console.log(`🚀 فحص حالة قراءة إشعار الترحيب للمستخدم ${userId}`);
          const welcomeReadState = await notificationService.checkNotificationReadState('user-welcome', userId);
          console.log(`📝 نتيجة فحص إشعار الترحيب: ${welcomeReadState ? 'مقروء' : 'غير مقروء'}`);
          
          // إشعار ترحيب للمستخدمين العاديين فقط
          const welcomeNotification = {
            id: 'user-welcome',
            type: 'user-welcome',
            title: 'مرحباً بك في نظام إدارة المشاريع',
            message: 'أهلاً وسهلاً بك! يمكنك الآن متابعة مهامك والإعلانات المهمة من خلال هذا النظام',
            priority: 1,
            createdAt: new Date().toISOString(),
            isRead: welcomeReadState,
            actionRequired: false,
          };
          console.log(`🎆 إرسال إشعار الترحيب مع حالة القراءة: ${welcomeReadState}`);
          return res.json({
            notifications: [welcomeNotification],
            unreadCount: welcomeReadState ? 0 : 1,
            total: 1
          });
        } else {
          // المسؤول لا يحتاج إشعار ترحيب
          return res.json({
            notifications: [],
            unreadCount: 0,
            total: 0
          });
        }
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "خطأ في جلب الإشعارات" });
    }
  });

  // إنشاء إشعار جديد (مسار محمي)
  app.post("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notification = await notificationService.createNotification(req.body);
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ message: "خطأ في إنشاء الإشعار" });
    }
  });

  // إنشاء إشعار أمني طارئ (مسار محمي)
  app.post("/api/notifications/safety", requireAuth, async (req, res) => {
    try {
      const notification = await notificationService.createSafetyAlert(req.body);
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating safety alert:", error);
      res.status(500).json({ message: "خطأ في إنشاء التنبيه الأمني" });
    }
  });

  // إنشاء إشعار مهمة (مسار محمي)
  app.post("/api/notifications/task", requireAuth, async (req, res) => {
    try {
      const notification = await notificationService.createTaskNotification(req.body);
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating task notification:", error);
      res.status(500).json({ message: "خطأ في إنشاء إشعار المهمة" });
    }
  });

  // إنشاء إشعار راتب (مسار محمي)
  app.post("/api/notifications/payroll", requireAuth, async (req, res) => {
    try {
      const notification = await notificationService.createPayrollNotification(req.body);
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating payroll notification:", error);
      res.status(500).json({ message: "خطأ في إنشاء إشعار الراتب" });
    }
  });

  // إنشاء إعلان عام (مسار محمي)
  app.post("/api/notifications/announcement", requireAuth, async (req, res) => {
    try {
      const notification = await notificationService.createAnnouncement(req.body);
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating announcement:", error);
      res.status(500).json({ message: "خطأ في إنشاء الإعلان" });
    }
  });

  // تعليم إشعار كمقروء - نظام موحد ومتقدم (مسار محمي)
  app.post("/api/notifications/:notificationId/mark-read", requireAuth, async (req, res) => {
    try {
      const { notificationId } = req.params;
      // استخدام userId من النظام المتقدم JWT token
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
      }
      
      console.log(`📖 تعليم إشعار كمقروء: ${notificationId} للمستخدم: ${userId}`);
      
      // حفظ حالة القراءة لجميع الإشعارات بما في ذلك إشعار الترحيب
      await notificationService.markAsRead(notificationId, userId);
      
      if (notificationId === 'user-welcome' || notificationId === 'system-welcome') {
        console.log(`✅ تم تعليم إشعار الترحيب كمقروء وحفظ حالته: ${notificationId}`);
      }
      
      res.json({ 
        success: true,
        message: "تم تعليم الإشعار كمقروء بنجاح",
        notificationId,
        userId 
      });
    } catch (error) {
      console.error("خطأ في تعليم الإشعار كمقروء:", error);
      res.status(500).json({ 
        success: false,
        message: "خطأ في تعليم الإشعار كمقروء",
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  });

  // تعليم جميع الإشعارات كمقروءة - نظام موحد (مسار محمي)
  app.post("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
    try {
      // استخدام userId من النظام المتقدم JWT token
      const userId = (req as any).user?.userId;
      const projectId = req.body.projectId as string;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
      }
      
      console.log(`📖 تعليم جميع الإشعارات كمقروءة للمستخدم: ${userId}`);
      
      await notificationService.markAllAsRead(userId, projectId);
      
      res.json({ 
        success: true,
        message: "تم تعليم جميع الإشعارات كمقروءة بنجاح",
        userId,
        projectId 
      });
    } catch (error) {
      console.error("خطأ في تعليم جميع الإشعارات كمقروءة:", error);
      res.status(500).json({ 
        success: false,
        message: "خطأ في تعليم جميع الإشعارات كمقروءة",
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  });

  // حذف إشعار
  app.delete("/api/notifications/:notificationId", async (req, res) => {
    try {
      const { notificationId } = req.params;
      await notificationService.deleteNotification(notificationId);
      res.json({ message: "تم حذف الإشعار" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "خطأ في حذف الإشعار" });
    }
  });

  // جلب إحصائيات الإشعارات
  app.get("/api/notifications/stats", async (req, res) => {
    try {
      // استخدام userId من النظام المتقدم JWT token
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
      }
      const stats = await notificationService.getNotificationStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching notification stats:", error);
      res.status(500).json({ message: "خطأ في جلب إحصائيات الإشعارات" });
    }
  });

  // =====================================================
  // واجهات برمجة التطبيقات للمسؤول - Admin APIs
  // =====================================================

  // جلب جميع الإشعارات مع تفاصيل المستخدمين - للمسؤول فقط
  app.get("/api/admin/notifications/all", async (req, res) => {
    try {
      const requesterId = (req.query.requesterId as string) || 'admin';
      
      // التحقق من الصلاحيات
      if (requesterId !== 'admin' && requesterId !== 'مسؤول') {
        return res.status(403).json({ message: "غير مسموح - المسؤول فقط" });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const type = req.query.type as string;
      const priority = req.query.priority as string;
      
      // بناء شروط البحث
      const conditions = [];
      if (type) {
        conditions.push(eq(notifications.type, type));
      }
      if (priority) {
        conditions.push(eq(notifications.priority, parseInt(priority)));
      }

      // جلب الإشعارات
      const notificationList = await db
        .select()
        .from(notifications)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

      // جلب حالات القراءة لجميع المستخدمين
      const notificationIds = notificationList.map(n => n.id);
      const readStates = notificationIds.length > 0 ? 
        await db
          .select()
          .from(notificationReadStates)
          .where(inArray(notificationReadStates.notificationId, notificationIds)) : [];

      // تجميع البيانات
      const enrichedNotifications = notificationList.map(notification => {
        const notificationReadStates = readStates.filter(
          rs => rs.notificationId === notification.id
        );
        
        return {
          ...notification,
          readStates: notificationReadStates,
          totalReads: notificationReadStates.filter(rs => rs.isRead).length,
          totalUsers: notificationReadStates.length
        };
      });

      const total = await db
        .select({ count: sql`count(*)` })
        .from(notifications)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      res.json({
        notifications: enrichedNotifications,
        total: Number(total[0]?.count || 0),
        limit,
        offset
      });
    } catch (error) {
      console.error("Error fetching admin notifications:", error);
      res.status(500).json({ message: "خطأ في جلب إشعارات المسؤول" });
    }
  });

  // جلب نشاط المستخدمين مع الإشعارات
  app.get("/api/admin/notifications/user-activity", async (req, res) => {
    try {
      const requesterId = (req.query.requesterId as string) || 'admin';
      
      if (requesterId !== 'admin' && requesterId !== 'مسؤول') {
        return res.status(403).json({ message: "غير مسموح - المسؤول فقط" });
      }

      // جلب إحصائيات جميع المستخدمين مع أسمائهم (حتى الذين لم يتفاعلوا مع الإشعارات)
      const userStats = await db.execute(sql`
        SELECT 
          u.id::text as user_id,
          COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email) as user_name,
          u.email as user_email,
          u.role as user_role,
          COALESCE(COUNT(DISTINCT nrs.notification_id), 0) as total_notifications,
          COALESCE(COUNT(CASE WHEN nrs.is_read = true THEN 1 END), 0) as read_notifications,
          COALESCE(COUNT(CASE WHEN nrs.is_read = false THEN 1 END), 0) as unread_notifications,
          MAX(nrs.read_at) as last_activity
        FROM users u
        LEFT JOIN notification_read_states nrs ON u.id::text = nrs.user_id
        GROUP BY u.id, u.first_name, u.last_name, u.email, u.role
        ORDER BY last_activity DESC NULLS LAST, user_name ASC
      `);

      const formattedStats = userStats.rows.map((row: any) => ({
        userId: row.user_id,
        userName: row.user_name || row.user_email?.split('@')[0] || 'مستخدم غير معروف',
        userEmail: row.user_email,
        userRole: row.user_role,
        totalNotifications: Number(row.total_notifications),
        readNotifications: Number(row.read_notifications),
        unreadNotifications: Number(row.unread_notifications),
        lastActivity: row.last_activity,
        readPercentage: row.total_notifications > 0 
          ? Math.round((row.read_notifications / row.total_notifications) * 100) 
          : 0
      }));

      res.json({ userStats: formattedStats });
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({ message: "خطأ في جلب نشاط المستخدمين" });
    }
  });

  // إرسال إشعار مخصص من المسؤول
  app.post("/api/admin/notifications/send", async (req, res) => {
    try {
      const requesterId = (req.body.requesterId as string) || 'admin';
      
      if (requesterId !== 'admin' && requesterId !== 'مسؤول') {
        return res.status(403).json({ message: "غير مسموح - المسؤول فقط" });
      }

      const { title, body, type, priority, recipients, projectId } = req.body;
      
      if (!title || !body || !type) {
        return res.status(400).json({ message: "العنوان والمحتوى والنوع مطلوبة" });
      }

      let finalRecipients: string[] = [];
      
      if (recipients === 'all') {
        finalRecipients = await notificationService.getAllActiveUserIds();
      } else if (recipients === 'admins') {
        // الحصول على جميع المسؤولين من قاعدة البيانات
        const allAdmins = await db.query.users.findMany({
          where: (users, { or, eq }) => or(
            eq(users.role, 'admin'),
            eq(users.role, 'مدير'),
            eq(users.role, 'مشرف')
          )
        });
        finalRecipients = allAdmins.map(admin => admin.id);
      } else if (Array.isArray(recipients)) {
        finalRecipients = recipients;
      } else {
        return res.status(400).json({ message: "مستقبلين غير صحيحين" });
      }

      const notification = await notificationService.createNotification({
        type,
        title,
        body,
        priority: priority || 3,
        recipients: finalRecipients,
        projectId,
        payload: { 
          action: 'open_custom',
          senderType: 'admin',
          customMessage: true 
        },
        channelPreference: {
          push: true,
          email: false,
          sms: false
        }
      });

      res.status(201).json({ 
        notification, 
        sentTo: finalRecipients.length,
        message: `تم إرسال الإشعار إلى ${finalRecipients.length} مستخدم` 
      });
    } catch (error) {
      console.error("Error sending admin notification:", error);
      res.status(500).json({ message: "خطأ في إرسال الإشعار" });
    }
  });

  // حذف إشعار للمستخدم المحدد - للمسؤول فقط
  app.delete("/api/admin/notifications/:notificationId/user/:userId", async (req, res) => {
    try {
      const requesterId = (req.body.requesterId as string) || 'admin';
      
      if (requesterId !== 'admin' && requesterId !== 'مسؤول') {
        return res.status(403).json({ message: "غير مسموح - المسؤول فقط" });
      }

      const { notificationId, userId } = req.params;
      
      await notificationService.deleteNotification(notificationId);
      
      res.json({ 
        message: `تم حذف الإشعار ${notificationId} للمستخدم ${userId}`,
        notificationId,
        userId 
      });
    } catch (error) {
      console.error("Error deleting notification for user:", error);
      res.status(500).json({ message: "خطأ في حذف الإشعار" });
    }
  });

  // تحديث حالة إشعار لمستخدم محدد - للمسؤول فقط  
  app.patch("/api/admin/notifications/:notificationId/user/:userId/status", async (req, res) => {
    try {
      const requesterId = (req.body.requesterId as string) || 'admin';
      
      if (requesterId !== 'admin' && requesterId !== 'مسؤول') {
        return res.status(403).json({ message: "غير مسموح - المسؤول فقط" });
      }

      const { notificationId, userId } = req.params;
      const { isRead } = req.body;
      
      if (typeof isRead !== 'boolean') {
        return res.status(400).json({ message: "حالة القراءة يجب أن تكون true أو false" });
      }

      if (isRead) {
        await notificationService.markAsRead(notificationId, userId);
      } else {
        // إزالة حالة القراءة
        await db
          .delete(notificationReadStates)
          .where(
            and(
              eq(notificationReadStates.notificationId, notificationId),
              eq(notificationReadStates.userId, userId)
            )
          );
      }
      
      res.json({ 
        message: `تم تحديث حالة الإشعار ${notificationId} للمستخدم ${userId}`,
        notificationId,
        userId,
        isRead
      });
    } catch (error) {
      console.error("Error updating notification status:", error);
      res.status(500).json({ message: "خطأ في تحديث حالة الإشعار" });
    }
  });

  // حذف إشعار بالكامل - للمسؤول فقط
  app.delete("/api/admin/notifications/:notificationId", async (req, res) => {
    try {
      const requesterId = (req.query.requesterId as string) || 'admin';
      
      if (requesterId !== 'admin' && requesterId !== 'مسؤول') {
        return res.status(403).json({ message: "غير مسموح - المسؤول فقط" });
      }

      const { notificationId } = req.params;
      
      await notificationService.deleteNotification(notificationId);
      
      res.json({ 
        message: `تم حذف الإشعار ${notificationId} بالكامل`,
        notificationId
      });
    } catch (error) {
      console.error("Error deleting notification completely:", error);
      res.status(500).json({ message: "خطأ في حذف الإشعار" });
    }
  });

  // =====================================================
  // Equipment APIs - إدارة المعدات
  // =====================================================

  // Get all equipment with optional filters
  app.get("/api/equipment", async (req, res) => {
    try {
      const { projectId, status, type, searchTerm } = req.query;
      const filters = {
        projectId: projectId as string,
        status: status as string,
        type: type as string,
        searchTerm: searchTerm as string
      };
      
      console.log(`🔍 جلب المعدات مع فلاتر:`, filters);
      const equipment = await storage.getEquipment(filters);
      console.log(`✅ تم جلب ${equipment.length} معدة`);
      res.json(equipment);
    } catch (error) {
      console.error("خطأ في جلب المعدات:", error);
      res.status(500).json({ message: "خطأ في جلب المعدات" });
    }
  });

  // Get equipment by ID
  app.get("/api/equipment/:id", async (req, res) => {
    try {
      const equipment = await storage.getEquipmentById(req.params.id);
      if (!equipment) {
        return res.status(404).json({ message: "المعدة غير موجودة" });
      }
      res.json(equipment);
    } catch (error) {
      console.error("خطأ في جلب المعدة:", error);
      res.status(500).json({ message: "خطأ في جلب المعدة" });
    }
  });

  // Create new equipment
  app.post("/api/equipment", async (req, res) => {
    try {
      const result = insertEquipmentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "بيانات المعدة غير صحيحة", 
          errors: result.error.issues 
        });
      }
      
      // Equipment creation logic - code will be generated automatically if not provided
      
      const equipment = await storage.createEquipment(result.data);
      console.log(`✅ تم إنشاء معدة جديدة: ${equipment.name}`);
      res.status(201).json(equipment);
    } catch (error) {
      console.error("خطأ في إنشاء المعدة:", error);
      res.status(500).json({ message: "خطأ في إنشاء المعدة" });
    }
  });

  // Update equipment
  app.patch("/api/equipment/:id", async (req, res) => {
    try {
      const result = insertEquipmentSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "بيانات المعدة غير صحيحة", 
          errors: result.error.issues 
        });
      }
      
      const equipment = await storage.updateEquipment(req.params.id, result.data);
      if (!equipment) {
        return res.status(404).json({ message: "المعدة غير موجودة" });
      }
      
      console.log(`✅ تم تحديث المعدة: ${equipment.name}`);
      res.json(equipment);
    } catch (error) {
      console.error("خطأ في تحديث المعدة:", error);
      res.status(500).json({ message: "خطأ في تحديث المعدة" });
    }
  });

  // Delete equipment
  app.delete("/api/equipment/:id", async (req, res) => {
    try {
      const equipment = await storage.getEquipmentById(req.params.id);
      if (!equipment) {
        return res.status(404).json({ message: "المعدة غير موجودة" });
      }
      
      await storage.deleteEquipment(req.params.id);
      console.log(`✅ تم حذف المعدة: ${equipment.name}`);
      res.status(204).send();
    } catch (error) {
      console.error("خطأ في حذف المعدة:", error);
      res.status(500).json({ message: "خطأ في حذف المعدة" });
    }
  });

  // Get equipment movements for specific equipment
  app.get("/api/equipment/:id/movements", async (req, res) => {
    try {
      const movements = await storage.getEquipmentMovements(req.params.id);
      console.log(`✅ تم جلب ${movements.length} حركة للمعدة`);
      res.json(movements);
    } catch (error) {
      console.error("خطأ في جلب حركات المعدة:", error);
      res.status(500).json({ message: "خطأ في جلب حركات المعدة" });
    }
  });

  // Create equipment movement
  app.post("/api/equipment/:id/movements", async (req, res) => {
    try {
      const movementData = { ...req.body, equipmentId: req.params.id };
      const result = insertEquipmentMovementSchema.safeParse(movementData);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "بيانات حركة المعدة غير صحيحة", 
          errors: result.error.issues 
        });
      }
      
      const movement = await storage.createEquipmentMovement(result.data);
      console.log(`✅ تم إنشاء حركة معدة جديدة: ${movement.reason || 'حركة جديدة'}`);
      res.status(201).json(movement);
    } catch (error) {
      console.error("خطأ في إنشاء حركة المعدة:", error);
      res.status(500).json({ message: "خطأ في إنشاء حركة المعدة" });
    }
  });

  // Generate next equipment code
  app.get("/api/equipment/generate-code", async (req, res) => {
    try {
      const nextCode = await storage.generateNextEquipmentCode();
      res.json({ code: nextCode });
    } catch (error) {
      console.error("خطأ في توليد كود المعدة:", error);
      res.status(500).json({ message: "خطأ في توليد كود المعدة" });
    }
  });

  // =====================================================
  // Worker Attendance APIs - نظام حضور العمال  
  // =====================================================

  // Get worker attendance for project with optional date filter
  app.get("/api/worker-attendance", async (req, res) => {
    try {
      const { projectId, date } = req.query;
      
      if (!projectId) {
        return res.status(400).json({ message: "معرف المشروع مطلوب" });
      }
      
      console.log(`🔍 جلب حضور العمال للمشروع: ${projectId}, التاريخ: ${date || 'الكل'}`);
      const attendance = await storage.getWorkerAttendance(projectId as string, date as string);
      console.log(`✅ تم جلب ${attendance.length} سجل حضور`);
      res.json(attendance);
    } catch (error) {
      console.error("خطأ في جلب حضور العمال:", error);
      res.status(500).json({ message: "خطأ في جلب حضور العمال" });
    }
  });

  // Get specific worker attendance record
  app.get("/api/worker-attendance/:id", async (req, res) => {
    try {
      const attendance = await storage.getWorkerAttendanceById(req.params.id);
      if (!attendance) {
        return res.status(404).json({ message: "سجل الحضور غير موجود" });
      }
      res.json(attendance);
    } catch (error) {
      console.error("خطأ في جلب سجل الحضور:", error);
      res.status(500).json({ message: "خطأ في جلب سجل الحضور" });
    }
  });

  // Create worker attendance record
  app.post("/api/worker-attendance", async (req, res) => {
    try {
      const result = insertWorkerAttendanceSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "بيانات الحضور غير صحيحة", 
          errors: result.error.issues 
        });
      }
      
      const attendance = await storage.createWorkerAttendance(result.data);
      console.log(`✅ تم تسجيل حضور عامل جديد للمشروع: ${attendance.projectId}`);
      res.status(201).json(attendance);
    } catch (error) {
      console.error("خطأ في تسجيل الحضور:", error);
      res.status(500).json({ message: "خطأ في تسجيل الحضور" });
    }
  });

  // Update worker attendance record
  app.patch("/api/worker-attendance/:id", async (req, res) => {
    try {
      const result = insertWorkerAttendanceSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "بيانات الحضور غير صحيحة", 
          errors: result.error.issues 
        });
      }
      
      const attendance = await storage.updateWorkerAttendance(req.params.id, result.data);
      if (!attendance) {
        return res.status(404).json({ message: "سجل الحضور غير موجود" });
      }
      
      console.log(`✅ تم تحديث سجل الحضور: ${attendance.id}`);
      res.json(attendance);
    } catch (error) {
      console.error("خطأ في تحديث الحضور:", error);
      res.status(500).json({ message: "خطأ في تحديث الحضور" });
    }
  });

  // Delete worker attendance record  
  app.delete("/api/worker-attendance/:id", async (req, res) => {
    try {
      const attendance = await storage.getWorkerAttendanceById(req.params.id);
      if (!attendance) {
        return res.status(404).json({ message: "سجل الحضور غير موجود" });
      }
      
      await storage.deleteWorkerAttendance(req.params.id);
      console.log(`✅ تم حذف سجل الحضور: ${req.params.id}`);
      res.status(204).send();
    } catch (error) {
      console.error("خطأ في حذف سجل الحضور:", error);
      res.status(500).json({ message: "خطأ في حذف سجل الحضور" });
    }
  });

  // ====== مسارات نظام كشف الأخطاء الذكي ======
  
  // جلب إحصائيات الأخطاء
  app.get("/api/smart-errors/statistics", async (req, res) => {
    try {
      console.log('📊 طلب إحصائيات نظام الأخطاء الذكي');
      
      const statistics = await smartErrorHandler.getErrorStatistics();
      
      res.json({
        success: true,
        statistics,
        message: 'تم جلب إحصائيات الأخطاء بنجاح'
      });
      
    } catch (error: any) {
      console.error('❌ خطأ في جلب إحصائيات الأخطاء:', error);
      res.status(500).json({ 
        success: false,
        message: 'خطأ في جلب إحصائيات الأخطاء',
        error: error.message
      });
    }
  });

  // جلب قائمة الأخطاء التفصيلية
  app.get("/api/smart-errors/detected", async (req, res) => {
    try {
      console.log('📋 طلب جلب قائمة الأخطاء التفصيلية');
      
      const {
        limit = 20,
        offset = 0,
        severity,
        errorType,
        tableName,
        status = 'unresolved'
      } = req.query;

      const result = await smartErrorHandler.getDetectedErrors({
        limit: Number(limit),
        offset: Number(offset),
        severity: severity as string,
        errorType: errorType as string,
        tableName: tableName as string,
        status: status as string
      });
      
      console.log(`📊 تم جلب ${result.errors.length} خطأ من إجمالي ${result.total}`);
      
      res.json({
        success: true,
        detectedErrors: result.errors,
        pagination: {
          total: result.total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: result.hasMore
        },
        message: `تم جلب ${result.errors.length} خطأ بنجاح`
      });
      
    } catch (error: any) {
      console.error('❌ خطأ في جلب قائمة الأخطاء التفصيلية:', error);
      res.status(500).json({ 
        success: false,
        message: 'خطأ في جلب قائمة الأخطاء التفصيلية',
        error: error.message
      });
    }
  });

  // إنشاء خطأ تجريبي لاختبار النظام
  app.post("/api/smart-errors/test", async (req, res) => {
    try {
      console.log('🧪 إنشاء خطأ تجريبي لاختبار النظام الذكي');
      
      // محاولة إدراج بيانات في عمود غير موجود لإثارة خطأ مضمون
      try {
        await db.execute(sql`
          INSERT INTO projects (name, status, nonexistent_column) 
          VALUES ('اختبار خطأ', 'active', 'test')
        `);
        
      } catch (testError: any) {
        // هذا ما نريده - خطأ للاختبار
        console.log('🎯 تم إنشاء خطأ تجريبي بنجاح');
        
        const analyzedError = await smartErrorHandler.handleDatabaseError(
          testError, 
          {
            operation: 'insert',
            tableName: 'projects',
            columnName: 'name',
            attemptedValue: 'مشروع تجريبي للاختبار',
            userId: (req as any).user?.userId || 'system',
            additionalContext: { testMode: true }
          },
          false // لا نريد رمي الخطأ
        );
        
        return res.json({
          success: true,
          message: 'تم إنشاء واختبار خطأ تجريبي بنجاح',
          testError: {
            type: analyzedError.errorType,
            severity: analyzedError.severity,
            friendlyMessage: analyzedError.friendlyMessage,
            fingerprint: analyzedError.fingerprint.substring(0, 12)
          }
        });
      }
      
      res.json({
        success: true,
        message: 'لم يحدث خطأ في الاختبار، قد تكون البيانات موجودة بالفعل'
      });
      
    } catch (error: any) {
      console.error('❌ خطأ في اختبار النظام الذكي:', error);
      res.status(500).json({ 
        success: false,
        message: 'خطأ في اختبار النظام الذكي',
        error: error.message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}