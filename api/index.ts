import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';

// نسخة مبسطة للاختبار أولاً
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

// Route اختبار أساسي
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'نظام إدارة المشاريع الإنشائية يعمل بنجاح',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Route للصفحة الرئيسية
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>نظام إدارة المشاريع الإنشائية</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          text-align: center;
        }
        .container {
          max-width: 600px;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          backdrop-filter: blur(10px);
        }
        h1 { font-size: 2.5rem; margin-bottom: 1rem; }
        p { font-size: 1.2rem; margin-bottom: 1.5rem; }
        .status { background: #22c55e; padding: 0.5rem 1rem; border-radius: 25px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏗️ نظام إدارة المشاريع الإنشائية</h1>
        <p>تم نشر التطبيق بنجاح على Vercel!</p>
        <div class="status">✅ النظام يعمل بكفاءة عالية</div>
        <p><small>API متاح على: <a href="/api/health" style="color: #fbbf24;">/api/health</a></small></p>
      </div>
    </body>
    </html>
  `);
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
  
  // إعادة توجيه للصفحة الرئيسية
  res.redirect('/');
});

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}