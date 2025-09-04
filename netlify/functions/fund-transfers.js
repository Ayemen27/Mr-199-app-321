/**
 * Netlify Function للتحويلات المالية
 * يعالج /api/fund-transfers
 */

let supabase = null;

async function initSupabase() {
  if (!supabase) {
    const { createClient } = await import('@supabase/supabase-js');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('إعدادات Supabase غير موجودة');
    }

    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
}

export const handler = async (event, context) => {
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
    const supabaseClient = await initSupabase();

    if (event.httpMethod === 'GET') {
      console.log('💰 طلب قائمة التحويلات المالية');
      
      const { date } = event.queryStringParameters || {};
      
      let query = supabaseClient
        .from('fund_transfers')
        .select(`
          *,
          projects!inner(id, name)
        `)
        .order('transfer_date', { ascending: false });

      if (date) {
        query = query.gte('transfer_date', date + 'T00:00:00.000Z')
                     .lt('transfer_date', date + 'T23:59:59.999Z');
      }

      const { data: transfers, error } = await query;

      if (error) {
        console.error('خطأ في جلب التحويلات:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'فشل في جلب التحويلات',
            error: error.message
          }),
        };
      }

      console.log(`✅ تم جلب ${transfers?.length || 0} تحويل`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: transfers || [],
          count: transfers?.length || 0
        }),
      };
    }

    if (event.httpMethod === 'POST') {
      console.log('➕ إنشاء تحويل مالي جديد');
      
      const { 
        projectId, 
        amount, 
        senderName, 
        transferNumber, 
        transferType, 
        transferDate, 
        notes 
      } = JSON.parse(event.body || '{}');
      
      if (!projectId || !amount || !transferType || !transferDate) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'المشروع والمبلغ ونوع التحويل والتاريخ مطلوبة'
          }),
        };
      }

      const { data: newTransfer, error } = await supabaseClient
        .from('fund_transfers')
        .insert([{
          project_id: projectId,
          amount,
          sender_name: senderName,
          transfer_number: transferNumber,
          transfer_type: transferType,
          transfer_date: transferDate,
          notes,
        }])
        .select()
        .single();

      if (error) {
        console.error('خطأ في إنشاء التحويل:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'فشل في إنشاء التحويل',
            error: error.message
          }),
        };
      }

      console.log('✅ تم إنشاء التحويل:', newTransfer.id);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          data: newTransfer,
          message: 'تم إنشاء التحويل بنجاح'
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
    console.error('خطأ في معالج التحويلات:', error);
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