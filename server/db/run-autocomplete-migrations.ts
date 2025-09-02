import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * تشغيل هجرة فهارس الإكمال التلقائي
 * Run autocomplete system indexes migration
 */

export async function runAutocompleteIndexMigration(): Promise<void> {
  try {
    console.log('🔄 بدء تشغيل هجرة فهارس الإكمال التلقائي...');

    // إضافة فهرس مركب لتحسين البحث والترتيب حسب الفئة وعدد الاستخدام
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_autocomplete_category_usage 
      ON autocomplete_data (category, usage_count DESC, last_used DESC)
    `);

    // فهرس للبحث النصي في القيم حسب الفئة
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_autocomplete_value_search 
      ON autocomplete_data (category, value)
    `);

    // فهرس لتنظيف البيانات القديمة
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_autocomplete_cleanup 
      ON autocomplete_data (last_used, usage_count)
    `);

    // فهرس لتحسين عمليات التحديث والحذف
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_autocomplete_category_value 
      ON autocomplete_data (category, value)
    `);

    // فهرس لتحسين إحصائيات النظام
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_autocomplete_stats 
      ON autocomplete_data (created_at, category)
    `);

    // محاولة إضافة قيد فريد لمنع التكرار (مع معالجة أفضل للأخطاء)
    try {
      // أولاً: التحقق من وجود القيد
      const constraintCheck = await db.execute(sql`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'autocomplete_data' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name = 'uk_autocomplete_category_value'
      `);
      
      if (constraintCheck.rowCount === 0) {
        // حذف البيانات المكررة أولاً
        await db.execute(sql`
          DELETE FROM autocomplete_data 
          WHERE id NOT IN (
            SELECT MIN(id) 
            FROM autocomplete_data 
            GROUP BY category, value
          )
        `);
        
        // ثم إضافة القيد الفريد
        await db.execute(sql`
          ALTER TABLE autocomplete_data 
          ADD CONSTRAINT uk_autocomplete_category_value 
          UNIQUE (category, value)
        `);
        console.log('✅ تم إضافة القيد الفريد بنجاح بعد حذف البيانات المكررة');
      } else {
        console.log('✅ القيد الفريد موجود مسبقاً');
      }
    } catch (error: any) {
      console.log('⚠️ تم تخطي إضافة القيد الفريد:', error.message?.slice(0, 100));
    }

    // إضافة تعليقات للجدول والأعمدة
    await db.execute(sql`
      COMMENT ON TABLE autocomplete_data IS 'جدول بيانات الإكمال التلقائي - يحفظ اقتراحات المستخدم لتحسين تجربة الإدخال'
    `);

    await db.execute(sql`
      COMMENT ON COLUMN autocomplete_data.category IS 'فئة البيانات مثل أسماء المرسلين، أرقام الهواتف، إلخ'
    `);

    await db.execute(sql`
      COMMENT ON COLUMN autocomplete_data.value IS 'القيمة المقترحة للإكمال التلقائي'
    `);

    await db.execute(sql`
      COMMENT ON COLUMN autocomplete_data.usage_count IS 'عدد مرات استخدام هذه القيمة - يحدد أولوية الظهور'
    `);

    await db.execute(sql`
      COMMENT ON COLUMN autocomplete_data.last_used IS 'تاريخ آخر استخدام لهذه القيمة'
    `);

    await db.execute(sql`
      COMMENT ON COLUMN autocomplete_data.created_at IS 'تاريخ إنشاء السجل في النظام'
    `);

    console.log('✅ اكتملت هجرة فهارس الإكمال التلقائي بنجاح');
  } catch (error) {
    console.error('❌ فشل في تشغيل هجرة فهارس الإكمال التلقائي:', error);
    throw error;
  }
}

// ملاحظة: تم إزالة process.exit() لمنع إنهاء التطبيق عند الاستيراد
// إذا كنت تريد تشغيل الهجرة مباشرة، استخدم:
// npm run migration:autocomplete أو tsx server/db/run-autocomplete-migrations.ts