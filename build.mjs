#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 بدء عملية البناء لـ Vercel...');

try {
  // إنشاء مجلد dist إذا لم يكن موجوداً
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }

  // بناء frontend
  console.log('📦 بناء واجهة المستخدم...');
  execSync('vite build', { stdio: 'inherit' });

  // بناء backend
  console.log('⚙️ بناء الخادم...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });

  // نسخ الملفات المطلوبة
  console.log('📋 نسخ الملفات المطلوبة...');
  
  // التأكد من وجود مجلد dist/public
  if (fs.existsSync('dist/public')) {
    console.log('✅ مجلد dist/public موجود');
  } else {
    console.log('❌ مجلد dist/public غير موجود');
    process.exit(1);
  }

  // التأكد من وجود dist/index.js
  if (fs.existsSync('dist/index.js')) {
    console.log('✅ ملف dist/index.js موجود');
  } else {
    console.log('❌ ملف dist/index.js غير موجود');
    process.exit(1);
  }

  console.log('🎉 اكتملت عملية البناء بنجاح!');
} catch (error) {
  console.error('❌ فشلت عملية البناء:', error.message);
  process.exit(1);
}