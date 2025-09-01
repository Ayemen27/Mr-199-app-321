import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    version: '1.2.0',
    environment: 'production'
  });
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