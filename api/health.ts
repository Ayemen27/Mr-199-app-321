import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // إعداد CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    return res.status(200).json({
      success: true,
      message: 'نظام إدارة المشاريع الإنشائية يعمل بكفاءة',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: 'production',
      endpoints: {
        auth: {
          login: '/api/auth/login',
          register: '/api/auth/register'
        },
        main: '/api/*'
      }
    });

  } catch (error: any) {
    console.error('خطأ في health check:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ داخلي في الخادم',
      error: error.message
    });
  }
}