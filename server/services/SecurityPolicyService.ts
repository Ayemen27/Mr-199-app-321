/**
 * خدمة إدارة السياسات الأمنية المتقدمة
 * تدير السياسات الأمنية والاقتراحات والانتهاكات والتنفيذ
 */

import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { 
  securityPolicies, 
  securityPolicySuggestions, 
  securityPolicyImplementations, 
  securityPolicyViolations,
  notifications,
  InsertSecurityPolicy,
  InsertSecurityPolicySuggestion,
  InsertSecurityPolicyImplementation,
  InsertSecurityPolicyViolation,
  SecurityPolicy,
  SecurityPolicySuggestion
} from '../../shared/schema.js';
import { NotificationService } from './NotificationService.js';

export class SecurityPolicyService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  // ====== إدارة السياسات الأمنية ======

  /**
   * جلب جميع السياسات الأمنية
   */
  async getAllPolicies(filters?: {
    status?: string;
    category?: string;
    severity?: string;
    limit?: number;
  }): Promise<SecurityPolicy[]> {
    try {
      console.log('📋 جلب السياسات الأمنية مع الفلاتر:', filters);
      
      const conditions = [];
      if (filters?.status) {
        conditions.push(eq(securityPolicies.status, filters.status));
      }
      if (filters?.category) {
        conditions.push(eq(securityPolicies.category, filters.category));
      }
      if (filters?.severity) {
        conditions.push(eq(securityPolicies.severity, filters.severity));
      }
      
      const policies = await db
        .select()
        .from(securityPolicies)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(securityPolicies.createdAt))
        .limit(filters?.limit || 100);
      
      console.log(`✅ تم جلب ${policies.length} سياسة أمنية`);
      
      return policies;
    } catch (error) {
      console.error('❌ خطأ في جلب السياسات الأمنية:', error);
      throw new Error('فشل في جلب السياسات الأمنية');
    }
  }

  /**
   * إنشاء سياسة أمنية جديدة
   */
  async createPolicy(policyData: InsertSecurityPolicy): Promise<SecurityPolicy> {
    try {
      console.log('🔐 إنشاء سياسة أمنية جديدة:', policyData.title);
      
      // التحقق من عدم تكرار معرف السياسة
      const existingPolicy = await db
        .select()
        .from(securityPolicies)
        .where(eq(securityPolicies.policyId, policyData.policyId))
        .limit(1);
        
      if (existingPolicy.length > 0) {
        throw new Error('معرف السياسة موجود بالفعل');
      }
      
      // إضافة معلومات إضافية
      const enhancedData = {
        ...policyData,
        nextCheck: policyData.checkInterval 
          ? new Date(Date.now() + (policyData.checkInterval * 1000))
          : null,
      };
      
      const [newPolicy] = await db
        .insert(securityPolicies)
        .values(enhancedData)
        .returning();
      
      // إرسال إشعار بإنشاء السياسة
      await this.notificationService.createNotification({
        type: 'security',
        title: 'سياسة أمنية جديدة',
        body: `تم إنشاء السياسة الأمنية: ${newPolicy.title}`,
        priority: this.getSeverityPriority(newPolicy.severity),
      });
      
      console.log('✅ تم إنشاء السياسة الأمنية بنجاح:', newPolicy.id);
      return newPolicy;
    } catch (error) {
      console.error('❌ خطأ في إنشاء السياسة الأمنية:', error);
      throw error;
    }
  }

  /**
   * تحديث سياسة أمنية موجودة
   */
  async updatePolicy(id: string, updates: Partial<InsertSecurityPolicy>): Promise<SecurityPolicy> {
    try {
      console.log('🔄 تحديث السياسة الأمنية:', id);
      
      const [updatedPolicy] = await db
        .update(securityPolicies)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(securityPolicies.id, id))
        .returning();
      
      if (!updatedPolicy) {
        throw new Error('السياسة الأمنية غير موجودة');
      }
      
      // إرسال إشعار بالتحديث
      await this.notificationService.createNotification({
        type: 'security',
        title: 'تحديث السياسة الأمنية',
        body: `تم تحديث السياسة الأمنية: ${updatedPolicy.title}`,
        priority: 3,

      });
      
      console.log('✅ تم تحديث السياسة الأمنية بنجاح');
      return updatedPolicy;
    } catch (error) {
      console.error('❌ خطأ في تحديث السياسة الأمنية:', error);
      throw error;
    }
  }

  /**
   * حذف سياسة أمنية
   */
  async deletePolicy(id: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🗑️ حذف السياسة الأمنية:', id);
      
      // جلب السياسة أولاً
      const [policy] = await db
        .select()
        .from(securityPolicies)
        .where(eq(securityPolicies.id, id))
        .limit(1);
        
      if (!policy) {
        throw new Error('السياسة الأمنية غير موجودة');
      }
      
      // حذف السياسة (سيتم حذف الارتباطات تلقائياً بسبب CASCADE)
      await db
        .delete(securityPolicies)
        .where(eq(securityPolicies.id, id));
      
      // إرسال إشعار بالحذف
      await this.notificationService.createNotification({
        type: 'security',
        title: 'حذف السياسة الأمنية',
        body: `تم حذف السياسة الأمنية: ${policy.title}`,
        priority: 2,

      });
      
      console.log('✅ تم حذف السياسة الأمنية بنجاح');
      return { success: true, message: 'تم حذف السياسة الأمنية بنجاح' };
    } catch (error) {
      console.error('❌ خطأ في حذف السياسة الأمنية:', error);
      throw error;
    }
  }

  // ====== إدارة اقتراحات السياسات ======

  /**
   * جلب جميع اقتراحات السياسات
   */
  async getPolicySuggestions(filters?: {
    status?: string;
    priority?: string;
    category?: string;
    limit?: number;
  }): Promise<SecurityPolicySuggestion[]> {
    try {
      console.log('💡 جلب اقتراحات السياسات');
      
      const conditions = [];
      if (filters?.status) {
        conditions.push(eq(securityPolicySuggestions.status, filters.status));
      }
      if (filters?.priority) {
        conditions.push(eq(securityPolicySuggestions.priority, filters.priority));
      }
      if (filters?.category) {
        conditions.push(eq(securityPolicySuggestions.category, filters.category));
      }
      
      const suggestions = await db
        .select()
        .from(securityPolicySuggestions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(securityPolicySuggestions.createdAt))
        .limit(filters?.limit || 50);
      
      console.log(`✅ تم جلب ${suggestions.length} اقتراح للسياسات`);
      
      return suggestions;
    } catch (error) {
      console.error('❌ خطأ في جلب اقتراحات السياسات:', error);
      throw new Error('فشل في جلب اقتراحات السياسات');
    }
  }

  /**
   * إنشاء اقتراح سياسة جديد
   */
  async createPolicySuggestion(suggestionData: InsertSecurityPolicySuggestion): Promise<SecurityPolicySuggestion> {
    try {
      console.log('💡 إنشاء اقتراح سياسة جديد:', suggestionData.title);
      
      const [newSuggestion] = await db
        .insert(securityPolicySuggestions)
        .values(suggestionData)
        .returning();
      
      // إرسال إشعار بالاقتراح الجديد
      await this.notificationService.createNotification({
        type: 'security',
        title: 'اقتراح سياسة أمنية جديد',
        body: `اقتراح جديد: ${newSuggestion.title}`,
        priority: this.getPriorityNumber(newSuggestion.priority),

      });
      
      console.log('✅ تم إنشاء اقتراح السياسة بنجاح');
      return newSuggestion;
    } catch (error) {
      console.error('❌ خطأ في إنشاء اقتراح السياسة:', error);
      throw error;
    }
  }

  /**
   * الموافقة على اقتراح سياسة وتحويله إلى سياسة فعالة
   */
  async approvePolicySuggestion(suggestionId: string, reviewerId: string): Promise<{
    suggestion: SecurityPolicySuggestion;
    policy: SecurityPolicy;
  }> {
    try {
      console.log('✅ الموافقة على اقتراح السياسة:', suggestionId);
      
      // جلب الاقتراح
      const [suggestion] = await db
        .select()
        .from(securityPolicySuggestions)
        .where(eq(securityPolicySuggestions.id, suggestionId))
        .limit(1);
        
      if (!suggestion) {
        throw new Error('اقتراح السياسة غير موجود');
      }
      
      if (suggestion.status !== 'pending') {
        throw new Error('الاقتراح ليس في حالة انتظار المراجعة');
      }
      
      // إنشاء معرف فريد للسياسة الجديدة
      const policyId = `POL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // إنشاء السياسة من الاقتراح
      const policyData: InsertSecurityPolicy = {
        policyId,
        title: suggestion.title,
        description: suggestion.description,
        category: suggestion.category,
        severity: suggestion.priority === 'critical' ? 'critical' : 
                 suggestion.priority === 'high' ? 'high' : 'medium',
        status: 'active',
        complianceLevel: 'recommended',
        requirements: suggestion.prerequisites as any,
        implementation: {
          effort: suggestion.implementationEffort,
          impact: suggestion.estimatedImpact
        } as any,
        checkCriteria: suggestion.sourceData as any,
        createdBy: reviewerId,
        approvedBy: reviewerId,
        approvedAt: new Date(),
      };
      
      const newPolicy = await this.createPolicy(policyData);
      
      // تحديث حالة الاقتراح
      const [updatedSuggestion] = await db
        .update(securityPolicySuggestions)
        .set({
          status: 'implemented',
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          implementedAs: newPolicy.id,
          implementedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(securityPolicySuggestions.id, suggestionId))
        .returning();
      
      // إرسال إشعار بالموافقة
      await this.notificationService.createNotification({
        type: 'security',
        title: 'تم تنفيذ اقتراح السياسة',
        body: `تم تحويل الاقتراح "${suggestion.title}" إلى سياسة فعالة`,
        priority: 2,
      });
      
      console.log('✅ تم تحويل الاقتراح إلى سياسة فعالة بنجاح');
      return { suggestion: updatedSuggestion, policy: newPolicy };
    } catch (error) {
      console.error('❌ خطأ في الموافقة على اقتراح السياسة:', error);
      throw error;
    }
  }

  // ====== إدارة الانتهاكات ======

  /**
   * جلب انتهاكات السياسات
   */
  async getPolicyViolations(filters?: {
    policyId?: string;
    severity?: string;
    status?: string;
    limit?: number;
  }) {
    try {
      console.log('⚠️ جلب انتهاكات السياسات');
      
      const conditions = [];
      if (filters?.policyId) {
        conditions.push(eq(securityPolicyViolations.policyId, filters.policyId));
      }
      if (filters?.severity) {
        conditions.push(eq(securityPolicyViolations.severity, filters.severity));
      }
      if (filters?.status) {
        conditions.push(eq(securityPolicyViolations.status, filters.status));
      }
      
      const violations = await db
        .select({
          violation: securityPolicyViolations,
          policy: {
            id: securityPolicies.id,
            title: securityPolicies.title,
            category: securityPolicies.category
          }
        })
        .from(securityPolicyViolations)
        .leftJoin(securityPolicies, eq(securityPolicyViolations.policyId, securityPolicies.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(securityPolicyViolations.detectedAt))
        .limit(filters?.limit || 100);
      
      console.log(`⚠️ تم جلب ${violations.length} انتهاك للسياسات`);
      
      return violations;
    } catch (error) {
      console.error('❌ خطأ في جلب انتهاكات السياسات:', error);
      throw new Error('فشل في جلب انتهاكات السياسات');
    }
  }

  /**
   * إنشاء سجل انتهاك جديد
   */
  async createViolation(violationData: InsertSecurityPolicyViolation) {
    try {
      console.log('⚠️ تسجيل انتهاك سياسة جديد');
      
      // إنشاء معرف فريد للانتهاك
      const violationId = `VIO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const enhancedData = {
        ...violationData,
        violationId,
      };
      
      const [newViolation] = await db
        .insert(securityPolicyViolations)
        .values(enhancedData)
        .returning();
      
      // تحديث عداد الانتهاكات في السياسة
      await db
        .update(securityPolicies)
        .set({
          violationsCount: sql`${securityPolicies.violationsCount} + 1`,
          lastViolation: new Date(),
          updatedAt: new Date()
        })
        .where(eq(securityPolicies.id, violationData.policyId));
      
      // إرسال إشعار بالانتهاك
      await this.notificationService.createNotification({
        type: 'security',
        title: 'انتهاك سياسة أمنية',
        body: `تم اكتشاف انتهاك: ${violationData.violatedRule}`,
        priority: this.getSeverityPriority(violationData.severity),

      });
      
      console.log('⚠️ تم تسجيل الانتهاك بنجاح');
      return newViolation;
    } catch (error) {
      console.error('❌ خطأ في تسجيل الانتهاك:', error);
      throw error;
    }
  }

  // ====== الوظائف المساعدة ======

  private getSeverityPriority(severity: string): number {
    const priorityMap: { [key: string]: number } = {
      'critical': 1,
      'high': 2,
      'medium': 3,
      'low': 4
    };
    return priorityMap[severity] || 3;
  }
  
  private getPriorityNumber(priority: string): number {
    const priorityMap: { [key: string]: number } = {
      'critical': 1,
      'high': 2,
      'medium': 3,
      'low': 4
    };
    return priorityMap[priority] || 3;
  }

  /**
   * إنشاء اقتراحات سياسات ذكية بناءً على تحليل النظام
   */
  async generateSmartSuggestions(): Promise<SecurityPolicySuggestion[]> {
    try {
      console.log('🤖 إنشاء اقتراحات ذكية للسياسات الأمنية');
      
      const suggestions: InsertSecurityPolicySuggestion[] = [
        {
          suggestedPolicyId: `SMART-AUTH-${Date.now()}`,
          title: 'تعزيز أمان كلمات المرور',
          description: 'تطبيق سياسة كلمات مرور قوية تتطلب 12 حرف كحد أدنى مع أحرف خاصة',
          category: 'authentication',
          priority: 'high',
          confidence: 95,
          reasoning: 'تحليل أمني يظهر ضرورة تقوية كلمات المرور',
          estimatedImpact: 'تحسين الأمان بنسبة 70%',
          implementationEffort: 'low',
          sourceType: 'ai_analysis'
        },
        {
          suggestedPolicyId: `SMART-ACCESS-${Date.now()}`,
          title: 'مراقبة محاولات الدخول المشبوهة',
          description: 'تطبيق نظام مراقبة تلقائي لمحاولات الدخول غير الطبيعية',
          category: 'access_control',
          priority: 'critical',
          confidence: 88,
          reasoning: 'اكتشاف أنماط وصول غير طبيعية في السجلات',
          estimatedImpact: 'منع 90% من محاولات الاختراق',
          implementationEffort: 'medium',
          sourceType: 'security_scan'
        },
        {
          suggestedPolicyId: `SMART-DATA-${Date.now()}`,
          title: 'تشفير البيانات الحساسة',
          description: 'تطبيق تشفير AES-256 لجميع البيانات المالية والشخصية',
          category: 'data_protection',
          priority: 'critical',
          confidence: 92,
          reasoning: 'وجود بيانات حساسة غير مشفرة في قاعدة البيانات',
          estimatedImpact: 'حماية 100% من البيانات الحساسة',
          implementationEffort: 'high',
          sourceType: 'best_practice'
        }
      ];
      
      const createdSuggestions = [];
      for (const suggestion of suggestions) {
        try {
          const created = await this.createPolicySuggestion(suggestion);
          createdSuggestions.push(created);
        } catch (error) {
          console.error('خطأ في إنشاء اقتراح:', error);
        }
      }
      
      console.log(`🤖 تم إنشاء ${createdSuggestions.length} اقتراح ذكي`);
      return createdSuggestions;
    } catch (error) {
      console.error('❌ خطأ في إنشاء الاقتراحات الذكية:', error);
      throw error;
    }
  }
}

export const securityPolicyService = new SecurityPolicyService();