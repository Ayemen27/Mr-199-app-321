export default function handler(req, res) {
  // إعداد CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-vercel-protection-bypass');
  
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
      message: 'تم الاختبار بنجاح - JavaScript عادي',
      timestamp: new Date().toISOString(),
      data: {
        test: 'اختبار بسيط',
        working: true
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
}