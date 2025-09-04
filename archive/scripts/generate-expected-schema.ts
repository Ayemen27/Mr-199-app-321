import { Project, SyntaxKind, Node } from 'ts-morph';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

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

function extractTypeFromDefinition(definition: string): {
  type_hint?: string;
  is_nullable?: boolean;
  has_default?: boolean;
} {
  const result: any = {};
  
  // استخراج نوع البيانات الأساسي
  if (definition.includes('varchar(')) {
    result.type_hint = 'varchar';
  } else if (definition.includes('text(')) {
    result.type_hint = 'text';
  } else if (definition.includes('integer(') || definition.includes('int(')) {
    result.type_hint = 'integer';
  } else if (definition.includes('serial(')) {
    result.type_hint = 'serial';
  } else if (definition.includes('boolean(')) {
    result.type_hint = 'boolean';
  } else if (definition.includes('timestamp(')) {
    result.type_hint = 'timestamp';
  } else if (definition.includes('decimal(')) {
    result.type_hint = 'decimal';
  } else if (definition.includes('jsonb(')) {
    result.type_hint = 'jsonb';
  } else if (definition.includes('json(')) {
    result.type_hint = 'json';
  }
  
  // فحص القيود
  result.is_nullable = !definition.includes('.notNull()');
  result.has_default = definition.includes('.default(') || definition.includes('.defaultNow()');
  
  return result;
}

function analyzePgTableCall(node: Node): ExpectedTable | null {
  if (!Node.isCallExpression(node)) return null;
  
  const expression = node.getExpression();
  if (!Node.isIdentifier(expression) || expression.getText() !== 'pgTable') return null;
  
  const args = node.getArguments();
  if (args.length < 2) return null;
  
  // الحصول على اسم الجدول
  const tableNameArg = args[0];
  if (!Node.isStringLiteral(tableNameArg)) return null;
  
  const tableName = tableNameArg.getLiteralValue();
  
  // الحصول على تعريفات الأعمدة
  const columnsArg = args[1];
  if (!Node.isObjectLiteralExpression(columnsArg)) {
    return {
      name: tableName,
      columns: {},
      source_file: node.getSourceFile().getFilePath(),
      is_parsed: false,
      notes: ['columns_not_object_literal']
    };
  }
  
  const columns: Record<string, ExpectedColumn> = {};
  
  for (const property of columnsArg.getProperties()) {
    if (!Node.isPropertyAssignment(property)) continue;
    
    const nameNode = property.getName();
    if (!nameNode) continue;
    
    const columnName = nameNode.replace(/['"]/g, '');
    const initializer = property.getInitializer();
    if (!initializer) continue;
    
    const rawDefinition = initializer.getText();
    const typeInfo = extractTypeFromDefinition(rawDefinition);
    
    columns[columnName] = {
      name: columnName,
      raw_definition: rawDefinition,
      ...typeInfo
    };
  }
  
  return {
    name: tableName,
    columns,
    source_file: node.getSourceFile().getFilePath(),
    is_parsed: true
  };
}

function generateExpectedSchema(): ExpectedSchema {
  console.log('🔍 بدء استخراج المخطط المتوقع من ملفات TypeScript...');
  
  const project = new Project({
    tsConfigFilePath: resolve(process.cwd(), '..', 'tsconfig.json'),
  });
  
  // إضافة الملفات المطلوبة
  const sourceFiles = [
    resolve(process.cwd(), '..', 'shared/schema.ts')
  ];
  
  const actualFiles: string[] = [];
  for (const filePath of sourceFiles) {
    try {
      project.addSourceFileAtPath(filePath);
      actualFiles.push(filePath);
      console.log(`✅ تم تحميل: ${filePath}`);
    } catch (error) {
      console.log(`⚠️  لم يتم العثور على: ${filePath}`);
    }
  }
  
  const tables: Record<string, ExpectedTable> = {};
  let totalColumns = 0;
  let parsingIssues = 0;
  
  // تحليل جميع الملفات
  for (const sourceFile of project.getSourceFiles()) {
    console.log(`🔎 تحليل ملف: ${sourceFile.getBaseName()}`);
    
    // البحث عن استدعاءات pgTable
    sourceFile.forEachDescendant((node) => {
      const table = analyzePgTableCall(node);
      if (table) {
        console.log(`📋 وجد جدول: ${table.name} (${Object.keys(table.columns).length} أعمدة)`);
        tables[table.name] = table;
        totalColumns += Object.keys(table.columns).length;
        
        if (!table.is_parsed) {
          parsingIssues++;
        }
      }
    });
  }
  
  const schema: ExpectedSchema = {
    generated_at: new Date().toISOString(),
    source_files: actualFiles,
    tables,
    summary: {
      total_tables: Object.keys(tables).length,
      total_columns: totalColumns,
      parsing_issues: parsingIssues
    }
  };
  
  return schema;
}

function main() {
  try {
    const schema = generateExpectedSchema();
    
    // كتابة النتيجة إلى ملف JSON
    const outputPath = resolve(process.cwd(), 'expected_schema.json');
    writeFileSync(outputPath, JSON.stringify(schema, null, 2), 'utf-8');
    
    console.log('\n📊 ملخص الاستخراج:');
    console.log(`   📋 إجمالي الجداول: ${schema.summary.total_tables}`);
    console.log(`   📝 إجمالي الأعمدة: ${schema.summary.total_columns}`);
    console.log(`   ⚠️  مشاكل التحليل: ${schema.summary.parsing_issues}`);
    console.log(`   📁 ملف الإخراج: ${outputPath}`);
    
    if (schema.summary.parsing_issues > 0) {
      console.log('\n⚠️  توجد مشاكل في التحليل:');
      Object.values(schema.tables).forEach(table => {
        if (!table.is_parsed && table.notes) {
          console.log(`   - ${table.name}: ${table.notes.join(', ')}`);
        }
      });
    }
    
    console.log('\n✅ تم إنشاء ملف المخطط المتوقع بنجاح');
    
  } catch (error) {
    console.error('❌ خطأ في إنشاء المخطط المتوقع:', error);
    process.exit(1);
  }
}

// تشغيل الدالة الرئيسية
main();