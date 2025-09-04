import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface DatabaseColumn {
  column_name: string;
  data_type: string;
  is_nullable: string; // 'YES' or 'NO'
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
}

interface ExpectedColumn {
  name: string;
  type_hint?: string;
  is_nullable?: boolean;
  has_default?: boolean;
  raw_definition: string;
}

interface ExpectedTable {
  name: string;
  columns: Record<string, ExpectedColumn>;
  source_file: string;
  is_parsed: boolean;
  notes?: string[];
}

interface ExpectedSchema {
  generated_at: string;
  source_files: string[];
  tables: Record<string, ExpectedTable>;
  summary: {
    total_tables: number;
    total_columns: number;
    parsing_issues: number;
  };
}

interface SchemaMismatch {
  table: string;
  column: string;
  issue: 'missing_column' | 'extra_column' | 'type_mismatch' | 'nullability_mismatch';
  expected?: string;
  actual?: string;
  description: string;
}

interface ComparisonResult {
  status: 'success' | 'drift_detected';
  compared_at: string;
  database_url_host: string;
  missing_tables: string[];
  extra_tables: string[];
  mismatches: SchemaMismatch[];
  summary: {
    total_expected_tables: number;
    total_actual_tables: number;
    matching_tables: number;
    total_mismatches: number;
  };
}

function normalizePostgresType(pgType: string): string {
  // تطبيع أنواع PostgreSQL للمقارنة
  const typeMapping: Record<string, string> = {
    'character varying': 'varchar',
    'character': 'char',
    'timestamp without time zone': 'timestamp',
    'timestamp with time zone': 'timestamptz',
    'double precision': 'float8',
    'bigint': 'int8',
    'smallint': 'int2',
    'boolean': 'bool'
  };
  
  return typeMapping[pgType.toLowerCase()] || pgType.toLowerCase();
}

function isTypeCompatible(expectedType: string | undefined, actualType: string): boolean {
  if (!expectedType) return true; // لا يمكن التحقق
  
  const normalizedExpected = expectedType.toLowerCase();
  const normalizedActual = normalizePostgresType(actualType);
  
  // مجموعات متوافقة
  const compatibleGroups = [
    ['text', 'varchar', 'character varying'],
    ['integer', 'int', 'int4', 'serial'],
    ['bigint', 'int8', 'bigserial'],
    ['timestamp', 'timestamp without time zone'],
    ['timestamptz', 'timestamp with time zone'],
    ['boolean', 'bool'],
    ['decimal', 'numeric'],
    ['json', 'jsonb'] // متساهل قليلاً
  ];
  
  // فحص التطابق المباشر
  if (normalizedExpected === normalizedActual) return true;
  
  // فحص المجموعات المتوافقة
  for (const group of compatibleGroups) {
    if (group.includes(normalizedExpected) && group.includes(normalizedActual)) {
      return true;
    }
  }
  
  return false;
}

async function getDatabaseSchema(): Promise<Record<string, Record<string, DatabaseColumn>>> {
  console.log('🔗 الاتصال بقاعدة البيانات باستخدام Neon Serverless (نفس طريقة التطبيق الرئيسي)...');
  
  // استخدام نفس التكوين المضمون من التطبيق الرئيسي
  neonConfig.webSocketConstructor = ws;
  const SUPABASE_DATABASE_URL = "postgresql://postgres.wibtasmyusxfqxxqekks:Ay**--772283228@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
  const pool = new Pool({ connectionString: SUPABASE_DATABASE_URL });
  
  try {
    const query = `
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;
    
    const result = await pool.query(query);
    const schema: Record<string, Record<string, DatabaseColumn>> = {};
    
    for (const row of result.rows) {
      const tableName = row.table_name;
      if (!schema[tableName]) {
        schema[tableName] = {};
      }
      schema[tableName][row.column_name] = row as DatabaseColumn;
    }
    
    console.log(`✨ بنجاح! تم استخراج مخطط ${Object.keys(schema).length} جدول من قاعدة البيانات`);
    return schema;
    
  } catch (error) {
    console.error('❌ خطأ في استعلام قاعدة البيانات:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

function loadExpectedSchema(): ExpectedSchema {
  const schemaPath = resolve(process.cwd(), 'expected_schema.json');
  
  if (!existsSync(schemaPath)) {
    throw new Error(`ملف المخطط المتوقع غير موجود: ${schemaPath}. قم بتشغيل generate-expected-schema.ts أولاً`);
  }
  
  console.log('📖 قراءة المخطط المتوقع...');
  const content = readFileSync(schemaPath, 'utf-8');
  return JSON.parse(content) as ExpectedSchema;
}

function compareSchemas(expected: ExpectedSchema, actual: Record<string, Record<string, DatabaseColumn>>): ComparisonResult {
  console.log('🔍 بدء مقارنة المخططات...');
  
  const expectedTableNames = Object.keys(expected.tables);
  const actualTableNames = Object.keys(actual);
  
  // الجداول المفقودة والإضافية
  const missingTables = expectedTableNames.filter(name => !actualTableNames.includes(name));
  const extraTables = actualTableNames.filter(name => !expectedTableNames.includes(name));
  const matchingTables = expectedTableNames.filter(name => actualTableNames.includes(name));
  
  console.log(`📋 جداول متطابقة: ${matchingTables.length}`);
  console.log(`❌ جداول مفقودة: ${missingTables.length}`);
  console.log(`➕ جداول إضافية: ${extraTables.length}`);
  
  const mismatches: SchemaMismatch[] = [];
  
  // مقارنة الأعمدة في الجداول المتطابقة
  for (const tableName of matchingTables) {
    const expectedTable = expected.tables[tableName];
    const actualTable = actual[tableName];
    
    const expectedColumns = Object.keys(expectedTable.columns);
    const actualColumns = Object.keys(actualTable);
    
    // أعمدة مفقودة
    for (const columnName of expectedColumns) {
      if (!actualColumns.includes(columnName)) {
        mismatches.push({
          table: tableName,
          column: columnName,
          issue: 'missing_column',
          expected: expectedTable.columns[columnName].type_hint,
          description: `العمود ${columnName} مفقود في جدول ${tableName}`
        });
      }
    }
    
    // أعمدة إضافية
    for (const columnName of actualColumns) {
      if (!expectedColumns.includes(columnName)) {
        mismatches.push({
          table: tableName,
          column: columnName,
          issue: 'extra_column',
          actual: actualTable[columnName].data_type,
          description: `العمود ${columnName} موجود في قاعدة البيانات لكن غير معرف في الكود`
        });
      }
    }
    
    // مقارنة الأعمدة المشتركة
    for (const columnName of expectedColumns) {
      if (!actualColumns.includes(columnName)) continue;
      
      const expectedColumn = expectedTable.columns[columnName];
      const actualColumn = actualTable[columnName];
      
      // مقارنة نوع البيانات
      if (expectedColumn.type_hint && !isTypeCompatible(expectedColumn.type_hint, actualColumn.data_type)) {
        mismatches.push({
          table: tableName,
          column: columnName,
          issue: 'type_mismatch',
          expected: expectedColumn.type_hint,
          actual: actualColumn.data_type,
          description: `نوع البيانات غير متطابق في ${tableName}.${columnName}`
        });
      }
      
      // مقارنة قابلية NULL
      if (expectedColumn.is_nullable !== undefined) {
        const expectedNullable = expectedColumn.is_nullable;
        const actualNullable = actualColumn.is_nullable === 'YES';
        
        if (expectedNullable !== actualNullable) {
          mismatches.push({
            table: tableName,
            column: columnName,
            issue: 'nullability_mismatch',
            expected: expectedNullable ? 'NULLABLE' : 'NOT NULL',
            actual: actualNullable ? 'NULLABLE' : 'NOT NULL',
            description: `قابلية NULL غير متطابقة في ${tableName}.${columnName}`
          });
        }
      }
    }
  }
  
  const status = (missingTables.length > 0 || extraTables.length > 0 || mismatches.length > 0) 
    ? 'drift_detected' 
    : 'success';
  
  return {
    status,
    compared_at: new Date().toISOString(),
    database_url_host: new URL(process.env.DATABASE_URL || '').hostname,
    missing_tables: missingTables,
    extra_tables: extraTables,
    mismatches,
    summary: {
      total_expected_tables: expectedTableNames.length,
      total_actual_tables: actualTableNames.length,
      matching_tables: matchingTables.length,
      total_mismatches: mismatches.length
    }
  };
}

function printReport(result: ComparisonResult) {
  console.log('\n📋 تقرير مقارنة المخططات');
  console.log('='.repeat(50));
  console.log(`🕒 تاريخ المقارنة: ${result.compared_at}`);
  console.log(`🔗 قاعدة البيانات: ${result.database_url_host}`);
  console.log(`📊 الحالة: ${result.status === 'success' ? '✅ متطابق' : '⚠️ انحراف مكتشف'}`);
  
  console.log('\n📈 الملخص:');
  console.log(`   📋 الجداول المتوقعة: ${result.summary.total_expected_tables}`);
  console.log(`   📋 الجداول الفعلية: ${result.summary.total_actual_tables}`);
  console.log(`   ✅ الجداول المتطابقة: ${result.summary.matching_tables}`);
  console.log(`   ⚠️  إجمالي المشاكل: ${result.summary.total_mismatches}`);
  
  if (result.missing_tables.length > 0) {
    console.log('\n❌ جداول مفقودة في قاعدة البيانات:');
    result.missing_tables.forEach(table => console.log(`   - ${table}`));
  }
  
  if (result.extra_tables.length > 0) {
    console.log('\n➕ جداول إضافية في قاعدة البيانات:');
    result.extra_tables.forEach(table => console.log(`   - ${table}`));
  }
  
  if (result.mismatches.length > 0) {
    console.log('\n🔍 تفاصيل المشاكل:');
    result.mismatches.forEach((mismatch, index) => {
      console.log(`\n   ${index + 1}. ${mismatch.description}`);
      console.log(`      📋 الجدول: ${mismatch.table}`);
      console.log(`      📝 العمود: ${mismatch.column}`);
      console.log(`      🔧 المشكلة: ${mismatch.issue}`);
      if (mismatch.expected) console.log(`      ✅ المتوقع: ${mismatch.expected}`);
      if (mismatch.actual) console.log(`      📊 الفعلي: ${mismatch.actual}`);
    });
  }
}

async function main() {
  try {
    console.log('🚀 بدء مقارنة مخطط قاعدة البيانات...\n');
    
    // تحميل المخطط المتوقع
    const expectedSchema = loadExpectedSchema();
    
    // استخراج المخطط الفعلي باستخدام نفس اتصال التطبيق
    const actualSchema = await getDatabaseSchema();
    
    // إجراء المقارنة
    const result = compareSchemas(expectedSchema, actualSchema);
    
    // طباعة التقرير
    printReport(result);
    
    // حفظ التقرير كـ JSON
    const reportPath = resolve(process.cwd(), 'schema_comparison_report.json');
    writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 تم حفظ التقرير في: ${reportPath}`);
    
    // إنهاء العملية بحالة الخطأ إذا كان هناك انحراف
    if (result.status === 'drift_detected') {
      console.log('\n❌ تم اكتشاف انحراف في المخطط - العملية فاشلة');
      process.exit(1);
    } else {
      console.log('\n✅ المخطط متطابق تماماً - العملية ناجحة');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n❌ خطأ في مقارنة المخطط:', error);
    process.exit(1);
  }
}

// تشغيل الدالة الرئيسية
main();