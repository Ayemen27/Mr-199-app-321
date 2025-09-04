import { Pool } from '@neondatabase/serverless';
import ws from "ws";
import { neonConfig } from '@neondatabase/serverless';

// Configure WebSocket for Neon/Supabase connection
neonConfig.webSocketConstructor = ws;

const SUPABASE_DATABASE_URL = "postgresql://postgres.wibtasmyusxfqxxqekks:Ay**--772283228@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

// النظام الحالي للجداول حسب المخطط المحدث (بدون Tools)
const SCHEMA_TABLES = [
  // جداول المستخدمين
  'users',
  
  // جداول المشاريع
  'projects',
  
  // جداول العمال
  'workers', 'worker_types', 'worker_attendance', 'worker_transfers', 'worker_balances', 'worker_misc_expenses',
  
  // جداول المواد والمواد الخام
  'materials', 'material_purchases',
  
  // جداول المعدات (النظام المبسط)
  'equipment', 'equipment_movements',
  
  // جداول الموردين
  'suppliers', 'supplier_payments',
  
  // جداول المالية
  'fund_transfers', 'project_fund_transfers', 'transportation_expenses', 'daily_expense_summaries',
  
  // جداول الإعدادات
  'autocomplete_data', 'print_settings', 'report_templates',
  
  // نظام الإشعارات
  'notifications', 'notification_templates', 'notification_settings', 'notification_read_states', 'notification_queue', 'channels', 'messages',
  
  // نظام المصادقة المتقدم
  'auth_roles', 'auth_permissions', 'auth_role_permissions', 'auth_user_roles', 'auth_user_permissions', 
  'auth_user_sessions', 'auth_audit_log', 'auth_verification_codes', 'auth_user_security_settings'
];

async function compareTables() {
  const pool = new Pool({ connectionString: SUPABASE_DATABASE_URL });
  
  try {
    console.log('🔍 بدء مقارنة الجداول بين المخطط وقاعدة البيانات السحابية...\n');
    
    // جلب جميع الجداول من قاعدة البيانات
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const dbTables = result.rows.map(row => row.table_name);
    
    console.log(`📊 إحصائيات المقارنة:`);
    console.log(`   الجداول في المخطط: ${SCHEMA_TABLES.length}`);
    console.log(`   الجداول في قاعدة البيانات: ${dbTables.length}\n`);
    
    // الجداول الموجودة في المخطط لكن غير موجودة في قاعدة البيانات
    const missingInDb = SCHEMA_TABLES.filter(table => !dbTables.includes(table));
    if (missingInDb.length > 0) {
      console.log('❌ جداول مفقودة في قاعدة البيانات:');
      missingInDb.forEach(table => console.log(`   - ${table}`));
      console.log();
    }
    
    // الجداول الموجودة في قاعدة البيانات لكن غير موجودة في المخطط
    const extraInDb = dbTables.filter(table => !SCHEMA_TABLES.includes(table));
    if (extraInDb.length > 0) {
      console.log('➕ جداول إضافية في قاعدة البيانات (غير موجودة في المخطط):');
      extraInDb.forEach(table => console.log(`   - ${table}`));
      console.log();
    }
    
    // الجداول المطابقة
    const matchingTables = SCHEMA_TABLES.filter(table => dbTables.includes(table));
    console.log(`✅ جداول متطابقة (${matchingTables.length}/${SCHEMA_TABLES.length}):`);
    matchingTables.forEach(table => console.log(`   ✓ ${table}`));
    console.log();
    
    // ملخص التحليل
    const matchPercentage = Math.round((matchingTables.length / SCHEMA_TABLES.length) * 100);
    console.log('📈 ملخص التحليل:');
    console.log(`   نسبة التطابق: ${matchPercentage}%`);
    console.log(`   الجداول المفقودة: ${missingInDb.length}`);
    console.log(`   الجداول الإضافية: ${extraInDb.length}`);
    
    if (missingInDb.length === 0 && extraInDb.length === 0) {
      console.log('\n🎉 مثالي! المخطط وقاعدة البيانات متطابقان تماماً');
    } else if (extraInDb.length > 0 && missingInDb.length === 0) {
      console.log('\n⚠️  توجد جداول إضافية في قاعدة البيانات - قد تحتاج إلى تحديث المخطط');
    } else {
      console.log('\n🔧 يحتاج إلى تحديث قاعدة البيانات أو المخطط');
    }
    
  } catch (error) {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error);
  } finally {
    await pool.end();
  }
}

// تشغيل المقارنة
compareTables().catch(console.error);

export { compareTables };