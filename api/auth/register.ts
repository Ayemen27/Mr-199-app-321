import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // إعداد CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { email, password, name } = req.body;

    // التحقق من البيانات الأساسية
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة (البريد الإلكتروني، كلمة المرور، الاسم)'
      });
    }

    // التحقق من صيغة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'صيغة البريد الإلكتروني غير صحيحة'
      });
    }

    // التحقق من طول كلمة المرور
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تكون على الأقل 8 أحرف'
      });
    }

    // التحقق من قوة كلمة المرور
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز خاصة'
      });
    }

    // إعداد Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('متغيرات البيئة مفقودة:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
      return res.status(500).json({
        success: false,
        message: 'خطأ في إعداد قاعدة البيانات'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // فحص وجود المستخدم مسبقاً
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (checkError) {
      console.error('خطأ في فحص المستخدم:', checkError);
      return res.status(500).json({
        success: false,
        message: 'خطأ في الاتصال بقاعدة البيانات'
      });
    }

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'هذا البريد الإلكتروني مستخدم مسبقاً'
      });
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 12);

    // إنشاء المستخدم الجديد
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        name,
        role: 'user',
        is_active: true,
        email_verified: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('خطأ في إنشاء المستخدم:', insertError);
      return res.status(500).json({
        success: false,
        message: 'فشل في إنشاء الحساب'
      });
    }

    // النتيجة النهائية
    return res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب وتفعيله بنجاح!',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role || 'user'
      }
    });

  } catch (error: any) {
    console.error('خطأ في تسجيل المستخدم:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم',
      error: error.message
    });
  }
}