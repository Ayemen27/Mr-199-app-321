import { Pool } from 'pg';

const DDL_AUDIT_SETUP = `
-- إنشاء جدول تتبع عمليات DDL
CREATE TABLE IF NOT EXISTS ddl_audit (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  when_ts TIMESTAMPTZ DEFAULT NOW(),
  command_tag TEXT NOT NULL,
  object_type TEXT,
  object_identity TEXT,
  statement TEXT,
  client_addr INET,
  application_name TEXT,
  database_name TEXT DEFAULT CURRENT_DATABASE(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_ddl_audit_when_ts ON ddl_audit(when_ts);
CREATE INDEX IF NOT EXISTS idx_ddl_audit_command_tag ON ddl_audit(command_tag);
CREATE INDEX IF NOT EXISTS idx_ddl_audit_username ON ddl_audit(username);

-- دالة تسجيل عمليات DDL
CREATE OR REPLACE FUNCTION log_ddl_events() 
RETURNS event_trigger 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  obj RECORD;
  statement_text TEXT;
BEGIN
  -- الحصول على نص الاستعلام الحالي
  statement_text := current_query();
  
  -- تسجيل معلومات عن كل كائن تم تعديله
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    INSERT INTO ddl_audit (
      username,
      command_tag,
      object_type,
      object_identity,
      statement,
      client_addr,
      application_name
    ) VALUES (
      session_user,
      tg_tag,
      obj.object_type,
      obj.object_identity,
      statement_text,
      inet_client_addr(),
      current_setting('application_name', true)
    );
  END LOOP;
  
  -- تسجيل خاص للعمليات الحساسة
  IF tg_tag IN ('DROP TABLE', 'DROP SCHEMA', 'DROP DATABASE', 'ALTER TABLE') THEN
    RAISE NOTICE 'DDL Alert: % executed by % at %', tg_tag, session_user, now();
  END IF;
END;
$$;

-- دالة تسجيل عمليات الحذف
CREATE OR REPLACE FUNCTION log_ddl_drops() 
RETURNS event_trigger 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  obj RECORD;
  statement_text TEXT;
BEGIN
  statement_text := current_query();
  
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    INSERT INTO ddl_audit (
      username,
      command_tag,
      object_type,
      object_identity,
      statement,
      client_addr,
      application_name
    ) VALUES (
      session_user,
      tg_tag,
      obj.object_type,
      obj.object_identity,
      statement_text,
      inet_client_addr(),
      current_setting('application_name', true)
    );
  END LOOP;
  
  -- تحذير خاص لعمليات الحذف الحساسة
  RAISE WARNING 'DDL Drop Alert: % objects dropped by % at %', 
    (SELECT COUNT(*) FROM pg_event_trigger_dropped_objects()), 
    session_user, 
    now();
END;
$$;

-- إنشاء Event Triggers
DROP EVENT TRIGGER IF EXISTS ddl_audit_trigger;
CREATE EVENT TRIGGER ddl_audit_trigger
  ON ddl_command_end
  EXECUTE FUNCTION log_ddl_events();

DROP EVENT TRIGGER IF EXISTS ddl_audit_drop_trigger;
CREATE EVENT TRIGGER ddl_audit_drop_trigger
  ON sql_drop
  EXECUTE FUNCTION log_ddl_drops();

-- عرض لعرض آخر العمليات بشكل مفصل
CREATE OR REPLACE VIEW recent_ddl_activities AS
SELECT 
  id,
  username,
  when_ts,
  command_tag,
  object_type,
  object_identity,
  SUBSTRING(statement, 1, 100) || 
    CASE WHEN LENGTH(statement) > 100 THEN '...' ELSE '' END AS statement_preview,
  client_addr,
  application_name,
  database_name
FROM ddl_audit
ORDER BY when_ts DESC
LIMIT 50;

-- دالة لتنظيف السجلات القديمة
CREATE OR REPLACE FUNCTION cleanup_old_ddl_audit(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ddl_audit 
  WHERE when_ts < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % old DDL audit records older than % days', 
    deleted_count, days_to_keep;
  
  RETURN deleted_count;
END;
$$;

-- تعليق على الجداول والدوال
COMMENT ON TABLE ddl_audit IS 'جدول تتبع جميع عمليات DDL في قاعدة البيانات';
COMMENT ON FUNCTION log_ddl_events() IS 'دالة تسجيل عمليات DDL العامة';
COMMENT ON FUNCTION log_ddl_drops() IS 'دالة تسجيل عمليات الحذف';
COMMENT ON FUNCTION cleanup_old_ddl_audit(INTEGER) IS 'دالة تنظيف سجلات DDL القديمة';
COMMENT ON VIEW recent_ddl_activities IS 'عرض آخر 50 عملية DDL';
`;

const VERIFICATION_QUERIES = `
-- التحقق من وجود الجدول والفهارس
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'ddl_audit';

-- التحقق من وجود Event Triggers
SELECT 
  evtname as trigger_name,
  evtevent as event_type,
  evtfoid::regproc as function_name,
  evtenabled as enabled
FROM pg_event_trigger 
WHERE evtname LIKE '%ddl_audit%';

-- التحقق من وجود الدوال
SELECT 
  proname as function_name,
  prosecdef as security_definer,
  prolang::regprocedure as language
FROM pg_proc 
WHERE proname IN ('log_ddl_events', 'log_ddl_drops', 'cleanup_old_ddl_audit');

-- عرض آخر الأنشطة (للاختبار)
SELECT COUNT(*) as total_ddl_records FROM ddl_audit;
`;

async function setupDDLAudit(connectionString?: string): Promise<void> {
  const DATABASE_URL = connectionString || process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('متغير البيئة DATABASE_URL مطلوب');
  }

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('🔧 بدء إعداد نظام مراقبة DDL...');
    
    // تنفيذ إعداد DDL Audit
    console.log('📋 إنشاء جدول التتبع والدوال...');
    await pool.query(DDL_AUDIT_SETUP);
    
    console.log('✅ تم إنشاء نظام مراقبة DDL بنجاح');
    
    // التحقق من الإعداد
    console.log('🔍 التحقق من صحة الإعداد...');
    const verificationResult = await pool.query(VERIFICATION_QUERIES);
    
    console.log('\n📊 تفاصيل الإعداد:');
    
    // عرض الفهارس
    const indexQuery = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'ddl_audit'
    `);
    
    console.log(`📁 الفهارس المُنشأة (${indexQuery.rows.length}):`);
    indexQuery.rows.forEach(row => {
      console.log(`   - ${row.indexname}`);
    });
    
    // عرض Event Triggers
    const triggerQuery = await pool.query(`
      SELECT evtname, evtevent, evtfoid::regproc as function_name
      FROM pg_event_trigger 
      WHERE evtname LIKE '%ddl_audit%'
    `);
    
    console.log(`\n🎯 Event Triggers المُنشأة (${triggerQuery.rows.length}):`);
    triggerQuery.rows.forEach(row => {
      console.log(`   - ${row.evtname}: ${row.evtevent} → ${row.function_name}`);
    });
    
    // عرض الدوال
    const functionQuery = await pool.query(`
      SELECT proname, prolang::regprocedure as language
      FROM pg_proc 
      WHERE proname IN ('log_ddl_events', 'log_ddl_drops', 'cleanup_old_ddl_audit')
    `);
    
    console.log(`\n⚙️ الدوال المُنشأة (${functionQuery.rows.length}):`);
    functionQuery.rows.forEach(row => {
      console.log(`   - ${row.proname} (${row.language})`);
    });
    
    // عدد السجلات
    const countQuery = await pool.query('SELECT COUNT(*) as total FROM ddl_audit');
    console.log(`\n📈 سجلات DDL الحالية: ${countQuery.rows[0].total}`);
    
    console.log('\n🎉 تم إعداد نظام مراقبة DDL بنجاح!');
    console.log('\n📋 كيفية الاستخدام:');
    console.log('   - عرض آخر الأنشطة: SELECT * FROM recent_ddl_activities;');
    console.log('   - تنظيف السجلات القديمة: SELECT cleanup_old_ddl_audit(30);');
    console.log('   - مراقبة عمليات معينة: SELECT * FROM ddl_audit WHERE command_tag = \'CREATE TABLE\';');
    
  } catch (error) {
    console.error('❌ خطأ في إعداد نظام مراقبة DDL:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function testDDLAudit(connectionString?: string): Promise<void> {
  const DATABASE_URL = connectionString || process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('متغير البيئة DATABASE_URL مطلوب');
  }

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('🧪 اختبار نظام مراقبة DDL...');
    
    // إنشاء جدول تجريبي
    const testTableName = `test_ddl_audit_${Date.now()}`;
    console.log(`📋 إنشاء جدول تجريبي: ${testTableName}`);
    
    await pool.query(`
      CREATE TABLE ${testTableName} (
        id SERIAL PRIMARY KEY,
        test_data TEXT
      )
    `);
    
    // إضافة عمود
    console.log('➕ إضافة عمود تجريبي...');
    await pool.query(`ALTER TABLE ${testTableName} ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW()`);
    
    // حذف الجدول التجريبي
    console.log('🗑️ حذف الجدول التجريبي...');
    await pool.query(`DROP TABLE ${testTableName}`);
    
    // فحص السجلات الجديدة
    const auditQuery = await pool.query(`
      SELECT command_tag, object_identity, when_ts 
      FROM ddl_audit 
      WHERE statement LIKE '%${testTableName}%'
      ORDER BY when_ts DESC
    `);
    
    console.log('\n📊 نتائج الاختبار:');
    console.log(`✅ تم تسجيل ${auditQuery.rows.length} عملية DDL`);
    
    auditQuery.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.command_tag}: ${row.object_identity || 'N/A'} في ${row.when_ts}`);
    });
    
    if (auditQuery.rows.length >= 3) {
      console.log('\n🎉 نظام مراقبة DDL يعمل بشكل صحيح!');
    } else {
      console.log('\n⚠️ قد تكون هناك مشكلة في تسجيل بعض العمليات');
    }
    
  } catch (error) {
    console.error('❌ خطأ في اختبار نظام مراقبة DDL:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// واجهة سطر الأوامر
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const databaseUrl = args[1];

  try {
    switch (command) {
      case 'setup':
        await setupDDLAudit(databaseUrl);
        break;
        
      case 'test':
        await testDDLAudit(databaseUrl);
        break;
        
      default:
        console.log('🔧 استخدام سكربت مراقبة DDL:');
        console.log('');
        console.log('إعداد نظام المراقبة:');
        console.log('  npm run ddl:setup [DATABASE_URL]');
        console.log('');
        console.log('اختبار نظام المراقبة:');
        console.log('  npm run ddl:test [DATABASE_URL]');
        console.log('');
        console.log('ملاحظة: إذا لم تحدد DATABASE_URL، سيتم استخدام متغير البيئة');
        break;
    }
  } catch (error) {
    console.error('❌ خطأ:', error);
    process.exit(1);
  }
}

// تشغيل إذا تم استدعاؤه مباشرة
if (require.main === module) {
  main();
}

export { setupDDLAudit, testDDLAudit };