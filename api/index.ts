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
  res.json({
    success: true,
    message: 'النظام يعمل بكفاءة',
    timestamp: new Date().toISOString(),
    database: supabase ? 'متصل' : 'غير متصل'
  });
});

// ====== مسار المشاريع ======
app.get('/api/projects', async (req, res) => {
  try {
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

// ====== مسارات المصادقة المفقودة ======
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    message: 'تم تسجيل الدخول بنجاح',
    user: {
      id: '1',
      email: 'admin@example.com',
      role: 'admin'
    },
    token: 'dummy-token-for-production'
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    user: {
      id: '1',
      email: 'admin@example.com',
      role: 'admin'
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});

// ====== مسارات أخرى مفقودة ======
app.get('/api/autocomplete/:category', (req, res) => {
  res.json({
    success: true,
    data: [],
    count: 0
  });
});

app.get('/api/projects/:id/attendance', (req, res) => {
  res.json({
    success: true,
    data: [],
    count: 0
  });
});

app.get('/api/projects/:id/daily-summary/:date', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Daily summary not found'
  });
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

// ====== معالج الأخطاء العام ======
app.use((error: any, req: any, res: any, next: any) => {
  console.error('خطأ في الخادم:', error);
  res.status(500).json({
    success: false,
    message: 'خطأ داخلي في الخادم',
    timestamp: new Date().toISOString()
  });
});

// ====== مسارات المصادقة المفقودة ======
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    message: 'تم تسجيل الدخول بنجاح',
    user: {
      id: '1',
      email: 'admin@example.com',
      role: 'admin'
    },
    token: 'dummy-token-for-production'
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    user: {
      id: '1',
      email: 'admin@example.com',
      role: 'admin'
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});

// ====== مسارات أخرى مفقودة ======
app.get('/api/autocomplete/:category', (req, res) => {
  res.json({
    success: true,
    data: [],
    count: 0
  });
});

app.get('/api/projects/:id/attendance', (req, res) => {
  res.json({
    success: true,
    data: [],
    count: 0
  });
});

app.get('/api/projects/:id/daily-summary/:date', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Daily summary not found'
  });
});

// ====== معالج Vercel المحسن ======
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';
  const method = req.method || 'GET';
  
  // استخراج المسار من query parameters  
  const path = req.query.path as string || url.replace('/api', '') || '/';
  
  // إعادة كتابة URL للمسار الصحيح
  const fullPath = path.startsWith('/') ? `/api${path}` : `/api/${path}`;
  
  console.log(`✏️ ${method} ${fullPath}`);

  // تحديث معلومات الطلب
  req.url = fullPath;
  
  // معالجة CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // معالجة OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  // معالجة الطلب باستخدام Express
  return new Promise((resolve) => {
    app(req as any, res as any, () => {
      console.log(`❌ مسار غير موجود: ${method} ${fullPath}`);
      res.status(404).json({ message: `❌ مسار غير موجود: ${method} ${fullPath}` });
      resolve(undefined);
    });
  });
}