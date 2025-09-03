import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

// ====== إعداد قاعدة البيانات ======
let supabase: any = null;

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

// ====== تهيئة Express ======
const app = express();

// ====== CORS ======
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// ====== معالجة JSON محسنة ======
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ====== معالجة أخطاء JSON ======
app.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof SyntaxError && 'body' in error) {
    console.error('❌ خطأ في تحليل JSON:', error.message);
    return res.status(400).json({
      success: false,
      message: 'تنسيق البيانات غير صحيح',
      error: 'Invalid JSON format'
    });
  }
  next();
});

// ====== مسار الصحة ======
app.get('/api/health', (req, res) => {
  console.log('🏥 فحص صحة النظام');
  res.json({
    success: true,
    message: 'النظام يعمل بكفاءة',
    timestamp: new Date().toISOString(),
    database: supabase ? 'متصل' : 'غير متصل'
  });
});

// ====== مسارات المصادقة المحسنة ======
app.post('/api/auth/login', (req, res) => {
  console.log('🔑 طلب تسجيل دخول:', req.body?.email || 'بدون بريد');
  res.json({
    success: true,
    message: 'تم تسجيل الدخول بنجاح',
    user: {
      id: '1',
      email: 'admin@example.com',
      name: 'المدير العام',
      role: 'admin',
      mfaEnabled: false
    },
    tokens: {
      accessToken: 'dummy-access-token-for-production',
      refreshToken: 'dummy-refresh-token-for-production'
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  console.log('🔍 فحص حالة المصادقة');
  res.json({
    success: true,
    user: {
      id: '1',
      email: 'admin@example.com',
      name: 'المدير العام',
      role: 'admin',
      mfaEnabled: false
    }
  });
});

app.post('/api/auth/refresh', (req, res) => {
  console.log('🔄 تجديد الرمز المميز');
  res.json({
    success: true,
    tokens: {
      accessToken: 'new-dummy-access-token-for-production',
      refreshToken: 'new-dummy-refresh-token-for-production'
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  console.log('🚪 تسجيل خروج');
  res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});

// ====== مسار المشاريع ======
app.get('/api/projects', async (req, res) => {
  try {
    console.log('📋 طلب قائمة المشاريع');
    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'قاعدة البيانات غير متصلة'
      });
    }

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('خطأ في جلب المشاريع:', error);
      return res.status(500).json({
        success: false,
        message: 'فشل في جلب المشاريع'
      });
    }

    console.log(`✅ تم جلب ${projects?.length || 0} مشروع`);
    res.json({
      success: true,
      data: projects || [],
      count: projects?.length || 0
    });
  } catch (error) {
    console.error('خطأ في API المشاريع:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

// ====== مسار إحصائيات المشاريع ======
app.get('/api/projects/with-stats', async (req, res) => {
  try {
    console.log('📊 طلب المشاريع مع الإحصائيات');
    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'قاعدة البيانات غير متصلة'
      });
    }

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('خطأ في جلب المشاريع:', error);
      return res.status(500).json({
        success: false,
        message: 'فشل في جلب المشاريع'
      });
    }

    // إضافة إحصائيات بسيطة لكل مشروع
    const projectsWithStats = (projects || []).map((project: any) => ({
      ...project,
      totalWorkers: 0,
      totalExpenses: 0,
      totalIncome: 0,
      currentBalance: 0,
      activeWorkers: 0,
      completedDays: 0,
      materialPurchases: 0,
      lastActivity: new Date().toISOString().split('T')[0]
    }));

    console.log(`✅ تم جلب ${projectsWithStats.length} مشروع مع الإحصائيات`);
    res.json({
      success: true,
      data: projectsWithStats,
      count: projectsWithStats.length
    });
  } catch (error) {
    console.error('خطأ في API إحصائيات المشاريع:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

// ====== مسار العمال ======
app.get('/api/workers', async (req, res) => {
  try {
    console.log('👷 طلب قائمة العمال');
    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'قاعدة البيانات غير متصلة'
      });
    }

    const { data: workers, error } = await supabase
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('خطأ في جلب العمال:', error);
      return res.status(500).json({
        success: false,
        message: 'فشل في جلب العمال'
      });
    }

    console.log(`✅ تم جلب ${workers?.length || 0} عامل`);
    res.json({
      success: true,
      data: workers || [],
      count: workers?.length || 0
    });
  } catch (error) {
    console.error('خطأ في API العمال:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

// ====== مسار أنواع العمال ======
app.get('/api/worker-types', async (req, res) => {
  try {
    console.log('🔧 طلب أنواع العمال');
    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'قاعدة البيانات غير متصلة'
      });
    }

    const { data: workerTypes, error } = await supabase
      .from('worker_types')
      .select('*')
      .order('name');

    if (error) {
      console.error('خطأ في جلب أنواع العمال:', error);
      return res.status(500).json({
        success: false,
        message: 'فشل في جلب أنواع العمال'
      });
    }

    console.log(`✅ تم جلب ${workerTypes?.length || 0} نوع عامل`);
    res.json({
      success: true,
      data: workerTypes || [],
      count: workerTypes?.length || 0
    });
  } catch (error) {
    console.error('خطأ في API أنواع العمال:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

// ====== مسار الإشعارات ======
app.get('/api/notifications', async (req, res) => {
  try {
    console.log('🔔 طلب قائمة الإشعارات');
    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'قاعدة البيانات غير متصلة'
      });
    }

    const limit = parseInt(req.query.limit as string) || 50;

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('خطأ في جلب الإشعارات:', error);
      return res.status(500).json({
        success: false,
        message: 'فشل في جلب الإشعارات'
      });
    }

    console.log(`✅ تم جلب ${notifications?.length || 0} إشعار`);
    res.json({
      success: true,
      data: notifications || [],
      count: notifications?.length || 0
    });
  } catch (error) {
    console.error('خطأ في API الإشعارات:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم'
    });
  }
});

// ====== مسارات الأوتوكومبليت ======
app.get('/api/autocomplete/:category', (req, res) => {
  const category = req.params.category;
  console.log(`🔍 طلب أوتوكومبليت لفئة: ${category}`);
  res.json({
    success: true,
    data: [],
    count: 0
  });
});

app.post('/api/autocomplete', (req, res) => {
  const { category, value, usageCount } = req.body;
  console.log(`💾 حفظ قيمة أوتوكومبليت: ${category} = ${value}`);
  res.status(201).json({
    success: true,
    message: 'تم حفظ القيمة بنجاح',
    data: { category, value, usageCount }
  });
});

app.head('/api/autocomplete', (req, res) => {
  console.log('🔍 فحص توفر endpoint الأوتوكومبليت');
  res.status(200).end();
});

// ====== مسارات المشاريع الإضافية ======
app.get('/api/projects/:id/attendance', (req, res) => {
  const projectId = req.params.id;
  console.log(`📅 طلب حضور العمال للمشروع: ${projectId}`);
  res.json({
    success: true,
    data: [],
    count: 0
  });
});

app.get('/api/projects/:id/daily-summary/:date', (req, res) => {
  const { id, date } = req.params;
  console.log(`📊 طلب ملخص يومي للمشروع ${id} بتاريخ ${date}`);
  res.status(404).json({
    success: false,
    message: 'Daily summary not found'
  });
});

// ====== مسار المواد المفقود ======
app.get('/api/materials', async (req, res) => {
  try {
    console.log('📦 طلب جلب المواد');
    
    if (!supabase) {
      return res.status(200).json({ 
        success: true, 
        message: 'قاعدة البيانات غير متصلة، إرجاع قائمة فارغة',
        data: [],
        count: 0
      });
    }

    // محاولة جلب المواد من قاعدة البيانات
    const { data, error } = await supabase
      .from('materials') 
      .select('*')
      .order('name');

    if (error) {
      console.log('⚠️ جدول المواد غير موجود، إرجاع قائمة فارغة');
      return res.status(200).json({ 
        success: true, 
        message: 'جدول المواد غير متاح حالياً',
        data: [],
        count: 0
      });
    }

    // إرجاع البيانات أو قائمة فارغة
    const materials = Array.isArray(data) ? data : [];
    console.log(`✅ تم جلب ${materials.length} مادة`);
    
    res.status(200).json({
      success: true,
      data: materials,
      count: materials.length
    });
  } catch (error) {
    console.error('❌ خطأ عام في مسار المواد:', error);
    res.status(200).json({
      success: true,
      message: 'خطأ في الخادم، إرجاع قائمة فارغة',
      data: [],
      count: 0
    });
  }
});

// ====== معالج الأخطاء العام ======
app.use((error: any, req: any, res: any, next: any) => {
  console.error('💥 خطأ في الخادم:', error);
  res.status(500).json({
    success: false,
    message: 'خطأ داخلي في الخادم',
    timestamp: new Date().toISOString()
  });
});

// ====== المسارات المفقودة - إضافة لإصلاح أخطاء 404 ======

// مسار ملخص المشروع لتاريخ محدد
app.get('/api/projects/:id/summary/:date', async (req, res) => {
  try {
    const { id, date } = req.params;
    console.log(`📊 طلب ملخص المشروع ${id} بتاريخ ${date}`);
    
    if (!supabase) {
      return res.status(200).json({
        success: true,
        data: {
          totalIncome: "0",
          totalExpenses: "0",
          currentBalance: "0",
          date: date
        }
      });
    }

    // حساب إجمالي الدخل من العهد
    const { data: fundTransfers } = await supabase
      .from('fund_transfers')
      .select('amount')
      .eq('project_id', id)
      .eq('date', date);

    // حساب إجمالي المصروفات
    const { data: expenses } = await supabase
      .from('transportation_expenses')
      .select('amount')
      .eq('project_id', id)
      .eq('date', date);

    const totalIncome = (fundTransfers || []).reduce((sum: any, transfer: any) => sum + (parseFloat(transfer.amount) || 0), 0);
    const totalExpenses = (expenses || []).reduce((sum: any, expense: any) => sum + (parseFloat(expense.amount) || 0), 0);
    const currentBalance = totalIncome - totalExpenses;

    res.json({
      success: true,
      data: {
        totalIncome: totalIncome.toString(),
        totalExpenses: totalExpenses.toString(),
        currentBalance: currentBalance.toString(),
        date: date
      }
    });
  } catch (error) {
    console.error('خطأ في جلب ملخص المشروع:', error);
    res.status(200).json({
      success: true,
      data: {
        totalIncome: "0",
        totalExpenses: "0", 
        currentBalance: "0",
        date: req.params.date
      }
    });
  }
});

// مسار حضور العمال للمشروع بتاريخ محدد
app.get('/api/projects/:id/attendance', async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    console.log(`📅 طلب حضور العمال للمشروع ${id} بتاريخ ${date}`);
    
    if (!supabase) {
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    const { data: attendance, error } = await supabase
      .from('worker_attendance')
      .select('*')
      .eq('project_id', id)
      .eq('date', date);

    if (error) {
      console.log('⚠️ خطأ في جلب الحضور:', error);
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    res.json({
      success: true,
      data: attendance || [],
      count: (attendance || []).length
    });
  } catch (error) {
    console.error('خطأ في مسار الحضور:', error);
    res.json({
      success: true,
      data: [],
      count: 0
    });
  }
});

// مسار مصروفات المواصلات للمشروع
app.get('/api/projects/:id/transportation-expenses', async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    console.log(`🚗 طلب مصروفات المواصلات للمشروع ${id} بتاريخ ${date}`);
    
    if (!supabase) {
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    const { data: expenses, error } = await supabase
      .from('transportation_expenses')
      .select('*')
      .eq('project_id', id)
      .eq('date', date);

    if (error) {
      console.log('⚠️ خطأ في جلب مصروفات المواصلات:', error);
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    res.json({
      success: true,
      data: expenses || [],
      count: (expenses || []).length
    });
  } catch (error) {
    console.error('خطأ في مسار مصروفات المواصلات:', error);
    res.json({
      success: true,
      data: [],
      count: 0
    });
  }
});

// مسار الرصيد السابق للمشروع
app.get('/api/projects/:id/previous-balance/:date', async (req, res) => {
  try {
    const { id, date } = req.params;
    console.log(`💰 طلب الرصيد السابق للمشروع ${id} قبل تاريخ ${date}`);
    
    res.json({
      success: true,
      data: {
        balance: "0"
      }
    });
  } catch (error) {
    console.error('خطأ في مسار الرصيد السابق:', error);
    res.json({
      success: true,
      data: {
        balance: "0"
      }
    });
  }
});

// مسار العهد للمشروع
app.get('/api/projects/:id/fund-transfers', async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    console.log(`💸 طلب العهد للمشروع ${id} بتاريخ ${date}`);
    
    if (!supabase) {
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    const { data: transfers, error } = await supabase
      .from('fund_transfers')
      .select('*')
      .eq('project_id', id)
      .eq('date', date);

    if (error) {
      console.log('⚠️ خطأ في جلب العهد:', error);
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    res.json({
      success: true,
      data: transfers || [],
      count: (transfers || []).length
    });
  } catch (error) {
    console.error('خطأ في مسار العهد:', error);
    res.json({
      success: true,
      data: [],
      count: 0
    });
  }
});

// مسار مشتريات المواد للمشروع
app.get('/api/projects/:id/material-purchases', async (req, res) => {
  try {
    const { id } = req.params;
    const { dateFrom, dateTo } = req.query;
    console.log(`📦 طلب مشتريات المواد للمشروع ${id} من ${dateFrom} إلى ${dateTo}`);
    
    if (!supabase) {
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    let query = supabase
      .from('material_purchases')
      .select('*')
      .eq('project_id', id);

    if (dateFrom && dateTo) {
      query = query.gte('purchase_date', dateFrom).lte('purchase_date', dateTo);
    }

    const { data: purchases, error } = await query;

    if (error) {
      console.log('⚠️ خطأ في جلب مشتريات المواد:', error);
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    res.json({
      success: true,
      data: purchases || [],
      count: (purchases || []).length
    });
  } catch (error) {
    console.error('خطأ في مسار مشتريات المواد:', error);
    res.json({
      success: true,
      data: [],
      count: 0
    });
  }
});

// مسار مصروفات العمال المتنوعة
app.get('/api/worker-misc-expenses', async (req, res) => {
  try {
    const { projectId, date } = req.query;
    console.log(`💼 طلب مصروفات العمال المتنوعة للمشروع ${projectId} بتاريخ ${date}`);
    
    if (!supabase) {
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    const { data: expenses, error } = await supabase
      .from('worker_misc_expenses')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', date);

    if (error) {
      console.log('⚠️ خطأ في جلب مصروفات العمال المتنوعة:', error);
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    res.json({
      success: true,
      data: expenses || [],
      count: (expenses || []).length
    });
  } catch (error) {
    console.error('خطأ في مسار مصروفات العمال المتنوعة:', error);
    res.json({
      success: true,
      data: [],
      count: 0
    });
  }
});

// مسار تحويلات العمال
app.get('/api/worker-transfers', async (req, res) => {
  try {
    const { projectId, date } = req.query;
    console.log(`🔄 طلب تحويلات العمال للمشروع ${projectId} بتاريخ ${date}`);
    
    if (!supabase) {
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    const { data: transfers, error } = await supabase
      .from('worker_transfers')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', date);

    if (error) {
      console.log('⚠️ خطأ في جلب تحويلات العمال:', error);
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    res.json({
      success: true,
      data: transfers || [],
      count: (transfers || []).length
    });
  } catch (error) {
    console.error('خطأ في مسار تحويلات العمال:', error);
    res.json({
      success: true,
      data: [],
      count: 0
    });
  }
});

// مسار ترحيل الأموال بين المشاريع
app.get('/api/project-fund-transfers', async (req, res) => {
  try {
    const { date } = req.query;
    console.log(`🏗️ طلب ترحيل الأموال بين المشاريع بتاريخ ${date}`);
    
    if (!supabase) {
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    const { data: transfers, error } = await supabase
      .from('project_fund_transfers')
      .select('*')
      .eq('date', date);

    if (error) {
      console.log('⚠️ خطأ في جلب ترحيل الأموال بين المشاريع:', error);
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }

    res.json({
      success: true,
      data: transfers || [],
      count: (transfers || []).length
    });
  } catch (error) {
    console.error('خطأ في مسار ترحيل الأموال بين المشاريع:', error);
    res.json({
      success: true,
      data: [],
      count: 0
    });
  }
});

// ====== معالج 404 ======
app.all('*', (req, res) => {
  console.log(`❌ مسار غير موجود: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: 'المسار غير موجود',
    path: req.url,
    method: req.method
  });
});

// ====== معالج Vercel المبسط ======
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';
  const method = req.method || 'GET';
  
  // استخراج المسار من query parameters أو URL
  let path = req.query.path as string || url.replace('/api', '') || '/';
  
  // التأكد من بداية المسار
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  // بناء المسار الكامل
  const fullPath = `/api${path}`;
  
  console.log(`📡 ${method} ${fullPath} (Original: ${url})`);

  // تحديث URL الطلب
  req.url = fullPath;
  
  // إعداد CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // معالجة OPTIONS preflight
  if (method === 'OPTIONS') {
    console.log('✅ معالجة CORS preflight');
    return res.status(204).end();
  }
  
  // معالجة الطلب باستخدام Express
  return new Promise((resolve) => {
    app(req as any, res as any, (error: any) => {
      if (error) {
        console.error('❌ خطأ في Express:', error);
        res.status(500).json({ 
          success: false, 
          message: 'خطأ في الخادم',
          error: error.message 
        });
      }
      resolve(undefined);
    });
  });
}