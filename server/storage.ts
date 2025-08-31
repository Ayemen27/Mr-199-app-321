/**
 * الوصف: طبقة الوصول للبيانات - إدارة جميع عمليات قاعدة البيانات
 * المدخلات: طلبات CRUD للبيانات
 * المخرجات: كائنات البيانات والاستعلامات المحسّنة
 * المالك: عمار
 * آخر تعديل: 2025-08-20
 * الحالة: نشط - نظام إدارة البيانات الأساسي
 */

import { 
  type Project, type Worker, type FundTransfer, type WorkerAttendance, 
  type Material, type MaterialPurchase, type TransportationExpense, type DailyExpenseSummary,
  type WorkerTransfer, type WorkerBalance, type AutocompleteData, type WorkerType, type WorkerMiscExpense, type User,
  type Supplier, type SupplierPayment, type PrintSettings, type ProjectFundTransfer,
  type ReportTemplate,
  // Equipment types (النظام المبسط)
  type Equipment, type EquipmentMovement, type InsertEquipment, type InsertEquipmentMovement,
  // Notifications types
  type Notification, type InsertNotification,
  type NotificationReadState, type InsertNotificationReadState,
  // AI System types (النظام الذكي)
  type AiSystemLog, type AiSystemMetric, type AiSystemDecision, type AiSystemRecommendation,
  type InsertAiSystemLog, type InsertAiSystemMetric, type InsertAiSystemDecision, type InsertAiSystemRecommendation,
  type InsertProject, type InsertWorker, type InsertFundTransfer, type InsertWorkerAttendance,
  type InsertMaterial, type InsertMaterialPurchase, type InsertTransportationExpense, type InsertDailyExpenseSummary,
  type InsertWorkerTransfer, type InsertWorkerBalance, type InsertAutocompleteData, type InsertWorkerType, type InsertWorkerMiscExpense, type InsertUser,
  type InsertSupplier, type InsertSupplierPayment, type InsertPrintSettings, type InsertProjectFundTransfer,
  type InsertReportTemplate,
  projects, workers, fundTransfers, workerAttendance, materials, materialPurchases, transportationExpenses, dailyExpenseSummaries,
  workerTransfers, workerBalances, autocompleteData, workerTypes, workerMiscExpenses, users, suppliers, supplierPayments, printSettings, projectFundTransfers, reportTemplates,
  // Equipment tables (النظام المبسط)
  equipment, equipmentMovements,
  // Notifications tables
  notifications, notificationReadStates,
  // AI System tables (النظام الذكي)
  aiSystemLogs, aiSystemMetrics, aiSystemDecisions, aiSystemRecommendations
} from "@shared/schema";
import { db } from "./db";
import { and, eq, isNull, or, gte, lte, desc, ilike, like, isNotNull, asc, count, sum, ne, max, sql, inArray, gt } from 'drizzle-orm';

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectByName(name: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;
  
  // Workers
  getWorkers(): Promise<Worker[]>;
  getWorker(id: string): Promise<Worker | undefined>;
  getWorkerByName(name: string): Promise<Worker | undefined>;
  createWorker(worker: InsertWorker): Promise<Worker>;
  updateWorker(id: string, worker: Partial<InsertWorker>): Promise<Worker | undefined>;
  
  // Worker Types
  getWorkerTypes(): Promise<WorkerType[]>;
  createWorkerType(workerType: InsertWorkerType): Promise<WorkerType>;
  
  // Fund Transfers
  getFundTransfers(projectId: string, date?: string): Promise<FundTransfer[]>;
  getFundTransferByNumber(transferNumber: string): Promise<FundTransfer | undefined>;
  createFundTransfer(transfer: InsertFundTransfer): Promise<FundTransfer>;
  updateFundTransfer(id: string, transfer: Partial<InsertFundTransfer>): Promise<FundTransfer | undefined>;
  deleteFundTransfer(id: string): Promise<void>;
  
  // Project Fund Transfers (ترحيل الأموال بين المشاريع)
  getProjectFundTransfers(fromProjectId?: string, toProjectId?: string, date?: string): Promise<ProjectFundTransfer[]>;
  getProjectFundTransfer(id: string): Promise<ProjectFundTransfer | undefined>;
  createProjectFundTransfer(transfer: InsertProjectFundTransfer): Promise<ProjectFundTransfer>;
  updateProjectFundTransfer(id: string, transfer: Partial<InsertProjectFundTransfer>): Promise<ProjectFundTransfer | undefined>;
  deleteProjectFundTransfer(id: string): Promise<void>;
  
  // Worker Attendance
  getWorkerAttendance(projectId: string, date?: string): Promise<WorkerAttendance[]>;
  getWorkerAttendanceById(id: string): Promise<WorkerAttendance | null>;
  createWorkerAttendance(attendance: InsertWorkerAttendance): Promise<WorkerAttendance>;
  updateWorkerAttendance(id: string, attendance: Partial<InsertWorkerAttendance>): Promise<WorkerAttendance | undefined>;
  deleteWorkerAttendance(id: string): Promise<void>;
  
  // Materials
  getMaterials(): Promise<Material[]>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  findMaterialByNameAndUnit(name: string, unit: string): Promise<Material | undefined>;
  
  // Material Purchases
  getMaterialPurchases(projectId: string, dateFrom?: string, dateTo?: string): Promise<MaterialPurchase[]>;
  getMaterialPurchasesWithFilters(filters: {
    supplierId?: string;
    projectId?: string;
    dateFrom?: string;
    dateTo?: string;
    purchaseType?: string;
  }): Promise<MaterialPurchase[]>;
  getMaterialPurchasesDateRange(): Promise<{ minDate: string; maxDate: string }>;
  getMaterialPurchaseById(id: string): Promise<MaterialPurchase | null>;
  createMaterialPurchase(purchase: InsertMaterialPurchase): Promise<MaterialPurchase>;
  updateMaterialPurchase(id: string, purchase: Partial<InsertMaterialPurchase>): Promise<MaterialPurchase | undefined>;
  deleteMaterialPurchase(id: string): Promise<void>;
  
  // Transportation Expenses
  getAllTransportationExpenses(): Promise<TransportationExpense[]>;
  getTransportationExpenses(projectId: string, date?: string): Promise<TransportationExpense[]>;
  createTransportationExpense(expense: InsertTransportationExpense): Promise<TransportationExpense>;
  updateTransportationExpense(id: string, expense: Partial<InsertTransportationExpense>): Promise<TransportationExpense | undefined>;
  deleteTransportationExpense(id: string): Promise<void>;
  
  // Daily Expense Summaries
  getDailyExpenseSummary(projectId: string, date: string): Promise<DailyExpenseSummary | undefined>;
  createOrUpdateDailyExpenseSummary(summary: InsertDailyExpenseSummary): Promise<DailyExpenseSummary>;
  getPreviousDayBalance(projectId: string, currentDate: string): Promise<string>;
  deleteDailySummary(projectId: string, date: string): Promise<void>;
  getDailySummary(projectId: string, date: string): Promise<DailyExpenseSummary | null>;
  
  // Worker Balance Management
  getWorkerBalance(workerId: string, projectId: string): Promise<WorkerBalance | undefined>;
  updateWorkerBalance(workerId: string, projectId: string, balance: Partial<InsertWorkerBalance>): Promise<WorkerBalance>;
  
  // Worker Transfers
  getWorkerTransfers(workerId: string, projectId?: string): Promise<WorkerTransfer[]>;
  getWorkerTransfer(id: string): Promise<WorkerTransfer | null>;
  createWorkerTransfer(transfer: InsertWorkerTransfer): Promise<WorkerTransfer>;
  updateWorkerTransfer(id: string, transfer: Partial<InsertWorkerTransfer>): Promise<WorkerTransfer | undefined>;
  deleteWorkerTransfer(id: string): Promise<void>;
  getAllWorkerTransfers(): Promise<WorkerTransfer[]>;
  getFilteredWorkerTransfers(projectId?: string, date?: string): Promise<WorkerTransfer[]>;
  
  // Project Statistics
  getProjectStatistics(projectId: string): Promise<any>;
  
  // Reports
  getWorkerAccountStatement(workerId: string, projectId?: string, dateFrom?: string, dateTo?: string): Promise<{
    attendance: WorkerAttendance[];
    transfers: WorkerTransfer[];
    balance: WorkerBalance | null;
  }>;
  
  // Multi-project worker management
  getWorkersWithMultipleProjects(): Promise<{worker: Worker, projects: Project[], totalBalance: string}[]>;
  getWorkerMultiProjectStatement(workerId: string, dateFrom?: string, dateTo?: string): Promise<{
    worker: Worker;
    projects: {
      project: Project;
      attendance: WorkerAttendance[];
      balance: WorkerBalance | null;
      transfers: WorkerTransfer[];
    }[];
    totals: {
      totalEarned: string;
      totalPaid: string;
      totalTransferred: string;
      totalBalance: string;
    };
  }>;
  getWorkerProjects(workerId: string): Promise<Project[]>;
  updateDailySummaryForDate(projectId: string, date: string): Promise<void>;
  getDailyExpensesRange(projectId: string, dateFrom: string, dateTo: string): Promise<any[]>;
  
  // Autocomplete data
  getAutocompleteData(category: string): Promise<AutocompleteData[]>;
  saveAutocompleteData(data: InsertAutocompleteData): Promise<AutocompleteData>;
  removeAutocompleteData(category: string, value: string): Promise<void>;
  
  // Worker miscellaneous expenses
  getWorkerMiscExpenses(projectId: string, date?: string): Promise<WorkerMiscExpense[]>;
  getWorkerMiscExpense(id: string): Promise<WorkerMiscExpense | null>;
  createWorkerMiscExpense(expense: InsertWorkerMiscExpense): Promise<WorkerMiscExpense>;
  updateWorkerMiscExpense(id: string, expense: Partial<InsertWorkerMiscExpense>): Promise<WorkerMiscExpense | undefined>;
  deleteWorkerMiscExpense(id: string): Promise<void>;
  
  // Advanced Reports
  getExpensesForReport(projectId: string, dateFrom: string, dateTo: string): Promise<any[]>;
  getIncomeForReport(projectId: string, dateFrom: string, dateTo: string): Promise<any[]>;
  
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  
  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  getSupplierByName(name: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: string): Promise<void>;
  
  // Supplier Payments
  getAllSupplierPayments(): Promise<SupplierPayment[]>;
  getSupplierPayments(supplierId: string, projectId?: string): Promise<SupplierPayment[]>;
  getSupplierPayment(id: string): Promise<SupplierPayment | undefined>;
  createSupplierPayment(payment: InsertSupplierPayment): Promise<SupplierPayment>;
  updateSupplierPayment(id: string, payment: Partial<InsertSupplierPayment>): Promise<SupplierPayment | undefined>;
  deleteSupplierPayment(id: string): Promise<void>;
  
  // Supplier Reports
  getSupplierAccountStatement(supplierId: string, projectId?: string, dateFrom?: string, dateTo?: string): Promise<{
    supplier: Supplier;
    purchases: MaterialPurchase[];
    payments: SupplierPayment[];
    totalDebt: string;
    totalPaid: string;
    remainingDebt: string;
    // إضافة الحسابات المنفصلة للنقدي والآجل
    cashPurchases: {
      total: string;
      count: number;
      purchases: MaterialPurchase[];
    };
    creditPurchases: {
      total: string;
      count: number;
      purchases: MaterialPurchase[];
    };
  }>;
  
  // إحصائيات عامة لحساب الموردين
  getSupplierStatistics(filters?: {
    supplierId?: string;
    projectId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    totalSuppliers: number;
    totalCashPurchases: string;
    totalCreditPurchases: string;
    totalDebt: string;
    totalPaid: string;
    remainingDebt: string;
    activeSuppliers: number;
  }>;
  
  // Purchase filtering for supplier reports
  getPurchasesBySupplier(supplierId: string, purchaseType?: string, dateFrom?: string, dateTo?: string): Promise<MaterialPurchase[]>;
  
  // Print Settings
  getPrintSettings(reportType?: string, userId?: string): Promise<PrintSettings[]>;
  getPrintSettingsById(id: string): Promise<PrintSettings | undefined>;
  createPrintSettings(settings: InsertPrintSettings): Promise<PrintSettings>;
  updatePrintSettings(id: string, settings: Partial<InsertPrintSettings>): Promise<PrintSettings | undefined>;
  deletePrintSettings(id: string): Promise<void>;
  getDefaultPrintSettings(reportType: string): Promise<PrintSettings | undefined>;
  

  
  // Report Templates
  getReportTemplates(): Promise<ReportTemplate[]>;
  getReportTemplate(id: string): Promise<ReportTemplate | undefined>;
  getActiveReportTemplate(): Promise<ReportTemplate | undefined>;
  createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate>;
  updateReportTemplate(id: string, template: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined>;
  deleteReportTemplate(id: string): Promise<void>;

  // =====================================================
  // نظام إدارة المعدات المبسط
  // =====================================================

  // Equipment - Simple Management
  getEquipment(filters?: {
    projectId?: string;
    status?: string;
    type?: string;
    searchTerm?: string;
  }): Promise<Equipment[]>;
  getEquipmentById(id: string): Promise<Equipment | undefined>;
  getEquipmentByCode(code: string): Promise<Equipment | undefined>;
  getEquipmentByProject(projectId: string): Promise<Equipment[]>;
  generateNextEquipmentCode(): Promise<string>;
  createEquipment(equipment: InsertEquipment): Promise<Equipment>;
  updateEquipment(id: string, equipment: Partial<InsertEquipment>): Promise<Equipment | undefined>;
  deleteEquipment(id: string): Promise<void>;

  // Equipment Movements - Simple Tracking
  getEquipmentMovements(equipmentId: string): Promise<EquipmentMovement[]>;
  createEquipmentMovement(movement: InsertEquipmentMovement): Promise<EquipmentMovement>;


  // =====================================================
  // نظام إدارة الإشعارات
  // =====================================================

  // Notification Read States
  isNotificationRead(userId: string, notificationId: string, notificationType: string): Promise<boolean>;
  getNotificationReadState(userId: string, notificationId: string, notificationType: string): Promise<NotificationReadState | undefined>;
  markNotificationAsRead(userId: string, notificationId: string, notificationType: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  getReadNotifications(userId: string, notificationType?: string): Promise<NotificationReadState[]>;

  // =====================================================
  // AI System Methods (نظام الذكاء الاصطناعي)
  // =====================================================

  // AI System Logs
  getAiSystemLogs(filters?: { logType?: string; operation?: string; limit?: number }): Promise<AiSystemLog[]>;
  createAiSystemLog(log: InsertAiSystemLog): Promise<AiSystemLog>;
  deleteOldAiSystemLogs(olderThanDays: number): Promise<void>;

  // AI System Metrics
  getAiSystemMetrics(filters?: { metricType?: string; isActive?: boolean; limit?: number }): Promise<AiSystemMetric[]>;
  getLatestAiSystemMetrics(): Promise<AiSystemMetric[]>;
  createAiSystemMetric(metric: InsertAiSystemMetric): Promise<AiSystemMetric>;
  updateAiSystemMetric(id: string, metric: Partial<InsertAiSystemMetric>): Promise<AiSystemMetric | undefined>;

  // AI System Decisions
  getAiSystemDecisions(filters?: { status?: string; decisionType?: string; priority?: number }): Promise<AiSystemDecision[]>;
  getAiSystemDecision(id: string): Promise<AiSystemDecision | undefined>;
  createAiSystemDecision(decision: InsertAiSystemDecision): Promise<AiSystemDecision>;
  updateAiSystemDecision(id: string, decision: Partial<InsertAiSystemDecision>): Promise<AiSystemDecision | undefined>;
  executeAiSystemDecision(id: string, executedBy: string): Promise<AiSystemDecision | undefined>;

  // AI System Recommendations
  getAiSystemRecommendations(filters?: { status?: string; priority?: string; targetArea?: string }): Promise<AiSystemRecommendation[]>;
  getAiSystemRecommendation(id: string): Promise<AiSystemRecommendation | undefined>;
  createAiSystemRecommendation(recommendation: InsertAiSystemRecommendation): Promise<AiSystemRecommendation>;
  updateAiSystemRecommendation(id: string, recommendation: Partial<InsertAiSystemRecommendation>): Promise<AiSystemRecommendation | undefined>;
  executeAiSystemRecommendation(id: string, executionResult: any): Promise<AiSystemRecommendation | undefined>;
  dismissAiSystemRecommendation(id: string): Promise<AiSystemRecommendation | undefined>;

  // Database Administration
  getDatabaseTables(): Promise<any[]>;
  toggleTableRLS(tableName: string, enable: boolean): Promise<any>;
  getTablePolicies(tableName: string): Promise<any[]>;
  analyzeSecurityThreats(): Promise<any>;

}

export class DatabaseStorage implements IStorage {
  // Cache للمعدات - تحسين الأداء الفائق
  private equipmentCache: { data: any[], timestamp: number } | null = null;
  
  // Cache للإحصائيات - تحسين الأداء الفائق للمشاريع 
  private projectStatsCache: Map<string, { data: any, timestamp: number }> = new Map();
  
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 دقائق cache

  // Projects
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectByName(name: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.name, name.trim()));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    try {
      const [newProject] = await db
        .insert(projects)
        .values({ ...project, name: project.name.trim() })
        .returning();
      
      if (!newProject) {
        throw new Error('فشل في إنشاء المشروع');
      }
      
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    const updateData = project.name ? { ...project, name: project.name.trim() } : project;
    const [updated] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Workers
  async getWorkers(): Promise<Worker[]> {
    return await db.select().from(workers);
  }

  async getWorker(id: string): Promise<Worker | undefined> {
    const [worker] = await db.select().from(workers).where(eq(workers.id, id));
    return worker || undefined;
  }

  async getWorkerByName(name: string): Promise<Worker | undefined> {
    const [worker] = await db.select().from(workers).where(eq(workers.name, name.trim()));
    return worker || undefined;
  }

  async createWorker(worker: InsertWorker): Promise<Worker> {
    try {
      // التحقق من وجود نوع العامل وإضافته إذا لم يكن موجوداً
      await this.ensureWorkerTypeExists(worker.type);
      
      const [newWorker] = await db
        .insert(workers)
        .values({ ...worker, name: worker.name.trim() })
        .returning();
      
      if (!newWorker) {
        throw new Error('فشل في إنشاء العامل');
      }
      
      // تحديث عداد الاستخدام لنوع العامل
      await this.incrementWorkerTypeUsage(worker.type);
      
      return newWorker;
    } catch (error) {
      console.error('Error creating worker:', error);
      throw error;
    }
  }

  async updateWorker(id: string, worker: Partial<InsertWorker>): Promise<Worker | undefined> {
    const updateData = worker.name ? { ...worker, name: worker.name.trim() } : worker;
    const [updated] = await db
      .update(workers)
      .set(updateData)
      .where(eq(workers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteWorker(id: string): Promise<void> {
    try {
      await db.delete(workers).where(eq(workers.id, id));
    } catch (error) {
      console.error('Error deleting worker:', error);
      throw new Error('فشل في حذف العامل');
    }
  }

  // Worker Types
  async getWorkerTypes(): Promise<WorkerType[]> {
    try {
      return await db.select().from(workerTypes).orderBy(sql`${workerTypes.usageCount} DESC, ${workerTypes.name} ASC`);
    } catch (error) {
      console.error('Error fetching worker types:', error);
      throw new Error('خطأ في جلب أنواع العمال');
    }
  }

  async createWorkerType(workerType: InsertWorkerType): Promise<WorkerType> {
    try {
      const [newWorkerType] = await db
        .insert(workerTypes)
        .values({ ...workerType, name: workerType.name.trim() })
        .returning();
      
      if (!newWorkerType) {
        throw new Error('فشل في إنشاء نوع العامل');
      }
      
      return newWorkerType;
    } catch (error) {
      console.error('Error creating worker type:', error);
      throw new Error('خطأ في إضافة نوع العامل');
    }
  }

  // دالة للتأكد من وجود نوع العامل وإضافته إذا لم يكن موجوداً
  private async ensureWorkerTypeExists(typeName: string): Promise<void> {
    try {
      const trimmedName = typeName.trim();
      
      // البحث عن نوع العامل
      const [existingType] = await db
        .select()
        .from(workerTypes)
        .where(eq(workerTypes.name, trimmedName));
      
      // إذا لم يكن موجوداً، أضفه
      if (!existingType) {
        await db
          .insert(workerTypes)
          .values({ name: trimmedName })
          .onConflictDoNothing(); // تجنب الخطأ إذا تم إدراجه من مكان آخر
      }
    } catch (error) {
      console.error('Error ensuring worker type exists:', error);
      // لا نلقي خطأ هنا لأن هذا لا يجب أن يوقف إنشاء العامل
    }
  }

  // دالة لزيادة عداد استخدام نوع العامل
  private async incrementWorkerTypeUsage(typeName: string): Promise<void> {
    try {
      await db
        .update(workerTypes)
        .set({ 
          usageCount: sql`${workerTypes.usageCount} + 1`,
          lastUsed: new Date()
        })
        .where(eq(workerTypes.name, typeName.trim()));
    } catch (error) {
      console.error('Error incrementing worker type usage:', error);
      // لا نلقي خطأ هنا لأن هذا ليس حرجاً
    }
  }

  // Fund Transfers
  async getFundTransfers(projectId: string, date?: string): Promise<FundTransfer[]> {
    if (date) {
      const result = await db.select().from(fundTransfers)
        .where(and(eq(fundTransfers.projectId, projectId), sql`DATE(${fundTransfers.transferDate}) = ${date}`));
      return result;
    } else {
      const result = await db.select().from(fundTransfers)
        .where(eq(fundTransfers.projectId, projectId));
      return result;
    }
  }

  async getFundTransferByNumber(transferNumber: string): Promise<FundTransfer | undefined> {
    const [transfer] = await db.select().from(fundTransfers).where(eq(fundTransfers.transferNumber, transferNumber));
    return transfer || undefined;
  }

  async createFundTransfer(transfer: InsertFundTransfer): Promise<FundTransfer> {
    try {
      console.log('💾 إنشاء حولة جديدة في قاعدة البيانات:', {
        projectId: transfer.projectId,
        amount: transfer.amount,
        transferType: transfer.transferType,
        senderName: transfer.senderName
      });
      
      const [newTransfer] = await db
        .insert(fundTransfers)
        .values(transfer)
        .returning();
      
      if (!newTransfer) {
        throw new Error('فشل في إنشاء تحويل العهدة - لم يتم إرجاع البيانات من قاعدة البيانات');
      }
      
      console.log('✅ تم إنشاء الحولة بنجاح في قاعدة البيانات:', newTransfer.id);
      
      // تحديث الملخص اليومي في الخلفية (دون انتظار)
      const transferDate = new Date(transfer.transferDate).toISOString().split('T')[0];
      this.updateDailySummaryForDate(transfer.projectId, transferDate).catch(console.error);
      
      return newTransfer;
    } catch (error: any) {
      console.error('❌ خطأ في إنشاء الحولة:', error);
      
      // إذا كان الخطأ متعلق بتكرار رقم التحويل
      if (error.code === '23505' && error.constraint?.includes('transfer_number')) {
        throw new Error('يوجد تحويل بنفس رقم الحوالة مسبقاً');
      }
      
      // إذا كان الخطأ متعلق بمرجع خارجي غير صحيح (المشروع غير موجود)
      if (error.code === '23503') {
        throw new Error('المشروع المحدد غير موجود');
      }
      
      // إذا كان الخطأ متعلق بقيود البيانات
      if (error.code === '23514') {
        throw new Error('البيانات المدخلة لا تتوافق مع قيود قاعدة البيانات');
      }
      
      // خطأ عام
      throw new Error(error.message || 'حدث خطأ غير متوقع أثناء إنشاء الحولة');
    }
  }

  async updateFundTransfer(id: string, transfer: Partial<InsertFundTransfer>): Promise<FundTransfer | undefined> {
    const [oldTransfer] = await db.select().from(fundTransfers).where(eq(fundTransfers.id, id));
    
    const [updated] = await db
      .update(fundTransfers)
      .set(transfer)
      .where(eq(fundTransfers.id, id))
      .returning();
    
    if (updated && oldTransfer) {
      const oldDate = new Date(oldTransfer.transferDate).toISOString().split('T')[0];
      await this.updateDailySummaryForDate(oldTransfer.projectId, oldDate);
      
      if (transfer.transferDate) {
        const newDate = new Date(transfer.transferDate).toISOString().split('T')[0];
        if (newDate !== oldDate) {
          await this.updateDailySummaryForDate(updated.projectId, newDate);
        }
      }
    }
    
    return updated || undefined;
  }

  async deleteFundTransfer(id: string): Promise<void> {
    const [transfer] = await db.select().from(fundTransfers).where(eq(fundTransfers.id, id));
    
    await db.delete(fundTransfers).where(eq(fundTransfers.id, id));
    
    if (transfer) {
      const transferDate = new Date(transfer.transferDate).toISOString().split('T')[0];
      await this.updateDailySummaryForDate(transfer.projectId, transferDate);
    }
  }

  // دالة مساعدة لجلب عمليات ترحيل الأموال لمشروع معين في تاريخ محدد
  async getProjectFundTransfersForDate(projectId: string, date: string): Promise<ProjectFundTransfer[]> {
    const transfers = await db.select().from(projectFundTransfers)
      .where(
        and(
          or(
            eq(projectFundTransfers.fromProjectId, projectId),
            eq(projectFundTransfers.toProjectId, projectId)
          ),
          eq(projectFundTransfers.transferDate, date)
        )
      );
    return transfers;
  }

  // Project Fund Transfers (ترحيل الأموال بين المشاريع)
  async getProjectFundTransfers(fromProjectId?: string, toProjectId?: string, date?: string): Promise<ProjectFundTransfer[]> {
    const conditions = [];
    if (fromProjectId) {
      conditions.push(eq(projectFundTransfers.fromProjectId, fromProjectId));
    }
    if (toProjectId) {
      conditions.push(eq(projectFundTransfers.toProjectId, toProjectId));
    }
    if (date) {
      conditions.push(eq(projectFundTransfers.transferDate, date));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(projectFundTransfers).where(and(...conditions));
    }
    
    return await db.select().from(projectFundTransfers);
  }

  async getProjectFundTransfer(id: string): Promise<ProjectFundTransfer | undefined> {
    const [transfer] = await db.select().from(projectFundTransfers).where(eq(projectFundTransfers.id, id));
    return transfer || undefined;
  }

  async createProjectFundTransfer(transfer: InsertProjectFundTransfer): Promise<ProjectFundTransfer> {
    try {
      // التحقق من أن المشروعين مختلفين
      if (transfer.fromProjectId === transfer.toProjectId) {
        throw new Error('لا يمكن ترحيل الأموال إلى نفس المشروع');
      }

      // التحقق من وجود المشروعين
      const fromProject = await this.getProject(transfer.fromProjectId);
      const toProject = await this.getProject(transfer.toProjectId);
      
      if (!fromProject) {
        throw new Error('المشروع المرسل غير موجود');
      }
      if (!toProject) {
        throw new Error('المشروع المستلم غير موجود');
      }

      // إنشاء عملية الترحيل
      const [newTransfer] = await db
        .insert(projectFundTransfers)
        .values(transfer)
        .returning();
      
      if (!newTransfer) {
        throw new Error('فشل في إنشاء عملية الترحيل');
      }
      
      // تحديث الملخصات اليومية للمشروعين
      if (transfer.transferDate) {
        await this.updateDailySummaryForDate(transfer.fromProjectId, transfer.transferDate);
        await this.updateDailySummaryForDate(transfer.toProjectId, transfer.transferDate);
      }
      
      return newTransfer;
    } catch (error) {
      console.error('Error creating project fund transfer:', error);
      throw error;
    }
  }

  async updateProjectFundTransfer(id: string, transfer: Partial<InsertProjectFundTransfer>): Promise<ProjectFundTransfer | undefined> {
    const [oldTransfer] = await db.select().from(projectFundTransfers).where(eq(projectFundTransfers.id, id));
    
    const [updated] = await db
      .update(projectFundTransfers)
      .set(transfer)
      .where(eq(projectFundTransfers.id, id))
      .returning();
    
    if (updated && oldTransfer) {
      // تحديث الملخصات اليومية للمشاريع المتأثرة
      await this.updateDailySummaryForDate(oldTransfer.fromProjectId, oldTransfer.transferDate);
      await this.updateDailySummaryForDate(oldTransfer.toProjectId, oldTransfer.transferDate);
      
      if (transfer.transferDate) {
        await this.updateDailySummaryForDate(updated.fromProjectId, updated.transferDate);
        await this.updateDailySummaryForDate(updated.toProjectId, updated.transferDate);
      }
    }
    
    return updated || undefined;
  }

  async deleteProjectFundTransfer(id: string): Promise<void> {
    const [transfer] = await db.select().from(projectFundTransfers).where(eq(projectFundTransfers.id, id));
    
    await db.delete(projectFundTransfers).where(eq(projectFundTransfers.id, id));
    
    if (transfer) {
      // تحديث الملخصات اليومية للمشروعين
      if (transfer.transferDate) {
        await this.updateDailySummaryForDate(transfer.fromProjectId, transfer.transferDate);
        await this.updateDailySummaryForDate(transfer.toProjectId, transfer.transferDate);
      }
    }
  }

  // Worker Attendance
  async getWorkerAttendance(projectId: string, date?: string): Promise<WorkerAttendance[]> {
    if (date) {
      const result = await db.select().from(workerAttendance)
        .where(and(eq(workerAttendance.projectId, projectId), eq(workerAttendance.date, date)));
      return result;
    } else {
      const result = await db.select().from(workerAttendance)
        .where(eq(workerAttendance.projectId, projectId));
      return result;
    }
  }

  async getWorkerAttendanceById(id: string): Promise<WorkerAttendance | null> {
    const [attendance] = await db.select().from(workerAttendance).where(eq(workerAttendance.id, id));
    return attendance || null;
  }

  async createWorkerAttendance(attendance: InsertWorkerAttendance): Promise<WorkerAttendance> {
    // التحقق من عدم وجود حضور مسجل مسبقاً لنفس العامل في نفس اليوم
    const existingAttendance = await db.select().from(workerAttendance)
      .where(and(
        eq(workerAttendance.workerId, attendance.workerId),
        eq(workerAttendance.date, attendance.date),
        eq(workerAttendance.projectId, attendance.projectId)
      ));
    
    if (existingAttendance.length > 0) {
      throw new Error("تم تسجيل حضور هذا العامل مسبقاً في هذا التاريخ");
    }
    
    // حساب الأجر الفعلي بناءً على عدد أيام العمل
    const workDays = attendance.workDays || 1.0;
    const dailyWage = parseFloat(attendance.dailyWage.toString());
    const actualWage = dailyWage * workDays;
    
    // إعداد الحضور مع الأجر المحسوب
    const attendanceData = {
      ...attendance,
      workDays: workDays.toString(),
      actualWage: actualWage.toString(),
      remainingAmount: attendance.paymentType === 'credit' 
        ? actualWage.toString() 
        : (actualWage - parseFloat(attendance.paidAmount?.toString() || '0')).toString()
    };
    
    try {
      const [newAttendance] = await db
        .insert(workerAttendance)
        .values(attendanceData)
        .returning();
      
      if (!newAttendance) {
        throw new Error('فشل في حفظ حضور العامل');
      }
      
      // تحديث الملخص اليومي في الخلفية (دون انتظار)
      this.updateDailySummaryForDate(attendance.projectId, attendance.date).catch(console.error);
      
      return newAttendance;
    } catch (error: any) {
      console.error('Error creating worker attendance:', error);
      
      // إذا كان الخطأ متعلق بتكرار الحضور
      if (error.code === '23505' && error.constraint?.includes('unique')) {
        throw new Error('تم تسجيل حضور هذا العامل مسبقاً في هذا التاريخ');
      }
      
      throw error;
    }
  }

  async updateWorkerAttendance(id: string, attendance: Partial<InsertWorkerAttendance>): Promise<WorkerAttendance | undefined> {
    // الحصول على البيانات الحالية لحساب الأجر إذا تم تحديث عدد الأيام
    const [currentAttendance] = await db.select().from(workerAttendance).where(eq(workerAttendance.id, id));
    
    // إعداد بيانات التحديث مع التحويل المناسب للأنواع
    let updateData: any = {};
    
    // نسخ الحقول العادية
    Object.keys(attendance).forEach(key => {
      if (key !== 'workDays') {
        updateData[key] = attendance[key as keyof typeof attendance];
      }
    });
    
    // إعادة حساب الأجر الفعلي إذا تم تغيير عدد أيام العمل أو الأجر اليومي
    if (attendance.workDays !== undefined || attendance.dailyWage) {
      const workDays = typeof attendance.workDays === 'number' 
        ? attendance.workDays 
        : parseFloat(currentAttendance?.workDays || '1.0');
      const dailyWage = attendance.dailyWage 
        ? parseFloat(attendance.dailyWage.toString())
        : parseFloat(currentAttendance?.dailyWage || '0');
      
      const actualWage = dailyWage * workDays;
      
      // تحويل الأرقام إلى نصوص للحفظ في قاعدة البيانات
      updateData.workDays = workDays.toString();
      updateData.actualWage = actualWage.toString();
      
      // إعادة حساب المبلغ المتبقي
      const paidAmount = attendance.paidAmount 
        ? parseFloat(attendance.paidAmount.toString())
        : parseFloat(currentAttendance?.paidAmount || '0');
      
      updateData.remainingAmount = attendance.paymentType === 'credit' 
        ? actualWage.toString() 
        : (actualWage - paidAmount).toString();
    }
    
    const [updated] = await db
      .update(workerAttendance)
      .set(updateData)
      .where(eq(workerAttendance.id, id))
      .returning();
    
    if (updated) {
      await this.updateDailySummaryForDate(updated.projectId, updated.date);
    }
    
    return updated || undefined;
  }

  async deleteWorkerAttendance(id: string): Promise<void> {
    const [attendance] = await db.select().from(workerAttendance).where(eq(workerAttendance.id, id));
    
    await db.delete(workerAttendance).where(eq(workerAttendance.id, id));
    
    if (attendance) {
      await this.updateDailySummaryForDate(attendance.projectId, attendance.date);
    }
  }

  // Materials
  async getMaterials(): Promise<Material[]> {
    return await db.select().from(materials);
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [newMaterial] = await db
      .insert(materials)
      .values(material)
      .returning();
    return newMaterial;
  }

  async findMaterialByNameAndUnit(name: string, unit: string): Promise<Material | undefined> {
    const [material] = await db.select().from(materials)
      .where(and(eq(materials.name, name), eq(materials.unit, unit)));
    return material || undefined;
  }

  // Material Purchases
  async getMaterialPurchases(projectId: string, dateFrom?: string, dateTo?: string, purchaseType?: string): Promise<any[]> {
    // جلب مشتريات المواد مع معلومات المواد
    const purchases = await db
      .select({
        id: materialPurchases.id,
        projectId: materialPurchases.projectId,
        materialId: materialPurchases.materialId,
        quantity: materialPurchases.quantity,
        unitPrice: materialPurchases.unitPrice,
        totalAmount: materialPurchases.totalAmount,
        purchaseType: materialPurchases.purchaseType,
        supplierName: materialPurchases.supplierName,
        invoiceNumber: materialPurchases.invoiceNumber,
        invoiceDate: materialPurchases.invoiceDate,
        invoicePhoto: materialPurchases.invoicePhoto,
        notes: materialPurchases.notes,
        purchaseDate: materialPurchases.purchaseDate,
        createdAt: materialPurchases.createdAt,
        // معلومات المادة
        materialName: materials.name,
        materialCategory: materials.category,
        materialUnit: materials.unit,
        materialCreatedAt: materials.createdAt
      })
      .from(materialPurchases)
      .leftJoin(materials, eq(materialPurchases.materialId, materials.id))
      .where(
        (() => {
          const conditions = [eq(materialPurchases.projectId, projectId)];
          
          if (dateFrom && dateTo) {
            conditions.push(eq(materialPurchases.purchaseDate, dateFrom));
          }
          
          if (purchaseType) {
            conditions.push(eq(materialPurchases.purchaseType, purchaseType));
          }
          
          return and(...conditions);
        })()
      )
      .orderBy(materialPurchases.createdAt);

    // تحويل البيانات للشكل المطلوب
    return purchases.map(purchase => ({
      id: purchase.id,
      projectId: purchase.projectId,
      materialId: purchase.materialId,
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      totalAmount: purchase.totalAmount,
      purchaseType: purchase.purchaseType,
      supplierName: purchase.supplierName,
      invoiceNumber: purchase.invoiceNumber,
      invoiceDate: purchase.invoiceDate,
      invoicePhoto: purchase.invoicePhoto,
      notes: purchase.notes,
      purchaseDate: purchase.purchaseDate,
      createdAt: purchase.createdAt,
      material: {
        id: purchase.materialId,
        name: purchase.materialName,
        category: purchase.materialCategory,
        unit: purchase.materialUnit,
        createdAt: purchase.materialCreatedAt
      }
    }));
  }

  async getMaterialPurchasesWithFilters(filters: {
    supplierId?: string;
    projectId?: string;
    dateFrom?: string;
    dateTo?: string;
    purchaseType?: string;
  }): Promise<any[]> {
    const { supplierId, projectId, dateFrom, dateTo, purchaseType } = filters;
    
    // إنشاء شروط البحث
    const conditions = [];
    
    if (supplierId) {
      // جلب اسم المورد من جدول الموردين
      const supplierData = await db.select({ name: suppliers.name })
        .from(suppliers)
        .where(eq(suppliers.id, supplierId));
      
      const supplierName = supplierData[0]?.name;
      console.log(`🔍 البحث عن المورد: ID=${supplierId}, Name=${supplierName}`);
      
      if (supplierName) {
        // البحث بـ supplierName أولاً (لأن البيانات محفوظة بهذا الشكل)
        conditions.push(eq(materialPurchases.supplierName, supplierName));
        console.log(`✅ إضافة شرط البحث بـ supplierName: ${supplierName}`);
      } else {
        console.log(`❌ لم يتم العثور على اسم المورد للـ ID: ${supplierId}`);
        // في حالة عدم وجود اسم، ابحث بـ supplierId
        conditions.push(eq(materialPurchases.supplierId, supplierId));
      }
    }
    
    if (projectId && projectId !== 'all') {
      conditions.push(eq(materialPurchases.projectId, projectId));
    }
    
    if (dateFrom) {
      conditions.push(gte(materialPurchases.purchaseDate, dateFrom));
    }
    
    if (dateTo) {
      conditions.push(lte(materialPurchases.purchaseDate, dateTo));
    }
    
    if (purchaseType && purchaseType !== 'all') {
      // إضافة شرط فلترة purchaseType مع التعامل مع الأحرف العربية المختلفة
      console.log(`🔍 فلتر purchaseType المطلوب: "${purchaseType}"`);
      // البحث عن كلا الشكلين: "أجل" و "آجل"
      if (purchaseType === 'أجل') {
        conditions.push(or(
          sql`${materialPurchases.purchaseType} LIKE ${'%أجل%'}`,
          sql`${materialPurchases.purchaseType} LIKE ${'%آجل%'}`
        ));
      } else {
        conditions.push(sql`${materialPurchases.purchaseType} LIKE ${'%' + purchaseType + '%'}`);
      }
    }

    // جلب المشتريات مع معلومات المواد والموردين
    const purchases = await db
      .select({
        id: materialPurchases.id,
        projectId: materialPurchases.projectId,
        materialId: materialPurchases.materialId,
        supplierId: materialPurchases.supplierId,
        quantity: materialPurchases.quantity,
        unitPrice: materialPurchases.unitPrice,
        totalAmount: materialPurchases.totalAmount,
        purchaseType: materialPurchases.purchaseType,
        supplierName: materialPurchases.supplierName,
        invoiceNumber: materialPurchases.invoiceNumber,
        invoiceDate: materialPurchases.invoiceDate,
        invoicePhoto: materialPurchases.invoicePhoto,
        notes: materialPurchases.notes,
        purchaseDate: materialPurchases.purchaseDate,
        createdAt: materialPurchases.createdAt,
        // إضافة الحقول المالية المطلوبة
        paidAmount: materialPurchases.paidAmount,
        remainingAmount: materialPurchases.remainingAmount,
        dueDate: materialPurchases.dueDate,
        // معلومات المادة
        materialName: materials.name,
        materialCategory: materials.category,
        materialUnit: materials.unit,
        // معلومات المشروع
        projectName: projects.name
      })
      .from(materialPurchases)
      .leftJoin(materials, eq(materialPurchases.materialId, materials.id))
      .leftJoin(projects, eq(materialPurchases.projectId, projects.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(materialPurchases.createdAt);
      
    console.log(`📊 استعلم قاعدة البيانات وحصل على ${purchases.length} مشترى`);

    console.log(`🔍 إرجاع ${purchases.length} مشترى بعد التطبيق الفلاتر`);
    
    return purchases.map(purchase => ({
      id: purchase.id,
      projectId: purchase.projectId,
      materialId: purchase.materialId,
      supplierId: purchase.supplierId,
      quantity: purchase.quantity,
      unitPrice: purchase.unitPrice,
      totalAmount: purchase.totalAmount,
      purchaseType: purchase.purchaseType,
      supplierName: purchase.supplierName,
      invoiceNumber: purchase.invoiceNumber,
      invoiceDate: purchase.invoiceDate,
      invoicePhoto: purchase.invoicePhoto,
      notes: purchase.notes,
      purchaseDate: purchase.purchaseDate,
      createdAt: purchase.createdAt,
      // إضافة الحقول المفقودة بقيم افتراضية
      paidAmount: purchase.paidAmount || "0",
      remainingAmount: purchase.remainingAmount || "0",
      dueDate: purchase.dueDate || null,
      material: {
        id: purchase.materialId,
        name: purchase.materialName,
        category: purchase.materialCategory,
        unit: purchase.materialUnit
      },
      project: {
        name: purchase.projectName
      }
    }));
  }

  async getMaterialPurchasesDateRange(): Promise<{ minDate: string; maxDate: string }> {
    const result = await db
      .select({
        minDate: sql<string>`MIN(${materialPurchases.purchaseDate})`,
        maxDate: sql<string>`MAX(${materialPurchases.purchaseDate})`
      })
      .from(materialPurchases);

    return {
      minDate: result[0]?.minDate || new Date().toISOString().split('T')[0],
      maxDate: result[0]?.maxDate || new Date().toISOString().split('T')[0]
    };
  }

  async getMaterialPurchaseById(id: string): Promise<MaterialPurchase | null> {
    const [purchase] = await db.select().from(materialPurchases).where(eq(materialPurchases.id, id));
    return purchase || null;
  }

  async createMaterialPurchase(purchase: InsertMaterialPurchase): Promise<MaterialPurchase> {
    // تحويل الأرقام إلى strings حسب schema
    const purchaseData = {
      ...purchase,
      quantity: purchase.quantity.toString(),
      unitPrice: purchase.unitPrice.toString(),
      totalAmount: purchase.totalAmount.toString(),
      paidAmount: purchase.paidAmount.toString(),
      remainingAmount: purchase.remainingAmount.toString()
    };
    
    const [newPurchase] = await db
      .insert(materialPurchases)
      .values(purchaseData)
      .returning();
    
    // تحديث الملخص اليومي في الخلفية (دون انتظار) لتحسين الأداء
    setImmediate(() => {
      this.updateDailySummaryForDate(purchase.projectId, purchase.purchaseDate)
        .catch(error => console.error("Error updating daily summary:", error));
    });
    
    return newPurchase;
  }

  async updateMaterialPurchase(id: string, purchase: Partial<InsertMaterialPurchase>): Promise<MaterialPurchase | undefined> {
    // تحويل الأرقام إلى strings إذا كانت موجودة
    const purchaseData: any = { ...purchase };
    if (purchaseData.quantity !== undefined) purchaseData.quantity = purchaseData.quantity.toString();
    if (purchaseData.unitPrice !== undefined) purchaseData.unitPrice = purchaseData.unitPrice.toString();
    if (purchaseData.totalAmount !== undefined) purchaseData.totalAmount = purchaseData.totalAmount.toString();
    if (purchaseData.paidAmount !== undefined) purchaseData.paidAmount = purchaseData.paidAmount.toString();
    if (purchaseData.remainingAmount !== undefined) purchaseData.remainingAmount = purchaseData.remainingAmount.toString();
    
    const [updated] = await db
      .update(materialPurchases)
      .set(purchaseData)
      .where(eq(materialPurchases.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMaterialPurchase(id: string): Promise<void> {
    const [purchase] = await db.select().from(materialPurchases).where(eq(materialPurchases.id, id));
    
    await db.delete(materialPurchases).where(eq(materialPurchases.id, id));
    
    if (purchase) {
      await this.updateDailySummaryForDate(purchase.projectId, purchase.purchaseDate);
    }
  }

  // Transportation Expenses
  async getAllTransportationExpenses(): Promise<TransportationExpense[]> {
    try {
      return await db.select().from(transportationExpenses).orderBy(transportationExpenses.date, transportationExpenses.id);
    } catch (error) {
      console.error('Error getting all transportation expenses:', error);
      return [];
    }
  }

  async getTransportationExpenses(projectId: string, date?: string): Promise<TransportationExpense[]> {
    if (date) {
      return await db.select().from(transportationExpenses)
        .where(and(eq(transportationExpenses.projectId, projectId), eq(transportationExpenses.date, date)));
    } else {
      return await db.select().from(transportationExpenses)
        .where(eq(transportationExpenses.projectId, projectId));
    }
  }

  async createTransportationExpense(expense: InsertTransportationExpense): Promise<TransportationExpense> {
    const [newExpense] = await db
      .insert(transportationExpenses)
      .values(expense)
      .returning();
    
    // تحديث الملخص اليومي في الخلفية (دون انتظار)
    this.updateDailySummaryForDate(expense.projectId, expense.date).catch(console.error);
    
    return newExpense;
  }

  async updateTransportationExpense(id: string, expense: Partial<InsertTransportationExpense>): Promise<TransportationExpense | undefined> {
    const [updated] = await db
      .update(transportationExpenses)
      .set(expense)
      .where(eq(transportationExpenses.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTransportationExpense(id: string): Promise<void> {
    const [expense] = await db.select().from(transportationExpenses).where(eq(transportationExpenses.id, id));
    
    await db.delete(transportationExpenses).where(eq(transportationExpenses.id, id));
    
    if (expense) {
      await this.updateDailySummaryForDate(expense.projectId, expense.date);
    }
  }

  // Daily Expense Summaries
  async getDailyExpenseSummary(projectId: string, date: string): Promise<DailyExpenseSummary | undefined> {
    const [summary] = await db.select().from(dailyExpenseSummaries)
      .where(and(eq(dailyExpenseSummaries.projectId, projectId), eq(dailyExpenseSummaries.date, date)));
    return summary || undefined;
  }

  async getLatestDailySummary(projectId: string): Promise<DailyExpenseSummary | undefined> {
    const [summary] = await db.select().from(dailyExpenseSummaries)
      .where(eq(dailyExpenseSummaries.projectId, projectId))
      .orderBy(sql`${dailyExpenseSummaries.date} DESC`)
      .limit(1);
    return summary || undefined;
  }



  async createOrUpdateDailyExpenseSummary(summary: InsertDailyExpenseSummary): Promise<DailyExpenseSummary> {
    const existing = await this.getDailyExpenseSummary(summary.projectId, summary.date);
    
    if (existing) {
      const [updated] = await db
        .update(dailyExpenseSummaries)
        .set(summary)
        .where(eq(dailyExpenseSummaries.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newSummary] = await db
        .insert(dailyExpenseSummaries)
        .values(summary)
        .returning();
      return newSummary;
    }
  }

  async getPreviousDayBalance(projectId: string, currentDate: string): Promise<string> {
    console.log(`Getting previous day balance for project ${projectId}, date: ${currentDate}`);
    
    const result = await db.select()
      .from(dailyExpenseSummaries)
      .where(and(
        eq(dailyExpenseSummaries.projectId, projectId),
        sql`${dailyExpenseSummaries.date} < ${currentDate}`
      ))
      .orderBy(sql`${dailyExpenseSummaries.date} DESC`)
      .limit(1);
    
    const balance = result.length > 0 ? result[0].remainingBalance : "0";
    console.log(`Previous day balance found: ${balance}`);
    
    // التحقق من صحة البيانات
    if (result.length > 0) {
      const prevSummary = result[0];
      console.log(`Previous summary from ${prevSummary.date}: carried=${prevSummary.carriedForwardAmount}, income=${prevSummary.totalIncome}, expenses=${prevSummary.totalExpenses}, remaining=${prevSummary.remainingBalance}`);
    }
    
    return balance;
  }

  // إزالة الملخصات المكررة للتاريخ الواحد
  async removeDuplicateSummaries(projectId: string, date: string): Promise<void> {
    try {
      // البحث عن الملخصات المكررة
      const duplicates = await db.select()
        .from(dailyExpenseSummaries)
        .where(and(
          eq(dailyExpenseSummaries.projectId, projectId),
          eq(dailyExpenseSummaries.date, date)
        ))
        .orderBy(dailyExpenseSummaries.createdAt);

      // إذا كان هناك أكثر من ملخص، احذف الأقدم واحتفظ بالأحدث
      if (duplicates.length > 1) {
        const toDelete = duplicates.slice(0, -1); // جميع الملخصات عدا الأحدث
        for (const summary of toDelete) {
          await db.delete(dailyExpenseSummaries)
            .where(eq(dailyExpenseSummaries.id, summary.id));
        }
        console.log(`🗑️ Removed ${toDelete.length} duplicate summaries for ${projectId} on ${date}`);
      }
    } catch (error) {
      console.error('Error removing duplicate summaries:', error);
    }
  }

  // تحديث الملخص اليومي تلقائياً مع تحسينات الأداء المحسنة
  async updateDailySummaryForDate(projectId: string, date: string): Promise<void> {
    try {
      // إزالة الملخصات المكررة في الخلفية لتحسين الأداء
      setImmediate(() => {
        this.removeDuplicateSummaries(projectId, date).catch(console.error);
      });
      
      // تشغيل جميع الاستعلامات بشكل متوازي لتحسين الأداء
      const [
        fundTransfers,
        projectTransfers,
        workerAttendanceRecords,
        materialPurchases,
        transportationExpenses,
        workerTransfers,
        workerMiscExpenses,
        carriedForwardAmount
      ] = await Promise.all([
        this.getFundTransfers(projectId, date),
        this.getProjectFundTransfersForDate(projectId, date),
        this.getWorkerAttendance(projectId, date),
        this.getMaterialPurchases(projectId, date), // جلب جميع المشتريات
        this.getTransportationExpenses(projectId, date),
        this.getFilteredWorkerTransfers(projectId, date),
        this.getWorkerMiscExpenses(projectId, date),
        this.getPreviousDayBalance(projectId, date).then(balance => parseFloat(balance))
      ]);

      const totalFundTransfers = fundTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      // حساب عمليات ترحيل الأموال منفصلة (الواردة والصادرة)
      const incomingTransfers = projectTransfers.filter(t => t.toProjectId === projectId).reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const outgoingTransfers = projectTransfers.filter(t => t.fromProjectId === projectId).reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      // استخدام المبلغ المدفوع بدلاً من إجمالي الأجر اليومي
      const totalWorkerWages = workerAttendanceRecords.reduce((sum, a) => sum + parseFloat(a.paidAmount || '0'), 0);
      // فقط المشتريات النقدية تُحسب في مصروفات اليوم - المشتريات الآجلة لا تُحسب
      const totalMaterialCosts = materialPurchases
        .filter(p => p.purchaseType === "نقد")
        .reduce((sum, p) => sum + parseFloat(p.totalAmount), 0);
      const totalTransportationCosts = transportationExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const totalWorkerTransferCosts = workerTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalWorkerMiscCosts = workerMiscExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

      // للملخص اليومي: التحويلات الصادرة لا تُحسب كمصروف، بل كحركة مالية منفصلة
      const netProjectTransfers = incomingTransfers - outgoingTransfers;
      const totalIncome = carriedForwardAmount + totalFundTransfers + netProjectTransfers;
      const totalExpenses = totalWorkerWages + totalMaterialCosts + totalTransportationCosts + totalWorkerTransferCosts + totalWorkerMiscCosts;
      const remainingBalance = totalIncome - totalExpenses;

      // معلومات مختصرة للتشخيص
      console.log(`📊 ${date}: Income=${totalIncome}, Expenses=${totalExpenses}, Balance=${remainingBalance}`);
      
      // التحقق من صحة البيانات المحاسبية
      if (Math.abs(totalIncome - totalExpenses - remainingBalance) > 0.01) {
        console.error(`❌ BALANCE ERROR: Income(${totalIncome}) - Expenses(${totalExpenses}) ≠ Remaining(${remainingBalance})`);
        throw new Error(`خطأ في حساب الرصيد: الدخل - المصروفات ≠ المتبقي`);
      }

      await this.createOrUpdateDailyExpenseSummary({
        projectId,
        date,
        carriedForwardAmount: carriedForwardAmount.toString(),
        totalIncome: totalIncome.toString(),
        totalExpenses: totalExpenses.toString(),
        remainingBalance: remainingBalance.toString()
      });
      
      // تم تحديث الملخص بنجاح
    } catch (error) {
      console.error('❌ Error updating daily summary:', error);
      throw error;
    }
  }

  // Helper function to get previous date
  private getPreviousDate(currentDate: string): string {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  }

  // إعادة حساب جميع الأرصدة لمشروع معين لإصلاح أي أخطاء
  async recalculateAllBalances(projectId: string): Promise<void> {
    console.log(`🔄 Recalculating all balances for project ${projectId}...`);
    
    try {
      // الحصول على جميع التواريخ التي بها ملخصات يومية
      const existingSummaries = await db.select()
        .from(dailyExpenseSummaries)
        .where(eq(dailyExpenseSummaries.projectId, projectId))
        .orderBy(sql`${dailyExpenseSummaries.date} ASC`);

      // حذف جميع الملخصات الموجودة
      await db.delete(dailyExpenseSummaries)
        .where(eq(dailyExpenseSummaries.projectId, projectId));

      // إعادة حساب كل تاريخ بالترتيب الصحيح
      for (const summary of existingSummaries) {
        console.log(`📅 Recalculating ${summary.date}...`);
        await this.updateDailySummaryForDate(projectId, summary.date);
      }

      console.log(`✅ All balances recalculated successfully for project ${projectId}`);
    } catch (error) {
      console.error(`❌ Error recalculating balances:`, error);
      throw error;
    }
  }

  // Worker Balance Management
  async getWorkerBalance(workerId: string, projectId: string): Promise<WorkerBalance | undefined> {
    // حساب الرصيد ديناميكياً من سجلات الحضور
    const attendanceRecords = await db.select().from(workerAttendance)
      .where(and(eq(workerAttendance.workerId, workerId), eq(workerAttendance.projectId, projectId)));
    
    let totalEarned = 0;
    let totalPaid = 0;
    
    attendanceRecords.forEach(record => {
      // استخدام actualWage بدلاً من dailyWage لضمان الدقة في الأجور الجزئية
      totalEarned += parseFloat(record.actualWage || '0');
      totalPaid += parseFloat(record.paidAmount || '0');
    });
    
    const transferRecords = await db.select().from(workerTransfers)
      .where(and(eq(workerTransfers.workerId, workerId), eq(workerTransfers.projectId, projectId)));
    
    let totalTransferred = 0;
    transferRecords.forEach(transfer => {
      totalTransferred += parseFloat(transfer.amount || '0');
    });
    
    const currentBalance = totalEarned - totalPaid - totalTransferred;
    
    const balance: WorkerBalance = {
      id: `${workerId}-${projectId}`,
      workerId,
      projectId,
      totalEarned: totalEarned.toString(),
      totalPaid: totalPaid.toString(),
      totalTransferred: totalTransferred.toString(),
      currentBalance: currentBalance.toString(),
      lastUpdated: new Date(),
      createdAt: new Date()
    };
    
    return balance;
  }

  async updateWorkerBalance(workerId: string, projectId: string, balance: Partial<InsertWorkerBalance>): Promise<WorkerBalance> {
    const existing = await this.getWorkerBalance(workerId, projectId);
    
    if (existing) {
      const [updated] = await db
        .update(workerBalances)
        .set({ ...balance, lastUpdated: new Date() })
        .where(eq(workerBalances.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newBalance] = await db
        .insert(workerBalances)
        .values({
          workerId,
          projectId,
          totalEarned: '0',
          totalPaid: '0',
          totalTransferred: '0',
          currentBalance: '0',
          ...balance
        })
        .returning();
      return newBalance;
    }
  }

  // Worker Transfers
  async getWorkerTransfers(workerId: string, projectId?: string): Promise<WorkerTransfer[]> {
    if (projectId) {
      return await db.select().from(workerTransfers)
        .where(and(eq(workerTransfers.workerId, workerId), eq(workerTransfers.projectId, projectId)));
    } else {
      return await db.select().from(workerTransfers)
        .where(eq(workerTransfers.workerId, workerId));
    }
  }

  async getWorkerTransfer(id: string): Promise<WorkerTransfer | null> {
    const [transfer] = await db.select().from(workerTransfers).where(eq(workerTransfers.id, id));
    return transfer || null;
  }

  async createWorkerTransfer(transfer: InsertWorkerTransfer): Promise<WorkerTransfer> {
    const [newTransfer] = await db
      .insert(workerTransfers)
      .values(transfer)
      .returning();
    return newTransfer;
  }

  async updateWorkerTransfer(id: string, transfer: Partial<InsertWorkerTransfer>): Promise<WorkerTransfer | undefined> {
    const [updated] = await db
      .update(workerTransfers)
      .set(transfer)
      .where(eq(workerTransfers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteWorkerTransfer(id: string): Promise<void> {
    await db.delete(workerTransfers).where(eq(workerTransfers.id, id));
  }

  async getAllWorkerTransfers(): Promise<WorkerTransfer[]> {
    return await db.select().from(workerTransfers);
  }

  async getFilteredWorkerTransfers(projectId?: string, date?: string): Promise<WorkerTransfer[]> {
    if (projectId && date) {
      return await db.select().from(workerTransfers)
        .where(and(eq(workerTransfers.projectId, projectId), eq(workerTransfers.transferDate, date)));
    } else if (projectId) {
      return await db.select().from(workerTransfers)
        .where(eq(workerTransfers.projectId, projectId));
    } else if (date) {
      return await db.select().from(workerTransfers)
        .where(eq(workerTransfers.transferDate, date));
    }
    
    return await db.select().from(workerTransfers);
  }

  // Reports
  async getWorkerAccountStatement(workerId: string, projectId?: string, dateFrom?: string, dateTo?: string): Promise<{
    worker: Worker | null;
    attendance: any[];
    transfers: WorkerTransfer[];
    balance: WorkerBalance | null;
    summary: {
      totalWorkDays: number;
      totalWagesEarned: number;
      totalPaidAmount: number;
      totalTransfers: number;
      remainingBalance: number;
    };
  }> {
    try {
      // جلب بيانات العامل
      const [worker] = await db.select().from(workers).where(eq(workers.id, workerId));
      
      let attendanceConditions = [eq(workerAttendance.workerId, workerId)];
      
      if (projectId) {
        attendanceConditions.push(eq(workerAttendance.projectId, projectId));
      }
      
      if (dateFrom) {
        attendanceConditions.push(gte(workerAttendance.date, dateFrom));
      }
      
      if (dateTo) {
        attendanceConditions.push(lte(workerAttendance.date, dateTo));
      }
      
      const attendanceData = await db.select().from(workerAttendance)
        .where(and(...attendanceConditions))
        .orderBy(workerAttendance.date);

      // جلب بيانات المشاريع المرتبطة بالحضور
      const projectsMap = new Map();
      const uniqueProjectIds = Array.from(new Set(attendanceData.map(record => record.projectId)));
      
      for (const pId of uniqueProjectIds) {
        const [project] = await db.select().from(projects).where(eq(projects.id, pId));
        if (project) {
          projectsMap.set(pId, project);
        }
      }
      
      // دمج بيانات الحضور مع بيانات المشروع
      const attendance = attendanceData.map((record: any) => ({
        ...record,
        project: projectsMap.get(record.projectId) || null
      }));
      
      // Get worker transfers (including family transfers)
      let transfersConditions = [eq(workerTransfers.workerId, workerId)];
      
      if (projectId) {
        transfersConditions.push(eq(workerTransfers.projectId, projectId));
      }
      
      if (dateFrom) {
        transfersConditions.push(gte(workerTransfers.transferDate, dateFrom));
      }
      
      if (dateTo) {
        transfersConditions.push(lte(workerTransfers.transferDate, dateTo));
      }
      
      const transfers = await db.select().from(workerTransfers)
        .where(and(...transfersConditions))
        .orderBy(workerTransfers.transferDate);
      
      // Get worker balance (calculated dynamically to include all transfers)
      let balance: WorkerBalance | null = null;
      if (projectId) {
        const workerBalance = await this.getWorkerBalance(workerId, projectId);
        balance = workerBalance || null;
      }
      
      // حساب الإحصائيات الإجمالية
      const totalWorkDays = attendance.reduce((sum, record) => sum + (Number(record.workDays) || 1), 0);
      const totalWagesEarned = attendance.reduce((sum, record) => {
        const dailyWage = Number(record.dailyWage) || Number(worker?.dailyWage) || 0;
        const workDays = Number(record.workDays) || 1;
        return sum + (dailyWage * workDays);
      }, 0);
      const totalPaidAmount = attendance.reduce((sum, record) => sum + (Number(record.paidAmount) || 0), 0);
      const totalTransfers = transfers.reduce((sum, transfer) => sum + (Number(transfer.amount) || 0), 0);
      const remainingBalance = totalWagesEarned - totalPaidAmount;

      const summary = {
        totalWorkDays,
        totalWagesEarned,
        totalPaidAmount,
        totalTransfers,
        remainingBalance
      };

      return {
        worker,
        attendance,
        transfers, // This now includes all transfers including family transfers
        balance,
        summary
      };
    } catch (error) {
      console.error('Error getting worker account statement:', error);
      return {
        worker: null,
        attendance: [],
        transfers: [],
        balance: null,
        summary: {
          totalWorkDays: 0,
          totalWagesEarned: 0,
          totalPaidAmount: 0,
          totalTransfers: 0,
          remainingBalance: 0
        }
      };
    }
  }

  // دالة جديدة لجلب كشف حساب العامل من مشاريع متعددة
  async getWorkerAccountStatementMultipleProjects(workerId: string, projectIds: string[], dateFrom?: string, dateTo?: string): Promise<{
    worker: Worker | null;
    attendance: any[];
    transfers: WorkerTransfer[];
    balance: WorkerBalance | null;
    projectsInfo: { projectId: string; projectName: string }[];
  }> {
    try {
      // جلب معلومات المشاريع
      const projectsInfo = await Promise.all(
        projectIds.map(async (projectId) => {
          const project = await this.getProject(projectId);
          return {
            projectId,
            projectName: project?.name || `مشروع ${projectId}`
          };
        })
      );

      // جلب الحضور من المشاريع المحددة
      let attendanceConditions = [
        eq(workerAttendance.workerId, workerId),
        inArray(workerAttendance.projectId, projectIds)
      ];
      
      if (dateFrom) {
        attendanceConditions.push(gte(workerAttendance.date, dateFrom));
      }
      
      if (dateTo) {
        attendanceConditions.push(lte(workerAttendance.date, dateTo));
      }
      
      const attendanceData = await db.select().from(workerAttendance)
        .where(and(...attendanceConditions))
        .orderBy(workerAttendance.date);
      
      // إضافة بيانات المشروع لكل سجل حضور
      const projectsMap = new Map();
      for (const projectId of projectIds) {
        const project = await this.getProject(projectId);
        if (project) {
          projectsMap.set(projectId, project);
        }
      }
      
      // دمج بيانات الحضور مع بيانات المشروع
      const attendance = attendanceData.map((record: any) => ({
        ...record,
        project: projectsMap.get(record.projectId) || null
      }));
      
      // جلب التحويلات من المشاريع المحددة
      let transfersConditions = [
        eq(workerTransfers.workerId, workerId),
        inArray(workerTransfers.projectId, projectIds)
      ];
      
      if (dateFrom) {
        transfersConditions.push(gte(workerTransfers.transferDate, dateFrom));
      }
      
      if (dateTo) {
        transfersConditions.push(lte(workerTransfers.transferDate, dateTo));
      }
      
      const transfers = await db.select().from(workerTransfers)
        .where(and(...transfersConditions))
        .orderBy(workerTransfers.transferDate);
      
      // حساب الرصيد الإجمالي من جميع المشاريع
      let totalBalance = 0;
      for (const projectId of projectIds) {
        const workerBalance = await this.getWorkerBalance(workerId, projectId);
        if (workerBalance) {
          totalBalance += parseFloat(workerBalance.currentBalance);
        }
      }
      
      const balance: WorkerBalance = {
        id: `multi-${workerId}`,
        createdAt: new Date(),
        workerId,
        projectId: projectIds[0], // المشروع الأول كمرجع
        totalEarned: "0",
        totalPaid: "0", 
        totalTransferred: "0",
        currentBalance: totalBalance.toString(),
        lastUpdated: new Date()
      };
      
      // جلب بيانات العامل
      const [worker] = await db.select().from(workers).where(eq(workers.id, workerId));
      
      return {
        worker,
        attendance,
        transfers,
        balance,
        projectsInfo
      };
    } catch (error) {
      console.error('Error getting worker account statement for multiple projects:', error);
      return {
        worker: null,
        attendance: [],
        transfers: [],
        balance: null,
        projectsInfo: []
      };
    }
  }

  // Multi-project worker management
  async getWorkersWithMultipleProjects(): Promise<{worker: Worker, projects: Project[], totalBalance: string}[]> {
    return [];
  }

  async getWorkerMultiProjectStatement(workerId: string, dateFrom?: string, dateTo?: string): Promise<{
    worker: Worker;
    projects: {
      project: Project;
      attendance: WorkerAttendance[];
      balance: WorkerBalance | null;
      transfers: WorkerTransfer[];
    }[];
    totals: {
      totalEarned: string;
      totalPaid: string;
      totalTransferred: string;
      totalBalance: string;
    };
  }> {
    const [worker] = await db.select().from(workers).where(eq(workers.id, workerId));
    if (!worker) {
      throw new Error('Worker not found');
    }

    try {
      // جلب جميع المشاريع التي عمل بها العامل
      let projectConditions = [eq(workerAttendance.workerId, workerId)];
      
      if (dateFrom) {
        projectConditions.push(gte(workerAttendance.date, dateFrom));
      }
      
      if (dateTo) {
        projectConditions.push(lte(workerAttendance.date, dateTo));
      }
      
      // الحصول على المشاريع المميزة
      const distinctProjects = await db.selectDistinct({ projectId: workerAttendance.projectId })
        .from(workerAttendance)
        .where(and(...projectConditions));
      
      const projectsList = [];
      let totalEarned = 0;
      let totalPaid = 0;
      let totalTransferred = 0;
      let totalBalance = 0;
      
      // لكل مشروع، احسب التفاصيل
      for (const { projectId } of distinctProjects) {
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
        if (!project) continue;
        
        // جلب الحضور لهذا المشروع
        let attendanceConditions = [
          eq(workerAttendance.workerId, workerId),
          eq(workerAttendance.projectId, projectId)
        ];
        
        if (dateFrom) {
          attendanceConditions.push(gte(workerAttendance.date, dateFrom));
        }
        
        if (dateTo) {
          attendanceConditions.push(lte(workerAttendance.date, dateTo));
        }
        
        const attendance = await db.select().from(workerAttendance)
          .where(and(...attendanceConditions))
          .orderBy(workerAttendance.date);
        
        // جلب التحويلات لهذا المشروع
        let transfersConditions = [
          eq(workerTransfers.workerId, workerId),
          eq(workerTransfers.projectId, projectId)
        ];
        
        if (dateFrom) {
          transfersConditions.push(gte(workerTransfers.transferDate, dateFrom));
        }
        
        if (dateTo) {
          transfersConditions.push(lte(workerTransfers.transferDate, dateTo));
        }
        
        const transfers = await db.select().from(workerTransfers)
          .where(and(...transfersConditions))
          .orderBy(workerTransfers.transferDate);
        
        // حساب الإحصائيات لهذا المشروع
        const projectEarned = attendance.reduce((sum, record) => {
          const dailyWage = Number(record.dailyWage) || Number(worker.dailyWage) || 0;
          const workDays = Number(record.workDays) || 1;
          return sum + (dailyWage * workDays);
        }, 0);
        
        const projectPaid = attendance.reduce((sum, record) => sum + (Number(record.paidAmount) || 0), 0);
        const projectTransferred = transfers.reduce((sum, transfer) => sum + (Number(transfer.amount) || 0), 0);
        
        const balance = await this.getWorkerBalance(workerId, projectId);
        
        projectsList.push({
          project,
          attendance,
          balance: balance || null,
          transfers
        });
        
        totalEarned += projectEarned;
        totalPaid += projectPaid;
        totalTransferred += projectTransferred;
        totalBalance += balance ? Number(balance.currentBalance) : 0;
      }
      
      return {
        worker,
        projects: projectsList,
        totals: {
          totalEarned: totalEarned.toString(),
          totalPaid: totalPaid.toString(),
          totalTransferred: totalTransferred.toString(),
          totalBalance: totalBalance.toString()
        }
      };
    } catch (error) {
      console.error('Error getting worker multi-project statement:', error);
      return {
        worker,
        projects: [],
        totals: {
          totalEarned: '0',
          totalPaid: '0',
          totalTransferred: '0',
          totalBalance: '0'
        }
      };
    }
  }

  async getWorkerProjects(workerId: string): Promise<Project[]> {
    try {
      const projectIds = await db
        .selectDistinct({ projectId: workerAttendance.projectId })
        .from(workerAttendance)
        .where(eq(workerAttendance.workerId, workerId));
      
      if (projectIds.length === 0) {
        return [];
      }
      
      const projectsList = await db
        .select()
        .from(projects)
        .where(inArray(projects.id, projectIds.map(p => p.projectId)));
      
      return projectsList;
    } catch (error) {
      console.error('Error getting worker projects:', error);
      return [];
    }
  }

  async getWorkerAttendanceForPeriod(workerId: string, projectId: string, dateFrom: string, dateTo: string): Promise<WorkerAttendance[]> {
    try {
      return await db.select().from(workerAttendance)
        .where(and(
          eq(workerAttendance.workerId, workerId),
          eq(workerAttendance.projectId, projectId),
          gte(workerAttendance.date, dateFrom),
          lte(workerAttendance.date, dateTo)
        ))
        .orderBy(workerAttendance.date);
    } catch (error) {
      console.error('Error getting worker attendance for period:', error);
      return [];
    }
  }

  async getFundTransfersForWorker(workerId: string, projectId: string, dateFrom: string, dateTo: string): Promise<FundTransfer[]> {
    try {
      // البحث عن التحويلات المالية التي تخص هذا العامل
      const worker = await this.getWorker(workerId);
      if (!worker) return [];

      return await db.select().from(fundTransfers)
        .where(and(
          eq(fundTransfers.projectId, projectId),
          sql`DATE(${fundTransfers.transferDate}) >= ${dateFrom}`,
          sql`DATE(${fundTransfers.transferDate}) <= ${dateTo}`,
          or(
            sql`${fundTransfers.senderName} LIKE ${`%${worker.name}%`}`,
            sql`${fundTransfers.notes} LIKE ${`%${worker.name}%`}`
          )
        ))
        .orderBy(fundTransfers.transferDate);
    } catch (error) {
      console.error('Error getting fund transfers for worker:', error);
      return [];
    }
  }

  async getProjectStatistics(projectId: string): Promise<{
    totalWorkers: number;
    totalExpenses: number;
    totalIncome: number;
    currentBalance: number;
    activeWorkers: number;
    completedDays: number;
    materialPurchases: number;
    lastActivity: string;
  }> {
    try {
      console.time(`getProjectStatistics-${projectId}`);
      
      // فحص Cache أولاً - تحسين الأداء الفائق
      const now = Date.now();
      const cachedStats = this.projectStatsCache.get(projectId);
      if (cachedStats && (now - cachedStats.timestamp) < this.CACHE_DURATION) {
        console.log(`⚡ استخدام Cache للمشروع ${projectId} - سرعة فائقة!`);
        console.timeEnd(`getProjectStatistics-${projectId}`);
        return cachedStats.data;
      }
      
      console.log(`🔍 حساب إحصائيات المشروع: ${projectId}`);
      
      // حساب الإحصائيات الكلية الحقيقية من جميع المعاملات
      const [
        workers,
        fundTransfers,
        projectTransfersIn,
        projectTransfersOut,
        attendance,
        materials,
        transport,
        miscExpenses,
        workerTransfers
      ] = await Promise.all([
        // عدد العمال المميزين
        db.execute(sql`
          SELECT COUNT(DISTINCT worker_id) as count
          FROM worker_attendance 
          WHERE project_id = ${projectId}
        `),
        
        // إجمالي تحويلات العهدة
        db.execute(sql`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
          FROM fund_transfers 
          WHERE project_id = ${projectId}
        `),
        
        // التحويلات الواردة للمشروع
        db.execute(sql`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
          FROM project_fund_transfers 
          WHERE to_project_id = ${projectId}
        `),
        
        // التحويلات الصادرة من المشروع
        db.execute(sql`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
          FROM project_fund_transfers 
          WHERE from_project_id = ${projectId}
        `),
        
        // إجمالي المبالغ المدفوعة فعلياً فقط (المبالغ التي تم صرفها فعلاً) والأيام
        db.execute(sql`
          SELECT 
            COALESCE(SUM(CASE WHEN paid_amount > 0 THEN CAST(paid_amount AS DECIMAL) ELSE 0 END), 0) as total_wages,
            COUNT(DISTINCT date) as completed_days
          FROM worker_attendance 
          WHERE project_id = ${projectId}
        `),
        
        // إجمالي مشتريات المواد النقدية (المدفوعة فعلياً)
        db.execute(sql`
          SELECT 
            COALESCE(SUM(CASE WHEN purchase_type = 'نقد' THEN CAST(total_amount AS DECIMAL) ELSE 0 END), 0) as cash_total,
            COALESCE(SUM(CASE WHEN purchase_type = 'أجل' THEN CAST(total_amount AS DECIMAL) ELSE 0 END), 0) as credit_total,
            COUNT(DISTINCT id) as count
          FROM material_purchases 
          WHERE project_id = ${projectId}
        `),
        
        // إجمالي النقل
        db.execute(sql`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
          FROM transportation_expenses 
          WHERE project_id = ${projectId}
        `),
        
        // مصاريف العمال المتنوعة
        db.execute(sql`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
          FROM worker_misc_expenses 
          WHERE project_id = ${projectId}
        `),
        
        // حوالات الأهل (من العامل للأهل)
        db.execute(sql`
          SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
          FROM worker_transfers 
          WHERE project_id = ${projectId}
        `)
      ]);

      // حساب الإجماليات
      const totalWorkers = parseInt((workers.rows[0] as any)?.count || '0');
      const totalFundTransfers = parseFloat((fundTransfers.rows[0] as any)?.total || '0');
      const totalProjectIn = parseFloat((projectTransfersIn.rows[0] as any)?.total || '0');
      const totalProjectOut = parseFloat((projectTransfersOut.rows[0] as any)?.total || '0');
      const totalWages = parseFloat((attendance.rows[0] as any)?.total_wages || '0');
      const completedDays = parseInt((attendance.rows[0] as any)?.completed_days || '0');
      const totalMaterialsCash = parseFloat((materials.rows[0] as any)?.cash_total || '0');
      const totalMaterialsCredit = parseFloat((materials.rows[0] as any)?.credit_total || '0');
      const materialCount = parseInt((materials.rows[0] as any)?.count || '0');
      const totalTransport = parseFloat((transport.rows[0] as any)?.total || '0');
      const totalMisc = parseFloat((miscExpenses.rows[0] as any)?.total || '0');
      const totalWorkerTransfers = parseFloat((workerTransfers.rows[0] as any)?.total || '0');

      // الإجمالي الكلي للدخل والمصروفات - مع تصحيح منطق التحويلات الصادرة
      const totalIncome = totalFundTransfers + totalProjectIn;
      const totalExpenses = totalWages + totalMaterialsCash + totalTransport + totalMisc + totalWorkerTransfers + totalProjectOut;
      // ملاحظة: التحويلات الصادرة تُحسب كمصروف لأنها أموال تخرج من المشروع
      // حوالات الأهل أيضاً تُحسب كمصروف لأنها أموال تخرج من المشروع نهائياً
      const currentBalance = totalIncome - totalExpenses;

      console.log(`   📊 إجمالي الدخل: ${totalIncome}`);
      console.log(`   📊 إجمالي المصاريف (شاملة التحويلات): ${totalExpenses}`);
      console.log(`   📊 الرصيد النهائي: ${currentBalance}`);
      
      // التحقق من أن البيانات منطقية
      if (isNaN(currentBalance) || !isFinite(currentBalance)) {
        console.error('⚠️  خطأ في حساب الرصيد - قيمة غير منطقية');
        throw new Error('خطأ في حساب الرصيد المالي');
      }

      const result = {
        totalWorkers: totalWorkers,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalIncome: Math.round(totalIncome * 100) / 100,
        currentBalance: Math.round(currentBalance * 100) / 100,
        activeWorkers: totalWorkers, // نفترض أن جميع العمال نشطين
        completedDays: completedDays,
        materialPurchases: materialCount,
        lastActivity: new Date().toISOString().split('T')[0]
      };

      // حفظ في Cache للاستخدام السريع لاحقاً
      this.projectStatsCache.set(projectId, {
        data: result,
        timestamp: now
      });
      
      console.timeEnd(`getProjectStatistics-${projectId}`);
      console.log(`⚡ تم حساب وحفظ إحصائيات المشروع ${projectId} في Cache`);

      return result;
    } catch (error) {
      console.error('خطأ في حساب إحصائيات المشروع:', error);
      // إرجاع إحصائيات فارغة في حالة الخطأ
      return {
        totalWorkers: 0,
        totalExpenses: 0,
        totalIncome: 0,
        currentBalance: 0,
        activeWorkers: 0,
        completedDays: 0,
        materialPurchases: 0,
        lastActivity: new Date().toISOString().split('T')[0]
      };
    }
  }

  // Autocomplete data methods - محسنة مع حدود وذاكرة تخزين مؤقت
  async getAutocompleteData(category: string, limit: number = 50): Promise<AutocompleteData[]> {
    try {
      return await db
        .select()
        .from(autocompleteData)
        .where(eq(autocompleteData.category, category))
        .orderBy(sql`${autocompleteData.usageCount} DESC, ${autocompleteData.lastUsed} DESC`)
        .limit(limit);
    } catch (error) {
      console.error('Error getting autocomplete data:', error);
      return [];
    }
  }

  async saveAutocompleteData(data: InsertAutocompleteData): Promise<AutocompleteData> {
    try {
      const trimmedValue = data.value.trim();
      
      // تحقق من صحة البيانات
      if (!trimmedValue || trimmedValue.length < 2) {
        throw new Error('قيمة الإكمال التلقائي يجب أن تكون على الأقل حرفين');
      }

      // تحقق من وجود القيمة مسبقاً
      const existing = await db
        .select()
        .from(autocompleteData)
        .where(and(
          eq(autocompleteData.category, data.category),
          eq(autocompleteData.value, trimmedValue)
        ))
        .limit(1);

      if (existing.length > 0) {
        // إذا كانت موجودة، قم بتحديث عدد الاستخدام وتاريخ آخر استخدام
        const [updated] = await db
          .update(autocompleteData)
          .set({
            usageCount: sql`${autocompleteData.usageCount} + 1`,
            lastUsed: new Date()
          })
          .where(eq(autocompleteData.id, existing[0].id))
          .returning();
        
        return updated;
      } else {
        // تحقق من عدم تجاوز الحد الأقصى للسجلات في هذه الفئة
        await this.enforceCategoryLimit(data.category);

        // إنشاء سجل جديد
        const [created] = await db
          .insert(autocompleteData)
          .values({
            ...data,
            value: trimmedValue
          })
          .returning();
        
        return created;
      }
    } catch (error) {
      console.error('Error saving autocomplete data:', error);
      throw error;
    }
  }

  // طريقة جديدة لفرض حدود الفئة
  private async enforceCategoryLimit(category: string, maxRecords: number = 100): Promise<void> {
    try {
      // عد السجلات الحالية في هذه الفئة
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(autocompleteData)
        .where(eq(autocompleteData.category, category));

      const currentCount = countResult[0]?.count || 0;

      if (currentCount >= maxRecords) {
        // حذف أقل السجلات استخداماً
        const recordsToDelete = await db
          .select({ id: autocompleteData.id })
          .from(autocompleteData)
          .where(eq(autocompleteData.category, category))
          .orderBy(sql`${autocompleteData.usageCount} ASC, ${autocompleteData.lastUsed} ASC`)
          .limit(currentCount - maxRecords + 1);

        if (recordsToDelete.length > 0) {
          await db
            .delete(autocompleteData)
            .where(
              sql`id IN (${recordsToDelete.map(r => `'${r.id}'`).join(',')})`
            );
        }
      }
    } catch (error) {
      console.error('Error enforcing category limit:', error);
    }
  }

  async removeAutocompleteData(category: string, value: string): Promise<void> {
    try {
      await db
        .delete(autocompleteData)
        .where(and(
          eq(autocompleteData.category, category),
          eq(autocompleteData.value, value.trim())
        ));
    } catch (error) {
      console.error('Error removing autocomplete data:', error);
      throw error;
    }
  }

  async getDailyExpensesRange(projectId: string, dateFrom: string, dateTo: string): Promise<any[]> {
    try {
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);
      const results = [];

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const currentDate = d.toISOString().split('T')[0];
        
        let dailySummary = await this.getDailyExpenseSummary(projectId, currentDate);
        
        if (!dailySummary) {
          await this.updateDailySummaryForDate(projectId, currentDate);
          dailySummary = await this.getDailyExpenseSummary(projectId, currentDate);
        }

        if (dailySummary) {
          const [
            fundTransfers,
            workerAttendance,
            materialPurchases,
            transportationExpenses,
            workerTransfers,
            workerMiscExpenses
          ] = await Promise.all([
            this.getFundTransfers(projectId, currentDate),
            this.getWorkerAttendance(projectId, currentDate),
            this.getMaterialPurchases(projectId, currentDate, currentDate),
            this.getTransportationExpenses(projectId, currentDate),
            this.getWorkerTransfers("", projectId).then(transfers => 
              transfers.filter(t => t.transferDate === currentDate)
            ),
            this.getWorkerMiscExpenses(projectId, currentDate)
          ]);

          // حساب إجمالي نثريات العمال
          const totalWorkerMiscExpenses = workerMiscExpenses?.reduce((sum, expense) => sum + parseFloat(expense.amount), 0) || 0;

          results.push({
            date: currentDate,
            summary: {
              carriedForward: parseFloat(dailySummary.carriedForwardAmount),
              totalIncome: parseFloat(dailySummary.totalIncome),
              totalExpenses: parseFloat(dailySummary.totalExpenses),
              remainingBalance: parseFloat(dailySummary.remainingBalance),
              totalFundTransfers: parseFloat(dailySummary.totalFundTransfers),
              totalWorkerWages: parseFloat(dailySummary.totalWorkerWages),
              totalMaterialCosts: parseFloat(dailySummary.totalMaterialCosts),
              totalTransportationCosts: parseFloat(dailySummary.totalTransportationCosts),
              totalWorkerTransfers: workerTransfers?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0,
              totalWorkerMiscExpenses: totalWorkerMiscExpenses
            },
            fundTransfers,
            workerAttendance,
            materialPurchases,
            transportationExpenses,
            workerTransfers,
            workerMiscExpenses
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error getting daily expenses range:', error);
      return [];
    }
  }

  // Worker miscellaneous expenses methods
  async getWorkerMiscExpenses(projectId: string, date?: string): Promise<WorkerMiscExpense[]> {
    try {
      if (date) {
        return await db.select().from(workerMiscExpenses)
          .where(and(eq(workerMiscExpenses.projectId, projectId), eq(workerMiscExpenses.date, date)))
          .orderBy(workerMiscExpenses.createdAt);
      } else {
        return await db.select().from(workerMiscExpenses)
          .where(eq(workerMiscExpenses.projectId, projectId))
          .orderBy(workerMiscExpenses.date, workerMiscExpenses.createdAt);
      }
    } catch (error) {
      console.error('Error getting worker misc expenses:', error);
      return [];
    }
  }

  async getWorkerMiscExpense(id: string): Promise<WorkerMiscExpense | null> {
    try {
      const [expense] = await db.select().from(workerMiscExpenses).where(eq(workerMiscExpenses.id, id));
      return expense || null;
    } catch (error) {
      console.error('Error getting worker misc expense:', error);
      return null;
    }
  }

  async createWorkerMiscExpense(expense: InsertWorkerMiscExpense): Promise<WorkerMiscExpense> {
    try {
      const [newExpense] = await db
        .insert(workerMiscExpenses)
        .values(expense)
        .returning();
      return newExpense;
    } catch (error) {
      console.error('Error creating worker misc expense:', error);
      throw error;
    }
  }

  async updateWorkerMiscExpense(id: string, expense: Partial<InsertWorkerMiscExpense>): Promise<WorkerMiscExpense | undefined> {
    try {
      const [updated] = await db
        .update(workerMiscExpenses)
        .set(expense)
        .where(eq(workerMiscExpenses.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating worker misc expense:', error);
      throw error;
    }
  }

  async deleteWorkerMiscExpense(id: string): Promise<void> {
    try {
      await db.delete(workerMiscExpenses).where(eq(workerMiscExpenses.id, id));
    } catch (error) {
      console.error('Error deleting worker misc expense:', error);
      throw error;
    }
  }

  // Advanced Reports
  async getExpensesForReport(projectId: string, dateFrom: string, dateTo: string): Promise<any[]> {
    // جلب جميع المصروفات من مصادر مختلفة
    const expenses: any[] = [];

    // 1. أجور العمال المدفوعة فعلياً فقط
    const workerWages = await db.select({
      id: workerAttendance.id,
      projectId: workerAttendance.projectId,
      date: workerAttendance.date,
      category: sql`'عمالة'`.as('category'),
      subcategory: workers.type,
      description: workers.name,
      amount: workerAttendance.paidAmount,
      vendor: sql`NULL`.as('vendor'),
      notes: sql`NULL`.as('notes'),
      type: sql`'wages'`.as('type')
    })
    .from(workerAttendance)
    .leftJoin(workers, eq(workerAttendance.workerId, workers.id))
    .where(and(
      eq(workerAttendance.projectId, projectId),
      gte(workerAttendance.date, dateFrom),
      lte(workerAttendance.date, dateTo),
      eq(workerAttendance.isPresent, true),
      gt(workerAttendance.paidAmount, "0") // فقط الأجور المدفوعة
    ));

    // 2. مشتريات المواد (النقدية فقط - المشتريات الآجلة لا تُحسب كمصروفات)
    const materialPurchasesData = await db.select({
      id: materialPurchases.id,
      projectId: materialPurchases.projectId,
      date: materialPurchases.purchaseDate,
      category: sql`'مشتريات'`.as('category'),
      subcategory: materialPurchases.purchaseType, // نوع الدفع كفئة فرعية
      description: materials.name,
      amount: materialPurchases.totalAmount,
      vendor: materialPurchases.supplierName,
      notes: materialPurchases.notes,
      type: sql`'materials'`.as('type')
    })
    .from(materialPurchases)
    .leftJoin(materials, eq(materialPurchases.materialId, materials.id))
    .where(and(
      eq(materialPurchases.projectId, projectId),
      gte(materialPurchases.purchaseDate, dateFrom),
      lte(materialPurchases.purchaseDate, dateTo),
      eq(materialPurchases.purchaseType, 'نقد') // فقط المشتريات النقدية تُحسب كمصروفات
    ));

    // 3. مصروفات النقل
    const transportExpenses = await db.select({
      id: transportationExpenses.id,
      projectId: transportationExpenses.projectId,
      date: transportationExpenses.date,
      category: sql`'مواصلات'`.as('category'),
      subcategory: sql`'أجور نقل'`.as('subcategory'),
      description: transportationExpenses.description,
      amount: transportationExpenses.amount,
      vendor: sql`NULL`.as('vendor'),
      notes: transportationExpenses.notes,
      type: sql`'transport'`.as('type')
    })
    .from(transportationExpenses)
    .where(and(
      eq(transportationExpenses.projectId, projectId),
      gte(transportationExpenses.date, dateFrom),
      lte(transportationExpenses.date, dateTo)
    ));

    // 4. تحويلات العمال
    const workerTransfersExp = await db.select({
      id: workerTransfers.id,
      projectId: workerTransfers.projectId,
      date: workerTransfers.transferDate,
      category: sql`'تحويلات عمال'`.as('category'),
      subcategory: sql`'تحويل'`.as('subcategory'),
      description: workers.name,
      amount: workerTransfers.amount,
      vendor: sql`NULL`.as('vendor'),
      notes: workerTransfers.notes,
      type: sql`'worker_transfers'`.as('type')
    })
    .from(workerTransfers)
    .leftJoin(workers, eq(workerTransfers.workerId, workers.id))
    .where(and(
      eq(workerTransfers.projectId, projectId),
      gte(workerTransfers.transferDate, dateFrom),
      lte(workerTransfers.transferDate, dateTo)
    ));

    // 5. نثريات العمال
    const workerMiscExp = await db.select({
      id: workerMiscExpenses.id,
      projectId: workerMiscExpenses.projectId,
      date: workerMiscExpenses.date,
      category: sql`'نثريات'`.as('category'),
      subcategory: sql`'نثريات عمال'`.as('subcategory'),
      description: workerMiscExpenses.description,
      amount: workerMiscExpenses.amount,
      vendor: sql`NULL`.as('vendor'),
      notes: workerMiscExpenses.notes,
      type: sql`'misc'`.as('type')
    })
    .from(workerMiscExpenses)
    .where(and(
      eq(workerMiscExpenses.projectId, projectId),
      gte(workerMiscExpenses.date, dateFrom),
      lte(workerMiscExpenses.date, dateTo)
    ));

    // دمج جميع المصروفات
    expenses.push(...workerWages, ...materialPurchasesData, ...transportExpenses, ...workerTransfersExp, ...workerMiscExp);

    // إضافة اسم المشروع لكل سجل
    const project = await this.getProject(projectId);
    const projectName = project?.name || 'غير محدد';

    return expenses.map(expense => ({
      ...expense,
      projectName,
      amount: parseFloat(expense.amount?.toString() || '0'),
      category: expense.category || 'غير محدد',
      subcategory: expense.subcategory || '',
      description: expense.description || '',
      vendor: expense.vendor || '',
      notes: expense.notes || ''
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getIncomeForReport(projectId: string, dateFrom: string, dateTo: string): Promise<any[]> {
    // جلب تحويلات العهدة (الإيرادات)
    const income = await db.select({
      id: fundTransfers.id,
      projectId: fundTransfers.projectId,
      date: fundTransfers.transferDate,
      transferNumber: fundTransfers.transferNumber,
      senderName: fundTransfers.senderName,
      transferType: fundTransfers.transferType,
      amount: fundTransfers.amount,
      notes: fundTransfers.notes
    })
    .from(fundTransfers)
    .where(and(
      eq(fundTransfers.projectId, projectId),
      gte(sql`date(${fundTransfers.transferDate})`, dateFrom),
      lte(sql`date(${fundTransfers.transferDate})`, dateTo)
    ))
    .orderBy(fundTransfers.transferDate);

    // إضافة اسم المشروع
    const project = await this.getProject(projectId);
    const projectName = project?.name || 'غير محدد';

    return income.map(inc => ({
      ...inc,
      projectName,
      amount: parseFloat(inc.amount?.toString() || '0'),
      transferNumber: inc.transferNumber || 'غير محدد',
      senderName: inc.senderName || 'غير محدد',
      transferType: inc.transferType || 'حوالة عادية',
      notes: inc.notes || ''
    }));
  }

  // Users methods
  async getUsers(): Promise<User[]> {
    try {
      return await db.select().from(users).orderBy(users.createdAt);
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const [newUser] = await db
        .insert(users)
        .values({
          ...user,
          updatedAt: new Date()
        })
        .returning();
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const [updated] = await db
        .update(users)
        .set({
          ...user,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await db.delete(users).where(eq(users.id, id));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Suppliers methods
  async getSuppliers(): Promise<Supplier[]> {
    try {
      return await db.select({
        id: suppliers.id,
        name: suppliers.name,
        contactPerson: suppliers.contactPerson,
        phone: suppliers.phone,
        address: suppliers.address,
        paymentTerms: suppliers.paymentTerms,
        totalDebt: suppliers.totalDebt,
        notes: suppliers.notes,
        isActive: suppliers.isActive,
        createdAt: suppliers.createdAt,
      }).from(suppliers).orderBy(suppliers.name);
    } catch (error) {
      console.error('Error getting suppliers:', error);
      return [];
    }
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    try {
      const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
      return supplier || undefined;
    } catch (error) {
      console.error('Error getting supplier:', error);
      return undefined;
    }
  }

  async getSupplierByName(name: string): Promise<Supplier | undefined> {
    try {
      const [supplier] = await db.select().from(suppliers).where(eq(suppliers.name, name));
      return supplier || undefined;
    } catch (error) {
      console.error('Error getting supplier by name:', error);
      return undefined;
    }
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    try {
      // إنشاء كائن البيانات مع تحديد صريح للحقول
      const supplierData = {
        name: supplier.name,
        contactPerson: supplier.contactPerson || null,
        phone: supplier.phone || null,
        address: supplier.address || null,
        paymentTerms: supplier.paymentTerms || "نقد",
        totalDebt: supplier.totalDebt || '0',
        isActive: supplier.isActive !== undefined ? supplier.isActive : true,
        notes: supplier.notes || null
      };
      
      console.log('Creating supplier with data:', supplierData);
      
      const [newSupplier] = await db
        .insert(suppliers)
        .values(supplierData)
        .returning();
      return newSupplier;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    try {
      const [updated] = await db
        .update(suppliers)
        .set(supplier)
        .where(eq(suppliers.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  }

  async deleteSupplier(id: string): Promise<void> {
    try {
      await db.delete(suppliers).where(eq(suppliers.id, id));
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  }

  // Supplier Payments methods
  async getAllSupplierPayments(): Promise<SupplierPayment[]> {
    try {
      console.log('🔍 جاري جلب جميع مدفوعات الموردين...');
      const payments = await db.select().from(supplierPayments).orderBy(supplierPayments.paymentDate);
      console.log(`✅ تم جلب ${payments.length} مدفوعة مورد`);
      return payments;
    } catch (error) {
      console.error('خطأ في جلب جميع مدفوعات الموردين:', error);
      return [];
    }
  }

  async getSupplierPayments(supplierId: string, projectId?: string): Promise<SupplierPayment[]> {
    try {
      const conditions = [eq(supplierPayments.supplierId, supplierId)];
      if (projectId) {
        conditions.push(eq(supplierPayments.projectId, projectId));
      }
      
      return await db.select().from(supplierPayments)
        .where(and(...conditions))
        .orderBy(supplierPayments.paymentDate);
    } catch (error) {
      console.error('Error getting supplier payments:', error);
      return [];
    }
  }

  async getSupplierPayment(id: string): Promise<SupplierPayment | undefined> {
    try {
      const [payment] = await db.select().from(supplierPayments).where(eq(supplierPayments.id, id));
      return payment || undefined;
    } catch (error) {
      console.error('Error getting supplier payment:', error);
      return undefined;
    }
  }

  async createSupplierPayment(payment: InsertSupplierPayment): Promise<SupplierPayment> {
    try {
      const [newPayment] = await db
        .insert(supplierPayments)
        .values(payment)
        .returning();
      return newPayment;
    } catch (error) {
      console.error('Error creating supplier payment:', error);
      throw error;
    }
  }

  async updateSupplierPayment(id: string, payment: Partial<InsertSupplierPayment>): Promise<SupplierPayment | undefined> {
    try {
      const [updated] = await db
        .update(supplierPayments)
        .set(payment)
        .where(eq(supplierPayments.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating supplier payment:', error);
      throw error;
    }
  }

  async deleteSupplierPayment(id: string): Promise<void> {
    try {
      await db.delete(supplierPayments).where(eq(supplierPayments.id, id));
    } catch (error) {
      console.error('Error deleting supplier payment:', error);
      throw error;
    }
  }

  // Supplier Reports methods
  async getSupplierAccountStatement(supplierId: string, projectId?: string, dateFrom?: string, dateTo?: string): Promise<{
    supplier: Supplier;
    purchases: MaterialPurchase[];
    payments: SupplierPayment[];
    totalDebt: string;
    totalPaid: string;
    remainingDebt: string;
    // إضافة الحسابات المنفصلة للنقدي والآجل
    cashPurchases: {
      total: string;
      count: number;
      purchases: MaterialPurchase[];
    };
    creditPurchases: {
      total: string;
      count: number;
      purchases: MaterialPurchase[];
    };
  }> {
    try {
      // جلب بيانات المورد
      const supplier = await this.getSupplier(supplierId);
      if (!supplier) {
        throw new Error('المورد غير موجود');
      }

      // شروط التصفية للمشتريات (نحتاج للبحث بـ supplierName بدلاً من supplierId)
      const supplierName = supplier.name;
      const purchaseConditions = [eq(materialPurchases.supplierName, supplierName)];
      const paymentConditions = [eq(supplierPayments.supplierId, supplierId)];
      
      if (projectId && projectId !== 'all') {
        purchaseConditions.push(eq(materialPurchases.projectId, projectId));
        paymentConditions.push(eq(supplierPayments.projectId, projectId));
      }
      
      if (dateFrom) {
        purchaseConditions.push(gte(materialPurchases.invoiceDate, dateFrom));
        if (paymentConditions.length > 1 || !paymentConditions.some(c => c === paymentConditions[0])) {
          paymentConditions.push(gte(supplierPayments.paymentDate, dateFrom));
        }
      }
      
      if (dateTo) {
        purchaseConditions.push(lte(materialPurchases.invoiceDate, dateTo));
        if (paymentConditions.length > 1 || dateFrom) {
          paymentConditions.push(lte(supplierPayments.paymentDate, dateTo));
        }
      }

      // جلب المشتريات
      const purchases = await db.select().from(materialPurchases)
        .where(and(...purchaseConditions))
        .orderBy(materialPurchases.invoiceDate);

      // جلب المدفوعات
      const payments = await db.select().from(supplierPayments)
        .where(and(...paymentConditions))
        .orderBy(supplierPayments.paymentDate);

      // فصل المشتريات حسب نوع الدفع (مع إزالة علامات التنصيص وتطبيع الأحرف العربية)
      const cashPurchasesList = purchases.filter(p => {
        const cleanType = p.purchaseType?.replace(/['"]/g, '') || '';
        return cleanType === 'نقد';
      });
      const creditPurchasesList = purchases.filter(p => {
        const cleanType = p.purchaseType?.replace(/['"]/g, '') || '';
        // البحث عن جميع أشكال "أجل": مع الألف العادية والمد
        return cleanType === 'أجل' || cleanType === 'آجل' || cleanType.includes('جل');
      });

      // حساب الإجماليات منفصلة
      const cashTotal = cashPurchasesList.reduce((sum, purchase) => 
        sum + parseFloat(purchase.totalAmount || '0'), 0);
      const creditTotal = creditPurchasesList.reduce((sum, purchase) => 
        sum + parseFloat(purchase.totalAmount || '0'), 0);
      
      const totalDebt = cashTotal + creditTotal;
      const totalPaid = payments.reduce((sum, payment) => 
        sum + parseFloat(payment.amount || '0'), 0);
      const remainingDebt = totalDebt - totalPaid;

      return {
        supplier,
        purchases,
        payments,
        totalDebt: totalDebt.toString(),
        totalPaid: totalPaid.toString(),
        remainingDebt: remainingDebt.toString(),
        cashPurchases: {
          total: cashTotal.toString(),
          count: cashPurchasesList.length,
          purchases: cashPurchasesList
        },
        creditPurchases: {
          total: creditTotal.toString(),
          count: creditPurchasesList.length,
          purchases: creditPurchasesList
        }
      };
    } catch (error) {
      console.error('Error getting supplier account statement:', error);
      throw error;
    }
  }

  async getPurchasesBySupplier(supplierId: string, purchaseType?: string, dateFrom?: string, dateTo?: string): Promise<MaterialPurchase[]> {
    try {
      const conditions = [eq(materialPurchases.supplierId, supplierId)];
      
      if (purchaseType) {
        conditions.push(eq(materialPurchases.purchaseType, purchaseType));
      }
      
      if (dateFrom && dateTo) {
        conditions.push(
          gte(materialPurchases.invoiceDate, dateFrom),
          lte(materialPurchases.invoiceDate, dateTo)
        );
      }

      return await db.select().from(materialPurchases)
        .where(and(...conditions))
        .orderBy(materialPurchases.invoiceDate);
    } catch (error) {
      console.error('Error getting purchases by supplier:', error);
      return [];
    }
  }

  // تنفيذ دالة إحصائيات الموردين العامة
  async getSupplierStatistics(filters?: {
    supplierId?: string;
    projectId?: string;
    dateFrom?: string;
    dateTo?: string;
    purchaseType?: string;
  }): Promise<{
    totalSuppliers: number;
    totalCashPurchases: string;
    totalCreditPurchases: string;
    totalDebt: string;
    totalPaid: string;
    remainingDebt: string;
    activeSuppliers: number;
  }> {
    try {
      console.log('🔍 Supplier statistics filters:', filters);
      
      // جلب جميع الموردين
      const allSuppliers = await this.getSuppliers();
      
      // إعداد شروط البحث للمشتريات
      const purchaseConditions = [];
      const paymentConditions = [];
      
      if (filters?.supplierId) {
        // للبحث بالمورد المحدد
        try {
          const supplier = await this.getSupplier(filters.supplierId);
          if (supplier) {
            purchaseConditions.push(eq(materialPurchases.supplierName, supplier.name));
            paymentConditions.push(eq(supplierPayments.supplierId, filters.supplierId));
          } else {
            // إذا لم يوجد المورد، نبحث مباشرة بالـ ID في جدول المشتريات
            purchaseConditions.push(eq(materialPurchases.supplierId, filters.supplierId));
            paymentConditions.push(eq(supplierPayments.supplierId, filters.supplierId));
          }
        } catch (error) {
          console.error('⚠️ خطأ في البحث عن المورد، سيتم البحث بالـ ID مباشرة:', error);
          // في حالة خطأ، نبحث مباشرة بالـ ID
          purchaseConditions.push(eq(materialPurchases.supplierId, filters.supplierId));
          paymentConditions.push(eq(supplierPayments.supplierId, filters.supplierId));
        }
      }
      
      if (filters?.projectId && filters.projectId !== 'all') {
        purchaseConditions.push(eq(materialPurchases.projectId, filters.projectId));
        paymentConditions.push(eq(supplierPayments.projectId, filters.projectId));
      }
      
      if (filters?.dateFrom) {
        purchaseConditions.push(gte(materialPurchases.invoiceDate, filters.dateFrom));
        paymentConditions.push(gte(supplierPayments.paymentDate, filters.dateFrom));
      }
      
      if (filters?.dateTo) {
        purchaseConditions.push(lte(materialPurchases.invoiceDate, filters.dateTo));
        paymentConditions.push(lte(supplierPayments.paymentDate, filters.dateTo));
      }

      // جلب جميع المشتريات مع الفلاتر
      const purchases = await db.select().from(materialPurchases)
        .where(purchaseConditions.length > 0 ? and(...purchaseConditions) : undefined);
      
      // جلب جميع المدفوعات مع الفلاتر
      const payments = await db.select().from(supplierPayments)
        .where(paymentConditions.length > 0 ? and(...paymentConditions) : undefined);

      // طباعة عينة من البيانات للتحقق من قيم purchaseType
      if (purchases.length > 0) {
        console.log('🔍 عينة من البيانات:', {
          total: purchases.length,
          first3: purchases.slice(0, 3).map(p => ({
            id: p.id,
            purchaseType: p.purchaseType,
            purchaseTypeType: typeof p.purchaseType,
            totalAmount: p.totalAmount
          }))
        });
        
        // عرض جميع القيم الفريدة لـ purchaseType
        const uniqueTypes = Array.from(new Set(purchases.map(p => p.purchaseType)));
        console.log('🏷️ جميع قيم purchaseType الموجودة:', uniqueTypes);
      }
      
      // فصل المشتريات حسب نوع الدفع أولاً (مع إزالة علامات التنصيص وتطبيع الأحرف العربية)
      const allCashPurchases = purchases.filter(p => {
        const cleanType = p.purchaseType?.replace(/['"]/g, '') || '';
        const isCash = cleanType === 'نقد';
        console.log(`💳 فحص: "${p.purchaseType}" -> "${cleanType}" -> نقد؟ ${isCash}`);
        return isCash;
      });
      const allCreditPurchases = purchases.filter(p => {
        const cleanType = p.purchaseType?.replace(/['"]/g, '') || '';
        // البحث عن جميع أشكال "أجل": مع الألف العادية والمد
        const isCredit = cleanType === 'أجل' || cleanType === 'آجل' || cleanType.includes('جل');
        console.log(`💰 فحص: "${p.purchaseType}" -> "${cleanType}" -> أجل/آجل؟ ${isCredit}`);
        return isCredit;
      });
      
      // تطبيق فلتر نوع الدفع المحدد
      let cashPurchases = allCashPurchases;
      let creditPurchases = allCreditPurchases;
      
      if (filters?.purchaseType && filters.purchaseType !== 'all') {
        if (filters.purchaseType === 'نقد') {
          creditPurchases = []; // إخفاء الآجلة عند اختيار النقدية فقط
        } else if (filters.purchaseType === 'أجل') {
          cashPurchases = []; // إخفاء النقدية عند اختيار الآجلة فقط
        }
      }
      
      console.log('📊 Purchase statistics:', {
        totalPurchases: purchases.length,
        allCashPurchases: allCashPurchases.length,
        allCreditPurchases: allCreditPurchases.length,
        filteredCashPurchases: cashPurchases.length,
        filteredCreditPurchases: creditPurchases.length,
        selectedFilter: filters?.purchaseType || 'all'
      });

      // حساب الإجماليات
      const totalCashPurchases = cashPurchases.reduce((sum, p) => sum + parseFloat(p.totalAmount || '0'), 0);
      const totalCreditPurchases = creditPurchases.reduce((sum, p) => sum + parseFloat(p.totalAmount || '0'), 0);
      
      // المديونية = فقط المشتريات الآجلة (ليس النقدية)
      const totalDebt = totalCreditPurchases;
      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
      const remainingDebt = totalDebt - totalPaid;
      
      console.log('💰 تفاصيل حساب المديونية:', {
        cashPurchases: totalCashPurchases,
        creditPurchases: totalCreditPurchases,
        totalDebt: totalDebt,
        totalPaid: totalPaid,
        remainingDebt: remainingDebt,
        creditPurchasesCount: creditPurchases.length
      });
      
      // حساب عدد الموردين النشطين (الذين لديهم مشتريات)
      const activeSupplierNames = Array.from(new Set(purchases.map(p => p.supplierName).filter(name => name !== null)));
      
      return {
        totalSuppliers: filters?.supplierId ? 1 : allSuppliers.length,
        totalCashPurchases: totalCashPurchases.toString(),
        totalCreditPurchases: totalCreditPurchases.toString(),
        totalDebt: totalDebt.toString(),
        totalPaid: totalPaid.toString(),
        remainingDebt: remainingDebt.toString(),
        activeSuppliers: activeSupplierNames.length
      };
    } catch (error) {
      console.error('Error getting supplier statistics:', error);
      throw error;
    }
  }

  // Print Settings Methods
  async getPrintSettings(reportType?: string, userId?: string): Promise<PrintSettings[]> {
    try {
      const conditions = [];
      
      if (reportType) {
        conditions.push(eq(printSettings.reportType, reportType));
      }
      
      if (userId) {
        conditions.push(eq(printSettings.userId, userId));
      }
      
      return await db.select().from(printSettings)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(printSettings.createdAt);
    } catch (error) {
      console.error('Error getting print settings:', error);
      return [];
    }
  }

  async getPrintSettingsById(id: string): Promise<PrintSettings | undefined> {
    try {
      const [settings] = await db.select().from(printSettings).where(eq(printSettings.id, id));
      return settings || undefined;
    } catch (error) {
      console.error('Error getting print settings by id:', error);
      return undefined;
    }
  }

  async createPrintSettings(settings: InsertPrintSettings): Promise<PrintSettings> {
    try {
      const [newSettings] = await db
        .insert(printSettings)
        .values(settings)
        .returning();
      return newSettings;
    } catch (error) {
      console.error('Error creating print settings:', error);
      throw error;
    }
  }

  async updatePrintSettings(id: string, settings: Partial<InsertPrintSettings>): Promise<PrintSettings | undefined> {
    try {
      const [updated] = await db
        .update(printSettings)
        .set(settings)
        .where(eq(printSettings.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating print settings:', error);
      throw error;
    }
  }

  async deletePrintSettings(id: string): Promise<void> {
    try {
      await db.delete(printSettings).where(eq(printSettings.id, id));
    } catch (error) {
      console.error('Error deleting print settings:', error);
      throw error;
    }
  }

  async getDefaultPrintSettings(reportType: string): Promise<PrintSettings | undefined> {
    try {
      const [settings] = await db.select().from(printSettings)
        .where(and(
          eq(printSettings.reportType, reportType),
          eq(printSettings.isDefault, true)
        ))
        .limit(1);
      return settings || undefined;
    } catch (error) {
      console.error('Error getting default print settings:', error);
      return undefined;
    }
  }

  // دالتان إضافيتان للإصلاح
  async deleteDailySummary(projectId: string, date: string): Promise<void> {
    try {
      await db.delete(dailyExpenseSummaries)
        .where(and(
          eq(dailyExpenseSummaries.projectId, projectId),
          eq(dailyExpenseSummaries.date, date)
        ));
      console.log(`✅ تم حذف ملخص ${date} للمشروع ${projectId}`);
    } catch (error) {
      console.error('Error deleting daily summary:', error);
      throw error;
    }
  }

  async getDailySummary(projectId: string, date: string): Promise<DailyExpenseSummary | null> {
    try {
      const [summary] = await db.select().from(dailyExpenseSummaries)
        .where(and(
          eq(dailyExpenseSummaries.projectId, projectId),
          eq(dailyExpenseSummaries.date, date)
        ));
      return summary || null;
    } catch (error) {
      console.error('Error getting daily summary:', error);
      return null;
    }
  }

  // Report Templates
  async getReportTemplates(): Promise<ReportTemplate[]> {
    try {
      return await db.select().from(reportTemplates).orderBy(sql`created_at DESC`);
    } catch (error) {
      console.error('Error getting report templates:', error);
      return [];
    }
  }

  async getReportTemplate(id: string): Promise<ReportTemplate | undefined> {
    try {
      const [template] = await db.select().from(reportTemplates).where(eq(reportTemplates.id, id));
      return template || undefined;
    } catch (error) {
      console.error('Error getting report template:', error);
      return undefined;
    }
  }

  async getActiveReportTemplate(): Promise<ReportTemplate | undefined> {
    try {
      const [template] = await db.select().from(reportTemplates)
        .where(eq(reportTemplates.isActive, true))
        .orderBy(sql`updated_at DESC`)
        .limit(1);
      return template || undefined;
    } catch (error) {
      console.error('Error getting active report template:', error);
      return undefined;
    }
  }

  async createReportTemplate(template: InsertReportTemplate): Promise<ReportTemplate> {
    try {
      // إذا كان هذا القالب سيكون نشطاً، إلغاء تفعيل القوالب الأخرى
      if (template.isActive) {
        await db.update(reportTemplates)
          .set({ isActive: false })
          .where(eq(reportTemplates.isActive, true));
      }

      const [newTemplate] = await db
        .insert(reportTemplates)
        .values(template)
        .returning();
      
      if (!newTemplate) {
        throw new Error('فشل في إنشاء قالب التقرير');
      }
      
      return newTemplate;
    } catch (error) {
      console.error('Error creating report template:', error);
      throw error;
    }
  }

  async updateReportTemplate(id: string, template: Partial<InsertReportTemplate>): Promise<ReportTemplate | undefined> {
    try {
      // إذا كان سيتم تفعيل هذا القالب، إلغاء تفعيل القوالب الأخرى
      if (template.isActive) {
        await db.update(reportTemplates)
          .set({ isActive: false })
          .where(eq(reportTemplates.isActive, true));
      }

      const [updated] = await db
        .update(reportTemplates)
        .set({ ...template, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(reportTemplates.id, id))
        .returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error updating report template:', error);
      throw error;
    }
  }

  async deleteReportTemplate(id: string): Promise<void> {
    try {
      await db.delete(reportTemplates).where(eq(reportTemplates.id, id));
    } catch (error) {
      console.error('Error deleting report template:', error);
      throw error;
    }
  }

  // =====================================================
  // تنفيذ دوال نظام إدارة المعدات المبسط
  // =====================================================

  // Equipment Management (نظام المعدات المبسط)
  async getEquipmentList(): Promise<Equipment[]> {
    try {
      const equipmentList = await db
        .select()
        .from(equipment)
        .orderBy(equipment.code);
      return equipmentList;
    } catch (error) {
      console.error('Error getting equipment list:', error);
      return [];
    }
  }

  // Equipment operations with auto code generation and image support
  async generateNextEquipmentCode(): Promise<string> {
    try {
      console.time('generateCode');
      
      // تحسين جذري: استخدام timestamp للسرعة الفائقة
      const timestamp = Date.now().toString().slice(-6);
      const code = `EQ-${timestamp}`;
      
      console.timeEnd('generateCode');
      console.log(`📝 كود جديد: ${code}`);
      
      return code;
    } catch (error) {
      console.error('Error generating equipment code:', error);
      const fallback = `EQ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      return fallback;
    }
  }

  async getEquipmentById(id: string): Promise<Equipment | undefined> {
    try {
      const [foundEquipment] = await db.select().from(equipment)
        .where(eq(equipment.id, id));
      return foundEquipment || undefined;
    } catch (error) {
      console.error('Error getting equipment:', error);
      return undefined;
    }
  }

  async getEquipment(filters?: {
    projectId?: string;
    status?: string;
    type?: string;
    searchTerm?: string;
  }): Promise<Equipment[]> {
    try {
      console.time('getEquipment');
      
      // فحص Cache أولاً
      const now = Date.now();
      if (this.equipmentCache && (now - this.equipmentCache.timestamp) < this.CACHE_DURATION) {
        console.log('⚡ استخدام Cache المحلي - سرعة فائقة!');
        console.timeEnd('getEquipment');
        return this.applyFiltersToCache(this.equipmentCache.data, filters);
      }
      
      // استعلام فائق السرعة - الحقول الأساسية + الصورة
      const result = await db.select({
        id: equipment.id,
        code: equipment.code,
        name: equipment.name,
        status: equipment.status,
        currentProjectId: equipment.currentProjectId,
        type: equipment.type,
        imageUrl: equipment.imageUrl,
        description: equipment.description,
        purchasePrice: equipment.purchasePrice,
        purchaseDate: equipment.purchaseDate
      }).from(equipment)
        .limit(50); // حد أقصى 50
      
      // حفظ في Cache
      this.equipmentCache = {
        data: result,
        timestamp: now
      };
      
      console.timeEnd('getEquipment');
      console.log(`⚡ تم جلب ${result.length} معدة وحفظها في Cache`);
      
      return this.applyFiltersToCache(result, filters);
    } catch (error) {
      console.error('Error getting equipment list:', error);
      return [];
    }
  }

  private applyFiltersToCache(data: any[], filters?: {
    projectId?: string;
    status?: string;
    type?: string;
    searchTerm?: string;
  }): any[] {
    if (!filters) return data;

    return data.filter(item => {
      // فلتر المشروع
      if (filters.projectId && filters.projectId !== 'all') {
        if (filters.projectId === 'warehouse') {
          if (item.currentProjectId) return false;
        } else if (item.currentProjectId !== filters.projectId) {
          return false;
        }
      }

      // فلتر الحالة
      if (filters.status && filters.status !== 'all' && item.status !== filters.status) {
        return false;
      }

      // فلتر النوع
      if (filters.type && filters.type !== 'all' && item.type !== filters.type) {
        return false;
      }

      // فلتر البحث
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const nameMatch = item.name?.toLowerCase().includes(searchLower);
        const codeMatch = item.code?.toLowerCase().includes(searchLower);
        if (!nameMatch && !codeMatch) return false;
      }

      return true;
    });
  }

  async getEquipmentByCode(code: string): Promise<Equipment | undefined> {
    try {
      const [foundEquipment] = await db.select().from(equipment)
        .where(eq(equipment.code, code));
      return foundEquipment || undefined;
    } catch (error) {
      console.error('Error getting equipment by code:', error);
      return undefined;
    }
  }

  async getEquipmentByProject(projectId: string): Promise<Equipment[]> {
    try {
      return await db.select().from(equipment)
        .where(eq(equipment.currentProjectId, projectId))
        .orderBy(equipment.code);
    } catch (error) {
      console.error('Error getting equipment by project:', error);
      return [];
    }
  }

  async createEquipment(equipmentData: InsertEquipment): Promise<Equipment> {
    try {
      console.time('createEquipment');
      
      // توليد كود تلقائي - محسن
      const autoCode = await this.generateNextEquipmentCode();
      
      const [newEquipment] = await db
        .insert(equipment)
        .values({
          ...equipmentData,
          code: autoCode
        })
        .returning();
      
      if (!newEquipment) {
        throw new Error('فشل في إنشاء المعدة');
      }
      
      console.timeEnd('createEquipment');
      console.log(`✅ تمت إضافة المعدة: ${newEquipment.name}`);
      
      return newEquipment;
    } catch (error) {
      console.error('Error creating equipment:', error);
      throw error;
    }
  }

  async updateEquipment(id: string, equipmentData: Partial<InsertEquipment>): Promise<Equipment | undefined> {
    try {
      console.time('updateEquipment');
      
      const [updatedEquipment] = await db
        .update(equipment)
        .set({ ...equipmentData, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(equipment.id, id))
        .returning();
      
      console.timeEnd('updateEquipment');
      console.log(`✅ تم تعديل المعدة: ${updatedEquipment?.name || id}`);
      
      return updatedEquipment || undefined;
    } catch (error) {
      console.error('Error updating equipment:', error);
      throw error;
    }
  }

  async deleteEquipment(id: string): Promise<void> {
    try {
      console.time('deleteEquipment');
      
      await db.delete(equipment).where(eq(equipment.id, id));
      
      console.timeEnd('deleteEquipment');
      console.log(`🗑️ تم حذف المعدة: ${id}`);
    } catch (error) {
      console.error('Error deleting equipment:', error);
      throw error;
    }
  }

  // Equipment Movements
  async getEquipmentMovements(equipmentId: string): Promise<EquipmentMovement[]> {
    try {
      return await db.select().from(equipmentMovements)
        .where(eq(equipmentMovements.equipmentId, equipmentId))
        .orderBy(desc(equipmentMovements.movementDate));
    } catch (error) {
      console.error('Error getting equipment movements:', error);
      return [];
    }
  }

  async createEquipmentMovement(movementData: InsertEquipmentMovement): Promise<EquipmentMovement> {
    try {
      const [newMovement] = await db
        .insert(equipmentMovements)
        .values(movementData)
        .returning();
      
      if (!newMovement) {
        throw new Error('فشل في إنشاء حركة المعدة');
      }
      
      return newMovement;
    } catch (error) {
      console.error('Error creating equipment movement:', error);
      throw error;
    }
  }


  // =====================================================
  // تنفيذ دوال إدارة الإشعارات
  // =====================================================

  // Notification Read States Implementation
  async isNotificationRead(userId: string, notificationId: string, notificationType: string): Promise<boolean> {
    try {
      const [state] = await db.select({
        isRead: notificationReadStates.isRead
      }).from(notificationReadStates)
        .where(and(
          eq(notificationReadStates.userId, userId),
          eq(notificationReadStates.notificationId, notificationId)
        ));
      return state?.isRead || false;
    } catch (error) {
      console.error('Error checking notification read state:', error);
      return false;
    }
  }

  async getNotificationReadState(userId: string, notificationId: string, notificationType: string): Promise<NotificationReadState | undefined> {
    try {
      const [state] = await db.select({
        id: notificationReadStates.id,
        userId: notificationReadStates.userId,
        notificationId: notificationReadStates.notificationId,
        isRead: notificationReadStates.isRead,
        readAt: notificationReadStates.readAt,
        actionTaken: notificationReadStates.actionTaken,
        createdAt: notificationReadStates.createdAt
      }).from(notificationReadStates)
        .where(and(
          eq(notificationReadStates.userId, userId),
          eq(notificationReadStates.notificationId, notificationId)
        ));
      return state || undefined;
    } catch (error) {
      console.error('Error getting notification read state:', error);
      return undefined;
    }
  }

  async markNotificationAsRead(userId: string, notificationId: string, notificationType: string): Promise<void> {
    try {
      const existingState = await this.getNotificationReadState(userId, notificationId, notificationType);
      
      if (existingState) {
        await db.update(notificationReadStates)
          .set({ isRead: true, readAt: new Date() })
          .where(eq(notificationReadStates.id, existingState.id));
      } else {
        await db.insert(notificationReadStates).values({
          userId: userId,
          notificationId: notificationId,
          isRead: true,
          readAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      await db.update(notificationReadStates)
        .set({ isRead: true, readAt: new Date() })
        .where(and(
          eq(notificationReadStates.userId, userId),
          eq(notificationReadStates.isRead, false)
        ));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async getReadNotifications(userId: string, notificationType?: string): Promise<NotificationReadState[]> {
    try {
      const conditions = [eq(notificationReadStates.userId, userId), eq(notificationReadStates.isRead, true)];

      return await db.select({
        id: notificationReadStates.id,
        userId: notificationReadStates.userId,
        notificationId: notificationReadStates.notificationId,
        isRead: notificationReadStates.isRead,
        readAt: notificationReadStates.readAt,
        actionTaken: notificationReadStates.actionTaken,
        createdAt: notificationReadStates.createdAt
      }).from(notificationReadStates)
        .where(and(...conditions))
        .orderBy(desc(notificationReadStates.readAt));
    } catch (error) {
      console.error('Error getting read notifications:', error);
      return [];
    }
  }

  // =====================================================
  // AI System Implementation (تنفيذ النظام الذكي)
  // =====================================================

  // AI System Logs
  async getAiSystemLogs(filters?: { logType?: string; operation?: string; limit?: number }): Promise<AiSystemLog[]> {
    try {
      const conditions = [];
      if (filters?.logType) {
        conditions.push(eq(aiSystemLogs.logType, filters.logType));
      }
      if (filters?.operation) {
        conditions.push(ilike(aiSystemLogs.operation, `%${filters.operation}%`));
      }

      const baseQuery = db.select().from(aiSystemLogs);
      const finalQuery = baseQuery
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(aiSystemLogs.createdAt))
        .limit(filters?.limit || 100);

      const results = await finalQuery;
      return results;
    } catch (error) {
      console.error('Error getting AI system logs:', error);
      return [];
    }
  }

  async createAiSystemLog(log: InsertAiSystemLog): Promise<AiSystemLog> {
    try {
      const [newLog] = await db.insert(aiSystemLogs).values(log).returning();
      return newLog;
    } catch (error) {
      console.error('Error creating AI system log:', error);
      throw error;
    }
  }

  async deleteOldAiSystemLogs(olderThanDays: number): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      await db.delete(aiSystemLogs)
        .where(lte(aiSystemLogs.createdAt, cutoffDate));
    } catch (error) {
      console.error('Error deleting old AI system logs:', error);
      throw error;
    }
  }

  // AI System Metrics
  async getAiSystemMetrics(filters?: { metricType?: string; isActive?: boolean; limit?: number }): Promise<AiSystemMetric[]> {
    try {
      const conditions = [];
      if (filters?.metricType) {
        conditions.push(eq(aiSystemMetrics.metricType, filters.metricType));
      }
      if (filters?.isActive !== undefined) {
        conditions.push(eq(aiSystemMetrics.isActive, filters.isActive));
      }

      const baseQuery = db.select().from(aiSystemMetrics);
      const finalQuery = baseQuery
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(aiSystemMetrics.timestamp))
        .limit(filters?.limit || 100);

      const results = await finalQuery;
      return results;
    } catch (error) {
      console.error('Error getting AI system metrics:', error);
      return [];
    }
  }

  async getLatestAiSystemMetrics(): Promise<AiSystemMetric[]> {
    try {
      return await db.select().from(aiSystemMetrics)
        .where(eq(aiSystemMetrics.isActive, true))
        .orderBy(desc(aiSystemMetrics.timestamp))
        .limit(10);
    } catch (error) {
      console.error('Error getting latest AI system metrics:', error);
      return [];
    }
  }

  async createAiSystemMetric(metric: InsertAiSystemMetric): Promise<AiSystemMetric> {
    try {
      const [newMetric] = await db.insert(aiSystemMetrics).values(metric).returning();
      return newMetric;
    } catch (error) {
      console.error('Error creating AI system metric:', error);
      throw error;
    }
  }

  async updateAiSystemMetric(id: string, metric: Partial<InsertAiSystemMetric>): Promise<AiSystemMetric | undefined> {
    try {
      const [updatedMetric] = await db.update(aiSystemMetrics)
        .set({ ...metric, timestamp: new Date() })
        .where(eq(aiSystemMetrics.id, id))
        .returning();
      return updatedMetric || undefined;
    } catch (error) {
      console.error('Error updating AI system metric:', error);
      return undefined;
    }
  }

  // AI System Decisions
  async getAiSystemDecisions(filters?: { status?: string; decisionType?: string; priority?: number }): Promise<AiSystemDecision[]> {
    try {
      const conditions = [];
      if (filters?.status) {
        conditions.push(eq(aiSystemDecisions.status, filters.status));
      }
      if (filters?.decisionType) {
        conditions.push(eq(aiSystemDecisions.decisionType, filters.decisionType));
      }
      if (filters?.priority) {
        conditions.push(eq(aiSystemDecisions.priority, filters.priority));
      }

      const baseQuery = db.select().from(aiSystemDecisions);
      const finalQuery = baseQuery
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(aiSystemDecisions.createdAt));

      const results = await finalQuery;
      return results;
    } catch (error) {
      console.error('Error getting AI system decisions:', error);
      return [];
    }
  }

  async getAiSystemDecision(id: string): Promise<AiSystemDecision | undefined> {
    try {
      const [decision] = await db.select().from(aiSystemDecisions)
        .where(eq(aiSystemDecisions.id, id));
      return decision || undefined;
    } catch (error) {
      console.error('Error getting AI system decision:', error);
      return undefined;
    }
  }

  async createAiSystemDecision(decision: InsertAiSystemDecision): Promise<AiSystemDecision> {
    try {
      const [newDecision] = await db.insert(aiSystemDecisions).values(decision).returning();
      return newDecision;
    } catch (error) {
      console.error('Error creating AI system decision:', error);
      throw error;
    }
  }

  async updateAiSystemDecision(id: string, decision: Partial<InsertAiSystemDecision>): Promise<AiSystemDecision | undefined> {
    try {
      const [updatedDecision] = await db.update(aiSystemDecisions)
        .set({ ...decision, updatedAt: new Date() })
        .where(eq(aiSystemDecisions.id, id))
        .returning();
      return updatedDecision || undefined;
    } catch (error) {
      console.error('Error updating AI system decision:', error);
      return undefined;
    }
  }

  async executeAiSystemDecision(id: string, executedBy: string): Promise<AiSystemDecision | undefined> {
    try {
      const [executedDecision] = await db.update(aiSystemDecisions)
        .set({ 
          status: 'executed',
          executedAt: new Date(),
          executedBy: executedBy,
          updatedAt: new Date()
        })
        .where(eq(aiSystemDecisions.id, id))
        .returning();
      return executedDecision || undefined;
    } catch (error) {
      console.error('Error executing AI system decision:', error);
      return undefined;
    }
  }

  // AI System Recommendations
  async getAiSystemRecommendations(filters?: { status?: string; priority?: string; targetArea?: string }): Promise<AiSystemRecommendation[]> {
    try {
      const conditions = [];
      if (filters?.status) {
        conditions.push(eq(aiSystemRecommendations.status, filters.status));
      }
      if (filters?.priority) {
        conditions.push(eq(aiSystemRecommendations.priority, filters.priority));
      }
      // targetArea column was removed from schema
      // if (filters?.targetArea) {
      //   conditions.push(eq(aiSystemRecommendations.targetArea, filters.targetArea));
      // }

      const baseQuery = db.select().from(aiSystemRecommendations);
      const finalQuery = baseQuery
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(aiSystemRecommendations.createdAt));

      const results = await finalQuery;
      return results;
    } catch (error) {
      console.error('Error getting AI system recommendations:', error);
      return [];
    }
  }

  async getAiSystemRecommendation(id: string): Promise<AiSystemRecommendation | undefined> {
    try {
      const [recommendation] = await db.select().from(aiSystemRecommendations)
        .where(eq(aiSystemRecommendations.id, id));
      return recommendation || undefined;
    } catch (error) {
      console.error('Error getting AI system recommendation:', error);
      return undefined;
    }
  }

  async createAiSystemRecommendation(recommendation: InsertAiSystemRecommendation): Promise<AiSystemRecommendation> {
    try {
      const [newRecommendation] = await db.insert(aiSystemRecommendations).values(recommendation).returning();
      return newRecommendation;
    } catch (error) {
      console.error('Error creating AI system recommendation:', error);
      throw error;
    }
  }

  async updateAiSystemRecommendation(id: string, recommendation: Partial<InsertAiSystemRecommendation>): Promise<AiSystemRecommendation | undefined> {
    try {
      const [updatedRecommendation] = await db.update(aiSystemRecommendations)
        .set({ ...recommendation, updatedAt: new Date() })
        .where(eq(aiSystemRecommendations.id, id))
        .returning();
      return updatedRecommendation || undefined;
    } catch (error) {
      console.error('Error updating AI system recommendation:', error);
      return undefined;
    }
  }

  async executeAiSystemRecommendation(id: string, executionResult: any): Promise<AiSystemRecommendation | undefined> {
    try {
      const [executedRecommendation] = await db.update(aiSystemRecommendations)
        .set({ 
          status: 'executed',
          executedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(aiSystemRecommendations.id, id))
        .returning();
      return executedRecommendation || undefined;
    } catch (error) {
      console.error('Error executing AI system recommendation:', error);
      return undefined;
    }
  }

  async dismissAiSystemRecommendation(id: string): Promise<AiSystemRecommendation | undefined> {
    try {
      const [dismissedRecommendation] = await db.update(aiSystemRecommendations)
        .set({ 
          status: 'dismissed',
          updatedAt: new Date()
        })
        .where(eq(aiSystemRecommendations.id, id))
        .returning();
      return dismissedRecommendation || undefined;
    } catch (error) {
      console.error('Error dismissing AI system recommendation:', error);
      return undefined;
    }
  }

  // ===== وظائف إدارة قاعدة البيانات الذكية =====

  // محلل الأمان للجداول عالية الخطورة
  async analyzeSecurityThreats() {
    try {
      console.log('🔍 بدء تحليل التهديدات الأمنية للجداول...');
      
      const tables = await this.getDatabaseTables();
      const highRiskTables = tables.filter(table => 
        table.security_level === 'high' && !table.has_policies
      );

      const securityNotifications = [];

      for (const table of highRiskTables) {
        // إنشاء اقتراحات محددة لكل جدول
        const policySuggestions = this.generatePolicySuggestions(table);
        
        const notification = {
          id: `security-${table.table_name}-${Date.now()}`,
          userId: 'system', // نظام الأمان الداخلي
          type: 'security',
          title: `🔐 تحذير أمني: الجدول ${table.table_name}`,
          body: `الجدول ${table.table_name} يحتوي على بيانات حساسة ولا يحتوي على سياسات RLS. هذا قد يعرض البيانات للخطر.`,
          data: {
            tableName: table.table_name,
            securityLevel: table.security_level,
            rowCount: table.row_count,
            policySuggestions: policySuggestions,
            suggestedAction: 'تفعيل RLS وإضافة سياسات أمان'
          },
          priority: 1,
          isRead: false,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // ينتهي خلال أسبوع
        };
        
        securityNotifications.push(notification);
      }

      // حفظ الإشعارات الأمنية
      if (securityNotifications.length > 0) {
        await db.insert(notifications).values(securityNotifications);
        console.log(`⚠️ تم إنشاء ${securityNotifications.length} إشعار أمني للجداول عالية الخطورة`);
      }

      return {
        totalTables: tables.length,
        highRiskTables: highRiskTables.length,
        securityNotifications: securityNotifications.length,
        recommendations: highRiskTables.map(table => ({
          table: table.table_name,
          risk: 'عالي',
          action: 'تفعيل RLS + إضافة سياسات',
          suggestions: this.generatePolicySuggestions(table)
        }))
      };

    } catch (error) {
      console.error('❌ خطأ في تحليل التهديدات الأمنية:', error);
      return {
        totalTables: 0,
        highRiskTables: 0,
        securityNotifications: 0,
        recommendations: [],
        error: (error as Error).message
      };
    }
  }

  // مولد اقتراحات السياسات المتقدمة
  private generatePolicySuggestions(table: any) {
    const suggestions = [];
    const tableName = table.table_name.toLowerCase();

    // اقتراحات محددة حسب نوع الجدول
    if (tableName.includes('user')) {
      suggestions.push({
        type: 'RLS_POLICY',
        title: 'سياسة الوصول للمستخدمين',
        code: `CREATE POLICY "users_policy" ON ${table.table_name}
  USING (auth.uid() = id);`,
        description: 'المستخدم يمكنه الوصول لبياناته فقط'
      });
      suggestions.push({
        type: 'INSERT_POLICY', 
        title: 'سياسة إنشاء المستخدمين',
        code: `CREATE POLICY "users_insert_policy" ON ${table.table_name}
  FOR INSERT WITH CHECK (auth.uid() = id);`,
        description: 'المستخدم يمكنه إنشاء حسابه فقط'
      });
    } else if (tableName.includes('auth')) {
      suggestions.push({
        type: 'ADMIN_ONLY',
        title: 'سياسة المشرفين فقط',
        code: `CREATE POLICY "auth_admin_policy" ON ${table.table_name}
  USING (auth.jwt() ->> 'role' = 'admin');`,
        description: 'المشرفون فقط يمكنهم الوصول لبيانات المصادقة'
      });
    } else if (tableName.includes('project')) {
      suggestions.push({
        type: 'PROJECT_MEMBER',
        title: 'سياسة أعضاء المشروع',
        code: `CREATE POLICY "project_member_policy" ON ${table.table_name}
  USING (
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_id = ${table.table_name}.id 
      AND user_id = auth.uid()
    )
  );`,
        description: 'أعضاء المشروع فقط يمكنهم الوصول'
      });
    }

    // اقتراحات عامة
    suggestions.push({
      type: 'BASIC_RLS',
      title: 'سياسة أساسية للحماية',
      code: `CREATE POLICY "basic_security_policy" ON ${table.table_name}
  USING (auth.uid() IS NOT NULL);`,
      description: 'المستخدمون المسجلون فقط يمكنهم الوصول'
    });

    return suggestions;
  }

  async getDatabaseTables() {
    try {
      console.log('🔍 جاري تحليل جداول قاعدة البيانات...');
      
      // استعلام محسّن لجلب معلومات الجداول مع إزالة التكرار
      const query = sql`
        SELECT DISTINCT
          t.table_name,
          t.table_schema as schema_name,
          COALESCE(s.n_tup_ins - s.n_tup_del, 0) as row_count,
          COALESCE(pt.rowsecurity, false) as rls_enabled,
          COALESCE(pt.rowsecurity, false) as rls_forced,
          EXISTS(
            SELECT 1 FROM pg_policies 
            WHERE schemaname = t.table_schema 
            AND tablename = t.table_name
          ) as has_policies,
          CASE 
            WHEN t.table_name ~* 'user|auth|session|account' THEN 'high'
            WHEN t.table_name ~* 'project|worker|supplier|payment' THEN 'medium'
            ELSE 'low'
          END as security_level,
          CASE 
            WHEN t.table_name ~* 'user|auth' AND NOT COALESCE(pt.rowsecurity, false) 
            THEN 'يُنصح بتفعيل RLS للحماية'
            WHEN COALESCE(s.n_tup_ins - s.n_tup_del, 0) > 10000 
            THEN 'يُنصح بإضافة فهارس للأداء'
            ELSE 'الإعدادات مناسبة'
          END as recommended_action,
          pg_size_pretty(COALESCE(pg_total_relation_size(c.oid), 0)) as size_estimate,
          CURRENT_TIMESTAMP as last_analyzed
        FROM information_schema.tables t
        LEFT JOIN pg_tables pt ON (pt.tablename = t.table_name AND pt.schemaname = t.table_schema)
        LEFT JOIN pg_class c ON c.relname = t.table_name
        LEFT JOIN pg_namespace n ON (n.nspname = t.table_schema AND c.relnamespace = n.oid)
        LEFT JOIN pg_stat_user_tables s ON (s.relname = t.table_name AND s.schemaname = t.table_schema)
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND t.table_name NOT LIKE 'pg_%'
          AND t.table_name NOT LIKE 'sql_%'
        ORDER BY t.table_name
      `;
      
      const result = await db.execute(query);
      
      console.log(`✅ تم تحليل ${result.rows?.length || 0} جدول بنجاح`);
      
      return result.rows.map((row: any) => ({
        table_name: row.table_name,
        schema_name: row.schema_name,
        row_count: parseInt(row.row_count) || 0,
        rls_enabled: Boolean(row.rls_enabled),
        rls_forced: Boolean(row.rls_forced),
        has_policies: Boolean(row.has_policies),
        security_level: row.security_level || 'low',
        recommended_action: row.recommended_action || '',
        size_estimate: row.size_estimate || '0 bytes',
        last_analyzed: row.last_analyzed || new Date().toISOString()
      }));
      
    } catch (error) {
      console.error('❌ خطأ في تحليل جداول قاعدة البيانات:', error);
      
      // في حالة فشل الاستعلام المتقدم، نعيد البيانات الأساسية
      const basicQuery = sql`
        SELECT 
          table_name,
          table_schema as schema_name
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      
      const basicResult = await db.execute(basicQuery);
      
      return (basicResult.rows || []).map((row: any) => ({
        table_name: row.table_name,
        schema_name: row.schema_name || 'public',
        row_count: 0,
        rls_enabled: false,
        rls_forced: false,
        has_policies: false,
        security_level: 'medium' as const,
        recommended_action: 'فحص تفصيلي مطلوب',
        size_estimate: 'غير معروف',
        last_analyzed: new Date().toISOString()
      }));
    }
  }

  async toggleTableRLS(tableName: string, enable: boolean) {
    try {
      console.log(`🔧 ${enable ? 'تفعيل' : 'تعطيل'} RLS للجدول: ${tableName}`);
      
      // التحقق من وجود الجدول أولاً
      const tableCheck = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = ${tableName} 
          AND table_schema = 'public'
      `);
      
      if (tableCheck.rows.length === 0) {
        throw new Error(`الجدول ${tableName} غير موجود`);
      }
      
      // تنفيذ عملية تفعيل/تعطيل RLS
      const operation = enable ? 'ENABLE' : 'DISABLE';
      await db.execute(sql.raw(`ALTER TABLE ${tableName} ${operation} ROW LEVEL SECURITY`));
      
      console.log(`✅ تم ${enable ? 'تفعيل' : 'تعطيل'} RLS للجدول ${tableName} بنجاح`);
      
      return {
        table_name: tableName,
        rls_enabled: enable,
        updated_at: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ خطأ في ${enable ? 'تفعيل' : 'تعطيل'} RLS للجدول ${tableName}:`, error);
      throw error;
    }
  }

  async getTablePolicies(tableName: string) {
    try {
      console.log(`🔍 جلب سياسات RLS للجدول: ${tableName}`);
      
      const query = sql`
        SELECT 
          policyname as policy_name,
          cmd as command,
          permissive,
          roles,
          qual as expression,
          with_check
        FROM pg_policies 
        WHERE tablename = ${tableName}
          AND schemaname = 'public'
        ORDER BY policyname
      `;
      
      const result = await db.execute(query);
      
      console.log(`✅ تم جلب ${result.rows?.length || 0} سياسة للجدول ${tableName}`);
      
      return (result.rows || []).map((row: any) => ({
        policy_name: row.policy_name,
        command: row.command,
        permissive: row.permissive,
        roles: row.roles,
        expression: row.expression,
        with_check: row.with_check
      }));
      
    } catch (error) {
      console.error(`❌ خطأ في جلب سياسات الجدول ${tableName}:`, error);
      return [];
    }
  }

}

export const storage = new DatabaseStorage();
