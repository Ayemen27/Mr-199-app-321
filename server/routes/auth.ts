/**
 * مسارات API لنظام المصادقة المتقدم
 */

import { Router, Request } from 'express';
import { z } from 'zod';
import {
  loginUser,
  registerUser,
  verifyEmail,
  setupTOTP,
  enableTOTP,
  getActiveSessions,
  terminateSession,
  terminateAllOtherSessions,
  changePassword,
  refreshAccessToken,
  verifyAccessToken,
} from '../auth/auth-service';

const router = Router();

// مخططات التحقق
const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور قصيرة جداً'),
  totpCode: z.string().optional(),
});

const registerSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون على الأقل 8 أحرف'),
  name: z.string().min(2, 'الاسم قصير جداً'),
  phone: z.string().optional(),
  role: z.string().optional(),
});

const verifyEmailSchema = z.object({
  userId: z.string(),
  code: z.string().length(6, 'رمز التحقق يجب أن يكون 6 أرقام'),
});

const enableTOTPSchema = z.object({
  totpCode: z.string().length(6, 'رمز TOTP يجب أن يكون 6 أرقام'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword: z.string().min(8, 'كلمة المرور الجديدة يجب أن تكون على الأقل 8 أحرف'),
});

// تعريف الأنواع المخصصة
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    sessionId: string;
  };
}

// استيراد middleware من ملف منفصل
import { requireAuth, requirePermission, requireRole } from '../middleware/auth';

// دالة مساعدة للحصول على معلومات الطلب
function getRequestInfo(req: any) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    deviceInfo: {
      type: req.headers['x-device-type'] || 'web',
      name: req.headers['x-device-name'] || 'unknown',
    }
  };
}

/**
 * تسجيل الدخول
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const { email, password, totpCode } = validation.data;
    const requestInfo = getRequestInfo(req);

    // استخدام نظام المصادقة الحقيقي
    console.log('🔐 استدعاء loginUser للمستخدم:', email);
    const result = await loginUser({
      email,
      password,
      totpCode,
      ...requestInfo
    });

    const statusCode = result.success ? 200 : 
                      result.requireMFA || result.requireVerification ? 202 : 401;

    res.status(statusCode).json(result);

  } catch (error) {
    console.error('خطأ في API تسجيل الدخول:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * تسجيل حساب جديد
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const requestInfo = getRequestInfo(req);
    const result = await registerUser({
      ...validation.data,
      ...requestInfo
    });

    const statusCode = result.success ? 201 : 400;
    res.status(statusCode).json(result);

  } catch (error) {
    console.error('خطأ في API التسجيل:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * التحقق من البريد الإلكتروني
 * POST /api/auth/verify-email
 */
router.post('/verify-email', async (req, res) => {
  try {
    const validation = verifyEmailSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const { userId, code } = validation.data;
    const requestInfo = getRequestInfo(req);

    const result = await verifyEmail(userId, code, requestInfo.ipAddress, requestInfo.userAgent);

    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);

  } catch (error) {
    console.error('خطأ في API التحقق من البريد:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * تجديد الرمز المميز
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'رمز التجديد مطلوب'
      });
    }

    const result = await refreshAccessToken(refreshToken);

    if (!result) {
      return res.status(401).json({
        success: false,
        message: 'رمز التجديد غير صالح'
      });
    }

    res.json({
      success: true,
      tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
      }
    });

  } catch (error) {
    console.error('خطأ في API تجديد الرمز:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

// تم نقل middleware إلى ملف منفصل

/**
 * إعداد المصادقة الثنائية
 * POST /api/auth/setup-mfa (Protected)
 */
router.post('/setup-mfa', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const email = req.user!.email;

    const result = await setupTOTP(userId, email);

    res.json(result);

  } catch (error) {
    console.error('خطأ في API إعداد MFA:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * تفعيل المصادقة الثنائية
 * POST /api/auth/enable-mfa (Protected)
 */
router.post('/enable-mfa', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const validation = enableTOTPSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const userId = req.user!.userId;
    const { totpCode } = validation.data;
    const requestInfo = getRequestInfo(req);

    const result = await enableTOTP(userId, totpCode, requestInfo.ipAddress, requestInfo.userAgent);

    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);

  } catch (error) {
    console.error('خطأ في API تفعيل MFA:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على الجلسات النشطة
 * GET /api/auth/sessions (Protected)
 */
router.get('/sessions', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const sessions = await getActiveSessions(userId);

    res.json({
      success: true,
      sessions
    });

  } catch (error) {
    console.error('خطأ في API الجلسات:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * إنهاء جلسة معينة
 * DELETE /api/auth/sessions/:sessionId (Protected)
 */
router.delete('/sessions/:sessionId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { sessionId } = req.params;

    const success = await terminateSession(userId, sessionId, 'user_terminated');

    res.json({
      success,
      message: success ? 'تم إنهاء الجلسة بنجاح' : 'فشل في إنهاء الجلسة'
    });

  } catch (error) {
    console.error('خطأ في API إنهاء الجلسة:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * إنهاء جميع الجلسات الأخرى
 * DELETE /api/auth/sessions (Protected)
 */
router.delete('/sessions', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const currentSessionId = req.user!.sessionId;

    const terminatedCount = await terminateAllOtherSessions(userId, currentSessionId);

    res.json({
      success: true,
      message: `تم إنهاء ${terminatedCount} جلسة`,
      terminatedCount
    });

  } catch (error) {
    console.error('خطأ في API إنهاء الجلسات:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * تغيير كلمة المرور
 * PUT /api/auth/password (Protected)
 */
router.put('/password', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: validation.error.errors
      });
    }

    const userId = req.user!.userId;
    const { currentPassword, newPassword } = validation.data;
    const requestInfo = getRequestInfo(req);

    const result = await changePassword(
      userId,
      currentPassword,
      newPassword,
      requestInfo.ipAddress,
      requestInfo.userAgent
    );

    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);

  } catch (error) {
    console.error('خطأ في API تغيير كلمة المرور:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * تسجيل الخروج
 * POST /api/auth/logout (Protected)
 */
router.post('/logout', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const sessionId = req.user!.sessionId;

    const success = await terminateSession(req.user!.userId, sessionId, 'user_logout');

    res.json({
      success,
      message: success ? 'تم تسجيل الخروج بنجاح' : 'فشل في تسجيل الخروج'
    });

  } catch (error) {
    console.error('خطأ في API تسجيل الخروج:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});

/**
 * الحصول على معلومات المستخدم الحالي
 * GET /api/auth/me (Protected)
 */
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user?.userId || '',
        email: req.user?.email || '',
        role: req.user?.role || 'user',
        sessionId: req.user?.sessionId || '',
      }
    });
  } catch (error) {
    console.error('خطأ في API معلومات المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم'
    });
  }
});


export default router;