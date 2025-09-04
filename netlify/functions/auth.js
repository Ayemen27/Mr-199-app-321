/**
 * Netlify Function للمصادقة - متوافق مع Netlify Runtime
 */

// استيراد المكتبات المطلوبة
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// إعداد قاعدة البيانات Supabase
let supabase = null;

async function initSupabase() {
  if (!supabase) {
    const { createClient } = require('@supabase/supabase-js');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('إعدادات Supabase غير موجودة');
    }

    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  return supabase;
}

// إعدادات JWT
const JWT_CONFIG = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'construction-app-access-secret-2025',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'construction-app-refresh-secret-2025',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '30d',
  issuer: 'construction-management-app',
  algorithm: 'HS256',
};

// دوال المساعدة للتشفير
async function hashPassword(password) {
  const SALT_ROUNDS = 12;
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function validatePasswordStrength(password) {
  const issues = [];
  const suggestions = [];

  if (password.length < 8) {
    issues.push('كلمة المرور قصيرة جداً');
    suggestions.push('استخدم 8 أحرف على الأقل');
  }

  if (!/[A-Z]/.test(password)) {
    issues.push('لا تحتوي على أحرف كبيرة');
    suggestions.push('أضف حرف كبير واحد على الأقل');
  }

  if (!/[a-z]/.test(password)) {
    issues.push('لا تحتوي على أحرف صغيرة');
    suggestions.push('أضف حرف صغير واحد على الأقل');
  }

  if (!/[0-9]/.test(password)) {
    issues.push('لا تحتوي على أرقام');
    suggestions.push('أضف رقم واحد على الأقل');
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
}

// إنشاء JWT tokens
async function generateTokenPair(userId, email, role, ipAddress, userAgent) {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 دقيقة
  const refreshExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 يوم

  // إنشاء Access Token
  const accessPayload = {
    userId,
    email,
    role,
    sessionId,
    type: 'access',
  };

  const accessToken = jwt.sign(
    accessPayload,
    JWT_CONFIG.accessTokenSecret,
    {
      expiresIn: JWT_CONFIG.accessTokenExpiry,
      issuer: JWT_CONFIG.issuer
    }
  );

  // إنشاء Refresh Token
  const refreshPayload = {
    userId,
    email,
    role,
    sessionId,
    type: 'refresh',
  };

  const refreshToken = jwt.sign(
    refreshPayload,
    JWT_CONFIG.refreshTokenSecret,
    {
      expiresIn: JWT_CONFIG.refreshTokenExpiry,
      issuer: JWT_CONFIG.issuer
    }
  );

  try {
    // حفظ الجلسة في قاعدة البيانات
    const supabaseClient = await initSupabase();
    await supabaseClient
      .from('auth_user_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        device_id: sessionId,
        refresh_token_hash: refreshToken,
        access_token_hash: accessToken,
        ip_address: ipAddress || null,
        device_type: 'web',
        last_activity: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_revoked: false,
        login_method: 'password',
        is_trusted_device: false,
      });
  } catch (error) {
    console.error('⚠️ تحذير: فشل في حفظ الجلسة في قاعدة البيانات:', error);
    // نكمل بدون حفظ الجلسة للآن
  }

  return {
    accessToken,
    refreshToken,
    sessionId,
    expiresAt,
    refreshExpiresAt,
  };
}

// تسجيل الدخول
async function loginUser(request) {
  const { email, password, totpCode, ipAddress, userAgent } = request;

  console.log('🔐 بدء عملية تسجيل الدخول للمستخدم:', email);

  try {
    const supabaseClient = await initSupabase();

    // البحث عن المستخدم
    console.log('🔍 البحث عن المستخدم في قاعدة البيانات...');
    const { data: users, error: searchError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    console.log('🔍 نتيجة البحث:', { found: users?.length || 0, email, hasError: !!searchError });

    if (searchError) {
      console.error('❌ خطأ في البحث عن المستخدم:', searchError);
      return {
        success: false,
        message: 'خطأ في الاتصال بقاعدة البيانات'
      };
    }

    if (!users || users.length === 0) {
      console.log('❌ المستخدم غير موجود');
      return {
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      };
    }

    const user = users[0];

    // التحقق من حالة المستخدم
    if (!user.is_active) {
      console.log('❌ الحساب معطل');
      return {
        success: false,
        message: 'الحساب معطل. يرجى التواصل مع المدير'
      };
    }

    // التحقق من كلمة المرور
    console.log('🔍 فحص كلمة المرور للمستخدم:', email);
    
    const isPasswordValid = await verifyPassword(password, user.password);
    console.log('🔍 نتيجة التحقق من كلمة المرور:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ كلمة مرور خاطئة');
      return {
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      };
    }

    // إنشاء JWT tokens مع جلسة جديدة
    console.log('🔑 إنشاء JWT tokens...');
    const tokens = await generateTokenPair(
      user.id,
      user.email,
      user.role,
      ipAddress,
      userAgent
    );

    // تحديث آخر تسجيل دخول
    try {
      await supabaseClient
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);
    } catch (updateError) {
      console.error('⚠️ تحذير: فشل في تحديث آخر تسجيل دخول:', updateError);
    }

    console.log('✅ تم تسجيل الدخول بنجاح');

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        role: user.role,
        profilePicture: user.avatar_url,
        mfaEnabled: false,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      }
    };

  } catch (error) {
    console.error('❌ خطأ في تسجيل الدخول:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء تسجيل الدخول: ' + error.message
    };
  }
}

// تسجيل مستخدم جديد
async function registerUser(request) {
  const { email, password, name, phone, role = 'user', ipAddress, userAgent } = request;

  try {
    const supabaseClient = await initSupabase();

    // التحقق من قوة كلمة المرور
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        message: 'كلمة المرور ضعيفة',
        issues: passwordValidation.issues,
        suggestions: passwordValidation.suggestions
      };
    }

    // التحقق من وجود المستخدم
    const { data: existingUsers } = await supabaseClient
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      return {
        success: false,
        message: 'البريد الإلكتروني مستخدم مسبقاً'
      };
    }

    // تشفير كلمة المرور
    const passwordHash = await hashPassword(password);

    // إنشاء المستخدم
    const { data: newUser, error } = await supabaseClient
      .from('users')
      .insert({
        email,
        password: passwordHash,
        first_name: name,
        phone,
        role,
        is_active: true,
        email_verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('خطأ في إنشاء المستخدم:', error);
      return {
        success: false,
        message: 'حدث خطأ أثناء إنشاء الحساب: ' + error.message
      };
    }

    console.log('✅ تم إنشاء المستخدم:', newUser.id);

    return {
      success: true,
      message: 'تم إنشاء الحساب وتفعيله بنجاح!',
      user: {
        id: newUser.id,
        email,
        name,
        role,
      }
    };

  } catch (error) {
    console.error('خطأ في التسجيل:', error);
    return {
      success: false,
      message: 'حدث خطأ أثناء إنشاء الحساب: ' + error.message
    };
  }
}

// المعالج الرئيسي لـ Netlify Function
exports.handler = async (event, context) => {
  // إعداد CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Content-Type': 'application/json',
  };

  // معالجة طلبات OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ message: 'CORS OK' })
    };
  }

  console.log('📨 طلب Netlify Function جديد:', {
    method: event.httpMethod,
    path: event.path,
    queryStringParameters: event.queryStringParameters,
    environment: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasJwtSecret: !!process.env.JWT_ACCESS_SECRET
    }
  });

  try {
    // استخراج المسار من URL
    const path = event.path || '';
    const pathSegments = path.split('/').filter(p => p);
    
    // تحديد الإجراء: إما login أو register
    let action = 'login';
    if (path.includes('register') || pathSegments.includes('register')) {
      action = 'register';
    } else if (path.includes('login') || pathSegments.includes('login')) {
      action = 'login';
    }

    console.log('🎯 الإجراء المطلوب:', action, 'من المسار:', path);

    // معلومات الطلب
    const requestInfo = {
      ipAddress: event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown',
      userAgent: event.headers['user-agent'] || 'unknown',
    };

    // تحليل بيانات الطلب
    let requestData = {};
    if (event.body) {
      try {
        requestData = JSON.parse(event.body);
        console.log('📋 بيانات الطلب تم تحليلها بنجاح');
      } catch (parseError) {
        console.error('❌ خطأ في تحليل JSON:', parseError);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'تنسيق البيانات غير صحيح',
            error: 'Invalid JSON format'
          }),
        };
      }
    }

    // معالجة طلبات تسجيل الدخول
    if (action === 'login' && event.httpMethod === 'POST') {
      console.log('🔐 معالجة طلب تسجيل الدخول');
      
      const { email, password, totpCode } = requestData;
      
      if (!email || !password) {
        console.log('❌ بيانات ناقصة في طلب تسجيل الدخول');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
          }),
        };
      }

      const result = await loginUser({
        email,
        password,
        totpCode,
        ...requestInfo
      });

      const statusCode = result.success ? 200 : 401;
      console.log('📤 إرسال نتيجة تسجيل الدخول:', { success: result.success, statusCode });

      return {
        statusCode,
        headers,
        body: JSON.stringify(result),
      };
    }

    // معالجة طلبات التسجيل
    if (action === 'register' && event.httpMethod === 'POST') {
      console.log('📝 معالجة طلب التسجيل');
      
      const { email, password, name, phone, role } = requestData;
      
      if (!email || !password || !name) {
        console.log('❌ بيانات ناقصة في طلب التسجيل');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            message: 'البريد الإلكتروني وكلمة المرور والاسم مطلوبان'
          }),
        };
      }

      const result = await registerUser({
        email,
        password,
        name,
        phone,
        role,
        ...requestInfo
      });

      const statusCode = result.success ? 201 : 400;
      console.log('📤 إرسال نتيجة التسجيل:', { success: result.success, statusCode });

      return {
        statusCode,
        headers,
        body: JSON.stringify(result),
      };
    }

    // Route غير مدعوم
    console.log('❓ مسار غير مدعوم:', { action, method: event.httpMethod, path });
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'المسار غير موجود',
        path: path,
        method: event.httpMethod,
        availableRoutes: ['POST /auth/login', 'POST /auth/register']
      }),
    };

  } catch (error) {
    console.error('❌ خطأ عام في معالج Netlify Function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'حدث خطأ داخلي في الخادم',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
    };
  }
};