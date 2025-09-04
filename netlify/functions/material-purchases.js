/**
 * Netlify Function لمشتريات المواد
 * يعالج /api/material-purchases
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
      console.log('🛒 طلب قائمة مشتريات المواد');
      
      const { projectId, dateFrom, dateTo, date } = event.queryStringParameters || {};
      
      let query = supabaseClient
        .from('material_purchases')
        .select(`
          *,
          projects!inner(id, name),
          suppliers(id, name),
          materials(id, name, category, unit)
        `)
        .order('purchase_date', { ascending: false });

      // تطبيق الفلاتر
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      if (dateFrom && dateTo) {
        query = query.gte('purchase_date', dateFrom + 'T00:00:00.000Z')
                     .lte('purchase_date', dateTo + 'T23:59:59.999Z');
      } else if (date) {
        query = query.gte('purchase_date', date + 'T00:00:00.000Z')
                     .lt('purchase_date', date + 'T23:59:59.999Z');
      }

      const { data: purchases, error } = await query;

      if (error) {
        console.error('خطأ في جلب المشتريات:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'فشل في جلب المشتريات',
            error: error.message
          }),
        };
      }

      console.log(`✅ تم جلب ${purchases?.length || 0} مشترية`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: purchases || [],
          count: purchases?.length || 0
        }),
      };
    }

    if (event.httpMethod === 'POST') {
      console.log('➕ إنشاء مشترية جديدة');
      
      const { 
        projectId, 
        materialId, 
        supplierId, 
        quantity, 
        unitPrice, 
        totalAmount, 
        purchaseDate, 
        invoiceNumber, 
        paymentMethod, 
        notes 
      } = JSON.parse(event.body || '{}');
      
      if (!projectId || !materialId || !quantity || !unitPrice) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'المشروع والمادة والكمية وسعر الوحدة مطلوبة'
          }),
        };
      }

      const finalTotalAmount = totalAmount || (parseFloat(quantity) * parseFloat(unitPrice));

      const { data: newPurchase, error } = await supabaseClient
        .from('material_purchases')
        .insert([{
          project_id: projectId,
          material_id: materialId,
          supplier_id: supplierId,
          quantity: parseFloat(quantity),
          unit_price: parseFloat(unitPrice),
          total_amount: finalTotalAmount,
          purchase_date: purchaseDate || new Date().toISOString(),
          invoice_number: invoiceNumber,
          payment_method: paymentMethod || 'cash',
          notes,
        }])
        .select()
        .single();

      if (error) {
        console.error('خطأ في إنشاء المشترية:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'فشل في إنشاء المشترية',
            error: error.message
          }),
        };
      }

      console.log('✅ تم إنشاء المشترية:', newPurchase.id);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          data: newPurchase,
          message: 'تم إنشاء المشترية بنجاح'
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
    console.error('خطأ في معالج المشتريات:', error);
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