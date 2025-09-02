/**
 * مسارات API لإدارة متغيرات البيئة والإعدادات التلقائية
 * للمطورين والمدراء فقط
 */

import { Request, Response } from 'express';
import { envManager } from '../utils/env-manager';

// فحص حالة متغيرات البيئة
export async function checkEnvironmentStatus(req: Request, res: Response) {
  try {
    const status = envManager.getEnvironmentStatus();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      status
    });

  } catch (error) {
    console.error('خطأ في فحص حالة البيئة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في فحص حالة متغيرات البيئة'
    });
  }
}

// تهيئة وإنشاء المتغيرات المفقودة تلقائياً
export async function autoSetupEnvironment(req: Request, res: Response) {
  try {
    console.log('🚀 بدء التهيئة التلقائية لمتغيرات البيئة...');
    
    const result = await envManager.ensureEnvironmentVariables();
    
    res.json({
      success: true,
      message: 'تمت التهيئة التلقائية بنجاح',
      timestamp: new Date().toISOString(),
      result
    });

  } catch (error) {
    console.error('خطأ في التهيئة التلقائية:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في التهيئة التلقائية للبيئة'
    });
  }
}

// إعادة تحميل متغيرات البيئة من ملف .env
export async function reloadEnvironment(req: Request, res: Response) {
  try {
    // تهيئة متغيرات البيئة مرة أخرى
    const result = await envManager.ensureEnvironmentVariables();
    const status = envManager.getEnvironmentStatus();
    
    res.json({
      success: true,
      message: 'تم إعادة تحميل متغيرات البيئة بنجاح',
      timestamp: new Date().toISOString(),
      reloadResult: result,
      status
    });

  } catch (error) {
    console.error('خطأ في إعادة تحميل البيئة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إعادة تحميل متغيرات البيئة'
    });
  }
}

// إضافة متغير بيئة جديد
export async function addEnvironmentVariable(req: Request, res: Response) {
  try {
    const { key, value, description } = req.body;

    if (!key || !value) {
      return res.status(400).json({
        success: false,
        message: 'المفتاح والقيمة مطلوبان'
      });
    }

    const success = await envManager.updateEnvironmentVariable(key, value);
    
    if (success) {
      res.json({
        success: true,
        message: `تم إضافة متغير البيئة ${key} بنجاح`,
        key,
        description: description || 'بدون وصف'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'فشل في إضافة متغير البيئة'
      });
    }

  } catch (error) {
    console.error('خطأ في إضافة متغير البيئة:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة متغير البيئة'
    });
  }
}

// تدوير مفاتيح الأمان
export async function rotateSecrets(req: Request, res: Response) {
  try {
    console.log('🔄 بدء تدوير مفاتيح الأمان...');
    
    const result = await envManager.rotateSecrets();
    
    res.json({
      success: true,
      message: 'تم تدوير مفاتيح الأمان',
      timestamp: new Date().toISOString(),
      result
    });

  } catch (error) {
    console.error('خطأ في تدوير المفاتيح:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تدوير مفاتيح الأمان'
    });
  }
}

// إنشاء مفتاح آمن جديد
export function generateSecureKey(req: Request, res: Response) {
  try {
    const { length = 32, type = 'hex' } = req.query;
    const keyLength = Math.min(Math.max(parseInt(length as string), 16), 128);
    
    const key = envManager.generateSecureKey(keyLength);
    const validation = envManager.validateSecretKey(key);
    
    res.json({
      success: true,
      key,
      length: key.length,
      type,
      validation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('خطأ في إنشاء المفتاح الآمن:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء المفتاح الآمن'
    });
  }
}

// فحص قوة مفتاح
export function validateKey(req: Request, res: Response) {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'المفتاح مطلوب للفحص'
      });
    }

    const validation = envManager.validateSecretKey(key);
    
    res.json({
      success: true,
      validation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('خطأ في فحص قوة المفتاح:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في فحص قوة المفتاح'
    });
  }
}