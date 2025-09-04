const express = require('express');
const cors = require('cors');

const app = express();

// إعداد middleware
app.use(cors());
app.use(express.json());

// مسارات بسيطة
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'نظام إدارة المشاريع يعمل بكفاءة',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/projects', (req, res) => {
  const mockProjects = [
    { id: '1', name: 'مشروع الفيلا الأولى', status: 'active' },
    { id: '2', name: 'مشروع البناء التجاري', status: 'active' }
  ];
  
  res.json({
    success: true,
    data: mockProjects,
    count: mockProjects.length
  });
});

app.get('/api/workers', (req, res) => {
  const mockWorkers = [
    { id: '1', name: 'أحمد محمد', type: 'عامل بناء', dailyWage: 150 },
    { id: '2', name: 'محمد علي', type: 'مساعد', dailyWage: 100 }
  ];
  
  res.json({
    success: true,
    data: mockWorkers,
    count: mockWorkers.length
  });
});

// التعامل مع جميع المسارات الأخرى
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'المسار غير موجود',
    path: req.path
  });
});

module.exports = app;