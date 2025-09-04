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
    console.log('📋 طلب المشاريع - Vercel Function منفصل');

    // بيانات تجريبية للاختبار
    const mockProjects = [
      {
        id: '1',
        name: 'مشروع الفيلا الأولى',
        status: 'active',
        imageUrl: null,
        createdAt: new Date().toISOString()
      },
      {
        id: '2', 
        name: 'مشروع البناء التجاري',
        status: 'active',
        imageUrl: null,
        createdAt: new Date().toISOString()
      }
    ];

    return res.status(200).json({
      success: true,
      data: mockProjects,
      count: mockProjects.length,
      message: 'تم جلب المشاريع بنجاح'
    });

  } catch (error: any) {
    console.error('❌ خطأ في جلب المشاريع:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ في جلب المشاريع',
      error: error.message
    });
  }
}