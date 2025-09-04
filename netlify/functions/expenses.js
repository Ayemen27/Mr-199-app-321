/**
 * Netlify Function للمصروفات اليومية - متوافق مع Netlify Runtime
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
    const path = event.path || '';
    
    // تحديد نوع المصروف بناءً على المسار
    let expenseType = '';
    let tableName = '';
    
    if (path.includes('transportation-expenses')) {
      expenseType = 'transportation';
      tableName = 'transportation_expenses';
    } else if (path.includes('worker-transfers')) {
      expenseType = 'worker-transfers';
      tableName = 'worker_transfers';
    } else if (path.includes('worker-misc-expenses')) {
      expenseType = 'worker-misc';
      tableName = 'worker_misc_expenses';
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'نوع المصروف غير معروف'
        }),
      };
    }

    console.log(`💸 معالجة طلب ${expenseType}:`, event.httpMethod);

    if (event.httpMethod === 'GET') {
      const { projectId, date } = event.queryStringParameters || {};
      
      let query = supabaseClient
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      if (date) {
        query = query.gte('date', date + 'T00:00:00.000Z')
                     .lt('date', date + 'T23:59:59.999Z');
      }

      const { data: expenses, error } = await query;

      if (error) {
        console.error(`خطأ في جلب ${expenseType}:`, error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: `فشل في جلب ${expenseType}`,
            error: error.message
          }),
        };
      }

      console.log(`✅ تم جلب ${expenses?.length || 0} ${expenseType}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: expenses || [],
          count: expenses?.length || 0
        }),
      };
    }

    if (event.httpMethod === 'POST') {
      const requestData = JSON.parse(event.body || '{}');
      
      // التحقق من البيانات الأساسية
      if (!requestData.projectId || !requestData.amount) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'المشروع والمبلغ مطلوبان'
          }),
        };
      }

      // تحضير البيانات للإدراج
      let insertData = {
        project_id: requestData.projectId,
        amount: requestData.amount,
        date: requestData.date || new Date().toISOString(),
        notes: requestData.notes || null,
      };

      // إضافة حقول خاصة بكل نوع
      if (expenseType === 'transportation') {
        insertData = {
          ...insertData,
          vehicle_type: requestData.vehicleType,
          driver_name: requestData.driverName,
          trip_description: requestData.tripDescription,
        };
      } else if (expenseType === 'worker-transfers') {
        insertData = {
          ...insertData,
          worker_id: requestData.workerId,
          transfer_type: requestData.transferType,
          receiving_party: requestData.receivingParty,
        };
      } else if (expenseType === 'worker-misc') {
        insertData = {
          ...insertData,
          worker_id: requestData.workerId,
          expense_type: requestData.expenseType,
          description: requestData.description,
        };
      }

      const { data: newExpense, error } = await supabaseClient
        .from(tableName)
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error(`خطأ في إنشاء ${expenseType}:`, error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: `فشل في إنشاء ${expenseType}`,
            error: error.message
          }),
        };
      }

      console.log(`✅ تم إنشاء ${expenseType}:`, newExpense.id);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          data: newExpense,
          message: `تم إنشاء ${expenseType} بنجاح`
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
    console.error('خطأ في معالج المصروفات:', error);
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