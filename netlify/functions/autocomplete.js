/**
 * Netlify Function للإكمال التلقائي - متوافق مع Netlify Runtime
 */

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'HEAD') {
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

    if (event.httpMethod === 'POST') {
      console.log('🔍 معالجة طلب الإكمال التلقائي');
      
      const { type, query, limit = 10 } = JSON.parse(event.body || '{}');
      
      if (!type || !query) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'نوع البحث والاستعلام مطلوبان'
          }),
        };
      }

      let results = [];
      let error = null;

      switch (type) {
        case 'workers':
          ({ data: results, error } = await supabaseClient
            .from('workers')
            .select('id, name, type')
            .ilike('name', `%${query}%`)
            .eq('is_active', true)
            .limit(limit));
          break;

        case 'materials':
          ({ data: results, error } = await supabaseClient
            .from('materials')
            .select('id, name, category, unit')
            .ilike('name', `%${query}%`)
            .limit(limit));
          break;

        case 'suppliers':
          ({ data: results, error } = await supabaseClient
            .from('suppliers')
            .select('id, name, contact_person, phone')
            .ilike('name', `%${query}%`)
            .eq('is_active', true)
            .limit(limit));
          break;

        case 'projects':
          ({ data: results, error } = await supabaseClient
            .from('projects')
            .select('id, name, status')
            .ilike('name', `%${query}%`)
            .limit(limit));
          break;

        default:
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'نوع البحث غير مدعوم'
            }),
          };
      }

      if (error) {
        console.error('خطأ في البحث:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'فشل في البحث',
            error: error.message
          }),
        };
      }

      console.log(`🎯 تم العثور على ${results?.length || 0} نتيجة لـ "${query}"`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: results || [],
          count: results?.length || 0,
          type,
          query
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
    console.error('خطأ في معالج الإكمال التلقائي:', error);
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