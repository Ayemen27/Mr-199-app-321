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
    console.log('📋 [Netlify] طلب المشاريع');
    
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
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('خطأ في جلب المشاريع:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'فشل في جلب المشاريع'
          }),
        };
      }

      console.log(`✅ تم جلب ${projects?.length || 0} مشروع`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: projects || [],
          count: projects?.length || 0
        }),
      };
    }

    // معالجة طلبات POST (إنشاء مشروع جديد)
    if (event.httpMethod === 'POST') {
      const { name, status, imageUrl } = JSON.parse(event.body);
      
      const { data: newProject, error } = await supabase
        .from('projects')
        .insert([
          {
            name,
            status: status || 'active',
            image_url: imageUrl || null,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('خطأ في إنشاء المشروع:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'فشل في إنشاء المشروع'
          }),
        };
      }

      console.log('✅ تم إنشاء مشروع جديد:', newProject.name);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          data: newProject,
          message: 'تم إنشاء المشروع بنجاح'
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
    console.error('❌ خطأ في دالة المشاريع:', error);
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