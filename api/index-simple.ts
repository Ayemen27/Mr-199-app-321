import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';

const app = express();

// CORS setup
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'نظام إدارة المشاريع يعمل بكفاءة',
    timestamp: new Date().toISOString()
  });
});

// Simple auth endpoints
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  // Basic validation
  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      message: 'البريد الإلكتروني وكلمة المرور والاسم مطلوبة'
    });
  }
  
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'كلمة المرور يجب أن تكون على الأقل 8 أحرف'
    });
  }
  
  // Simulate successful registration
  res.status(201).json({
    success: true,
    message: 'تم إنشاء الحساب بنجاح!',
    user: {
      id: 'temp-' + Date.now(),
      email: email,
      name: name,
      role: 'user'
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Basic validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
    });
  }
  
  // Simulate successful login
  res.json({
    success: true,
    user: {
      id: 'temp-' + Date.now(),
      email: email,
      name: 'مستخدم مؤقت',
      role: 'user'
    },
    tokens: {
      accessToken: 'temporary-access-token-' + Date.now(),
      refreshToken: 'temporary-refresh-token-' + Date.now(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    }
  });
});

// Handle all API routes
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `مسار API غير موجود: ${req.method} ${req.path}`
  });
});

// Export for Vercel
export default (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};