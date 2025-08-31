import { Request, Response } from 'express';
import express from 'express';
import { registerRoutes } from '../server/routes';
import { databaseManager } from '../server/database-manager';
import { smartSecretsManager } from '../server/services/SmartSecretsManager';

let app: express.Application | null = null;

async function initializeApp() {
  if (app) return app;
  
  app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: false, limit: '50mb' }));

  // تهيئة النظام الذكي للمفاتيح السرية
  try {
    const smartInitialized = await smartSecretsManager.initializeOnStartup();
    console.log(smartInitialized ? "✅ Smart secrets initialized" : "⚠️ Smart secrets warning");
  } catch (error) {
    console.error("❌ Smart secrets error:", error);
  }

  // تهيئة قاعدة البيانات
  try {
    const dbCheck = await databaseManager.initializeDatabase();
    if (!dbCheck.success) {
      console.error("❌ Database error:", dbCheck.message);
    }
  } catch (error) {
    console.error("❌ Database connection error:", error);
  }

  // تسجيل المسارات
  await registerRoutes(app as any);

  return app;
}

export default async function handler(req: Request, res: Response) {
  try {
    const expressApp = await initializeApp();
    
    // تشغيل Express app مع الطلب والرد
    return expressApp(req, res);
    
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({ 
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
}