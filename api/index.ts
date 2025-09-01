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
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// التحقق من وجود متغيرات البيئة المطلوبة
if (!supabaseUrl) {
  console.error('❌ متغير SUPABASE_URL غير معرف');
  throw new Error('SUPABASE_URL is required');
}

if (!supabaseKey) {
  console.error('❌ متغير SUPABASE_ANON_KEY غير معرف');
  throw new Error('SUPABASE_ANON_KEY is required');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// إعدادات المصادقة
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'construction-app-jwt-secret-2025';
const SALT_ROUNDS = 12;

// مخططات التحقق
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

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// إضافة CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
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
    const { data: users, error: fetchError } = await supabase
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
        name: user.name,
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
    const { data: existingUsers, error: checkError } = await supabase
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
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        role: role || 'user',
        isActive: true,
        createdAt: new Date().toISOString()
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
        name: newUser.name,
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

// Route للتعامل مع جميع المسارات الأخرى
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ 
      message: 'API endpoint not found',
      path: req.path,
      availableEndpoints: ['/api/health']
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