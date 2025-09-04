import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const execAsync = promisify(exec);

interface BackupOptions {
  type: 'schema' | 'full' | 'data';
  format: 'sql' | 'custom' | 'tar';
  compress?: boolean;
}

function generateBackupFilename(type: string, format: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const extension = format === 'custom' ? 'dump' : format === 'tar' ? 'tar' : 'sql';
  return `backup_${type}_${timestamp}.${extension}`;
}

function getDatabaseCredentials(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: url.port || '5432',
    database: url.pathname.slice(1),
    username: url.username,
    password: url.password
  };
}

async function createBackup(options: BackupOptions = { type: 'full', format: 'custom' }): Promise<string> {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('متغير البيئة DATABASE_URL مطلوب');
  }

  console.log('🚀 بدء إنشاء النسخة الاحتياطية...');
  
  // إنشاء مجلد النسخ الاحتياطية
  const backupDir = resolve(process.cwd(), 'backups');
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  const credentials = getDatabaseCredentials(DATABASE_URL);
  const filename = generateBackupFilename(options.type, options.format);
  const filepath = resolve(backupDir, filename);

  // بناء أوامر pg_dump حسب النوع
  let command = `PGPASSWORD="${credentials.password}" pg_dump`;
  command += ` -h ${credentials.host}`;
  command += ` -p ${credentials.port}`;
  command += ` -U ${credentials.username}`;
  command += ` -d ${credentials.database}`;
  
  // خيارات النسخ الاحتياطي
  switch (options.type) {
    case 'schema':
      command += ' --schema-only';
      break;
    case 'data':
      command += ' --data-only';
      break;
    case 'full':
      // النسخة الكاملة (افتراضية)
      break;
  }

  // تنسيق الإخراج
  switch (options.format) {
    case 'custom':
      command += ` --format=custom --file="${filepath}"`;
      break;
    case 'tar':
      command += ` --format=tar --file="${filepath}"`;
      break;
    case 'sql':
      command += ` --format=plain --file="${filepath}"`;
      break;
  }

  // ضغط إضافي إذا مطلوب
  if (options.compress && options.format !== 'custom') {
    command += ' --compress=9';
  }

  try {
    console.log(`📋 نوع النسخة: ${options.type}`);
    console.log(`📁 تنسيق الملف: ${options.format}`);
    console.log(`💾 مسار الحفظ: ${filepath}`);
    console.log('⏳ جاري إنشاء النسخة الاحتياطية...');

    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('NOTICE')) {
      console.warn('⚠️ تحذيرات:', stderr);
    }

    console.log('✅ تم إنشاء النسخة الاحتياطية بنجاح');
    console.log(`📁 الملف: ${filename}`);
    
    return filepath;

  } catch (error: any) {
    console.error('❌ خطأ في إنشاء النسخة الاحتياطية:', error.message);
    throw error;
  }
}

async function restoreBackup(backupPath: string, targetDatabaseUrl?: string): Promise<void> {
  const DATABASE_URL = targetDatabaseUrl || process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('متغير البيئة DATABASE_URL أو targetDatabaseUrl مطلوب');
  }

  console.log('🔄 بدء استعادة النسخة الاحتياطية...');
  
  const credentials = getDatabaseCredentials(DATABASE_URL);
  
  // تحديد نوع الملف
  const isCustomFormat = backupPath.endsWith('.dump') || backupPath.endsWith('.tar');
  
  let command: string;
  
  if (isCustomFormat) {
    // استخدام pg_restore للملفات المضغوطة
    command = `PGPASSWORD="${credentials.password}" pg_restore`;
    command += ` -h ${credentials.host}`;
    command += ` -p ${credentials.port}`;
    command += ` -U ${credentials.username}`;
    command += ` -d ${credentials.database}`;
    command += ` --clean --if-exists --no-owner --no-privileges`;
    command += ` "${backupPath}"`;
  } else {
    // استخدام psql لملفات SQL
    command = `PGPASSWORD="${credentials.password}" psql`;
    command += ` -h ${credentials.host}`;
    command += ` -p ${credentials.port}`;
    command += ` -U ${credentials.username}`;
    command += ` -d ${credentials.database}`;
    command += ` -f "${backupPath}"`;
  }

  try {
    console.log(`📁 ملف النسخة: ${backupPath}`);
    console.log('⏳ جاري استعادة البيانات...');

    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('NOTICE')) {
      console.warn('⚠️ تحذيرات الاستعادة:', stderr);
    }

    console.log('✅ تم استعادة النسخة الاحتياطية بنجاح');

  } catch (error: any) {
    console.error('❌ خطأ في استعادة النسخة الاحتياطية:', error.message);
    throw error;
  }
}

async function listBackups(): Promise<void> {
  const backupDir = resolve(process.cwd(), 'backups');
  
  if (!existsSync(backupDir)) {
    console.log('📂 لا توجد نسخ احتياطية');
    return;
  }

  try {
    const { stdout } = await execAsync(`ls -la "${backupDir}"`);
    console.log('📂 النسخ الاحتياطية المتوفرة:');
    console.log(stdout);
  } catch (error) {
    console.error('❌ خطأ في عرض النسخ الاحتياطية:', error);
  }
}

// واجهة سطر الأوامر
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'create':
        const type = (args[1] as 'schema' | 'full' | 'data') || 'full';
        const format = (args[2] as 'sql' | 'custom' | 'tar') || 'custom';
        await createBackup({ type, format });
        break;

      case 'restore':
        const backupPath = args[1];
        if (!backupPath) {
          throw new Error('مسار ملف النسخة الاحتياطية مطلوب');
        }
        const targetDb = args[2];
        await restoreBackup(backupPath, targetDb);
        break;

      case 'list':
        await listBackups();
        break;

      default:
        console.log('🔧 استخدام سكربت النسخ الاحتياطي:');
        console.log('');
        console.log('إنشاء نسخة احتياطية:');
        console.log('  npm run backup:create [نوع] [تنسيق]');
        console.log('  الأنواع: schema, data, full (افتراضي: full)');
        console.log('  التنسيقات: sql, custom, tar (افتراضي: custom)');
        console.log('');
        console.log('استعادة نسخة احتياطية:');
        console.log('  npm run backup:restore <مسار الملف> [DATABASE_URL]');
        console.log('');
        console.log('عرض النسخ الاحتياطية:');
        console.log('  npm run backup:list');
        console.log('');
        console.log('أمثلة:');
        console.log('  npm run backup:create schema sql');
        console.log('  npm run backup:restore backups/backup_full_2025-08-29.dump');
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

export { createBackup, restoreBackup, listBackups };