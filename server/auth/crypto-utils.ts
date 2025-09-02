/**
 * أدوات التشفير والأمان المتقدم
 * يدعم تشفير كلمات المرور، TOTP، ورموز التحقق
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import speakeasy from 'speakeasy';

// إعدادات التشفير
const CRYPTO_CONFIG = {
  saltRounds: 12, // قوة تشفير bcrypt
  totpWindow: 2, // نافزة TOTP (عدد الفترات الزمنية المقبولة)
  totpStep: 30, // خطوة TOTP بالثواني
  encryptionKey: process.env.ENCRYPTION_KEY || 'construction-app-encryption-key-2025-very-secret',
  algorithm: 'aes-256-gcm',
};

/**
 * تشفير كلمة المرور باستخدام bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, CRYPTO_CONFIG.saltRounds);
  } catch (error) {
    console.error('خطأ في تشفير كلمة المرور:', error);
    throw new Error('فشل في تشفير كلمة المرور');
  }
}

/**
 * التحقق من كلمة المرور
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('خطأ في التحقق من كلمة المرور:', error);
    return false;
  }
}

/**
 * إنشاء سر TOTP للمصادقة الثنائية
 */
export function generateTOTPSecret(userEmail: string, serviceName = 'Construction Manager'): {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
} {
  const secret = speakeasy.generateSecret({
    name: userEmail,
    issuer: serviceName,
    length: 32,
  });

  // إنشاء رموز احتياطية
  const backupCodes = Array.from({ length: 8 }, () => 
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  return {
    secret: secret.base32,
    qrCodeUrl: secret.otpauth_url || '',
    backupCodes,
  };
}

/**
 * التحقق من رمز TOTP
 */
export function verifyTOTPCode(secret: string, token: string): boolean {
  try {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: CRYPTO_CONFIG.totpWindow,
      step: CRYPTO_CONFIG.totpStep,
    });
  } catch (error) {
    console.error('خطأ في التحقق من رمز TOTP:', error);
    return false;
  }
}

/**
 * تشفير البيانات الحساسة (AES-256-GCM)
 */
export function encryptSensitiveData(data: string): {
  encrypted: string;
  iv: string;
} {
  try {
    const iv = crypto.randomBytes(16);
    const key = CRYPTO_CONFIG.encryptionKey + iv.toString('hex');
    const cipher = crypto.createCipher('aes-256-cbc', key);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
    };
  } catch (error) {
    console.error('خطأ في تشفير البيانات:', error);
    throw new Error('فشل في تشفير البيانات');
  }
}

/**
 * فك تشفير البيانات الحساسة
 */
export function decryptSensitiveData(encrypted: string, iv: string): string {
  try {
    const key = CRYPTO_CONFIG.encryptionKey + iv;
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('خطأ في فك تشفير البيانات:', error);
    throw new Error('فشل في فك تشفير البيانات');
  }
}

/**
 * إنشاء رمز تحقق عشوائي
 */
export function generateVerificationCode(length = 6): {
  code: string;
  hashedCode: string;
  expiresAt: Date;
} {
  const code = Array.from({ length }, () => 
    Math.floor(Math.random() * 10)
  ).join('');
  
  const hashedCode = crypto
    .createHash('sha256')
    .update(code + CRYPTO_CONFIG.encryptionKey)
    .digest('hex');

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 دقائق

  return {
    code,
    hashedCode,
    expiresAt,
  };
}

/**
 * التحقق من رمز التحقق
 */
export function verifyVerificationCode(inputCode: string, hashedCode: string): boolean {
  try {
    const hashedInput = crypto
      .createHash('sha256')
      .update(inputCode + CRYPTO_CONFIG.encryptionKey)
      .digest('hex');
    
    return hashedInput === hashedCode;
  } catch (error) {
    console.error('خطأ في التحقق من رمز التحقق:', error);
    return false;
  }
}

/**
 * إنشاء رمز إعادة تعيين كلمة المرور
 */
export function generatePasswordResetToken(): {
  token: string;
  hashedToken: string;
  expiresAt: Date;
} {
  const token = crypto.randomBytes(32).toString('hex');
  
  const hashedToken = crypto
    .createHash('sha256')
    .update(token + CRYPTO_CONFIG.encryptionKey)
    .digest('hex');

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // ساعة واحدة

  return {
    token,
    hashedToken,
    expiresAt,
  };
}

/**
 * التحقق من رمز إعادة تعيين كلمة المرور
 */
export function verifyPasswordResetToken(inputToken: string, hashedToken: string): boolean {
  try {
    const hashedInput = crypto
      .createHash('sha256')
      .update(inputToken + CRYPTO_CONFIG.encryptionKey)
      .digest('hex');
    
    return hashedInput === hashedToken;
  } catch (error) {
    console.error('خطأ في التحقق من رمز إعادة تعيين كلمة المرور:', error);
    return false;
  }
}

/**
 * إنشاء معرف جلسة فريد وآمن
 */
export function generateSecureSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * إنشاء رموز احتياطية آمنة للMFA
 */
export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const code = crypto.randomBytes(5).toString('hex').toUpperCase();
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  });
}

/**
 * تشفير رموز احتياطية للحفظ في قاعدة البيانات
 */
export function encryptBackupCodes(codes: string[]): string {
  const codesJson = JSON.stringify(codes);
  const { encrypted, iv } = encryptSensitiveData(codesJson);
  
  return JSON.stringify({ encrypted, iv });
}

/**
 * فك تشفير رموز احتياطية
 */
export function decryptBackupCodes(encryptedCodes: string): string[] {
  try {
    const { encrypted, iv } = JSON.parse(encryptedCodes);
    const decryptedJson = decryptSensitiveData(encrypted, iv);
    return JSON.parse(decryptedJson);
  } catch (error) {
    console.error('خطأ في فك تشفير الرموز الاحتياطية:', error);
    return [];
  }
}

/**
 * التحقق من قوة كلمة المرور
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // طول كلمة المرور
  if (password.length < 8) {
    issues.push('كلمة المرور قصيرة جداً');
    suggestions.push('استخدم على الأقل 8 أحرف');
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }

  // الأحرف الكبيرة
  if (!/[A-Z]/.test(password)) {
    issues.push('لا تحتوي على أحرف كبيرة');
    suggestions.push('أضف حرفاً كبيراً واحداً على الأقل');
  } else {
    score += 1;
  }

  // الأحرف الصغيرة
  if (!/[a-z]/.test(password)) {
    issues.push('لا تحتوي على أحرف صغيرة');
    suggestions.push('أضف حرفاً صغيراً واحداً على الأقل');
  } else {
    score += 1;
  }

  // الأرقام
  if (!/[0-9]/.test(password)) {
    issues.push('لا تحتوي على أرقام');
    suggestions.push('أضف رقماً واحداً على الأقل');
  } else {
    score += 1;
  }

  // الرموز الخاصة
  if (!/[^A-Za-z0-9]/.test(password)) {
    issues.push('لا تحتوي على رموز خاصة');
    suggestions.push('أضف رمزاً خاصاً مثل !@#$%');
  } else {
    score += 1;
  }

  // تحقق من الأنماط الشائعة
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /(.)\1{2,}/, // تكرار نفس الحرف 3 مرات أو أكثر
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      issues.push('تحتوي على نمط شائع أو متكرر');
      suggestions.push('تجنب الأنماط الشائعة والتكرار');
      score = Math.max(0, score - 1);
      break;
    }
  }

  return {
    isValid: issues.length === 0 && score >= 4,
    score,
    issues,
    suggestions,
  };
}

// تصدير إعدادات التشفير للاستخدام في أماكن أخرى
export { CRYPTO_CONFIG };