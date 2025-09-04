import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // إعداد CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-vercel-protection-bypass');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('👷 طلب العمال - Vercel Function منفصل');

    // بيانات تجريبية للاختبار
    const mockWorkers = [
      {
        id: '1',
        name: 'أحمد محمد',
        type: 'عامل بناء',
        dailyWage: 150,
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'محمد علي', 
        type: 'مساعد',
        dailyWage: 100,
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];

    return res.status(200).json({
      success: true,
      data: mockWorkers,
      count: mockWorkers.length,
      message: 'تم جلب العمال بنجاح'
    });

  } catch (error: any) {
    console.error('❌ خطأ في جلب العمال:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ في جلب العمال',
      error: error.message
    });
  }
}