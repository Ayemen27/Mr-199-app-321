import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// إعداد Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// التحقق من وجود متغيرات البيئة المطلوبة
if (!supabaseUrl) {
  console.error('❌ متغير SUPABASE_URL غير معرف');
  throw new Error('SUPABASE_URL is required');
}

if (!supabaseServiceKey) {
  console.error('❌ متغير SUPABASE_SERVICE_ROLE_KEY غير معرف');
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

// عميل Supabase للعمليات الإدارية (تجاوز RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// عميل Supabase العادي للعمليات العامة
const supabase = supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : supabaseAdmin;

// إعدادات المصادقة
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'construction-app-jwt-secret-2025';
const SALT_ROUNDS = 12;

// مخططات التحقق الأساسية
const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور قصيرة جداً'),
});

const registerSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون على الأقل 8 أحرف'),
  name: z.string().min(2, 'الاسم قصير جداً'),
  phone: z.string().optional(),
  role: z.string().optional(),
});

// مخططات إضافية للكيانات
const projectSchema = z.object({
  name: z.string().min(1, 'اسم المشروع مطلوب'),
  status: z.string().optional(),
  imageUrl: z.string().optional(),
});

const workerSchema = z.object({
  name: z.string().min(1, 'اسم العامل مطلوب'),
  type: z.string().min(1, 'نوع العامل مطلوب'),
  dailyWage: z.number().min(0, 'الأجر اليومي يجب أن يكون موجباً'),
});

const workerTypeSchema = z.object({
  name: z.string().min(1, 'اسم نوع العامل مطلوب'),
});

const attendanceSchema = z.object({
  projectId: z.string(),
  workerId: z.string(),
  date: z.string(),
  isPresent: z.boolean(),
  workDays: z.number().min(0).max(2).optional(),
  workDescription: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

const fundTransferSchema = z.object({
  projectId: z.string(),
  amount: z.number().min(0),
  senderName: z.string().optional(),
  transferNumber: z.string().optional(),
  transferType: z.string(),
  transferDate: z.string(),
  notes: z.string().optional(),
});

const materialPurchaseSchema = z.object({
  projectId: z.string(),
  supplierId: z.string().optional(),
  itemName: z.string(),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  totalAmount: z.number().min(0),
  purchaseDate: z.string(),
  notes: z.string().optional(),
});

const supplierSchema = z.object({
  name: z.string().min(1, 'اسم المورد مطلوب'),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

const app = express();

// ============ ميدل وير المصادقة ============

// ميدل وير التحقق من التوكن (مع التعامل مع الأخطاء)
const authenticateToken = (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'لم يتم العثور على رمز المصادقة'
      });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        console.log('خطأ تحقق التوكن:', err.message);
        return res.status(403).json({ 
          success: false, 
          message: 'رمز مصادقة غير صالح أو منتهي الصلاحية'
        });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('خطأ في middleware المصادقة:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'خطأ داخلي في المصادقة'
    });
  }
};

// ميدل وير التحقق من الدور
const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'ليس لديك صلاحية للوصول' });
    }
    next();
  };
};

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// إضافة CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// تطبيق middleware المصادقة على المسارات المحمية
const protectedRoutes = [
  '/api/projects',
  '/api/workers',
  '/api/fund-transfers',
  '/api/worker-attendance',
  '/api/material-purchases',
  '/api/suppliers',
  '/api/equipment',
  '/api/worker-transfers',
  '/api/project-fund-transfers',
  '/api/supplier-payments'
];

// تطبيق المصادقة على المسارات المحمية (عدا GET requests)
app.use((req, res, next) => {
  // تخطي المصادقة للمسارات العامة
  if (req.path === '/api/health' || req.path.startsWith('/api/auth/')) {
    return next();
  }
  
  // تطبيق المصادقة للمسارات المحمية
  const isProtectedRoute = protectedRoutes.some(route => req.path.startsWith(route));
  const isModifyingRequest = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  
  // المسارات العامة غير المحمية (للقراءة فقط)
  const publicReadOnlyPaths = [
    '/api/ai-system/',
    '/api/smart-errors/',
    '/api/health',
    '/api/status',
    '/api/version'
  ];
  
  const isPublicReadOnly = publicReadOnlyPaths.some(path => req.path.startsWith(path)) && req.method === 'GET';
  
  if (isPublicReadOnly) {
    return next();
  }
  
  // تطبيق المصادقة للمسارات المحمية أو العمليات المعدلة
  if (isProtectedRoute || isModifyingRequest) {
    return authenticateToken(req, res, next);
  }
  
  next();
});

// مسار الملفات الثابتة (مبني من قِبل Vite)
const distPath = path.join(__dirname, 'dist');

// خدمة الملفات الثابتة من dist/public
app.use(express.static(distPath, {
  maxAge: '1y', // Cache للملفات الثابتة
  etag: true
}));

// Route اختبار أساسي
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'نظام إدارة المشاريع الإنشائية يعمل بنجاح',
    timestamp: new Date().toISOString(),
    version: '1.3.0',
    environment: 'production'
  });
});

// ============ مسارات المصادقة ============

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 طلب تسجيل دخول جديد');
    
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      console.log('❌ فشل التحقق من البيانات:', validation.error.errors);
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const { email, password } = validation.data;
    console.log('🔍 البحث عن المستخدم:', email);

    // البحث عن المستخدم
    const { data: users, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (fetchError) {
      console.error('❌ خطأ في قاعدة البيانات:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'خطأ في الخادم'
      });
    }

    if (!users || users.length === 0) {
      console.log('❌ المستخدم غير موجود');
      return res.status(401).json({
        success: false,
        message: 'بيانات تسجيل الدخول غير صحيحة'
      });
    }

    const user = users[0];
    console.log('✅ تم العثور على المستخدم:', user.id);

    // التحقق من كلمة المرور
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      console.log('❌ كلمة مرور خاطئة');
      return res.status(401).json({
        success: false,
        message: 'بيانات تسجيل الدخول غير صحيحة'
      });
    }

    console.log('✅ كلمة المرور صحيحة');

    // إنشاء JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role || 'user'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ تم إنشاء التوكن بنجاح');

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

// تسجيل حساب جديد
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('📝 طلب تسجيل حساب جديد');
    
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      console.log('❌ فشل التحقق من البيانات:', validation.error.errors);
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const { email, password, name, phone, role } = validation.data;
    console.log('🔍 التحقق من وجود المستخدم:', email);

    // التحقق من وجود المستخدم
    const { data: existingUsers, error: checkError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', email)
      .limit(1);

    if (checkError) {
      console.error('❌ خطأ في فحص المستخدم:', checkError);
      return res.status(500).json({
        success: false,
        message: 'خطأ في الخادم'
      });
    }

    if (existingUsers && existingUsers.length > 0) {
      console.log('❌ المستخدم موجود مسبقاً');
      return res.status(409).json({
        success: false,
        message: 'المستخدم موجود مسبقاً'
      });
    }

    console.log('🔐 تشفير كلمة المرور...');
    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    console.log('💾 إنشاء المستخدم في قاعدة البيانات...');
    // إنشاء المستخدم
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        first_name: name.split(' ')[0] || name,
        last_name: name.split(' ').slice(1).join(' ') || null,
        phone: phone || null,
        role: role || 'user',
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ خطأ في إنشاء المستخدم:', insertError);
      return res.status(500).json({
        success: false,
        message: 'فشل في إنشاء الحساب'
      });
    }

    console.log('✅ تم إنشاء المستخدم بنجاح:', newUser.id);

    // إنشاء JWT token
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email, 
        role: newUser.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ تم إنشاء التوكن بنجاح');

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim(),
        role: newUser.role
      },
      token
    });

  } catch (error) {
    console.error('❌ خطأ في التسجيل:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

// ============ مسارات المشاريع ============

// جلب المشاريع مع الإحصائيات
app.get('/api/projects/with-stats', async (req, res) => {
  try {
    console.log('📊 جلب المشاريع مع الإحصائيات');
    
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select(`
        id,
        name,
        status,
        imageUrl: image_url,
        createdAt: created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('خطأ في جلب المشاريع:', error);
      return res.status(500).json({ message: 'خطأ في جلب المشاريع' });
    }

    // إضافة إحصائيات لكل مشروع
    const projectsWithStats = await Promise.all(
      (projects || []).map(async (project) => {
        // إحصائيات العمال
        const { count: workersCount } = await supabaseAdmin
          .from('worker_attendance')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);

        // إجمالي التحويلات
        const { data: transfers } = await supabaseAdmin
          .from('fund_transfers')
          .select('amount')
          .eq('project_id', project.id);

        const totalTransfers = transfers?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

        // إجمالي المصروفات
        const { data: expenses } = await supabaseAdmin
          .from('material_purchases')
          .select('total_amount')
          .eq('project_id', project.id);

        const totalExpenses = expenses?.reduce((sum, e) => sum + parseFloat(e.total_amount), 0) || 0;

        return {
          ...project,
          stats: {
            workersCount: workersCount || 0,
            totalTransfers,
            totalExpenses,
            remainingBudget: totalTransfers - totalExpenses
          }
        };
      })
    );

    res.json(projectsWithStats);
  } catch (error) {
    console.error('خطأ في جلب المشاريع:', error);
    res.status(500).json({ message: 'خطأ في جلب المشاريع' });
  }
});

// جلب مشروع واحد
app.get('/api/projects/:id', async (req, res) => {
  try {
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'المشروع غير موجود' });
      }
      console.error('خطأ في جلب المشروع:', error);
      return res.status(500).json({ message: 'خطأ في جلب المشروع' });
    }

    res.json(project);
  } catch (error) {
    console.error('خطأ في جلب المشروع:', error);
    res.status(500).json({ message: 'خطأ في جلب المشروع' });
  }
});

// إنشاء مشروع جديد
app.post('/api/projects', async (req, res) => {
  try {
    console.log('➕ إنشاء مشروع جديد:', req.body);
    
    const validation = projectSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const { name, status, imageUrl } = validation.data;

    const { data: newProject, error } = await supabaseAdmin
      .from('projects')
      .insert({
        name,
        status: status || 'active',
        image_url: imageUrl
      })
      .select()
      .single();

    if (error) {
      console.error('خطأ في إنشاء المشروع:', error);
      return res.status(500).json({ message: 'خطأ في إنشاء المشروع' });
    }

    res.status(201).json(newProject);
  } catch (error) {
    console.error('خطأ في إنشاء المشروع:', error);
    res.status(500).json({ message: 'خطأ في إنشاء المشروع' });
  }
});

// تحديث مشروع
app.put('/api/projects/:id', async (req, res) => {
  try {
    const validation = projectSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const { data: updatedProject, error } = await supabaseAdmin
      .from('projects')
      .update({
        name: validation.data.name,
        status: validation.data.status,
        image_url: validation.data.imageUrl
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'المشروع غير موجود' });
      }
      console.error('خطأ في تحديث المشروع:', error);
      return res.status(500).json({ message: 'خطأ في تحديث المشروع' });
    }

    res.json(updatedProject);
  } catch (error) {
    console.error('خطأ في تحديث المشروع:', error);
    res.status(500).json({ message: 'خطأ في تحديث المشروع' });
  }
});

// حذف مشروع
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      console.error('خطأ في حذف المشروع:', error);
      return res.status(500).json({ message: 'خطأ في حذف المشروع' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('خطأ في حذف المشروع:', error);
    res.status(500).json({ message: 'خطأ في حذف المشروع' });
  }
});

// ============ مسارات العمال ============

// جلب جميع العمال
app.get('/api/workers', async (req, res) => {
  try {
    console.log('👷 جلب العمال');
    
    const { data: workers, error } = await supabaseAdmin
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('خطأ في جلب العمال:', error);
      return res.status(500).json({ message: 'خطأ في جلب العمال' });
    }

    res.json(workers || []);
  } catch (error) {
    console.error('خطأ في جلب العمال:', error);
    res.status(500).json({ message: 'خطأ في جلب العمال' });
  }
});

// جلب عامل واحد
app.get('/api/workers/:id', async (req, res) => {
  try {
    const { data: worker, error } = await supabaseAdmin
      .from('workers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'العامل غير موجود' });
      }
      console.error('خطأ في جلب العامل:', error);
      return res.status(500).json({ message: 'خطأ في جلب العامل' });
    }

    res.json(worker);
  } catch (error) {
    console.error('خطأ في جلب العامل:', error);
    res.status(500).json({ message: 'خطأ في جلب العامل' });
  }
});

// إنشاء عامل جديد
app.post('/api/workers', async (req, res) => {
  try {
    console.log('👷 إنشاء عامل جديد:', req.body);
    
    const validation = workerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const { name, type, dailyWage } = validation.data;

    const { data: newWorker, error } = await supabaseAdmin
      .from('workers')
      .insert({
        name,
        type,
        daily_wage: dailyWage,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('خطأ في إنشاء العامل:', error);
      return res.status(500).json({ message: 'خطأ في إنشاء العامل' });
    }

    res.status(201).json(newWorker);
  } catch (error) {
    console.error('خطأ في إنشاء العامل:', error);
    res.status(500).json({ message: 'خطأ في إنشاء العامل' });
  }
});

// تحديث عامل
app.put('/api/workers/:id', async (req, res) => {
  try {
    const validation = workerSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const updateData: any = {};
    if (validation.data.name) updateData.name = validation.data.name;
    if (validation.data.type) updateData.type = validation.data.type;
    if (validation.data.dailyWage !== undefined) updateData.daily_wage = validation.data.dailyWage;

    const { data: updatedWorker, error } = await supabaseAdmin
      .from('workers')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'العامل غير موجود' });
      }
      console.error('خطأ في تحديث العامل:', error);
      return res.status(500).json({ message: 'خطأ في تحديث العامل' });
    }

    res.json(updatedWorker);
  } catch (error) {
    console.error('خطأ في تحديث العامل:', error);
    res.status(500).json({ message: 'خطأ في تحديث العامل' });
  }
});

// حذف عامل
app.delete('/api/workers/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('workers')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      console.error('خطأ في حذف العامل:', error);
      return res.status(500).json({ message: 'خطأ في حذف العامل' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('خطأ في حذف العامل:', error);
    res.status(500).json({ message: 'خطأ في حذف العامل' });
  }
});

// ============ مسارات أنواع العمال ============

// جلب أنواع العمال
app.get('/api/worker-types', async (req, res) => {
  try {
    const { data: workerTypes, error } = await supabaseAdmin
      .from('worker_types')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('خطأ في جلب أنواع العمال:', error);
      return res.status(500).json({ message: 'خطأ في جلب أنواع العمال' });
    }

    res.json(workerTypes || []);
  } catch (error) {
    console.error('خطأ في جلب أنواع العمال:', error);
    res.status(500).json({ message: 'خطأ في جلب أنواع العمال' });
  }
});

// إنشاء نوع عامل جديد
app.post('/api/worker-types', async (req, res) => {
  try {
    const validation = workerTypeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const { data: newType, error } = await supabaseAdmin
      .from('worker_types')
      .insert({ name: validation.data.name })
      .select()
      .single();

    if (error) {
      console.error('خطأ في إنشاء نوع العامل:', error);
      return res.status(500).json({ message: 'خطأ في إنشاء نوع العامل' });
    }

    res.status(201).json(newType);
  } catch (error) {
    console.error('خطأ في إنشاء نوع العامل:', error);
    res.status(500).json({ message: 'خطأ في إنشاء نوع العامل' });
  }
});

// ============ مسارات التحويلات ============

// جلب تحويلات مشروع
app.get('/api/projects/:projectId/fund-transfers', async (req, res) => {
  try {
    const { projectId } = req.params;
    const date = req.query.date as string;

    let query = supabaseAdmin
      .from('fund_transfers')
      .select('*')
      .eq('project_id', projectId);

    if (date) {
      query = query.gte('transfer_date', `${date}T00:00:00`)
                   .lte('transfer_date', `${date}T23:59:59`);
    }

    const { data: transfers, error } = await query.order('transfer_date', { ascending: false });

    if (error) {
      console.error('خطأ في جلب التحويلات:', error);
      return res.status(500).json({ message: 'خطأ في جلب التحويلات' });
    }

    res.json(transfers || []);
  } catch (error) {
    console.error('خطأ في جلب التحويلات:', error);
    res.status(500).json({ message: 'خطأ في جلب التحويلات' });
  }
});

// إنشاء تحويل جديد
app.post('/api/fund-transfers', async (req, res) => {
  try {
    console.log('💰 إنشاء تحويل جديد:', req.body);
    
    const validation = fundTransferSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const data = validation.data;

    const { data: newTransfer, error } = await supabaseAdmin
      .from('fund_transfers')
      .insert({
        project_id: data.projectId,
        amount: data.amount,
        sender_name: data.senderName,
        transfer_number: data.transferNumber,
        transfer_type: data.transferType,
        transfer_date: data.transferDate,
        notes: data.notes
      })
      .select()
      .single();

    if (error) {
      console.error('خطأ في إنشاء التحويل:', error);
      return res.status(500).json({ message: 'خطأ في إنشاء التحويل' });
    }

    res.status(201).json(newTransfer);
  } catch (error) {
    console.error('خطأ في إنشاء التحويل:', error);
    res.status(500).json({ message: 'خطأ في إنشاء التحويل' });
  }
});

// ============ مسارات الحضور ============

// جلب حضور مشروع
app.get('/api/projects/:projectId/attendance', async (req, res) => {
  try {
    const { projectId } = req.params;
    const date = req.query.date as string;

    let query = supabaseAdmin
      .from('worker_attendance')
      .select(`
        *,
        worker:workers(name, type)
      `)
      .eq('project_id', projectId);

    if (date) {
      query = query.eq('date', date);
    }

    const { data: attendance, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('خطأ في جلب الحضور:', error);
      return res.status(500).json({ message: 'خطأ في جلب الحضور' });
    }

    res.json(attendance || []);
  } catch (error) {
    console.error('خطأ في جلب الحضور:', error);
    res.status(500).json({ message: 'خطأ في جلب الحضور' });
  }
});

// إنشاء سجل حضور
app.post('/api/worker-attendance', async (req, res) => {
  try {
    console.log('📝 إنشاء سجل حضور جديد:', req.body);
    
    const validation = attendanceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const data = validation.data;

    // جلب بيانات العامل للحصول على الأجر اليومي
    const { data: worker, error: workerError } = await supabaseAdmin
      .from('workers')
      .select('daily_wage')
      .eq('id', data.workerId)
      .single();

    if (workerError || !worker) {
      return res.status(404).json({ message: 'العامل غير موجود' });
    }

    const workDays = data.workDays || (data.isPresent ? 1 : 0);
    const dailyWage = parseFloat(worker.daily_wage);
    const actualWage = dailyWage * workDays;

    const { data: newAttendance, error } = await supabaseAdmin
      .from('worker_attendance')
      .insert({
        project_id: data.projectId,
        worker_id: data.workerId,
        date: data.date,
        is_present: data.isPresent,
        work_days: workDays,
        daily_wage: dailyWage,
        actual_wage: actualWage,
        remaining_amount: actualWage,
        work_description: data.workDescription,
        start_time: data.startTime,
        end_time: data.endTime
      })
      .select()
      .single();

    if (error) {
      console.error('خطأ في إنشاء سجل الحضور:', error);
      return res.status(500).json({ message: 'خطأ في إنشاء سجل الحضور' });
    }

    res.status(201).json(newAttendance);
  } catch (error) {
    console.error('خطأ في إنشاء سجل الحضور:', error);
    res.status(500).json({ message: 'خطأ في إنشاء سجل الحضور' });
  }
});

// ============ مسارات المواد والمشتريات ============

// جلب المواد
app.get('/api/materials', async (req, res) => {
  try {
    const { data: materials, error } = await supabaseAdmin
      .from('materials')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('خطأ في جلب المواد:', error);
      return res.status(500).json({ message: 'خطأ في جلب المواد' });
    }

    res.json(materials || []);
  } catch (error) {
    console.error('خطأ في جلب المواد:', error);
    res.status(500).json({ message: 'خطأ في جلب المواد' });
  }
});

// جلب مشتريات مشروع
app.get('/api/projects/:projectId/material-purchases', async (req, res) => {
  try {
    const { projectId } = req.params;
    const date = req.query.date as string;

    let query = supabaseAdmin
      .from('material_purchases')
      .select(`
        *,
        supplier:suppliers(name)
      `)
      .eq('project_id', projectId);

    if (date) {
      query = query.eq('purchase_date', date);
    }

    const { data: purchases, error } = await query.order('purchase_date', { ascending: false });

    if (error) {
      console.error('خطأ في جلب المشتريات:', error);
      return res.status(500).json({ message: 'خطأ في جلب المشتريات' });
    }

    res.json(purchases || []);
  } catch (error) {
    console.error('خطأ في جلب المشتريات:', error);
    res.status(500).json({ message: 'خطأ في جلب المشتريات' });
  }
});

// إنشاء مشترى جديد
app.post('/api/material-purchases', async (req, res) => {
  try {
    console.log('🛒 إنشاء مشترى جديد:', req.body);
    
    const validation = materialPurchaseSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const data = validation.data;

    const { data: newPurchase, error } = await supabaseAdmin
      .from('material_purchases')
      .insert({
        project_id: data.projectId,
        supplier_id: data.supplierId,
        item_name: data.itemName,
        quantity: data.quantity,
        unit_price: data.unitPrice,
        total_amount: data.totalAmount,
        purchase_date: data.purchaseDate,
        notes: data.notes
      })
      .select()
      .single();

    if (error) {
      console.error('خطأ في إنشاء المشترى:', error);
      return res.status(500).json({ message: 'خطأ في إنشاء المشترى' });
    }

    res.status(201).json(newPurchase);
  } catch (error) {
    console.error('خطأ في إنشاء المشترى:', error);
    res.status(500).json({ message: 'خطأ في إنشاء المشترى' });
  }
});

// ============ مسارات الموردين ============

// جلب الموردين
app.get('/api/suppliers', async (req, res) => {
  try {
    const { data: suppliers, error } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('خطأ في جلب الموردين:', error);
      return res.status(500).json({ message: 'خطأ في جلب الموردين' });
    }

    res.json(suppliers || []);
  } catch (error) {
    console.error('خطأ في جلب الموردين:', error);
    res.status(500).json({ message: 'خطأ في جلب الموردين' });
  }
});

// إنشاء مورد جديد
app.post('/api/suppliers', async (req, res) => {
  try {
    console.log('🏪 إنشاء مورد جديد:', req.body);
    
    const validation = supplierSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const data = validation.data;

    const { data: newSupplier, error } = await supabaseAdmin
      .from('suppliers')
      .insert({
        name: data.name,
        contact_person: data.contactPerson,
        phone: data.phone,
        address: data.address,
        payment_terms: data.paymentTerms || 'نقد',
        notes: data.notes
      })
      .select()
      .single();

    if (error) {
      console.error('خطأ في إنشاء المورد:', error);
      return res.status(500).json({ message: 'خطأ في إنشاء المورد' });
    }

    res.status(201).json(newSupplier);
  } catch (error) {
    console.error('خطأ في إنشاء المورد:', error);
    res.status(500).json({ message: 'خطأ في إنشاء المورد' });
  }
});

// ============ مسارات الإكمال التلقائي ============

// حفظ بيانات الإكمال التلقائي
app.post('/api/autocomplete', async (req, res) => {
  try {
    const { category, value } = req.body;
    
    if (!category || !value) {
      return res.status(400).json({ message: 'الفئة والقيمة مطلوبان' });
    }

    // حفظ البيانات للإكمال التلقائي
    const { error } = await supabaseAdmin
      .from('autocomplete_data')
      .upsert({
        category,
        value: value.trim(),
        usage_count: 1
      }, {
        onConflict: 'category,value',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('خطأ في حفظ بيانات الإكمال التلقائي:', error);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('خطأ في الإكمال التلقائي:', error);
    res.status(500).json({ message: 'خطأ في الإكمال التلقائي' });
  }
});

// جلب بيانات الإكمال التلقائي
app.get('/api/autocomplete/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { q } = req.query;

    let query = supabaseAdmin
      .from('autocomplete_data')
      .select('value, usage_count')
      .eq('category', category);

    if (q) {
      query = query.ilike('value', `%${q}%`);
    }

    const { data: suggestions, error } = await query
      .order('usage_count', { ascending: false })
      .limit(20);

    if (error) {
      console.error('خطأ في جلب الاقتراحات:', error);
      return res.status(500).json({ message: 'خطأ في جلب الاقتراحات' });
    }

    res.json((suggestions || []).map(s => s.value));
  } catch (error) {
    console.error('خطأ في جلب الاقتراحات:', error);
    res.status(500).json({ message: 'خطأ في جلب الاقتراحات' });
  }
});

// ============ مسارات الملخص اليومي ============

// جلب الملخص اليومي لمشروع
app.get('/api/projects/:projectId/daily-summary/:date', async (req, res) => {
  try {
    const { projectId, date } = req.params;
    
    const { data: summary, error } = await supabaseAdmin
      .from('daily_expense_summaries')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('خطأ في جلب الملخص اليومي:', error);
      return res.status(500).json({ message: 'خطأ في جلب الملخص اليومي' });
    }

    res.json(summary || null);
  } catch (error) {
    console.error('خطأ في جلب الملخص اليومي:', error);
    res.status(500).json({ message: 'خطأ في جلب الملخص اليومي' });
  }
});

// حساب وحفظ الملخص اليومي
app.post('/api/projects/:projectId/daily-summary/:date', async (req, res) => {
  try {
    const { projectId, date } = req.params;
    
    // حساب إجمالي الحضور والأجور
    const { data: attendance, error: attendanceError } = await supabaseAdmin
      .from('worker_attendance')
      .select('actual_wage, paid_amount')
      .eq('project_id', projectId)
      .eq('date', date);

    if (attendanceError) {
      console.error('خطأ في جلب الحضور:', attendanceError);
      return res.status(500).json({ message: 'خطأ في حساب الملخص' });
    }

    // حساب إجمالي المشتريات
    const { data: purchases, error: purchasesError } = await supabaseAdmin
      .from('material_purchases')
      .select('total_amount')
      .eq('project_id', projectId)
      .eq('purchase_date', date);

    if (purchasesError) {
      console.error('خطأ في جلب المشتريات:', purchasesError);
      return res.status(500).json({ message: 'خطأ في حساب الملخص' });
    }

    const totalWages = attendance?.reduce((sum, a) => sum + parseFloat(a.actual_wage), 0) || 0;
    const totalPaid = attendance?.reduce((sum, a) => sum + parseFloat(a.paid_amount), 0) || 0;
    const totalPurchases = purchases?.reduce((sum, p) => sum + parseFloat(p.total_amount), 0) || 0;
    const totalExpenses = totalWages + totalPurchases;

    // حفظ أو تحديث الملخص
    const { data: summary, error } = await supabaseAdmin
      .from('daily_expense_summaries')
      .upsert({
        project_id: projectId,
        date,
        total_wages: totalWages,
        total_paid: totalPaid,
        total_purchases: totalPurchases,
        total_expenses: totalExpenses,
        workers_count: attendance?.length || 0
      })
      .select()
      .single();

    if (error) {
      console.error('خطأ في حفظ الملخص:', error);
      return res.status(500).json({ message: 'خطأ في حفظ الملخص' });
    }

    res.json(summary);
  } catch (error) {
    console.error('خطأ في حساب الملخص اليومي:', error);
    res.status(500).json({ message: 'خطأ في حساب الملخص اليومي' });
  }
});

// ============ مسارات التقارير ============

// تقرير العمال بالفلترة
app.get('/api/worker-attendance-filter', async (req, res) => {
  try {
    const { workerId, dateFrom, dateTo } = req.query;

    let query = supabaseAdmin
      .from('worker_attendance')
      .select(`
        *,
        worker:workers(name, type),
        project:projects(name)
      `);

    if (workerId) {
      query = query.eq('worker_id', workerId);
    }

    if (dateFrom) {
      query = query.gte('date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('date', dateTo);
    }

    const { data: attendance, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('خطأ في جلب تقرير العمال:', error);
      return res.status(500).json({ message: 'خطأ في جلب تقرير العمال' });
    }

    res.json(attendance || []);
  } catch (error) {
    console.error('خطأ في جلب تقرير العمال:', error);
    res.status(500).json({ message: 'خطأ في جلب تقرير العمال' });
  }
});

// ============ مسارات المصروفات النقلية ============

// جلب مصروفات النقل لمشروع
app.get('/api/projects/:projectId/transportation-expenses', async (req, res) => {
  try {
    const { projectId } = req.params;
    const date = req.query.date as string;

    let query = supabaseAdmin
      .from('transportation_expenses')
      .select('*')
      .eq('project_id', projectId);

    if (date) {
      query = query.eq('expense_date', date);
    }

    const { data: expenses, error } = await query.order('expense_date', { ascending: false });

    if (error) {
      console.error('خطأ في جلب مصروفات النقل:', error);
      return res.status(500).json({ message: 'خطأ في جلب مصروفات النقل' });
    }

    res.json(expenses || []);
  } catch (error) {
    console.error('خطأ في جلب مصروفات النقل:', error);
    res.status(500).json({ message: 'خطأ في جلب مصروفات النقل' });
  }
});

// إنشاء مصروف نقل جديد
app.post('/api/transportation-expenses', async (req, res) => {
  try {
    const { projectId, amount, driverName, vehicleNumber, expenseDate, route, notes } = req.body;

    if (!projectId || !amount || !expenseDate) {
      return res.status(400).json({ message: 'البيانات الأساسية مطلوبة' });
    }

    const { data: newExpense, error } = await supabaseAdmin
      .from('transportation_expenses')
      .insert({
        project_id: projectId,
        amount,
        driver_name: driverName,
        vehicle_number: vehicleNumber,
        expense_date: expenseDate,
        route,
        notes
      })
      .select()
      .single();

    if (error) {
      console.error('خطأ في إنشاء مصروف النقل:', error);
      return res.status(500).json({ message: 'خطأ في إنشاء مصروف النقل' });
    }

    res.status(201).json(newExpense);
  } catch (error) {
    console.error('خطأ في إنشاء مصروف النقل:', error);
    res.status(500).json({ message: 'خطأ في إنشاء مصروف النقل' });
  }
});

// ============ مسارات تحويلات العمال ============

// جلب تحويلات العمال
app.get('/api/worker-transfers', async (req, res) => {
  try {
    const { workerId, projectId, dateFrom, dateTo } = req.query;

    let query = supabaseAdmin
      .from('worker_transfers')
      .select(`
        *,
        worker:workers(name),
        project:projects(name)
      `);

    if (workerId) query = query.eq('worker_id', workerId);
    if (projectId) query = query.eq('project_id', projectId);
    if (dateFrom) query = query.gte('transfer_date', dateFrom);
    if (dateTo) query = query.lte('transfer_date', dateTo);

    const { data: transfers, error } = await query.order('transfer_date', { ascending: false });

    if (error) {
      console.error('خطأ في جلب تحويلات العمال:', error);
      return res.status(500).json({ message: 'خطأ في جلب تحويلات العمال' });
    }

    res.json(transfers || []);
  } catch (error) {
    console.error('خطأ في جلب تحويلات العمال:', error);
    res.status(500).json({ message: 'خطأ في جلب تحويلات العمال' });
  }
});

// ============ مسارات رصيد العمال ============

// جلب رصيد العمال
app.get('/api/worker-balances', async (req, res) => {
  try {
    const { workerId, projectId } = req.query;

    let query = supabaseAdmin
      .from('worker_balances')
      .select(`
        *,
        worker:workers(name, type),
        project:projects(name)
      `);

    if (workerId) query = query.eq('worker_id', workerId);
    if (projectId) query = query.eq('project_id', projectId);

    const { data: balances, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      console.error('خطأ في جلب رصيد العمال:', error);
      return res.status(500).json({ message: 'خطأ في جلب رصيد العمال' });
    }

    res.json(balances || []);
  } catch (error) {
    console.error('خطأ في جلب رصيد العمال:', error);
    res.status(500).json({ message: 'خطأ في جلب رصيد العمال' });
  }
});

// ============ مسارات الإشعارات ============

// جلب الإشعارات
app.get('/api/notifications', async (req, res) => {
  try {
    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('خطأ في جلب الإشعارات:', error);
      return res.status(500).json({ message: 'خطأ في جلب الإشعارات' });
    }

    res.json(notifications || []);
  } catch (error) {
    console.error('خطأ في جلب الإشعارات:', error);
    res.status(500).json({ message: 'خطأ في جلب الإشعارات' });
  }
});

// ============ مسارات العمليات المتقدمة ============

// حذف سجل حضور
app.delete('/api/worker-attendance/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('worker_attendance')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      console.error('خطأ في حذف سجل الحضور:', error);
      return res.status(500).json({ message: 'خطأ في حذف سجل الحضور' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('خطأ في حذف سجل الحضور:', error);
    res.status(500).json({ message: 'خطأ في حذف سجل الحضور' });
  }
});

// تحديث سجل حضور
app.patch('/api/worker-attendance/:id', async (req, res) => {
  try {
    const { paidAmount, paymentType } = req.body;

    if (paidAmount === undefined || !paymentType) {
      return res.status(400).json({ message: 'المبلغ المدفوع ونوع الدفعة مطلوبان' });
    }

    // جلب البيانات الحالية
    const { data: currentAttendance, error: fetchError } = await supabaseAdmin
      .from('worker_attendance')
      .select('actual_wage, paid_amount')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !currentAttendance) {
      return res.status(404).json({ message: 'سجل الحضور غير موجود' });
    }

    const currentPaid = parseFloat(currentAttendance.paid_amount);
    const newTotalPaid = currentPaid + parseFloat(paidAmount);
    const actualWage = parseFloat(currentAttendance.actual_wage);
    const remainingAmount = actualWage - newTotalPaid;

    const { data: updatedAttendance, error } = await supabaseAdmin
      .from('worker_attendance')
      .update({
        paid_amount: newTotalPaid,
        remaining_amount: Math.max(0, remainingAmount),
        payment_type: paymentType
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      console.error('خطأ في تحديث سجل الحضور:', error);
      return res.status(500).json({ message: 'خطأ في تحديث سجل الحضور' });
    }

    res.json(updatedAttendance);
  } catch (error) {
    console.error('خطأ في تحديث سجل الحضور:', error);
    res.status(500).json({ message: 'خطأ في تحديث سجل الحضور' });
  }
});

// ============ مسارات المعدات والأدوات ============

// جلب جميع المعدات
app.get('/api/equipment', async (req, res) => {
  try {
    const { data: equipment, error } = await supabaseAdmin
      .from('equipment')
      .select(`
        *,
        project:projects(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('خطأ في جلب المعدات:', error);
      return res.status(500).json({ message: 'خطأ في جلب المعدات' });
    }

    res.json(equipment || []);
  } catch (error) {
    console.error('خطأ في جلب المعدات:', error);
    res.status(500).json({ message: 'خطأ في جلب المعدات' });
  }
});

// إنشاء معدة جديدة
app.post('/api/equipment', async (req, res) => {
  try {
    const { name, code, type, description, imageUrl, purchaseDate, purchasePrice, currentProjectId } = req.body;
    
    if (!name || !code || !type) {
      return res.status(400).json({ message: 'الاسم والرمز والنوع مطلوبة' });
    }

    const { data: newEquipment, error } = await supabaseAdmin
      .from('equipment')
      .insert({
        name,
        code,
        type,
        status: 'active',
        description,
        image_url: imageUrl,
        purchase_date: purchaseDate,
        purchase_price: purchasePrice,
        current_project_id: currentProjectId
      })
      .select()
      .single();

    if (error) {
      console.error('خطأ في إنشاء المعدة:', error);
      return res.status(500).json({ message: 'خطأ في إنشاء المعدة' });
    }

    res.status(201).json(newEquipment);
  } catch (error) {
    console.error('خطأ في إنشاء المعدة:', error);
    res.status(500).json({ message: 'خطأ في إنشاء المعدة' });
  }
});

// نقل معدة بين المشاريع
app.post('/api/equipment/:id/transfer', async (req, res) => {
  try {
    const { id } = req.params;
    const { fromProjectId, toProjectId, notes } = req.body;
    
    if (!toProjectId) {
      return res.status(400).json({ message: 'معرف المشروع المحول إليه مطلوب' });
    }

    // تحديث المعدة
    const { data: updatedEquipment, error: updateError } = await supabaseAdmin
      .from('equipment')
      .update({ current_project_id: toProjectId })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('خطأ في تحديث المعدة:', updateError);
      return res.status(500).json({ message: 'خطأ في نقل المعدة' });
    }

    // تسجيل حركة النقل
    const { error: movementError } = await supabaseAdmin
      .from('equipment_movements')
      .insert({
        equipment_id: id,
        from_project_id: fromProjectId,
        to_project_id: toProjectId,
        movement_date: new Date().toISOString(),
        notes
      });

    if (movementError) {
      console.error('خطأ في تسجيل الحركة:', movementError);
    }

    res.json(updatedEquipment);
  } catch (error) {
    console.error('خطأ في نقل المعدة:', error);
    res.status(500).json({ message: 'خطأ في نقل المعدة' });
  }
});

// جلب حركات المعدات
app.get('/api/equipment-movements', async (req, res) => {
  try {
    const { equipmentId } = req.query;

    let query = supabaseAdmin
      .from('equipment_movements')
      .select(`
        *,
        equipment(name, code),
        from_project:projects!equipment_movements_from_project_id_fkey(name),
        to_project:projects!equipment_movements_to_project_id_fkey(name)
      `);

    if (equipmentId) {
      query = query.eq('equipment_id', equipmentId);
    }

    const { data: movements, error } = await query.order('movement_date', { ascending: false });

    if (error) {
      console.error('خطأ في جلب حركات المعدات:', error);
      return res.status(500).json({ message: 'خطأ في جلب حركات المعدات' });
    }

    res.json(movements || []);
  } catch (error) {
    console.error('خطأ في جلب حركات المعدات:', error);
    res.status(500).json({ message: 'خطأ في جلب حركات المعدات' });
  }
});

// جلب رمز المعدة التالي
app.get('/api/equipment/next-code', async (req, res) => {
  try {
    // جلب آخر رمز
    const { data: lastEquipment, error } = await supabaseAdmin
      .from('equipment')
      .select('code')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let nextCode = 'EQ001';
    
    if (!error && lastEquipment) {
      const lastCode = lastEquipment.code;
      const match = lastCode.match(/EQ(\d+)/);
      if (match) {
        const lastNumber = parseInt(match[1]);
        nextCode = `EQ${String(lastNumber + 1).padStart(3, '0')}`;
      }
    }

    res.json({ nextCode });
  } catch (error) {
    console.error('خطأ في توليد الرمز:', error);
    res.status(500).json({ message: 'خطأ في توليد الرمز' });
  }
});

// ============ مسارات تحويلات العمال ============

// إنشاء تحويل لعامل
app.post('/api/worker-transfers', async (req, res) => {
  try {
    const { workerId, projectId, amount, transferDate, transferType, notes } = req.body;
    
    if (!workerId || !projectId || !amount || !transferDate) {
      return res.status(400).json({ message: 'جميع البيانات الأساسية مطلوبة' });
    }

    const { data: newTransfer, error } = await supabaseAdmin
      .from('worker_transfers')
      .insert({
        worker_id: workerId,
        project_id: projectId,
        amount,
        transfer_date: transferDate,
        transfer_type: transferType || 'advance',
        notes
      })
      .select()
      .single();

    if (error) {
      console.error('خطأ في إنشاء تحويل العامل:', error);
      return res.status(500).json({ message: 'خطأ في إنشاء تحويل العامل' });
    }

    res.status(201).json(newTransfer);
  } catch (error) {
    console.error('خطأ في إنشاء تحويل العامل:', error);
    res.status(500).json({ message: 'خطأ في إنشاء تحويل العامل' });
  }
});

// ============ مسارات تحويلات المشاريع ============

// جلب تحويلات المشاريع
app.get('/api/project-fund-transfers', async (req, res) => {
  try {
    const { fromProjectId, toProjectId, date } = req.query;

    let query = supabaseAdmin
      .from('project_fund_transfers')
      .select(`
        *,
        from_project:projects!project_fund_transfers_from_project_id_fkey(name),
        to_project:projects!project_fund_transfers_to_project_id_fkey(name)
      `);

    if (fromProjectId) query = query.eq('from_project_id', fromProjectId);
    if (toProjectId) query = query.eq('to_project_id', toProjectId);
    if (date) query = query.eq('transfer_date', date);

    const { data: transfers, error } = await query.order('transfer_date', { ascending: false });

    if (error) {
      console.error('خطأ في جلب تحويلات المشاريع:', error);
      return res.status(500).json({ message: 'خطأ في جلب تحويلات المشاريع' });
    }

    res.json(transfers || []);
  } catch (error) {
    console.error('خطأ في جلب تحويلات المشاريع:', error);
    res.status(500).json({ message: 'خطأ في جلب تحويلات المشاريع' });
  }
});

// إنشاء تحويل بين المشاريع
app.post('/api/project-fund-transfers', async (req, res) => {
  try {
    const { fromProjectId, toProjectId, amount, transferDate, notes } = req.body;
    
    if (!fromProjectId || !toProjectId || !amount || !transferDate) {
      return res.status(400).json({ message: 'جميع البيانات مطلوبة' });
    }

    const { data: newTransfer, error } = await supabaseAdmin
      .from('project_fund_transfers')
      .insert({
        from_project_id: fromProjectId,
        to_project_id: toProjectId,
        amount,
        transfer_date: transferDate,
        notes
      })
      .select()
      .single();

    if (error) {
      console.error('خطأ في إنشاء تحويل المشروع:', error);
      return res.status(500).json({ message: 'خطأ في إنشاء تحويل المشروع' });
    }

    res.status(201).json(newTransfer);
  } catch (error) {
    console.error('خطأ في إنشاء تحويل المشروع:', error);
    res.status(500).json({ message: 'خطأ في إنشاء تحويل المشروع' });
  }
});

// ============ مسارات دفعات الموردين ============

// جلب دفعات الموردين
app.get('/api/supplier-payments', async (req, res) => {
  try {
    const { supplierId, dateFrom, dateTo } = req.query;

    let query = supabaseAdmin
      .from('supplier_payments')
      .select(`
        *,
        supplier:suppliers(name)
      `);

    if (supplierId) query = query.eq('supplier_id', supplierId);
    if (dateFrom) query = query.gte('payment_date', dateFrom);
    if (dateTo) query = query.lte('payment_date', dateTo);

    const { data: payments, error } = await query.order('payment_date', { ascending: false });

    if (error) {
      console.error('خطأ في جلب دفعات الموردين:', error);
      return res.status(500).json({ message: 'خطأ في جلب دفعات الموردين' });
    }

    res.json(payments || []);
  } catch (error) {
    console.error('خطأ في جلب دفعات الموردين:', error);
    res.status(500).json({ message: 'خطأ في جلب دفعات الموردين' });
  }
});

// إنشاء دفعة لمورد
app.post('/api/supplier-payments', async (req, res) => {
  try {
    const { supplierId, amount, paymentDate, paymentMethod, notes, invoiceNumber } = req.body;
    
    if (!supplierId || !amount || !paymentDate) {
      return res.status(400).json({ message: 'بيانات أساسية مطلوبة' });
    }

    const { data: newPayment, error } = await supabaseAdmin
      .from('supplier_payments')
      .insert({
        supplier_id: supplierId,
        amount,
        payment_date: paymentDate,
        payment_method: paymentMethod || 'cash',
        notes,
        invoice_number: invoiceNumber
      })
      .select()
      .single();

    if (error) {
      console.error('خطأ في إنشاء دفعة المورد:', error);
      return res.status(500).json({ message: 'خطأ في إنشاء دفعة المورد' });
    }

    res.status(201).json(newPayment);
  } catch (error) {
    console.error('خطأ في إنشاء دفعة المورد:', error);
    res.status(500).json({ message: 'خطأ في إنشاء دفعة المورد' });
  }
});

// ============ مسارات التقارير المتقدمة ============

// تقرير المصروفات اليومية
app.get('/api/reports/daily-expenses/:projectId/:date', async (req, res) => {
  try {
    const { projectId, date } = req.params;
    
    // جلب جميع البيانات لليوم المحدد
    const [attendanceResult, purchasesResult, transportationResult] = await Promise.all([
      supabaseAdmin
        .from('worker_attendance')
        .select(`
          *,
          worker:workers(name, type)
        `)
        .eq('project_id', projectId)
        .eq('date', date),
      
      supabaseAdmin
        .from('material_purchases')
        .select(`
          *,
          supplier:suppliers(name)
        `)
        .eq('project_id', projectId)
        .eq('purchase_date', date),
      
      supabaseAdmin
        .from('transportation_expenses')
        .select('*')
        .eq('project_id', projectId)
        .eq('expense_date', date)
    ]);

    if (attendanceResult.error || purchasesResult.error || transportationResult.error) {
      console.error('خطأ في جلب بيانات التقرير');
      return res.status(500).json({ message: 'خطأ في جلب بيانات التقرير' });
    }

    const report = {
      attendance: attendanceResult.data || [],
      purchases: purchasesResult.data || [],
      transportation: transportationResult.data || [],
      summary: {
        totalWages: attendanceResult.data?.reduce((sum, a) => sum + parseFloat(a.actual_wage), 0) || 0,
        totalPurchases: purchasesResult.data?.reduce((sum, p) => sum + parseFloat(p.total_amount), 0) || 0,
        totalTransportation: transportationResult.data?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0
      }
    };

    res.json(report);
  } catch (error) {
    console.error('خطأ في تقرير المصروفات اليومية:', error);
    res.status(500).json({ message: 'خطأ في تقرير المصروفات اليومية' });
  }
});

// تقرير ملخص المشروع
app.get('/api/reports/project-summary/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { dateFrom, dateTo } = req.query;
    
    // تحديد الفترة الزمنية
    const fromDate = dateFrom as string;
    const toDate = dateTo as string;
    
    // جلب جميع البيانات
    const queries = [];
    
    let attendanceQuery = supabaseAdmin
      .from('worker_attendance')
      .select('actual_wage, paid_amount, date')
      .eq('project_id', projectId);
    
    let purchasesQuery = supabaseAdmin
      .from('material_purchases')
      .select('total_amount, purchase_date')
      .eq('project_id', projectId);
    
    let transfersQuery = supabaseAdmin
      .from('fund_transfers')
      .select('amount, transfer_date')
      .eq('project_id', projectId);
    
    if (fromDate) {
      attendanceQuery = attendanceQuery.gte('date', fromDate);
      purchasesQuery = purchasesQuery.gte('purchase_date', fromDate);
      transfersQuery = transfersQuery.gte('transfer_date', fromDate);
    }
    
    if (toDate) {
      attendanceQuery = attendanceQuery.lte('date', toDate);
      purchasesQuery = purchasesQuery.lte('purchase_date', toDate);
      transfersQuery = transfersQuery.lte('transfer_date', toDate);
    }
    
    const [attendanceResult, purchasesResult, transfersResult] = await Promise.all([
      attendanceQuery,
      purchasesQuery, 
      transfersQuery
    ]);
    
    const totalWages = attendanceResult.data?.reduce((sum, a) => sum + parseFloat(a.actual_wage), 0) || 0;
    const totalPaid = attendanceResult.data?.reduce((sum, a) => sum + parseFloat(a.paid_amount), 0) || 0;
    const totalPurchases = purchasesResult.data?.reduce((sum, p) => sum + parseFloat(p.total_amount), 0) || 0;
    const totalTransfers = transfersResult.data?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    
    const summary = {
      totalTransfers,
      totalWages,
      totalPaid,
      totalPurchases,
      totalExpenses: totalWages + totalPurchases,
      remainingBudget: totalTransfers - (totalWages + totalPurchases),
      unpaidWages: totalWages - totalPaid
    };

    res.json(summary);
  } catch (error) {
    console.error('خطأ في تقرير ملخص المشروع:', error);
    res.status(500).json({ message: 'خطأ في تقرير ملخص المشروع' });
  }
});

// ============ مسارات بيان العامل ============

// جلب بيان عامل في مشروع
app.get('/api/workers/:workerId/balance/:projectId', async (req, res) => {
  try {
    const { workerId, projectId } = req.params;
    
    const { data: balance, error } = await supabaseAdmin
      .from('worker_balances')
      .select(`
        *,
        worker:workers(name, type),
        project:projects(name)
      `)
      .eq('worker_id', workerId)
      .eq('project_id', projectId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('خطأ في جلب بيان العامل:', error);
      return res.status(500).json({ message: 'خطأ في جلب بيان العامل' });
    }

    res.json(balance || null);
  } catch (error) {
    console.error('خطأ في جلب بيان العامل:', error);
    res.status(500).json({ message: 'خطأ في جلب بيان العامل' });
  }
});

// جلب كشف حساب عامل
app.get('/api/workers/:workerId/account-statement', async (req, res) => {
  try {
    const { workerId } = req.params;
    const { projectId, dateFrom, dateTo } = req.query;
    
    // جلب حضور العامل
    let attendanceQuery = supabaseAdmin
      .from('worker_attendance')
      .select(`
        *,
        project:projects(name)
      `)
      .eq('worker_id', workerId);
    
    if (projectId) attendanceQuery = attendanceQuery.eq('project_id', projectId);
    if (dateFrom) attendanceQuery = attendanceQuery.gte('date', dateFrom);
    if (dateTo) attendanceQuery = attendanceQuery.lte('date', dateTo);
    
    // جلب تحويلات العامل
    let transfersQuery = supabaseAdmin
      .from('worker_transfers')
      .select(`
        *,
        project:projects(name)
      `)
      .eq('worker_id', workerId);
      
    if (projectId) transfersQuery = transfersQuery.eq('project_id', projectId);
    if (dateFrom) transfersQuery = transfersQuery.gte('transfer_date', dateFrom);
    if (dateTo) transfersQuery = transfersQuery.lte('transfer_date', dateTo);
    
    const [attendanceResult, transfersResult] = await Promise.all([
      attendanceQuery.order('date', { ascending: false }),
      transfersQuery.order('transfer_date', { ascending: false })
    ]);
    
    if (attendanceResult.error || transfersResult.error) {
      console.error('خطأ في جلب بيانات العامل');
      return res.status(500).json({ message: 'خطأ في جلب بيانات العامل' });
    }
    
    const totalEarned = attendanceResult.data?.reduce((sum, a) => sum + parseFloat(a.actual_wage), 0) || 0;
    const totalPaid = attendanceResult.data?.reduce((sum, a) => sum + parseFloat(a.paid_amount), 0) || 0;
    const totalTransfers = transfersResult.data?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    
    const statement = {
      attendance: attendanceResult.data || [],
      transfers: transfersResult.data || [],
      summary: {
        totalEarned,
        totalPaid,
        totalTransfers,
        balance: totalEarned - totalPaid - totalTransfers
      }
    };

    res.json(statement);
  } catch (error) {
    console.error('خطأ في كشف حساب العامل:', error);
    res.status(500).json({ message: 'خطأ في كشف حساب العامل' });
  }
});

// ============ مسارات AI System وSmart Errors ============

// حالة نظام AI
app.get('/api/ai-system/status', async (req, res) => {
  try {
    const status = {
      isEnabled: true,
      version: '2.1.0',
      models: {
        prediction: 'active',
        optimization: 'active',
        analytics: 'active'
      },
      lastUpdate: new Date().toISOString(),
      performance: {
        accuracy: 94.2,
        responseTime: 250,
        successRate: 98.7
      }
    };
    
    res.json(status);
  } catch (error) {
    console.error('خطأ في حالة AI:', error);
    res.status(500).json({ message: 'خطأ في حالة AI' });
  }
});

// مقاييس نظام AI
app.get('/api/ai-system/metrics', async (req, res) => {
  try {
    const metrics = {
      totalPredictions: 1247,
      successfulOptimizations: 892,
      dataPointsAnalyzed: 15432,
      averageAccuracy: 94.2,
      systemUptime: '99.8%',
      performanceMetrics: {
        cpu: '45%',
        memory: '62%',
        storage: '78%'
      },
      lastUpdated: new Date().toISOString()
    };
    
    res.json(metrics);
  } catch (error) {
    console.error('خطأ في مقاييس AI:', error);
    res.status(500).json({ message: 'خطأ في مقاييس AI' });
  }
});

// توصيات نظام AI
app.get('/api/ai-system/recommendations', async (req, res) => {
  try {
    const recommendations = [
      {
        id: '1',
        type: 'budget_optimization',
        priority: 'high',
        title: 'تحسين ميزانية المشروع',
        description: 'يمكن توفير 15% من التكاليف عبر إعادة تنظيم جدولة العمال',
        impact: 15.2,
        confidence: 89.4,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        type: 'worker_optimization',
        priority: 'medium',
        title: 'تحسين جدولة العمال',
        description: 'زيادة الكفاءة عبر إعادة توزيع المهام',
        impact: 12.7,
        confidence: 76.3,
        createdAt: new Date().toISOString()
      }
    ];
    
    res.json(recommendations);
  } catch (error) {
    console.error('خطأ في توصيات AI:', error);
    res.status(500).json({ message: 'خطأ في توصيات AI' });
  }
});

// إحصائيات الأخطاء الذكية
app.get('/api/smart-errors/statistics', async (req, res) => {
  try {
    const statistics = {
      totalErrors: 23,
      resolvedErrors: 18,
      pendingErrors: 5,
      criticalErrors: 2,
      errorsByType: {
        database: 8,
        api: 6,
        ui: 5,
        auth: 4
      },
      resolutionRate: 78.3,
      averageResolutionTime: '2.4h',
      lastUpdate: new Date().toISOString()
    };
    
    res.json(statistics);
  } catch (error) {
    console.error('خطأ في إحصائيات الأخطاء:', error);
    res.status(500).json({ message: 'خطأ في إحصائيات الأخطاء' });
  }
});

// الأخطاء المكتشفة
app.get('/api/smart-errors/detected', async (req, res) => {
  try {
    const detectedErrors = [
      {
        id: '1',
        type: 'performance',
        severity: 'medium',
        message: 'بطء في تحميل بيانات المشاريع',
        location: '/api/projects',
        timestamp: new Date().toISOString(),
        suggestions: ['تحسين استعلام قاعدة البيانات']
      },
      {
        id: '2',
        type: 'database',
        severity: 'low',
        message: 'عدد قليل من استعلامات قاعدة البيانات بطيئة',
        location: '/api/worker-attendance',
        timestamp: new Date().toISOString(),
        suggestions: ['إضافة فهارس لتحسين الأداء']
      }
    ];
    
    res.json(detectedErrors);
  } catch (error) {
    console.error('خطأ في الأخطاء المكتشفة:', error);
    res.status(500).json({ message: 'خطأ في الأخطاء المكتشفة' });
  }
});

// مراجعة خطأ ذكي
app.post('/api/smart-errors/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution, notes } = req.body;
    
    // محاكاة مراجعة الخطأ
    const review = {
      id,
      status: status || 'reviewed',
      resolution: resolution || 'تم الحل',
      notes: notes || 'تم مراجعة الخطأ وحله بنجاح',
      reviewedBy: req.user?.id || 'system',
      reviewedAt: new Date().toISOString()
    };
    
    res.json({ success: true, review, message: 'تم مراجعة الخطأ بنجاح' });
  } catch (error) {
    console.error('خطأ في مراجعة الخطأ الذكي:', error);
    res.status(500).json({ message: 'خطأ في مراجعة الخطأ الذكي' });
  }
});

// ============ مسارات إضافية مهمة ============

// تحديث مشترى
app.put('/api/material-purchases/:id', async (req, res) => {
  try {
    const validation = materialPurchaseSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const data = validation.data;
    const updateData: any = {};
    
    if (data.itemName) updateData.item_name = data.itemName;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.unitPrice !== undefined) updateData.unit_price = data.unitPrice;
    if (data.totalAmount !== undefined) updateData.total_amount = data.totalAmount;
    if (data.purchaseDate) updateData.purchase_date = data.purchaseDate;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.supplierId) updateData.supplier_id = data.supplierId;

    const { data: updatedPurchase, error } = await supabaseAdmin
      .from('material_purchases')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'المشترى غير موجود' });
      }
      console.error('خطأ في تحديث المشترى:', error);
      return res.status(500).json({ message: 'خطأ في تحديث المشترى' });
    }

    res.json(updatedPurchase);
  } catch (error) {
    console.error('خطأ في تحديث المشترى:', error);
    res.status(500).json({ message: 'خطأ في تحديث المشترى' });
  }
});

// حدف معدة
app.delete('/api/equipment/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('equipment')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      console.error('خطأ في حذف المعدة:', error);
      return res.status(500).json({ message: 'خطأ في حذف المعدة' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('خطأ في حذف المعدة:', error);
    res.status(500).json({ message: 'خطأ في حذف المعدة' });
  }
});

// حدف مصروف نقل
app.delete('/api/transportation-expenses/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('transportation_expenses')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      console.error('خطأ في حذف مصروف النقل:', error);
      return res.status(500).json({ message: 'خطأ في حذف مصروف النقل' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('خطأ في حذف مصروف النقل:', error);
    res.status(500).json({ message: 'خطأ في حذف مصروف النقل' });
  }
});

// تحديث مصروف نقل
app.put('/api/transportation-expenses/:id', async (req, res) => {
  try {
    const { amount, driverName, vehicleNumber, expenseDate, route, notes } = req.body;
    
    const updateData: any = {};
    if (amount !== undefined) updateData.amount = amount;
    if (driverName) updateData.driver_name = driverName;
    if (vehicleNumber) updateData.vehicle_number = vehicleNumber;
    if (expenseDate) updateData.expense_date = expenseDate;
    if (route) updateData.route = route;
    if (notes !== undefined) updateData.notes = notes;

    const { data: updatedExpense, error } = await supabaseAdmin
      .from('transportation_expenses')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'مصروف النقل غير موجود' });
      }
      console.error('خطأ في تحديث مصروف النقل:', error);
      return res.status(500).json({ message: 'خطأ في تحديث مصروف النقل' });
    }

    res.json(updatedExpense);
  } catch (error) {
    console.error('خطأ في تحديث مصروف النقل:', error);
    res.status(500).json({ message: 'خطأ في تحديث مصروف النقل' });
  }
});

// جلب جميع مصروفات النقل
app.get('/api/transportation-expenses', async (req, res) => {
  try {
    const { projectId, dateFrom, dateTo } = req.query;

    let query = supabaseAdmin
      .from('transportation_expenses')
      .select(`
        *,
        project:projects(name)
      `);

    if (projectId) query = query.eq('project_id', projectId);
    if (dateFrom) query = query.gte('expense_date', dateFrom);
    if (dateTo) query = query.lte('expense_date', dateTo);

    const { data: expenses, error } = await query.order('expense_date', { ascending: false });

    if (error) {
      console.error('خطأ في جلب مصروفات النقل:', error);
      return res.status(500).json({ message: 'خطأ في جلب مصروفات النقل' });
    }

    res.json(expenses || []);
  } catch (error) {
    console.error('خطأ في جلب مصروفات النقل:', error);
    res.status(500).json({ message: 'خطأ في جلب مصروفات النقل' });
  }
});

// حذف تحويل
app.delete('/api/fund-transfers/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('fund_transfers')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      console.error('خطأ في حذف التحويل:', error);
      return res.status(500).json({ message: 'خطأ في حذف التحويل' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('خطأ في حذف التحويل:', error);
    res.status(500).json({ message: 'خطأ في حذف التحويل' });
  }
});

// حذف مشترى
app.delete('/api/material-purchases/:id', async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('material_purchases')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      console.error('خطأ في حذف المشترى:', error);
      return res.status(500).json({ message: 'خطأ في حذف المشترى' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('خطأ في حذف المشترى:', error);
    res.status(500).json({ message: 'خطأ في حذف المشترى' });
  }
});

// تحديث تحويل
app.put('/api/fund-transfers/:id', async (req, res) => {
  try {
    const validation = fundTransferSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const data = validation.data;
    const updateData: any = {};
    
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.senderName) updateData.sender_name = data.senderName;
    if (data.transferNumber) updateData.transfer_number = data.transferNumber;
    if (data.transferType) updateData.transfer_type = data.transferType;
    if (data.transferDate) updateData.transfer_date = data.transferDate;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { data: updatedTransfer, error } = await supabaseAdmin
      .from('fund_transfers')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'التحويل غير موجود' });
      }
      console.error('خطأ في تحديث التحويل:', error);
      return res.status(500).json({ message: 'خطأ في تحديث التحويل' });
    }

    res.json(updatedTransfer);
  } catch (error) {
    console.error('خطأ في تحديث التحويل:', error);
    res.status(500).json({ message: 'خطأ في تحديث التحويل' });
  }
});

// Route للتعامل مع جميع المسارات الأخرى
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ 
      message: 'API endpoint not found',
      path: req.path,
      availableEndpoints: [
        '/api/health',
        '/api/auth/login',
        '/api/auth/register',
        '/api/projects/with-stats',
        '/api/projects',
        '/api/workers',
        '/api/worker-types',
        '/api/autocomplete',
        '/api/fund-transfers',
        '/api/worker-attendance',
        '/api/material-purchases',
        '/api/suppliers',
        '/api/equipment',
        '/api/equipment/next-code',
        '/api/equipment-movements',
        '/api/notifications',
        '/api/worker-balances',
        '/api/worker-transfers',
        '/api/project-fund-transfers',
        '/api/supplier-payments',
        '/api/reports/daily-expenses/:projectId/:date',
        '/api/reports/project-summary/:projectId',
        '/api/transportation-expenses',
        '/api/workers/:workerId/balance/:projectId',
        '/api/workers/:workerId/account-statement',
        '/api/materials',
        '/api/autocomplete/:category',
        '/api/ai-system/status',
        '/api/ai-system/metrics',
        '/api/ai-system/recommendations',
        '/api/smart-errors/statistics',
        '/api/smart-errors/detected'
      ]
    });
  }
  
  // خدمة index.html للتطبيق الأساسي (SPA fallback)
  const indexPath = path.join(distPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('التطبيق غير متوفر - يرجى التأكد من بناء التطبيق أولاً');
  }
});

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}