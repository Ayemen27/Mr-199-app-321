# دليل النشر على Vercel

## خطوات النشر:

### 1. تحضير المشروع
```bash
npm run build
```

### 2. متغيرات البيئة المطلوبة في Vercel
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_ACCESS_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
ENCRYPTION_KEY=your_encryption_key
NODE_ENV=production
```

### 3. إعدادات Vercel
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
- Node Version: 20.x

### 4. البنية بعد البناء
```
dist/
├── public/          # الملفات الثابتة (HTML, CSS, JS)
│   ├── index.html
│   └── assets/
└── index.js         # خادم Express
```

### 5. المسارات
- `/api/*` → خادم Express
- `/*` → ملفات React الثابتة