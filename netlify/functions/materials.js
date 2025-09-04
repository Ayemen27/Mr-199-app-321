/**
 * Netlify Function للمواد - متوافق مع Netlify Runtime
 */

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Import dynamically to avoid bundling issues
    const { createClient } = await import('@supabase/supabase-js');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'إعدادات قاعدة البيانات غير موجودة'
        }),
      };
    }

    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (event.httpMethod === 'GET') {
      console.log('📦 طلب قائمة المواد');
      
      const { data: materials, error } = await supabaseClient
        .from('materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('خطأ في جلب المواد:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'فشل في جلب المواد',
            error: error.message
          }),
        };
      }

      console.log(`✅ تم جلب ${materials?.length || 0} مادة`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: materials || [],
          count: materials?.length || 0
        }),
      };
    }

    if (event.httpMethod === 'POST') {
      console.log('➕ إنشاء مادة جديدة');
      
      const { name, category, unit } = JSON.parse(event.body || '{}');
      
      if (!name || !category || !unit) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'اسم المادة والفئة والوحدة مطلوبة'
          }),
        };
      }

      const { data: newMaterial, error } = await supabaseClient
        .from('materials')
        .insert([{
          name,
          category,
          unit,
        }])
        .select()
        .single();

      if (error) {
        console.error('خطأ في إنشاء المادة:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'فشل في إنشاء المادة',
            error: error.message
          }),
        };
      }

      console.log('✅ تم إنشاء المادة:', newMaterial.id);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          data: newMaterial,
          message: 'تم إنشاء المادة بنجاح'
        }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'الطريقة غير مدعومة'
      }),
    };

  } catch (error) {
    console.error('خطأ في معالج المواد:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'خطأ داخلي في الخادم',
        error: error.message
      }),
    };
  }
};