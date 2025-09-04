const { createClient } = require('@supabase/supabase-js');

// إعداد Supabase
let supabase = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log('✅ تم الاتصال بقاعدة بيانات Supabase');
  } else {
    console.error('❌ متغيرات بيئة Supabase غير موجودة');
  }
} catch (error) {
  console.error('❌ خطأ في الاتصال بقاعدة البيانات:', error);
}

exports.handler = async (event, context) => {
  // إعداد CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Content-Type': 'application/json',
  };

  // معالجة OPTIONS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    console.log('👷 [Netlify] طلب العمال');
    
    if (!supabase) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'قاعدة البيانات غير متصلة'
        }),
      };
    }

    // معالجة طلبات GET
    if (event.httpMethod === 'GET') {
      const { data: workers, error } = await supabase
        .from('workers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('خطأ في جلب العمال:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'فشل في جلب العمال'
          }),
        };
      }

      console.log(`✅ تم جلب ${workers?.length || 0} عامل`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: workers || [],
          count: workers?.length || 0
        }),
      };
    }

    // معالجة طلبات POST (إنشاء عامل جديد)
    if (event.httpMethod === 'POST') {
      const { name, type, dailyWage, isActive } = JSON.parse(event.body);
      
      const { data: newWorker, error } = await supabase
        .from('workers')
        .insert([
          {
            name,
            type,
            daily_wage: dailyWage,
            is_active: isActive !== undefined ? isActive : true,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('خطأ في إنشاء العامل:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'فشل في إنشاء العامل'
          }),
        };
      }

      console.log('✅ تم إنشاء عامل جديد:', newWorker.name);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          data: newWorker,
          message: 'تم إنشاء العامل بنجاح'
        }),
      };
    }

    // طريقة غير مدعومة
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'طريقة غير مدعومة'
      }),
    };

  } catch (error) {
    console.error('❌ خطأ في دالة العمال:', error);
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