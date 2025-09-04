import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
    const { email, password } = req.body;

    // التحقق من البيانات الأساسية
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
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

    // البحث عن المستخدم
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (fetchError) {
      console.error('خطأ في جلب المستخدم:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'خطأ في الاتصال بقاعدة البيانات'
      });
    }

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'بيانات تسجيل الدخول غير صحيحة'
      });
    }

    const user = users[0];

    // التحقق من كلمة المرور
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'بيانات تسجيل الدخول غير صحيحة'
      });
    }

    // إنشاء JWT tokens
    const jwtSecret = process.env.JWT_ACCESS_SECRET || 'default-secret-key';
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role || 'user'
      },
      jwtSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        type: 'refresh'
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // النتيجة النهائية
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user',
        profilePicture: user.profile_picture || null,
        mfaEnabled: false
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      }
    });

  } catch (error: any) {
    console.error('خطأ في تسجيل الدخول:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم',
      error: error.message
    });
  }
}